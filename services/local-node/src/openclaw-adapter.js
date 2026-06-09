import { runGatewayPrompt } from "./openclaw-gateway-client.js";

const defaultCapabilities = [
  "agenda.conflict_detection",
  "agenda.reminder_preparation",
  "emails.confirmations",
  "whatsapp.confirmations",
  "accounting.daily_close",
  "accounting.weekly_close",
  "accounting.monthly_close",
  "accounting.doctor_payouts",
  "clinical_reports.human_approval",
  "clinical_records.lookup",
  "local_sync.event_batch"
];

const intentProfiles = {
  agenda: {
    role: "Auditor de agenda clinica",
    goal: "Revisar citas, horarios medicos, conflictos, confirmaciones y recordatorios.",
    output: "conflicts, reminders, call_center_actions, human_review_required"
  },
  correos: {
    role: "Coordinador de mensajes a pacientes",
    goal: "Preparar correos y WhatsApp para recordatorios, confirmaciones y entrega de documentos.",
    output: "email_drafts, whatsapp_drafts, delivery_channels, human_review_required"
  },
  contabilidad: {
    role: "Analista de caja clinica en colones costarricenses",
    goal: "Preparar cierres, ingresos, gastos, facturas pendientes y honorarios medicos para contador.",
    output: "cash_close, payment_methods, expenses, doctor_payouts, accountant_summary"
  },
  historial: {
    role: "Asistente de expedientes clinicos",
    goal: "Preparar borradores de reportes, recetas e indicaciones sin enviar nada sin firma medica.",
    output: "clinical_drafts, required_approvals, delivery_package"
  },
  "gestion-local": {
    role: "Supervisor operativo local",
    goal: "Revisar personal, turnos, inventario, permisos y tareas internas de la clinica.",
    output: "operations_status, alerts, next_actions"
  },
  sync: {
    role: "Coordinador de sincronizacion hibrida",
    goal: "Compactar eventos locales, pagos, agenda y reportes para el central.",
    output: "event_batch, conflicts, sync_summary"
  }
};

function toOpenClawSessionId(value) {
  return `lux-aeterna-${String(value ?? "clinic").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function crc(value) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0
  }).format(value ?? 0);
}

function detectPlaybook(task) {
  const prompt = String(task.prompt ?? "").toLowerCase();

  if (prompt.includes("cierre de caja diario")) return "cash.daily_close";
  if (prompt.includes("cierre de caja semanal") || prompt.includes("paquete semanal")) return "cash.weekly_package";
  if (prompt.includes("cierre de caja mensual")) return "cash.monthly_close";
  if (prompt.includes("auditoria de agenda") || prompt.includes("conflictos de agenda")) return "agenda.audit";
  if (prompt.includes("recordatorio") || prompt.includes("confirmacion")) return "patient.reminders";
  if (prompt.includes("reporte medico") || prompt.includes("recetario") || prompt.includes("aprobacion medica")) return "clinical.approval";
  if (prompt.includes("sincronizacion") || prompt.includes("batch")) return "sync.batch";

  return `${task.intent}.standard`;
}

function compactModelRun(modelRun) {
  if (!modelRun) return null;
  return {
    ok: modelRun.ok ?? true,
    finalText: modelRun.finalText ?? modelRun.wait?.finalAssistantVisibleText ?? null,
    meta: modelRun.meta ?? modelRun.wait?.meta ?? null
  };
}

function buildModelPrompt(task, localDb, playbook) {
  const profile = intentProfiles[task.intent] ?? intentProfiles.sync;
  const snapshot = {
    clinicId: task.clinicId,
    playbook,
    localCounts: {
      appointments: localDb.appointments.length,
      patients: localDb.patients.length,
      payments: localDb.payments.length,
      expenses: localDb.expenses.length,
      pendingInvoices: localDb.invoices.filter((invoice) => invoice.status === "pendiente").length,
      reportsForApproval: localDb.reports.filter((report) => report.status === "pendiente-aprobacion").length
    },
    appointments: localDb.appointments.slice(0, 8).map((appointment) => ({
      id: appointment.id,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      serviceName: appointment.serviceName,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      reminderStatus: appointment.reminderStatus,
      paymentStatus: appointment.paymentStatus,
      price: appointment.price,
      doctorHonorarium: appointment.doctorHonorarium
    })),
    payments: localDb.payments.slice(0, 8),
    expenses: localDb.expenses.slice(0, 8),
    invoices: localDb.invoices.slice(0, 8),
    reports: localDb.reports.slice(0, 8),
    accounting: localDb.accounting
  };

  return [
    "Eres OpenClaw operando como asistente local de Lux Aeterna Clinical AI.",
    `Rol operativo: ${profile.role}.`,
    `Objetivo: ${profile.goal}.`,
    "Responde en espanol y devuelve JSON valido, sin Markdown.",
    "Nunca envies correos, WhatsApp, recetas o reportes medicos directamente; prepara borradores y marca aprobacion humana cuando aplique.",
    "Usa colones costarricenses (CRC) para caja, facturas, gastos y honorarios.",
    "Incluye siempre: summary, actions, approvals, data, next_step.",
    `Salida esperada por modulo: ${profile.output}.`,
    `Modulo: ${task.intent}`,
    `Playbook: ${playbook}`,
    `Prioridad: ${task.priority ?? "normal"}`,
    `Orden del usuario: ${task.prompt}`,
    `Snapshot local: ${JSON.stringify(snapshot)}`
  ].join("\n");
}

export async function getOpenClawStatus(config) {
  let runner = {
    runnerUrl: config.runnerUrl,
    reachable: false,
    status: config.runnerUrl ? "unreachable" : "not-configured"
  };

  if (config.runnerUrl) {
    try {
      const runnerHealthUrl = config.runnerUrl.replace(/\/run$/, "/health");
      const runnerResponse = await fetch(runnerHealthUrl, {
        signal: AbortSignal.timeout(1200)
      });
      runner = {
        runnerUrl: config.runnerUrl,
        reachable: runnerResponse.ok,
        status: runnerResponse.ok ? "live" : "unreachable"
      };
    } catch {
      runner = {
        runnerUrl: config.runnerUrl,
        reachable: false,
        status: "unreachable"
      };
    }
  }

  if (config.mode !== "gateway") {
    return {
      mode: "mock",
      gatewayUrl: config.gatewayUrl,
      runner,
      reachable: runner.reachable,
      status: "deterministic-playbooks",
      capabilities: defaultCapabilities
    };
  }

  try {
    const baseUrl = config.gatewayUrl.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/healthz`, {
      signal: AbortSignal.timeout(1200)
    });
    const payload = response.ok ? await response.json().catch(() => null) : null;

    return {
      mode: "gateway",
      gatewayUrl: config.gatewayUrl,
      runner,
      reachable: response.ok || runner.reachable,
      status: runner.reachable ? "runner-live" : payload?.status ?? (response.ok ? "live" : "unreachable"),
      capabilities: defaultCapabilities
    };
  } catch {
    return {
      mode: "gateway",
      gatewayUrl: config.gatewayUrl,
      runner,
      reachable: runner.reachable,
      status: runner.reachable ? "runner-live" : "gateway-unreachable-playbook-ready",
      capabilities: defaultCapabilities
    };
  }
}

