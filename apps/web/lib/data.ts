export type TaskIntent =
  | "agenda"
  | "correos"
  | "contabilidad"
  | "historial"
  | "gestion-local"
  | "sync";

export type Clinic = {
  id: string;
  name: string;
  region: string;
  nodeUrl: string;
  status: "online" | "degraded" | "offline";
  lastSync: string;
};

export type AutomationTask = {
  id: string;
  clinicId: string;
  intent: TaskIntent;
  priority: "normal" | "alta" | "critica";
  prompt: string;
  status: "queued" | "sent-local" | "completed" | "failed";
  createdAt: string;
  result?: unknown;
};

export type EventLog = {
  id: string;
  clinicId: string;
  type: string;
  message: string;
  at: string;
};

export type CentralState = {
  clinics: Clinic[];
  tasks: AutomationTask[];
  events: EventLog[];
};

const now = new Date().toISOString();

const initialState: CentralState = {
  clinics: [
    {
      id: "clinic-san-jose",
      name: "Clinica San Jose",
      region: "Costa Rica",
      nodeUrl: process.env.NEXT_PUBLIC_LOCAL_NODE_URL ?? "http://localhost:8787",
      status: "degraded",
      lastSync: now
    },
    {
      id: "clinic-escazu",
      name: "Clinica Escazu",
      region: "Costa Rica",
      nodeUrl: "pending-docker-node",
      status: "offline",
      lastSync: now
    }
  ],
  tasks: [
    {
      id: "task-seed-1",
      clinicId: "clinic-san-jose",
      intent: "agenda",
      priority: "normal",
      prompt: "Revisar conflictos de agenda para manana y preparar confirmaciones.",
      status: "queued",
      createdAt: now
    }
  ],
  events: [
    {
      id: "evt-seed-1",
      clinicId: "clinic-san-jose",
      type: "architecture.ready",
      message: "Modelo hibrido inicializado: Vercel central + Docker local.",
      at: now
    }
  ]
};

declare global {
  // eslint-disable-next-line no-var
  var luxAeternaState: CentralState | undefined;
}

export function getState() {
  if (!globalThis.luxAeternaState) {
    globalThis.luxAeternaState = structuredClone(initialState);
  }

  return globalThis.luxAeternaState;
}

export function createTask(input: Omit<AutomationTask, "id" | "status" | "createdAt">) {
  const state = getState();
  const task: AutomationTask = {
    ...input,
    id: `task-${Date.now()}`,
    status: "queued",
    createdAt: new Date().toISOString()
  };

  state.tasks.unshift(task);
  state.events.unshift({
    id: `evt-${Date.now()}`,
    clinicId: input.clinicId,
    type: "central.task.created",
    message: `Tarea ${task.intent} creada para ejecucion local.`,
    at: task.createdAt
  });

  return task;
}

export function patchTask(taskId: string, patch: Partial<AutomationTask>) {
  const state = getState();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return undefined;
  Object.assign(task, patch);
  return task;
}

export function patchClinic(clinicId: string, patch: Partial<Clinic>) {
  const state = getState();
  const clinic = state.clinics.find((item) => item.id === clinicId);
  if (!clinic) return undefined;
  Object.assign(clinic, patch);
  return clinic;
}

export function addEvent(event: Omit<EventLog, "id" | "at"> & { at?: string }) {
  const state = getState();
  const fullEvent: EventLog = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: event.at ?? new Date().toISOString()
  };

  state.events.unshift(fullEvent);
  return fullEvent;
}
