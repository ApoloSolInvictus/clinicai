import { getPublicClinic, getPublicClinics } from "./clinic-config";

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
  phone: string;
  licenseNumber: string;
  specialty: string;
  status: "activo" | "pendiente" | "suspendido";
  verifiedHoursMonth: number;
  defaultHonorarium: number;
  currency: string;
  paymentMethod: string;
  serviceIds: string[];
  signatureLabel: string;
  reportApprovalEnabled: boolean;
  notes: string;
  updatedAt: string;
};

export type StaffUpsertInput = Omit<StaffMember, "id" | "updatedAt"> & {
  id?: string;
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

export type DoctorScheduleUpsertInput = Omit<DoctorSchedule, "id"> & {
  id?: string;
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
  summary: string;
  prescription: string;
  nextAppointment: string;
  medicalImages: string[];
  signedByDoctor: string;
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

export type CashPaymentMethod = "efectivo" | "tarjeta" | "sinpe" | "transferencia";

export type CashTransaction = {
  id: string;
  clinicId: string;
  appointmentId?: string;
  patientId?: string;
  patientName: string;
  serviceName: string;
  method: CashPaymentMethod;
  amount: number;
  currency: string;
  status: "pendiente" | "completado" | "anulado";
  reference: string;
  receivedBy: string;
  paidAt: string;
  notes: string;
};

export type CashExpense = {
  id: string;
  clinicId: string;
  category: "empresa" | "medicos" | "insumos" | "servicios" | "alquiler" | "otros";
  description: string;
  amount: number;
  currency: string;
  method: CashPaymentMethod;
  status: "pendiente" | "pagado" | "registrado";
  vendor: string;
  paidAt: string;
  notes: string;
};

export type PendingInvoice = {
  id: string;
  clinicId: string;
  appointmentId?: string;
  patientId?: string;
  patientName: string;
  concept: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "pendiente" | "pagada" | "vencida";
  notes: string;
};

export type CashTransactionInput = Omit<CashTransaction, "id"> & {
  id?: string;
};

export type CashExpenseInput = Omit<CashExpense, "id"> & {
  id?: string;
};

export type PendingInvoiceInput = Omit<PendingInvoice, "id"> & {
  id?: string;
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
  cashTransactions: CashTransaction[];
  cashExpenses: CashExpense[];
  pendingInvoices: PendingInvoice[];
  reports: ReportSummary[];
  automations: AutomationTemplate[];
};

const now = new Date().toISOString();
const configuredClinics = getPublicClinics();
const defaultClinicId = configuredClinics[0]?.id ?? "clinic-san-jose";
const prototypeUsdToCrc = 500;

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
      phone: "+506 8888-2101",
      licenseNumber: "MED-CR-10245",
      specialty: "Medicina general",
      status: "activo",
      verifiedHoursMonth: 128,
      defaultHonorarium: 21000,
      currency: "CRC",
      paymentMethod: "Transferencia bancaria",
      serviceIds: ["svc-consulta-general", "svc-seguimiento-respiratorio"],
      signatureLabel: "Dra. Elena Vargas - MED-CR-10245",
      reportApprovalEnabled: true,
      notes: "Aprueba reportes medicos, seguimientos y recetarios de medicina general.",
      updatedAt: now
    },
    {
      id: "staff-2",
      clinicId: defaultClinicId,
      name: "Dr. Marco Solis",
      role: "medico",
      email: "marco.solis@example.local",
      phone: "+506 8888-2202",
      licenseNumber: "MED-CR-20412",
      specialty: "Cardiologia",
      status: "activo",
      verifiedHoursMonth: 96,
      defaultHonorarium: 27500,
      currency: "CRC",
      paymentMethod: "Transferencia bancaria",
      serviceIds: ["svc-control-cardiologia", "svc-laboratorio-control"],
      signatureLabel: "Dr. Marco Solis - MED-CR-20412",
      reportApprovalEnabled: true,
      notes: "Aprueba controles cardiologicos, laboratorios y recetas de seguimiento.",
      updatedAt: now
    },
    {
      id: "staff-3",
      clinicId: defaultClinicId,
      name: "Ana Rojas",
      role: "cajera",
      email: "ana.rojas@example.local",
      phone: "+506 8888-2303",
      licenseNumber: "",
      specialty: "Caja",
      status: "activo",
      verifiedHoursMonth: 154,
      defaultHonorarium: 0,
      currency: "CRC",
      paymentMethod: "Planilla",
      serviceIds: [],
      signatureLabel: "",
      reportApprovalEnabled: false,
      notes: "Gestion de caja y cierres financieros.",
      updatedAt: now
    },
    {
      id: "staff-4",
      clinicId: defaultClinicId,
      name: "Laura Mendez",
      role: "recepcion",
      email: "laura.mendez@example.local",
      phone: "+506 8888-2404",
      licenseNumber: "",
      specialty: "Recepcion",
      status: "activo",
      verifiedHoursMonth: 160,
      defaultHonorarium: 0,
      currency: "CRC",
      paymentMethod: "Planilla",
      serviceIds: [],
      signatureLabel: "",
      reportApprovalEnabled: false,
      notes: "Call Center, agenda y confirmaciones.",
      updatedAt: now
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
      price: 37500,
      currency: "CRC",
      doctorHonorarium: 22500,
      preparationInstructions: "Llegar 15 minutos antes con documento de identidad y lista de medicamentos activos.",
      requiresReportApproval: true
    },
    {
      id: "svc-control-cardiologia",
      clinicId: defaultClinicId,
      name: "Control cardiologia",
      specialty: "Cardiologia",
      durationMinutes: 45,
      price: 55000,
      currency: "CRC",
      doctorHonorarium: 32500,
      preparationInstructions: "Traer examenes previos y evitar cafeina 4 horas antes si se solicitara electrocardiograma.",
      requiresReportApproval: true
    },
    {
      id: "svc-laboratorio-control",
      clinicId: defaultClinicId,
      name: "Laboratorio y control",
      specialty: "Laboratorio",
      durationMinutes: 45,
      price: 47500,
      currency: "CRC",
      doctorHonorarium: 25000,
      preparationInstructions: "Ayuno de 8 horas cuando aplique. Confirmar medicamentos activos antes de enviar instrucciones.",
      requiresReportApproval: true
    },
    {
      id: "svc-seguimiento-respiratorio",
      clinicId: defaultClinicId,
      name: "Seguimiento respiratorio",
      specialty: "Medicina general",
      durationMinutes: 45,
      price: 45000,
      currency: "CRC",
      doctorHonorarium: 27500,
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
      price: 37500,
      currency: "CRC",
      doctorHonorarium: 22500,
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
      price: 47500,
      currency: "CRC",
      doctorHonorarium: 25000,
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
      price: 45000,
      currency: "CRC",
      doctorHonorarium: 27500,
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
          summary: "Control general estable. Presion arterial controlada y sin signos de alarma al momento de la consulta.",
          prescription: "Mantener tratamiento actual. Revisar dosis solo con aprobacion medica.",
          nextAppointment: "2026-06-10 09:30",
          medicalImages: ["historial-control-general.pdf", "signos-vitales-2026-06-05.png"],
          signedByDoctor: "",
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
          summary: "Control metabolico pendiente de correlacion con laboratorios. Se recomienda seguimiento de glucosa.",
          prescription: "Borrador de receta sujeto a revision del medico tratante antes de entrega.",
          nextAppointment: "2026-06-11 11:00",
          medicalImages: ["control-metabolico-previo.pdf"],
          signedByDoctor: "",
          deliveryChannels: ["email"]
        },
        {
          id: "patrep-101-2",
          title: "Orden de laboratorio",
          type: "laboratorio",
          status: "borrador",
          doctorName: "Dr. Marco Solis",
          createdAt: "2026-06-03T18:16:00.000Z",
          summary: "Orden de laboratorio para control de glucosa, perfil lipidico y parametros cardiometabolicos.",
          prescription: "No aplica receta. Orden requiere validacion medica antes de enviar.",
          nextAppointment: "2026-06-11 11:00",
          medicalImages: ["orden-laboratorio-borrador.pdf"],
          signedByDoctor: "",
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
          summary: "Seguimiento respiratorio por asma. Se deben validar sintomas recientes y uso de inhalador.",
          prescription: "Indicaciones de inhalador pendientes de firma medica.",
          nextAppointment: "2026-06-14 15:00",
          medicalImages: ["seguimiento-respiratorio.pdf", "espirometria-previa.png"],
          signedByDoctor: "",
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
      revenue: 85000,
      expenses: 22000,
      pendingInvoices: 2,
      currency: "CRC",
      status: "requiere-revision",
      preparedBy: "Ana Rojas",
      updatedAt: now
    },
    {
      id: "cash-week",
      clinicId: defaultClinicId,
      period: "semanal",
      revenue: 327500,
      expenses: 92000,
      pendingInvoices: 4,
      currency: "CRC",
      status: "listo-contador",
      preparedBy: "Ana Rojas",
      updatedAt: now
    },
    {
      id: "cash-month",
      clinicId: defaultClinicId,
      period: "mensual",
      revenue: 1450000,
      expenses: 485000,
      pendingInvoices: 7,
      currency: "CRC",
      status: "abierto",
      preparedBy: "Contabilidad",
      updatedAt: now
    }
  ],
  cashTransactions: [
    {
      id: "pay-100",
      clinicId: defaultClinicId,
      appointmentId: "appt-100",
      patientId: "pat-100",
      patientName: "Maria Fernanda Rojas",
      serviceName: "Consulta general",
      method: "sinpe",
      amount: 37500,
      currency: "CRC",
      status: "completado",
      reference: "SINPE-1001",
      receivedBy: "Ana Rojas",
      paidAt: "2026-06-10T09:15",
      notes: "Pago completado antes de consulta."
    },
    {
      id: "pay-101",
      clinicId: defaultClinicId,
      appointmentId: "appt-101",
      patientId: "pat-101",
      patientName: "Jorge Alberto Mendez",
      serviceName: "Laboratorio y control",
      method: "tarjeta",
      amount: 47500,
      currency: "CRC",
      status: "completado",
      reference: "TARJ-2104",
      receivedBy: "Ana Rojas",
      paidAt: "2026-06-11T10:40",
      notes: "Voucher tarjeta registrado."
    }
  ],
  cashExpenses: [
    {
      id: "exp-100",
      clinicId: defaultClinicId,
      category: "insumos",
      description: "Insumos medicos de consulta",
      amount: 18000,
      currency: "CRC",
      method: "efectivo",
      status: "pagado",
      vendor: "Proveedor local",
      paidAt: "2026-06-10T13:00",
      notes: "Compra diaria para sala de procedimientos."
    },
    {
      id: "exp-101",
      clinicId: defaultClinicId,
      category: "servicios",
      description: "Servicio de mensajeria clinica",
      amount: 4000,
      currency: "CRC",
      method: "sinpe",
      status: "registrado",
      vendor: "Mensajeria CR",
      paidAt: "2026-06-10T15:30",
      notes: "Entrega de documentos fisicos."
    }
  ],
  pendingInvoices: [
    {
      id: "inv-100",
      clinicId: defaultClinicId,
      appointmentId: "appt-102",
      patientId: "pat-102",
      patientName: "Sofia Camila Alvarez",
      concept: "Seguimiento respiratorio",
      amount: 45000,
      currency: "CRC",
      dueDate: "2026-06-14",
      status: "pendiente",
      notes: "Pendiente de pago el dia de la cita."
    },
    {
      id: "inv-101",
      clinicId: defaultClinicId,
      patientName: "Empresa convenio",
      concept: "Factura mensual por servicios medicos",
      amount: 90000,
      currency: "CRC",
      dueDate: "2026-06-30",
      status: "pendiente",
      notes: "Convenio empresarial pendiente de cobro."
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
        { label: "Ingresos", value: "₡1,450,000" },
        { label: "Gastos", value: "₡485,000" },
        { label: "Pendientes", value: "7" }
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

type LegacyStaffMember = Partial<StaffMember> & Pick<StaffMember, "id" | "clinicId" | "name" | "role" | "email">;

type LegacyAppointmentRecord = Partial<AppointmentRecord> &
  Pick<
    AppointmentRecord,
    "id" | "clinicId" | "patientId" | "patientName" | "doctorId" | "doctorName" | "serviceId" | "serviceName" | "startsAt"
  >;

type LegacyCashRegister = Partial<CashRegister> & Pick<CashRegister, "id" | "clinicId" | "period">;

type LegacyCashTransaction = Partial<CashTransaction> &
  Pick<CashTransaction, "id" | "clinicId" | "patientName" | "serviceName" | "method" | "amount">;

type LegacyCashExpense = Partial<CashExpense> & Pick<CashExpense, "id" | "clinicId" | "category" | "description" | "amount">;

type LegacyPendingInvoice = Partial<PendingInvoice> & Pick<PendingInvoice, "id" | "clinicId" | "patientName" | "concept" | "amount">;

type RecoverableCentralState = Omit<
  CentralState,
  "serviceCatalog" | "appointments" | "cashTransactions" | "cashExpenses" | "pendingInvoices"
> &
  Partial<Pick<CentralState, "serviceCatalog" | "appointments" | "cashTransactions" | "cashExpenses" | "pendingInvoices">>;

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

function crcAmount(value: number | undefined, currency: string | undefined) {
  const amount = value ?? 0;
  return currency === "USD" ? Math.round(amount * prototypeUsdToCrc) : amount;
}

function crcCurrency() {
  return "CRC";
}

function normalizeService(service: ServiceCatalogItem): ServiceCatalogItem {
  return {
    ...service,
    price: crcAmount(service.price, service.currency),
    currency: crcCurrency(),
    doctorHonorarium: crcAmount(service.doctorHonorarium, service.currency)
  };
}

function normalizeStaff(member: LegacyStaffMember): StaffMember {
  const isDoctor = member.role === "medico";
  const sourceCurrency = member.currency ?? "CRC";

  return {
    id: member.id,
    clinicId: member.clinicId,
    name: member.name,
    role: member.role,
    email: member.email,
    phone: member.phone ?? "",
    licenseNumber: member.licenseNumber ?? "",
    specialty: member.specialty ?? (isDoctor ? "Medicina general" : member.role),
    status: member.status ?? "activo",
    verifiedHoursMonth: member.verifiedHoursMonth ?? 0,
    defaultHonorarium: crcAmount(member.defaultHonorarium, sourceCurrency),
    currency: crcCurrency(),
    paymentMethod: member.paymentMethod ?? (isDoctor ? "Transferencia bancaria" : "Planilla"),
    serviceIds: member.serviceIds ?? [],
    signatureLabel: member.signatureLabel ?? (isDoctor ? `${member.name}${member.licenseNumber ? ` - ${member.licenseNumber}` : ""}` : ""),
    reportApprovalEnabled: member.reportApprovalEnabled ?? isDoctor,
    notes: member.notes ?? "",
    updatedAt: member.updatedAt ?? now
  };
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
    summary: `Borrador pendiente de revision medica para ${patient.name}.`,
    prescription: documentName === "recetario" ? "Recetario pendiente de aprobacion humana." : "",
    nextAppointment: patient.nextAppointment ?? "",
    medicalImages: [],
    signedByDoctor: "",
    deliveryChannels: ["email", "whatsapp"]
  } satisfies PatientReport));

  const normalizedReports = reports.map((report) => ({
    ...report,
    summary: report.summary ?? `Borrador pendiente de revision medica para ${patient.name}.`,
    prescription: report.prescription ?? "",
    nextAppointment: report.nextAppointment ?? patient.nextAppointment ?? "",
    medicalImages: report.medicalImages ?? [],
    signedByDoctor: report.signedByDoctor ?? ""
  }));

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
    reports: normalizedReports,
    instructions: patient.instructions ?? [],
    doctorApprovalRequired: patient.doctorApprovalRequired ?? normalizedReports.some((report) => report.status === "pendiente-aprobacion"),
    notes: patient.notes ?? "",
    updatedAt: patient.updatedAt ?? now
  };
}

