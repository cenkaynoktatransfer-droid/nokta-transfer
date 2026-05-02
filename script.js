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

const pricePerKm = 30;
const pickupInput = document.querySelector("#pickupInput");
const dropoffInput = document.querySelector("#dropoffInput");
const distanceInput = document.querySelector("#distanceInput");
const priceOutput = document.querySelector("#priceOutput");
const routeSubmit = document.querySelector("#routeSubmit");
const resetRoute = document.querySelector("#resetRoute");
const locationButton = document.querySelector("#locationButton");

function parseDistance(value) {
  const normalized = String(value || "").replace(",", ".");
  const distance = Number.parseFloat(normalized);
  return Number.isFinite(distance) && distance > 0 ? distance : 0;
}

function updateRoutePrice() {
  if (!distanceInput || !priceOutput || !routeSubmit) return;

  const distance = parseDistance(distanceInput.value);
  const price = Math.round(distance * pricePerKm);
  priceOutput.textContent = price > 0 ? `${price.toLocaleString("tr-TR")} TL` : "0 TL";

  const pickup = pickupInput?.value.trim() || "";
  const dropoff = dropoffInput?.value.trim() || "";
  const message = [
    "Merhaba Nokta Transfer, araç çağırmak istiyorum.",
    pickup ? `Alınacak yer: ${pickup}` : "",
    dropoff ? `Gidilecek yer: ${dropoff}` : "",
    distance ? `Mesafe: ${distance.toLocaleString("tr-TR")} km` : "",
    price ? `Tahmini ücret: ${price.toLocaleString("tr-TR")} TL` : ""
  ]
    .filter(Boolean)
    .join("\n");

  routeSubmit.href = `https://wa.me/905060436591?text=${encodeURIComponent(message)}`;
  routeSubmit.classList.toggle("is-ready", Boolean(pickup && dropoff && distance));
}

[pickupInput, dropoffInput, distanceInput].forEach((input) => {
  input?.addEventListener("input", updateRoutePrice);
});

resetRoute?.addEventListener("click", () => {
  if (pickupInput) pickupInput.value = "";
  if (dropoffInput) dropoffInput.value = "";
  if (distanceInput) distanceInput.value = "";
  updateRoutePrice();
});

locationButton?.addEventListener("click", () => {
  if (!navigator.geolocation || !pickupInput) {
    if (pickupInput) pickupInput.placeholder = "Konum alınamadı";
    return;
  }

  locationButton.textContent = "Konum alınıyor...";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      pickupInput.value = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      locationButton.textContent = "⌖ Mevcut Konumum";
      updateRoutePrice();
    },
    () => {
      locationButton.textContent = "⌖ Mevcut Konumum";
      pickupInput.placeholder = "Konum izni verilmedi";
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

updateRoutePrice();
