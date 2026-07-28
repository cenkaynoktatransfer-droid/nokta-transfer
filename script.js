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
const routeModeButtons = document.querySelectorAll("[data-route-mode]");
const tollPanel = document.querySelector("#tollPanel");
const tollStatus = document.querySelector("#tollStatus");
const tollInput = document.querySelector("#tollInput");
const tollHint = document.querySelector("#tollHint");
const tollAmountOutput = document.querySelector("#tollAmountOutput");
const fareModeButtons = document.querySelectorAll("[data-fare-mode]");
const fareTollPanel = document.querySelector("#fareTollPanel");
const fareTollInput = document.querySelector("#fareTollInput");
const bookingForm = document.querySelector("#bookingForm");
const visitorCounterValue = document.querySelector("#visitorCounterValue");
const visitorCounterStatus = document.querySelector("#visitorCounterStatus");

const routePhone = "905060436591";
const minimumFareDistanceKm = 6;
const minimumFare = 200;
const longRouteLimitKm = 100;
const standardRouteRate = 30;
const longRouteRate = 25;
const izmirCenter = [38.4237, 27.1428];

function getRootRelativeUrl(fileName) {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  const depth = lastSegment.includes(".") ? Math.max(segments.length - 1, 0) : segments.length;
  return `${"../".repeat(depth)}${fileName}`;
}

function buildConversionPageUrl(fileName, message, source) {
  const url = new URL(getRootRelativeUrl(fileName), window.location.href);
  if (message) url.searchParams.set("text", message);
  if (source) url.searchParams.set("source", source);
  return url.href;
}

function getOrCreateVisitorDeviceId() {
  const storageKey = "noktaTransferVisitorDeviceId";
  const newId = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const existingId = window.localStorage?.getItem(storageKey);
    if (existingId) return existingId;
    window.localStorage?.setItem(storageKey, newId);
  } catch (error) {
    return newId;
  }

  return newId;
}

function formatVisitorCount(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000) {
    const formatted = (number / 1_000_000).toLocaleString("tr-TR", {
      maximumFractionDigits: number >= 10_000_000 ? 0 : 1
    });
    return `${formatted.replace(/,0$/, "")}M`;
  }
  if (number >= 1_000) {
    const formatted = (number / 1_000).toLocaleString("tr-TR", {
      maximumFractionDigits: number >= 10_000 ? 0 : 1
    });
    return `${formatted.replace(/,0$/, "")}K`;
  }
  return number.toLocaleString("tr-TR");
}
async function initializeVisitorCounter() {
  if (!visitorCounterValue) return;

  try {
    const deviceId = getOrCreateVisitorDeviceId();
    const response = await fetch("/api/visitor-counter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId,
        path: window.location.pathname
      })
    });

    if (!response.ok) throw new Error("Counter request failed");

    const data = await response.json();
    visitorCounterValue.textContent = formatVisitorCount(data.total);

    if (visitorCounterStatus) {
      visitorCounterStatus.textContent = data.isNewDevice
        ? "Bu cihaz ilk kez sayıldı. Aynı cihaz tekrar sayılmaz."
        : "Bu cihaz daha önce sayıldığı için toplam sayı aynı kaldı.";
    }
  } catch (error) {
    visitorCounterValue.textContent = "-";
    if (visitorCounterStatus) {
      visitorCounterStatus.textContent = "Sayaç şu anda güncellenemiyor.";
    }
  }
}

const routeState = {
  pickup: null,
  dropoff: null,
  distanceKm: 0,
  durationMinutes: 0,
  requestId: 0,
  roadMode: "normal",
  tollFee: 0,
  tollSource: "",
  tollRequestId: 0
};

