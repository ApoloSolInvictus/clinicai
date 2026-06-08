import { NextResponse } from "next/server";
import { addEvent, getState, patchClinic } from "@/lib/data";

export async function POST() {
  const localNodeUrl = process.env.LOCAL_NODE_URL;
  const token = process.env.LOCAL_NODE_TOKEN;

  if (!localNodeUrl) {
    return NextResponse.json({ error: "LOCAL_NODE_URL no configurado" }, { status: 400 });
  }

  try {
    const response = await fetch(`${localNodeUrl.replace(/\/$/, "")}/sync/now`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
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
