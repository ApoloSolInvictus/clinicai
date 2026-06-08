import { getPublicClinics } from "./clinic-config";

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
const configuredClinics = getPublicClinics();
const defaultClinicId = configuredClinics[0]?.id ?? "clinic-san-jose";

const initialState: CentralState = {
  clinics: configuredClinics,
  tasks: [
    {
      id: "task-seed-1",
      clinicId: defaultClinicId,
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
      clinicId: defaultClinicId,
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

export function getStateForAccess(access: { allClinics: boolean; clinicIds: string[] }) {
  const state = getState();
  if (access.allClinics) return state;
  const allowed = new Set(access.clinicIds);

  return {
    clinics: state.clinics.filter((clinic) => allowed.has(clinic.id)),
    tasks: state.tasks.filter((task) => allowed.has(task.clinicId)),
    events: state.events.filter((event) => allowed.has(event.clinicId))
  };
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
