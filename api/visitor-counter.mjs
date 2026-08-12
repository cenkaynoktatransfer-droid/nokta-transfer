import { createHash } from "node:crypto";

const redisUrl =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_REST_API_URL ||
  process.env.REDIS_REST_URL ||
  "";
const redisToken =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_REST_API_TOKEN ||
  process.env.REDIS_REST_TOKEN ||
  "";

const keyPrefix = process.env.VISITOR_COUNTER_KEY_PREFIX || "nokta-transfer";
const totalKey = `${keyPrefix}:visitor-total`;
const devicesSetKey = `${keyPrefix}:visitor-devices`;
const baseline = Number(process.env.VISITOR_COUNTER_BASELINE || 0);
const baselineOffset = Number.isFinite(baseline) && baseline > 0 ? baseline : 0;
const isVercelRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const allowMemoryFallback =
  process.env.VISITOR_COUNTER_ALLOW_MEMORY === "1" ||
  (!isVercelRuntime && process.env.NODE_ENV !== "production");

const memoryStore = globalThis.__noktaVisitorCounter || {
  total: baselineOffset,
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

function hasPersistentRedis() {
  return Boolean(redisUrl && redisToken && /^https?:\/\//i.test(redisUrl));
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

async function getRedisTotal() {
  const storedTotal = Number((await redisCommand(["GET", totalKey])) || 0);
  const uniqueDeviceTotal = baselineOffset + Number((await redisCommand(["SCARD", devicesSetKey])) || 0);
  return Math.max(storedTotal, uniqueDeviceTotal, baselineOffset);
}

async function countWithRedis(deviceHash) {
  if (baselineOffset > 0) {
    await redisCommand(["SET", totalKey, String(baselineOffset), "NX"]);
  }

  const added = Number(await redisCommand(["SADD", devicesSetKey, deviceHash]));
  const isNewDevice = added === 1;

  if (isNewDevice) {
    const nextTotal = Number(await redisCommand(["INCR", totalKey]));
    const safeTotal = Math.max(nextTotal, await getRedisTotal());
    if (safeTotal !== nextTotal) {
      await redisCommand(["SET", totalKey, String(safeTotal)]);
    }
    return {
      total: safeTotal,
      isNewDevice,
      persistent: true
    };
  }

  return {
    total: await getRedisTotal(),
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

function missingPersistentStore(res) {
  json(res, 503, {
    error: "Kalıcı ziyaretçi sayacı için Redis/KV bağlantısı gerekiyor.",
    setupRequired: true,
    total: null,
    isNewDevice: false,
    persistent: false,
    countedBy: "none"
  });
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
    const hasRedis = hasPersistentRedis();

    if (!hasRedis && !allowMemoryFallback) {
      missingPersistentStore(res);
      return;
    }

    if (req.method === "GET") {
      const total = hasRedis ? await getRedisTotal() : memoryStore.total;
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
