import { NextResponse } from "next/server";
import { z } from "zod";
import { getClinicNodeConfig, getClinicNodeRequestHeaders, getLocalNodeUrlHint, isCloudRuntime, isLocalNodeUrl } from "@/lib/clinic-config";
import { addEvent, createTask, getState, hydrateState, patchClinic, patchTask, persistState } from "@/lib/data";
import type {
  AppointmentRecord,
  CashExpense,
  CashRegister,
  CashTransaction,
  PendingInvoice,
  PatientInstruction,
  PatientRecord,
  PatientReport,
  ReportSummary,
  ServiceCatalogItem,
  StaffMember
} from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const taskSchema = z.object({
  clinicId: z.string().min(1),
  intent: z.enum(["agenda", "correos", "contabilidad", "historial", "gestion-local", "sync"]),
  priority: z.enum(["normal", "alta", "critica"]).default("normal"),
  prompt: z.string().min(8).max(2000)
});

export const maxDuration = 60;

function getLocalNodeTaskTimeoutMs() {
  const configured = Number(process.env.LOCAL_NODE_TASK_TIMEOUT_MS ?? 25_000);
  if (!Number.isFinite(configured) || configured <= 0) return 25_000;
  return Math.min(configured, 85_000);
}

const localNodeTaskTimeoutMs = getLocalNodeTaskTimeoutMs();

function truncateText(value: string | null | undefined, maxLength = 600) {
  const text = value ?? "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function compactPatientReport(report: PatientReport) {
  return {
    id: report.id,
    title: report.title,
    type: report.type,
    status: report.status,
    doctorName: report.doctorName,
    createdAt: report.createdAt,
    approvedAt: report.approvedAt,
    summary: truncateText(report.summary, 700),
    prescription: truncateText(report.prescription, 500),
    nextAppointment: report.nextAppointment,
    medicalImages: report.medicalImages.slice(0, 8),
    signedByDoctor: report.signedByDoctor,
    deliveryChannels: report.deliveryChannels
  };
}

function compactInstruction(instruction: PatientInstruction) {
  return {
    id: instruction.id,
    service: instruction.service,
    category: instruction.category,
    status: instruction.status,
    text: truncateText(instruction.text, 500),
    channels: instruction.channels,
    scheduledFor: instruction.scheduledFor
  };
}

function compactPatient(patient: PatientRecord) {
  return {
    id: patient.id,
    clinicId: patient.clinicId,
    name: patient.name,
    documentId: patient.documentId,
    phone: patient.phone,
    whatsapp: patient.whatsapp,
    email: patient.email,
    nextAppointment: patient.nextAppointment,
    nextService: patient.nextService,
    assignedDoctor: patient.assignedDoctor,
    risk: patient.risk,
    communication: patient.communication,
    pendingDocuments: patient.pendingDocuments.slice(0, 12),
    reports: patient.reports.slice(0, 6).map(compactPatientReport),
    instructions: patient.instructions.slice(0, 8).map(compactInstruction),
    doctorApprovalRequired: patient.doctorApprovalRequired,
    notes: truncateText(patient.notes, 500)
  };
}

function compactAppointment(appointment: AppointmentRecord) {
  return {
    id: appointment.id,
    clinicId: appointment.clinicId,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName,
    serviceId: appointment.serviceId,
    serviceName: appointment.serviceName,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    serviceSubtotal: appointment.serviceSubtotal,
    ivaRate: appointment.ivaRate,
    ivaAmount: appointment.ivaAmount,
    price: appointment.price,
    currency: appointment.currency,
    doctorHonorarium: appointment.doctorHonorarium,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    reminderChannels: appointment.reminderChannels,
    reminderStatus: appointment.reminderStatus,
    reportDeliveryStatus: appointment.reportDeliveryStatus,
    notes: truncateText(appointment.notes, 500)
  };
}

function compactStaff(member: StaffMember) {
  return {
    id: member.id,
    clinicId: member.clinicId,
    name: member.name,
    role: member.role,
    email: member.email,
    phone: member.phone,
    licenseNumber: member.licenseNumber,
    specialty: member.specialty,
    status: member.status,
    verifiedHoursMonth: member.verifiedHoursMonth,
    defaultHonorarium: member.defaultHonorarium,
    currency: member.currency,
    serviceIds: member.serviceIds,
    signatureLabel: member.signatureLabel,
    reportApprovalEnabled: member.reportApprovalEnabled,
    notes: truncateText(member.notes, 400)
  };
}

function compactService(service: ServiceCatalogItem) {
  return {
    id: service.id,
    clinicId: service.clinicId,
    name: service.name,
    specialty: service.specialty,
    durationMinutes: service.durationMinutes,
    price: service.price,
    ivaRate: service.ivaRate,
    currency: service.currency,
    doctorHonorarium: service.doctorHonorarium,
    preparationInstructions: truncateText(service.preparationInstructions, 500),
    requiresReportApproval: service.requiresReportApproval
  };
}

