import { NextResponse } from "next/server";
import { z } from "zod";
import { getStateForAccess, upsertPatient } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const channelSchema = z.enum(["email", "whatsapp"]);

const reportSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(160),
  type: z.enum(["reporte-medico", "recetario", "laboratorio", "imagen", "referencia", "seguimiento"]),
  status: z.enum(["borrador", "pendiente-aprobacion", "aprobado", "enviado"]),
  doctorName: z.string().min(1).max(120),
  createdAt: z.string().min(1),
  approvedAt: z.string().optional(),
  summary: z.string().max(2000).default("Borrador pendiente de revision medica."),
  prescription: z.string().max(2000).default(""),
  nextAppointment: z.string().default(""),
  medicalImages: z.array(z.string().min(1).max(180)).default([]),
  signedByDoctor: z.string().max(180).default(""),
  deliveryChannels: z.array(channelSchema).default([])
});

const instructionSchema = z.object({
  id: z.string().optional(),
  service: z.string().min(1).max(140),
  category: z.enum(["preparacion", "medicamento", "post-consulta", "recordatorio"]),
  status: z.enum(["pendiente", "aprobacion-medica", "aprobado", "enviado"]),
  text: z.string().min(1).max(1600),
  channels: z.array(channelSchema).default([]),
  scheduledFor: z.string().min(1)
});

const patientSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  name: z.string().min(2).max(140),
  documentId: z.string().min(1).max(80),
  birthDate: z.string().default(""),
  sex: z.enum(["femenino", "masculino", "otro"]).default("otro"),
  phone: z.string().max(80).default(""),
  whatsapp: z.string().max(80).default(""),
  email: z.string().email().or(z.literal("")).default(""),
  address: z.string().max(260).default(""),
  emergencyContact: z.string().max(180).default(""),
  insuranceProvider: z.string().max(140).default(""),
  allergies: z.string().max(700).default(""),
  chronicConditions: z.string().max(700).default(""),
  lastVisit: z.string().default(""),
  nextAppointment: z.string().default(""),
  nextService: z.string().max(140).default(""),
  assignedDoctor: z.string().max(120).default(""),
  risk: z.enum(["bajo", "medio", "alto"]).default("bajo"),
  communication: z.object({ email: z.boolean(), whatsapp: z.boolean() }).default({ email: true, whatsapp: true }),
  pendingDocuments: z.array(z.string().min(1).max(100)).default([]),
  reports: z.array(reportSchema).default([]),
  instructions: z.array(instructionSchema).default([]),
  doctorApprovalRequired: z.boolean().default(true),
  notes: z.string().max(2000).default("")
});

function makeNestedId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const clinicId = url.searchParams.get("clinicId");
  if (clinicId && !canAccessClinic(auth.user, clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const state = getStateForAccess(auth.user);
  const patients = clinicId ? state.patients.filter((patient) => patient.clinicId === clinicId) : state.patients;
  return NextResponse.json({ patients });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = patientSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!canAccessClinic(auth.user, parsed.data.clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const patient = upsertPatient({
    ...parsed.data,
    reports: parsed.data.reports.map((report) => ({
      ...report,
      id: report.id ?? makeNestedId("patrep")
    })),
    instructions: parsed.data.instructions.map((instruction) => ({
      ...instruction,
      id: instruction.id ?? makeNestedId("patins")
    }))
  });

  return NextResponse.json({
    patient,
    state: getStateForAccess(auth.user)
  });
}
