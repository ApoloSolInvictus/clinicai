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
  Phone,
  Play,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCog,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type {
  AppointmentRecord,
  AutomationTemplate,
  CashRegister,
  CentralState,
  DoctorSchedule,
  PatientInstruction,
  PatientRecord,
  PatientReport,
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

type PatientChannel = "email" | "whatsapp";

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
  return new Intl.NumberFormat("en-US", {
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
    currency: service?.currency ?? "USD",
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

export default function Home() {
  const session = useFirebaseSession();
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [state, setState] = useState<CentralState | null>(null);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("Listo para enviar una orden al nodo local.");
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

  async function pingLocalNode(targetClinicId = clinicId) {
    try {
      const response = await fetch(`/api/local-health?clinicId=${encodeURIComponent(targetClinicId)}`, {
        headers: await session.getAuthHeaders(),
        cache: "no-store"
      });
      const payload = await response.json();
      setHealth(payload);
      setResult(JSON.stringify(payload, null, 2));
    } catch (error) {
      setHealth({ ok: false });
      setResult(error instanceof Error ? error.message : "No se pudo consultar el nodo local.");
    }
  }

  async function sendTask(input: {
    clinicId: string;
    intent: TaskIntent;
    priority: "normal" | "alta" | "critica";
    prompt: string;
  }) {
    setBusy(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      setResult(JSON.stringify(payload, null, 2));
      await loadState();
    } catch (error) {
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
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await session.getAuthHeaders()) },
        body: JSON.stringify({ clinicId })
      });
      const payload = await response.json();
      setResult(JSON.stringify(payload, null, 2));
      await loadState();
    } catch (error) {
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
        <div className="auth-card">
          <div className="auth-mark">
            <Stethoscope size={28} />
          </div>
          <h1>Lux Aeterna Clinical AI</h1>
          <p className="muted-text">Validando sesion operativa.</p>
        </div>
      </AuthShell>
    );
  }

  if (!session.configured) {
    return (
      <AuthShell>
        <div className="auth-card">
          <div className="auth-mark">
            <KeyRound size={28} />
          </div>
          <h1>Firebase pendiente</h1>
          <p className="muted-text">
            Configura las variables NEXT_PUBLIC_FIREBASE y FIREBASE para activar el acceso por clinica.
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
            <h1>Lux Aeterna Clinical AI</h1>
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
          <div className="brand-mark" title="Lux Aeterna">
            <Stethoscope size={24} />
          </div>
          <div>
            <span className="brand-title">Lux Aeterna</span>
            <span className="brand-subtitle">Clinical AI Codex</span>
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
              Sync
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
            {activeModule === "medicos" ? <DoctorsModule staff={clinicStaff} schedules={clinicSchedules} /> : null}
            {activeModule === "caja" ? (
              <CashModule cashRegisters={clinicCash} automations={clinicAutomations} onRunAutomation={runAutomation} busy={busy} />
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
  return <main className="auth-shell">{children}</main>;
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
                Ejecutar
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
              <span>{money(agendaTotals.revenue, "USD")} agenda</span>
              <span>{money(agendaTotals.honorarium, "USD")} honorarios</span>
            </div>
            <div className="button-row">
              <button className="btn" type="button" onClick={onPrepareAgendaReview} disabled={busy} title="Revisar agenda con OpenClaw">
                <Bot size={18} />
                Revisar
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
                      Recordatorio
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
              Ejecutar
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
                      Recordatorios
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onPrepareClinicalDocuments(draft)}
                      disabled={busy}
                      title="Preparar documentos clinicos"
                    >
                      <FilePlus2 size={18} />
                      Documentos
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

function DoctorsModule({ staff, schedules }: { staff: StaffMember[]; schedules: DoctorSchedule[] }) {
  const doctors = staff.filter((member) => member.role === "medico");

  return (
    <div className="grid">
      <Panel icon={UserCog} title="Medicos">
        <div className="surface-list">
          {doctors.map((doctor) => (
            <div className="surface-row" key={doctor.id}>
              <div>
                <strong>{doctor.name}</strong>
                <p>{doctor.email}</p>
              </div>
              <div className="row-metrics">
                <span>{doctor.verifiedHoursMonth} h/mes</span>
                <span className={`status-chip ${doctor.status}`}>{doctor.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

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

function CashModule({
  cashRegisters,
  automations,
  onRunAutomation,
  busy
}: {
  cashRegisters: CashRegister[];
  automations: AutomationTemplate[];
  onRunAutomation: (template: AutomationTemplate) => void;
  busy: boolean;
}) {
  const cashAutomation = automations.find((item) => item.id === "auto-caja-diaria");

  return (
    <div className="grid">
      <Panel icon={WalletCards} title="Cierres de caja">
        <div className="cash-grid">
          {cashRegisters.map((cash) => (
            <div className="surface-block" key={cash.id}>
              <strong>Cierre {cash.period}</strong>
              <div className="mini-stat">
                <span>Ingresos</span>
                <b>{money(cash.revenue, cash.currency)}</b>
              </div>
              <div className="mini-stat">
                <span>Gastos</span>
                <b>{money(cash.expenses, cash.currency)}</b>
              </div>
              <div className="mini-stat">
                <span>Facturas pendientes</span>
                <b>{cash.pendingInvoices}</b>
              </div>
              <span className={`status-chip ${cash.status}`}>{cash.status}</span>
            </div>
          ))}
        </div>
      </Panel>

      {cashAutomation ? (
        <Panel icon={BadgeDollarSign} title="Cierre automatizado">
          <div className="surface-row">
            <div>
              <strong>{cashAutomation.name}</strong>
              <p>{cashAutomation.expectedOutput}</p>
            </div>
            <button className="btn primary" onClick={() => onRunAutomation(cashAutomation)} disabled={busy}>
              <Play size={18} />
              Ejecutar
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
              Ejecutar
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
          Ejecutar
        </button>
      </div>
    </Panel>
  );
}