function compactPayment(payment: CashTransaction) {
  return {
    id: payment.id,
    clinicId: payment.clinicId,
    appointmentId: payment.appointmentId,
    patientId: payment.patientId,
    patientName: payment.patientName,
    serviceName: payment.serviceName,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    reference: payment.reference,
    paidAt: payment.paidAt
  };
}

function compactExpense(expense: CashExpense) {
  return {
    id: expense.id,
    clinicId: expense.clinicId,
    category: expense.category,
    description: truncateText(expense.description, 240),
    amount: expense.amount,
    currency: expense.currency,
    method: expense.method,
    status: expense.status,
    vendor: expense.vendor,
    paidAt: expense.paidAt
  };
}

function compactInvoice(invoice: PendingInvoice) {
  return {
    id: invoice.id,
    clinicId: invoice.clinicId,
    appointmentId: invoice.appointmentId,
    patientId: invoice.patientId,
    patientName: invoice.patientName,
    concept: truncateText(invoice.concept, 240),
    amount: invoice.amount,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    status: invoice.status
  };
}

function compactCashRegister(register: CashRegister) {
  return {
    id: register.id,
    clinicId: register.clinicId,
    period: register.period,
    revenue: register.revenue,
    expenses: register.expenses,
    pendingInvoices: register.pendingInvoices,
    currency: register.currency,
    status: register.status,
    preparedBy: register.preparedBy,
    updatedAt: register.updatedAt
  };
}

function compactReportSummary(report: ReportSummary) {
  return {
    id: report.id,
    clinicId: report.clinicId,
    title: report.title,
    ownerRole: report.ownerRole,
    status: report.status,
    updatedAt: report.updatedAt,
    metrics: report.metrics.slice(0, 8)
  };
}

function previewBody(value: string, maxLength = 700) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
}

async function readNodeResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();

  if (contentType.includes("application/json") && rawBody) {
    try {
      return {
        contentType,
        rawBody,
        json: JSON.parse(rawBody) as Record<string, unknown>,
        parseError: null as string | null
      };
    } catch (error) {
      return {
        contentType,
        rawBody,
        json: null,
        parseError: error instanceof Error ? error.message : "JSON invalido"
      };
    }
  }

  return {
    contentType,
    rawBody,
    json: null,
    parseError: rawBody ? "Respuesta no JSON desde el nodo local." : "Respuesta vacia desde el nodo local."
  };
}

function buildNodeResponseError(params: {
  nodeUrl: string;
  status: number;
  contentType: string;
  rawBody: string;
  parseError: string | null;
}) {
  const bodyPreview = previewBody(params.rawBody);
  const accessBlocked = params.status === 401 || params.status === 403;
  const payloadTooLarge = params.status === 413 || /entity too large|payload/i.test(bodyPreview);
  const htmlResponse = params.rawBody.trimStart().startsWith("<");

  return {
    ok: false,
    error: payloadTooLarge
      ? "El contexto enviado al nodo local era demasiado grande."
      : accessBlocked
        ? `Cloudflare Access o el proxy rechazo POST /tasks con HTTP ${params.status}.`
        : htmlResponse
          ? "El nodo/proxy devolvio HTML cuando la API esperaba JSON."
          : params.parseError ?? `El nodo local respondio HTTP ${params.status}.`,
    nodeUrl: params.nodeUrl,
    upstreamStatus: params.status,
    upstreamContentType: params.contentType || null,
    upstreamBodyPreview: bodyPreview,
    hint: payloadTooLarge
      ? "Se compacto el contexto clinico antes de reenviarlo. Si persiste, sube LOCAL_NODE_JSON_LIMIT en el nodo local."
      : accessBlocked
        ? "El ping /health puede pasar aunque POST /tasks sea bloqueado. Revisa la politica de Cloudflare Access y WAF para permitir Service Auth en todos los metodos."
        : htmlResponse
          ? "Revisa si Cloudflare, Vercel o el tunel estan redirigiendo POST /tasks a una pagina HTML."
          : undefined
  };
}

