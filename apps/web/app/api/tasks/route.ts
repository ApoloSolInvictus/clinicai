import { NextResponse } from "next/server";
import { z } from "zod";
import { getClinicNodeConfig, getClinicNodeRequestHeaders, getLocalNodeUrlHint, isCloudRuntime, isLocalNodeUrl } from "@/lib/clinic-config";
import { addEvent, createTask, getState, hydrateState, patchClinic, patchTask, persistState } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const taskSchema = z.object({
  clinicId: z.string().min(1),
  intent: z.enum(["agenda", "correos", "contabilidad", "historial", "gestion-local", "sync"]),
  priority: z.enum(["normal", "alta", "critica"]).default("normal"),
  prompt: z.string().min(8).max(2000)
});

export const maxDuration = 300;

function buildLocalExecutionContext(clinicId: string) {
  const state = getState();
  const byClinic = <T extends { clinicId: string }>(items: T[]) => items.filter((item) => item.clinicId === clinicId);

  return {
    source: "openclinic-web-app",
    generatedAt: new Date().toISOString(),
    clinic: state.clinics.find((clinic) => clinic.id === clinicId) ?? null,
    patients: byClinic(state.patients).slice(0, 50),
    appointments: byClinic(state.appointments).slice(0, 75),
    staff: byClinic(state.staff).slice(0, 50),
    schedules: byClinic(state.schedules).slice(0, 80),
    services: byClinic(state.serviceCatalog).slice(0, 50),
    cashRegisters: byClinic(state.cashRegisters),
    payments: byClinic(state.cashTransactions).slice(0, 100),
    expenses: byClinic(state.cashExpenses).slice(0, 100),
    invoices: byClinic(state.pendingInvoices).slice(0, 100),
    reports: byClinic(state.reports),
    events: byClinic(state.events).slice(0, 25)
  };
}

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

  await hydrateState();
  const task = createTask(parsed.data);
  const node = getClinicNodeConfig(task.clinicId);
  const context = buildLocalExecutionContext(task.clinicId);
  await persistState();

  if (!node?.nodeUrl) {
    return NextResponse.json({
      task,
      forwarded: false,
      note: "La clinica no tiene nodo local configurado; la tarea queda en cola central."
    });
  }

  if (isCloudRuntime() && isLocalNodeUrl(node.nodeUrl)) {
    const message = "La API central no puede alcanzar una URL local .node desde Vercel.";
    const result = {
      warning: message,
      nodeUrl: node.nodeUrl,
      hint: getLocalNodeUrlHint(node.nodeUrl)
    };
    const updatedTask = patchTask(task.id, { status: "sent-local", result }) ?? task;
    patchClinic(task.clinicId, { status: "degraded" });
    addEvent({
      clinicId: task.clinicId,
      type: "local.forward.pending",
      message
    });
    await persistState();

    return NextResponse.json({
      task: updatedTask,
      forwarded: false,
      ...result
    });
  }

  try {
    const response = await fetch(`${node.nodeUrl.replace(/\/$/, "")}/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...getClinicNodeRequestHeaders(node)
      },
      body: JSON.stringify({ ...task, context }),
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
      await persistState();

      return NextResponse.json({ task: { ...task, status: "failed" }, result }, { status: 502 });
    }

    const updatedTask = patchTask(task.id, { status: "completed", result }) ?? task;
    patchClinic(task.clinicId, { status: "online", lastSync: new Date().toISOString() });
    addEvent({
      clinicId: task.clinicId,
      type: "local.task.completed",
      message: "OpenClaw local ejecuto la automatizacion y devolvio trazabilidad."
    });
    await persistState();

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
    await persistState();

    return NextResponse.json({
      task: updatedTask,
      forwarded: false,
      warning: message
    });
  }
}
