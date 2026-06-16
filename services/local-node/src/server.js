import cors from "cors";
import express from "express";
import { getOpenClawStatus, runAutomation } from "./openclaw-adapter.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const clinic = {
  id: process.env.CLINIC_ID ?? "clinic-san-jose",
  name: process.env.CLINIC_NAME ?? "Clinica San Jose"
};
const demoMessaging = {
  demoMode: true,
  demoEmail: process.env.OPENCLINIC_DEMO_EMAIL?.trim() || "ronnywoods77@gmail.com",
  demoWhatsapp: process.env.OPENCLINIC_DEMO_WHATSAPP?.trim() || "+506-6121-5702",
  requireHumanApproval: true,
  providerMode: process.env.OPENCLINIC_MESSAGE_PROVIDER?.trim() || "demo-only",
  readInbox: false
};
const config = {
  mode: process.env.OPENCLAW_MODE ?? "mock",
  gatewayUrl: process.env.OPENCLAW_GATEWAY_URL ?? "http://host.docker.internal:18789",
  gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN ?? "",
  runnerUrl: process.env.OPENCLAW_RUNNER_URL ?? "",
  runnerTimeoutMs: Number(process.env.OPENCLAW_RUNNER_TIMEOUT_MS ?? 8_000),
  token: process.env.LOCAL_NODE_TOKEN ?? "dev-local-node-token",
  healthRequiresToken: process.env.NODE_HEALTH_REQUIRES_TOKEN === "true" || process.env.OPENCLINIC_SECURE_HEALTH === "true"
};

const localDb = {
  appointments: [
    {
      id: "apt-1001",
      patientName: "Maria Fernanda Rojas",
      patientEmail: "maria.rojas@example.local",
      patientWhatsapp: "+50688880101",
      doctorName: "Dra. Elena Vargas",
      serviceName: "Consulta general",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 88200000).toISOString(),
      status: "needs-confirmation",
      reminderStatus: "pendiente",
      paymentStatus: "pagado",
      price: 37500,
      doctorHonorarium: 22500
    },
    {
      id: "apt-1002",
      patientName: "Jorge Alberto Mendez",
      patientEmail: "jorge.mendez@example.local",
      patientWhatsapp: "+50688880202",
      doctorName: "Dr. Marco Solis",
      serviceName: "Laboratorio y control",
      startsAt: new Date(Date.now() + 90000000).toISOString(),
      endsAt: new Date(Date.now() + 92700000).toISOString(),
      status: "confirmed",
      reminderStatus: "programado",
      paymentStatus: "pagado",
      price: 47500,
      doctorHonorarium: 25000
    }
  ],
  patients: [
    { id: "pat-1", name: "Maria Fernanda Rojas", lastVisit: "2026-06-01", risk: "low" },
    { id: "pat-2", name: "Jorge Alberto Mendez", lastVisit: "2026-05-21", risk: "medium" }
  ],
  staff: [
    {
      id: "staff-1",
      name: "Dra. Elena Vargas",
      role: "medico",
      status: "activo",
      verifiedHoursMonth: 128,
      defaultHonorarium: 21000
    },
    {
      id: "staff-2",
      name: "Dr. Marco Solis",
      role: "medico",
      status: "activo",
      verifiedHoursMonth: 96,
      defaultHonorarium: 27500
    },
    { id: "staff-3", name: "Ana Rojas", role: "cajera", status: "activo" },
    { id: "staff-4", name: "Laura Mendez", role: "recepcion", status: "activo" }
  ],
  payments: [
    {
      id: "pay-100",
      appointmentId: "apt-1001",
      patientName: "Maria Fernanda Rojas",
      serviceName: "Consulta general",
      method: "sinpe",
      amount: 37500,
      status: "completado"
    },
    {
      id: "pay-101",
      appointmentId: "apt-1002",
      patientName: "Jorge Alberto Mendez",
      serviceName: "Laboratorio y control",
      method: "tarjeta",
      amount: 47500,
      status: "completado"
    }
  ],
  expenses: [
    { id: "exp-100", description: "Insumos medicos", category: "insumos", amount: 18000, status: "pagado" },
    { id: "exp-101", description: "Mensajeria clinica", category: "servicios", amount: 4000, status: "registrado" }
  ],
  invoices: [
    {
      id: "inv-100",
      patientName: "Sofia Camila Alvarez",
      concept: "Seguimiento respiratorio",
      amount: 45000,
      status: "pendiente"
    }
  ],
  reports: [
    {
      id: "rep-local-100",
      patientName: "Maria Fernanda Rojas",
      doctorName: "Dra. Elena Vargas",
      status: "pendiente-aprobacion",
      deliveryChannels: ["email", "whatsapp"],
      medicalImages: ["signos-vitales-2026-06-05.png"]
    },
    {
      id: "rep-local-101",
      patientName: "Jorge Alberto Mendez",
      doctorName: "Dr. Marco Solis",
      status: "pendiente-aprobacion",
      deliveryChannels: ["email"],
      medicalImages: ["orden-laboratorio-borrador.pdf"]
    }
  ],
  inventory: [
    { id: "item-1", name: "Jeringas 5ml", stock: 12, minimum: 20 },
    { id: "item-2", name: "Guantes talla M", stock: 80, minimum: 50 }
  ],
  accounting: {
    revenueToday: 85000,
    pendingInvoices: 1,
    expensesMonth: 22000,
    currency: "CRC"
  },
  messaging: demoMessaging,
  emailQueue: [],
  whatsappQueue: [],
  events: [
    {
      id: "local-evt-seed",
      type: "local.node.started",
      message: "Nodo local listo para recibir tareas.",
      at: new Date().toISOString()
    }
  ]
};

