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
      sendJson(response, 200, {
        ok: false,
        reason: "routes_api_error",
        status: googleResponse.status
      });
      return;
    }

    const route = data.routes?.[0];
    const prices = route?.travelAdvisory?.tollInfo?.estimatedPrice || [];
    const tollFee = prices.reduce((total, price) => total + moneyToTry(price), 0);

    if (!tollFee) {
      sendJson(response, 200, {
        ok: false,
        reason: "no_toll_price",
        distanceKm: route?.distanceMeters ? route.distanceMeters / 1000 : null
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      tollFee: Math.round(tollFee),
      currency: "TRY",
      source: "google-routes",
      distanceKm: route.distanceMeters ? route.distanceMeters / 1000 : null,
      duration: route.duration || null
    });
  } catch (error) {
    sendJson(response, 200, {
      ok: false,
      reason: "unexpected_error"
    });
  }
}
