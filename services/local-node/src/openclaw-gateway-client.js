import crypto from "node:crypto";
import WebSocket from "ws";

const PROTOCOL_VERSION = 4;

function httpToWsUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function waitForOpen(ws, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("OpenClaw WebSocket open timeout")), timeoutMs);
    ws.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function createRpc(ws, pending) {
  return function rpc(method, params, timeoutMs = 90_000) {
    const id = crypto.randomUUID();
    const payload = { type: "req", id, method, params };
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`OpenClaw ${method} timeout`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
    });
    ws.send(JSON.stringify(payload));
    return promise;
  };
}

export async function runGatewayPrompt({ gatewayUrl, token, clinicId, taskId, message }) {
  if (!token) {
    throw new Error("OPENCLAW_GATEWAY_TOKEN no esta configurado");
  }

  const pending = new Map();
  const ws = new WebSocket(httpToWsUrl(gatewayUrl), { maxPayload: 25 * 1024 * 1024 });
  const rpc = createRpc(ws, pending);
  let challengeNonce = null;

  ws.on("message", (raw) => {
    let frame;
    try {
      frame = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (frame?.type === "event" && frame.event === "connect.challenge") {
      challengeNonce = typeof frame.payload?.nonce === "string" ? frame.payload.nonce : null;
      return;
    }

    if (frame?.type === "res" && typeof frame.id === "string") {
      const handler = pending.get(frame.id);
      if (!handler) return;
      pending.delete(frame.id);
      clearTimeout(handler.timer);
      if (frame.ok) {
        handler.resolve(frame.payload);
      } else {
        handler.reject(new Error(frame.error?.message ?? `OpenClaw ${frame.id} failed`));
      }
    }
  });

  try {
    await waitForOpen(ws, 10_000);

    const challengeDeadline = Date.now() + 10_000;
    while (!challengeNonce && Date.now() < challengeDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!challengeNonce) {
      throw new Error("OpenClaw connect challenge timeout");
    }

    await rpc(
      "connect",
      {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: {
          id: "gateway-client",
          displayName: "Lux Aeterna Local Clinic Node",
          version: "0.1.0",
          platform: "linux",
          mode: "backend",
          instanceId: clinicId
        },
        caps: [],
        commands: [],
        role: "operator",
        scopes: ["operator.admin", "operator.read", "operator.write"],
        auth: { token }
      },
      20_000
    );

    const runId = taskId || crypto.randomUUID();
    const chat = await rpc(
      "chat.send",
      {
        sessionKey: `lux-aeterna:${clinicId}`,
        message,
        thinking: "off",
        suppressCommandInterpretation: true,
        idempotencyKey: runId
      },
      30_000
    );

    const wait = await rpc("agent.wait", { runId: chat?.runId ?? runId, timeoutMs: 120_000 }, 150_000);
    return { chat, wait };
  } finally {
    for (const handler of pending.values()) {
      clearTimeout(handler.timer);
      handler.reject(new Error("OpenClaw WebSocket closed"));
    }
    pending.clear();
    ws.close();
  }
}
