import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tollRates = JSON.parse(readFileSync(join(__dirname, "..", "data", "toll-rates.json"), "utf8"));
const kgmBaseUrl = "https://vatandas.kgm.gov.tr";

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function parseCoordinate(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function moneyToTry(price) {
  if (!price || price.currencyCode !== "TRY") return 0;

  const units = Number(price.units || 0);
  const nanos = Number(price.nanos || 0);
  return units + nanos / 1_000_000_000;
}

function getGoogleErrorReason(error) {
  const message = String(error?.message || "").toLowerCase();
  const status = String(error?.status || "").toLowerCase();

  if (message.includes("billing") || status.includes("billing")) return "billing_not_active";
  if (message.includes("not been used") || message.includes("disabled")) return "routes_api_not_enabled";
  if (message.includes("api key not valid") || message.includes("invalid api key")) return "invalid_api_key";
  if (message.includes("referer") || message.includes("referrer") || message.includes("ip address")) return "api_key_restricted";
  if (message.includes("permission") || status.includes("permission")) return "api_key_permission_denied";

  return "routes_api_error";
}

function isInBox(point, box) {
  return point.lat >= box.minLat && point.lat <= box.maxLat && point.lng >= box.minLng && point.lng <= box.maxLng;
}

function hasPair(origin, destination, firstBox, secondBox) {
  return (isInBox(origin, firstBox) && isInBox(destination, secondBox)) || (isInBox(origin, secondBox) && isInBox(destination, firstBox));
}

function normalizeDecimal(value) {
  return Number(String(value || "").replace(".", "").replace(",", "."));
}

function extractCookies(headers) {
  const getSetCookie = typeof headers.getSetCookie === "function" ? headers.getSetCookie.bind(headers) : null;
  const cookies = getSetCookie ? getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
  return cookies
    .flatMap((cookie) => String(cookie).split(/,(?=\s*[^;,\s]+=)/))
    .map((cookie) => cookie.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function getMonthlyTariffToll(origin, destination) {
  const route = tollRates.routes.find((item) => hasPair(origin, destination, item.boxes[0], item.boxes[1]));

  if (!route?.fee) return null;

  return {
    fee: route.fee,
    label: route.label,
    updatedAt: tollRates.updatedAt,
    nextReviewAt: tollRates.nextReviewAt,
    sourceNote: tollRates.sourceNote
  };
}

function getOfficialKgmRoute(origin, destination) {
  const izmirMetro = { minLat: 38.15, maxLat: 38.75, minLng: 26.55, maxLng: 27.65 };
  const cesme = { minLat: 38.15, maxLat: 38.55, minLng: 26.15, maxLng: 26.75 };
  const aydin = { minLat: 37.45, maxLat: 38.25, minLng: 27.45, maxLng: 28.45 };

  const routes = [
    {
      boxes: [izmirMetro, cesme],
      highwayId: "60",
      entrance: "URLA",
      exit: "ÇEŞME",
      label: "KGM canli ucret sorgusu: Izmir - Cesme otoyolu"
    },
    {
      boxes: [izmirMetro, aydin],
      highwayId: "50",
      entrance: "IŞIKKENT",
      exit: "AYDIN BATI",
      label: "KGM canli ucret sorgusu: Izmir - Aydin otoyolu"
    }
  ];

  return routes.find((route) => hasPair(origin, destination, route.boxes[0], route.boxes[1])) || null;
}

async function fetchOfficialKgmToll(route) {
  const pageResponse = await fetch(kgmBaseUrl, { headers: { "user-agent": "NoktaTransfer/1.0" } });
  const pageHtml = await pageResponse.text();
  const token = pageHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/)?.[1];
  const cookie = extractCookies(pageResponse.headers);

  if (!token || !cookie) return null;

  const body = new URLSearchParams({
    HighwayId: route.highwayId,
    EntranceTollId: route.entrance,
    ExitTollId: route.exit,
    SinifId: tollRates.vehicleClass || "1",
    __RequestVerificationToken: token
  });

  const tollResponse = await fetch(kgmBaseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie,
      "user-agent": "NoktaTransfer/1.0"
    },
    body
  });

  const html = await tollResponse.text();
  const feeMatch = html.match(/([0-9]+(?:[.,][0-9]+)?)\s*TL/i);
  const distanceMatch = html.match(/mesafe\s+([0-9]+(?:[.,][0-9]+)?)\s*km/i);
  const fee = normalizeDecimal(feeMatch?.[1]);

  if (!Number.isFinite(fee) || fee <= 0) return null;

  return {
    fee,
    label: route.label,
    sourceDistanceKm: Number.isFinite(normalizeDecimal(distanceMatch?.[1])) ? normalizeDecimal(distanceMatch?.[1]) : null
  };
}