function queueMessage(localDb, channel, draft) {
  const queue = channel === "whatsapp" ? localDb.whatsappQueue : localDb.emailQueue;
  const message = {
    id: `${channel}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    channel,
    status: "ready_for_human_review",
    createdAt: nowIso(),
    ...draft
  };
  queue.push(message);
  return message;
}

function appointmentConflicts(appointments) {
  const active = appointments.filter((item) => item.status !== "cancelada");
  const conflicts = [];

  for (let index = 0; index < active.length; index += 1) {
    for (let compare = index + 1; compare < active.length; compare += 1) {
      const left = active[index];
      const right = active[compare];
      if (left.doctorName !== right.doctorName) continue;
      const leftStart = new Date(left.startsAt).getTime();
      const leftEnd = new Date(left.endsAt).getTime();
      const rightStart = new Date(right.startsAt).getTime();
      const rightEnd = new Date(right.endsAt).getTime();
      if (leftStart < rightEnd && leftEnd > rightStart) {
        conflicts.push({ doctorName: left.doctorName, appointmentIds: [left.id, right.id] });
      }
    }
  }

  return conflicts;
}

function runAgendaPlaybook(task, localDb, base) {
  const conflicts = appointmentConflicts(localDb.appointments);
  const needsConfirmation = localDb.appointments.filter((item) => item.status === "needs-confirmation" || item.reminderStatus === "pendiente");
  const queued = needsConfirmation.flatMap((appointment) => [
    queueMessage(localDb, "email", {
      to: appointment.patientEmail,
      subject: "Confirmacion de cita",
      template: "appointment-confirmation",
      appointmentId: appointment.id,
      patientName: appointment.patientName
    }),
    queueMessage(localDb, "whatsapp", {
      to: appointment.patientWhatsapp,
      template: "appointment-confirmation",
      appointmentId: appointment.id,
      patientName: appointment.patientName
    })
  ]);

  return {
    ...base,
    summary: `Agenda revisada: ${localDb.appointments.length} citas, ${conflicts.length} conflictos y ${queued.length} recordatorios preparados.`,
    actions: [
      "Cruzar citas por medico y hora",
      "Preparar recordatorios Email/WhatsApp para Call Center",
      "Marcar conflictos para revision humana antes de confirmar"
    ],
    approvals: conflicts.length > 0 ? ["Call Center debe resolver conflictos antes de confirmar citas"] : [],
    data: {
      playbook: detectPlaybook(task),
      appointmentsReviewed: localDb.appointments.length,
      conflicts,
      remindersQueued: queued.length
    },
    next_step: "Revisar cola de mensajes y confirmar citas desde Agenda."
  };
}

function runMessagesPlaybook(task, localDb, base) {
  const prepared = [
    ...localDb.emailQueue.splice(0, localDb.emailQueue.length),
    ...localDb.whatsappQueue.splice(0, localDb.whatsappQueue.length)
  ];

  if (prepared.length === 0) {
    const target = localDb.appointments.find((item) => item.reminderStatus === "pendiente") ?? localDb.appointments[0];
    if (target) {
      prepared.push(
        queueMessage(localDb, "email", {
          to: target.patientEmail,
          subject: "Recordatorio de cita",
          template: "appointment-reminder",
          appointmentId: target.id,
          patientName: target.patientName
        }),
        queueMessage(localDb, "whatsapp", {
          to: target.patientWhatsapp,
          template: "appointment-reminder",
          appointmentId: target.id,
          patientName: target.patientName
        })
      );
    }
  }

  return {
    ...base,
    summary: `${prepared.length} mensajes preparados para revision humana.`,
    actions: [
      "Validar datos de contacto del paciente",
      "Crear borradores Email/WhatsApp",
      "Dejar mensajes listos para proveedor autorizado"
    ],
    approvals: ["Recepcion o medico debe aprobar mensajes clinicos antes de envio"],
    data: {
      playbook: detectPlaybook(task),
      drafts: prepared.map((item) => ({
        id: item.id,
        channel: item.channel,
        to: item.to,
        template: item.template,
        status: item.status
      }))
    },
    next_step: "Aprobar mensajes y enviarlos con el proveedor de Email/WhatsApp configurado."
  };
}

function runAccountingPlaybook(task, localDb, base) {
  const completedPayments = localDb.payments.filter((item) => item.status === "completado");
  const expenses = localDb.expenses.filter((item) => item.status !== "pendiente");
  const pendingInvoices = localDb.invoices.filter((item) => item.status === "pendiente");
  const revenue = completedPayments.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const byMethod = completedPayments.reduce((totals, item) => {
    totals[item.method] = (totals[item.method] ?? 0) + item.amount;
    return totals;
  }, {});
  const doctorPayouts = localDb.staff
    .filter((member) => member.role === "medico")
    .map((doctor) => {
      const serviceHonorarium = localDb.appointments
        .filter((appointment) => appointment.doctorName === doctor.name && appointment.paymentStatus === "pagado")
        .reduce((sum, appointment) => sum + appointment.doctorHonorarium, 0);
      const hourlyPay = doctor.verifiedHoursMonth * doctor.defaultHonorarium;
      return {
        doctorName: doctor.name,
        serviceHonorarium,
        hourlyPay,
        total: serviceHonorarium + hourlyPay
      };
    });

  localDb.accounting = {
    revenueToday: revenue,
    pendingInvoices: pendingInvoices.length,
    expensesMonth: expenseTotal,
    currency: "CRC",
    updatedAt: nowIso()
  };

  return {
    ...base,
    summary: `Cierre preparado en CRC: ingresos ${crc(revenue)}, gastos ${crc(expenseTotal)}, pendientes ${pendingInvoices.length}.`,
    actions: [
      "Consolidar pagos por efectivo, tarjeta, SINPE y transferencia",
      "Agregar gastos operativos y facturas pendientes",
      "Calcular honorarios medicos por servicios pagados y horas verificadas",
      "Preparar resumen para contador sin cierre definitivo"
    ],
    approvals: ["Administracion debe aprobar cierre definitivo antes de sincronizar contabilidad"],
    data: {
      playbook: detectPlaybook(task),
      currency: "CRC",
      revenue,
      expenses: expenseTotal,
      net: revenue - expenseTotal,
      byMethod,
      pendingInvoices,
      doctorPayouts
    },
    next_step: "Enviar reporte al contador o pedir revision humana si hay diferencias."
  };
}

function runClinicalPlaybook(task, localDb, base) {
  const pendingReports = localDb.reports.filter((report) => report.status === "pendiente-aprobacion");
  const packages = pendingReports.map((report) => ({
    reportId: report.id,
    patientName: report.patientName,
    doctorName: report.doctorName,
    status: "draft_ready_for_doctor_signature",
    channels: report.deliveryChannels,
    documents: report.medicalImages,
    requiresHumanApproval: true
  }));

  return {
    ...base,
    summary: `${packages.length} reportes/recetas preparados para firma medica.`,
    actions: [
      "Leer reporte clinico y recetario",
      "Preparar paquete con imagenes medicas y proxima cita",
      "Bloquear envio hasta aprobacion/firma humana del medico"
    ],
    approvals: packages.map((item) => `Firma requerida: ${item.doctorName} para ${item.patientName}`),
    data: {
      playbook: detectPlaybook(task),
      packages,
      recordsIndexed: localDb.patients.length
    },
    next_step: "Medico aprueba desde pestaña Medicos; luego OpenClaw prepara envio auditado."
  };
}

function runOperationsPlaybook(task, localDb, base) {
  const staffOnDuty = localDb.staff.filter((member) => member.status === "activo").length;
  const alerts = localDb.inventory.filter((item) => item.stock <= item.minimum).map((item) => ({
    item: item.name,
    stock: item.stock,
    minimum: item.minimum
  }));

  return {
    ...base,
    summary: `Gestion local revisada: ${staffOnDuty} colaboradores activos y ${alerts.length} alertas de inventario.`,
    actions: ["Revisar personal activo", "Verificar inventario minimo", "Preparar alertas operativas"],
    approvals: alerts.length > 0 ? ["Administracion debe aprobar compra/reposicion de inventario"] : [],
    data: {
      playbook: detectPlaybook(task),
      staffOnDuty,
      inventoryAlerts: alerts
    },
    next_step: "Resolver alertas operativas o sincronizar estado con central."
  };
}

function runSyncPlaybook(task, localDb, base) {
  const events = localDb.events.slice(0, 25);
  const batch = {
    id: `sync-${Date.now()}`,
    clinicId: task.clinicId,
    events: events.length,
    payments: localDb.payments.length,
    invoices: localDb.invoices.filter((item) => item.status === "pendiente").length,
    reportsForApproval: localDb.reports.filter((item) => item.status === "pendiente-aprobacion").length,
    createdAt: nowIso()
  };

  return {
    ...base,
    summary: `Batch de sincronizacion preparado con ${events.length} eventos locales.`,
    actions: ["Compactar eventos", "Adjuntar resumen de caja", "Adjuntar alertas de agenda y reportes"],
    approvals: [],
    data: {
      playbook: detectPlaybook(task),
      batch
    },
    next_step: "Enviar batch a la API central y conservar trazabilidad local."
  };
}

function runDeterministicPlaybook(task, localDb, base) {
  if (task.intent === "agenda") return runAgendaPlaybook(task, localDb, base);
  if (task.intent === "correos") return runMessagesPlaybook(task, localDb, base);
  if (task.intent === "contabilidad") return runAccountingPlaybook(task, localDb, base);
  if (task.intent === "historial") return runClinicalPlaybook(task, localDb, base);
  if (task.intent === "gestion-local") return runOperationsPlaybook(task, localDb, base);
  return runSyncPlaybook(task, localDb, base);
}

export async function runAutomation(task, localDb, config) {
  const openclaw = await getOpenClawStatus(config);
  const playbook = detectPlaybook(task);
  let modelRun = null;
  let modelRunError = null;
  const shouldRunGateway = config.mode === "gateway" && openclaw.reachable && config.gatewayToken;
  const modelPrompt = buildModelPrompt(task, localDb, playbook);

  if (config.runnerUrl) {
    try {
      const response = await fetch(config.runnerUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sessionId: toOpenClawSessionId(task.clinicId),
          message: modelPrompt
        }),
        signal: AbortSignal.timeout(370_000)
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? `OpenClaw runner HTTP ${response.status}`);
      }
      modelRun = payload;
    } catch (error) {
      modelRunError = error instanceof Error ? error.message : "OpenClaw runner failed";
    }
  }

  if (!modelRun && shouldRunGateway) {
    try {
      modelRun = await runGatewayPrompt({
        gatewayUrl: config.gatewayUrl,
        token: config.gatewayToken,
        clinicId: task.clinicId,
        taskId: task.id,
        message: modelPrompt
      });
    } catch (error) {
      modelRunError = error instanceof Error ? error.message : "OpenClaw model run failed";
    }
  }

  const base = {
    id: `run-${Date.now()}`,
    taskId: task.id,
    clinicId: task.clinicId,
    intent: task.intent,
    priority: task.priority ?? "normal",
    playbook,
    openclaw,
    modelRun: compactModelRun(modelRun),
    modelRunError,
    completedAt: nowIso()
  };

  return runDeterministicPlaybook(task, localDb, base);
}
