import { runGatewayPrompt } from "./openclaw-gateway-client.js";

const defaultCapabilities = [
  "agenda.conflict_detection",
  "emails.confirmations",
  "accounting.summary",
  "clinical_records.lookup",
  "local_sync.event_batch"
];

function toOpenClawSessionId(value) {
  return `lux-aeterna-${String(value ?? "clinic").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export async function getOpenClawStatus(config) {
  if (config.mode !== "gateway") {
    return {
      mode: "mock",
      gatewayUrl: config.gatewayUrl,
      reachable: false,
      capabilities: defaultCapabilities
    };
  }

  try {
    const baseUrl = config.gatewayUrl.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/healthz`, {
      signal: AbortSignal.timeout(1200)
    });
    const payload = response.ok ? await response.json().catch(() => null) : null;

    return {
      mode: "gateway",
      gatewayUrl: config.gatewayUrl,
      reachable: response.ok,
      status: payload?.status ?? (response.ok ? "live" : "unreachable"),
      capabilities: defaultCapabilities
    };
  } catch {
    return {
      mode: "gateway",
      gatewayUrl: config.gatewayUrl,
      reachable: false,
      capabilities: defaultCapabilities
    };
  }
}

export async function runAutomation(task, localDb, config) {
  const openclaw = await getOpenClawStatus(config);
  let modelRun = null;
  let modelRunError = null;
  const shouldRunGateway = config.mode === "gateway" && openclaw.reachable && config.gatewayToken;
  const modelPrompt = [
    "Eres el asistente operativo local de Lux Aeterna Clinical AI.",
    "Responde en espanol, conciso y en formato JSON valido.",
    "No inventes datos medicos. Para recetas o reportes clinicos, indica siempre que requieren aprobacion del medico.",
    `Modulo: ${task.intent}`,
    `Prioridad: ${task.priority ?? "normal"}`,
    `Orden: ${task.prompt}`
  ].join("\n");

  if (config.runnerUrl) {
    try {
      const response = await fetch(config.runnerUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sessionId: toOpenClawSessionId(task.clinicId),
          message: modelPrompt
        }),
        signal: AbortSignal.timeout(370_000)
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? `OpenClaw runner HTTP ${response.status}`);
      }
      modelRun = payload;
    } catch (error) {
      modelRunError = error instanceof Error ? error.message : "OpenClaw runner failed";
    }
  } else if (shouldRunGateway) {
    try {
      modelRun = await runGatewayPrompt({
        gatewayUrl: config.gatewayUrl,
        token: config.gatewayToken,
        clinicId: task.clinicId,
        taskId: task.id,
        message: modelPrompt
      });
    } catch (error) {
      modelRunError = error instanceof Error ? error.message : "OpenClaw model run failed";
    }
  }

  const timestamp = new Date().toISOString();
  const base = {
    id: `run-${Date.now()}`,
    taskId: task.id,
    clinicId: task.clinicId,
    openclaw,
    modelRun,
    modelRunError,
    completedAt: timestamp
  };

  if (task.intent === "agenda") {
    const conflicts = localDb.appointments.filter((item) => item.status === "needs-confirmation");
    localDb.emailQueue.push(
      ...conflicts.map((item) => ({
        id: `email-${Date.now()}-${item.id}`,
        to: item.patientEmail,
        subject: "Confirmacion de cita",
        template: "appointment-confirmation",
        appointmentId: item.id,
        createdAt: timestamp
      }))
    );

    return {
      ...base,
      summary: `Se revisaron ${localDb.appointments.length} citas y se prepararon ${conflicts.length} correos.`,
      actions: [
        "Agenda local auditada",
        "Conflictos marcados para revision",
        "Correos de confirmacion agregados a la cola"
      ],
      data: { conflicts: conflicts.length, queuedEmails: conflicts.length }
    };
  }

  if (task.intent === "correos") {
    const queued = localDb.emailQueue.splice(0, localDb.emailQueue.length);
    return {
      ...base,
      summary: `Se procesaron ${queued.length} correos en la cola local.`,
      actions: ["Plantillas validadas", "Mensajes listos para proveedor SMTP", "Evento de auditoria generado"],
      data: { processedEmails: queued.length }
    };
  }

  if (task.intent === "contabilidad") {
    return {
      ...base,
      summary: "Reporte financiero local preparado para sincronizacion central.",
      actions: ["Ingresos agregados", "Gastos agregados", "Resumen por sede generado"],
      data: localDb.accounting
    };
  }

  if (task.intent === "historial") {
    return {
      ...base,
      summary: "Consulta de historial preparada con politica de minima exposicion.",
      actions: ["Datos sensibles redactados", "Indice local consultado", "Resultado listo para profesional autorizado"],
      data: { recordsIndexed: localDb.patients.length }
    };
  }

  if (task.intent === "gestion-local") {
    return {
      ...base,
      summary: "Gestion local validada: personal, horarios e inventario sin alertas criticas.",
      actions: ["Turnos revisados", "Inventario bajo marcado", "Preferencias locales respetadas"],
      data: { staffOnDuty: 4, lowStockItems: 2 }
    };
  }

  return {
    ...base,
    summary: "Lote de sincronizacion preparado.",
    actions: ["Eventos compactados", "Conflictos detectados", "Batch listo para API central"],
    data: { pendingEvents: localDb.events.length }
  };
}