app.use(cors());
app.use(express.json({ limit: process.env.LOCAL_NODE_JSON_LIMIT ?? "5mb" }));

app.use((error, _request, response, next) => {
  if (!error) return next();

  const type = error.type ?? "";
  const isPayloadTooLarge = type === "entity.too.large";
  const isJsonSyntaxError = error instanceof SyntaxError && "body" in error;

  if (isPayloadTooLarge || isJsonSyntaxError) {
    return response.status(isPayloadTooLarge ? 413 : 400).json({
      ok: false,
      error: isPayloadTooLarge
        ? "El payload enviado al nodo local excede el limite permitido."
        : "El nodo local recibio JSON invalido.",
      code: isPayloadTooLarge ? "LOCAL_NODE_PAYLOAD_TOO_LARGE" : "LOCAL_NODE_INVALID_JSON",
      limit: process.env.LOCAL_NODE_JSON_LIMIT ?? "5mb"
    });
  }

  return next(error);
});

function requireToken(request, response, next) {
  const expected = config.token;
  const header = request.headers.authorization ?? "";

  if (!expected || header === `Bearer ${expected}`) {
    return next();
  }

  return response.status(401).json({ error: "Token local invalido" });
}

function pushEvent(type, message, extra = {}) {
  const event = {
    id: `local-evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    clinicId: clinic.id,
    type,
    message,
    at: new Date().toISOString(),
    ...extra
  };
  localDb.events.unshift(event);
  return event;
}

function outboxMessages() {
  return [...localDb.emailQueue, ...localDb.whatsappQueue].sort((left, right) =>
    String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
  );
}

function outboxTotals() {
  const messages = outboxMessages();
  return {
    total: messages.length,
    email: localDb.emailQueue.length,
    whatsapp: localDb.whatsappQueue.length,
    pendingApproval: messages.filter((message) => message.status === "ready_for_human_review").length,
    approved: messages.filter((message) => String(message.status).startsWith("approved")).length,
    rejected: messages.filter((message) => message.status === "rejected_by_human").length
  };
}

function findOutboxMessage(messageId) {
  for (const queue of [localDb.emailQueue, localDb.whatsappQueue]) {
    const message = queue.find((item) => item.id === messageId);
    if (message) return message;
  }

  return null;
}

function addMessageAudit(message, event, extra = {}) {
  const auditTrail = Array.isArray(message.auditTrail) ? message.auditTrail : [];
  message.auditTrail = [
    ...auditTrail,
    {
      at: new Date().toISOString(),
      event,
      ...extra
    }
  ];
}

app.get("/health", config.healthRequiresToken ? requireToken : (_request, _response, next) => next(), async (_request, response) => {
  const openclaw = await getOpenClawStatus(config);
  response.json({
    ok: true,
    service: "lux-aeterna-local-node",
    clinic,
    openclaw,
    capabilities: openclaw.capabilities,
    localDb: {
      appointments: localDb.appointments.length,
      patients: localDb.patients.length,
      payments: localDb.payments.length,
      expenses: localDb.expenses.length,
      pendingInvoices: localDb.invoices.filter((item) => item.status === "pendiente").length,
      reportsForApproval: localDb.reports.filter((item) => item.status === "pendiente-aprobacion").length,
      queuedEmails: localDb.emailQueue.length,
      queuedWhatsApps: localDb.whatsappQueue.length,
      messagesPendingApproval: outboxTotals().pendingApproval,
      messagingDemoMode: localDb.messaging.demoMode,
      events: localDb.events.length
    }
  });
});

app.post("/tasks", requireToken, async (request, response) => {
  const task = request.body;

  if (!task?.id || !task?.intent || !task?.prompt) {
    return response.status(400).json({ error: "Payload de tarea incompleto" });
  }

  const result = await runAutomation(task, localDb, config);
  pushEvent("local.task.completed", result.summary, { taskId: task.id });

  response.json({
    accepted: true,
    clinicId: clinic.id,
    taskId: task.id,
    summary: result.summary,
    playbook: result.playbook,
    dataSource: result.dataSource,
    openclawStatus: result.openclaw?.status,
    modelRunError: result.modelRunError,
    result,
    sync: {
      pendingEvents: localDb.events.length,
      nextAction: "POST /sync/now"
    },
    outbox: outboxTotals()
  });
});

app.get("/outbox", requireToken, (_request, response) => {
  response.json({
    clinicId: clinic.id,
    messaging: localDb.messaging,
    totals: outboxTotals(),
    messages: outboxMessages()
  });
});

app.post("/outbox/:messageId/approve", requireToken, (request, response) => {
  const message = findOutboxMessage(request.params.messageId);

  if (!message) {
    return response.status(404).json({ error: "Mensaje no encontrado en bandeja de salida." });
  }

  if (message.status !== "ready_for_human_review") {
    return response.status(409).json({
      error: "El mensaje no esta pendiente de aprobacion humana.",
      status: message.status,
      message
    });
  }

  const now = new Date().toISOString();
  message.status = "approved_for_demo_delivery";
  message.approvedAt = now;
  message.approvedBy = request.body?.approvedBy ?? "human-review";
  message.providerStatus = localDb.messaging.providerMode === "demo-only" ? "not_sent_demo_only" : "approved_pending_provider";
  message.sent = false;
  addMessageAudit(message, "human_approved", {
    approvedBy: message.approvedBy,
    providerStatus: message.providerStatus
  });
  pushEvent("outbox.message.approved", `Mensaje ${message.id} aprobado para demostracion.`, {
    messageId: message.id,
    channel: message.channel
  });

  return response.json({
    ok: true,
    sent: false,
    note: "Aprobado para demo. No se envio automaticamente; queda listo para el proveedor autorizado.",
    message
  });
});

app.post("/outbox/:messageId/reject", requireToken, (request, response) => {
  const message = findOutboxMessage(request.params.messageId);

  if (!message) {
    return response.status(404).json({ error: "Mensaje no encontrado en bandeja de salida." });
  }

  message.status = "rejected_by_human";
  message.rejectedAt = new Date().toISOString();
  message.rejectedBy = request.body?.rejectedBy ?? "human-review";
  message.rejectionReason = request.body?.reason ?? "No aprobado para envio.";
  message.sent = false;
  addMessageAudit(message, "human_rejected", {
    rejectedBy: message.rejectedBy,
    reason: message.rejectionReason
  });
  pushEvent("outbox.message.rejected", `Mensaje ${message.id} rechazado por revision humana.`, {
    messageId: message.id,
    channel: message.channel
  });

  return response.json({
    ok: true,
    sent: false,
    message
  });
});

app.post("/sync/now", requireToken, (_request, response) => {
  const events = localDb.events.slice(0, 25);
  pushEvent("local.sync.exported", `${events.length} eventos enviados al central.`);

  response.json({
    clinicId: clinic.id,
    exportedAt: new Date().toISOString(),
    events,
    accounting: localDb.accounting,
    payments: localDb.payments,
    expenses: localDb.expenses,
    invoices: localDb.invoices,
    appointments: {
      total: localDb.appointments.length,
      needsConfirmation: localDb.appointments.filter((item) => item.status === "needs-confirmation").length
    }
  });
});

app.get("/events", requireToken, (_request, response) => {
  response.json({ clinicId: clinic.id, events: localDb.events });
});

app.listen(port, () => {
  console.log(`Lux Aeterna local node listening on http://localhost:${port}`);
});
