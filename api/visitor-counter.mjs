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
const baseline = Number(process.env.VISITOR_COUNTER_BASELINE || 0);

const memoryStore = globalThis.__noktaVisitorCounter || {
  total: Number.isFinite(baseline) ? baseline : 0
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

async function countWithRedis() {
  if (Number.isFinite(baseline) && baseline > 0) {
    await redisCommand(["SET", totalKey, String(baseline), "NX"]);
  }

  const total = await redisCommand(["INCR", totalKey]);

  return {
    total: Number(total || 0),
    persistent: true
  };
}

function countWithMemory() {
  memoryStore.total += 1;

  return {
    total: memoryStore.total,
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
        persistent: hasRedis,
        countedBy: hasRedis ? "redis" : "memory"
      });
      return;
    }

    await readBody(req);
    const result = hasRedis ? await countWithRedis() : countWithMemory();

    json(res, 200, {
      total: result.total,
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
