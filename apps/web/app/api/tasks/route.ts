import { NextResponse } from "next/server";
import { z } from "zod";
import { addEvent, createTask, patchClinic, patchTask } from "@/lib/data";

const taskSchema = z.object({
  clinicId: z.string().min(1),
  intent: z.enum(["agenda", "correos", "contabilidad", "historial", "gestion-local", "sync"]),
  priority: z.enum(["normal", "alta", "critica"]).default("normal"),
  prompt: z.string().min(8).max(2000)
});

export const maxDuration = 300;

export async function POST(request: Request) {
  const parsed = taskSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const task = createTask(parsed.data);
  const localNodeUrl = process.env.LOCAL_NODE_URL;
  const token = process.env.LOCAL_NODE_TOKEN;

  if (!localNodeUrl) {
    return NextResponse.json({
      task,
      forwarded: false,
      note: "LOCAL_NODE_URL no esta configurado; la tarea queda en cola central."
    });
  }

  try {
    const response = await fetch(`${localNodeUrl.replace(/\/$/, "")}/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
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
