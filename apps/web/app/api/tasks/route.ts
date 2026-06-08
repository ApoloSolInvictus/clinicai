import { NextResponse } from "next/server";
import { z } from "zod";
import { getClinicNodeConfig } from "@/lib/clinic-config";
import { addEvent, createTask, patchClinic, patchTask } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const taskSchema = z.object({
  clinicId: z.string().min(1),
  intent: z.enum(["agenda", "correos", "contabilidad", "historial", "gestion-local", "sync"]),
  priority: z.enum(["normal", "alta", "critica"]).default("normal"),
  prompt: z.string().min(8).max(2000)
});

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = taskSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!canAccessClinic(auth.user, parsed.data.clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const task = createTask(parsed.data);
  const node = getClinicNodeConfig(task.clinicId);

  if (!node?.nodeUrl) {
    return NextResponse.json({
      task,
      forwarded: false,
      note: "La clinica no tiene nodo local configurado; la tarea queda en cola central."
    });
  }

  try {
    const response = await fetch(`${node.nodeUrl.replace(/\/$/, "")}/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(node.token ? { authorization: `Bearer ${node.token}` } : {})
      },
      body: JSON.stringify(task),
      cache: "no-store",
      signal: AbortSignal.timeout(295_000)
    });

    const result = await response.json();

    if (!response.ok) {
      patchTask(task.id, { status: "failed", result });
      patchClinic(task.clinicId, { status: "degraded" });
      addEvent({
        clinicId: task.clinicId,
        type: "local.forward.failed",
        message: `El nodo local respondio con HTTP ${response.status}.`
      });

      return NextResponse.json({ task: { ...task, status: "failed" }, result }, { status: 502 });
    }

    const updatedTask = patchTask(task.id, { status: "completed", result }) ?? task;
    patchClinic(task.clinicId, { status: "online", lastSync: new Date().toISOString() });
    addEvent({
      clinicId: task.clinicId,
      type: "local.task.completed",
      message: "OpenClaw local ejecuto la automatizacion y devolvio trazabilidad."
    });

    return NextResponse.json({
      task: updatedTask,
      forwarded: true,
      result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar con el nodo local.";
    const updatedTask = patchTask(task.id, { status: "sent-local", result: { warning: message } }) ?? task;
    patchClinic(task.clinicId, { status: "degraded" });
    addEvent({
      clinicId: task.clinicId,
      type: "local.forward.pending",
      message: "La tarea quedo pendiente; el nodo local no estuvo disponible en este host."
    });

    return NextResponse.json({
      task: updatedTask,
      forwarded: false,
      warning: message
    });
  }
}
