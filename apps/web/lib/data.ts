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

export type RoleDefinition = {
  id: string;
  name: string;
  scope: string;
  permissions: string[];
  description: string;
};

export type StaffMember = {
  id: string;
  clinicId: string;
  name: string;
  role: string;
  email: string;
  status: "activo" | "pendiente" | "suspendido";
  verifiedHoursMonth: number;
};

export type DoctorSchedule = {
  id: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  day: string;
  startsAt: string;
  endsAt: string;
  verifiedHours: number;
  appointments: number;
  status: "verificado" | "pendiente" | "conflicto";
};

export type PatientRecord = {
  id: string;
  clinicId: string;
  name: string;
  documentId: string;
  lastVisit: string;
  nextAppointment: string;
  risk: "bajo" | "medio" | "alto";
  pendingDocuments: string[];
  doctorApprovalRequired: boolean;
};

export type CashRegister = {
  id: string;
  clinicId: string;
  period: "diario" | "semanal" | "mensual";
  revenue: number;
  expenses: number;
  pendingInvoices: number;
  currency: string;
  status: "abierto" | "listo-contador" | "requiere-revision";
  preparedBy: string;
  updatedAt: string;
};

export type ReportSummary = {
  id: string;
  clinicId: string;
  title: string;
  ownerRole: string;
  status: "listo" | "pendiente" | "requiere-aprobacion";
  updatedAt: string;
  metrics: { label: string; value: string }[];
};

