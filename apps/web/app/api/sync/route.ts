import { NextResponse } from "next/server";
import { getClinicNodeConfig, getLocalNodeUrlHint, isCloudRuntime, isLocalNodeUrl } from "@/lib/clinic-config";
import { addEvent, getState, patchClinic } from "@/lib/data";
import { canAccessClinic, firstAccessibleClinicId, requireAuthenticatedUser } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const clinicId = typeof body?.clinicId === "string" ? body.clinicId : firstAccessibleClinicId(auth.user);
  if (!canAccessClinic(auth.user, clinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const node = getClinicNodeConfig(clinicId);
  if (!node?.nodeUrl) {
    return NextResponse.json({ error: "La clinica no tiene nodo local configurado." }, { status: 400 });
  }

  if (isCloudRuntime() && isLocalNodeUrl(node.nodeUrl)) {
    return NextResponse.json(
      {
        error: "La API central no puede sincronizar contra una URL local .node desde Vercel.",
        nodeUrl: node.nodeUrl,
        hint: getLocalNodeUrlHint(node.nodeUrl)
      },
      { status: 502 }
    );
  }

  try {
    const response = await fetch(`${node.nodeUrl.replace(/\/$/, "")}/sync/now`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(node.token ? { authorization: `Bearer ${node.token}` } : {})
      },
      cache: "no-store"
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: 502 });
    }

    addEvent({
      clinicId: result.clinicId ?? "clinic-san-jose",
      type: "sync.completed",
      message: `Sincronizacion local recibida: ${result.events?.length ?? 0} eventos.`
    });
    patchClinic(result.clinicId ?? "clinic-san-jose", {
      status: "online",
      lastSync: new Date().toISOString()
    });

    return NextResponse.json({ state: getState(), result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo sincronizar" },
      { status: 502 }
    );
  }
}
