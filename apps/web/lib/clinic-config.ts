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
  nodeUrl: process.env.LOCAL_NODE_URL ?? "",
  token: process.env.LOCAL_NODE_TOKEN
};

function normalizeClinicConfig(id: string, value: RawClinicNodeConfig): ClinicNodeConfig | null {
  const nodeUrl = value.nodeUrl ?? "";
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

export function getClinicNodeConfigs() {
  const configured = parseClinicConfigJson();
  if (configured.length > 0) return configured;
  return fallbackClinic.nodeUrl ? [fallbackClinic] : [];
}

export function getClinicNodeConfig(clinicId: string) {
  return getClinicNodeConfigs().find((clinic) => clinic.id === clinicId) ?? null;
}

export function getConfiguredClinicIds() {
  return getClinicNodeConfigs().map((clinic) => clinic.id);
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
