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
const ipSetKey = `${keyPrefix}:visitor-ips`;
const baseline = Number(process.env.VISITOR_COUNTER_BASELINE || 0);
const baselineOffset = Number.isFinite(baseline) && baseline > 0 ? baseline : 0;
const requirePersistentRedis = process.env.VISITOR_COUNTER_REQUIRE_REDIS === "1";
const allowMemoryFallback = !requirePersistentRedis && process.env.VISITOR_COUNTER_ALLOW_MEMORY !== "0";

const memoryStore = globalThis.__noktaVisitorCounter || {
  total: baselineOffset,
  ips: new Set()
};
if (!memoryStore.ips) memoryStore.ips = new Set();
if (!Number.isFinite(memoryStore.total)) memoryStore.total = baselineOffset;
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

function readHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeIp(value) {
  if (!value) return "";

  let ip = String(value).split(",")[0].trim();
  const forwardedMatch = ip.match(/for="?([^";,\s]+)"?/i);
  if (forwardedMatch) ip = forwardedMatch[1];

  ip = ip.replace(/^::ffff:/i, "").replace(/^"|"$/g, "");
  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  return ip.toLowerCase();
}

function getClientIp(req) {
  const headers = req.headers || {};
  const candidates = [
    headers["x-forwarded-for"],
    headers["x-vercel-forwarded-for"],
    headers["x-real-ip"],
    headers["cf-connecting-ip"],
    headers["true-client-ip"],
    headers["x-client-ip"],
    headers.forwarded,
    req.socket?.remoteAddress,
    req.connection?.remoteAddress
  ];

  for (const candidate of candidates) {
    const ip = normalizeIp(readHeaderValue(candidate));
    if (ip) return ip;
  }

  return "unknown-ip";
}

function hashClientIp(ip) {
  return createHash("sha256")
    .update(`ip:${String(ip || "unknown-ip").slice(0, 256)}`)
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
  const uniqueIpTotal = baselineOffset + Number((await redisCommand(["SCARD", ipSetKey])) || 0);
  return Math.max(storedTotal, uniqueIpTotal, baselineOffset);
}

async function countWithRedis(ipHash) {
  if (baselineOffset > 0) {
    await redisCommand(["SET", totalKey, String(baselineOffset), "NX"]);
  }

  const added = Number(await redisCommand(["SADD", ipSetKey, ipHash]));
  const isNewIp = added === 1;

  if (isNewIp) {
    const nextTotal = Number(await redisCommand(["INCR", totalKey]));
    const safeTotal = Math.max(nextTotal, await getRedisTotal());
    if (safeTotal !== nextTotal) {
      await redisCommand(["SET", totalKey, String(safeTotal)]);
    }
    return {
      total: safeTotal,
      isNewIp,
      persistent: true
    };
  }

  return {
    total: await getRedisTotal(),
    isNewIp,
    persistent: true
  };
}

function countWithMemory(ipHash) {
  const isNewIp = !memoryStore.ips.has(ipHash);
  if (isNewIp) {
    memoryStore.ips.add(ipHash);
    memoryStore.total += 1;
  }

  return {
    total: memoryStore.total,
    isNewIp,
    persistent: false
  };
}

function missingPersistentStore(res) {
  json(res, 503, {
    error: "Kalıcı ziyaretçi sayacı için Redis/KV bağlantısı gerekiyor.",
    setupRequired: true,
    total: null,
    isNewIp: false,
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
        isNewIp: false,
        persistent: hasRedis,
        countedBy: hasRedis ? "redis" : "memory"
      });
      return;
    }

    await readBody(req);
    const ipHash = hashClientIp(getClientIp(req));
    const result = hasRedis ? await countWithRedis(ipHash) : countWithMemory(ipHash);

    json(res, 200, {
      total: result.total,
      isNewIp: result.isNewIp,
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
