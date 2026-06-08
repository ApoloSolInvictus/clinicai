"use client";

import {
  Activity,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Database,
  FileClock,
  HeartPulse,
  Mail,
  Play,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CentralState, TaskIntent } from "@/lib/data";

type HealthState = {
  ok?: boolean;
  service?: string;
  clinic?: { id: string; name: string };
  nodeUrl?: string;
  openclaw?: { mode: string; gatewayUrl: string; reachable: boolean };
  capabilities?: string[];
  note?: string;
  error?: string;
};

const navItems = [
  { icon: Activity, label: "Operacion", active: true },
  { icon: CalendarDays, label: "Agenda", active: false },
  { icon: FileClock, label: "Historial", active: false },
  { icon: WalletCards, label: "Contabilidad", active: false }
];

const modules = [
  {
    icon: CalendarDays,
    name: "Agenda",
    copy: "Citas, conflictos, recordatorios y confirmaciones locales."
  },
  {
    icon: FileClock,
    name: "Historial clinico",
    copy: "Registros, timeline y busqueda preparada para FHIR."
  },
  {
    icon: WalletCards,
    name: "Contabilidad",
    copy: "Facturas, gastos, reportes y cierres por sede."
  },
  {
    icon: Mail,
    name: "Citas & Correos",
    copy: "Automatizaciones de mensajes desde el nodo local."
  },
  {
    icon: Building2,
    name: "Gestion local",
    copy: "Personal, horarios, inventario y reglas por clinica."
  },
  {
    icon: RefreshCw,
    name: "Sincronizacion",
    copy: "Eventos bidireccionales con resolucion de conflictos."
  },
  {
    icon: Cloud,
    name: "Reportes centrales",
    copy: "KPIs multi-clinica para direccion y finanzas."
  },
  {
    icon: Bot,
    name: "OpenClaw Core",
    copy: "Adaptador para Gateway real o modo mock de pruebas."
  }
];

const architectures = [
  {
    icon: Cloud,
    title: "Web App centralizada",
    body: "Vercel concentra UI, API, reportes, usuarios y administracion multi-clinica.",
    tags: ["Vercel", "REST API", "Reportes"]
  },
  {
    icon: Bot,
    title: "Docker con OpenClaw",
    body: "Un nodo por cliente ejecuta automatizaciones con permisos locales controlados.",
    tags: ["Docker", "Offline", "OpenClaw"]
  },
  {
    icon: RefreshCw,
    title: "Modelo hibrido",
    body: "Central coordina; local ejecuta; el sync mueve solo eventos necesarios.",
    tags: ["Sync", "Eventos", "Auditoria"]
  }
];

const intentLabels: Record<TaskIntent, string> = {
  agenda: "Agenda",
  correos: "Correos",
  contabilidad: "Contabilidad",
  historial: "Historial",
  "gestion-local": "Gestion local",
  sync: "Sincronizacion"
};

