import type { Clinic } from "./data";

export type ClinicNodeConfig = {
  id: string;
  name: string;
  region: string;
  nodeUrl: string;
  token?: string;
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

function buildNodeUrlFromTemplate(clinicId: string) {
  const template = process.env.CLINIC_NODE_URL_TEMPLATE?.trim();
  if (!template) return "";

  const clinicSlug = toClinicSlug(clinicId);
  return normalizeNodeUrl(
    template
      .replaceAll("{clinicId}", clinicId)
      .replaceAll("{clinicSlug}", clinicSlug)
      .replaceAll("{clinic}", clinicSlug)
  );
}

function normalizeClinicConfig(id: string, value: RawClinicNodeConfig): ClinicNodeConfig | null {
  const nodeUrl = normalizeNodeUrl(value.nodeUrl ?? "") || buildNodeUrlFromTemplate(id);
  if (!nodeUrl) return null;

  return {
    id,
    name: value.name ?? id,
    region: value.region ?? "Costa Rica",
    nodeUrl,
    token: value.token ?? process.env.LOCAL_NODE_TOKEN
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
  const nodeUrl = buildNodeUrlFromTemplate(clinicId);
  if (!nodeUrl) return null;

  return {
    id: clinicId,
    name: clinicId,
    region: process.env.CLINIC_REGION ?? "Costa Rica",
    nodeUrl,
    token: process.env.LOCAL_NODE_TOKEN
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
