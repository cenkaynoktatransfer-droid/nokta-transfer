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

function roundToNearestFive(value) {
  return Math.round(value / 5) * 5;
}

function estimateFallbackToll(origin, destination, distanceKm) {
  const izmirMetro = { minLat: 38.15, maxLat: 38.75, minLng: 26.55, maxLng: 27.65 };
  const izmirRegion = { minLat: 37.75, maxLat: 39.35, minLng: 26.0, maxLng: 28.4 };
  const cesme = { minLat: 38.15, maxLat: 38.55, minLng: 26.15, maxLng: 26.75 };
  const aydin = { minLat: 37.45, maxLat: 38.25, minLng: 27.45, maxLng: 28.45 };
  const denizli = { minLat: 37.45, maxLat: 38.35, minLng: 28.55, maxLng: 29.75 };
  const candarli = { minLat: 38.65, maxLat: 39.25, minLng: 26.65, maxLng: 27.25 };
  const bursa = { minLat: 39.8, maxLat: 40.55, minLng: 28.45, maxLng: 30.0 };
  const marmaraCrossing = { minLat: 40.35, maxLat: 41.45, minLng: 28.45, maxLng: 30.75 };

  const knownRoutes = [
    {
      boxes: [izmirRegion, marmaraCrossing],
      fee: 1965,
      label: "Izmir-Istanbul/Osmangazi hatti 2026 otoyol tahmini"
    },
    {
      boxes: [izmirRegion, bursa],
      fee: 1200,
      label: "Izmir-Bursa hatti 2026 otoyol tahmini"
    },
    {
      boxes: [izmirMetro, cesme],
      fee: 55,
      label: "Izmir-Cesme otoyolu 2026 tahmini"
    },
    {
      boxes: [izmirMetro, aydin],
      fee: 75,
      label: "Izmir-Aydin otoyolu 2026 tahmini"
    },
    {
      boxes: [izmirMetro, denizli],
      fee: 365,
      label: "Izmir-Aydin-Denizli hatti 2026 tahmini"
    },
    {
      boxes: [izmirMetro, candarli],
      fee: 225,
      label: "Menemen-Aliaga-Candarli hatti 2026 tahmini"
    }
  ];

  const knownRoute = knownRoutes.find((route) => hasPair(origin, destination, route.boxes[0], route.boxes[1]));
  if (knownRoute) return knownRoute;

  if (distanceKm < 80) return null;

  const distanceFee = distanceKm >= 250 ? distanceKm * 3.2 : distanceKm * 1.7;
  return {
    fee: Math.min(roundToNearestFive(distanceFee), 1800),
    label: "Mesafe bazli otoyol tahmini"
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
      const fallback = distanceKm ? estimateFallbackToll(origin, destination, distanceKm) : null;
      if (fallback?.fee) {
        sendJson(response, 200, {
          ok: true,
          tollFee: Math.round(fallback.fee),
          currency: "TRY",
          source: "fallback-estimate",
          isEstimate: true,
          label: fallback.label,
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
