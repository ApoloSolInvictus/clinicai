import { NextResponse } from "next/server";
import { z } from "zod";
import { getStateForAccess, upsertAppointment } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const channelSchema = z.enum(["email", "whatsapp"]);

const appointmentSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  patientId: z.string().min(1),
  patientName: z.string().min(1).max(140),
  doctorId: z.string().min(1),
  doctorName: z.string().min(1).max(120),
  serviceId: z.string().min(1),
  serviceName: z.string().min(1).max(140),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  price: z.coerce.number().min(0),
  currency: z.string().min(1).max(8).default("USD"),
  doctorHonorarium: z.coerce.number().min(0),
  status: z.enum(["solicitada", "confirmada", "en-consulta", "completada", "cancelada"]).default("solicitada"),
  paymentStatus: z.enum(["pendiente", "pagado", "facturado"]).default("pendiente"),
  reminderChannels: z.array(channelSchema).default(["email", "whatsapp"]),
  reminderStatus: z.enum(["pendiente", "programado", "enviado", "fallo"]).default("pendiente"),
  reportDeliveryStatus: z.enum(["pendiente", "aprobacion-medica", "listo-envio", "enviado"]).default("pendiente"),
  createdBy: z.string().min(1).max(120).default("Call Center"),
  notes: z.string().max(1600).default("")
});

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const clinicId = url.searchParams.get("clinicId");
  if (clinicId && !canAccessClinic(auth.user, clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const state = getStateForAccess(auth.user);
  return NextResponse.json({
    appointments: clinicId ? state.appointments.filter((appointment) => appointment.clinicId === clinicId) : state.appointments,
    serviceCatalog: clinicId ? state.serviceCatalog.filter((service) => service.clinicId === clinicId) : state.serviceCatalog
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = appointmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!canAccessClinic(auth.user, parsed.data.clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const { appointment, conflicts } = upsertAppointment(parsed.data);

  return NextResponse.json({
    appointment,
    conflicts,
    state: getStateForAccess(auth.user)
  });
}
