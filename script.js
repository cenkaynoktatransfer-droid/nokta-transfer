const ticker = document.querySelector(".ticker-track");

if (ticker) {
  ticker.innerHTML += ticker.innerHTML;
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((element) => {
  observer.observe(element);
});

const pickupInput = document.querySelector("#pickupInput");
const dropoffInput = document.querySelector("#dropoffInput");
const pickupSuggestions = document.querySelector("#pickupSuggestions");
const dropoffSuggestions = document.querySelector("#dropoffSuggestions");
const distanceOutput = document.querySelector("#distanceOutput");
const durationOutput = document.querySelector("#durationOutput");
const priceOutput = document.querySelector("#priceOutput");
const rateOutput = document.querySelector("#rateOutput");
const routeStatus = document.querySelector("#routeStatus");
const routeMapElement = document.querySelector("#routeMap");
const routeSubmit = document.querySelector("#routeSubmit");
const resetRoute = document.querySelector("#resetRoute");
const locationButton = document.querySelector("#locationButton");
const fareDistanceRange = document.querySelector("#fareDistanceRange");
const fareDistanceValue = document.querySelector("#fareDistanceValue");
const fareDistanceBubble = document.querySelector("#fareDistanceBubble");
const farePriceValue = document.querySelector("#farePriceValue");
const fareRateLabel = document.querySelector("#fareRateLabel");

const routePhone = "905060436591";
const shortRouteLimitKm = 60;
const shortRouteRate = 30;
const longRouteRate = 25;
const izmirCenter = [38.4237, 27.1428];

const routeState = {
  pickup: null,
  dropoff: null,
  distanceKm: 0,
  durationMinutes: 0,
  requestId: 0
};

const routeControls = {
  pickup: {
    input: pickupInput,
    suggestions: pickupSuggestions,
    marker: null,
    results: [],
    searchTimer: null,
    abortController: null
  },
  dropoff: {
    input: dropoffInput,
    suggestions: dropoffSuggestions,
    marker: null,
    results: [],
    searchTimer: null,
    abortController: null
  }
};

let routeMap = null;
let routeLine = null;

function formatNumber(value, maximumFractionDigits = 1) {
  return value.toLocaleString("tr-TR", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits === 1 && value < 10 ? 1 : 0
  });
}

