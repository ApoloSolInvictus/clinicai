"use client";

import { useEffect, useState } from "react";
import {
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "./firebase-client";

export type FirebaseUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  clinicIds: string[];
  allClinics: boolean;
};

function stringArrayFromClaim(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function envIsTrue(value: string | undefined) {
  return value === "true" || value === "1";
}

const localDevProfile: FirebaseUserProfile = {
  uid: "local-dev",
  email: "local-dev@example.local",
  displayName: "Local Dev",
  role: "platform-admin",
  clinicIds: ["clinic-san-jose"],
  allClinics: true
};

const localDevUser = {
  uid: localDevProfile.uid,
  email: localDevProfile.email,
  displayName: localDevProfile.displayName,
  getIdToken: async () => "local-dev"
} as unknown as User;

async function profileFromUser(user: User): Promise<FirebaseUserProfile> {
  const token = await getIdTokenResult(user);
  const role = typeof token.claims.role === "string" ? token.claims.role : "clinic-user";
  const allClinics = token.claims.allClinics === true || role === "platform-admin" || role === "super-admin";
  const clinicIds = Array.from(
    new Set([
      ...stringArrayFromClaim(token.claims.clinicIds),
      ...stringArrayFromClaim(token.claims.clinics),
      ...stringArrayFromClaim(token.claims.clinicId)
    ])
  );

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role,
    clinicIds,
    allClinics
  };
}

export function useFirebaseSession() {
  const authDisabled = envIsTrue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DISABLED);
  const configured = authDisabled || isFirebaseClientConfigured();
  const [loading, setLoading] = useState(!authDisabled);
  const [user, setUser] = useState<User | null>(authDisabled ? localDevUser : null);
  const [profile, setProfile] = useState<FirebaseUserProfile | null>(authDisabled ? localDevProfile : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authDisabled) {
      setLoading(false);
      setUser(localDevUser);
      setProfile(localDevProfile);
      return undefined;
    }

    const auth = getFirebaseClientAuth();
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setError(null);
      setUser(nextUser);
      setProfile(nextUser ? await profileFromUser(nextUser) : null);
      setLoading(false);
    });
  }, [authDisabled]);

  async function login(email: string, password: string) {
    if (authDisabled) return;
    const auth = getFirebaseClientAuth();
    if (!auth) throw new Error("Firebase no esta configurado.");
    setError(null);
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    if (authDisabled) return;
    const auth = getFirebaseClientAuth();
    if (!auth) return;
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    if (authDisabled) return;
    const auth = getFirebaseClientAuth();
    if (!auth) throw new Error("Firebase no esta configurado.");
    await sendPasswordResetEmail(auth, email);
  }

  async function getAuthHeaders(): Promise<Record<string, string>> {
    if (authDisabled) return {};
    if (!user) throw new Error("Sesion requerida.");
    const token = await user.getIdToken();
    return { authorization: `Bearer ${token}` };
  }

  return {
    configured,
    loading,
    user,
    profile,
    error,
    login,
    logout,
    resetPassword,
    getAuthHeaders
  };
}
