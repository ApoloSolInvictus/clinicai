import { spawn } from "node:child_process";
import http from "node:http";

const port = Number(process.env.OPENCLAW_RUNNER_PORT ?? 18889);
const token = process.env.LOCAL_NODE_TOKEN ?? "";
const maxBodyBytes = 256 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBodyBytes) {
        reject(new Error("request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("invalid json body"));
      }
    });
    request.on("error", reject);
  });
}

function extractFinalText(payload) {
  return (
    payload?.meta?.finalAssistantVisibleText ??
    payload?.finalAssistantVisibleText ??
    payload?.result?.finalAssistantVisibleText ??
    payload?.payloads?.find((item) => typeof item?.text === "string")?.text ??
    payload?.message ??
    null
  );
}

function summarizeOpenClawPayload(payload) {
  const agentMeta = payload?.meta?.agentMeta ?? payload?.agentMeta ?? {};
  return {
    provider: agentMeta.provider ?? null,
    model: agentMeta.model ?? null,
    usage: agentMeta.usage ?? null,
    stopReason: payload?.meta?.stopReason ?? payload?.completion?.stopReason ?? null
  };
}

function parseOpenClawJson(stdout) {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("OpenClaw output did not contain JSON");
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function runOpenClaw({ sessionId, message }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "dist/index.js",
        "agent",
        "--local",
        "--session-id",
        sessionId,
        "--message",
        message,
        "--thinking",
        "off",
        "--json"
      ],
      {
        cwd: "/app",
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("OpenClaw runner timeout"));
    }, 360_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `OpenClaw exited with code ${code}`));
        return;
      }

      try {
        const payload = parseOpenClawJson(stdout);
        resolve({
          ok: true,
          sessionId,
          finalText: extractFinalText(payload),
          meta: summarizeOpenClawPayload(payload)
        });
      } catch (error) {
        reject(new Error(`OpenClaw returned non-JSON output: ${error.message}`));
      }
    });
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && (request.url === "/health" || request.url === "/healthz")) {
    sendJson(response, 200, { ok: true, service: "lux-aeterna-openclaw-runner" });
    return;
  }

  if (request.method !== "POST" || request.url !== "/run") {
    sendJson(response, 404, { error: "not found" });
    return;
  }

  const header = request.headers.authorization ?? "";
  if (token && header !== `Bearer ${token}`) {
    sendJson(response, 401, { error: "invalid token" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const sessionId = String(body.sessionId ?? "lux-aeterna-clinic");
    const message = String(body.message ?? "").trim();

    if (!message) {
      sendJson(response, 400, { error: "message is required" });
      return;
    }

    const result = await runOpenClaw({ sessionId, message });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "OpenClaw runner failed"
    });
  }
});

server.listen(port, () => {
  console.log(`Lux Aeterna OpenClaw runner listening on ${port}`);
});