function formatCurrency(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

function calculatePrice(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;

  const firstPart = Math.min(distanceKm, shortRouteLimitKm) * shortRouteRate;
  const remainingPart = Math.max(distanceKm - shortRouteLimitKm, 0) * longRouteRate;
  return firstPart + remainingPart;
}

function setRouteStatus(message, tone = "") {
  if (!routeStatus) return;
  routeStatus.textContent = message;
  routeStatus.classList.toggle("is-ready", tone === "ready");
  routeStatus.classList.toggle("is-warning", tone === "warning");
}

function getPlaceText(place) {
  return place?.shortLabel || place?.label || "";
}

function updateWhatsAppLink() {
  if (!routeSubmit) return;

  const pickup = getPlaceText(routeState.pickup) || pickupInput?.value.trim() || "";
  const dropoff = getPlaceText(routeState.dropoff) || dropoffInput?.value.trim() || "";
  const lines = [
    "Merhaba Nokta Transfer, araç çağırmak istiyorum.",
    pickup ? `Alınacak yer: ${pickup}` : "",
    dropoff ? `Gidilecek yer: ${dropoff}` : "",
    routeState.distanceKm ? `Mesafe: ${formatNumber(routeState.distanceKm)} km` : ""
  ]
    .filter(Boolean)
    .join("\n");

  routeSubmit.href = `https://wa.me/${routePhone}?text=${encodeURIComponent(lines)}`;
  routeSubmit.classList.toggle("is-ready", Boolean(routeState.pickup && routeState.dropoff && routeState.distanceKm));
}

function updateRouteDisplay() {
  const price = calculatePrice(routeState.distanceKm);

  if (distanceOutput) {
    distanceOutput.textContent = routeState.distanceKm ? `${formatNumber(routeState.distanceKm)} km` : "-";
  }

  if (durationOutput) {
    if (routeState.durationMinutes >= 60) {
      const hours = Math.floor(routeState.durationMinutes / 60);
      const minutes = Math.round(routeState.durationMinutes % 60);
      durationOutput.textContent = `Yaklaşık ${hours} sa ${minutes} dk`;
    } else {
      durationOutput.textContent = routeState.durationMinutes
        ? `Yaklaşık ${Math.round(routeState.durationMinutes)} dk`
        : "Rota seçilmedi";
    }
  }

  if (priceOutput) {
    priceOutput.textContent = price ? formatCurrency(price) : "0 TL";
  }

  if (rateOutput) {
    rateOutput.textContent =
      routeState.distanceKm > shortRouteLimitKm
        ? "İlk 60 km 30 TL/km + sonrası 25 TL/km"
        : "30 TL/km";
  }

  updateWhatsAppLink();
}

function updateFareEstimate() {
  if (!fareDistanceRange) return;

  const distance = Number(fareDistanceRange.value);
  const min = Number(fareDistanceRange.min) || 1;
  const max = Number(fareDistanceRange.max) || 200;
  const progress = ((distance - min) / (max - min)) * 100;
  const remainingDistance = Math.max(distance - shortRouteLimitKm, 0);
  const wrapper = fareDistanceRange.closest(".fare-range-wrap");

  wrapper?.style.setProperty("--fare-progress", `${progress}%`);

  if (fareDistanceValue) fareDistanceValue.textContent = distance.toLocaleString("tr-TR");
  if (fareDistanceBubble) fareDistanceBubble.textContent = `${distance.toLocaleString("tr-TR")} km`;
  if (farePriceValue) farePriceValue.textContent = formatCurrency(calculatePrice(distance));
  if (fareRateLabel) {
    fareRateLabel.textContent =
      distance > shortRouteLimitKm
        ? `İlk 60 km 30 TL/km + kalan ${remainingDistance.toLocaleString("tr-TR")} km 25 TL/km`
        : "30 TL/km sabit tarife";
  }
}

function initializeRouteMap() {
  if (!routeMapElement || !window.L) {
    setRouteStatus("Harita yüklenemedi, adresleri yazıp WhatsApp'tan gönderebilirsiniz.", "warning");
    return;
  }

  routeMap = L.map(routeMapElement, {
    zoomControl: false,
    scrollWheelZoom: false
  }).setView(izmirCenter, 11);

  L.control.zoom({ position: "topright" }).addTo(routeMap);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(routeMap);

  routeMapElement.classList.add("is-loaded");
  window.setTimeout(() => routeMap.invalidateSize(), 250);
}

function createRouteIcon(kind) {
  if (!window.L) return null;

  return L.divIcon({
    className: "",
    html: `<span class="map-pin ${kind}"></span>`,
    iconSize: [19, 19],
    iconAnchor: [9, 9]
  });
}

function syncMarker(kind) {
  if (!routeMap || !window.L) return;

  const control = routeControls[kind];
  const place = routeState[kind];

  if (!place) {
    if (control.marker) {
      control.marker.remove();
      control.marker = null;
    }
    return;
  }

  const latLng = [place.lat, place.lng];
  if (control.marker) {
    control.marker.setLatLng(latLng);
  } else {
    control.marker = L.marker(latLng, { icon: createRouteIcon(kind) }).addTo(routeMap);
  }

  control.marker.bindTooltip(kind === "pickup" ? "Alış noktası" : "Varış noktası");
}

function fitRouteMap() {
  if (!routeMap || !window.L) return;

  if (routeLine) {
    routeMap.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
    return;
  }

  const points = [routeState.pickup, routeState.dropoff]
    .filter(Boolean)
    .map((place) => [place.lat, place.lng]);

  if (points.length === 1) {
    routeMap.setView(points[0], 14);
  } else if (points.length > 1) {
    routeMap.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 14 });
  } else {
    routeMap.setView(izmirCenter, 11);
  }
}