function normalizeAppointment(appointment: LegacyAppointmentRecord): AppointmentRecord {
  const service = initialState.serviceCatalog.find((item) => item.id === appointment.serviceId);
  const startsAt = appointment.startsAt;
  const duration = service?.durationMinutes ?? 30;
  const sourceCurrency = appointment.currency ?? service?.currency ?? "CRC";

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
    price: crcAmount(appointment.price ?? service?.price, sourceCurrency),
    currency: crcCurrency(),
    doctorHonorarium: crcAmount(appointment.doctorHonorarium ?? service?.doctorHonorarium, sourceCurrency),
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

function normalizeCashRegister(register: LegacyCashRegister): CashRegister {
  const sourceCurrency = register.currency ?? "CRC";

  return {
    id: register.id,
    clinicId: register.clinicId,
    period: register.period,
    revenue: crcAmount(register.revenue, sourceCurrency),
    expenses: crcAmount(register.expenses, sourceCurrency),
    pendingInvoices: register.pendingInvoices ?? 0,
    currency: crcCurrency(),
    status: register.status ?? "abierto",
    preparedBy: register.preparedBy ?? "Caja",
    updatedAt: register.updatedAt ?? now
  };
}

function normalizeCashTransaction(transaction: LegacyCashTransaction): CashTransaction {
  const sourceCurrency = transaction.currency ?? "CRC";

  return {
    id: transaction.id,
    clinicId: transaction.clinicId,
    appointmentId: transaction.appointmentId,
    patientId: transaction.patientId,
    patientName: transaction.patientName,
    serviceName: transaction.serviceName,
    method: transaction.method,
    amount: crcAmount(transaction.amount, sourceCurrency),
    currency: crcCurrency(),
    status: transaction.status ?? "completado",
    reference: transaction.reference ?? "",
    receivedBy: transaction.receivedBy ?? "Caja",
    paidAt: transaction.paidAt ?? now,
    notes: transaction.notes ?? ""
  };
}

function normalizeCashExpense(expense: LegacyCashExpense): CashExpense {
  const sourceCurrency = expense.currency ?? "CRC";

  return {
    id: expense.id,
    clinicId: expense.clinicId,
    category: expense.category,
    description: expense.description,
    amount: crcAmount(expense.amount, sourceCurrency),
    currency: crcCurrency(),
    method: expense.method ?? "efectivo",
    status: expense.status ?? "registrado",
    vendor: expense.vendor ?? "",
    paidAt: expense.paidAt ?? now,
    notes: expense.notes ?? ""
  };
}

function normalizePendingInvoice(invoice: LegacyPendingInvoice): PendingInvoice {
  const sourceCurrency = invoice.currency ?? "CRC";

  return {
    id: invoice.id,
    clinicId: invoice.clinicId,
    appointmentId: invoice.appointmentId,
    patientId: invoice.patientId,
    patientName: invoice.patientName,
    concept: invoice.concept,
    amount: crcAmount(invoice.amount, sourceCurrency),
    currency: crcCurrency(),
    dueDate: invoice.dueDate ?? now.slice(0, 10),
    status: invoice.status ?? "pendiente",
    notes: invoice.notes ?? ""
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

function dateAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function isInsidePeriod(value: string, period: CashRegister["period"], anchor = new Date()) {
  const date = dateAt(value);
  if (period === "diario") return isSameDay(date, anchor);
  if (period === "semanal") {
    const diff = anchor.getTime() - date.getTime();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }
  return isSameMonth(date, anchor);
}

function recalculateCashRegisters(state: CentralState, clinicId: string) {
  const periods: CashRegister["period"][] = ["diario", "semanal", "mensual"];
  const timestamp = new Date().toISOString();

  periods.forEach((period) => {
    const revenue = state.cashTransactions
      .filter((transaction) => transaction.clinicId === clinicId && transaction.status === "completado" && isInsidePeriod(transaction.paidAt, period))
      .reduce((total, transaction) => total + transaction.amount, 0);
    const expenses = state.cashExpenses
      .filter((expense) => expense.clinicId === clinicId && expense.status !== "pendiente" && isInsidePeriod(expense.paidAt, period))
      .reduce((total, expense) => total + expense.amount, 0);
    const pendingInvoices = state.pendingInvoices.filter((invoice) => invoice.clinicId === clinicId && invoice.status === "pendiente").length;
    const register = state.cashRegisters.find((item) => item.clinicId === clinicId && item.period === period);

    if (register) {
      Object.assign(register, {
        revenue,
        expenses,
        pendingInvoices,
        currency: "CRC",
        status: period === "diario" && pendingInvoices > 0 ? "requiere-revision" : "abierto",
        updatedAt: timestamp
      });
    } else {
      state.cashRegisters.push({
        id: makeId("cash"),
        clinicId,
        period,
        revenue,
        expenses,
        pendingInvoices,
        currency: "CRC",
        status: "abierto",
        preparedBy: "Caja",
        updatedAt: timestamp
      });
    }
  });

  const accountantReport = state.reports.find((report) => report.clinicId === clinicId && report.id === "rep-1");
  const monthly = state.cashRegisters.find((register) => register.clinicId === clinicId && register.period === "mensual");
  if (accountantReport && monthly) {
    accountantReport.updatedAt = timestamp;
    accountantReport.metrics = [
      { label: "Ingresos", value: new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(monthly.revenue) },
      { label: "Gastos", value: new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(monthly.expenses) },
      { label: "Pendientes", value: String(monthly.pendingInvoices) }
    ];
  }
}

function ensureStateShape(state: RecoverableCentralState): CentralState {
  state.serviceCatalog ??= structuredClone(initialState.serviceCatalog);
  state.appointments ??= structuredClone(initialState.appointments);
  state.cashTransactions ??= structuredClone(initialState.cashTransactions);
  state.cashExpenses ??= structuredClone(initialState.cashExpenses);
  state.pendingInvoices ??= structuredClone(initialState.pendingInvoices);
  state.serviceCatalog = state.serviceCatalog.map((service) => normalizeService(service));
  state.staff = state.staff.map((member) => normalizeStaff(member));
  state.patients = state.patients.map((patient) => normalizePatient(patient));
  state.appointments = state.appointments.map((appointment) => normalizeAppointment(appointment));
  state.cashRegisters = state.cashRegisters.map((register) => normalizeCashRegister(register));
  state.cashTransactions = state.cashTransactions.map((transaction) => normalizeCashTransaction(transaction));
  state.cashExpenses = state.cashExpenses.map((expense) => normalizeCashExpense(expense));
  state.pendingInvoices = state.pendingInvoices.map((invoice) => normalizePendingInvoice(invoice));
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
  const clinics = state.clinics.filter((clinic) => allowed.has(clinic.id));
  const existingClinicIds = new Set(clinics.map((clinic) => clinic.id));
  const claimClinics = access.clinicIds
    .filter((clinicId) => !existingClinicIds.has(clinicId))
    .map((clinicId) => getPublicClinic(clinicId))
    .filter((clinic): clinic is Clinic => Boolean(clinic));

  return {
    clinics: [...clinics, ...claimClinics],
    tasks: state.tasks.filter((task) => allowed.has(task.clinicId)),
    events: state.events.filter((event) => allowed.has(event.clinicId)),
    roles: state.roles,
    staff: state.staff.filter((item) => allowed.has(item.clinicId)),
    schedules: state.schedules.filter((item) => allowed.has(item.clinicId)),
    serviceCatalog: state.serviceCatalog.filter((item) => allowed.has(item.clinicId)),
    appointments: state.appointments.filter((item) => allowed.has(item.clinicId)),
    patients: state.patients.filter((item) => allowed.has(item.clinicId)),
    cashRegisters: state.cashRegisters.filter((item) => allowed.has(item.clinicId)),
    cashTransactions: state.cashTransactions.filter((item) => allowed.has(item.clinicId)),
    cashExpenses: state.cashExpenses.filter((item) => allowed.has(item.clinicId)),
    pendingInvoices: state.pendingInvoices.filter((item) => allowed.has(item.clinicId)),
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
    currency: input.currency || service?.currency || "CRC",
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

export function upsertStaff(input: StaffUpsertInput) {
  const state = getState();
  const timestamp = new Date().toISOString();
  const normalized = normalizeStaff({
    ...input,
    id: input.id ?? makeId("staff"),
    updatedAt: timestamp
  });
  const index = state.staff.findIndex((member) => member.id === normalized.id);
  const previousName = index >= 0 ? state.staff[index].name : undefined;

  if (index >= 0) {
    state.staff[index] = normalized;
  } else {
    state.staff.unshift(normalized);
  }

  if (previousName && previousName !== normalized.name) {
    state.schedules.forEach((schedule) => {
      if (schedule.doctorId === normalized.id) schedule.doctorName = normalized.name;
    });
    state.appointments.forEach((appointment) => {
      if (appointment.doctorId === normalized.id) appointment.doctorName = normalized.name;
    });
    state.patients.forEach((patient) => {
      patient.reports.forEach((report) => {
        if (report.doctorName === previousName) report.doctorName = normalized.name;
      });
    });
  }

  state.events.unshift({
    id: makeId("evt"),
    clinicId: normalized.clinicId,
    type: index >= 0 ? "staff.updated" : "staff.created",
    message: `${normalized.name} ${index >= 0 ? "actualizado" : "agregado"} en personal medico.`,
    at: timestamp
  });

  return normalized;
}

export function replaceDoctorSchedules(doctorId: string, schedules: DoctorScheduleUpsertInput[]) {
  const state = getState();
  const doctor = state.staff.find((member) => member.id === doctorId);
  if (!doctor) return [];

  const timestamp = new Date().toISOString();
  state.schedules = state.schedules.filter((schedule) => schedule.doctorId !== doctorId);
  const normalizedSchedules: DoctorSchedule[] = schedules.map((schedule) => ({
    ...schedule,
    id: schedule.id || makeId("sch"),
    clinicId: doctor.clinicId,
    doctorId,
    doctorName: doctor.name,
    specialty: schedule.specialty || doctor.specialty
  }));

  state.schedules.unshift(...normalizedSchedules);
  state.events.unshift({
    id: makeId("evt"),
    clinicId: doctor.clinicId,
    type: "doctor.schedules.updated",
    message: `Horarios de ${doctor.name} actualizados para agenda y pagos.`,
    at: timestamp
  });

  return normalizedSchedules;
}

export function approvePatientReport(input: {
  clinicId: string;
  patientId: string;
  reportId: string;
  doctorId: string;
  deliveryChannels: ("email" | "whatsapp")[];
}) {
  const state = getState();
  const timestamp = new Date().toISOString();
  const patient = state.patients.find((item) => item.id === input.patientId && item.clinicId === input.clinicId);
  const doctor = state.staff.find((item) => item.id === input.doctorId && item.clinicId === input.clinicId);
  const report = patient?.reports.find((item) => item.id === input.reportId);
  if (!patient || !doctor || !report) return undefined;

  report.status = "aprobado";
  report.approvedAt = timestamp;
  report.doctorName = doctor.name;
  report.signedByDoctor = doctor.signatureLabel || doctor.name;
  report.deliveryChannels = input.deliveryChannels;
  patient.pendingDocuments = patient.pendingDocuments.filter((documentName) => documentName !== report.type && documentName !== report.title);
  patient.doctorApprovalRequired = patient.reports.some((item) => item.status === "pendiente-aprobacion");
  patient.updatedAt = timestamp;

  state.appointments.forEach((appointment) => {
    if (appointment.patientId === patient.id && appointment.doctorId === doctor.id && appointment.reportDeliveryStatus === "aprobacion-medica") {
      appointment.reportDeliveryStatus = "listo-envio";
      appointment.updatedAt = timestamp;
    }
  });

  state.events.unshift({
    id: makeId("evt"),
    clinicId: input.clinicId,
    type: "doctor.report.approved",
    message: `${doctor.name} aprobo ${report.title} para ${patient.name}.`,
    at: timestamp
  });

  return { patient, report, doctor };
}

export function updatePatientReportDraft(input: {
  clinicId: string;
  patientId: string;
  reportId: string;
  doctorId: string;
  title: string;
  summary: string;
  prescription: string;
  nextAppointment: string;
  medicalImages: string[];
  deliveryChannels: ("email" | "whatsapp")[];
}) {
  const state = getState();
  const timestamp = new Date().toISOString();
  const patient = state.patients.find((item) => item.id === input.patientId && item.clinicId === input.clinicId);
  const doctor = state.staff.find((item) => item.id === input.doctorId && item.clinicId === input.clinicId);
  if (!patient || !doctor) return undefined;

  let report = patient.reports.find((item) => item.id === input.reportId);
  if (!report) {
    report = {
      id: makeId("rep"),
      title: input.title.trim() || "Reporte post-consulta",
      type: "reporte-medico",
      status: "borrador",
      doctorName: doctor.name,
      createdAt: timestamp,
      summary: "",
      prescription: "",
      nextAppointment: patient.nextAppointment,
      medicalImages: [],
      signedByDoctor: "",
      deliveryChannels: input.deliveryChannels.length > 0 ? input.deliveryChannels : ["email"]
    };
    patient.reports.unshift(report);
  }

  report.title = input.title.trim() || report.title;
  report.summary = input.summary.trim();
  report.prescription = input.prescription.trim();
  report.nextAppointment = input.nextAppointment.trim();
  report.medicalImages = input.medicalImages.map((item) => item.trim()).filter(Boolean);
  report.deliveryChannels = input.deliveryChannels.length > 0 ? input.deliveryChannels : ["email"];
  report.doctorName = doctor.name;
  report.status = "pendiente-aprobacion";
  report.signedByDoctor = "";
  delete report.approvedAt;

  patient.doctorApprovalRequired = true;
  patient.pendingDocuments = Array.from(new Set([...patient.pendingDocuments, report.type]));
  patient.updatedAt = timestamp;

  state.events.unshift({
    id: makeId("evt"),
    clinicId: input.clinicId,
    type: "doctor.report.dictated",
    message: `${doctor.name} guardo dictado medico para ${patient.name}.`,
    at: timestamp
  });

  return { patient, report, doctor };
}

export function upsertCashTransaction(input: CashTransactionInput) {
  const state = getState();
  const transaction = normalizeCashTransaction({
    ...input,
    id: input.id ?? makeId("pay"),
    currency: "CRC"
  });
  const index = state.cashTransactions.findIndex((item) => item.id === transaction.id);

  if (index >= 0) {
    state.cashTransactions[index] = transaction;
  } else {
    state.cashTransactions.unshift(transaction);
  }

  if (transaction.status === "completado" && transaction.appointmentId) {
    const appointment = state.appointments.find((item) => item.id === transaction.appointmentId && item.clinicId === transaction.clinicId);
    if (appointment) {
      appointment.paymentStatus = "pagado";
      appointment.price = transaction.amount;
      appointment.currency = "CRC";
      appointment.updatedAt = new Date().toISOString();
    }

    state.pendingInvoices.forEach((invoice) => {
      if (invoice.appointmentId === transaction.appointmentId && invoice.clinicId === transaction.clinicId) {
        invoice.status = "pagada";
      }
    });
  }

  recalculateCashRegisters(state, transaction.clinicId);
  state.events.unshift({
    id: makeId("evt"),
    clinicId: transaction.clinicId,
    type: "cash.payment.registered",
    message: `Pago ${transaction.status} registrado por ${transaction.patientName} via ${transaction.method}.`,
    at: new Date().toISOString()
  });

  return transaction;
}

export function upsertCashExpense(input: CashExpenseInput) {
  const state = getState();
  const expense = normalizeCashExpense({
    ...input,
    id: input.id ?? makeId("exp"),
    currency: "CRC"
  });
  const index = state.cashExpenses.findIndex((item) => item.id === expense.id);

  if (index >= 0) {
    state.cashExpenses[index] = expense;
  } else {
    state.cashExpenses.unshift(expense);
  }

  recalculateCashRegisters(state, expense.clinicId);
  state.events.unshift({
    id: makeId("evt"),
    clinicId: expense.clinicId,
    type: "cash.expense.registered",
    message: `Gasto registrado: ${expense.description}.`,
    at: new Date().toISOString()
  });

  return expense;
}

export function upsertPendingInvoice(input: PendingInvoiceInput) {
  const state = getState();
  const invoice = normalizePendingInvoice({
    ...input,
    id: input.id ?? makeId("inv"),
    currency: "CRC"
  });
  const index = state.pendingInvoices.findIndex((item) => item.id === invoice.id);

  if (index >= 0) {
    state.pendingInvoices[index] = invoice;
  } else {
    state.pendingInvoices.unshift(invoice);
  }

  recalculateCashRegisters(state, invoice.clinicId);
  state.events.unshift({
    id: makeId("evt"),
    clinicId: invoice.clinicId,
    type: "cash.invoice.registered",
    message: `Factura pendiente registrada para ${invoice.patientName}.`,
    at: new Date().toISOString()
  });

  return invoice;
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
