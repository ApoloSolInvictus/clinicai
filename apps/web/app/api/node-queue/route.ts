import { NextResponse } from "next/server";
import { z } from "zod";
import { getClinicNodeConfig } from "@/lib/clinic-config";
import { addEvent, getState, hydrateState, patchClinic, patchTask, persistState } from "@/lib/data";
import type { AppointmentRecord, AutomationTask, PatientRecord, PatientReport, StaffMember } from "@/lib/data";

const pullSchema = z.object({
  action: z.literal("pull"),
  clinicId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(10).default(3)
});

const completeSchema = z.object({
  action: z.literal("complete"),
  clinicId: z.string().min(1),
  taskId: z.string().min(1),
  ok: z.boolean().default(true),
  result: z.unknown().optional()
});

const requestSchema = z.discriminatedUnion("action", [pullSchema, completeSchema]);
const leaseMs = 120_000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function truncateText(value: string | null | undefined, maxLength = 700) {
  const text = value ?? "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function compactReport(report: PatientReport) {
  return {
    id: report.id,
    title: report.title,
    type: report.type,
    status: report.status,
    doctorName: report.doctorName,
    createdAt: report.createdAt,
    approvedAt: report.approvedAt,
    summary: truncateText(report.summary),
    prescription: truncateText(report.prescription, 500),
    nextAppointment: report.nextAppointment,
    medicalImages: report.medicalImages.slice(0, 8),
    signedByDoctor: report.signedByDoctor,
    deliveryChannels: report.deliveryChannels
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
    reports: patient.reports.slice(0, 8).map(compactReport),
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
    specialty: member.specialty,
    status: member.status,
    verifiedHoursMonth: member.verifiedHoursMonth,
    defaultHonorarium: member.defaultHonorarium,
    serviceIds: member.serviceIds,
    signatureLabel: member.signatureLabel,
    reportApprovalEnabled: member.reportApprovalEnabled
  };
}

function buildQueueContext(clinicId: string) {
  const state = getState();
  const byClinic = <T extends { clinicId: string }>(items: T[]) => items.filter((item) => item.clinicId === clinicId);

  return {
    source: "openclinic-central-queue",
    generatedAt: new Date().toISOString(),
    clinic: state.clinics.find((clinic) => clinic.id === clinicId) ?? null,
    patients: byClinic(state.patients).slice(0, 50).map(compactPatient),
    appointments: byClinic(state.appointments).slice(0, 75).map(compactAppointment),
    staff: byClinic(state.staff).slice(0, 50).map(compactStaff),
    schedules: byClinic(state.schedules).slice(0, 80),
    services: byClinic(state.serviceCatalog).slice(0, 50),
    payments: byClinic(state.cashTransactions).slice(0, 100),
    expenses: byClinic(state.cashExpenses).slice(0, 100),
    invoices: byClinic(state.pendingInvoices).slice(0, 100),
    reports: byClinic(state.reports).slice(0, 30),
    events: byClinic(state.events).slice(0, 25)
  };
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

function isAuthorizedNode(request: Request, clinicId: string) {
  const token = bearerToken(request);
  const accessClientId = request.headers.get("cf-access-client-id")?.trim();
  const accessClientSecret = request.headers.get("cf-access-client-secret")?.trim();
  const expectedAccessClientId = process.env.CLOUDFLARE_ACCESS_CLIENT_ID?.trim();
  const expectedAccessClientSecret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET?.trim();

  if (
    accessClientId &&
    accessClientSecret &&
    expectedAccessClientId &&
    expectedAccessClientSecret &&
    accessClientId === expectedAccessClientId &&
    accessClientSecret === expectedAccessClientSecret
  ) {
    return true;
  }

  if (!token) return false;

  const node = getClinicNodeConfig(clinicId);
  const allowedTokens = [
    node?.token,
    process.env.LOCAL_NODE_TOKEN,
    process.env.OPENCLINIC_NODE_QUEUE_TOKEN
  ].filter((value): value is string => Boolean(value?.trim()));

  return allowedTokens.some((allowed) => allowed === token);
}

function isPullableTask(task: AutomationTask, now = Date.now()) {
  if (task.status !== "sent-local") return false;

  const result = asRecord(task.result);
  if (result.queuedCentral !== true || result.forwarded !== false) return false;

  const leaseUntil = typeof result.nodeLeaseUntil === "string" ? Date.parse(result.nodeLeaseUntil) : 0;
  return !Number.isFinite(leaseUntil) || leaseUntil <= now;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (!isAuthorizedNode(request, parsed.data.clinicId)) {
    return NextResponse.json({ error: "Token de nodo invalido." }, { status: 401 });
  }

  await hydrateState();

  if (parsed.data.action === "pull") {
    const now = Date.now();
    const state = getState();
    const leaseUntil = new Date(now + leaseMs).toISOString();
    const tasks = state.tasks
      .filter((task) => task.clinicId === parsed.data.clinicId && isPullableTask(task, now))
      .slice(0, parsed.data.limit);
    const context = tasks.length > 0 ? buildQueueContext(parsed.data.clinicId) : null;

    tasks.forEach((task) => {
      const result = asRecord(task.result);
      patchTask(task.id, {
        status: "sent-local",
        result: {
          ...result,
          nodePulledAt: new Date(now).toISOString(),
          nodeLeaseUntil: leaseUntil
        }
      });
    });

    if (tasks.length > 0) {
      addEvent({
        clinicId: parsed.data.clinicId,
        type: "node.queue.pulled",
        message: `Nodo local tomo ${tasks.length} tarea(s) de la cola central.`
      });
      await persistState();
    }

    return NextResponse.json({
      ok: true,
      clinicId: parsed.data.clinicId,
      pulled: tasks.length,
      leaseUntil,
      tasks: tasks.map((task) => ({ ...task, context }))
    });
  }

  const completion = completeSchema.parse(parsed.data);
  const result = asRecord(completion.result);
  const completedAt = new Date().toISOString();
  const existingTask = getState().tasks.find((task) => task.id === completion.taskId);
  if (!existingTask || existingTask.clinicId !== completion.clinicId) {
    return NextResponse.json({ error: "Tarea no encontrada para esta clinica." }, { status: 404 });
  }

  const updatedTask = patchTask(completion.taskId, {
    status: completion.ok ? "completed" : "failed",
    result: {
      ...result,
      queuedCentral: false,
      forwarded: true,
      completedVia: "node-pull",
      localNodeCompletedAt: completedAt
    }
  });

  patchClinic(completion.clinicId, {
    status: completion.ok ? "online" : "degraded",
    lastSync: completedAt
  });
  addEvent({
    clinicId: completion.clinicId,
    type: completion.ok ? "node.queue.completed" : "node.queue.failed",
    message: completion.ok
      ? `Nodo local completo la tarea ${completion.taskId}.`
      : `Nodo local reporto fallo en la tarea ${completion.taskId}.`
  });
  await persistState();

  return NextResponse.json({
    ok: true,
    taskId: completion.taskId,
    status: updatedTask?.status ?? (completion.ok ? "completed" : "failed"),
    completedAt
  });
}
