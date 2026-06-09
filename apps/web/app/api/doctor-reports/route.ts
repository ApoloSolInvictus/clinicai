import { NextResponse } from "next/server";
import { z } from "zod";
import { approvePatientReport, getStateForAccess } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const approvalSchema = z.object({
  clinicId: z.string().min(1),
  patientId: z.string().min(1),
  reportId: z.string().min(1),
  doctorId: z.string().min(1),
  deliveryChannels: z.array(z.enum(["email", "whatsapp"])).default(["email"])
});

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = approvalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!canAccessClinic(auth.user, parsed.data.clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const approved = approvePatientReport(parsed.data);
  if (!approved) {
    return NextResponse.json({ error: "No se encontro el reporte, paciente o medico." }, { status: 404 });
  }

  return NextResponse.json({
    ...approved,
    state: getStateForAccess(auth.user)
  });
}