const fareState = {
  roadMode: "normal",
  tollFee: 0
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
let tollAbortController = null;

function initializeGoogleAdsTag() {
  const adsConfig = window.NOKTA_TRANSFER_ADS;
  if (!adsConfig?.googleAdsId) return;
  if (window.__noktaAdsTagReady && window.gtag) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsConfig.googleAdsId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", adsConfig.googleAdsId);
}

function sendAdsConversion(type) {
  const adsConfig = window.NOKTA_TRANSFER_ADS;
  const conversionTypes = {
    call: {
      eventName: "phone_call_click",
      eventLabel: "Telefon arama tiklamasi",
      label: adsConfig?.callLabel
    },
    whatsapp: {
      eventName: "whatsapp_click",
      eventLabel: "WhatsApp tiklamasi",
      label: adsConfig?.whatsappLabel
    },
    booking: {
      eventName: "generate_lead",
      eventLabel: "Arac cagirma ve rezervasyon",
      label: adsConfig?.bookingLabel
    }
  };
  const conversion = conversionTypes[type];

  if (!window.gtag || !adsConfig?.googleAdsId || !conversion) return false;

  window.gtag("event", conversion.eventName, {
    event_category: "lead",
    event_label: conversion.eventLabel,
    transport_type: "beacon"
  });

  if (!conversion.label) return false;

  window.gtag("event", "conversion", {
    send_to: `${adsConfig.googleAdsId}/${conversion.label}`,
    currency: adsConfig.currency || "TRY",
    value: 1
  });

  return true;
}

function formatNumber(value, maximumFractionDigits = 1) {
  return value.toLocaleString("tr-TR", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits === 1 && value < 10 ? 1 : 0
  });
}

