import { NextResponse } from "next/server";
import { z } from "zod";
import { getStateForAccess, hydrateState, persistState, upsertCashExpense, upsertCashTransaction, upsertPendingInvoice } from "@/lib/data";
import { canAccessClinic, requireAuthenticatedUser } from "@/lib/firebase-admin";

const methodSchema = z.enum(["efectivo", "tarjeta", "sinpe", "transferencia"]);

const paymentSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  appointmentId: z.string().optional(),
  patientId: z.string().optional(),
  patientName: z.string().min(1).max(140),
  serviceName: z.string().min(1).max(140),
  method: methodSchema,
  amount: z.coerce.number().min(0),
  currency: z.literal("CRC").default("CRC"),
  status: z.enum(["pendiente", "completado", "anulado"]).default("completado"),
  reference: z.string().max(120).default(""),
  receivedBy: z.string().min(1).max(120).default("Caja"),
  paidAt: z.string().min(1),
  notes: z.string().max(1200).default("")
});

const expenseSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  category: z.enum(["empresa", "medicos", "insumos", "servicios", "alquiler", "otros"]),
  description: z.string().min(1).max(180),
  amount: z.coerce.number().min(0),
  currency: z.literal("CRC").default("CRC"),
  method: methodSchema,
  status: z.enum(["pendiente", "pagado", "registrado"]).default("registrado"),
  vendor: z.string().max(140).default(""),
  paidAt: z.string().min(1),
  notes: z.string().max(1200).default("")
});

const invoiceSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  appointmentId: z.string().optional(),
  patientId: z.string().optional(),
  patientName: z.string().min(1).max(140),
  concept: z.string().min(1).max(180),
  amount: z.coerce.number().min(0),
  currency: z.literal("CRC").default("CRC"),
  dueDate: z.string().min(1),
  status: z.enum(["pendiente", "pagada", "vencida"]).default("pendiente"),
  notes: z.string().max(1200).default("")
});

const payloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("payment"), payment: paymentSchema }),
  z.object({ type: z.literal("expense"), expense: expenseSchema }),
  z.object({ type: z.literal("invoice"), invoice: invoiceSchema })
]);

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
    cashRegisters: clinicId ? state.cashRegisters.filter((item) => item.clinicId === clinicId) : state.cashRegisters,
    cashTransactions: clinicId ? state.cashTransactions.filter((item) => item.clinicId === clinicId) : state.cashTransactions,
    cashExpenses: clinicId ? state.cashExpenses.filter((item) => item.clinicId === clinicId) : state.cashExpenses,
    pendingInvoices: clinicId ? state.pendingInvoices.filter((item) => item.clinicId === clinicId) : state.pendingInvoices
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

  const clinicId =
    parsed.data.type === "payment"
      ? parsed.data.payment.clinicId
      : parsed.data.type === "expense"
        ? parsed.data.expense.clinicId
        : parsed.data.invoice.clinicId;

  if (!canAccessClinic(auth.user, clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  await hydrateState();
  const record =
    parsed.data.type === "payment"
      ? upsertCashTransaction(parsed.data.payment)
      : parsed.data.type === "expense"
        ? upsertCashExpense(parsed.data.expense)
        : upsertPendingInvoice(parsed.data.invoice);
  await persistState();

  return NextResponse.json({
    record,
    state: getStateForAccess(auth.user)
  });
}
