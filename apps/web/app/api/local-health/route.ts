import { NextResponse } from "next/server";
import { getClinicNodeConfig, getClinicNodeRequestHeaders, getLocalNodeUrlHint, isCloudRuntime, isLocalNodeUrl } from "@/lib/clinic-config";
import { canAccessClinic, firstAccessibleClinicId, requireAuthenticatedUser } from "@/lib/firebase-admin";

export const maxDuration = 10;

function envIsTrue(value: string | undefined) {
  return value === "true" || value === "1";
}

function envIsFalse(value: string | undefined) {
  return value === "false" || value === "0";
}

function shouldUseCentralQueueMode() {
  const configured = process.env.LOCAL_NODE_TASK_FORWARDING_ENABLED;
  if (envIsTrue(configured)) return false;
  if (envIsFalse(configured)) return true;

  return isCloudRuntime();
}

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
    const accessClientId = node.accessClientId?.trim() ?? "";
    const accessClientSecret = node.accessClientSecret?.trim() ?? "";
    const expectedAccessAudience = node.accessAudience?.trim() ?? "";
    const accessConfigured = Boolean(accessClientId && accessClientSecret);
    const centralQueueMode = shouldUseCentralQueueMode();
    const response = await fetch(`${node.nodeUrl.replace(/\/$/, "")}/health`, {
      headers: getClinicNodeRequestHeaders(node),
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = await response.text();
    let payload: Record<string, unknown> | null = null;
    if (contentType.includes("application/json") && rawBody) {
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const accessBlocked = response.status === 401 || response.status === 403;
      const actualAccessAudience = response.headers.get("cf-access-aud");
      const accessAudienceMatches = expectedAccessAudience
        ? actualAccessAudience === expectedAccessAudience
        : null;
      return NextResponse.json({
        ...(payload ?? {}),
        ok: false,
        operational: centralQueueMode,
        queueMode: centralQueueMode,
        queueStatus: centralQueueMode ? "central-pull-ready" : undefined,
        clinicId: requestedClinicId,
        clinic: { id: requestedClinicId, name: node.name },
        nodeUrl: node.nodeUrl,
        reachable: false,
        upstreamStatus: response.status,
        upstreamContentType: contentType || null,
        cloudflareAccessConfigured: accessConfigured,
        cloudflareClientIdLooksValid: accessClientId.endsWith(".access"),
        cloudflareAccessAudience: actualAccessAudience,
        cloudflareAccessAudienceExpected: expectedAccessAudience || null,
        cloudflareAccessAudienceMatches: accessAudienceMatches,
        error: accessBlocked
          ? `Cloudflare Access rechazo la solicitud con HTTP ${response.status}.`
          : `El nodo respondio HTTP ${response.status}.`,
        warning: centralQueueMode
          ? "El ping directo al nodo fue bloqueado, pero OpenClaw esta configurado para trabajar por cola central pull."
          : undefined,
        hint: accessBlocked
          ? accessAudienceMatches === false
            ? "Cloudflare esta devolviendo un AUD distinto al esperado. Revisa que el hostname del nodo este protegido por la aplicacion Access correcta y que no exista otra app wildcard/exacta capturando el subdominio."
            : accessConfigured
            ? "Vercel tiene credenciales configuradas, pero Cloudflare no acepta este Service Token. Revisa que la aplicacion Access incluya este token exacto en una politica con accion Service Auth."
            : "Vercel no tiene disponibles ambas credenciales de Cloudflare Access en este deployment."
          : getLocalNodeUrlHint(node.nodeUrl)
      });
    }

    return NextResponse.json({
      ...(payload ?? {}),
      ok: response.ok && Boolean(payload?.ok),
      nodeUrl: node.nodeUrl,
      reachable: response.ok,
      cloudflareAccessConfigured: accessConfigured,
      cloudflareClientIdLooksValid: accessClientId.endsWith(".access"),
      cloudflareAccessAudienceExpected: expectedAccessAudience || null
    });
  } catch (error) {
    const centralQueueMode = shouldUseCentralQueueMode();
    return NextResponse.json({
      ok: false,
      operational: centralQueueMode,
      queueMode: centralQueueMode,
      queueStatus: centralQueueMode ? "central-pull-ready" : undefined,
      clinicId: requestedClinicId,
      clinic: { id: requestedClinicId, name: node.name },
      nodeUrl: node.nodeUrl,
      reachable: false,
      warning: centralQueueMode
        ? "No se pudo hacer ping directo al nodo, pero OpenClaw esta configurado para trabajar por cola central pull."
        : undefined,
      error: error instanceof Error ? error.message : "No se pudo consultar el nodo local.",
      hint: getLocalNodeUrlHint(node.nodeUrl)
    });
  }
}