export default function Home() {
  const [state, setState] = useState<CentralState | null>(null);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("Listo para enviar una orden al nodo local.");
  const [form, setForm] = useState({
    clinicId: "clinic-san-jose",
    intent: "agenda" as TaskIntent,
    priority: "normal",
    prompt: "Revisa la agenda de manana, detecta conflictos, prepara correos de confirmacion y devuelve un resumen para administracion."
  });

  async function loadState() {
    const response = await fetch("/api/state", { cache: "no-store" });
    setState(await response.json());
  }

  async function pingLocalNode() {
    try {
      const response = await fetch("/api/local-health", { cache: "no-store" });
      const payload = await response.json();
      setHealth(payload);
      setResult(JSON.stringify(payload, null, 2));
    } catch (error) {
      setHealth({ ok: false });
      setResult(error instanceof Error ? error.message : "No se pudo consultar el nodo local.");
    }
  }

  async function submitTask() {
    setBusy(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
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

  async function syncNow() {
    setBusy(true);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
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
    loadState();
    pingLocalNode();
  }, []);

  const metrics = useMemo(() => {
    const tasks = state?.tasks ?? [];
    const completed = tasks.filter((task) => task.status === "completed").length;
    return [
      {
        icon: Cloud,
        label: "Central Vercel",
        value: "API lista",
        className: "icon-teal"
      },
      {
        icon: Bot,
        label: "Nodo OpenClaw",
        value: health?.ok ? "Online" : "Pendiente",
        className: "icon-indigo"
      },
      {
        icon: RefreshCw,
        label: "Eventos sync",
        value: String(state?.events.length ?? 0),
        className: "icon-amber"
      },
      {
        icon: CheckCircle2,
        label: "Tareas completas",
        value: String(completed),
        className: "icon-rose"
      }
    ];
  }, [health?.ok, state]);

  const events = state?.events.slice(0, 6) ?? [];

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
            <button className={`nav-item ${item.active ? "active" : ""}`} key={item.label} title={item.label}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="side-note">
          Modelo activo: hibrido. La nube coordina y cada clinica ejecuta tareas sensibles dentro de su Docker local.
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Quantum Maximus Hybrid Ops</div>
            <h1>Centro de mando para Vercel + OpenClaw local</h1>
          </div>
          <div className="top-actions">
            <span className="status-pill">
              <span className={`status-dot ${health?.ok ? "online" : ""}`} />
              {health?.ok ? "Nodo local conectado" : "Nodo local por conectar"}
            </span>
            <button className="btn" onClick={pingLocalNode} title="Consultar salud del nodo local">
              <HeartPulse size={18} />
              Ping
            </button>
            <button className="btn" onClick={syncNow} disabled={busy} title="Sincronizar eventos locales">
              <RefreshCw size={18} />
              Sync
            </button>
          </div>
        </header>

        <section className="grid metrics" aria-label="Indicadores">
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

        <section className="content-grid grid">
          <div className="grid">
            <article className="card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <Database size={18} />
                  Tres arquitecturas, una operacion
                </h2>
              </div>
              <div className="panel-body">
                <div className="architecture-row">
                  {architectures.map((item) => (
                    <div className="architecture-card" key={item.title}>
                      <div className="icon-tile icon-teal">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                      </div>
                      <div className="tag-row">
                        {item.tags.map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <Activity size={18} />
                  Modulos del sistema
                </h2>
              </div>
              <div className="panel-body">
                <div className="grid modules">
                  {modules.map((module) => (
                    <div className="module-card" key={module.name}>
                      <div className="module-name">
                        <module.icon size={18} color="var(--teal-dark)" />
                        {module.name}
                      </div>
                      <p>{module.copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <FileClock size={18} />
                  Actividad central
                </h2>
              </div>
              <div className="panel-body">
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
              </div>
            </article>
          </div>

          <aside className="grid">
            <article className="card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <Play size={18} />
                  Orden para OpenClaw local
                </h2>
              </div>
              <div className="panel-body">
                <div className="command-form">
                  <div className="field-grid">
                    <div className="field">
                      <label htmlFor="clinic">Clinica</label>
                      <select
                        id="clinic"
                        value={form.clinicId}
                        onChange={(event) => setForm((current) => ({ ...current, clinicId: event.target.value }))}
                      >
                        {(state?.clinics ?? []).map((clinic) => (
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
                        onChange={(event) =>
                          setForm((current) => ({ ...current, intent: event.target.value as TaskIntent }))
                        }
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
                      onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Critica</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="prompt">Instruccion</label>
                    <textarea
                      id="prompt"
                      value={form.prompt}
                      onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                    />
                  </div>

                  <div className="button-row">
                    <button className="btn primary" onClick={submitTask} disabled={busy} title="Enviar tarea al nodo local">
                      <Play size={18} />
                      Ejecutar
                    </button>
                    <button className="btn" onClick={syncNow} disabled={busy} title="Traer eventos del nodo local">
                      <RefreshCw size={18} />
                      Sincronizar
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <Bot size={18} />
                  Nodo local
                </h2>
              </div>
              <div className="panel-body">
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
              </div>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
