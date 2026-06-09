"use client";

import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Cloud,
  Database,
  FileClock,
  FilePlus2,
  FileText,
  HeartPulse,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  Mic,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  Square,
  Trash2,
  UserCog,
  UserRound,
  Users,
  Wand2,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type {
  AppointmentRecord,
  AutomationTemplate,
  CashExpense,
  CashRegister,
  CashTransaction,
  CentralState,
  DoctorSchedule,
  PatientInstruction,
  PatientRecord,
  PatientReport,
  PendingInvoice,
  ReportSummary,
  ServiceCatalogItem,
  StaffMember,
  TaskIntent
} from "@/lib/data";
import { useFirebaseSession } from "@/lib/use-firebase-session";

type HealthState = {
  ok?: boolean;
  service?: string;
  clinic?: { id: string; name: string };
  nodeUrl?: string;
  openclaw?: { mode: string; gatewayUrl: string; reachable: boolean; status?: string };
  capabilities?: string[];
  note?: string;
  error?: string;
};

type ModuleId =
  | "dashboard"
  | "agenda"
  | "pacientes"
  | "medicos"
  | "caja"
  | "reportes"
  | "automatizaciones"
  | "configuracion";

type NavItem = {
  id: ModuleId;
  icon: LucideIcon;
  label: string;
};

type TaskPriority = "normal" | "alta" | "critica";

type TaskForm = {
  clinicId: string;
  intent: TaskIntent;
  priority: TaskPriority;
  prompt: string;
};

type ExecutionState = {
  status: "idle" | "running" | "completed" | "failed";
  title: string;
  message: string;
  intent?: TaskIntent;
  forwarded?: boolean;
  source?: string;
  taskId?: string;
  updatedAt?: string;
};

type PatientChannel = "email" | "whatsapp";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const reportTypeLabels: Record<PatientReport["type"], string> = {
  "reporte-medico": "Reporte medico",
  recetario: "Recetario",
  laboratorio: "Laboratorio",
  imagen: "Imagen",
  referencia: "Referencia",
  seguimiento: "Seguimiento"
};

const reportStatusLabels: Record<PatientReport["status"], string> = {
  borrador: "Borrador",
  "pendiente-aprobacion": "Pendiente aprobacion",
  aprobado: "Aprobado",
  enviado: "Enviado"
};

const instructionCategoryLabels: Record<PatientInstruction["category"], string> = {
  preparacion: "Preparacion",
  medicamento: "Medicamento",
  "post-consulta": "Post consulta",
  recordatorio: "Recordatorio"
};

const instructionStatusLabels: Record<PatientInstruction["status"], string> = {
  pendiente: "Pendiente",
  "aprobacion-medica": "Aprobacion medica",
  aprobado: "Aprobado",
  enviado: "Enviado"
};

const medicalDictationTerms = [
  "anamnesis",
  "antecedentes heredofamiliares",
  "hipertension arterial",
  "diabetes mellitus tipo 2",
  "dislipidemia",
  "cardiopatia isquemica",
  "insuficiencia cardiaca",
  "enfermedad pulmonar obstructiva cronica",
  "asma bronquial",
  "neumonia",
  "bronquitis",
  "rinitis alergica",
  "sinusitis",
  "cefalea",
  "migrana",
  "mareo",
  "vertigo",
  "dolor toracico",
  "dolor abdominal",
  "epigastralgia",
  "nauseas",
  "vomitos",
  "diarrea",
  "estrenimiento",
  "disnea",
  "ortopnea",
  "taquicardia",
  "bradicardia",
  "palpitaciones",
  "edema periferico",
  "fiebre",
  "febricula",
  "mialgias",
  "artralgias",
  "lumbalgia",
  "cervicalgia",
  "radiculopatia",
  "parestesias",
  "neuropatia periferica",
  "convulsiones",
  "ansiedad",
  "depresion",
  "insomnio",
  "hiperglucemia",
  "hipoglucemia",
  "hemoglobina glicosilada",
  "perfil lipidico",
  "creatinina",
  "filtrado glomerular",
  "transaminasas",
  "hemograma completo",
  "leucocitosis",
  "anemia",
  "plaquetopenia",
  "electrocardiograma",
  "radiografia de torax",
  "ultrasonido abdominal",
  "tomografia computarizada",
  "resonancia magnetica",
  "metformina",
  "glibenclamida",
  "insulina glargina",
  "losartan",
  "enalapril",
  "amlodipino",
  "hidroclorotiazida",
  "furosemida",
  "atorvastatina",
  "rosuvastatina",
  "aspirina",
  "clopidogrel",
  "warfarina",
  "rivaroxaban",
  "omeprazol",
  "pantoprazol",
  "salbutamol",
  "budesonida",
  "prednisona",
  "dexametasona",
  "amoxicilina",
  "azitromicina",
  "ceftriaxona",
  "ciprofloxacina",
  "ibuprofeno",
  "acetaminofen",
  "diclofenaco",
  "tramadol",
  "gabapentina",
  "pregabalina",
  "sertralina",
  "escitalopram",
  "clonazepam",
  "levotiroxina"
];

const medicalDictationReplacements: { pattern: RegExp; value: string }[] = [
  { pattern: /\bpunto y aparte\b/gi, value: ".\n\n" },
  { pattern: /\bnueva linea\b/gi, value: "\n" },
  { pattern: /\bdos puntos\b/gi, value: ":" },
  { pattern: /\bpunto seguido\b/gi, value: ". " },
  { pattern: /\bpunto\b/gi, value: "." },
  { pattern: /\bcoma\b/gi, value: "," },
  { pattern: /\bhta\b/gi, value: "HTA" },
  { pattern: /\bdm dos\b/gi, value: "diabetes mellitus tipo 2" },
  { pattern: /\bdm2\b/gi, value: "diabetes mellitus tipo 2" },
  { pattern: /\bepoc\b/gi, value: "EPOC" },
  { pattern: /\bpa\b/gi, value: "presion arterial" },
  { pattern: /\bfc\b/gi, value: "frecuencia cardiaca" },
  { pattern: /\bfr\b/gi, value: "frecuencia respiratoria" },
  { pattern: /\bsato dos\b/gi, value: "saturacion de oxigeno" },
  { pattern: /\bsat o dos\b/gi, value: "saturacion de oxigeno" },
  { pattern: /\bhba1c\b/gi, value: "hemoglobina glicosilada" },
  { pattern: /\becg\b/gi, value: "electrocardiograma" },
  { pattern: /\brx torax\b/gi, value: "radiografia de torax" },
  { pattern: /\btac\b/gi, value: "tomografia computarizada" },
  { pattern: /\brmn\b/gi, value: "resonancia magnetica" },
  { pattern: /\bvia oral\b/gi, value: "via oral" },
  { pattern: /\bcada ocho horas\b/gi, value: "cada 8 horas" },
  { pattern: /\bcada doce horas\b/gi, value: "cada 12 horas" },
  { pattern: /\bcada veinticuatro horas\b/gi, value: "cada 24 horas" },
  { pattern: /\bmiligramos\b/gi, value: "mg" },
  { pattern: /\bmililitros\b/gi, value: "mL" },
  { pattern: /\bgramos\b/gi, value: "g" },
  { pattern: /\bunidades internacionales\b/gi, value: "UI" }
];

function normalizeMedicalDictation(value: string) {
  let normalized = value.replace(/\s+/g, " ").trim();
  medicalDictationReplacements.forEach((item) => {
    normalized = normalized.replace(item.pattern, item.value);
  });
  normalized = normalized
    .replace(/\s+([,.:;])/g, "$1")
    .replace(/([.:])([^\s\n])/g, "$1 $2")
    .replace(/\n\s+/g, "\n")
    .trim();

  return normalized;
}

const appointmentStatusLabels: Record<AppointmentRecord["status"], string> = {
  solicitada: "Solicitada",
  confirmada: "Confirmada",
  "en-consulta": "En consulta",
  completada: "Completada",
  cancelada: "Cancelada"
};

const paymentStatusLabels: Record<AppointmentRecord["paymentStatus"], string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  facturado: "Facturado"
};

const reminderStatusLabels: Record<AppointmentRecord["reminderStatus"], string> = {
  pendiente: "Pendiente",
  programado: "Programado",
  enviado: "Enviado",
  fallo: "Fallo"
};

const reportDeliveryStatusLabels: Record<AppointmentRecord["reportDeliveryStatus"], string> = {
  pendiente: "Pendiente",
  "aprobacion-medica": "Aprobacion medica",
  "listo-envio": "Listo envio",
  enviado: "Enviado"
};

const cashMethodLabels: Record<CashTransaction["method"], string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  sinpe: "SINPE",
  transferencia: "Transferencia"
};

const cashPeriodLabels: Record<CashRegister["period"], string> = {
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual"
};

const navItems: NavItem[] = [
  { id: "dashboard", icon: Activity, label: "Dashboard" },
  { id: "agenda", icon: CalendarDays, label: "Agenda" },
  { id: "pacientes", icon: Users, label: "Pacientes" },
  { id: "medicos", icon: UserCog, label: "Medicos" },
  { id: "caja", icon: BadgeDollarSign, label: "Caja" },
  { id: "reportes", icon: BarChart3, label: "Reportes" },
  { id: "automatizaciones", icon: Bot, label: "Automatizaciones" },
  { id: "configuracion", icon: Settings, label: "Configuracion" }
];

const moduleCopy: Record<ModuleId, string> = {
  dashboard: "Centro operativo",
  agenda: "Citas, horas y conflictos",
  pacientes: "Historial, documentos y aprobaciones",
  medicos: "Personal medico y horas verificadas",
  caja: "Cierres y control financiero",
  reportes: "Entregables para administracion",
  automatizaciones: "Ordenes listas para OpenClaw",
  configuracion: "Clinicas, roles y acceso"
};

const intentLabels: Record<TaskIntent, string> = {
  agenda: "Agenda",
  correos: "Correos",
  contabilidad: "Contabilidad",
  historial: "Historial",
  "gestion-local": "Gestion local",
  sync: "Sincronizacion"
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat(currency === "CRC" ? "es-CR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createEmptyPatient(clinicId: string): PatientRecord {
  return {
    id: "",
    clinicId,
    name: "",
    documentId: "",
    birthDate: "",
    sex: "otro",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    emergencyContact: "",
    insuranceProvider: "",
    allergies: "",
    chronicConditions: "",
    lastVisit: new Date().toISOString().slice(0, 10),
    nextAppointment: "",
    nextService: "",
    assignedDoctor: "",
    risk: "bajo",
    communication: { email: true, whatsapp: true },
    pendingDocuments: [],
    reports: [],
    instructions: [],
    doctorApprovalRequired: true,
    notes: "",
    updatedAt: ""
  };
}

function clonePatient(patient: PatientRecord): PatientRecord {
  return {
    ...patient,
    communication: { ...patient.communication },
    pendingDocuments: [...patient.pendingDocuments],
    reports: patient.reports.map((report) => ({
      ...report,
      deliveryChannels: [...report.deliveryChannels]
    })),
    instructions: patient.instructions.map((instruction) => ({
      ...instruction,
      channels: [...instruction.channels]
    }))
  };
}

function toggleChannel(channels: PatientChannel[], channel: PatientChannel, enabled: boolean) {
  if (enabled) return Array.from(new Set([...channels, channel]));
  return channels.filter((item) => item !== channel);
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function addMinutesToInput(value: string, minutes: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setMinutes(date.getMinutes() + minutes);
  return toLocalDateTimeInput(date);
}

function defaultAppointmentStart() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toLocalDateTimeInput(date);
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function readableDate(value: string) {
  if (!value) return "Fecha pendiente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ");
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);
}

function readableTime(value: string) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16);
  return new Intl.DateTimeFormat("es-CR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function createEmptyAppointment(
  clinicId: string,
  patients: PatientRecord[],
  staff: StaffMember[],
  services: ServiceCatalogItem[]
): AppointmentRecord {
  const doctors = staff.filter((member) => member.role === "medico");
  const patient = patients[0];
  const doctor = doctors[0] ?? staff[0];
  const service = services[0];
  const startsAt = defaultAppointmentStart();
  const duration = service?.durationMinutes ?? 30;

  return {
    id: "",
    clinicId,
    patientId: patient?.id ?? "",
    patientName: patient?.name ?? "",
    doctorId: doctor?.id ?? "",
    doctorName: doctor?.name ?? "",
    serviceId: service?.id ?? "",
    serviceName: service?.name ?? "",
    startsAt,
    endsAt: addMinutesToInput(startsAt, duration),
    price: service?.price ?? 0,
    currency: service?.currency ?? "CRC",
    doctorHonorarium: service?.doctorHonorarium ?? 0,
    status: "solicitada",
    paymentStatus: "pendiente",
    reminderChannels: ["email", "whatsapp"],
    reminderStatus: "pendiente",
    reportDeliveryStatus: service?.requiresReportApproval ? "aprobacion-medica" : "pendiente",
    createdBy: "Call Center",
    notes: service?.preparationInstructions ?? "",
    updatedAt: ""
  };
}

function cloneAppointment(appointment: AppointmentRecord): AppointmentRecord {
  return {
    ...appointment,
    reminderChannels: [...appointment.reminderChannels]
  };
}

function createEmptyDoctor(clinicId: string): StaffMember {
  return {
    id: "",
    clinicId,
    name: "",
    role: "medico",
    email: "",
    phone: "",
    licenseNumber: "",
    specialty: "Medicina general",
    status: "activo",
    verifiedHoursMonth: 0,
    defaultHonorarium: 0,
    currency: "CRC",
    paymentMethod: "Transferencia bancaria",
    serviceIds: [],
    signatureLabel: "",
    reportApprovalEnabled: true,
    notes: "",
    updatedAt: ""
  };
}

function cloneDoctor(doctor: StaffMember): StaffMember {
  return {
    ...doctor,
    serviceIds: [...doctor.serviceIds]
  };
}

function createEmptySchedule(clinicId: string, doctor: StaffMember): DoctorSchedule {
  return {
    id: `draft-schedule-${Date.now()}`,
    clinicId,
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    day: "Lunes",
    startsAt: "08:00",
    endsAt: "12:00",
    verifiedHours: 4,
    appointments: 0,
    status: "pendiente"
  };
}

type DoctorReportContext = {
  patient: PatientRecord;
  report: PatientReport;
};

function createEmptyPayment(clinicId: string, appointments: AppointmentRecord[]): CashTransaction {
  const appointment = appointments.find((item) => item.paymentStatus === "pendiente") ?? appointments[0];

  return {
    id: "",
    clinicId,
    appointmentId: appointment?.id,
    patientId: appointment?.patientId,
    patientName: appointment?.patientName ?? "",
    serviceName: appointment?.serviceName ?? "",
    method: "sinpe",
    amount: appointment?.price ?? 0,
    currency: "CRC",
    status: "completado",
    reference: "",
    receivedBy: "Caja",
    paidAt: toLocalDateTimeInput(new Date()),
    notes: ""
  };
}

function createEmptyExpense(clinicId: string): CashExpense {
  return {
    id: "",
    clinicId,
    category: "empresa",
    description: "",
    amount: 0,
    currency: "CRC",
    method: "sinpe",
    status: "registrado",
    vendor: "",
    paidAt: toLocalDateTimeInput(new Date()),
    notes: ""
  };
}

