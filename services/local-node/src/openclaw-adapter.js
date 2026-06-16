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

  if (task.intent === "agenda") return "agenda.audit";
  if (task.intent === "correos") return "patient.reminders";
  if (task.intent === "historial") return "clinical.approval";
  if (task.intent === "gestion-local") return "operations.local_review";
  if (prompt.includes("cierre de caja diario")) return "cash.daily_close";
  if (prompt.includes("cierre de caja semanal") || prompt.includes("paquete semanal")) return "cash.weekly_package";
  if (prompt.includes("cierre de caja mensual")) return "cash.monthly_close";
  if (task.intent === "contabilidad") return "cash.accounting_package";
  if (task.intent === "sync") return "sync.batch";
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

function getMessagingConfig(localDb) {
  const messaging = asObject(localDb.messaging);

  return {
    demoMode: messaging.demoMode !== false,
    demoEmail: typeof messaging.demoEmail === "string" && messaging.demoEmail.trim() ? messaging.demoEmail.trim() : "ronnywoods77@gmail.com",
    demoWhatsapp:
      typeof messaging.demoWhatsapp === "string" && messaging.demoWhatsapp.trim()
        ? messaging.demoWhatsapp.trim()
        : "+506-6121-5702",
    requireHumanApproval: true,
    providerMode: typeof messaging.providerMode === "string" && messaging.providerMode.trim() ? messaging.providerMode.trim() : "demo-only",
    readInbox: false
  };
}

function demoRecipientForChannel(messaging, channel) {
  return channel === "whatsapp" ? messaging.demoWhatsapp : messaging.demoEmail;
}

function summarizeDraft(message) {
  return {
    id: message.id,
    channel: message.channel,
    to: message.to,
    originalTo: message.originalTo,
    demoTo: message.demoTo,
    template: message.template,
    subject: message.subject,
    status: message.status,
    humanApprovalRequired: message.humanApprovalRequired,
    providerMode: message.providerMode,
    patientName: message.patientName,
    appointmentId: message.appointmentId,
    reportId: message.reportId,
    reportTitle: message.reportTitle
  };
}

function findPatientForReport(report, patients) {
  return (
    patients.find((patient) => report.patientId && patient.id === report.patientId) ??
    patients.find((patient) => patient.name === report.patientName) ??
    null
  );
}

