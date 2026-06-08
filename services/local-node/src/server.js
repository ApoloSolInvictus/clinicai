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
  token: process.env.LOCAL_NODE_TOKEN ?? "dev-local-node-token"
};

const localDb = {
  appointments: [
    {
      id: "apt-1001",
      patientName: "Paciente A",
      patientEmail: "paciente-a@example.local",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      status: "needs-confirmation"
    },
    {
      id: "apt-1002",
      patientName: "Paciente B",
      patientEmail: "paciente-b@example.local",
      startsAt: new Date(Date.now() + 90000000).toISOString(),
      status: "confirmed"
    }
  ],
  patients: [
    { id: "pat-1", lastVisit: "2026-06-01", risk: "low" },
    { id: "pat-2", lastVisit: "2026-05-21", risk: "medium" }
  ],
  accounting: {
    revenueToday: 1275,
    pendingInvoices: 8,
    expensesMonth: 2410,
    currency: "USD"
  },
  emailQueue: [],
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
      queuedEmails: localDb.emailQueue.length,
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
