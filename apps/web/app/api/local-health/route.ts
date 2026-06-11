import { NextResponse } from "next/server";
import { getClinicNodeConfig, getClinicNodeRequestHeaders, getLocalNodeUrlHint, isCloudRuntime, isLocalNodeUrl } from "@/lib/clinic-config";
import { canAccessClinic, firstAccessibleClinicId, requireAuthenticatedUser } from "@/lib/firebase-admin";

export const maxDuration = 10;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const requestedClinicId = new URL(request.url).searchParams.get("clinicId") ?? firstAccessibleClinicId(auth.user);
  if (!canAccessClinic(auth.user, requestedClinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const node = getClinicNodeConfig(requestedClinicId);
  if (!node?.nodeUrl) {
    return NextResponse.json({
      ok: false,
      service: "lux-aeterna-central",
      clinicId: requestedClinicId,
      note: "La clinica no tiene nodo local configurado."
    });
  }

  if (isCloudRuntime() && isLocalNodeUrl(node.nodeUrl)) {
    return NextResponse.json({
      ok: false,
      clinicId: requestedClinicId,
      nodeUrl: node.nodeUrl,
      reachable: false,
      error: "La API esta corriendo fuera de la red local y no puede alcanzar el nodo .node/local.",
      hint: getLocalNodeUrlHint(node.nodeUrl)
    });
  }

  try {
    const response = await fetch(`${node.nodeUrl.replace(/\/$/, "")}/health`, {
      headers: getClinicNodeRequestHeaders(node),
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    const payload = await response.json().catch(() => null);

    return NextResponse.json({
      ...(payload ?? {}),
      ok: response.ok && Boolean(payload?.ok),
      nodeUrl: node.nodeUrl,
      reachable: response.ok
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      clinicId: requestedClinicId,
      nodeUrl: node.nodeUrl,
      reachable: false,
      error: error instanceof Error ? error.message : "No se pudo consultar el nodo local.",
      hint: getLocalNodeUrlHint(node.nodeUrl)
    });
  }
}