function buildLocalExecutionContext(clinicId: string) {
  const state = getState();
  const byClinic = <T extends { clinicId: string }>(items: T[]) => items.filter((item) => item.clinicId === clinicId);

  return {
    source: "openclinic-web-app",
    generatedAt: new Date().toISOString(),
    clinic: state.clinics.find((clinic) => clinic.id === clinicId) ?? null,
    patients: byClinic(state.patients).slice(0, 50).map(compactPatient),
    appointments: byClinic(state.appointments).slice(0, 75).map(compactAppointment),
    staff: byClinic(state.staff).slice(0, 50).map(compactStaff),
    schedules: byClinic(state.schedules).slice(0, 80),
    services: byClinic(state.serviceCatalog).slice(0, 50).map(compactService),
    cashRegisters: byClinic(state.cashRegisters).slice(0, 24).map(compactCashRegister),
    payments: byClinic(state.cashTransactions).slice(0, 100).map(compactPayment),
    expenses: byClinic(state.cashExpenses).slice(0, 100).map(compactExpense),
    invoices: byClinic(state.pendingInvoices).slice(0, 100).map(compactInvoice),
    reports: byClinic(state.reports).slice(0, 30).map(compactReportSummary),
    events: byClinic(state.events).slice(0, 25)
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = taskSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!canAccessClinic(auth.user, parsed.data.clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  await hydrateState();
  const task = createTask(parsed.data);
  const node = getClinicNodeConfig(task.clinicId);
  const context = buildLocalExecutionContext(task.clinicId);
  await persistState();

  if (!node?.nodeUrl) {
    return NextResponse.json({
      task,
      forwarded: false,
      note: "La clinica no tiene nodo local configurado; la tarea queda en cola central."
    });
  }

  if (isCloudRuntime() && isLocalNodeUrl(node.nodeUrl)) {
    const message = "La API central no puede alcanzar una URL local .node desde Vercel.";
    const result = {
      warning: message,
      nodeUrl: node.nodeUrl,
      hint: getLocalNodeUrlHint(node.nodeUrl)
    };
    const updatedTask = patchTask(task.id, { status: "sent-local", result }) ?? task;
    patchClinic(task.clinicId, { status: "degraded" });
    addEvent({
      clinicId: task.clinicId,
      type: "local.forward.pending",
      message
    });
    await persistState();

    return NextResponse.json({
      task: updatedTask,
      forwarded: false,
      ...result
    });
  }

  try {
    const nodeUrl = `${node.nodeUrl.replace(/\/$/, "")}/tasks`;
    const response = await fetch(nodeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...getClinicNodeRequestHeaders(node)
      },
      body: JSON.stringify({ ...task, context }),
      cache: "no-store",
      signal: AbortSignal.timeout(localNodeTaskTimeoutMs)
    });
    const parsedResponse = await readNodeResponse(response);
    const result =
      parsedResponse.json ??
      buildNodeResponseError({
        nodeUrl: node.nodeUrl,
        status: response.status,
        contentType: parsedResponse.contentType,
        rawBody: parsedResponse.rawBody,
        parseError: parsedResponse.parseError
      });

    if (!response.ok || !parsedResponse.json) {
      patchTask(task.id, { status: "failed", result });
      patchClinic(task.clinicId, { status: "degraded" });
      addEvent({
        clinicId: task.clinicId,
        type: "local.forward.failed",
        message: parsedResponse.json
          ? `El nodo local respondio con HTTP ${response.status}.`
          : "El nodo local no devolvio JSON valido al ejecutar la tarea."
      });
      await persistState();

      return NextResponse.json({ task: { ...task, status: "failed" }, result }, { status: 502 });
    }

    const updatedTask = patchTask(task.id, { status: "completed", result }) ?? task;
    patchClinic(task.clinicId, { status: "online", lastSync: new Date().toISOString() });
    addEvent({
      clinicId: task.clinicId,
      type: "local.task.completed",
      message: "OpenClaw local ejecuto la automatizacion y devolvio trazabilidad."
    });
    await persistState();

    return NextResponse.json({
      task: updatedTask,
      forwarded: true,
      result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar con el nodo local.";
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError" || /timeout|abort/i.test(error.message));
    const result = {
      warning: timedOut
        ? `El nodo local no respondio antes de ${Math.round(localNodeTaskTimeoutMs / 1000)} segundos.`
        : message,
      nodeUrl: node.nodeUrl,
      timeoutMs: localNodeTaskTimeoutMs,
      queuedCentral: true,
      hint: timedOut
        ? "La tarea queda en cola central para evitar que Cloudflare devuelva 502 HTML. Revisa que el tunel y el nodo local respondan rapido a POST /tasks."
        : getLocalNodeUrlHint(node.nodeUrl)
    };
    const updatedTask = patchTask(task.id, { status: "sent-local", result }) ?? task;
    patchClinic(task.clinicId, { status: "degraded" });
    addEvent({
      clinicId: task.clinicId,
      type: "local.forward.pending",
      message: timedOut
        ? "La tarea quedo pendiente; el nodo local tardo demasiado en responder."
        : "La tarea quedo pendiente; el nodo local no estuvo disponible en este host."
    });
    await persistState();

    return NextResponse.json({
      task: updatedTask,
      forwarded: false,
      ...result
    });
  }
}