function formatCurrency(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

function normalizeMoneyInput(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function calculateBasePrice(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  if (distanceKm <= minimumFareDistanceKm) return minimumFare;

  const standardDistance = Math.max(Math.min(distanceKm, longRouteLimitKm) - minimumFareDistanceKm, 0);
  const longDistance = Math.max(distanceKm - longRouteLimitKm, 0);
  return minimumFare + standardDistance * standardRouteRate + longDistance * longRouteRate;
}

function calculatePrice(distanceKm, tollFee = 0) {
  const basePrice = calculateBasePrice(distanceKm);
  return basePrice ? basePrice + normalizeMoneyInput(tollFee) : 0;
}

function getPricingLabel(distanceKm, tollFee = 0) {
  const tollText = normalizeMoneyInput(tollFee) ? ` + ${formatCurrency(tollFee)} otoban` : "";

  if (!distanceKm || distanceKm <= minimumFareDistanceKm) {
    return `0-6 km sabit ${formatCurrency(minimumFare)}${tollText}`;
  }

  if (distanceKm <= longRouteLimitKm) {
    return `0-6 km ${formatCurrency(minimumFare)} + sonrası ${standardRouteRate} TL/km${tollText}`;
  }

  return `0-6 km ${formatCurrency(minimumFare)} + 100 km sonrası ${longRouteRate} TL/km${tollText}`;
}

function resetTollEstimate() {
  routeState.tollFee = 0;
  routeState.tollSource = "";
  routeState.tollRequestId += 1;
  if (tollAbortController) tollAbortController.abort();
  if (tollInput) {
    tollInput.value = "";
    tollInput.hidden = true;
  }
  if (tollStatus) tollStatus.textContent = "Rota seçilince otoyol ücreti otomatik aranır.";
  if (tollHint) tollHint.textContent = "Otomatik bulunursa toplam fiyata kendisi eklenir.";
}

function showManualTollFallback(message) {
  routeState.tollSource = "manual";
  if (tollInput) tollInput.hidden = false;
  if (tollStatus) tollStatus.textContent = message;
  if (tollHint) tollHint.textContent = "Otomatik ücret bulunamazsa güncel otoyol ücretini yedek olarak buraya yazabilirsiniz.";
}

async function fetchAutomaticTollEstimate() {
  if (routeState.roadMode !== "highway" || !routeState.pickup || !routeState.dropoff) return;

  const currentTollRequestId = ++routeState.tollRequestId;
  routeState.tollFee = 0;
  routeState.tollSource = "auto-pending";
  if (tollInput) {
    tollInput.value = "";
    tollInput.hidden = true;
  }
  if (tollPanel) tollPanel.hidden = false;
  if (tollStatus) tollStatus.textContent = "Otoban ücreti otomatik aranıyor...";
  if (tollHint) tollHint.textContent = "Google Routes ücret dönerse toplam fiyata otomatik eklenir.";
  updateRouteDisplay();

  if (tollAbortController) tollAbortController.abort();
  tollAbortController = new AbortController();

  try {
    const response = await fetch("/api/toll-estimate", {
      method: "POST",
      signal: tollAbortController.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: {
          lat: routeState.pickup.lat,
          lng: routeState.pickup.lng
        },
        destination: {
          lat: routeState.dropoff.lat,
          lng: routeState.dropoff.lng
        }
      })
    });

    const data = await response.json();
    if (currentTollRequestId !== routeState.tollRequestId) return;

    if (data.ok && data.tollFee > 0) {
      routeState.tollFee = normalizeMoneyInput(data.tollFee);
      routeState.tollSource = "auto";
      const sourceLabel =
        data.source === "kgm-live"
          ? "KGM güncel otoyol ücreti"
          : data.source === "monthly-tariff"
            ? "Aylık güncel otoyol ücreti"
            : "Otoyol ücreti otomatik bulundu";
      if (tollStatus) tollStatus.textContent = `${sourceLabel}: ${formatCurrency(routeState.tollFee)}`;
      if (tollHint) {
        const reviewText = data.nextReviewAt ? ` Bir sonraki kontrol: ${data.nextReviewAt}.` : "";
        tollHint.textContent = `${data.label || "Bu tutar toplam ücrete otomatik eklendi."}${reviewText}`;
      }
      if (tollInput) tollInput.hidden = true;
      updateRouteDisplay();
      return;
    }

    const fallbackMessage =
      data.reason === "missing_api_key"
        ? "Otomatik otoyol ücreti için Google Routes API anahtarı eklenmeli."
        : "Bu rota için otomatik otoyol ücreti bulunamadı.";
    showManualTollFallback(fallbackMessage);
    updateRouteDisplay();
  } catch (error) {
    if (error.name === "AbortError") return;
    if (currentTollRequestId !== routeState.tollRequestId) return;
    showManualTollFallback("Otoyol ücreti servisine ulaşılamadı.");
    updateRouteDisplay();
  }
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

function formatBookingDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function getBookingValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function buildBookingMessage(form) {
  const formData = new FormData(form);
  const type = getBookingValue(formData, "type");
  const date = formatBookingDate(getBookingValue(formData, "date"));
  const time = getBookingValue(formData, "time");
  const from = getBookingValue(formData, "from");
  const to = getBookingValue(formData, "to");
  const passengers = getBookingValue(formData, "passengers");
  const luggage = getBookingValue(formData, "luggage");
  const note = getBookingValue(formData, "note");

  return [
    "Merhaba Nokta Transfer, rezervasyon talebi oluşturmak istiyorum.",
    type ? `Transfer tipi: ${type}` : "",
    date || time ? `Tarih/Saat: ${[date, time].filter(Boolean).join(" - ")}` : "",
    from ? `Alınacak yer: ${from}` : "",
    to ? `Gidilecek yer: ${to}` : "",
    passengers ? `Yolcu sayısı: ${passengers}` : "",
    luggage ? `Bagaj: ${luggage}` : "",
    note ? `Uçuş no / not: ${note}` : "",
    "Müsait araç ve güncel ücret bilgisini paylaşır mısınız?"
  ]
    .filter(Boolean)
    .join("\n");
}

function updateWhatsAppLink() {
  if (!routeSubmit) return;

  const pickup = getPlaceText(routeState.pickup) || pickupInput?.value.trim() || "";
  const dropoff = getPlaceText(routeState.dropoff) || dropoffInput?.value.trim() || "";
  const activeTollFee = routeState.roadMode === "highway" ? routeState.tollFee : 0;
  const lines = [
    "Merhaba Nokta Transfer, araç çağırmak istiyorum.",
    pickup ? `Alınacak yer: ${pickup}` : "",
    dropoff ? `Gidilecek yer: ${dropoff}` : "",
    routeState.distanceKm ? `Mesafe: ${formatNumber(routeState.distanceKm)} km` : "",
    routeState.roadMode === "highway" ? "Yol tercihi: Otoban" : "",
    activeTollFee ? `Belirtilen otoyol ücreti: ${formatCurrency(activeTollFee)}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  routeSubmit.href = buildConversionPageUrl("rezervasyon-donusum.html", lines, "route-panel");
  routeSubmit.classList.toggle("is-ready", Boolean(routeState.pickup && routeState.dropoff && routeState.distanceKm));
}

function updateRouteDisplay() {
  const activeTollFee = routeState.roadMode === "highway" ? routeState.tollFee : 0;
  const price = calculatePrice(routeState.distanceKm, activeTollFee);

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
    rateOutput.textContent = getPricingLabel(routeState.distanceKm, activeTollFee);
  }

  if (tollAmountOutput) {
    tollAmountOutput.hidden = routeState.roadMode !== "highway";
    tollAmountOutput.textContent = activeTollFee
      ? `Otoban ücreti: ${formatCurrency(activeTollFee)} toplam ücrete eklendi.`
      : "Otoban seçildi. Güncel otoyol ücretini yazarsanız toplam ücrete eklenir.";
  }

  updateWhatsAppLink();
}

function updateFareEstimate() {
  if (!fareDistanceRange) return;

  const distance = Number(fareDistanceRange.value);
  const min = Number(fareDistanceRange.min) || 1;
  const max = Number(fareDistanceRange.max) || 200;
  const progress = ((distance - min) / (max - min)) * 100;
  const activeTollFee = fareState.roadMode === "highway" ? fareState.tollFee : 0;
  const wrapper = fareDistanceRange.closest(".fare-range-wrap");

  wrapper?.style.setProperty("--fare-progress", `${progress}%`);

  if (fareDistanceValue) fareDistanceValue.textContent = distance.toLocaleString("tr-TR");
  if (fareDistanceBubble) fareDistanceBubble.textContent = `${distance.toLocaleString("tr-TR")} km`;
  if (farePriceValue) farePriceValue.textContent = formatCurrency(calculatePrice(distance, activeTollFee));
  if (fareRateLabel) {
    fareRateLabel.textContent = getPricingLabel(distance, activeTollFee);
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
  resetTollEstimate();

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
    if (routeState.roadMode === "highway") fetchAutomaticTollEstimate();
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
  routeState.roadMode = "normal";
  resetTollEstimate();

  if (pickupInput) pickupInput.value = "";
  if (dropoffInput) dropoffInput.value = "";
  if (tollPanel) tollPanel.hidden = true;
  routeModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.routeMode === "normal");
  });

  clearSuggestions("pickup");
  clearSuggestions("dropoff");
  clearRouteLine();
  syncMarker("pickup");
  syncMarker("dropoff");
  fitRouteMap();
  setRouteStatus("Türkiye genelinde şehir, sokak ve cadde arayın.");
});

routeModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    routeState.roadMode = button.dataset.routeMode || "normal";
    routeModeButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    if (routeState.roadMode === "highway") {
      if (tollPanel) tollPanel.hidden = false;
      if (routeState.pickup && routeState.dropoff && routeState.distanceKm) {
        fetchAutomaticTollEstimate();
      } else {
        resetTollEstimate();
        if (tollStatus) tollStatus.textContent = "Rota seçilince otoyol ücreti otomatik aranır.";
      }
    } else {
      if (tollPanel) tollPanel.hidden = true;
      resetTollEstimate();
    }
    updateRouteDisplay();
  });
});

tollInput?.addEventListener("input", () => {
  routeState.tollFee = normalizeMoneyInput(tollInput.value);
  routeState.tollSource = "manual";
  updateRouteDisplay();
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
    return;
  }

});

fareDistanceRange?.addEventListener("input", updateFareEstimate);

fareModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    fareState.roadMode = button.dataset.fareMode || "normal";
    fareModeButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    if (fareTollPanel) fareTollPanel.hidden = fareState.roadMode !== "highway";
    updateFareEstimate();
  });
});

fareTollInput?.addEventListener("input", () => {
  fareState.tollFee = normalizeMoneyInput(fareTollInput.value);
  updateFareEstimate();
});

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = buildBookingMessage(bookingForm);
  window.open(buildConversionPageUrl("rezervasyon-donusum.html", message, "booking-form"), "_blank", "noopener");
});

document.querySelectorAll('a[href^="tel:"], a[href*="telefon-donusum"]').forEach((link) => {
  link.addEventListener("click", () => sendAdsConversion("call"));
});

document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp-donusum"]').forEach((link) => {
  if (link === routeSubmit) return;
  link.addEventListener("click", () => sendAdsConversion("whatsapp"));
});

initializeGoogleAdsTag();
initializeVisitorCounter();
initializeRouteMap();
updateRouteDisplay();
updateFareEstimate();

const districtButtons = document.querySelectorAll("[data-district]");
const districtVisual = document.querySelector("#districtVisual");
const districtVisualKicker = document.querySelector("#districtVisualKicker");
const districtVisualTitle = document.querySelector("#districtVisualTitle");
const districtVisualNote = document.querySelector("#districtVisualNote");
const districtDetailKicker = document.querySelector("#districtDetailKicker");
const districtDetailTitle = document.querySelector("#districtDetailTitle");
const districtDetailText = document.querySelector("#districtDetailText");
const districtDetailScope = document.querySelector("#districtDetailScope");
const districtDetailRoute = document.querySelector("#districtDetailRoute");
const districtDetailVehicle = document.querySelector("#districtDetailVehicle");
const districtDetailCard = document.querySelector(".district-detail-card");
const districtDetailPage = document.querySelector("#districtDetailPage");

const districtZoneLabels = {
  merkez: "MERKEZ HAT",
  sahil: "SAHİL HATTI",
  kuzey: "KUZEY HATTI",
  guney: "İÇ VE GÜNEY HAT"
};

function createDistrict(name, zone, note, route, scope = "Şehir içi ve havalimanı", vehicle = "Sedan / VIP") {
  const zoneLabel = districtZoneLabels[zone] || "İZMİR HATTI";
  const zoneText = {
    merkez: "merkez cadde, iş alanı, otel ve hastane bağlantılarında hızlı araç yönlendirmesi",
    sahil: "sahil, yazlık bölge, marina ve otel rotalarında planlı transfer desteği",
    kuzey: "kuzey aksı, organize sanayi, liman ve şehir dışı bağlantılarında konforlu ulaşım",
    guney: "iç ilçe, kırsal rota, terminal ve havalimanı bağlantılarında düzenli transfer"
  }[zone] || "İzmir içi ve şehir dışı transfer";

  return {
    name,
    zone,
    kicker: zoneLabel,
    note,
    route,
    scope,
    vehicle,
    text: `${name} bölgesi için ${zoneText} sağlanır. Nokta Transfer, yolculuk öncesi net bilgi veren, 7/24 ulaşılabilir ve konforlu araç seçeneği sunan özel transfer çözümüdür.`
  };
}

function slugifyDistrictName(name) {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const districtDetails = {
  konak: createDistrict("Konak", "merkez", "Saat Kulesi, Alsancak, Kordon", "Konak - Adnan Menderes"),
  balcova: createDistrict("Balçova", "merkez", "Teleferik, İnciraltı, AVM hattı", "Balçova - Havalimanı"),
  bayrakli: createDistrict("Bayraklı", "merkez", "Adliye, plaza ve sahil hattı", "Bayraklı - Alsancak"),
  bornova: createDistrict("Bornova", "merkez", "Ege Üniversitesi, Forum, merkez", "Bornova - Adnan Menderes"),
  buca: createDistrict("Buca", "merkez", "Kozağaç, Şirinyer, üniversite çevresi", "Buca - Havalimanı"),
  cigli: createDistrict("Çiğli", "kuzey", "OSB, Mavişehir ve kuzey çevre yolu", "Çiğli - Karşıyaka"),
  gaziemir: createDistrict("Gaziemir", "merkez", "Adnan Menderes, fuar ve çevre yolu", "Gaziemir - Havalimanı"),
  guzelbahce: createDistrict("Güzelbahçe", "sahil", "Sahil yolu, marina ve Urla bağlantısı", "Güzelbahçe - Urla"),
  karabaglar: createDistrict("Karabağlar", "merkez", "Bozyaka, Yeşilyurt ve şehir merkezi", "Karabağlar - Konak"),
  karsiyaka: createDistrict("Karşıyaka", "merkez", "Bostanlı, Mavişehir ve sahil hattı", "Karşıyaka - Bornova"),
  narlidere: createDistrict("Narlıdere", "sahil", "Sahil, oteller ve Balçova bağlantısı", "Narlıdere - Havalimanı"),
  aliaga: createDistrict("Aliağa", "kuzey", "Liman, rafineri ve sanayi hattı", "Aliağa - İzmir Merkez", "Şehir dışı ve sanayi hattı", "Sedan / VIP / Van"),
  bergama: createDistrict("Bergama", "kuzey", "Tarihi merkez ve kuzey aksı", "Bergama - Havalimanı", "Uzun mesafe transfer", "Sedan / VIP"),
  cesme: createDistrict("Çeşme", "sahil", "Alaçatı, marina ve otel bölgeleri", "Çeşme - Adnan Menderes", "Sahil ve otel transferi", "Sedan / VIP / Van"),
  dikili: createDistrict("Dikili", "sahil", "Sahil, liman ve yazlık bölgeler", "Dikili - İzmir Merkez", "Uzun mesafe sahil transferi", "Sedan / VIP"),
  foca: createDistrict("Foça", "sahil", "Eski Foça, Yeni Foça ve sahil rotası", "Foça - Havalimanı", "Sahil ve yazlık transferi", "Sedan / VIP"),
  karaburun: createDistrict("Karaburun", "sahil", "Yarımada, sahil ve yazlık hatları", "Karaburun - İzmir Merkez", "Yarımada transferi", "Sedan / VIP"),
  kinik: createDistrict("Kınık", "kuzey", "Kuzey ilçe ve Bergama bağlantısı", "Kınık - İzmir Merkez", "Uzun mesafe transfer", "Sedan / VIP"),
  menemen: createDistrict("Menemen", "kuzey", "Ulukent, şehir merkezi ve çevre yolu", "Menemen - Karşıyaka"),
  mordogan: createDistrict("Mordoğan", "sahil", "Karaburun yolu, yazlık ve koylar", "Mordoğan - Havalimanı", "Yarımada sahil transferi", "Sedan / VIP"),
  seferihisar: createDistrict("Seferihisar", "sahil", "Sığacık, marina ve sahil rotaları", "Seferihisar - Havalimanı", "Sahil ve otel transferi", "Sedan / VIP"),
  urla: createDistrict("Urla", "sahil", "İskele, bağ yolu ve sahil hattı", "Urla - İzmir Merkez", "Sahil ve şehir içi transfer", "Sedan / VIP"),
  urkmez: createDistrict("Ürkmez", "sahil", "Seferihisar hattı, sahil ve yazlıklar", "Ürkmez - İzmir Merkez", "Sahil transferi", "Sedan / VIP"),
  gumuldur: createDistrict("Gümüldür", "sahil", "Menderes sahili ve yazlık bölgeler", "Gümüldür - Havalimanı", "Sahil ve havalimanı transferi", "Sedan / VIP"),
  bayindir: createDistrict("Bayındır", "guney", "İç ilçe, terminal ve merkez rotası", "Bayındır - İzmir Merkez", "İç ilçe transferi", "Sedan / VIP"),
  beydag: createDistrict("Beydağ", "guney", "Ödemiş hattı ve güney aksı", "Beydağ - Havalimanı", "Uzun mesafe transfer", "Sedan / VIP"),
  kemalpasa: createDistrict("Kemalpaşa", "guney", "Sanayi, OSB ve şehir dışı bağlantı", "Kemalpaşa - Bornova", "Sanayi ve şehir içi transfer", "Sedan / VIP"),
  kiraz: createDistrict("Kiraz", "guney", "Güney ilçe ve Ödemiş bağlantısı", "Kiraz - İzmir Merkez", "Uzun mesafe transfer", "Sedan / VIP"),
  menderes: createDistrict("Menderes", "guney", "Havalimanı, Gümüldür ve sahil bağlantısı", "Menderes - Adnan Menderes"),
  odemis: createDistrict("Ödemiş", "guney", "Birgi, merkez ve güney rotası", "Ödemiş - Havalimanı", "Uzun mesafe transfer", "Sedan / VIP"),
  selcuk: createDistrict("Selçuk", "guney", "Efes, Şirince ve otel bağlantıları", "Selçuk - Havalimanı", "Turistik rota transferi", "Sedan / VIP / Van"),
  tire: createDistrict("Tire", "guney", "İç ilçe, terminal ve merkez hattı", "Tire - İzmir Merkez", "Uzun mesafe transfer", "Sedan / VIP"),
  torbali: createDistrict("Torbalı", "guney", "Pancar, Ayrancılar ve sanayi hattı", "Torbalı - Havalimanı")
};

function updateDistrictDetail(id) {
  const detail = districtDetails[id];
  if (!detail || !districtVisual) return;

  districtVisual.dataset.zone = detail.zone;
  if (districtVisualKicker) districtVisualKicker.textContent = detail.kicker;
  if (districtVisualTitle) districtVisualTitle.textContent = detail.name;
  if (districtVisualNote) districtVisualNote.textContent = detail.note;
  if (districtDetailKicker) districtDetailKicker.textContent = detail.kicker;
  if (districtDetailTitle) districtDetailTitle.textContent = `${detail.name} Transfer`;
  if (districtDetailText) districtDetailText.textContent = detail.text;
  if (districtDetailScope) districtDetailScope.textContent = detail.scope;
  if (districtDetailRoute) districtDetailRoute.textContent = detail.route;
  if (districtDetailVehicle) districtDetailVehicle.textContent = detail.vehicle;
  if (districtDetailPage) {
    districtDetailPage.href = `./${slugifyDistrictName(detail.name)}-transfer/`;
    districtDetailPage.textContent = `${detail.name} Transfer Sayfasını Aç`;
  }

  districtButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.district === id);
  });
}

districtButtons.forEach((button) => {
  button.addEventListener("click", () => {
    updateDistrictDetail(button.dataset.district);
    if (window.innerWidth <= 880) {
      districtDetailCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

if (districtButtons.length) {
  updateDistrictDetail("konak");
}



