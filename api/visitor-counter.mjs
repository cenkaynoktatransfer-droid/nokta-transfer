import { createHash } from "node:crypto";

const redisUrl =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_REST_API_URL ||
  "";
const redisToken =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_REST_API_TOKEN ||
  "";

const keyPrefix = process.env.VISITOR_COUNTER_KEY_PREFIX || "nokta-transfer";
const totalKey = `${keyPrefix}:visitor-total`;
const deviceKeyPrefix = `${keyPrefix}:visitor-device`;
const baseline = Number(process.env.VISITOR_COUNTER_BASELINE || 0);

const memoryStore = globalThis.__noktaVisitorCounter || {
  total: Number.isFinite(baseline) ? baseline : 0,
  devices: new Set()
};
globalThis.__noktaVisitorCounter = memoryStore;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16_384) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function hashDeviceId(deviceId) {
  return createHash("sha256")
    .update(String(deviceId || "").slice(0, 256))
    .digest("hex");
}

async function redisCommand(command) {
  const response = await fetch(`${redisUrl.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command])
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  const [result] = await response.json();
  if (result?.error) throw new Error(result.error);
  return result?.result;
}

async function countWithRedis(deviceHash) {
  if (Number.isFinite(baseline) && baseline > 0) {
    await redisCommand(["SET", totalKey, String(baseline), "NX"]);
  }

  const setResult = await redisCommand(["SET", `${deviceKeyPrefix}:${deviceHash}`, "1", "NX"]);
  const isNewDevice = setResult === "OK";
  const total = isNewDevice
    ? await redisCommand(["INCR", totalKey])
    : await redisCommand(["GET", totalKey]);

  return {
    total: Number(total || 0),
    isNewDevice,
    persistent: true
  };
}

function countWithMemory(deviceHash) {
  const isNewDevice = !memoryStore.devices.has(deviceHash);
  if (isNewDevice) {
    memoryStore.devices.add(deviceHash);
    memoryStore.total += 1;
  }

  return {
    total: memoryStore.total,
    isNewDevice,
    persistent: false
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const hasRedis = Boolean(redisUrl && redisToken);

    if (req.method === "GET") {
      if (hasRedis && Number.isFinite(baseline) && baseline > 0) {
        await redisCommand(["SET", totalKey, String(baseline), "NX"]);
      }

      const total = hasRedis ? Number((await redisCommand(["GET", totalKey])) || 0) : memoryStore.total;
      json(res, 200, {
        total,
        isNewDevice: false,
        persistent: hasRedis,
        countedBy: hasRedis ? "redis" : "memory"
      });
      return;
    }

    const body = await readBody(req);
    const payload = body ? JSON.parse(body) : {};
    const deviceHash = hashDeviceId(payload.deviceId || req.headers["user-agent"] || "anonymous");
    const result = hasRedis ? await countWithRedis(deviceHash) : countWithMemory(deviceHash);

    json(res, 200, {
      total: result.total,
      isNewDevice: result.isNewDevice,
      persistent: result.persistent,
      countedBy: hasRedis ? "redis" : "memory"
    });
  } catch (error) {
    json(res, 500, {
      error: "Sayaç şu anda güncellenemedi.",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}
