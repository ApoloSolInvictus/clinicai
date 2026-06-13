import { NextResponse } from "next/server";
import {
  getClinicNodeConfig,
  getLocalNodeUrlHint,
  isCloudRuntime,
  isLocalNodeUrl
} from "@/lib/clinic-config";
import { canAccessClinic, firstAccessibleClinicId, requireAuthenticatedUser } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const requestedClinicId = new URL(request.url).searchParams.get("clinicId") ?? firstAccessibleClinicId(auth.user);
  if (!canAccessClinic(auth.user, requestedClinicId)) {
    return NextResponse.json({ error: "No tienes acceso a esta clinica." }, { status: 403 });
  }

  const node = getClinicNodeConfig(requestedClinicId);
  const accessClientId = node?.accessClientId?.trim() ?? "";
  const accessClientSecret = node?.accessClientSecret?.trim() ?? "";

  return NextResponse.json({
    clinicId: requestedClinicId,
    nodeUrl: node?.nodeUrl ?? null,
    cloudRuntime: isCloudRuntime(),
    localNodeUrl: node?.nodeUrl ? isLocalNodeUrl(node.nodeUrl) : false,
    hasBaseDomain: Boolean((process.env.CLINIC_NODE_BASE_DOMAIN ?? process.env.OPENCLINIC_NODE_BASE_DOMAIN)?.trim()),
    hasPublicTemplate: Boolean(process.env.CLINIC_NODE_PUBLIC_URL_TEMPLATE?.trim()),
    hasUrlTemplate: Boolean(process.env.CLINIC_NODE_URL_TEMPLATE?.trim()),
    hasJsonConfig: Boolean(process.env.CLINIC_NODE_CONFIG_JSON?.trim()),
    hasCloudflareAccess: Boolean(accessClientId && accessClientSecret),
    cloudflareClientIdLooksValid: accessClientId.endsWith(".access"),
    hint: node?.nodeUrl ? getLocalNodeUrlHint(node.nodeUrl) : "No hay nodo configurado para esta clinica."
  });
}