export default async function handler(request, response) {
  response.setHeader("access-control-allow-methods", "POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, reason: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    sendJson(response, 200, { ok: false, reason: "missing_api_key" });
    return;
  }

  try {
    const payload = JSON.parse(await readBody(request));
    const origin = parseCoordinate(payload.origin);
    const destination = parseCoordinate(payload.destination);

    if (!origin || !destination) {
      sendJson(response, 400, { ok: false, reason: "invalid_coordinates" });
      return;
    }

    const googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-fieldmask": "routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo"
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng
            }
          }
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        extraComputations: ["TOLLS"],
        routeModifiers: {
          avoidTolls: false,
          vehicleInfo: {
            emissionType: "GASOLINE"
          }
        },
        languageCode: "tr-TR",
        units: "METRIC"
      })
    });

    const data = await googleResponse.json().catch(() => ({}));
    if (!googleResponse.ok) {
      const error = data.error || {};
      sendJson(response, 200, {
        ok: false,
        reason: getGoogleErrorReason(error),
        status: googleResponse.status,
        googleStatus: error.status || null,
        googleMessage: error.message || "Google Routes API isteği reddedildi."
      });
      return;
    }

    const route = data.routes?.[0];
    const prices = route?.travelAdvisory?.tollInfo?.estimatedPrice || [];
    const tollFee = prices.reduce((total, price) => total + moneyToTry(price), 0);
    const distanceKm = route?.distanceMeters ? route.distanceMeters / 1000 : null;

    if (!tollFee) {
      const officialKgmRoute = getOfficialKgmRoute(origin, destination);
      const officialKgmToll = officialKgmRoute ? await fetchOfficialKgmToll(officialKgmRoute).catch(() => null) : null;

      if (officialKgmToll?.fee) {
        sendJson(response, 200, {
          ok: true,
          tollFee: Math.round(officialKgmToll.fee),
          currency: "TRY",
          source: "kgm-live",
          label: officialKgmToll.label,
          sourceDistanceKm: officialKgmToll.sourceDistanceKm,
          distanceKm,
          duration: route?.duration || null
        });
        return;
      }

      const monthlyTariff = getMonthlyTariffToll(origin, destination);
      if (monthlyTariff?.fee) {
        sendJson(response, 200, {
          ok: true,
          tollFee: Math.round(monthlyTariff.fee),
          currency: "TRY",
          source: "monthly-tariff",
          label: monthlyTariff.label,
          tariffUpdatedAt: monthlyTariff.updatedAt,
          nextReviewAt: monthlyTariff.nextReviewAt,
          sourceNote: monthlyTariff.sourceNote,
          distanceKm,
          duration: route?.duration || null
        });
        return;
      }

      sendJson(response, 200, {
        ok: false,
        reason: "no_toll_price",
        distanceKm
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      tollFee: Math.round(tollFee),
      currency: "TRY",
      source: "google-routes",
      distanceKm,
      duration: route.duration || null
    });
  } catch (error) {
    sendJson(response, 200, {
      ok: false,
      reason: "unexpected_error"
    });
  }
}
