import { NextResponse } from "next/server";
import { getStateForAccess } from "@/lib/data";
import { requireAuthenticatedUser } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json(getStateForAccess(auth.user));
}