function createEmptyInvoice(clinicId: string, appointments: AppointmentRecord[]): PendingInvoice {
  const appointment = appointments.find((item) => item.paymentStatus === "pendiente") ?? appointments[0];

  return {
    id: "",
    clinicId,
    appointmentId: appointment?.id,
    patientId: appointment?.patientId,
    patientName: appointment?.patientName ?? "",
    concept: appointment?.serviceName ?? "",
    amount: appointment?.price ?? 0,
    currency: "CRC",
    dueDate: new Date().toISOString().slice(0, 10),
    status: "pendiente",
    notes: ""
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function summarizeExecution(payload: unknown, fallbackIntent?: TaskIntent): ExecutionState {
  const root = asRecord(payload);
  const task = asRecord(root.task);
  const localEnvelope = asRecord(root.result);
  const run = asRecord(localEnvelope.result ?? root.result);
  const openclaw = asRecord(run.openclaw);
  const modelRun = asRecord(run.modelRun);
  const forwarded = typeof root.forwarded === "boolean" ? root.forwarded : undefined;
  const source =
    typeof modelRun.finalText === "string"
      ? "OpenClaw runner/gateway"
      : typeof openclaw.status === "string"
        ? `OpenClaw ${openclaw.status}`
        : "OpenClaw playbook local";
  const status = typeof task.status === "string" && task.status === "failed" ? "failed" : "completed";

  return {
    status,
    title: status === "failed" ? "Ejecucion con error" : forwarded === false ? "Tarea en cola central" : "OpenClaw ejecuto la orden",
    message:
      typeof run.summary === "string"
        ? run.summary
        : typeof root.note === "string"
          ? root.note
          : typeof root.warning === "string"
            ? root.warning
            : "Tarea procesada; revisa la trazabilidad JSON para detalles.",
    intent: (typeof task.intent === "string" ? task.intent : fallbackIntent) as TaskIntent | undefined,
    forwarded,
    source,
    taskId: typeof task.id === "string" ? task.id : typeof run.taskId === "string" ? run.taskId : undefined,
    updatedAt: new Date().toISOString()
  };
}

function summarizeError(error: unknown, fallbackIntent?: TaskIntent): ExecutionState {
  return {
    status: "failed",
    title: "OpenClaw no pudo ejecutar",
    message: error instanceof Error ? error.message : "No se pudo completar la ejecucion.",
    intent: fallbackIntent,
    forwarded: false,
    source: "API central",
    updatedAt: new Date().toISOString()
  };
}

export default function Home() {
  const session = useFirebaseSession();
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [state, setState] = useState<CentralState | null>(null);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("Listo para enviar una orden al nodo local.");
  const [execution, setExecution] = useState<ExecutionState>({
    status: "idle",
    title: "OpenClaw listo",
    message: "Presiona Ejecutar, Revisar, Recordatorios, Documentos o Cierre para enviar una orden al Docker local.",
    source: "Web App central"
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState<TaskForm>({
    clinicId: "clinic-san-jose",
    intent: "agenda" as TaskIntent,
    priority: "normal",
    prompt:
      "Revisa la agenda de manana, detecta conflictos, prepara correos de confirmacion y devuelve un resumen para administracion."
  });

  const selectedClinic = state?.clinics.find((clinic) => clinic.id === form.clinicId) ?? state?.clinics[0] ?? null;
  const clinicId = selectedClinic?.id ?? form.clinicId;
  const clinicStaff = state?.staff.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicSchedules = state?.schedules.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicServices = state?.serviceCatalog.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicAppointments = state?.appointments.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicPatients = state?.patients.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicCash = state?.cashRegisters.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicPayments = state?.cashTransactions.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicExpenses = state?.cashExpenses.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicInvoices = state?.pendingInvoices.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicReports = state?.reports.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicAutomations = state?.automations.filter((item) => item.clinicId === clinicId) ?? [];
  const clinicEvents = state?.events.filter((item) => item.clinicId === clinicId).slice(0, 6) ?? [];

  async function loadState() {
    const response = await fetch("/api/state", {
      headers: await session.getAuthHeaders(),
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error ?? "No se pudo cargar el estado central.");
    setState(payload);
    setForm((current) => {
      const hasClinic = payload.clinics?.some((clinic: { id: string }) => clinic.id === current.clinicId);
      return hasClinic || !payload.clinics?.[0]?.id ? current : { ...current, clinicId: payload.clinics[0].id };
    });
  }

  async function pingLocalNode(targetClinicId = clinicId, options: { updateResult?: boolean } = {}) {
    const shouldUpdateResult = options.updateResult ?? true;
    try {
      const response = await fetch(`/api/local-health?clinicId=${encodeURIComponent(targetClinicId)}`, {
        headers: await session.getAuthHeaders(),
        cache: "no-store"
      });
      const payload = await response.json();
      setHealth(payload);
      if (shouldUpdateResult) {
        setResult(JSON.stringify(payload, null, 2));
      }
    } catch (error) {
      setHealth({ ok: false });
      if (shouldUpdateResult) {
        setResult(error instanceof Error ? error.message : "No se pudo consultar el nodo local.");
      }
    }
  }

  async function sendTask(input: {
    clinicId: string;
    intent: TaskIntent;
    priority: "normal" | "alta" | "critica";
    prompt: string;
  }) {
    setBusy(true);
    setExecution({
      status: "running",
      title: "Ejecutando con OpenClaw",
      message: input.prompt,
      intent: input.intent,
      forwarded: undefined,
      source: "Enviando al Docker local",
      updatedAt: new Date().toISOString()
    });
    setResult(
      JSON.stringify(
        {
          status: "running",
          message: "Orden enviada desde la Web App central hacia OpenClaw.",
          input
        },
        null,
        2
      )
    );
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? payload?.result?.error ?? `OpenClaw respondio HTTP ${response.status}`);
      }

      setExecution(summarizeExecution(payload, input.intent));
      setResult(JSON.stringify(payload, null, 2));
      await loadState();
      await pingLocalNode(input.clinicId, { updateResult: false });
    } catch (error) {
      setExecution(summarizeError(error, input.intent));
      setResult(error instanceof Error ? error.message : "No se pudo crear la tarea.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTask() {
    await sendTask(form);
  }

  async function savePatient(patient: PatientRecord) {
    setBusy(true);
    try {
      const { updatedAt: _updatedAt, ...payloadPatient } = patient;
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify({
          ...payloadPatient,
          id: payloadPatient.id || undefined,
          clinicId
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar el paciente.");
      }

      setState(payload.state);
      setResult(JSON.stringify({ patient: payload.patient, saved: true }, null, 2));
      return payload.patient as PatientRecord;
    } catch (error) {
      setResult(error instanceof Error ? error.message : "No se pudo guardar el paciente.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function saveAppointment(appointment: AppointmentRecord) {
    setBusy(true);
    try {
      const { updatedAt: _updatedAt, ...payloadAppointment } = appointment;
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify({
          ...payloadAppointment,
          id: payloadAppointment.id || undefined,
          clinicId
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar la cita.");
      }

      setState(payload.state);
      setResult(
        JSON.stringify(
          {
            appointment: payload.appointment,
            conflicts: payload.conflicts,
            saved: true
          },
          null,
          2
        )
      );
      return payload.appointment as AppointmentRecord;
    } catch (error) {
      setResult(error instanceof Error ? error.message : "No se pudo guardar la cita.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function saveDoctorProfile(doctor: StaffMember, schedules: DoctorSchedule[]) {
    setBusy(true);
    try {
      const { updatedAt: _updatedAt, ...payloadDoctor } = doctor;
      const response = await fetch("/api/doctors", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify({
          doctor: {
            ...payloadDoctor,
            id: payloadDoctor.id || undefined,
            clinicId,
            role: "medico"
          },
          schedules: schedules.map(({ id, ...schedule }) => ({
            ...schedule,
            id: id.startsWith("draft-schedule-") ? undefined : id,
            clinicId,
            doctorId: payloadDoctor.id || "",
            doctorName: payloadDoctor.name,
            specialty: schedule.specialty || payloadDoctor.specialty
          }))
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar el medico.");
      }

      setState(payload.state);
      setResult(JSON.stringify({ doctor: payload.doctor, schedules: payload.schedules, saved: true }, null, 2));
      return payload.doctor as StaffMember;
    } catch (error) {
      setResult(error instanceof Error ? error.message : "No se pudo guardar el medico.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function saveCashRecord(
    input:
      | { type: "payment"; payment: CashTransaction }
      | { type: "expense"; expense: CashExpense }
      | { type: "invoice"; invoice: PendingInvoice }
  ) {
    setBusy(true);
    try {
      const response = await fetch("/api/cash", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar el registro de caja.");
      }

      setState(payload.state);
      setResult(JSON.stringify({ record: payload.record, saved: true }, null, 2));
      return payload.record;
    } catch (error) {
      setResult(error instanceof Error ? error.message : "No se pudo guardar el registro de caja.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function prepareCashClose(period: CashRegister["period"]) {
    const register = clinicCash.find((item) => item.period === period);
    const completedPayments = clinicPayments.filter((payment) => payment.status === "completado");
    const pendingInvoices = clinicInvoices.filter((invoice) => invoice.status === "pendiente");
    const paidExpenses = clinicExpenses.filter((expense) => expense.status !== "pendiente");
    const doctorPayments = clinicStaff
      .filter((member) => member.role === "medico")
      .map((doctor) => {
        const paidAppointments = clinicAppointments.filter((appointment) => appointment.doctorId === doctor.id && appointment.paymentStatus !== "pendiente");
        const serviceHonorarium = paidAppointments.reduce((total, appointment) => total + appointment.doctorHonorarium, 0);
        const hourlyPay = doctor.verifiedHoursMonth * doctor.defaultHonorarium;
        return `${doctor.name}: servicios ${money(serviceHonorarium, doctor.currency)}, horas ${money(hourlyPay, doctor.currency)}, total ${money(serviceHonorarium + hourlyPay, doctor.currency)}`;
      })
      .join("\n");

    await sendTask({
      clinicId,
      intent: "contabilidad",
      priority: period === "diario" ? "alta" : "critica",
      prompt:
        `Prepara cierre de caja ${period} en colones costarricenses para el contador. ` +
        `Ingresos registrados: ${money(register?.revenue ?? 0, "CRC")}. Gastos: ${money(register?.expenses ?? 0, "CRC")}. ` +
        `Facturas pendientes: ${pendingInvoices.length}. Pagos completados: ${completedPayments.length}. Gastos registrados: ${paidExpenses.length}. ` +
        `Metodos de pago: efectivo ${completedPayments.filter((item) => item.method === "efectivo").length}, tarjeta ${completedPayments.filter((item) => item.method === "tarjeta").length}, SINPE ${completedPayments.filter((item) => item.method === "sinpe").length}. ` +
        `Honorarios medicos:\n${doctorPayments || "Sin honorarios medicos registrados."}\n` +
        "Devuelve un reporte contable con ingresos, egresos, facturas pendientes, honorarios medicos, gastos de empresa, alertas y resumen listo para contador. No cierres definitivamente sin aprobacion humana."
    });
  }

  async function approveReportAndPrepareDelivery(input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    deliveryChannels: ("email" | "whatsapp")[];
  }) {
    setBusy(true);
    try {
      const response = await fetch("/api/doctor-reports", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify({
          clinicId,
          patientId: input.patient.id,
          reportId: input.report.id,
          doctorId: input.doctor.id,
          deliveryChannels: input.deliveryChannels
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo aprobar el reporte.");
      }

      setState(payload.state);
      setResult(JSON.stringify({ report: payload.report, approved: true }, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "No se pudo aprobar el reporte.");
      return;
    } finally {
      setBusy(false);
    }

    await sendTask({
      clinicId,
      intent: "historial",
      priority: "critica",
      prompt:
        `Reporte aprobado humanamente por ${input.doctor.name}. ` +
        `Paciente: ${input.patient.name} (${input.patient.documentId}). ` +
        `Reporte: ${input.report.title}. Tipo: ${reportTypeLabels[input.report.type]}. ` +
        `Firma: ${input.doctor.signatureLabel || input.doctor.name}. ` +
        `Canales autorizados: ${input.deliveryChannels.join(", ")}. ` +
        `Imagenes/documentos: ${input.report.medicalImages.join(", ") || "sin imagenes adjuntas"}. ` +
        `Recetario/indicaciones: ${input.report.prescription || "sin recetario"}. ` +
        `Proxima cita: ${input.report.nextAppointment || input.patient.nextAppointment || "pendiente"}. ` +
        "Prepara el paquete de envio por correo y WhatsApp sin modificar el contenido medico aprobado, con trazabilidad para auditoria."
    });
  }

  async function saveMedicalDictation(input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    title: string;
    summary: string;
    prescription: string;
    nextAppointment: string;
    medicalImages: string[];
    deliveryChannels: ("email" | "whatsapp")[];
  }) {
    setBusy(true);
    try {
      const response = await fetch("/api/doctor-reports", {
        method: "PATCH",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify({
          clinicId,
          patientId: input.patient.id,
          reportId: input.report.id,
          doctorId: input.doctor.id,
          title: input.title,
          summary: normalizeMedicalDictation(input.summary),
          prescription: normalizeMedicalDictation(input.prescription),
          nextAppointment: input.nextAppointment,
          medicalImages: input.medicalImages,
          deliveryChannels: input.deliveryChannels
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar el dictado medico.");
      }

      setState(payload.state);
      setExecution({
        status: "completed",
        title: "Dictado medico guardado",
        message: `Reporte de ${input.patient.name} actualizado y pendiente de aprobacion humana.`,
        intent: "historial",
        forwarded: false,
        source: "Dictado medico OpenClinic",
        taskId: input.report.id,
        updatedAt: new Date().toISOString()
      });
      setResult(JSON.stringify({ report: payload.report, dictated: true }, null, 2));
      return payload.report as PatientReport;
    } catch (error) {
      setExecution(summarizeError(error, "historial"));
      setResult(error instanceof Error ? error.message : "No se pudo guardar el dictado medico.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function reviewMedicalDictation(input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    summary: string;
    prescription: string;
    deliveryChannels: ("email" | "whatsapp")[];
  }) {
    await sendTask({
      clinicId: input.patient.clinicId,
      intent: "historial",
      priority: "alta",
      prompt:
        `Revisa este reporte medico dictado por voz para ${input.patient.name} (${input.patient.documentId}). ` +
        `Medico: ${input.doctor.name}. Reporte: ${input.report.title}. ` +
        `Resumen dictado: ${normalizeMedicalDictation(input.summary)}. ` +
        `Recetario/indicaciones dictadas: ${normalizeMedicalDictation(input.prescription) || "sin recetario"}. ` +
        `Canales autorizados: ${input.deliveryChannels.join(", ")}. ` +
        "Corrige estructura, detecta datos faltantes, conserva criterio medico sin inventar datos y deja todo pendiente de aprobacion/firma humana."
    });
  }

  async function prepareAppointmentReminders(appointment: AppointmentRecord) {
    const patient = clinicPatients.find((item) => item.id === appointment.patientId);
    const service = clinicServices.find((item) => item.id === appointment.serviceId);

    await sendTask({
      clinicId: appointment.clinicId,
      intent: "correos",
      priority: "alta",
      prompt:
        `Prepara recordatorios de cita para ${appointment.patientName} (${patient?.documentId ?? "documento pendiente"}). ` +
        `Fecha: ${appointment.startsAt.replace("T", " ")}. Medico: ${appointment.doctorName}. ` +
        `Servicio: ${appointment.serviceName}. Precio: ${money(appointment.price, appointment.currency)}. ` +
        `Canales autorizados: ${appointment.reminderChannels.join(", ")}. ` +
        `Correo: ${patient?.email || "sin correo"}. WhatsApp: ${patient?.whatsapp || "sin whatsapp"}. ` +
        `Preparacion: ${service?.preparationInstructions || appointment.notes || "sin preparacion registrada"}. ` +
        "Devuelve mensajes listos para revision humana antes de enviar por correo o WhatsApp."
    });
  }

  async function prepareAgendaReview() {
    const agendaSummary = clinicAppointments
      .slice(0, 12)
      .map(
        (appointment) =>
          `${appointment.startsAt} | ${appointment.doctorName} | ${appointment.patientName} | ${appointment.serviceName} | ${appointment.status}`
      )
      .join("\n");

    await sendTask({
      clinicId,
      intent: "agenda",
      priority: "alta",
      prompt:
        "Revisa la agenda de la clinica con horarios medicos, citas, posibles conflictos, recordatorios pendientes, precios, honorarios medicos y reportes por entregar. " +
        `Citas visibles:\n${agendaSummary || "Sin citas registradas."}\n` +
        "Devuelve conflictos, acciones del Call Center, recordatorios sugeridos y alertas de aprobacion medica antes de enviar documentos."
    });
  }

  async function preparePatientReminders(patient: PatientRecord) {
    await sendTask({
      clinicId: patient.clinicId,
      intent: "correos",
      priority: "alta",
      prompt:
        `Prepara recordatorios para ${patient.name} (${patient.documentId}). ` +
        `Proxima cita: ${patient.nextAppointment || "pendiente"}. Servicio: ${patient.nextService || "pendiente"}. ` +
        `Canales autorizados: ${patient.communication.email ? "email " : ""}${patient.communication.whatsapp ? "whatsapp" : ""}. ` +
        `Usa correo ${patient.email || "sin correo"} y WhatsApp ${patient.whatsapp || "sin whatsapp"}. ` +
        "Devuelve mensajes listos para revision humana antes de enviar."
    });
  }

  async function preparePatientClinicalDocuments(patient: PatientRecord) {
    await sendTask({
      clinicId: patient.clinicId,
      intent: "historial",
      priority: "critica",
      prompt:
        `Prepara borradores clinicos para ${patient.name} (${patient.documentId}). ` +
        `Documentos pendientes: ${patient.pendingDocuments.join(", ") || "sin documentos pendientes"}. ` +
        `Reportes actuales: ${patient.reports.map((report) => `${report.title} - ${report.status}`).join("; ") || "sin reportes"}. ` +
        `Instrucciones: ${patient.instructions.map((item) => `${item.service} - ${item.category}: ${item.text}`).join("; ") || "sin instrucciones"}. ` +
        "Todo reporte medico, recetario o indicacion de medicamentos debe quedar como borrador con aprobacion medica humana requerida antes de envio por correo o WhatsApp."
    });
  }

  async function runAutomation(template: AutomationTemplate) {
    setForm({
      clinicId: template.clinicId,
      intent: template.intent,
      priority: template.priority,
      prompt: template.prompt
    });
    await sendTask({
      clinicId: template.clinicId,
      intent: template.intent,
      priority: template.priority,
      prompt: template.prompt
    });
  }

  async function syncNow() {
    setBusy(true);
    setExecution({
      status: "running",
      title: "Sincronizando nodo local",
      message: "Exportando eventos, caja, agenda y trazabilidad desde el Docker hacia la API central.",
      intent: "sync",
      source: "Nodo local",
      updatedAt: new Date().toISOString()
    });
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify({ clinicId })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? `Sincronizacion respondio HTTP ${response.status}`);
      }

      const eventCount = Array.isArray(payload?.result?.events) ? payload.result.events.length : 0;
      setExecution({
        status: "completed",
        title: "Sincronizacion completada",
        message: `${eventCount} eventos locales sincronizados con la API central.`,
        intent: "sync",
        forwarded: true,
        source: "Docker local",
        updatedAt: new Date().toISOString()
      });
      setResult(JSON.stringify(payload, null, 2));
      await loadState();
      await pingLocalNode(clinicId, { updateResult: false });
    } catch (error) {
      setExecution(summarizeError(error, "sync"));
      setResult(error instanceof Error ? error.message : "No se pudo sincronizar.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!session.loading && session.user) {
      loadState()
        .then(() => pingLocalNode(form.clinicId))
        .catch((error) => {
          setResult(error instanceof Error ? error.message : "No se pudo iniciar la sesion operativa.");
        });
    }
  }, [session.loading, session.user?.uid]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    try {
      await session.login(loginEmail, loginPassword);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    }
  }

  async function handlePasswordReset() {
    setLoginError("");
    try {
      await session.resetPassword(loginEmail);
      setLoginError("Se envio el correo de recuperacion.");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No se pudo enviar recuperacion.");
    }
  }

  const metrics = useMemo(() => {
    const completed = state?.tasks.filter((task) => task.status === "completed").length ?? 0;
    const pendingDocuments = clinicPatients.reduce((total, patient) => total + patient.pendingDocuments.length, 0);
    const dailyCash = clinicCash.find((item) => item.period === "diario");
    const verifiedHours = clinicStaff.reduce((total, member) => total + member.verifiedHoursMonth, 0);

    return [
      {
        icon: Bot,
        label: "Nodo OpenClaw",
        value: health?.ok ? "Online" : "Pendiente",
        className: "icon-indigo"
      },
      {
        icon: BadgeDollarSign,
        label: "Caja diaria",
        value: dailyCash ? money(dailyCash.revenue, dailyCash.currency) : "$0",
        className: "icon-teal"
      },
      {
        icon: FileText,
        label: "Docs pendientes",
        value: String(pendingDocuments),
        className: "icon-amber"
      },
      {
        icon: Clock3,
        label: "Horas verificadas",
        value: String(verifiedHours),
        className: "icon-rose"
      },
      {
        icon: CheckCircle2,
        label: "Tareas completas",
        value: String(completed),
        className: "icon-green"
      }
    ];
  }, [clinicCash, clinicPatients, clinicStaff, health?.ok, state?.tasks]);

  if (session.loading) {
    return (
      <AuthShell>
        <div className="auth-card auth-status-card">
          <div className="auth-mark">
            <Stethoscope size={28} />
          </div>
          <h1>OpenClinic</h1>
          <p className="muted-text">Validando sesion clinica segura.</p>
        </div>
      </AuthShell>
    );
  }

  if (!session.configured) {
    return (
      <AuthShell>
        <div className="auth-card auth-status-card">
          <div className="auth-mark">
            <KeyRound size={28} />
          </div>
          <h1>OpenClinic</h1>
          <p className="muted-text">
            Firebase esta pendiente de configuracion para activar el acceso clinico por sede.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (!session.user) {
    return (
      <AuthShell>
        <form className="auth-card auth-form" onSubmit={handleLogin}>
          <div className="auth-mark">
            <LogIn size={28} />
          </div>
          <div>
            <h1>OpenClinic</h1>
            <p className="muted-text">Acceso clinico autorizado.</p>
          </div>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Clave</label>
            <input
              id="password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {loginError ? <div className="auth-error">{loginError}</div> : null}
          <div className="button-row">
            <button className="btn primary" type="submit" title="Entrar al sistema">
              <LogIn size={18} />
              Entrar
            </button>
            <button className="btn" type="button" onClick={handlePasswordReset} title="Enviar recuperacion">
              <KeyRound size={18} />
              Recuperar
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  const activeNav = navItems.find((item) => item.id === activeModule) ?? navItems[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" title="OpenClinic">
            <Stethoscope size={24} />
          </div>
          <div>
            <span className="brand-title">OpenClinic</span>
            <span className="brand-subtitle">Clinical Command Center</span>
          </div>
        </div>

        <nav className="nav-group" aria-label="Modulos">
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeModule === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              title={item.label}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="side-status">
          <span>Rol</span>
          <strong>{session.profile?.role ?? "clinic-user"}</strong>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">{moduleCopy[activeModule]}</div>
            <h1>{activeNav.label}</h1>
          </div>
          <div className="top-actions">
            <select
              className="clinic-switcher"
              value={clinicId}
              onChange={(event) => {
                setForm((current) => ({ ...current, clinicId: event.target.value }));
                void pingLocalNode(event.target.value);
              }}
            >
              {(state?.clinics ?? []).map((clinic) => (
                <option value={clinic.id} key={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            <span className="status-pill">
              <span className={`status-dot ${health?.ok ? "online" : ""}`} />
              {health?.ok ? "Nodo local conectado" : "Nodo local por conectar"}
            </span>
            <button className="btn" onClick={() => pingLocalNode()} title="Consultar salud del nodo local">
              <HeartPulse size={18} />
              Ping
            </button>
            <button className="btn" onClick={syncNow} disabled={busy} title="Sincronizar eventos locales">
              <RefreshCw size={18} />
              {busy ? "Sync..." : "Sync"}
            </button>
            <span className="status-pill profile-pill">
              <UserRound size={16} />
              {session.profile?.email ?? "Usuario"}
            </span>
            <button className="btn" onClick={session.logout} title="Cerrar sesion">
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </header>

        <section className="grid metrics metrics-five" aria-label="Indicadores">
          {metrics.map((metric) => (
            <article className="card metric" key={metric.label}>
              <div className="metric-header">
                <div className={`icon-tile ${metric.className}`}>
                  <metric.icon size={20} />
                </div>
                <ShieldCheck size={18} color="var(--green)" />
              </div>
              <div>
                <div className="metric-value">{metric.value}</div>
                <div className="metric-label">{metric.label}</div>
              </div>
            </article>
          ))}
        </section>

        <ExecutionPanel execution={execution} result={result} busy={busy} />

        <section className={`workspace-grid ${activeModule === "dashboard" ? "" : "workspace-grid-full"}`}>
          <div className="workspace-main">
            {activeModule === "dashboard" ? (
              <DashboardModule
                automations={clinicAutomations}
                events={clinicEvents}
                onRunAutomation={runAutomation}
                busy={busy}
              />
            ) : null}
            {activeModule === "agenda" ? (
              <AgendaModule
                schedules={clinicSchedules}
                appointments={clinicAppointments}
                patients={clinicPatients}
                staff={clinicStaff}
                services={clinicServices}
                clinicId={clinicId}
                automations={clinicAutomations}
                onRunAutomation={runAutomation}
                onSaveAppointment={saveAppointment}
                onPrepareAppointmentReminders={prepareAppointmentReminders}
                onPrepareAgendaReview={prepareAgendaReview}
                busy={busy}
              />
            ) : null}
            {activeModule === "pacientes" ? (
              <PatientsModule
                patients={clinicPatients}
                clinicId={clinicId}
                busy={busy}
                onSavePatient={savePatient}
                onPrepareReminders={preparePatientReminders}
                onPrepareClinicalDocuments={preparePatientClinicalDocuments}
              />
            ) : null}
            {activeModule === "medicos" ? (
              <DoctorsModule
                staff={clinicStaff}
                schedules={clinicSchedules}
                services={clinicServices}
                appointments={clinicAppointments}
                patients={clinicPatients}
                clinicId={clinicId}
                busy={busy}
                onSaveDoctorProfile={saveDoctorProfile}
                onApproveReport={approveReportAndPrepareDelivery}
                onSaveMedicalDictation={saveMedicalDictation}
                onReviewMedicalDictation={reviewMedicalDictation}
              />
            ) : null}
            {activeModule === "caja" ? (
              <CashModule
                cashRegisters={clinicCash}
                payments={clinicPayments}
                expenses={clinicExpenses}
                invoices={clinicInvoices}
                appointments={clinicAppointments}
                staff={clinicStaff}
                automations={clinicAutomations}
                busy={busy}
                onSaveCashRecord={saveCashRecord}
                onPrepareCashClose={prepareCashClose}
                onRunAutomation={runAutomation}
              />
            ) : null}
            {activeModule === "reportes" ? <ReportsModule reports={clinicReports} /> : null}
            {activeModule === "automatizaciones" ? (
              <AutomationsModule automations={clinicAutomations} onRunAutomation={runAutomation} busy={busy} />
            ) : null}
            {activeModule === "configuracion" ? (
              <SettingsModule state={state} profileRole={session.profile?.role ?? "clinic-user"} clinicId={clinicId} />
            ) : null}
          </div>

          {activeModule === "dashboard" ? (
            <aside className="workspace-side">
              <NodePanel health={health} result={result} />
              <CommandPanel
                form={form}
                clinics={state?.clinics ?? []}
                busy={busy}
                onChange={setForm}
                onSubmit={submitTask}
              />
            </aside>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-hero-copy" aria-label="OpenClinic">
        <div className="auth-hero-mark">
          <Stethoscope size={30} />
        </div>
        <div>
          <span className="auth-kicker">Clinical Intelligence Platform</span>
          <h1>OpenClinic</h1>
          <p>
            Una experiencia clinica de clase mundial para centros medicos que exigen precision, continuidad operativa y
            una atencion al paciente impecable.
          </p>
        </div>
        <div className="auth-hero-stats" aria-label="Indicadores de confianza">
          <span>Precision</span>
          <span>Seguridad</span>
          <span>Continuidad</span>
          <span>Excelencia</span>
        </div>
      </section>
      <section className="auth-panel-wrap">{children}</section>
    </main>
  );
}

function Panel({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <article className="card">
      <div className="panel-header">
        <h2 className="panel-title">
          <Icon size={18} />
          {title}
        </h2>
      </div>
      <div className="panel-body">{children}</div>
    </article>
  );
}

function DashboardModule({
  automations,
  events,
  onRunAutomation,
  busy
}: {
  automations: AutomationTemplate[];
  events: { id: string; type: string; message: string; at: string }[];
  onRunAutomation: (template: AutomationTemplate) => void;
  busy: boolean;
}) {
  const featured = automations.slice(0, 3);
  const architectureItems: { title: string; body: string; icon: LucideIcon }[] = [
    {
      title: "Web App central",
      body: "Usuarios, reportes, claims Firebase y coordinacion multi-clinica.",
      icon: Cloud
    },
    {
      title: "Docker local",
      body: "Agenda, caja, pacientes y conectores sensibles dentro de la clinica.",
      icon: Building2
    },
    {
      title: "OpenClaw",
      body: "Automatizaciones con trazabilidad y aprobacion humana.",
      icon: Bot
    }
  ];

  return (
    <div className="grid">
      <Panel icon={Database} title="Operacion hibrida">
        <div className="architecture-row">
          {architectureItems.map((item) => (
            <div className="surface-block" key={item.title}>
              <div className="icon-tile icon-teal">
                <item.icon size={20} />
              </div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Bot} title="Automatizaciones prioritarias">
        <div className="surface-list">
          {featured.map((template) => (
            <div className="surface-row" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <p>{template.expectedOutput}</p>
              </div>
              <button className="btn primary" onClick={() => onRunAutomation(template)} disabled={busy}>
                <Play size={18} />
                {busy ? "Ejecutando" : "Ejecutar"}
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={FileClock} title="Actividad central">
        <div className="activity-list">
          {events.map((event) => (
            <div className="activity" key={event.id}>
              <div className="activity-top">
                <span>{event.type}</span>
                <span className="event-time">{new Date(event.at).toLocaleTimeString()}</span>
              </div>
              <p>{event.message}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AgendaModule({
  schedules,
  appointments,
  patients,
  staff,
  services,
  clinicId,
  automations,
  onRunAutomation,
  onSaveAppointment,
  onPrepareAppointmentReminders,
  onPrepareAgendaReview,
  busy
}: {
  schedules: DoctorSchedule[];
  appointments: AppointmentRecord[];
  patients: PatientRecord[];
  staff: StaffMember[];
  services: ServiceCatalogItem[];
  clinicId: string;
  automations: AutomationTemplate[];
  onRunAutomation: (template: AutomationTemplate) => void;
  onSaveAppointment: (appointment: AppointmentRecord) => Promise<AppointmentRecord | undefined>;
  onPrepareAppointmentReminders: (appointment: AppointmentRecord) => void;
  onPrepareAgendaReview: () => void;
  busy: boolean;
}) {
  const agendaAutomation = automations.find((item) => item.intent === "agenda");
  const doctors = staff.filter((member) => member.role === "medico");
  const [selectedDate, setSelectedDate] = useState(dateKey(appointments[0]?.startsAt ?? defaultAppointmentStart()));
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(appointments[0]?.id ?? "");
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId);
  const [draft, setDraft] = useState<AppointmentRecord>(() =>
    selectedAppointment ? cloneAppointment(selectedAppointment) : createEmptyAppointment(clinicId, patients, staff, services)
  );

  const weekDays = useMemo(() => {
    const base = new Date(`${selectedDate}T00:00`);
    if (Number.isNaN(base.getTime())) return [];

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      const key = dateKey(toLocalDateTimeInput(date));
      return {
        key,
        label: readableDate(`${key}T12:00`),
        appointments: appointments
          .filter((appointment) => dateKey(appointment.startsAt) === key)
          .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
      };
    });
  }, [appointments, selectedDate]);

  const selectedAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => dateKey(appointment.startsAt) === selectedDate)
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    [appointments, selectedDate]
  );

  const agendaTotals = useMemo(() => {
    return selectedAppointments.reduce(
      (totals, appointment) => ({
        revenue: totals.revenue + appointment.price,
        honorarium: totals.honorarium + appointment.doctorHonorarium,
        reminders: totals.reminders + (appointment.reminderStatus === "pendiente" ? 1 : 0),
        reports: totals.reports + (appointment.reportDeliveryStatus !== "enviado" ? 1 : 0)
      }),
      { revenue: 0, honorarium: 0, reminders: 0, reports: 0 }
    );
  }, [selectedAppointments]);

  useEffect(() => {
    if (mode === "existing" && (!selectedAppointmentId || !appointments.some((appointment) => appointment.id === selectedAppointmentId))) {
      setSelectedAppointmentId(appointments[0]?.id ?? "");
    }
  }, [appointments, mode, selectedAppointmentId]);

  useEffect(() => {
    if (mode === "new") {
      setDraft(createEmptyAppointment(clinicId, patients, staff, services));
      return;
    }

    setDraft(selectedAppointment ? cloneAppointment(selectedAppointment) : createEmptyAppointment(clinicId, patients, staff, services));
  }, [clinicId, mode, patients, selectedAppointment, services, staff]);

  function updateDraft<Key extends keyof AppointmentRecord>(field: Key, value: AppointmentRecord[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function setPatient(patientId: string) {
    const patient = patients.find((item) => item.id === patientId);
    setDraft((current) => ({
      ...current,
      patientId,
      patientName: patient?.name ?? current.patientName,
      reminderChannels: [
        ...(patient?.communication.email ? ["email" as const] : []),
        ...(patient?.communication.whatsapp ? ["whatsapp" as const] : [])
      ]
    }));
  }

  function setDoctor(doctorId: string) {
    const doctor = doctors.find((item) => item.id === doctorId) ?? staff.find((item) => item.id === doctorId);
    setDraft((current) => ({
      ...current,
      doctorId,
      doctorName: doctor?.name ?? current.doctorName
    }));
  }

  function setService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    setDraft((current) => ({
      ...current,
      serviceId,
      serviceName: service?.name ?? current.serviceName,
      endsAt: addMinutesToInput(current.startsAt, service?.durationMinutes ?? 30),
      price: service?.price ?? current.price,
      currency: service?.currency ?? current.currency,
      doctorHonorarium: service?.doctorHonorarium ?? current.doctorHonorarium,
      reportDeliveryStatus: service?.requiresReportApproval ? "aprobacion-medica" : current.reportDeliveryStatus,
      notes: current.notes || service?.preparationInstructions || ""
    }));
  }

  function setStart(value: string) {
    const service = services.find((item) => item.id === draft.serviceId);
    setDraft((current) => ({
      ...current,
      startsAt: value,
      endsAt: addMinutesToInput(value, service?.durationMinutes ?? 30)
    }));
  }

  function startNewAppointment() {
    setMode("new");
    setSelectedAppointmentId("");
    setDraft(createEmptyAppointment(clinicId, patients, staff, services));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSaveAppointment({
      ...draft,
      clinicId,
      patientName: patients.find((patient) => patient.id === draft.patientId)?.name ?? draft.patientName,
      doctorName: doctors.find((doctor) => doctor.id === draft.doctorId)?.name ?? draft.doctorName,
      serviceName: services.find((service) => service.id === draft.serviceId)?.name ?? draft.serviceName
    });

    if (saved) {
      setMode("existing");
      setSelectedAppointmentId(saved.id);
      setSelectedDate(dateKey(saved.startsAt));
    }
  }

  return (
    <div className="grid">
      <Panel icon={CalendarCheck} title="Agenda Call Center">
        <div className="agenda-module">
          <div className="agenda-toolbar">
            <div className="field agenda-date-field">
              <label htmlFor="agenda-date">Fecha</label>
              <input id="agenda-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </div>
            <div className="row-metrics">
              <span>{selectedAppointments.length} citas</span>
              <span>{money(agendaTotals.revenue, "CRC")} agenda</span>
              <span>{money(agendaTotals.honorarium, "CRC")} honorarios</span>
            </div>
            <div className="button-row">
              <button className="btn" type="button" onClick={onPrepareAgendaReview} disabled={busy} title="Revisar agenda con OpenClaw">
                <Bot size={18} />
                {busy ? "Revisando" : "Revisar"}
              </button>
              <button className="btn primary" type="button" onClick={startNewAppointment} title="Nueva cita">
                <Plus size={18} />
                Nueva cita
              </button>
            </div>
          </div>

          <div className="agenda-calendar">
            {weekDays.map((day) => (
              <button
                className={`agenda-day ${day.key === selectedDate ? "active" : ""}`}
                type="button"
                key={day.key}
                onClick={() => setSelectedDate(day.key)}
              >
                <strong>{day.label}</strong>
                <span>{day.appointments.length} citas</span>
                <div className="agenda-day-slots">
                  {day.appointments.slice(0, 3).map((appointment) => (
                    <span key={appointment.id}>
                      {readableTime(appointment.startsAt)} {appointment.doctorName}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="agenda-workspace">
            <section className="agenda-timeline">
              <div className="section-title-row">
                <h3>Citas del dia</h3>
                <span className="status-chip">{agendaTotals.reminders} recordatorios</span>
              </div>
              <div className="surface-list">
                {selectedAppointments.map((appointment) => (
                  <button
                    className={`appointment-card ${appointment.id === selectedAppointmentId && mode === "existing" ? "active" : ""}`}
                    type="button"
                    key={appointment.id}
                    onClick={() => {
                      setMode("existing");
                      setSelectedAppointmentId(appointment.id);
                    }}
                  >
                    <div className="appointment-time">
                      <strong>{readableTime(appointment.startsAt)}</strong>
                      <span>{readableTime(appointment.endsAt)}</span>
                    </div>
                    <div>
                      <strong>{appointment.patientName}</strong>
                      <p>
                        {appointment.doctorName} - {appointment.serviceName}
                      </p>
                      <div className="tag-row">
                        <span className={`status-chip ${appointment.status}`}>{appointmentStatusLabels[appointment.status]}</span>
                        <span className={`status-chip ${appointment.reminderStatus}`}>{reminderStatusLabels[appointment.reminderStatus]}</span>
                        <span className="tag">{money(appointment.price, appointment.currency)}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {selectedAppointments.length === 0 ? <div className="empty-state">Sin citas para esta fecha.</div> : null}
              </div>
            </section>

            <form className="agenda-editor" onSubmit={handleSave}>
              <div className="patient-editor-header">
                <div>
                  <h3>{draft.id ? "Actualizar cita" : "Nueva cita"}</h3>
                  <p>
                    {draft.patientName || "Paciente pendiente"} - {draft.serviceName || "Servicio pendiente"}
                  </p>
                </div>
                <div className="button-row">
                  {draft.id ? (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onPrepareAppointmentReminders(draft)}
                      disabled={busy}
                      title="Preparar recordatorio"
                    >
                      <Send size={18} />
                      {busy ? "Preparando" : "Recordatorio"}
                    </button>
                  ) : null}
                  <button className="btn primary" type="submit" disabled={busy} title="Guardar cita">
                    <Save size={18} />
                    Guardar cita
                  </button>
                </div>
              </div>

              <div className="appointment-form-grid">
                <div className="field">
                  <label htmlFor="appointment-patient">Paciente</label>
                  <select id="appointment-patient" value={draft.patientId} onChange={(event) => setPatient(event.target.value)} required>
                    <option value="">Seleccionar paciente</option>
                    {patients.map((patient) => (
                      <option value={patient.id} key={patient.id}>
                        {patient.name} - {patient.documentId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="appointment-doctor">Medico</label>
                  <select id="appointment-doctor" value={draft.doctorId} onChange={(event) => setDoctor(event.target.value)} required>
                    <option value="">Seleccionar medico</option>
                    {doctors.map((doctor) => (
                      <option value={doctor.id} key={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="appointment-service">Servicio</label>
                  <select id="appointment-service" value={draft.serviceId} onChange={(event) => setService(event.target.value)} required>
                    <option value="">Seleccionar servicio</option>
                    {services.map((service) => (
                      <option value={service.id} key={service.id}>
                        {service.name} - {money(service.price, service.currency)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="appointment-start">Inicio</label>
                  <input id="appointment-start" type="datetime-local" value={draft.startsAt} onChange={(event) => setStart(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="appointment-end">Fin</label>
                  <input id="appointment-end" type="datetime-local" value={draft.endsAt} onChange={(event) => updateDraft("endsAt", event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="appointment-status">Estado cita</label>
                  <select
                    id="appointment-status"
                    value={draft.status}
                    onChange={(event) => updateDraft("status", event.target.value as AppointmentRecord["status"])}
                  >
                    {Object.entries(appointmentStatusLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="appointment-payment">Pago</label>
                  <select
                    id="appointment-payment"
                    value={draft.paymentStatus}
                    onChange={(event) => updateDraft("paymentStatus", event.target.value as AppointmentRecord["paymentStatus"])}
                  >
                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="appointment-report">Reporte</label>
                  <select
                    id="appointment-report"
                    value={draft.reportDeliveryStatus}
                    onChange={(event) => updateDraft("reportDeliveryStatus", event.target.value as AppointmentRecord["reportDeliveryStatus"])}
                  >
                    {Object.entries(reportDeliveryStatusLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="appointment-price">Precio</label>
                  <input
                    id="appointment-price"
                    type="number"
                    min="0"
                    value={draft.price}
                    onChange={(event) => updateDraft("price", Number(event.target.value))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="appointment-honorarium">Honorario medico</label>
                  <input
                    id="appointment-honorarium"
                    type="number"
                    min="0"
                    value={draft.doctorHonorarium}
                    onChange={(event) => updateDraft("doctorHonorarium", Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.reminderChannels.includes("email")}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        reminderChannels: toggleChannel(current.reminderChannels, "email", event.target.checked)
                      }))
                    }
                  />
                  <Mail size={16} />
                  Email
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.reminderChannels.includes("whatsapp")}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        reminderChannels: toggleChannel(current.reminderChannels, "whatsapp", event.target.checked)
                      }))
                    }
                  />
                  <MessageCircle size={16} />
                  WhatsApp
                </label>
                <span className={`status-chip ${draft.reminderStatus}`}>{reminderStatusLabels[draft.reminderStatus]}</span>
              </div>

              <div className="field">
                <label htmlFor="appointment-notes">Notas y preparacion</label>
                <textarea id="appointment-notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} />
              </div>
            </form>
          </div>
        </div>
      </Panel>

      <div className="agenda-support-grid">
        <Panel icon={Clock3} title="Disponibilidad medica">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medico</th>
                  <th>Dia</th>
                  <th>Horario</th>
                  <th>Citas</th>
                  <th>Horas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>
                      <strong>{schedule.doctorName}</strong>
                      <span>{schedule.specialty}</span>
                    </td>
                    <td>{schedule.day}</td>
                    <td>
                      {schedule.startsAt} - {schedule.endsAt}
                    </td>
                    <td>{schedule.appointments}</td>
                    <td>{schedule.verifiedHours}</td>
                    <td>
                      <span className={`status-chip ${schedule.status}`}>{schedule.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel icon={BadgeDollarSign} title="Servicios y honorarios">
          <div className="surface-list">
            {services.map((service) => (
              <div className="surface-row" key={service.id}>
                <div>
                  <strong>{service.name}</strong>
                  <p>
                    {service.specialty} - {service.durationMinutes} min
                  </p>
                </div>
                <div className="row-metrics">
                  <span>{money(service.price, service.currency)}</span>
                  <span>{money(service.doctorHonorarium, service.currency)} medico</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {agendaAutomation ? (
        <Panel icon={RefreshCw} title="Auditoria de agenda">
          <div className="surface-row">
            <div>
              <strong>{agendaAutomation.name}</strong>
              <p>{agendaAutomation.prompt}</p>
            </div>
            <button className="btn primary" onClick={() => onRunAutomation(agendaAutomation)} disabled={busy}>
              <Play size={18} />
              {busy ? "Ejecutando" : "Ejecutar"}
            </button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function PatientsModule({
  patients,
  clinicId,
  busy,
  onSavePatient,
  onPrepareReminders,
  onPrepareClinicalDocuments
}: {
  patients: PatientRecord[];
  clinicId: string;
  busy: boolean;
  onSavePatient: (patient: PatientRecord) => Promise<PatientRecord | undefined>;
  onPrepareReminders: (patient: PatientRecord) => void;
  onPrepareClinicalDocuments: (patient: PatientRecord) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id ?? "");
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const [draft, setDraft] = useState<PatientRecord>(() => (selectedPatient ? clonePatient(selectedPatient) : createEmptyPatient(clinicId)));
  const [reportDraft, setReportDraft] = useState({
    title: "",
    type: "reporte-medico" as PatientReport["type"],
    status: "pendiente-aprobacion" as PatientReport["status"],
    doctorName: "",
    deliveryChannels: ["email", "whatsapp"] as PatientChannel[]
  });
  const [instructionDraft, setInstructionDraft] = useState({
    service: "",
    category: "preparacion" as PatientInstruction["category"],
    status: "aprobacion-medica" as PatientInstruction["status"],
    text: "",
    scheduledFor: "",
    channels: ["email", "whatsapp"] as PatientChannel[]
  });

  useEffect(() => {
    if (mode === "existing" && (!selectedPatientId || !patients.some((patient) => patient.id === selectedPatientId))) {
      setSelectedPatientId(patients[0]?.id ?? "");
    }
  }, [mode, patients, selectedPatientId]);

  useEffect(() => {
    if (mode === "new") {
      setDraft(createEmptyPatient(clinicId));
      return;
    }

    setDraft(selectedPatient ? clonePatient(selectedPatient) : createEmptyPatient(clinicId));
  }, [clinicId, mode, selectedPatient]);

  function updateDraft<Key extends keyof PatientRecord>(field: Key, value: PatientRecord[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startNewPatient() {
    setMode("new");
    setSelectedPatientId("");
    setDraft(createEmptyPatient(clinicId));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSavePatient({
      ...draft,
      clinicId,
      pendingDocuments: Array.from(new Set(draft.pendingDocuments.map((item) => item.trim()).filter(Boolean))),
      doctorApprovalRequired:
        draft.doctorApprovalRequired ||
        draft.reports.some((report) => report.status === "pendiente-aprobacion") ||
        draft.instructions.some((instruction) => instruction.status === "aprobacion-medica")
    });

    if (saved) {
      setMode("existing");
      setSelectedPatientId(saved.id);
    }
  }

  function addReport() {
    const title = reportDraft.title.trim();
    if (!title) return;

    const report: PatientReport = {
      id: `draft-report-${Date.now()}`,
      title,
      type: reportDraft.type,
      status: reportDraft.status,
      doctorName: reportDraft.doctorName.trim() || draft.assignedDoctor || "Medico pendiente",
      createdAt: new Date().toISOString(),
      summary: `Borrador de ${reportTypeLabels[reportDraft.type]} para ${draft.name || "paciente pendiente"}.`,
      prescription: reportDraft.type === "recetario" ? "Recetario pendiente de aprobacion medica." : "",
      nextAppointment: draft.nextAppointment,
      medicalImages: [],
      signedByDoctor: "",
      deliveryChannels: reportDraft.deliveryChannels
    };

    setDraft((current) => ({
      ...current,
      pendingDocuments:
        report.status === "pendiente-aprobacion"
          ? Array.from(new Set([...current.pendingDocuments, report.type]))
          : current.pendingDocuments,
      reports: [report, ...current.reports],
      doctorApprovalRequired: current.doctorApprovalRequired || report.status === "pendiente-aprobacion"
    }));
    setReportDraft((current) => ({ ...current, title: "", doctorName: "" }));
  }

  function addInstruction() {
    const service = instructionDraft.service.trim();
    const text = instructionDraft.text.trim();
    if (!service || !text) return;

    const instruction: PatientInstruction = {
      id: `draft-instruction-${Date.now()}`,
      service,
      category: instructionDraft.category,
      status: instructionDraft.status,
      text,
      channels: instructionDraft.channels,
      scheduledFor: instructionDraft.scheduledFor || draft.nextAppointment || new Date().toISOString().slice(0, 10)
    };

    setDraft((current) => ({
      ...current,
      instructions: [instruction, ...current.instructions],
      doctorApprovalRequired: current.doctorApprovalRequired || instruction.status === "aprobacion-medica"
    }));
    setInstructionDraft((current) => ({ ...current, service: "", text: "" }));
  }

  function removeReport(reportId: string) {
    setDraft((current) => ({ ...current, reports: current.reports.filter((report) => report.id !== reportId) }));
  }

  function removeInstruction(instructionId: string) {
    setDraft((current) => ({
      ...current,
      instructions: current.instructions.filter((instruction) => instruction.id !== instructionId)
    }));
  }

  const pendingCount = patients.reduce((total, patient) => total + patient.pendingDocuments.length, 0);

  return (
    <Panel icon={Users} title="Pacientes">
      <div className="patient-module">
        <div className="patient-toolbar">
          <div className="row-metrics">
            <span>{patients.length} pacientes</span>
            <span>{pendingCount} documentos pendientes</span>
          </div>
          <button className="btn primary" type="button" onClick={startNewPatient} title="Ingresar paciente">
            <Plus size={18} />
            Nuevo paciente
          </button>
        </div>

        <div className="patient-workspace">
          <aside className="patient-directory" aria-label="Directorio de pacientes">
            {patients.map((patient) => (
              <button
                className={`patient-list-item ${mode === "existing" && patient.id === selectedPatientId ? "active" : ""}`}
                type="button"
                key={patient.id}
                onClick={() => {
                  setMode("existing");
                  setSelectedPatientId(patient.id);
                }}
              >
                <strong>{patient.name}</strong>
                <span>{patient.documentId}</span>
                <span>{patient.nextAppointment || "Cita pendiente"}</span>
                <span className={`status-chip riesgo-${patient.risk}`}>riesgo {patient.risk}</span>
              </button>
            ))}
            {patients.length === 0 ? <div className="empty-state">Sin pacientes registrados.</div> : null}
          </aside>

          <form className="patient-editor" onSubmit={handleSave}>
            <div className="patient-editor-header">
              <div>
                <h3>{draft.id ? draft.name || "Paciente" : "Nuevo paciente"}</h3>
                <p>
                  {draft.documentId || "Documento pendiente"} - {draft.assignedDoctor || "Medico pendiente"}
                </p>
              </div>
              <div className="button-row">
                {draft.id ? (
                  <>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onPrepareReminders(draft)}
                      disabled={busy}
                      title="Preparar recordatorios"
                    >
                      <Send size={18} />
                      {busy ? "Preparando" : "Recordatorios"}
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onPrepareClinicalDocuments(draft)}
                      disabled={busy}
                      title="Preparar documentos clinicos"
                    >
                      <FilePlus2 size={18} />
                      {busy ? "Preparando" : "Documentos"}
                    </button>
                  </>
                ) : null}
                <button className="btn primary" type="submit" disabled={busy} title="Guardar paciente">
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </div>

            <div className="form-section">
              <h3>Datos del paciente</h3>
              <div className="patient-form-grid">
                <div className="field">
                  <label htmlFor="patient-name">Nombre completo</label>
                  <input
                    id="patient-name"
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-document">Documento</label>
                  <input
                    id="patient-document"
                    value={draft.documentId}
                    onChange={(event) => updateDraft("documentId", event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-birth">Fecha nacimiento</label>
                  <input
                    id="patient-birth"
                    type="date"
                    value={draft.birthDate}
                    onChange={(event) => updateDraft("birthDate", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-sex">Sexo</label>
                  <select id="patient-sex" value={draft.sex} onChange={(event) => updateDraft("sex", event.target.value as PatientRecord["sex"])}>
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Contacto y avisos</h3>
              <div className="patient-form-grid">
                <div className="field">
                  <label htmlFor="patient-phone">Telefono</label>
                  <input id="patient-phone" value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="patient-whatsapp">WhatsApp</label>
                  <input
                    id="patient-whatsapp"
                    value={draft.whatsapp}
                    onChange={(event) => updateDraft("whatsapp", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-email">Correo</label>
                  <input
                    id="patient-email"
                    type="email"
                    value={draft.email}
                    onChange={(event) => updateDraft("email", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-emergency">Contacto emergencia</label>
                  <input
                    id="patient-emergency"
                    value={draft.emergencyContact}
                    onChange={(event) => updateDraft("emergencyContact", event.target.value)}
                  />
                </div>
              </div>
              <div className="checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.communication.email}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        communication: { ...current.communication, email: event.target.checked }
                      }))
                    }
                  />
                  <Mail size={16} />
                  Email
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.communication.whatsapp}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        communication: { ...current.communication, whatsapp: event.target.checked }
                      }))
                    }
                  />
                  <MessageCircle size={16} />
                  WhatsApp
                </label>
              </div>
            </div>

            <div className="form-section">
              <h3>Perfil clinico</h3>
              <div className="patient-form-grid">
                <div className="field">
                  <label htmlFor="patient-address">Direccion</label>
                  <input id="patient-address" value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="patient-insurance">Seguro</label>
                  <input
                    id="patient-insurance"
                    value={draft.insuranceProvider}
                    onChange={(event) => updateDraft("insuranceProvider", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-allergies">Alergias</label>
                  <input
                    id="patient-allergies"
                    value={draft.allergies}
                    onChange={(event) => updateDraft("allergies", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-conditions">Condiciones</label>
                  <input
                    id="patient-conditions"
                    value={draft.chronicConditions}
                    onChange={(event) => updateDraft("chronicConditions", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-last-visit">Ultima visita</label>
                  <input
                    id="patient-last-visit"
                    type="date"
                    value={draft.lastVisit}
                    onChange={(event) => updateDraft("lastVisit", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-next">Proxima cita</label>
                  <input
                    id="patient-next"
                    value={draft.nextAppointment}
                    onChange={(event) => updateDraft("nextAppointment", event.target.value)}
                    placeholder="2026-06-10 09:30"
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-service">Servicio</label>
                  <input
                    id="patient-service"
                    value={draft.nextService}
                    onChange={(event) => updateDraft("nextService", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-doctor">Medico asignado</label>
                  <input
                    id="patient-doctor"
                    value={draft.assignedDoctor}
                    onChange={(event) => updateDraft("assignedDoctor", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-risk">Riesgo</label>
                  <select id="patient-risk" value={draft.risk} onChange={(event) => updateDraft("risk", event.target.value as PatientRecord["risk"])}>
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="patient-pending">Documentos pendientes</label>
                  <input
                    id="patient-pending"
                    value={draft.pendingDocuments.join(", ")}
                    onChange={(event) => updateDraft("pendingDocuments", splitList(event.target.value))}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="patient-notes">Notas</label>
                <textarea id="patient-notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} />
              </div>
              <div className="checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.doctorApprovalRequired}
                    onChange={(event) => updateDraft("doctorApprovalRequired", event.target.checked)}
                  />
                  <AlertTriangle size={16} />
                  Aprobacion medica
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title-row">
                <h3>Reportes y recetas</h3>
                <span className="status-chip">{draft.reports.length}</span>
              </div>
              <div className="patient-form-grid patient-form-grid-compact">
                <div className="field">
                  <label htmlFor="report-title">Titulo</label>
                  <input id="report-title" value={reportDraft.title} onChange={(event) => setReportDraft((current) => ({ ...current, title: event.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="report-type">Tipo</label>
                  <select
                    id="report-type"
                    value={reportDraft.type}
                    onChange={(event) => setReportDraft((current) => ({ ...current, type: event.target.value as PatientReport["type"] }))}
                  >
                    {Object.entries(reportTypeLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="report-status">Estado</label>
                  <select
                    id="report-status"
                    value={reportDraft.status}
                    onChange={(event) => setReportDraft((current) => ({ ...current, status: event.target.value as PatientReport["status"] }))}
                  >
                    {Object.entries(reportStatusLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="report-doctor">Medico</label>
                  <input
                    id="report-doctor"
                    value={reportDraft.doctorName}
                    onChange={(event) => setReportDraft((current) => ({ ...current, doctorName: event.target.value }))}
                    placeholder={draft.assignedDoctor || "Medico"}
                  />
                </div>
              </div>
              <div className="inline-actions">
                <div className="checkbox-row compact">
                  <label>
                    <input
                      type="checkbox"
                      checked={reportDraft.deliveryChannels.includes("email")}
                      onChange={(event) =>
                        setReportDraft((current) => ({
                          ...current,
                          deliveryChannels: toggleChannel(current.deliveryChannels, "email", event.target.checked)
                        }))
                      }
                    />
                    <Mail size={16} />
                    Email
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={reportDraft.deliveryChannels.includes("whatsapp")}
                      onChange={(event) =>
                        setReportDraft((current) => ({
                          ...current,
                          deliveryChannels: toggleChannel(current.deliveryChannels, "whatsapp", event.target.checked)
                        }))
                      }
                    />
                    <MessageCircle size={16} />
                    WhatsApp
                  </label>
                </div>
                <button className="btn" type="button" onClick={addReport} title="Agregar reporte">
                  <Plus size={18} />
                  Agregar reporte
                </button>
              </div>
              <div className="nested-list">
                {draft.reports.map((report) => (
                  <div className="nested-row" key={report.id}>
                    <div>
                      <strong>{report.title}</strong>
                      <p>
                        {reportTypeLabels[report.type]} - {report.doctorName}
                      </p>
                      <div className="tag-row">
                        {report.deliveryChannels.map((channel) => (
                          <span className="tag" key={channel}>
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="nested-actions">
                      <span className={`status-chip ${report.status}`}>{reportStatusLabels[report.status]}</span>
                      <button className="icon-btn danger" type="button" onClick={() => removeReport(report.id)} title="Quitar reporte">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-section">
              <div className="section-title-row">
                <h3>Instrucciones y preparacion</h3>
                <span className="status-chip">{draft.instructions.length}</span>
              </div>
              <div className="patient-form-grid patient-form-grid-compact">
                <div className="field">
                  <label htmlFor="instruction-service">Servicio</label>
                  <input
                    id="instruction-service"
                    value={instructionDraft.service}
                    onChange={(event) => setInstructionDraft((current) => ({ ...current, service: event.target.value }))}
                    placeholder={draft.nextService || "Servicio"}
                  />
                </div>
                <div className="field">
                  <label htmlFor="instruction-category">Categoria</label>
                  <select
                    id="instruction-category"
                    value={instructionDraft.category}
                    onChange={(event) =>
                      setInstructionDraft((current) => ({ ...current, category: event.target.value as PatientInstruction["category"] }))
                    }
                  >
                    {Object.entries(instructionCategoryLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="instruction-status">Estado</label>
                  <select
                    id="instruction-status"
                    value={instructionDraft.status}
                    onChange={(event) =>
                      setInstructionDraft((current) => ({ ...current, status: event.target.value as PatientInstruction["status"] }))
                    }
                  >
                    {Object.entries(instructionStatusLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="instruction-schedule">Programado</label>
                  <input
                    id="instruction-schedule"
                    value={instructionDraft.scheduledFor}
                    onChange={(event) => setInstructionDraft((current) => ({ ...current, scheduledFor: event.target.value }))}
                    placeholder={draft.nextAppointment || "Fecha y hora"}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="instruction-text">Indicacion</label>
                <textarea
                  id="instruction-text"
                  value={instructionDraft.text}
                  onChange={(event) => setInstructionDraft((current) => ({ ...current, text: event.target.value }))}
                />
              </div>
              <div className="inline-actions">
                <div className="checkbox-row compact">
                  <label>
                    <input
                      type="checkbox"
                      checked={instructionDraft.channels.includes("email")}
                      onChange={(event) =>
                        setInstructionDraft((current) => ({
                          ...current,
                          channels: toggleChannel(current.channels, "email", event.target.checked)
                        }))
                      }
                    />
                    <Mail size={16} />
                    Email
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={instructionDraft.channels.includes("whatsapp")}
                      onChange={(event) =>
                        setInstructionDraft((current) => ({
                          ...current,
                          channels: toggleChannel(current.channels, "whatsapp", event.target.checked)
                        }))
                      }
                    />
                    <MessageCircle size={16} />
                    WhatsApp
                  </label>
                </div>
                <button className="btn" type="button" onClick={addInstruction} title="Agregar instruccion">
                  <Plus size={18} />
                  Agregar instruccion
                </button>
              </div>
              <div className="nested-list">
                {draft.instructions.map((instruction) => (
                  <div className="nested-row" key={instruction.id}>
                    <div>
                      <strong>{instruction.service}</strong>
                      <p>
                        {instructionCategoryLabels[instruction.category]} - {instruction.text}
                      </p>
                      <div className="tag-row">
                        <span className="tag">{instruction.scheduledFor}</span>
                        {instruction.channels.map((channel) => (
                          <span className="tag" key={channel}>
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="nested-actions">
                      <span className={`status-chip ${instruction.status}`}>{instructionStatusLabels[instruction.status]}</span>
                      <button
                        className="icon-btn danger"
                        type="button"
                        onClick={() => removeInstruction(instruction.id)}
                        title="Quitar instruccion"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="contact-strip">
              <span>
                <Phone size={16} />
                {draft.phone || "Telefono pendiente"}
              </span>
              <span>
                <MessageCircle size={16} />
                {draft.whatsapp || "WhatsApp pendiente"}
              </span>
              <span>
                <Mail size={16} />
                {draft.email || "Correo pendiente"}
              </span>
            </div>
          </form>
        </div>
      </div>
    </Panel>
  );
}

function DoctorsModule({
  staff,
  schedules,
  services,
  appointments,
  patients,
  clinicId,
  busy,
  onSaveDoctorProfile,
  onApproveReport,
  onSaveMedicalDictation,
  onReviewMedicalDictation
}: {
  staff: StaffMember[];
  schedules: DoctorSchedule[];
  services: ServiceCatalogItem[];
  appointments: AppointmentRecord[];
  patients: PatientRecord[];
  clinicId: string;
  busy: boolean;
  onSaveDoctorProfile: (doctor: StaffMember, schedules: DoctorSchedule[]) => Promise<StaffMember | undefined>;
  onApproveReport: (input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    deliveryChannels: ("email" | "whatsapp")[];
  }) => void;
  onSaveMedicalDictation: (input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    title: string;
    summary: string;
    prescription: string;
    nextAppointment: string;
    medicalImages: string[];
    deliveryChannels: ("email" | "whatsapp")[];
  }) => Promise<PatientReport | undefined>;
  onReviewMedicalDictation: (input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    summary: string;
    prescription: string;
    deliveryChannels: ("email" | "whatsapp")[];
  }) => void;
}) {
  const doctors = staff.filter((member) => member.role === "medico");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id ?? "");
  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);
  const [draft, setDraft] = useState<StaffMember>(() => (selectedDoctor ? cloneDoctor(selectedDoctor) : createEmptyDoctor(clinicId)));
  const [draftSchedules, setDraftSchedules] = useState<DoctorSchedule[]>(() =>
    selectedDoctor ? schedules.filter((schedule) => schedule.doctorId === selectedDoctor.id) : []
  );
  const reportContexts = useMemo<DoctorReportContext[]>(
    () =>
      patients.flatMap((patient) =>
        patient.reports.map((report) => ({
          patient,
          report
        }))
      ),
    [patients]
  );
  const visibleReports = reportContexts.filter(
    (item) => !draft.name || item.report.doctorName === draft.name || item.report.status === "pendiente-aprobacion"
  );
  const [selectedReportId, setSelectedReportId] = useState(visibleReports[0]?.report.id ?? "");
  const selectedReportContext = visibleReports.find((item) => item.report.id === selectedReportId) ?? visibleReports[0];
  const [approvalChannels, setApprovalChannels] = useState<("email" | "whatsapp")[]>(selectedReportContext?.report.deliveryChannels ?? ["email"]);

  const doctorFinancials = useMemo(
    () =>
      doctors.map((doctor) => {
        const doctorAppointments = appointments.filter((appointment) => appointment.doctorId === doctor.id && appointment.status !== "cancelada");
        const serviceHonorarium = doctorAppointments.reduce((total, appointment) => total + appointment.doctorHonorarium, 0);
        const hourlyPay = doctor.verifiedHoursMonth * doctor.defaultHonorarium;

        return {
          doctor,
          appointmentCount: doctorAppointments.length,
          serviceHonorarium,
          hourlyPay,
          total: serviceHonorarium + hourlyPay
        };
      }),
    [appointments, doctors]
  );

  useEffect(() => {
    if (mode === "existing" && (!selectedDoctorId || !doctors.some((doctor) => doctor.id === selectedDoctorId))) {
      setSelectedDoctorId(doctors[0]?.id ?? "");
    }
  }, [doctors, mode, selectedDoctorId]);

  useEffect(() => {
    if (mode === "new") {
      const empty = createEmptyDoctor(clinicId);
      setDraft(empty);
      setDraftSchedules([]);
      return;
    }

    setDraft(selectedDoctor ? cloneDoctor(selectedDoctor) : createEmptyDoctor(clinicId));
    setDraftSchedules(selectedDoctor ? schedules.filter((schedule) => schedule.doctorId === selectedDoctor.id) : []);
  }, [clinicId, mode, schedules, selectedDoctor]);

  useEffect(() => {
    if (selectedReportContext) {
      setApprovalChannels(selectedReportContext.report.deliveryChannels.length > 0 ? selectedReportContext.report.deliveryChannels : ["email"]);
    }
  }, [selectedReportContext?.report.id]);

  function updateDraft<Key extends keyof StaffMember>(field: Key, value: StaffMember[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateSchedule(index: number, patch: Partial<DoctorSchedule>) {
    setDraftSchedules((current) => current.map((schedule, scheduleIndex) => (scheduleIndex === index ? { ...schedule, ...patch } : schedule)));
  }

  function startNewDoctor() {
    setMode("new");
    setSelectedDoctorId("");
    setDraft(createEmptyDoctor(clinicId));
    setDraftSchedules([]);
  }

  function addSchedule() {
    setDraftSchedules((current) => [...current, createEmptySchedule(clinicId, draft)]);
  }

  function removeSchedule(index: number) {
    setDraftSchedules((current) => current.filter((_, scheduleIndex) => scheduleIndex !== index));
  }

  function toggleDoctorService(serviceId: string, enabled: boolean) {
    setDraft((current) => ({
      ...current,
      serviceIds: enabled ? Array.from(new Set([...current.serviceIds, serviceId])) : current.serviceIds.filter((item) => item !== serviceId)
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSaveDoctorProfile(
      {
        ...draft,
        clinicId,
        role: "medico",
        signatureLabel: draft.signatureLabel || `${draft.name}${draft.licenseNumber ? ` - ${draft.licenseNumber}` : ""}`
      },
      draftSchedules.map((schedule) => ({
        ...schedule,
        clinicId,
        doctorId: draft.id,
        doctorName: draft.name,
        specialty: schedule.specialty || draft.specialty
      }))
    );

    if (saved) {
      setMode("existing");
      setSelectedDoctorId(saved.id);
    }
  }

  return (
    <div className="grid">
      <Panel icon={UserCog} title="Medicos">
        <div className="doctor-module">
          <div className="patient-toolbar">
            <div className="row-metrics">
              <span>{doctors.length} medicos</span>
              <span>{schedules.length} horarios</span>
              <span>{visibleReports.filter((item) => item.report.status === "pendiente-aprobacion").length} aprobaciones</span>
            </div>
            <button className="btn primary" type="button" onClick={startNewDoctor} title="Agregar medico">
              <Plus size={18} />
              Nuevo medico
            </button>
          </div>

          <div className="doctor-workspace">
            <aside className="doctor-directory" aria-label="Directorio de medicos">
              {doctors.map((doctor) => (
                <button
                  className={`doctor-list-item ${mode === "existing" && doctor.id === selectedDoctorId ? "active" : ""}`}
                  type="button"
                  key={doctor.id}
                  onClick={() => {
                    setMode("existing");
                    setSelectedDoctorId(doctor.id);
                  }}
                >
                  <strong>{doctor.name}</strong>
                  <span>{doctor.specialty}</span>
                  <span>{doctor.licenseNumber || "Licencia pendiente"}</span>
                  <span className={`status-chip ${doctor.status}`}>{doctor.status}</span>
                </button>
              ))}
              {doctors.length === 0 ? <div className="empty-state">Sin medicos registrados.</div> : null}
            </aside>

            <form className="doctor-editor" onSubmit={handleSave}>
              <div className="patient-editor-header">
                <div>
                  <h3>{draft.id ? draft.name || "Medico" : "Nuevo medico"}</h3>
                  <p>
                    {draft.specialty || "Especialidad pendiente"} - {draft.licenseNumber || "Licencia pendiente"}
                  </p>
                </div>
                <button className="btn primary" type="submit" disabled={busy} title="Guardar medico">
                  <Save size={18} />
                  Guardar medico
                </button>
              </div>

              <div className="form-section">
                <h3>Perfil profesional</h3>
                <div className="appointment-form-grid">
                  <div className="field">
                    <label htmlFor="doctor-name">Nombre completo</label>
                    <input id="doctor-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-email">Correo</label>
                    <input id="doctor-email" type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-phone">Telefono</label>
                    <input id="doctor-phone" value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-license">Licencia medica</label>
                    <input id="doctor-license" value={draft.licenseNumber} onChange={(event) => updateDraft("licenseNumber", event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-specialty">Especialidad</label>
                    <input id="doctor-specialty" value={draft.specialty} onChange={(event) => updateDraft("specialty", event.target.value)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-status">Estado</label>
                    <select id="doctor-status" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as StaffMember["status"])}>
                      <option value="activo">Activo</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="suspendido">Suspendido</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Pagos y firma</h3>
                <div className="appointment-form-grid">
                  <div className="field">
                    <label htmlFor="doctor-hours">Horas verificadas mes</label>
                    <input
                      id="doctor-hours"
                      type="number"
                      min="0"
                      value={draft.verifiedHoursMonth}
                      onChange={(event) => updateDraft("verifiedHoursMonth", Number(event.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-honorarium">Honorario base/hora</label>
                    <input
                      id="doctor-honorarium"
                      type="number"
                      min="0"
                      value={draft.defaultHonorarium}
                      onChange={(event) => updateDraft("defaultHonorarium", Number(event.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-payment">Metodo de pago</label>
                    <input id="doctor-payment" value={draft.paymentMethod} onChange={(event) => updateDraft("paymentMethod", event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="doctor-signature">Firma digital</label>
                    <input id="doctor-signature" value={draft.signatureLabel} onChange={(event) => updateDraft("signatureLabel", event.target.value)} />
                  </div>
                </div>
                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.reportApprovalEnabled}
                      onChange={(event) => updateDraft("reportApprovalEnabled", event.target.checked)}
                    />
                    <ShieldCheck size={16} />
                    Aprueba reportes
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="section-title-row">
                  <h3>Servicios autorizados</h3>
                  <span className="status-chip">{draft.serviceIds.length}</span>
                </div>
                <div className="doctor-service-grid">
                  {services.map((service) => (
                    <label className="service-check" key={service.id}>
                      <input
                        type="checkbox"
                        checked={draft.serviceIds.includes(service.id)}
                        onChange={(event) => toggleDoctorService(service.id, event.target.checked)}
                      />
                      <span>
                        <strong>{service.name}</strong>
                        <small>
                          {money(service.price, service.currency)} - {money(service.doctorHonorarium, service.currency)} medico
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <div className="section-title-row">
                  <h3>Horarios verificados</h3>
                  <button className="btn" type="button" onClick={addSchedule} title="Agregar horario">
                    <Plus size={18} />
                    Agregar horario
                  </button>
                </div>
                <div className="schedule-editor-list">
                  {draftSchedules.map((schedule, index) => (
                    <div className="schedule-editor-row" key={schedule.id}>
                      <div className="field">
                        <label>Dia</label>
                        <select value={schedule.day} onChange={(event) => updateSchedule(index, { day: event.target.value })}>
                          {["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"].map((day) => (
                            <option value={day} key={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Inicio</label>
                        <input value={schedule.startsAt} onChange={(event) => updateSchedule(index, { startsAt: event.target.value })} />
                      </div>
                      <div className="field">
                        <label>Fin</label>
                        <input value={schedule.endsAt} onChange={(event) => updateSchedule(index, { endsAt: event.target.value })} />
                      </div>
                      <div className="field">
                        <label>Horas</label>
                        <input
                          type="number"
                          min="0"
                          value={schedule.verifiedHours}
                          onChange={(event) => updateSchedule(index, { verifiedHours: Number(event.target.value) })}
                        />
                      </div>
                      <div className="field">
                        <label>Estado</label>
                        <select value={schedule.status} onChange={(event) => updateSchedule(index, { status: event.target.value as DoctorSchedule["status"] })}>
                          <option value="verificado">Verificado</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="conflicto">Conflicto</option>
                        </select>
                      </div>
                      <button className="icon-btn danger schedule-remove" type="button" onClick={() => removeSchedule(index)} title="Quitar horario">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {draftSchedules.length === 0 ? <div className="empty-state">Sin horarios asignados.</div> : null}
                </div>
              </div>

              <div className="field">
                <label htmlFor="doctor-notes">Notas</label>
                <textarea id="doctor-notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} />
              </div>
            </form>
          </div>
        </div>
      </Panel>

      <div className="doctor-support-grid">
        <Panel icon={Clock3} title="Reporte financiero medico">
          <div className="surface-list">
            {doctorFinancials.map((item) => (
              <div className="surface-row" key={item.doctor.id}>
                <div>
                  <strong>{item.doctor.name}</strong>
                  <p>
                    {item.appointmentCount} citas - {item.doctor.verifiedHoursMonth} horas verificadas
                  </p>
                </div>
                <div className="row-metrics">
                  <span>{money(item.serviceHonorarium, item.doctor.currency)} servicios</span>
                  <span>{money(item.hourlyPay, item.doctor.currency)} horas</span>
                  <span className="status-chip listo">{money(item.total, item.doctor.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={FileText} title="Lector y aprobacion humana">
          <div className="doctor-report-reader">
            <div className="report-list">
              {visibleReports.map((item) => (
                <button
                  className={`report-list-item ${selectedReportContext?.report.id === item.report.id ? "active" : ""}`}
                  type="button"
                  key={`${item.patient.id}-${item.report.id}`}
                  onClick={() => setSelectedReportId(item.report.id)}
                >
                  <strong>{item.report.title}</strong>
                  <span>{item.patient.name}</span>
                  <span className={`status-chip ${item.report.status}`}>{reportStatusLabels[item.report.status]}</span>
                </button>
              ))}
              {visibleReports.length === 0 ? <div className="empty-state">Sin reportes para revisar.</div> : null}
            </div>

            {selectedReportContext ? (
              <div className="report-reader-panel">
                <div className="section-title-row">
                  <div>
                    <h3>{selectedReportContext.report.title}</h3>
                    <p>
                      {selectedReportContext.patient.name} - {reportTypeLabels[selectedReportContext.report.type]}
                    </p>
                  </div>
                  <span className={`status-chip ${selectedReportContext.report.status}`}>
                    {reportStatusLabels[selectedReportContext.report.status]}
                  </span>
                </div>
                <div className="reader-block">
                  <strong>Resumen clinico</strong>
                  <p>{selectedReportContext.report.summary}</p>
                </div>
                <div className="reader-block">
                  <strong>Recetario e indicaciones</strong>
                  <p>{selectedReportContext.report.prescription || "Sin recetario registrado."}</p>
                </div>
                <div className="tag-row">
                  {(selectedReportContext.report.medicalImages.length > 0 ? selectedReportContext.report.medicalImages : ["Sin imagenes adjuntas"]).map((imageRef) => (
                    <span className="tag" key={imageRef}>
                      {imageRef}
                    </span>
                  ))}
                </div>
                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={approvalChannels.includes("email")}
                      onChange={(event) => setApprovalChannels((current) => toggleChannel(current, "email", event.target.checked))}
                    />
                    <Mail size={16} />
                    Email
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={approvalChannels.includes("whatsapp")}
                      onChange={(event) => setApprovalChannels((current) => toggleChannel(current, "whatsapp", event.target.checked))}
                    />
                    <MessageCircle size={16} />
                    WhatsApp
                  </label>
                </div>
                <MedicalDictationPanel
                  patient={selectedReportContext.patient}
                  report={selectedReportContext.report}
                  doctor={draft}
                  deliveryChannels={approvalChannels}
                  busy={busy}
                  onSave={onSaveMedicalDictation}
                  onReview={onReviewMedicalDictation}
                />
                <button
                  className="btn primary"
                  type="button"
                  disabled={busy || !draft.id || !draft.reportApprovalEnabled || selectedReportContext.report.status === "aprobado"}
                  onClick={() =>
                    onApproveReport({
                      patient: selectedReportContext.patient,
                      report: selectedReportContext.report,
                      doctor: draft,
                      deliveryChannels: approvalChannels
                    })
                  }
                  title="Aprobar reporte y preparar envio"
                >
                  <ShieldCheck size={18} />
                  {busy ? "Preparando envio" : "Aprobar y preparar envio"}
                </button>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel icon={Clock3} title="Horas por pagar">
        <div className="surface-list">
          {schedules.map((schedule) => (
            <div className="surface-row" key={schedule.id}>
              <div>
                <strong>{schedule.doctorName}</strong>
                <p>
                  {schedule.day} - {schedule.startsAt}-{schedule.endsAt}
                </p>
              </div>
              <div className="row-metrics">
                <span>{schedule.verifiedHours} horas</span>
                <span className={`status-chip ${schedule.status}`}>{schedule.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MedicalDictationPanel({
  patient,
  report,
  doctor,
  deliveryChannels,
  busy,
  onSave,
  onReview
}: {
  patient: PatientRecord;
  report: PatientReport;
  doctor: StaffMember;
  deliveryChannels: ("email" | "whatsapp")[];
  busy: boolean;
  onSave: (input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    title: string;
    summary: string;
    prescription: string;
    nextAppointment: string;
    medicalImages: string[];
    deliveryChannels: ("email" | "whatsapp")[];
  }) => Promise<PatientReport | undefined>;
  onReview: (input: {
    patient: PatientRecord;
    report: PatientReport;
    doctor: StaffMember;
    summary: string;
    prescription: string;
    deliveryChannels: ("email" | "whatsapp")[];
  }) => void;
}) {
  const [speechSupport, setSpeechSupport] = useState<"checking" | "supported" | "unsupported">("checking");
  const [listening, setListening] = useState(false);
  const [dictationTarget, setDictationTarget] = useState<"summary" | "prescription">("summary");
  const [interimText, setInterimText] = useState("");
  const [dictationError, setDictationError] = useState("");
  const [draft, setDraft] = useState({
    title: report.title,
    summary: report.summary,
    prescription: report.prescription,
    nextAppointment: report.nextAppointment,
    medicalImagesText: report.medicalImages.join(", ")
  });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationTargetRef = useRef(dictationTarget);

  useEffect(() => {
    setSpeechSupport(window.SpeechRecognition || window.webkitSpeechRecognition ? "supported" : "unsupported");
  }, []);

  useEffect(() => {
    dictationTargetRef.current = dictationTarget;
  }, [dictationTarget]);

  useEffect(() => {
    setDraft({
      title: report.title,
      summary: report.summary,
      prescription: report.prescription,
      nextAppointment: report.nextAppointment,
      medicalImagesText: report.medicalImages.join(", ")
    });
    setInterimText("");
    setDictationError("");
    recognitionRef.current?.abort();
  }, [report.id, report.medicalImages, report.nextAppointment, report.prescription, report.summary, report.title]);

  function appendDictation(text: string) {
    const normalized = normalizeMedicalDictation(text);
    if (!normalized) return;

    setDraft((current) => {
      const target = dictationTargetRef.current;
      const currentText = current[target].trim();
      return {
        ...current,
        [target]: currentText ? `${currentText} ${normalized}` : normalized
      };
    });
  }

  function stopDictation() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimText("");
  }

  function startDictation(target: "summary" | "prescription") {
    setDictationError("");
    setInterimText("");
    setDictationTarget(target);
    dictationTargetRef.current = target;

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupport("unsupported");
      setDictationError("El navegador no tiene reconocimiento de voz disponible. Prueba con Chrome o Edge.");
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.lang = "es-CR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) {
          finalText += ` ${transcript}`;
        } else {
          interim += ` ${transcript}`;
        }
      }
      appendDictation(finalText);
      setInterimText(normalizeMedicalDictation(interim));
    };
    recognition.onerror = (event) => {
      setDictationError(event.error ? `Error de microfono: ${event.error}` : "No se pudo escuchar el microfono.");
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch (error) {
      setDictationError(error instanceof Error ? error.message : "No se pudo iniciar el dictado.");
      setListening(false);
    }
  }

  function normalizeDraft() {
    setDraft((current) => ({
      ...current,
      summary: normalizeMedicalDictation(current.summary),
      prescription: normalizeMedicalDictation(current.prescription)
    }));
  }

  async function saveDictation() {
    await onSave({
      patient,
      report,
      doctor,
      title: draft.title,
      summary: draft.summary,
      prescription: draft.prescription,
      nextAppointment: draft.nextAppointment,
      medicalImages: splitList(draft.medicalImagesText),
      deliveryChannels
    });
  }

  const canUseMicrophone = speechSupport === "supported";
  const summaryReady = draft.summary.trim().length >= 8;

  return (
    <div className="dictation-panel">
      <div className="section-title-row">
        <div>
          <h3>Dictado medico OpenClinic</h3>
          <p className="muted-text">
            {patient.name} - {patient.documentId || "documento pendiente"} - {doctor.name || "medico pendiente"}
          </p>
        </div>
        <span className={`status-chip ${listening ? "ejecutando" : canUseMicrophone ? "online" : "pendiente"}`}>
          {listening ? "escuchando" : canUseMicrophone ? "microfono listo" : "mic pendiente"}
        </span>
      </div>

      <div className="patient-context-grid">
        <div className="reader-block">
          <strong>Datos personales</strong>
          <p>
            Nacimiento: {patient.birthDate || "pendiente"} - Sexo: {patient.sex} - Riesgo: {patient.risk}
          </p>
        </div>
        <div className="reader-block">
          <strong>Alertas clinicas</strong>
          <p>
            Alergias: {patient.allergies || "sin registro"} - Condiciones: {patient.chronicConditions || "sin registro"}
          </p>
        </div>
      </div>

      <div className="dictation-toolbar">
        <button className="btn" type="button" onClick={() => startDictation("summary")} disabled={busy || !canUseMicrophone || listening}>
          <Mic size={18} />
          Dictar reporte
        </button>
        <button className="btn" type="button" onClick={() => startDictation("prescription")} disabled={busy || !canUseMicrophone || listening}>
          <Mic size={18} />
          Dictar receta
        </button>
        <button className="btn" type="button" onClick={stopDictation} disabled={!listening}>
          <Square size={18} />
          Detener
        </button>
        <button className="btn" type="button" onClick={normalizeDraft} disabled={busy}>
          <Wand2 size={18} />
          Normalizar
        </button>
      </div>

      {interimText ? (
        <div className="dictation-live">
          <strong>Escuchando {dictationTarget === "summary" ? "reporte" : "receta"}</strong>
          <p>{interimText}</p>
        </div>
      ) : null}
      {dictationError ? <div className="auth-error">{dictationError}</div> : null}

      <div className="field-grid">
        <div className="field">
          <label htmlFor="dictation-title">Titulo del reporte</label>
          <input id="dictation-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="dictation-next">Proxima cita</label>
          <input
            id="dictation-next"
            value={draft.nextAppointment}
            onChange={(event) => setDraft((current) => ({ ...current, nextAppointment: event.target.value }))}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="dictation-summary">Reporte medico dictado</label>
        <textarea
          id="dictation-summary"
          className="dictation-textarea"
          value={draft.summary}
          onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
        />
      </div>

      <div className="field">
        <label htmlFor="dictation-prescription">Recetario e indicaciones</label>
        <textarea
          id="dictation-prescription"
          className="dictation-textarea"
          value={draft.prescription}
          onChange={(event) => setDraft((current) => ({ ...current, prescription: event.target.value }))}
        />
      </div>

      <div className="field">
        <label htmlFor="dictation-images">Imagenes, laboratorios o adjuntos</label>
        <input
          id="dictation-images"
          value={draft.medicalImagesText}
          onChange={(event) => setDraft((current) => ({ ...current, medicalImagesText: event.target.value }))}
          placeholder="rx-torax.pdf, laboratorio.pdf"
        />
      </div>

      <div className="dictation-vocabulary">
        {medicalDictationTerms.slice(0, 28).map((term) => (
          <span className="tag" key={term}>
            {term}
          </span>
        ))}
      </div>

      <div className="button-row">
        <button className="btn primary" type="button" onClick={saveDictation} disabled={busy || !doctor.id || !summaryReady}>
          <Save size={18} />
          Guardar dictado
        </button>
        <button
          className="btn"
          type="button"
          onClick={() =>
            onReview({
              patient,
              report,
              doctor,
              summary: draft.summary,
              prescription: draft.prescription,
              deliveryChannels
            })
          }
          disabled={busy || !summaryReady}
        >
          <Bot size={18} />
          Revisar con OpenClaw
        </button>
      </div>
    </div>
  );
}

function CashModule({
  cashRegisters,
  payments,
  expenses,
  invoices,
  appointments,
  staff,
  automations,
  busy,
  onSaveCashRecord,
  onPrepareCashClose,
  onRunAutomation
}: {
  cashRegisters: CashRegister[];
  payments: CashTransaction[];
  expenses: CashExpense[];
  invoices: PendingInvoice[];
  appointments: AppointmentRecord[];
  staff: StaffMember[];
  automations: AutomationTemplate[];
  busy: boolean;
  onSaveCashRecord: (
    input:
      | { type: "payment"; payment: CashTransaction }
      | { type: "expense"; expense: CashExpense }
      | { type: "invoice"; invoice: PendingInvoice }
  ) => Promise<unknown>;
  onPrepareCashClose: (period: CashRegister["period"]) => void;
  onRunAutomation: (template: AutomationTemplate) => void;
}) {
  const cashAutomation = automations.find((item) => item.id === "auto-caja-diaria");
  const clinicId = cashRegisters[0]?.clinicId ?? appointments[0]?.clinicId ?? staff[0]?.clinicId ?? "clinic-san-jose";
  const [paymentDraft, setPaymentDraft] = useState<CashTransaction>(() => createEmptyPayment(clinicId, appointments));
  const [expenseDraft, setExpenseDraft] = useState<CashExpense>(() => createEmptyExpense(clinicId));
  const [invoiceDraft, setInvoiceDraft] = useState<PendingInvoice>(() => createEmptyInvoice(clinicId, appointments));
  const completedPayments = payments.filter((payment) => payment.status === "completado");
  const pendingInvoices = invoices.filter((invoice) => invoice.status === "pendiente");
  const paidExpenses = expenses.filter((expense) => expense.status !== "pendiente");
  const methodTotals = completedPayments.reduce(
    (totals, payment) => ({
      ...totals,
      [payment.method]: totals[payment.method] + payment.amount
    }),
    { efectivo: 0, tarjeta: 0, sinpe: 0, transferencia: 0 } as Record<CashTransaction["method"], number>
  );
  const doctorPayouts = staff
    .filter((member) => member.role === "medico")
    .map((doctor) => {
      const paidAppointments = appointments.filter((appointment) => appointment.doctorId === doctor.id && appointment.paymentStatus !== "pendiente");
      const serviceHonorarium = paidAppointments.reduce((total, appointment) => total + appointment.doctorHonorarium, 0);
      const hourlyPay = doctor.verifiedHoursMonth * doctor.defaultHonorarium;

      return {
        doctor,
        serviceHonorarium,
        hourlyPay,
        total: serviceHonorarium + hourlyPay
      };
    });

  useEffect(() => {
    setPaymentDraft((current) => ({ ...current, clinicId }));
    setExpenseDraft((current) => ({ ...current, clinicId }));
    setInvoiceDraft((current) => ({ ...current, clinicId }));
  }, [clinicId]);

  function selectPaymentAppointment(appointmentId: string) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    setPaymentDraft((current) => ({
      ...current,
      appointmentId: appointment?.id,
      patientId: appointment?.patientId,
      patientName: appointment?.patientName ?? current.patientName,
      serviceName: appointment?.serviceName ?? current.serviceName,
      amount: appointment?.price ?? current.amount,
      currency: "CRC"
    }));
  }

  function selectInvoiceAppointment(appointmentId: string) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    setInvoiceDraft((current) => ({
      ...current,
      appointmentId: appointment?.id,
      patientId: appointment?.patientId,
      patientName: appointment?.patientName ?? current.patientName,
      concept: appointment?.serviceName ?? current.concept,
      amount: appointment?.price ?? current.amount,
      currency: "CRC"
    }));
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveCashRecord({ type: "payment", payment: { ...paymentDraft, clinicId, currency: "CRC" } });
    setPaymentDraft(createEmptyPayment(clinicId, appointments));
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveCashRecord({ type: "expense", expense: { ...expenseDraft, clinicId, currency: "CRC" } });
    setExpenseDraft(createEmptyExpense(clinicId));
  }

  async function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveCashRecord({ type: "invoice", invoice: { ...invoiceDraft, clinicId, currency: "CRC" } });
    setInvoiceDraft(createEmptyInvoice(clinicId, appointments));
  }

  return (
    <div className="grid">
      <Panel icon={WalletCards} title="Caja cajera">
        <div className="cash-module">
          <div className="cash-grid">
            {cashRegisters.map((cash) => (
              <div className="surface-block" key={cash.id}>
                <div className="section-title-row">
                  <strong>Cierre {cashPeriodLabels[cash.period]}</strong>
                  <button className="btn" type="button" onClick={() => onPrepareCashClose(cash.period)} disabled={busy} title="Preparar cierre con OpenClaw">
                    <Bot size={18} />
                    {busy ? "Preparando" : "Cierre"}
                  </button>
                </div>
                <div className="mini-stat">
                  <span>Ingresos</span>
                  <b>{money(cash.revenue, "CRC")}</b>
                </div>
                <div className="mini-stat">
                  <span>Gastos</span>
                  <b>{money(cash.expenses, "CRC")}</b>
                </div>
                <div className="mini-stat">
                  <span>Facturas pendientes</span>
                  <b>{cash.pendingInvoices}</b>
                </div>
                <span className={`status-chip ${cash.status}`}>{cash.status}</span>
              </div>
            ))}
          </div>

          <div className="cash-method-grid">
            {Object.entries(methodTotals).map(([method, total]) => (
              <div className="surface-block" key={method}>
                <strong>{cashMethodLabels[method as CashTransaction["method"]]}</strong>
                <div className="metric-value">{money(total, "CRC")}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="cash-workspace">
        <Panel icon={BadgeDollarSign} title="Registrar pago">
          <form className="cash-form" onSubmit={submitPayment}>
            <div className="appointment-form-grid">
              <div className="field">
                <label htmlFor="cash-appointment">Cita/servicio</label>
                <select id="cash-appointment" value={paymentDraft.appointmentId ?? ""} onChange={(event) => selectPaymentAppointment(event.target.value)}>
                  <option value="">Manual</option>
                  {appointments.map((appointment) => (
                    <option value={appointment.id} key={appointment.id}>
                      {appointment.patientName} - {appointment.serviceName} - {money(appointment.price, "CRC")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cash-patient">Paciente</label>
                <input id="cash-patient" value={paymentDraft.patientName} onChange={(event) => setPaymentDraft((current) => ({ ...current, patientName: event.target.value }))} required />
              </div>
              <div className="field">
                <label htmlFor="cash-service">Servicio</label>
                <input id="cash-service" value={paymentDraft.serviceName} onChange={(event) => setPaymentDraft((current) => ({ ...current, serviceName: event.target.value }))} required />
              </div>
              <div className="field">
                <label htmlFor="cash-method">Metodo</label>
                <select id="cash-method" value={paymentDraft.method} onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value as CashTransaction["method"] }))}>
                  {Object.entries(cashMethodLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cash-amount">Monto colones</label>
                <input id="cash-amount" type="number" min="0" value={paymentDraft.amount} onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: Number(event.target.value) }))} required />
              </div>
              <div className="field">
                <label htmlFor="cash-status">Estado</label>
                <select id="cash-status" value={paymentDraft.status} onChange={(event) => setPaymentDraft((current) => ({ ...current, status: event.target.value as CashTransaction["status"] }))}>
                  <option value="completado">Completado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="anulado">Anulado</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="cash-reference">Referencia</label>
                <input id="cash-reference" value={paymentDraft.reference} onChange={(event) => setPaymentDraft((current) => ({ ...current, reference: event.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="cash-received-by">Recibido por</label>
                <input id="cash-received-by" value={paymentDraft.receivedBy} onChange={(event) => setPaymentDraft((current) => ({ ...current, receivedBy: event.target.value }))} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="cash-notes">Notas</label>
              <textarea id="cash-notes" value={paymentDraft.notes} onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <button className="btn primary" type="submit" disabled={busy} title="Registrar pago">
              <Save size={18} />
              Registrar pago
            </button>
          </form>
        </Panel>

        <div className="grid">
          <Panel icon={WalletCards} title="Gastos empresa">
            <form className="cash-form" onSubmit={submitExpense}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="expense-description">Descripcion</label>
                  <input id="expense-description" value={expenseDraft.description} onChange={(event) => setExpenseDraft((current) => ({ ...current, description: event.target.value }))} required />
                </div>
                <div className="field">
                  <label htmlFor="expense-category">Categoria</label>
                  <select id="expense-category" value={expenseDraft.category} onChange={(event) => setExpenseDraft((current) => ({ ...current, category: event.target.value as CashExpense["category"] }))}>
                    <option value="empresa">Empresa</option>
                    <option value="medicos">Medicos</option>
                    <option value="insumos">Insumos</option>
                    <option value="servicios">Servicios</option>
                    <option value="alquiler">Alquiler</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="expense-amount">Monto colones</label>
                  <input id="expense-amount" type="number" min="0" value={expenseDraft.amount} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: Number(event.target.value) }))} required />
                </div>
                <div className="field">
                  <label htmlFor="expense-method">Metodo</label>
                  <select id="expense-method" value={expenseDraft.method} onChange={(event) => setExpenseDraft((current) => ({ ...current, method: event.target.value as CashExpense["method"] }))}>
                    {Object.entries(cashMethodLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="expense-vendor">Proveedor</label>
                  <input id="expense-vendor" value={expenseDraft.vendor} onChange={(event) => setExpenseDraft((current) => ({ ...current, vendor: event.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="expense-status">Estado</label>
                  <select id="expense-status" value={expenseDraft.status} onChange={(event) => setExpenseDraft((current) => ({ ...current, status: event.target.value as CashExpense["status"] }))}>
                    <option value="registrado">Registrado</option>
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
              </div>
              <button className="btn" type="submit" disabled={busy} title="Registrar gasto">
                <Plus size={18} />
                Registrar gasto
              </button>
            </form>
          </Panel>

          <Panel icon={FileClock} title="Facturas pendientes">
            <form className="cash-form" onSubmit={submitInvoice}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="invoice-appointment">Cita</label>
                  <select id="invoice-appointment" value={invoiceDraft.appointmentId ?? ""} onChange={(event) => selectInvoiceAppointment(event.target.value)}>
                    <option value="">Manual</option>
                    {appointments.map((appointment) => (
                      <option value={appointment.id} key={appointment.id}>
                        {appointment.patientName} - {appointment.serviceName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="invoice-patient">Paciente/cliente</label>
                  <input id="invoice-patient" value={invoiceDraft.patientName} onChange={(event) => setInvoiceDraft((current) => ({ ...current, patientName: event.target.value }))} required />
                </div>
                <div className="field">
                  <label htmlFor="invoice-concept">Concepto</label>
                  <input id="invoice-concept" value={invoiceDraft.concept} onChange={(event) => setInvoiceDraft((current) => ({ ...current, concept: event.target.value }))} required />
                </div>
                <div className="field">
                  <label htmlFor="invoice-amount">Monto colones</label>
                  <input id="invoice-amount" type="number" min="0" value={invoiceDraft.amount} onChange={(event) => setInvoiceDraft((current) => ({ ...current, amount: Number(event.target.value) }))} required />
                </div>
                <div className="field">
                  <label htmlFor="invoice-due">Vence</label>
                  <input id="invoice-due" type="date" value={invoiceDraft.dueDate} onChange={(event) => setInvoiceDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="invoice-status">Estado</label>
                  <select id="invoice-status" value={invoiceDraft.status} onChange={(event) => setInvoiceDraft((current) => ({ ...current, status: event.target.value as PendingInvoice["status"] }))}>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagada">Pagada</option>
                    <option value="vencida">Vencida</option>
                  </select>
                </div>
              </div>
              <button className="btn" type="submit" disabled={busy} title="Registrar factura">
                <FilePlus2 size={18} />
                Registrar factura
              </button>
            </form>
          </Panel>
        </div>
      </div>

      <div className="cash-support-grid">
        <Panel icon={ClipboardList} title="Movimientos recientes">
          <div className="surface-list">
            {payments.slice(0, 6).map((payment) => (
              <div className="surface-row" key={payment.id}>
                <div>
                  <strong>{payment.patientName}</strong>
                  <p>
                    {payment.serviceName} - {cashMethodLabels[payment.method]} - {payment.reference || "sin referencia"}
                  </p>
                </div>
                <div className="row-metrics">
                  <span>{money(payment.amount, "CRC")}</span>
                  <span className={`status-chip ${payment.status}`}>{payment.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={UserCog} title="Honorarios medicos">
          <div className="surface-list">
            {doctorPayouts.map((item) => (
              <div className="surface-row" key={item.doctor.id}>
                <div>
                  <strong>{item.doctor.name}</strong>
                  <p>
                    Servicios {money(item.serviceHonorarium, "CRC")} - horas {money(item.hourlyPay, "CRC")}
                  </p>
                </div>
                <span className="status-chip listo">{money(item.total, "CRC")}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={FileClock} title="Pendientes contador">
          <div className="surface-list">
            {pendingInvoices.slice(0, 6).map((invoice) => (
              <div className="surface-row" key={invoice.id}>
                <div>
                  <strong>{invoice.patientName}</strong>
                  <p>
                    {invoice.concept} - vence {invoice.dueDate}
                  </p>
                </div>
                <span className={`status-chip ${invoice.status}`}>{money(invoice.amount, "CRC")}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={WalletCards} title="Gastos registrados">
          <div className="surface-list">
            {paidExpenses.slice(0, 6).map((expense) => (
              <div className="surface-row" key={expense.id}>
                <div>
                  <strong>{expense.description}</strong>
                  <p>
                    {expense.category} - {expense.vendor || "sin proveedor"}
                  </p>
                </div>
                <span className={`status-chip ${expense.status}`}>{money(expense.amount, "CRC")}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {cashAutomation ? (
        <Panel icon={BadgeDollarSign} title="Cierre automatizado">
          <div className="surface-row">
            <div>
              <strong>{cashAutomation.name}</strong>
              <p>{cashAutomation.expectedOutput}</p>
            </div>
            <button className="btn primary" onClick={() => onRunAutomation(cashAutomation)} disabled={busy}>
              <Play size={18} />
              {busy ? "Ejecutando" : "Ejecutar"}
            </button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function ReportsModule({ reports }: { reports: ReportSummary[] }) {
  return (
    <Panel icon={BarChart3} title="Reportes">
      <div className="surface-list">
        {reports.map((report) => (
          <div className="surface-row report-row" key={report.id}>
            <div>
              <strong>{report.title}</strong>
              <p>
                Rol: {report.ownerRole} - Actualizado {new Date(report.updatedAt).toLocaleDateString()}
              </p>
              <div className="tag-row">
                {report.metrics.map((metric) => (
                  <span className="tag" key={metric.label}>
                    {metric.label}: {metric.value}
                  </span>
                ))}
              </div>
            </div>
            <span className={`status-chip ${report.status}`}>{report.status}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AutomationsModule({
  automations,
  onRunAutomation,
  busy
}: {
  automations: AutomationTemplate[];
  onRunAutomation: (template: AutomationTemplate) => void;
  busy: boolean;
}) {
  return (
    <Panel icon={Bot} title="Automatizaciones OpenClaw">
      <div className="surface-list">
        {automations.map((template) => (
          <div className="surface-row automation-row" key={template.id}>
            <div>
              <strong>{template.name}</strong>
              <p>{template.prompt}</p>
              <div className="tag-row">
                <span className="tag">{intentLabels[template.intent]}</span>
                <span className="tag">{template.role}</span>
                <span className={`status-chip priority-${template.priority}`}>{template.priority}</span>
              </div>
            </div>
            <button className="btn primary" onClick={() => onRunAutomation(template)} disabled={busy}>
              <Play size={18} />
              {busy ? "Ejecutando" : "Ejecutar"}
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SettingsModule({
  state,
  profileRole,
  clinicId
}: {
  state: CentralState | null;
  profileRole: string;
  clinicId: string;
}) {
  return (
    <div className="grid">
      <Panel icon={Building2} title="Clinicas">
        <div className="surface-list">
          {(state?.clinics ?? []).map((clinic) => (
            <div className="surface-row" key={clinic.id}>
              <div>
                <strong>{clinic.name}</strong>
                <p>
                  {clinic.region} - {clinic.nodeUrl}
                </p>
              </div>
              <span className={`status-chip ${clinic.id === clinicId ? "online" : clinic.status}`}>{clinic.status}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={ShieldCheck} title="Roles">
        <div className="role-grid">
          {(state?.roles ?? []).map((role) => (
            <div className="surface-block" key={role.id}>
              <strong>{role.name}</strong>
              <p>{role.description}</p>
              <div className="tag-row">
                <span className="tag">{role.scope}</span>
                {role.id === profileRole ? <span className="status-chip online">actual</span> : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ExecutionPanel({ execution, result, busy }: { execution: ExecutionState; result: string; busy: boolean }) {
  const iconClass =
    execution.status === "completed"
      ? "icon-green"
      : execution.status === "failed"
        ? "icon-rose"
        : execution.status === "running"
          ? "icon-amber"
          : "icon-indigo";
  const statusLabel =
    execution.status === "completed"
      ? "completado"
      : execution.status === "failed"
        ? "fallo"
        : execution.status === "running"
          ? "ejecutando"
          : "listo";

  return (
    <section className="execution-console" aria-label="Ultima ejecucion OpenClaw">
      <div className="execution-summary">
        <div className={`icon-tile ${iconClass}`}>
          {execution.status === "completed" ? <CheckCircle2 size={20} /> : <Bot size={20} />}
        </div>
        <div>
          <div className="execution-title-row">
            <strong>{execution.title}</strong>
            <span className={`status-chip ${statusLabel}`}>{busy ? "ejecutando" : statusLabel}</span>
          </div>
          <p>{execution.message}</p>
          <div className="tag-row">
            {execution.intent ? <span className="tag">{intentLabels[execution.intent]}</span> : null}
            {execution.source ? <span className="tag">{execution.source}</span> : null}
            {typeof execution.forwarded === "boolean" ? (
              <span className={`status-chip ${execution.forwarded ? "online" : "pendiente"}`}>
                {execution.forwarded ? "Docker conectado" : "En cola central"}
              </span>
            ) : null}
            {execution.taskId ? <span className="tag">{execution.taskId}</span> : null}
          </div>
        </div>
      </div>
      <details className="execution-details">
        <summary>Trazabilidad OpenClaw</summary>
        <pre className="result-box">{result}</pre>
      </details>
    </section>
  );
}

function NodePanel({ health, result }: { health: HealthState | null; result: string }) {
  return (
    <Panel icon={Bot} title="Nodo local">
      <div className="sync-box">
        <div className="sync-meta">
          <div className="sync-line">
            URL <strong>{health?.nodeUrl ?? "Configurada en API central"}</strong>
          </div>
          <div className="sync-line">
            Clinica <strong>{health?.clinic?.name ?? "Pendiente"}</strong>
          </div>
          <div className="sync-line">
            OpenClaw <strong>{health?.openclaw?.mode ?? "mock"}</strong>
          </div>
          <div className="sync-line">
            Gateway <strong>{health?.openclaw?.reachable ? "Disponible" : "Mock/local"}</strong>
          </div>
        </div>
        <pre className="result-box">{result}</pre>
      </div>
    </Panel>
  );
}

function CommandPanel({
  form,
  clinics,
  busy,
  onChange,
  onSubmit
}: {
  form: TaskForm;
  clinics: { id: string; name: string }[];
  busy: boolean;
  onChange: (form: TaskForm) => void;
  onSubmit: () => void;
}) {
  return (
    <Panel icon={ClipboardList} title="Orden manual">
      <div className="command-form">
        <div className="field-grid">
          <div className="field">
            <label htmlFor="clinic">Clinica</label>
            <select
              id="clinic"
              value={form.clinicId}
              onChange={(event) => onChange({ ...form, clinicId: event.target.value })}
            >
              {clinics.map((clinic) => (
                <option value={clinic.id} key={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="intent">Modulo</label>
            <select
              id="intent"
              value={form.intent}
              onChange={(event) => onChange({ ...form, intent: event.target.value as TaskIntent })}
            >
              {Object.entries(intentLabels).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="priority">Prioridad</label>
          <select
            id="priority"
            value={form.priority}
            onChange={(event) => onChange({ ...form, priority: event.target.value as TaskPriority })}
          >
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="critica">Critica</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="prompt">Instruccion</label>
          <textarea id="prompt" value={form.prompt} onChange={(event) => onChange({ ...form, prompt: event.target.value })} />
        </div>

        <button className="btn primary" onClick={onSubmit} disabled={busy} title="Enviar tarea al nodo local">
          <Play size={18} />
          {busy ? "Ejecutando" : "Ejecutar"}
        </button>
      </div>
    </Panel>
  );
}