function messageAlreadyQueued(localDb, channel, template, entityId) {
  const queue = channel === "whatsapp" ? localDb.whatsappQueue : localDb.emailQueue;
  return queue.some(
    (message) =>
      message.channel === channel &&
      message.template === template &&
      (message.reportId === entityId || message.appointmentId === entityId) &&
      message.status !== "rejected_by_human"
  );
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function contextArray(context, key, fallback = []) {
  const value = asObject(context)[key];
  return Array.isArray(value) ? value : fallback;
}

function normalizeContextPatients(context, fallbackPatients) {
  const patients = contextArray(context, "patients", fallbackPatients);
  return patients.map((patient) => ({
    ...patient,
    email: patient.email ?? "",
    whatsapp: patient.whatsapp ?? "",
    risk: patient.risk ?? patient.riesgo ?? "bajo",
    pendingDocuments: Array.isArray(patient.pendingDocuments) ? patient.pendingDocuments : [],
    reports: Array.isArray(patient.reports) ? patient.reports : [],
    instructions: Array.isArray(patient.instructions) ? patient.instructions : []
  }));
}

function normalizeContextAppointments(context, fallbackAppointments, patients) {
  const appointments = contextArray(context, "appointments", fallbackAppointments);
  const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
  const patientsByName = new Map(patients.map((patient) => [patient.name, patient]));

  return appointments.map((appointment) => {
    const patient = patientsById.get(appointment.patientId) ?? patientsByName.get(appointment.patientName) ?? {};
    return {
      ...appointment,
      patientEmail: appointment.patientEmail ?? patient.email ?? "",
      patientWhatsapp: appointment.patientWhatsapp ?? patient.whatsapp ?? "",
      status: appointment.status === "solicitada" ? "needs-confirmation" : appointment.status,
      reminderStatus: appointment.reminderStatus ?? "pendiente",
      paymentStatus: appointment.paymentStatus ?? "pendiente",
      price: Number(appointment.price ?? 0),
      doctorHonorarium: Number(appointment.doctorHonorarium ?? 0)
    };
  });
}

function normalizeContextReports(context, patients, fallbackReports) {
  const patientReports = patients.flatMap((patient) =>
    (patient.reports ?? []).map((report) => ({
      ...report,
      patientId: patient.id,
      patientName: patient.name,
      doctorName: report.doctorName || patient.assignedDoctor || "Medico pendiente",
      deliveryChannels: Array.isArray(report.deliveryChannels) ? report.deliveryChannels : ["email"],
      medicalImages: Array.isArray(report.medicalImages) ? report.medicalImages : [],
      status: report.status ?? "pendiente-aprobacion"
    }))
  );

  return patientReports.length > 0 ? patientReports : fallbackReports;
}

function buildOperationalDb(task, localDb) {
  const context = asObject(task.context);
  const hasCentralContext = Object.keys(context).length > 0;
  const patients = normalizeContextPatients(context, localDb.patients);
  const appointments = normalizeContextAppointments(context, localDb.appointments, patients);

  return {
    ...localDb,
    source: hasCentralContext ? "central-web-context" : "local-node-seed",
    centralContextAt: typeof context.generatedAt === "string" ? context.generatedAt : null,
    patients,
    appointments,
    staff: contextArray(context, "staff", localDb.staff),
    schedules: contextArray(context, "schedules", []),
    services: contextArray(context, "services", []),
    payments: contextArray(context, "payments", localDb.payments),
    expenses: contextArray(context, "expenses", localDb.expenses),
    invoices: contextArray(context, "invoices", localDb.invoices),
    cashRegisters: contextArray(context, "cashRegisters", []),
    reports: normalizeContextReports(context, patients, localDb.reports),
    centralEvents: contextArray(context, "events", [])
  };
}

function buildModelPrompt(task, localDb, playbook) {
  const profile = intentProfiles[task.intent] ?? intentProfiles.sync;
  const messaging = getMessagingConfig(localDb);
  const snapshot = {
    clinicId: task.clinicId,
    playbook,
    source: localDb.source ?? "local-node",
    centralContextAt: localDb.centralContextAt ?? null,
    messaging: {
      demoMode: messaging.demoMode,
      demoEmail: messaging.demoEmail,
      demoWhatsapp: messaging.demoWhatsapp,
      requireHumanApproval: messaging.requireHumanApproval,
      providerMode: messaging.providerMode,
      readInbox: messaging.readInbox
    },
    localCounts: {
      appointments: localDb.appointments.length,
      patients: localDb.patients.length,
      staff: localDb.staff.length,
      schedules: localDb.schedules?.length ?? 0,
      services: localDb.services?.length ?? 0,
      payments: localDb.payments.length,
      expenses: localDb.expenses.length,
      pendingInvoices: localDb.invoices.filter((invoice) => invoice.status === "pendiente").length,
      reportsForApproval: localDb.reports.filter((report) => report.status === "pendiente-aprobacion").length
    },
    patients: localDb.patients.slice(0, 8).map((patient) => ({
      id: patient.id,
      name: patient.name,
      documentId: patient.documentId,
      email: patient.email,
      whatsapp: patient.whatsapp,
      nextAppointment: patient.nextAppointment,
      nextService: patient.nextService,
      assignedDoctor: patient.assignedDoctor,
      risk: patient.risk,
      pendingDocuments: patient.pendingDocuments,
      communication: patient.communication
    })),
    appointments: localDb.appointments.slice(0, 8).map((appointment) => ({
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientWhatsapp: appointment.patientWhatsapp,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      reminderStatus: appointment.reminderStatus,
      paymentStatus: appointment.paymentStatus,
      price: appointment.price,
      doctorHonorarium: appointment.doctorHonorarium
    })),
    staff: localDb.staff.slice(0, 8).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      specialty: member.specialty,
      status: member.status,
      verifiedHoursMonth: member.verifiedHoursMonth,
      defaultHonorarium: member.defaultHonorarium,
      reportApprovalEnabled: member.reportApprovalEnabled
    })),
    schedules: (localDb.schedules ?? []).slice(0, 8),
    services: (localDb.services ?? []).slice(0, 8),
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
    "No leas ni revises bandejas de correo, inboxes, chats o conversaciones privadas.",
    "Modo demo activo: cualquier borrador de Email debe ir solo a ronnywoods77@gmail.com y cualquier WhatsApp solo a +506-6121-5702.",
    "Conserva el destinatario real del paciente solo como originalTo para auditoria; no lo uses como destino de envio en demo.",
    "Todo mensaje requiere aprobacion humana antes de entregar a un proveedor de Email o WhatsApp.",
    "Usa colones costarricenses (CRC) para caja, facturas, gastos y honorarios.",
    "Usa el snapshot local recibido desde la Web App como fuente principal; si falta un dato, marca la accion como pendiente de revision humana.",
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
  const messaging = getMessagingConfig(localDb);
  const queue = channel === "whatsapp" ? localDb.whatsappQueue : localDb.emailQueue;
  const createdAt = nowIso();
  const originalTo = draft.to ?? "";
  const demoTo = demoRecipientForChannel(messaging, channel);
  const routedTo = messaging.demoMode ? demoTo : originalTo;
  const message = {
    id: `${channel}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    channel,
    createdAt,
    ...draft,
    to: routedTo,
    originalTo,
    demoTo: messaging.demoMode ? demoTo : null,
    demoMode: messaging.demoMode,
    status: "ready_for_human_review",
    humanApprovalRequired: true,
    providerMode: messaging.providerMode,
    readInbox: false,
    sent: false,
    auditTrail: [
      {
        at: createdAt,
        event: "draft_created",
        channel,
        originalTo,
        routedTo,
        note: messaging.demoMode
          ? "Modo demo: destino redirigido al contacto de prueba y bloqueado hasta aprobacion humana."
          : "Borrador bloqueado hasta aprobacion humana."
      }
    ]
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
      remindersQueued: queued.length,
      demoRouting: getMessagingConfig(localDb),
      drafts: queued.map(summarizeDraft)
    },
    next_step: "Revisar la bandeja /outbox, aprobar manualmente los borradores y luego confirmar citas desde Agenda."
  };
}

function runMessagesPlaybook(task, localDb, base) {
  let prepared = [...localDb.emailQueue, ...localDb.whatsappQueue];

  if (prepared.length === 0) {
    const target = localDb.appointments.find((item) => item.reminderStatus === "pendiente") ?? localDb.appointments[0];
    if (target) {
      prepared = [
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
      ];
    }
  }

  return {
    ...base,
    summary: `${prepared.length} mensajes preparados para revision humana.`,
    actions: [
      "Validar datos de contacto del paciente",
      "Crear borradores Email/WhatsApp redirigidos al contacto demo",
      "No leer bandejas de correo ni conversaciones privadas",
      "Dejar mensajes bloqueados hasta aprobacion humana"
    ],
    approvals: ["Recepcion o medico debe aprobar cada mensaje antes de cualquier entrega a proveedor"],
    data: {
      playbook: detectPlaybook(task),
      demoRouting: getMessagingConfig(localDb),
      drafts: prepared.map(summarizeDraft)
    },
    next_step: "Abrir /outbox, aprobar o rechazar cada borrador y despues entregar al proveedor autorizado si corresponde."
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
  const approvedReports = localDb.reports.filter((report) => report.status === "aprobado");
  const packages = pendingReports.map((report) => ({
    reportId: report.id,
    patientName: report.patientName,
    doctorName: report.doctorName,
    status: "draft_ready_for_doctor_signature",
    channels: report.deliveryChannels,
    documents: report.medicalImages,
    requiresHumanApproval: true
  }));
  const missingContacts = [];
  const deliveryDrafts = approvedReports.flatMap((report) => {
    const patient = findPatientForReport(report, localDb.patients);
    const channels = Array.isArray(report.deliveryChannels) && report.deliveryChannels.length > 0 ? report.deliveryChannels : ["email"];

    return channels.flatMap((channel) => {
      const contact = channel === "whatsapp" ? patient?.whatsapp : patient?.email;
      if (!contact) {
        missingContacts.push({
          reportId: report.id,
          patientName: report.patientName,
          channel,
          reason: "Paciente sin contacto registrado para este canal"
        });
        return [];
      }

      if (messageAlreadyQueued(localDb, channel, "approved-medical-report-delivery", report.id)) {
        return [];
      }

      return [
        queueMessage(localDb, channel, {
          to: contact,
          subject: "Reporte medico aprobado",
          template: "approved-medical-report-delivery",
          reportId: report.id,
          reportTitle: report.title,
          patientId: patient?.id ?? report.patientId,
          patientName: report.patientName,
          doctorName: report.doctorName,
          approvedAt: report.approvedAt,
          signedByDoctor: report.signedByDoctor,
          summary: report.summary,
          prescription: report.prescription,
          nextAppointment: report.nextAppointment,
          medicalImages: report.medicalImages
        })
      ];
    });
  });
  const deliveryApprovals =
    deliveryDrafts.length > 0
      ? [`${deliveryDrafts.length} borradores de entrega requieren aprobacion humana en /outbox antes de envio externo`]
      : [];

  return {
    ...base,
    summary:
      deliveryDrafts.length > 0
        ? `${deliveryDrafts.length} borradores de reporte aprobado preparados para entrega auditada y ${packages.length} reportes pendientes de firma.`
        : `${packages.length} reportes/recetas preparados para firma medica.`,
    actions: [
      "Leer reporte clinico y recetario",
      "Preparar paquete con imagenes medicas y proxima cita",
      "Crear borradores de entrega al contacto del paciente cuando el reporte ya esta aprobado",
      "Bloquear envio externo hasta aprobacion humana en la bandeja de salida"
    ],
    approvals: [
      ...packages.map((item) => `Firma requerida: ${item.doctorName} para ${item.patientName}`),
      ...deliveryApprovals
    ],
    data: {
      playbook: detectPlaybook(task),
      packages,
      deliveryDrafts: deliveryDrafts.map(summarizeDraft),
      missingContacts,
      demoRouting: getMessagingConfig(localDb),
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
  const operationalDb = buildOperationalDb(task, localDb);
  const openclaw = await getOpenClawStatus(config);
  const playbook = detectPlaybook(task);
  let modelRun = null;
  let modelRunError = null;
  const shouldRunGateway = config.mode === "gateway" && openclaw.reachable && config.gatewayToken;
  const shouldRunRunner = Boolean(config.runnerUrl && openclaw.runner?.reachable);
  const modelPrompt = buildModelPrompt(task, operationalDb, playbook);

  if (shouldRunRunner) {
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
        signal: AbortSignal.timeout(config.runnerTimeoutMs ?? 120_000)
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? `OpenClaw runner HTTP ${response.status}`);
      }
      modelRun = payload;
    } catch (error) {
      modelRunError = error instanceof Error ? error.message : "OpenClaw runner failed";
    }
  } else if (config.runnerUrl) {
    modelRunError = "OpenClaw runner no disponible; se uso playbook deterministico local.";
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
    dataSource: operationalDb.source,
    centralContextAt: operationalDb.centralContextAt,
    openclaw,
    modelRun: compactModelRun(modelRun),
    modelRunError,
    completedAt: nowIso()
  };

  return runDeterministicPlaybook(task, operationalDb, base);
}