export type AutomationTemplate = {
  id: string;
  clinicId: string;
  name: string;
  intent: TaskIntent;
  role: string;
  priority: "normal" | "alta" | "critica";
  prompt: string;
  expectedOutput: string;
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
  roles: RoleDefinition[];
  staff: StaffMember[];
  schedules: DoctorSchedule[];
  patients: PatientRecord[];
  cashRegisters: CashRegister[];
  reports: ReportSummary[];
  automations: AutomationTemplate[];
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
  ],
  roles: [
    {
      id: "platform-admin",
      name: "Admin Plataforma",
      scope: "Global",
      permissions: ["clinicas", "usuarios", "reportes", "automatizaciones"],
      description: "Control total de clinicas, nodos Docker y configuracion central."
    },
    {
      id: "clinic-admin",
      name: "Admin Clinica",
      scope: "Clinica",
      permissions: ["agenda", "caja", "personal", "pacientes"],
      description: "Opera una clinica completa y aprueba flujos administrativos."
    },
    {
      id: "medico",
      name: "Medico",
      scope: "Clinica",
      permissions: ["agenda", "historial", "recetas", "aprobaciones"],
      description: "Valida reportes medicos, recetas y horas clinicas."
    },
    {
      id: "cajera",
      name: "Cajera",
      scope: "Caja",
      permissions: ["cierre-diario", "facturas", "recibos"],
      description: "Prepara cierres diarios, semanales y mensuales para contador."
    },
    {
      id: "contador",
      name: "Contador",
      scope: "Finanzas",
      permissions: ["reportes", "cierre-mensual", "auditoria"],
      description: "Recibe cierres verificados y consolida control financiero."
    },
    {
      id: "recepcion",
      name: "Recepcion",
      scope: "Agenda",
      permissions: ["citas", "confirmaciones", "pacientes"],
      description: "Gestiona citas, pacientes y mensajes de confirmacion."
    }
  ],
  staff: [
    {
      id: "staff-1",
      clinicId: defaultClinicId,
      name: "Dra. Elena Vargas",
      role: "medico",
      email: "elena.vargas@example.local",
      status: "activo",
      verifiedHoursMonth: 128
    },
    {
      id: "staff-2",
      clinicId: defaultClinicId,
      name: "Dr. Marco Solis",
      role: "medico",
      email: "marco.solis@example.local",
      status: "activo",
      verifiedHoursMonth: 96
    },
    {
      id: "staff-3",
      clinicId: defaultClinicId,
      name: "Ana Rojas",
      role: "cajera",
      email: "ana.rojas@example.local",
      status: "activo",
      verifiedHoursMonth: 154
    },
    {
      id: "staff-4",
      clinicId: defaultClinicId,
      name: "Laura Mendez",
      role: "recepcion",
      email: "laura.mendez@example.local",
      status: "activo",
      verifiedHoursMonth: 160
    }
  ],
  schedules: [
    {
      id: "sch-1",
      clinicId: defaultClinicId,
      doctorId: "staff-1",
      doctorName: "Dra. Elena Vargas",
      specialty: "Medicina general",
      day: "Lunes",
      startsAt: "08:00",
      endsAt: "14:00",
      verifiedHours: 6,
      appointments: 12,
      status: "verificado"
    },
    {
      id: "sch-2",
      clinicId: defaultClinicId,
      doctorId: "staff-1",
      doctorName: "Dra. Elena Vargas",
      specialty: "Medicina general",
      day: "Miercoles",
      startsAt: "09:00",
      endsAt: "15:00",
      verifiedHours: 6,
      appointments: 10,
      status: "pendiente"
    },
    {
      id: "sch-3",
      clinicId: defaultClinicId,
      doctorId: "staff-2",
      doctorName: "Dr. Marco Solis",
      specialty: "Cardiologia",
      day: "Martes",
      startsAt: "10:00",
      endsAt: "16:00",
      verifiedHours: 6,
      appointments: 8,
      status: "verificado"
    },
    {
      id: "sch-4",
      clinicId: defaultClinicId,
      doctorId: "staff-2",
      doctorName: "Dr. Marco Solis",
      specialty: "Cardiologia",
      day: "Viernes",
      startsAt: "13:00",
      endsAt: "18:00",
      verifiedHours: 5,
      appointments: 6,
      status: "conflicto"
    }
  ],
  patients: [
    {
      id: "pat-100",
      clinicId: defaultClinicId,
      name: "Paciente A",
      documentId: "CR-0001",
      lastVisit: "2026-06-05",
      nextAppointment: "2026-06-10 09:30",
      risk: "bajo",
      pendingDocuments: ["reporte-medico"],
      doctorApprovalRequired: true
    },
    {
      id: "pat-101",
      clinicId: defaultClinicId,
      name: "Paciente B",
      documentId: "CR-0002",
      lastVisit: "2026-06-03",
      nextAppointment: "2026-06-11 11:00",
      risk: "medio",
      pendingDocuments: ["recetario", "orden-laboratorio"],
      doctorApprovalRequired: true
    },
    {
      id: "pat-102",
      clinicId: defaultClinicId,
      name: "Paciente C",
      documentId: "CR-0003",
      lastVisit: "2026-05-29",
      nextAppointment: "2026-06-14 15:00",
      risk: "alto",
      pendingDocuments: ["seguimiento", "referencia"],
      doctorApprovalRequired: true
    }
  ],
  cashRegisters: [
    {
      id: "cash-day",
      clinicId: defaultClinicId,
      period: "diario",
      revenue: 1275,
      expenses: 210,
      pendingInvoices: 8,
      currency: "USD",
      status: "requiere-revision",
      preparedBy: "Ana Rojas",
      updatedAt: now
    },
    {
      id: "cash-week",
      clinicId: defaultClinicId,
      period: "semanal",
      revenue: 6890,
      expenses: 1320,
      pendingInvoices: 19,
      currency: "USD",
      status: "listo-contador",
      preparedBy: "Ana Rojas",
      updatedAt: now
    },
    {
      id: "cash-month",
      clinicId: defaultClinicId,
      period: "mensual",
      revenue: 28400,
      expenses: 9410,
      pendingInvoices: 34,
      currency: "USD",
      status: "abierto",
      preparedBy: "Contabilidad",
      updatedAt: now
    }
  ],
  reports: [
    {
      id: "rep-1",
      clinicId: defaultClinicId,
      title: "Cierre financiero para contador",
      ownerRole: "contador",
      status: "requiere-aprobacion",
      updatedAt: now,
      metrics: [
        { label: "Ingresos", value: "$28,400" },
        { label: "Gastos", value: "$9,410" },
        { label: "Pendientes", value: "34" }
      ]
    },
    {
      id: "rep-2",
      clinicId: defaultClinicId,
      title: "Horas medicas verificadas",
      ownerRole: "clinic-admin",
      status: "pendiente",
      updatedAt: now,
      metrics: [
        { label: "Doctores", value: "2" },
        { label: "Horas", value: "224" },
        { label: "Conflictos", value: "1" }
      ]
    },
    {
      id: "rep-3",
      clinicId: defaultClinicId,
      title: "Documentos clinicos por aprobar",
      ownerRole: "medico",
      status: "pendiente",
      updatedAt: now,
      metrics: [
        { label: "Reportes", value: "3" },
        { label: "Recetas", value: "2" },
        { label: "Riesgo alto", value: "1" }
      ]
    }
  ],
  automations: [
    {
      id: "auto-caja-diaria",
      clinicId: defaultClinicId,
      name: "Cierre de caja diario",
      intent: "contabilidad",
      role: "cajera",
      priority: "alta",
      prompt:
        "Prepara el cierre de caja diario con ingresos, gastos, facturas pendientes, diferencias y resumen listo para contador. No cierres nada sin aprobacion humana.",
      expectedOutput: "JSON con estado, resumen, alertas, aprobacion_requerida y acciones."
    },
    {
      id: "auto-agenda-medica",
      clinicId: defaultClinicId,
      name: "Auditoria de agenda medica",
      intent: "agenda",
      role: "recepcion",
      priority: "alta",
      prompt:
        "Revisa horarios medicos, citas del dia, conflictos, confirmaciones pendientes y horas verificadas por medico.",
      expectedOutput: "Resumen ejecutivo para administracion y lista de conflictos."
    },
    {
      id: "auto-receta-reporte",
      clinicId: defaultClinicId,
      name: "Reporte medico y recetario",
      intent: "historial",
      role: "medico",
      priority: "critica",
      prompt:
        "Prepara borrador de reporte medico y recetario para pacientes con documentos pendientes. Marca todo como requiere aprobacion del medico antes de envio.",
      expectedOutput: "Borradores con datos minimos, aprobacion_requerida y canales sugeridos."
    },
    {
      id: "auto-sync-contador",
      clinicId: defaultClinicId,
      name: "Paquete semanal para contador",
      intent: "sync",
      role: "contador",
      priority: "normal",
      prompt:
        "Compacta eventos, cierre de caja semanal, facturas pendientes y alertas para sincronizacion central del contador.",
      expectedOutput: "Batch de sincronizacion con trazabilidad y alertas."
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
    events: state.events.filter((event) => allowed.has(event.clinicId)),
    roles: state.roles,
    staff: state.staff.filter((item) => allowed.has(item.clinicId)),
    schedules: state.schedules.filter((item) => allowed.has(item.clinicId)),
    patients: state.patients.filter((item) => allowed.has(item.clinicId)),
    cashRegisters: state.cashRegisters.filter((item) => allowed.has(item.clinicId)),
    reports: state.reports.filter((item) => allowed.has(item.clinicId)),
    automations: state.automations.filter((item) => allowed.has(item.clinicId))
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
