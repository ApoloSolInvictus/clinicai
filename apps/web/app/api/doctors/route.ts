import { NextResponse } from "next/server";
import { z } from "zod";
import { getStateForAccess, hydrateState, persistState, replaceDoctorSchedules, upsertStaff } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const doctorSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  name: z.string().min(2).max(140),
  role: z.literal("medico").default("medico"),
  email: z.string().email().or(z.literal("")).default(""),
  phone: z.string().max(80).default(""),
  licenseNumber: z.string().max(80).default(""),
  specialty: z.string().min(1).max(140),
  status: z.enum(["activo", "pendiente", "suspendido"]).default("activo"),
  verifiedHoursMonth: z.coerce.number().min(0).default(0),
  defaultHonorarium: z.coerce.number().min(0).default(0),
  currency: z.string().min(1).max(8).default("USD"),
  paymentMethod: z.string().max(140).default("Transferencia bancaria"),
  serviceIds: z.array(z.string().min(1)).default([]),
  signatureLabel: z.string().max(180).default(""),
  reportApprovalEnabled: z.boolean().default(true),
  notes: z.string().max(1600).default("")
});

const scheduleSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  doctorId: z.string().optional().default(""),
  doctorName: z.string().optional().default(""),
  specialty: z.string().min(1).max(140),
  day: z.string().min(1).max(40),
  startsAt: z.string().min(1).max(20),
  endsAt: z.string().min(1).max(20),
  verifiedHours: z.coerce.number().min(0),
  appointments: z.coerce.number().min(0).default(0),
  status: z.enum(["verificado", "pendiente", "conflicto"]).default("pendiente")
});

const payloadSchema = z.object({
  doctor: doctorSchema,
  schedules: z.array(scheduleSchema).default([])
});

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const clinicId = url.searchParams.get("clinicId");
  if (clinicId && !canAccessClinic(auth.user, clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  await hydrateState();
  const state = getStateForAccess(auth.user);
  return NextResponse.json({
    doctors: state.staff.filter((member) => member.role === "medico" && (!clinicId || member.clinicId === clinicId)),
    schedules: state.schedules.filter((schedule) => !clinicId || schedule.clinicId === clinicId),
    serviceCatalog: state.serviceCatalog.filter((service) => !clinicId || service.clinicId === clinicId)
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!canAccessClinic(auth.user, parsed.data.doctor.clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  await hydrateState();
  const doctor = upsertStaff({
    ...parsed.data.doctor,
    signatureLabel:
      parsed.data.doctor.signatureLabel || `${parsed.data.doctor.name}${parsed.data.doctor.licenseNumber ? ` - ${parsed.data.doctor.licenseNumber}` : ""}`
  });

  const schedules = replaceDoctorSchedules(
    doctor.id,
    parsed.data.schedules.map((schedule) => ({
      ...schedule,
      clinicId: doctor.clinicId,
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: schedule.specialty || doctor.specialty
    }))
  );
  await persistState();

  return NextResponse.json({
    doctor,
    schedules,
    state: getStateForAccess(auth.user)
  });
}