function clearRouteLine() {
  routeState.distanceKm = 0;
  routeState.durationMinutes = 0;

  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }

  updateRouteDisplay();
}

function drawRoute(geometry) {
  if (!routeMap || !window.L || !geometry?.coordinates?.length) return;

  const latLngs = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  if (routeLine) {
    routeLine.setLatLngs(latLngs);
  } else {
    routeLine = L.polyline(latLngs, {
      color: "#22e477",
      weight: 5,
      opacity: 0.92
    }).addTo(routeMap);
  }

  syncMarker("pickup");
  syncMarker("dropoff");
  fitRouteMap();
}

function hideSuggestions(kind) {
  const suggestions = routeControls[kind]?.suggestions;
  if (suggestions) suggestions.hidden = true;
}

function clearSuggestions(kind) {
  const control = routeControls[kind];
  control.results = [];
  if (control.suggestions) {
    control.suggestions.textContent = "";
    control.suggestions.hidden = true;
  }
}

function normalizePlace(result) {
  const address = result.address || {};
  const title = result.name || result.display_name?.split(",")[0] || "Konum";
  const detailParts = [
    address.road,
    address.neighbourhood || address.suburb,
    address.town || address.city || address.county,
    address.province || address.state
  ].filter(Boolean);
  const detail = detailParts.join(", ");

  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    title,
    detail: detail || result.display_name || "Türkiye",
    label: result.display_name || title,
    shortLabel: detail ? `${title}, ${detail}` : title
  };
}

function renderSuggestions(kind, places) {
  const control = routeControls[kind];
  if (!control.suggestions) return;

  control.suggestions.textContent = "";
  control.results = places;

  if (!places.length) {
    control.suggestions.hidden = true;
    return;
  }

  places.forEach((place) => {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const detail = document.createElement("span");

    button.type = "button";
    button.className = "suggestion-item";
    button.setAttribute("role", "option");
    title.textContent = place.title;
    detail.textContent = place.detail;
    button.append(title, detail);
    button.addEventListener("click", () => selectPlace(kind, place));
    control.suggestions.append(button);
  });

  control.suggestions.hidden = false;
}

async function searchAddress(kind) {
  const control = routeControls[kind];
  const query = control.input?.value.trim() || "";

  clearSuggestions(kind);
  if (query.length < 2) return;

  if (control.abortController) control.abortController.abort();
  control.abortController = new AbortController();
  setRouteStatus("Adres aranıyor...");

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("accept-language", "tr");
  url.searchParams.set("limit", "7");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      signal: control.abortController.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("Adres araması başarısız oldu.");

    const places = (await response.json())
      .map(normalizePlace)
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));

    renderSuggestions(kind, places);
    setRouteStatus(places.length ? "Listeden adres seçin, mesafe otomatik hesaplansın." : "Adres bulunamadı.", places.length ? "" : "warning");
  } catch (error) {
    if (error.name === "AbortError") return;
    setRouteStatus("Adres araması şu an cevap vermedi. Birazdan tekrar deneyin.", "warning");
  }
}

function queueAddressSearch(kind) {
  const control = routeControls[kind];
  window.clearTimeout(control.searchTimer);
  control.searchTimer = window.setTimeout(() => searchAddress(kind), 350);
}

function selectPlace(kind, place) {
  const control = routeControls[kind];
  routeState[kind] = place;

  if (control.input) control.input.value = place.shortLabel || place.label;
  hideSuggestions(kind);
  clearRouteLine();
  syncMarker(kind);
  fitRouteMap();

  if (routeState.pickup && routeState.dropoff) {
    calculateRoute();
  } else {
    setRouteStatus(kind === "pickup" ? "Şimdi varış noktasını seçin." : "Şimdi alış noktasını seçin.");
  }
}

