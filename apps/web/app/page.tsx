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
  FileText,
  HeartPulse,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type {
  AutomationTemplate,
  CashRegister,
  CentralState,
  DoctorSchedule,
  PatientRecord,
  ReportSummary,
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
              <AgendaModule schedules={clinicSchedules} automations={clinicAutomations} onRunAutomation={runAutomation} busy={busy} />
            ) : null}
            {activeModule === "pacientes" ? <PatientsModule patients={clinicPatients} /> : null}
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
  automations,
  onRunAutomation,
  busy
}: {
  schedules: DoctorSchedule[];
  automations: AutomationTemplate[];
  onRunAutomation: (template: AutomationTemplate) => void;
  busy: boolean;
}) {
  const agendaAutomation = automations.find((item) => item.intent === "agenda");

  return (
    <div className="grid">
      <Panel icon={CalendarCheck} title="Agenda medica">
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

function PatientsModule({ patients }: { patients: PatientRecord[] }) {
  return (
    <Panel icon={Users} title="Pacientes y documentos">
      <div className="surface-list">
        {patients.map((patient) => (
          <div className="surface-row patient-row" key={patient.id}>
            <div>
              <strong>{patient.name}</strong>
              <p>
                {patient.documentId} - Ultima visita {patient.lastVisit} - Proxima {patient.nextAppointment}
              </p>
              <div className="tag-row">
                <span className={`status-chip riesgo-${patient.risk}`}>riesgo {patient.risk}</span>
                {patient.pendingDocuments.map((doc) => (
                  <span className="tag" key={doc}>
                    {doc}
                  </span>
                ))}
              </div>
            </div>
            {patient.doctorApprovalRequired ? (
              <span className="approval-pill">
                <AlertTriangle size={16} />
                Aprobacion medica
              </span>
            ) : null}
          </div>
        ))}
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
