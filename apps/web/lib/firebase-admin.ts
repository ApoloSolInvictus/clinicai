import type { DecodedIdToken } from "firebase-admin/auth";
import { getConfiguredClinicIds } from "./clinic-config";

export type AuthenticatedUser = {
  uid: string;
  email: string | null;
  role: string;
  clinicIds: string[];
  allClinics: boolean;
};

export type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; status: number; error: string };

function envIsTrue(value: string | undefined) {
  return value === "true" || value === "1";
}

export function isFirebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

let firestoreSettingsApplied = false;

async function getAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin no esta configurado.");
  }

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");

  if (!getApps().length) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: getPrivateKey()
      })
    });
  }

  return getApps()[0];
}

async function getAdminAuth() {
  const [{ getAuth }, app] = await Promise.all([import("firebase-admin/auth"), getAdminApp()]);
  return getAuth(app);
}

export async function getAdminFirestore() {
  const [{ getFirestore }, app] = await Promise.all([import("firebase-admin/firestore"), getAdminApp()]);
  const firestore = getFirestore(app);
  if (!firestoreSettingsApplied) {
    firestore.settings({ ignoreUndefinedProperties: true });
    firestoreSettingsApplied = true;
  }
  return firestore;
}

function stringArrayFromClaim(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function userFromToken(decoded: DecodedIdToken): AuthenticatedUser {
  const role = typeof decoded.role === "string" ? decoded.role : "clinic-user";
  const allClinics = decoded.allClinics === true || role === "platform-admin" || role === "super-admin";
  const claimClinicIds = [
    ...stringArrayFromClaim(decoded.clinicIds),
    ...stringArrayFromClaim(decoded.clinics),
    ...stringArrayFromClaim(decoded.clinicId)
  ];
  const defaultClinicId = process.env.FIREBASE_DEFAULT_CLINIC_ID ?? "clinic-san-jose";
  const configuredClinicIds = getConfiguredClinicIds();
  const clinicIds = allClinics
    ? configuredClinicIds
    : Array.from(new Set(claimClinicIds.length > 0 ? claimClinicIds : [defaultClinicId]));

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    role,
    clinicIds,
    allClinics
  };
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthResult> {
  if (envIsTrue(process.env.FIREBASE_AUTH_DISABLED)) {
    return {
      ok: true,
      user: {
        uid: "local-dev",
        email: "local-dev@example.local",
        role: "platform-admin",
        clinicIds: getConfiguredClinicIds(),
        allClinics: true
      }
    };
  }

  if (!isFirebaseAdminConfigured()) {
    return { ok: false, status: 503, error: "Firebase Admin no esta configurado en el servidor." };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) {
    return { ok: false, status: 401, error: "Sesion requerida." };
  }

  try {
    const decoded = await (await getAdminAuth()).verifyIdToken(token);
    return { ok: true, user: userFromToken(decoded) };
  } catch {
    return { ok: false, status: 401, error: "Token de Firebase invalido." };
  }
}

export function canAccessClinic(user: AuthenticatedUser, clinicId: string) {
  return user.allClinics || user.clinicIds.includes(clinicId);
}

export function firstAccessibleClinicId(user: AuthenticatedUser) {
  return user.clinicIds[0] ?? process.env.FIREBASE_DEFAULT_CLINIC_ID ?? "clinic-san-jose";
}
