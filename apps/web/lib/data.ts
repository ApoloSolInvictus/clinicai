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

export type AppointmentChannel = "email" | "whatsapp";

export type ServiceCatalogItem = {
  id: string;
  clinicId: string;
  name: string;
  specialty: string;
  durationMinutes: number;
  price: number;
  currency: string;
  doctorHonorarium: number;
  preparationInstructions: string;
  requiresReportApproval: boolean;
};

export type AppointmentRecord = {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  price: number;
  currency: string;
  doctorHonorarium: number;
  status: "solicitada" | "confirmada" | "en-consulta" | "completada" | "cancelada";
  paymentStatus: "pendiente" | "pagado" | "facturado";
  reminderChannels: AppointmentChannel[];
  reminderStatus: "pendiente" | "programado" | "enviado" | "fallo";
  reportDeliveryStatus: "pendiente" | "aprobacion-medica" | "listo-envio" | "enviado";
  createdBy: string;
  notes: string;
  updatedAt: string;
};

export type AppointmentUpsertInput = Omit<AppointmentRecord, "id" | "updatedAt"> & {
  id?: string;
};

export type PatientCommunicationPreference = {
  email: boolean;
  whatsapp: boolean;
};

export type PatientReport = {
  id: string;
  title: string;
  type: "reporte-medico" | "recetario" | "laboratorio" | "imagen" | "referencia" | "seguimiento";
  status: "borrador" | "pendiente-aprobacion" | "aprobado" | "enviado";
  doctorName: string;
  createdAt: string;
  approvedAt?: string;
  deliveryChannels: ("email" | "whatsapp")[];
};

export type PatientInstruction = {
  id: string;
  service: string;
  category: "preparacion" | "medicamento" | "post-consulta" | "recordatorio";
  status: "pendiente" | "aprobacion-medica" | "aprobado" | "enviado";
  text: string;
  channels: ("email" | "whatsapp")[];
  scheduledFor: string;
};

export type PatientRecord = {
  id: string;
  clinicId: string;
  name: string;
  documentId: string;
  birthDate: string;
  sex: "femenino" | "masculino" | "otro";
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  emergencyContact: string;
  insuranceProvider: string;
  allergies: string;
  chronicConditions: string;
  lastVisit: string;
  nextAppointment: string;
  nextService: string;
  assignedDoctor: string;
  risk: "bajo" | "medio" | "alto";
  communication: PatientCommunicationPreference;
  pendingDocuments: string[];
  reports: PatientReport[];
  instructions: PatientInstruction[];
  doctorApprovalRequired: boolean;
  notes: string;
  updatedAt: string;
};

