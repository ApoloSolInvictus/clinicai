import type { Clinic } from "./data";

export type ClinicNodeConfig = {
  id: string;
  name: string;
  region: string;
  nodeUrl: string;
  token?: string;
  accessClientId?: string;
  accessClientSecret?: string;
  accessAudience?: string;
};

type RawClinicNodeConfig = Partial<Omit<ClinicNodeConfig, "id">> & {
  id?: string;
};

const fallbackClinic: ClinicNodeConfig = {
  id: process.env.FIREBASE_DEFAULT_CLINIC_ID ?? "clinic-san-jose",
  name: process.env.CLINIC_NAME ?? "Clinica San Jose",
  region: process.env.CLINIC_REGION ?? "Costa Rica",
  nodeUrl: normalizeNodeUrl(process.env.LOCAL_NODE_URL ?? ""),
  token: process.env.LOCAL_NODE_TOKEN
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getConfiguredClinicIdList() {
  return unique(
    (process.env.CLINIC_NODE_IDS ?? process.env.CLINIC_IDS ?? "")
      .split(",")
      .map((item) => item.trim())
  );
}

function hasUrlScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function toClinicSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferNodeUrlScheme(value: string) {
  const authority = value.split(/[/?#]/, 1)[0] ?? "";
  const host = authority.replace(/^\[/, "").split("]")[0].split(":")[0];

  if (/^(localhost|127\.|0\.0\.0\.0|::1)$/i.test(host)) return "http";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return "http";
  if (/:\d+$/.test(authority)) return "http";

  return "https";
}

export function normalizeNodeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const rawUrl = hasUrlScheme(trimmed) ? trimmed : `${inferNodeUrlScheme(trimmed)}://${trimmed}`;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";

    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function isLocalNodeUrl(nodeUrl: string) {
  try {
    const url = new URL(nodeUrl);
    return url.hostname.endsWith(".node") || url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function isCloudRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.NETLIFY || process.env.CF_PAGES);
}

export function getLocalNodeUrlHint(nodeUrl: string) {
  try {
    const url = new URL(nodeUrl);
    if (url.protocol === "https:" && url.hostname.endsWith(".node") && !url.port) {
      return "La URL usa HTTPS en puerto 443. En desarrollo local usa http://clinic-san-jose.node:8787; en Vercel/produccion configura CLINIC_NODE_PUBLIC_URL_TEMPLATE con un tunel o reverse proxy HTTPS que reenvie al nodo local.";
    }
    if (url.protocol === "http:" && url.hostname.endsWith(".node")) {
      return "Esta URL .node es de desarrollo/local. Si la API corre en Vercel o en otro servidor, configura CLINIC_NODE_PUBLIC_URL_TEMPLATE con un dominio publico HTTPS que reenvie al nodo de cada clinica.";
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function buildNodeUrlFromTemplate(clinicId: string) {
  const template = process.env.CLINIC_NODE_URL_TEMPLATE?.trim();
  if (!template) return "";

  return buildNodeUrlFromRawTemplate(clinicId, template);
}

function buildNodeUrlFromPublicTemplate(clinicId: string) {
  const template = process.env.CLINIC_NODE_PUBLIC_URL_TEMPLATE?.trim();
  if (template) return buildNodeUrlFromRawTemplate(clinicId, template);

  const baseDomain = normalizeNodeBaseDomain(process.env.CLINIC_NODE_BASE_DOMAIN ?? process.env.OPENCLINIC_NODE_BASE_DOMAIN ?? "");
  if (!baseDomain) return "";

  return buildNodeUrlFromRawTemplate(clinicId, `https://{clinicSlug}.${baseDomain}`);
}

function normalizeNodeBaseDomain(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const rawUrl = hasUrlScheme(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(rawUrl);
    return url.hostname.replace(/^\*\./, "");
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/^\*\./, "");
  }
}

function buildNodeUrlFromRawTemplate(clinicId: string, template: string) {
  const clinicSlug = toClinicSlug(clinicId);
  return normalizeNodeUrl(
    template
      .replaceAll("{clinicId}", clinicId)
      .replaceAll("{clinicSlug}", clinicSlug)
      .replaceAll("{clinic}", clinicSlug)
  );
}

function normalizeClinicConfig(id: string, value: RawClinicNodeConfig): ClinicNodeConfig | null {
  const nodeUrl = buildNodeUrlFromPublicTemplate(id) || normalizeNodeUrl(value.nodeUrl ?? "") || buildNodeUrlFromTemplate(id);
  if (!nodeUrl) return null;

  return {
    id,
    name: value.name ?? id,
    region: value.region ?? "Costa Rica",
    nodeUrl,
    token: value.token ?? process.env.LOCAL_NODE_TOKEN,
    accessClientId: value.accessClientId ?? process.env.CLOUDFLARE_ACCESS_CLIENT_ID,
    accessClientSecret: value.accessClientSecret ?? process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET,
    accessAudience: value.accessAudience ?? process.env.CLOUDFLARE_ACCESS_AUDIENCE
  };
}

function parseClinicConfigJson() {
  const raw = process.env.CLINIC_NODE_CONFIG_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Record<string, RawClinicNodeConfig> | RawClinicNodeConfig[];
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (item.id ? normalizeClinicConfig(item.id, item) : null))
        .filter((item): item is ClinicNodeConfig => Boolean(item));
    }

    return Object.entries(parsed)
      .map(([id, value]) => normalizeClinicConfig(id, value))
      .filter((item): item is ClinicNodeConfig => Boolean(item));
  } catch {
    return [];
  }
}

function getTemplateClinicConfig(clinicId: string): ClinicNodeConfig | null {
  const nodeUrl = buildNodeUrlFromPublicTemplate(clinicId) || buildNodeUrlFromTemplate(clinicId);
  if (!nodeUrl) return null;

  return {
    id: clinicId,
    name: clinicId,
    region: process.env.CLINIC_REGION ?? "Costa Rica",
    nodeUrl,
    token: process.env.LOCAL_NODE_TOKEN,
    accessClientId: process.env.CLOUDFLARE_ACCESS_CLIENT_ID,
    accessClientSecret: process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET,
    accessAudience: process.env.CLOUDFLARE_ACCESS_AUDIENCE
  };
}

export function getClinicNodeRequestHeaders(node: Pick<ClinicNodeConfig, "token" | "accessClientId" | "accessClientSecret">) {
  const token = node.token?.trim();
  const accessClientId = node.accessClientId?.trim();
  const accessClientSecret = node.accessClientSecret?.trim();

  return {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(accessClientId && accessClientSecret
      ? {
          "CF-Access-Client-Id": accessClientId,
          "CF-Access-Client-Secret": accessClientSecret
        }
      : {})
  };
}

export function getClinicNodeConfigs() {
  const configured = parseClinicConfigJson();
  const configuredIds = new Set(configured.map((clinic) => clinic.id));
  const templateClinics = getConfiguredClinicIdList()
    .filter((clinicId) => !configuredIds.has(clinicId))
    .map((clinicId) => getTemplateClinicConfig(clinicId))
    .filter((clinic): clinic is ClinicNodeConfig => Boolean(clinic));
  const clinics = [...configured, ...templateClinics];

  if (clinics.length > 0) return clinics;

  const defaultTemplateClinic = getTemplateClinicConfig(fallbackClinic.id);
  if (defaultTemplateClinic) return [defaultTemplateClinic];

  return fallbackClinic.nodeUrl ? [fallbackClinic] : [];
}

export function getClinicNodeConfig(clinicId: string) {
  return getClinicNodeConfigs().find((clinic) => clinic.id === clinicId) ?? getTemplateClinicConfig(clinicId);
}

export function getConfiguredClinicIds() {
  return unique([...getClinicNodeConfigs().map((clinic) => clinic.id), ...getConfiguredClinicIdList()]);
}

export function getPublicClinic(clinicId: string): Clinic | null {
  const clinic = getClinicNodeConfig(clinicId);
  if (!clinic) return null;

  return {
    id: clinic.id,
    name: clinic.name,
    region: clinic.region,
    nodeUrl: clinic.nodeUrl || "pending-docker-node",
    status: clinic.nodeUrl ? "degraded" : "offline",
    lastSync: new Date().toISOString()
  };
}

export function getPublicClinics(): Clinic[] {
  const configured = getClinicNodeConfigs();
  const clinics = configured.length > 0 ? configured : [fallbackClinic];

  return clinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    region: clinic.region,
    nodeUrl: clinic.nodeUrl || "pending-docker-node",
    status: clinic.nodeUrl ? "degraded" : "offline",
    lastSync: new Date().toISOString()
  }));
}
