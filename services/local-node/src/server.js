import cors from "cors";
import express from "express";
import { getOpenClawStatus, runAutomation } from "./openclaw-adapter.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const clinic = {
  id: process.env.CLINIC_ID ?? "clinic-san-jose",
  name: process.env.CLINIC_NAME ?? "Clinica San Jose"
};
const config = {
  mode: process.env.OPENCLAW_MODE ?? "mock",
  gatewayUrl: process.env.OPENCLAW_GATEWAY_URL ?? "http://host.docker.internal:18789",
  gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN ?? "",
  runnerUrl: process.env.OPENCLAW_RUNNER_URL ?? "",
  runnerTimeoutMs: Number(process.env.OPENCLAW_RUNNER_TIMEOUT_MS ?? 30_000),
  token: process.env.LOCAL_NODE_TOKEN ?? "dev-local-node-token"
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
app.use(express.json({ limit: "1mb" }));

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

app.get("/health", async (_request, response) => {
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
    }
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