export type PatientUpsertInput = Omit<PatientRecord, "id" | "updatedAt"> & {
  id?: string;
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
  serviceCatalog: ServiceCatalogItem[];
  appointments: AppointmentRecord[];
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
  serviceCatalog: [
    {
      id: "svc-consulta-general",
      clinicId: defaultClinicId,
      name: "Consulta general",
      specialty: "Medicina general",
      durationMinutes: 30,
      price: 75,
      currency: "USD",
      doctorHonorarium: 45,
      preparationInstructions: "Llegar 15 minutos antes con documento de identidad y lista de medicamentos activos.",
      requiresReportApproval: true
    },
    {
      id: "svc-control-cardiologia",
      clinicId: defaultClinicId,
      name: "Control cardiologia",
      specialty: "Cardiologia",
      durationMinutes: 45,
      price: 110,
      currency: "USD",
      doctorHonorarium: 65,
      preparationInstructions: "Traer examenes previos y evitar cafeina 4 horas antes si se solicitara electrocardiograma.",
      requiresReportApproval: true
    },
    {
      id: "svc-laboratorio-control",
      clinicId: defaultClinicId,
      name: "Laboratorio y control",
      specialty: "Laboratorio",
      durationMinutes: 45,
      price: 95,
      currency: "USD",
      doctorHonorarium: 50,
      preparationInstructions: "Ayuno de 8 horas cuando aplique. Confirmar medicamentos activos antes de enviar instrucciones.",
      requiresReportApproval: true
    },
    {
      id: "svc-seguimiento-respiratorio",
      clinicId: defaultClinicId,
      name: "Seguimiento respiratorio",
      specialty: "Medicina general",
      durationMinutes: 45,
      price: 90,
      currency: "USD",
      doctorHonorarium: 55,
      preparationInstructions: "Traer inhaladores actuales y anotar sintomas de los ultimos 7 dias.",
      requiresReportApproval: true
    }
  ],
  appointments: [
    {
      id: "appt-100",
      clinicId: defaultClinicId,
      patientId: "pat-100",
      patientName: "Maria Fernanda Rojas",
      doctorId: "staff-1",
      doctorName: "Dra. Elena Vargas",
      serviceId: "svc-consulta-general",
      serviceName: "Consulta general",
      startsAt: "2026-06-10T09:30",
      endsAt: "2026-06-10T10:00",
      price: 75,
      currency: "USD",
      doctorHonorarium: 45,
      status: "confirmada",
      paymentStatus: "pendiente",
      reminderChannels: ["email", "whatsapp"],
      reminderStatus: "programado",
      reportDeliveryStatus: "aprobacion-medica",
      createdBy: "Call Center",
      notes: "Confirmar asistencia y preparar reporte medico posterior.",
      updatedAt: now
    },
    {
      id: "appt-101",
      clinicId: defaultClinicId,
      patientId: "pat-101",
      patientName: "Jorge Alberto Mendez",
      doctorId: "staff-2",
      doctorName: "Dr. Marco Solis",
      serviceId: "svc-laboratorio-control",
      serviceName: "Laboratorio y control",
      startsAt: "2026-06-11T11:00",
      endsAt: "2026-06-11T11:45",
      price: 95,
      currency: "USD",
      doctorHonorarium: 50,
      status: "confirmada",
      paymentStatus: "pendiente",
      reminderChannels: ["email", "whatsapp"],
      reminderStatus: "pendiente",
      reportDeliveryStatus: "aprobacion-medica",
      createdBy: "Call Center",
      notes: "Enviar preparacion de laboratorio tras aprobacion medica.",
      updatedAt: now
    },
    {
      id: "appt-102",
      clinicId: defaultClinicId,
      patientId: "pat-102",
      patientName: "Sofia Camila Alvarez",
      doctorId: "staff-1",
      doctorName: "Dra. Elena Vargas",
      serviceId: "svc-seguimiento-respiratorio",
      serviceName: "Seguimiento respiratorio",
      startsAt: "2026-06-14T15:00",
      endsAt: "2026-06-14T15:45",
      price: 90,
      currency: "USD",
      doctorHonorarium: 55,
      status: "solicitada",
      paymentStatus: "pendiente",
      reminderChannels: ["email"],
      reminderStatus: "pendiente",
      reportDeliveryStatus: "pendiente",
      createdBy: "Call Center",
      notes: "Validar sintomas recientes antes de finalizar reporte.",
      updatedAt: now
    }
  ],
  patients: [
    {
      id: "pat-100",
      clinicId: defaultClinicId,
      name: "Maria Fernanda Rojas",
      documentId: "CR-0001",
      birthDate: "1986-03-14",
      sex: "femenino",
      phone: "+506 2222-0101",
      whatsapp: "+506 8888-0101",
      email: "maria.rojas@example.local",
      address: "San Jose, Costa Rica",
      emergencyContact: "Carlos Rojas, +506 8888-1101",
      insuranceProvider: "Privado",
      allergies: "Penicilina",
      chronicConditions: "Hipertension controlada",
      lastVisit: "2026-06-05",
      nextAppointment: "2026-06-10 09:30",
      nextService: "Consulta general",
      assignedDoctor: "Dra. Elena Vargas",
      risk: "bajo",
      communication: { email: true, whatsapp: true },
      pendingDocuments: ["reporte-medico"],
      reports: [
        {
          id: "patrep-100-1",
          title: "Reporte medico de control",
          type: "reporte-medico",
          status: "pendiente-aprobacion",
          doctorName: "Dra. Elena Vargas",
          createdAt: "2026-06-05T16:20:00.000Z",
          deliveryChannels: ["email", "whatsapp"]
        }
      ],
      instructions: [
        {
          id: "patins-100-1",
          service: "Consulta general",
          category: "recordatorio",
          status: "pendiente",
          text: "Enviar recordatorio de cita y confirmar asistencia 24 horas antes.",
          channels: ["email", "whatsapp"],
          scheduledFor: "2026-06-09 09:30"
        }
      ],
      doctorApprovalRequired: true,
      notes: "Paciente solicita recibir copia digital de documentos aprobados.",
      updatedAt: now
    },
    {
      id: "pat-101",
      clinicId: defaultClinicId,
      name: "Jorge Alberto Mendez",
      documentId: "CR-0002",
      birthDate: "1978-11-02",
      sex: "masculino",
      phone: "+506 2222-0202",
      whatsapp: "+506 8888-0202",
      email: "jorge.mendez@example.local",
      address: "Heredia, Costa Rica",
      emergencyContact: "Laura Mendez, +506 8888-1202",
      insuranceProvider: "INS",
      allergies: "Sin alergias registradas",
      chronicConditions: "Diabetes tipo 2",
      lastVisit: "2026-06-03",
      nextAppointment: "2026-06-11 11:00",
      nextService: "Laboratorio y control",
      assignedDoctor: "Dr. Marco Solis",
      risk: "medio",
      communication: { email: true, whatsapp: true },
      pendingDocuments: ["recetario", "orden-laboratorio"],
      reports: [
        {
          id: "patrep-101-1",
          title: "Recetario de control metabolico",
          type: "recetario",
          status: "pendiente-aprobacion",
          doctorName: "Dr. Marco Solis",
          createdAt: "2026-06-03T18:10:00.000Z",
          deliveryChannels: ["email"]
        },
        {
          id: "patrep-101-2",
          title: "Orden de laboratorio",
          type: "laboratorio",
          status: "borrador",
          doctorName: "Dr. Marco Solis",
          createdAt: "2026-06-03T18:16:00.000Z",
          deliveryChannels: ["email", "whatsapp"]
        }
      ],
      instructions: [
        {
          id: "patins-101-1",
          service: "Laboratorio",
          category: "preparacion",
          status: "aprobacion-medica",
          text: "Ayuno de 8 horas antes de la toma de muestra. Confirmar con medico antes de enviar.",
          channels: ["whatsapp"],
          scheduledFor: "2026-06-10 08:00"
        }
      ],
      doctorApprovalRequired: true,
      notes: "Requiere control de medicamentos activos antes de emitir receta.",
      updatedAt: now
    },
    {
      id: "pat-102",
      clinicId: defaultClinicId,
      name: "Sofia Camila Alvarez",
      documentId: "CR-0003",
      birthDate: "1994-07-25",
      sex: "femenino",
      phone: "+506 2222-0303",
      whatsapp: "+506 8888-0303",
      email: "sofia.alvarez@example.local",
      address: "Cartago, Costa Rica",
      emergencyContact: "Daniel Alvarez, +506 8888-1303",
      insuranceProvider: "Privado",
      allergies: "Mariscos",
      chronicConditions: "Asma",
      lastVisit: "2026-05-29",
      nextAppointment: "2026-06-14 15:00",
      nextService: "Seguimiento respiratorio",
      assignedDoctor: "Dra. Elena Vargas",
      risk: "alto",
      communication: { email: true, whatsapp: false },
      pendingDocuments: ["seguimiento", "referencia"],
      reports: [
        {
          id: "patrep-102-1",
          title: "Seguimiento respiratorio",
          type: "seguimiento",
          status: "pendiente-aprobacion",
          doctorName: "Dra. Elena Vargas",
          createdAt: "2026-05-29T20:00:00.000Z",
          deliveryChannels: ["email"]
        }
      ],
      instructions: [
        {
          id: "patins-102-1",
          service: "Seguimiento respiratorio",
          category: "medicamento",
          status: "aprobacion-medica",
          text: "Preparar indicaciones de inhalador y signos de alarma para aprobacion medica.",
          channels: ["email"],
          scheduledFor: "2026-06-14 16:30"
        }
      ],
      doctorApprovalRequired: true,
      notes: "Validar signos de alarma antes de cerrar reporte.",
      updatedAt: now
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

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type LegacyPatientRecord = Partial<PatientRecord> &
  Pick<PatientRecord, "id" | "clinicId" | "name" | "documentId">;

type LegacyAppointmentRecord = Partial<AppointmentRecord> &
  Pick<
    AppointmentRecord,
    "id" | "clinicId" | "patientId" | "patientName" | "doctorId" | "doctorName" | "serviceId" | "serviceName" | "startsAt"
  >;

type RecoverableCentralState = Omit<CentralState, "serviceCatalog" | "appointments"> &
  Partial<Pick<CentralState, "serviceCatalog" | "appointments">>;

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addMinutes(value: string, minutes: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setMinutes(date.getMinutes() + minutes);
  return localDateTime(date);
}

function appointmentTime(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizePatient(patient: LegacyPatientRecord): PatientRecord {
  const pendingDocuments = patient.pendingDocuments ?? [];
  const reports = patient.reports ?? pendingDocuments.map((documentName, index) => ({
    id: `${patient.id}-report-${index + 1}`,
    title: documentName,
    type: documentName === "recetario" ? "recetario" : "reporte-medico",
    status: "pendiente-aprobacion",
    doctorName: patient.assignedDoctor ?? "Medico pendiente",
    createdAt: patient.updatedAt ?? now,
    deliveryChannels: ["email", "whatsapp"]
  } satisfies PatientReport));

  return {
    id: patient.id,
    clinicId: patient.clinicId,
    name: patient.name,
    documentId: patient.documentId,
    birthDate: patient.birthDate ?? "",
    sex: patient.sex ?? "otro",
    phone: patient.phone ?? "",
    whatsapp: patient.whatsapp ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    emergencyContact: patient.emergencyContact ?? "",
    insuranceProvider: patient.insuranceProvider ?? "",
    allergies: patient.allergies ?? "",
    chronicConditions: patient.chronicConditions ?? "",
    lastVisit: patient.lastVisit ?? "",
    nextAppointment: patient.nextAppointment ?? "",
    nextService: patient.nextService ?? "",
    assignedDoctor: patient.assignedDoctor ?? "",
    risk: patient.risk ?? "bajo",
    communication: patient.communication ?? { email: Boolean(patient.email), whatsapp: Boolean(patient.whatsapp) },
    pendingDocuments,
    reports,
    instructions: patient.instructions ?? [],
    doctorApprovalRequired: patient.doctorApprovalRequired ?? reports.some((report) => report.status === "pendiente-aprobacion"),
    notes: patient.notes ?? "",
    updatedAt: patient.updatedAt ?? now
  };
}

function normalizeAppointment(appointment: LegacyAppointmentRecord): AppointmentRecord {
  const service = initialState.serviceCatalog.find((item) => item.id === appointment.serviceId);
  const startsAt = appointment.startsAt;
  const duration = service?.durationMinutes ?? 30;

  return {
    id: appointment.id,
    clinicId: appointment.clinicId,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName,
    serviceId: appointment.serviceId,
    serviceName: appointment.serviceName,
    startsAt,
    endsAt: appointment.endsAt ?? addMinutes(startsAt, duration),
    price: appointment.price ?? service?.price ?? 0,
    currency: appointment.currency ?? service?.currency ?? "USD",
    doctorHonorarium: appointment.doctorHonorarium ?? service?.doctorHonorarium ?? 0,
    status: appointment.status ?? "solicitada",
    paymentStatus: appointment.paymentStatus ?? "pendiente",
    reminderChannels: appointment.reminderChannels ?? ["email", "whatsapp"],
    reminderStatus: appointment.reminderStatus ?? "pendiente",
    reportDeliveryStatus: appointment.reportDeliveryStatus ?? "pendiente",
    createdBy: appointment.createdBy ?? "Call Center",
    notes: appointment.notes ?? "",
    updatedAt: appointment.updatedAt ?? now
  };
}

function findAppointmentConflicts(state: CentralState, appointment: AppointmentRecord) {
  const startsAt = appointmentTime(appointment.startsAt);
  const endsAt = appointmentTime(appointment.endsAt);
  if (!startsAt || !endsAt) return [];

  return state.appointments.filter((candidate) => {
    if (candidate.id === appointment.id || candidate.clinicId !== appointment.clinicId) return false;
    if (candidate.doctorId !== appointment.doctorId || candidate.status === "cancelada") return false;
    const candidateStartsAt = appointmentTime(candidate.startsAt);
    const candidateEndsAt = appointmentTime(candidate.endsAt);
    return startsAt < candidateEndsAt && endsAt > candidateStartsAt;
  });
}

function ensureStateShape(state: RecoverableCentralState): CentralState {
  state.serviceCatalog ??= structuredClone(initialState.serviceCatalog);
  state.appointments ??= structuredClone(initialState.appointments);
  state.patients = state.patients.map((patient) => normalizePatient(patient));
  state.appointments = state.appointments.map((appointment) => normalizeAppointment(appointment));
  return state as CentralState;
}

export function getState() {
  if (!globalThis.luxAeternaState) {
    globalThis.luxAeternaState = structuredClone(initialState);
  }

  return ensureStateShape(globalThis.luxAeternaState);
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
    serviceCatalog: state.serviceCatalog.filter((item) => allowed.has(item.clinicId)),
    appointments: state.appointments.filter((item) => allowed.has(item.clinicId)),
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

export function upsertPatient(input: PatientUpsertInput) {
  const state = getState();
  const timestamp = new Date().toISOString();
  const normalized = normalizePatient({
    ...input,
    id: input.id ?? makeId("pat"),
    updatedAt: timestamp
  });
  const index = state.patients.findIndex((patient) => patient.id === normalized.id);

  if (index >= 0) {
    state.patients[index] = normalized;
  } else {
    state.patients.unshift(normalized);
  }

  state.events.unshift({
    id: makeId("evt"),
    clinicId: normalized.clinicId,
    type: index >= 0 ? "patient.updated" : "patient.created",
    message: `${normalized.name} ${index >= 0 ? "actualizado" : "ingresado"} en el perfil de pacientes.`,
    at: timestamp
  });

  return normalized;
}

export function upsertAppointment(input: AppointmentUpsertInput) {
  const state = getState();
  const timestamp = new Date().toISOString();
  const service = state.serviceCatalog.find((item) => item.id === input.serviceId);
  const patient = state.patients.find((item) => item.id === input.patientId);
  const normalized = normalizeAppointment({
    ...input,
    id: input.id ?? makeId("appt"),
    patientName: patient?.name ?? input.patientName,
    serviceName: service?.name ?? input.serviceName,
    price: input.price ?? service?.price ?? 0,
    currency: input.currency || service?.currency || "USD",
    doctorHonorarium: input.doctorHonorarium ?? service?.doctorHonorarium ?? 0,
    endsAt: input.endsAt || addMinutes(input.startsAt, service?.durationMinutes ?? 30),
    updatedAt: timestamp
  });
  const index = state.appointments.findIndex((appointment) => appointment.id === normalized.id);
  const conflicts = findAppointmentConflicts(state, normalized);

  if (index >= 0) {
    state.appointments[index] = normalized;
  } else {
    state.appointments.unshift(normalized);
  }

  if (patient) {
    patient.nextAppointment = normalized.startsAt.replace("T", " ");
    patient.nextService = normalized.serviceName;
    patient.assignedDoctor = normalized.doctorName;
    patient.updatedAt = timestamp;
  }

  state.events.unshift({
    id: makeId("evt"),
    clinicId: normalized.clinicId,
    type: conflicts.length > 0 ? "appointment.conflict.detected" : index >= 0 ? "appointment.updated" : "appointment.created",
    message:
      conflicts.length > 0
        ? `${normalized.doctorName} tiene conflicto de agenda para ${normalized.startsAt}.`
        : `${normalized.patientName} ${index >= 0 ? "actualizado" : "agendado"} para ${normalized.serviceName}.`,
    at: timestamp
  });

  return { appointment: normalized, conflicts };
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
