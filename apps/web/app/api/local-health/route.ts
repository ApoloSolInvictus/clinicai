import { NextResponse } from "next/server";

export const maxDuration = 10;

export async function GET() {
  const localNodeUrl = process.env.LOCAL_NODE_URL;
  const token = process.env.LOCAL_NODE_TOKEN;

  if (!localNodeUrl) {
    return NextResponse.json({
      ok: false,
      service: "lux-aeterna-central",
      note: "LOCAL_NODE_URL no esta configurado en este entorno."
    });
  }

  try {
    const response = await fetch(`${localNodeUrl.replace(/\/$/, "")}/health`, {
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    const payload = await response.json().catch(() => null);

    return NextResponse.json({
      ...(payload ?? {}),
      ok: response.ok && Boolean(payload?.ok),
      nodeUrl: localNodeUrl,
      reachable: response.ok
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      nodeUrl: localNodeUrl,
      reachable: false,
      error: error instanceof Error ? error.message : "No se pudo consultar el nodo local."
    });
  }
}
