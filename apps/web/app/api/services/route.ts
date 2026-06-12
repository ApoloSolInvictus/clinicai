import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteService, getStateForAccess, hydrateState, persistState, upsertService } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const serviceSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  name: z.string().min(2).max(140),
  specialty: z.string().min(1).max(140),
  durationMinutes: z.coerce.number().int().min(5).max(1440),
  price: z.coerce.number().min(0),
  ivaRate: z.coerce.number().min(0).max(100).default(0),
  currency: z.literal("CRC").default("CRC"),
  doctorHonorarium: z.coerce.number().min(0),
  preparationInstructions: z.string().max(1600).default(""),
  requiresReportApproval: z.boolean().default(true)
});

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const clinicId = new URL(request.url).searchParams.get("clinicId");
  if (clinicId && !canAccessClinic(auth.user, clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  await hydrateState();
  const state = getStateForAccess(auth.user);
  return NextResponse.json({
    services: clinicId ? state.serviceCatalog.filter((service) => service.clinicId === clinicId) : state.serviceCatalog
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = serviceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido", issues: parsed.error.flatten() }, { status: 400 });
  }
  if (!canAccessClinic(auth.user, parsed.data.clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  await hydrateState();
  const service = upsertService(parsed.data);
  await persistState();

  return NextResponse.json({
    service,
    state: getStateForAccess(auth.user)
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const clinicId = url.searchParams.get("clinicId") ?? "";
  const serviceId = url.searchParams.get("serviceId") ?? "";
  if (!clinicId || !serviceId) {
    return NextResponse.json({ error: "clinicId y serviceId son requeridos." }, { status: 400 });
  }
  if (!canAccessClinic(auth.user, clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  await hydrateState();
  const service = deleteService(clinicId, serviceId);
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado." }, { status: 404 });
  }
  await persistState();

  return NextResponse.json({
    service,
    deleted: true,
    state: getStateForAccess(auth.user)
  });
}