async function calculateRoute() {
  if (!routeState.pickup || !routeState.dropoff) return;

  const currentRequestId = ++routeState.requestId;
  const { pickup, dropoff } = routeState;
  const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson&alternatives=false&steps=false`;

  setRouteStatus("Rota hesaplanıyor...");
  routeSubmit?.classList.remove("is-ready");

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Rota servisi cevap vermedi.");

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("Rota bulunamadı.");
    if (currentRequestId !== routeState.requestId) return;

    routeState.distanceKm = route.distance / 1000;
    routeState.durationMinutes = route.duration / 60;
    updateRouteDisplay();
    drawRoute(route.geometry);
    setRouteStatus("Rota hazır. Fiyat otomatik hesaplandı.", "ready");
  } catch (error) {
    if (currentRequestId !== routeState.requestId) return;
    clearRouteLine();
    syncMarker("pickup");
    syncMarker("dropoff");
    fitRouteMap();
    setRouteStatus("Bu iki nokta için rota alınamadı. Adresleri kontrol edip tekrar seçin.", "warning");
  }
}

async function reverseGeocode(lat, lng) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lng);
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "tr");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Konum adı alınamadı.");

  return normalizePlace(await response.json());
}

Object.entries(routeControls).forEach(([kind, control]) => {
  control.input?.addEventListener("input", () => {
    routeState[kind] = null;
    routeState.requestId += 1;
    clearRouteLine();
    syncMarker(kind);
    fitRouteMap();
    queueAddressSearch(kind);
  });

  control.input?.addEventListener("focus", () => {
    if (control.results.length) renderSuggestions(kind, control.results);
  });

  control.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && control.results[0]) {
      event.preventDefault();
      selectPlace(kind, control.results[0]);
    }
  });
});

document.addEventListener("click", (event) => {
  Object.entries(routeControls).forEach(([kind, control]) => {
    if (!control.suggestions || control.suggestions.contains(event.target) || control.input?.contains(event.target)) return;
    hideSuggestions(kind);
  });
});

resetRoute?.addEventListener("click", () => {
  routeState.pickup = null;
  routeState.dropoff = null;
  routeState.requestId += 1;

  if (pickupInput) pickupInput.value = "";
  if (dropoffInput) dropoffInput.value = "";

  clearSuggestions("pickup");
  clearSuggestions("dropoff");
  clearRouteLine();
  syncMarker("pickup");
  syncMarker("dropoff");
  fitRouteMap();
  setRouteStatus("Türkiye genelinde şehir, sokak ve cadde arayın.");
});

locationButton?.addEventListener("click", () => {
  if (!navigator.geolocation || !pickupInput) {
    setRouteStatus("Tarayıcı konum izni vermiyor. Adresi yazarak seçin.", "warning");
    return;
  }

  locationButton.disabled = true;
  locationButton.textContent = "Konum alınıyor...";
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const fallbackPlace = {
        lat: coords.latitude,
        lng: coords.longitude,
        title: "Mevcut Konumum",
        detail: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        label: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        shortLabel: "Mevcut Konumum"
      };

      try {
        selectPlace("pickup", await reverseGeocode(coords.latitude, coords.longitude));
      } catch (error) {
        selectPlace("pickup", fallbackPlace);
      } finally {
        locationButton.disabled = false;
        locationButton.textContent = "⌖ Mevcut Konumum";
      }
    },
    () => {
      locationButton.disabled = false;
      locationButton.textContent = "⌖ Mevcut Konumum";
      setRouteStatus("Konum izni verilmedi. Alış adresini yazarak seçin.", "warning");
    },
    { enableHighAccuracy: true, timeout: 9000 }
  );
});

routeSubmit?.addEventListener("click", (event) => {
  if (!routeState.distanceKm) {
    event.preventDefault();
    setRouteStatus("Mesafe ve fiyat için iki adresi listeden seçin.", "warning");
  }
});

fareDistanceRange?.addEventListener("input", updateFareEstimate);

initializeRouteMap();
updateRouteDisplay();
updateFareEstimate();
