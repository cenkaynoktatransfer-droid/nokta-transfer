import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { districtPages, languagePages, servicePages, siteUrl, sitemapLastmod } from "./seo-data.mjs";

const files = [
  "index.html",
  "ilceler.html",
  "styles.css",
  "script.js",
  "telefon-donusum.html",
  "whatsapp-donusum.html",
  "rezervasyon-donusum.html",
  "site.webmanifest",
  "sw.js",
  "robots.txt",
  "llms.txt",
  "sitemap.xml",
  "assets"
];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

const googleAdsId = process.env.GOOGLE_ADS_ID || "AW-18102129467";
const googleAdsLabels = {
  call: process.env.GOOGLE_ADS_CALL_LABEL || "",
  whatsapp: process.env.GOOGLE_ADS_WHATSAPP_LABEL || "",
  booking: process.env.GOOGLE_ADS_BOOKING_LABEL || ""
};

function jsString(value) {
  return JSON.stringify(String(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonLd(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function googleAdsHeadSnippet() {
  return `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(googleAdsId)}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag("js", new Date());
      gtag("config", ${jsString(googleAdsId)});
      window.__noktaAdsTagReady = true;
      window.NOKTA_TRANSFER_ADS = {
        googleAdsId: ${jsString(googleAdsId)},
        callLabel: ${jsString(googleAdsLabels.call)},
        whatsappLabel: ${jsString(googleAdsLabels.whatsapp)},
        bookingLabel: ${jsString(googleAdsLabels.booking)},
        currency: "TRY"
      };
    </script>`;
}

function injectGoogleAdsConfig(html) {
  return html
    .replace(/gtag\/js\?id=AW-[0-9]+/g, `gtag/js?id=${googleAdsId}`)
    .replace(/gtag\("config",\s*"AW-[0-9]+"\);/g, `gtag("config", ${jsString(googleAdsId)});`)
    .replace(/googleAdsId:\s*"AW-[0-9]+"/g, `googleAdsId: ${jsString(googleAdsId)}`)
    .replace(/callLabel:\s*"[^"]*"/g, `callLabel: ${jsString(googleAdsLabels.call)}`)
    .replace(/whatsappLabel:\s*"[^"]*"/g, `whatsappLabel: ${jsString(googleAdsLabels.whatsapp)}`)
    .replace(/bookingLabel:\s*"[^"]*"/g, `bookingLabel: ${jsString(googleAdsLabels.booking)}`);
}

for (const file of files) {
  if (file.endsWith(".html")) {
    const html = await readFile(file, "utf8");
    await writeFile(`dist/${file}`, injectGoogleAdsConfig(html), "utf8");
  } else {
    await cp(file, `dist/${file}`, { recursive: true });
  }
}

function languageSwitcher(prefix, currentLang = "tr") {
  const label = {
    tr: "Dil seçimi",
    en: "Language selection",
    de: "Sprachauswahl",
    ru: "Выбор языка",
    uk: "Вибір мови"
  }[currentLang] || "Dil seçimi";
  const options = [
    { lang: "tr", label: "TR", href: `${prefix}index.html` },
    { lang: "en", label: "EN", href: `${prefix}en/` },
    { lang: "de", label: "DE", href: `${prefix}de/` },
    { lang: "ru", label: "RU", href: `${prefix}ru/` },
    { lang: "uk", label: "UK", href: `${prefix}uk/` }
  ];

  return `<div class="language-switcher" aria-label="${label}">
            ${options
              .map(
                (item) =>
                  `<a href="${item.href}" lang="${item.lang}"${item.lang === currentLang ? ' class="is-active" aria-current="page"' : ""}>${item.label}</a>`
              )
              .join("")}
          </div>`;
}

function siteFooter(prefix, text = "İzmir merkezli 7/24 özel transfer, şehir içi ulaşım, havalimanı transferi ve VIP araç hizmeti.", lang = "tr") {
  const copy = {
    tr: {
      quick: "Hızlı Erişim",
      home: "Anasayfa",
      areas: "Hizmet Bölgeleri",
      pricing: "Fiyatlandırma",
      faq: "S.S.S.",
      servicesLabel: "Transfer Hizmetleri",
      contact: "İletişim",
      whatsapp: "WhatsApp ile yaz",
      status: "7/24 aktif - hızlı dönüş",
      rights: "© 2026 Nokta Transfer. Tüm hakları saklıdır.",
      designer: "Site tasarımcımız Asil Uzunoglu"
    },
    en: {
      quick: "Quick Links",
      home: "Home",
      areas: "Services",
      pricing: "Pricing",
      faq: "FAQ",
      servicesLabel: "Transfer Services",
      contact: "Contact",
      whatsapp: "Message on WhatsApp",
      status: "24/7 active - fast response",
      rights: "© 2026 Nokta Transfer. All rights reserved.",
      designer: "Site designer Asil Uzunoglu"
    },
    de: {
      quick: "Schnellzugriff",
      home: "Start",
      areas: "Leistungen",
      pricing: "Preise",
      faq: "FAQ",
      servicesLabel: "Transferleistungen",
      contact: "Kontakt",
      whatsapp: "WhatsApp schreiben",
      status: "24/7 erreichbar - schnelle Antwort",
      rights: "© 2026 Nokta Transfer. Alle Rechte vorbehalten.",
      designer: "Seitendesigner Asil Uzunoglu"
    },
    ru: {
      quick: "Быстрые ссылки",
      home: "Главная",
      areas: "Районы",
      pricing: "Цены",
      faq: "FAQ",
      servicesLabel: "Услуги трансфера",
      contact: "Контакты",
      whatsapp: "Написать в WhatsApp",
      status: "24/7 на связи - быстрый ответ",
      rights: "© 2026 Nokta Transfer. Все права защищены.",
      designer: "Дизайн сайта Asil Uzunoglu"
    },
    uk: {
      quick: "Швидкі посилання",
      home: "Головна",
      areas: "Райони",
      pricing: "Ціни",
      faq: "FAQ",
      servicesLabel: "Послуги трансферу",
      contact: "Контакти",
      whatsapp: "Написати в WhatsApp",
      status: "24/7 на зв'язку - швидка відповідь",
      rights: "© 2026 Nokta Transfer. Усі права захищені.",
      designer: "Дизайн сайту Asil Uzunoglu"
    }
  }[lang] || {};

  return `<footer class="site-footer">
      <div class="wrap footer-grid">
        <div class="footer-brand">
          <a class="footer-logo" href="${prefix}index.html#anasayfa" aria-label="Nokta Transfer anasayfa">
            <img src="${prefix}assets/nokta-transfer-logo.jpeg" alt="" />
            <span><b>NOKTA</b> TRANSFER</span>
          </a>
          <p>${escapeHtml(text)}</p>
        </div>

        <nav class="footer-links" aria-label="Alt menü">
          <h2>${copy.quick}</h2>
          <a href="${lang === "tr" ? `${prefix}index.html#anasayfa` : `${prefix}${lang}/`}">${copy.home}</a>
          <a href="${lang === "tr" ? `${prefix}ilceler.html` : getDistrictGuideHref(prefix, lang)}">${copy.areas}</a>
          <a href="${prefix}index.html#fiyat">${copy.pricing}</a>
          <a href="${lang === "tr" ? `${prefix}index.html#sss` : "#language-faq"}">${copy.faq}</a>
        </nav>

        <nav class="footer-links footer-service-links" aria-label="Transfer hizmetleri">
          <h2>${copy.servicesLabel}</h2>
          ${getPrimaryServiceLinks(prefix, 8)}
        </nav>

        <div class="footer-contact">
          <h2>${copy.contact}</h2>
          <a href="${prefix}telefon-donusum.html">0506 043 65 91</a>
          <a href="${prefix}whatsapp-donusum.html">${copy.whatsapp}</a>
          <span>${copy.status}</span>
        </div>
      </div>

      <div class="wrap footer-bottom">
        <p>${copy.rights}</p>
        <a href="https://www.asiluzunoglu.com/" target="_blank" rel="noopener">${copy.designer}</a>
      </div>
    </footer>`;
}

function headerTemplate(prefix, current = "home", currentLang = "tr") {
  const copy = {
    tr: {
      home: "Anasayfa",
      areas: "Hizmet Bölgeleri",
      guide: "İzmir ilçe transfer rehberi",
      pricing: "Fiyatlandırma",
      faq: "S.S.S.",
      call: "Hemen Ara"
    },
    en: {
      home: "Home",
      areas: "Services",
      guide: "Izmir transfer guide",
      pricing: "Pricing",
      faq: "FAQ",
      call: "Call Now"
    },
    de: {
      home: "Start",
      areas: "Leistungen",
      guide: "Izmir Transfer Guide",
      pricing: "Preise",
      faq: "FAQ",
      call: "Anrufen"
    },
    ru: {
      home: "Главная",
      areas: "Услуги",
      guide: "Гид по трансферам Измира",
      pricing: "Цены",
      faq: "FAQ",
      call: "Позвонить"
    },
    uk: {
      home: "Головна",
      areas: "Послуги",
      guide: "Гід трансферів Ізміра",
      pricing: "Ціни",
      faq: "FAQ",
      call: "Подзвонити"
    }
  }[currentLang] || {};
  const homeHref = currentLang === "tr" ? `${prefix}index.html#anasayfa` : `${prefix}${currentLang}/`;
  const areasHref = currentLang === "tr" ? `${prefix}index.html#bolgeler` : "#services";
  const faqHref = currentLang === "tr" ? `${prefix}index.html#sss` : "#language-faq";

  return `<header class="header">
      <div class="wrap nav">
        <a class="logo" href="${prefix}index.html#anasayfa" aria-label="Nokta Transfer">
          <img src="${prefix}assets/nokta-transfer-logo.jpeg" alt="" />
          <span>NOKTA</span> TRANSFER
        </a>
        <nav class="menu" aria-label="Ana menü">
          <a${current === "home" ? ' class="active"' : ""} href="${homeHref}">${copy.home}</a>
          <a${current === "areas" ? ' class="active"' : ""} href="${areasHref}">${copy.areas}</a>
          <a class="menu-taxi${current === "guide" ? " is-current" : ""}" href="${prefix}transfer-rehberi/" aria-label="${copy.guide}">
            <img src="${prefix}assets/taxi-menu-icon.png" alt="" draggable="false" />
          </a>
          <a${current === "pricing" ? ' class="active"' : ""} href="${prefix}index.html#fiyat">${copy.pricing}</a>
          <a href="${faqHref}">${copy.faq}</a>
        </nav>
        <div class="nav-actions">
          ${languageSwitcher(prefix, currentLang)}
          <a class="nav-phone" href="${prefix}telefon-donusum.html">${copy.call}: 0506 043 65 91</a>
        </div>
      </div>
    </header>`;
}

function floatingContact(prefix) {
  return `<div class="floating-contact" aria-label="Hızlı iletişim">
      <a class="float-call" href="${prefix}telefon-donusum.html" aria-label="Telefonla ara">☏</a>
      <a class="float-whatsapp" href="${prefix}whatsapp-donusum.html" aria-label="WhatsApp ile yaz">
        <span class="wa-icon" aria-hidden="true"></span>
      </a>
    </div>`;
}

function getPrimaryServiceLinks(prefix, count = 10) {
  return servicePages
    .slice(0, count)
    .map((page) => `<a href="${prefix}${page.slug}/">${escapeHtml(page.name)}</a>`)
    .join("");
}

const districtGuideLocales = {
  tr: {
    lang: "tr",
    code: "TR",
    flag: "🇹🇷",
    label: "Türkçe",
    path: "ilceler.html",
    prefix: "./",
    pagePrefix: "./",
    districtPrefix: "./",
    canonical: `${siteUrl}/ilceler.html`,
    ogLocale: "tr_TR",
    title: "İzmir İlçe Transfer Rehberi | Nokta Transfer Bölgeleri",
    description: "Konak, Bornova, Karşıyaka, Çeşme, Foça, Urla ve tüm İzmir ilçeleri için transfer ve havalimanı ulaşım rehberi.",
    kicker: "İZMİR İLÇE TRANSFER REHBERİ",
    h1: "Nokta Transfer Nerelerde?",
    lead: "İzmir'in merkez, sahil ve uzak ilçe hatlarını tek rehberde topladık. İlçenizi seçin, bölgeye özel transfer bilgisini açın.",
    featured: "Öne Çıkan Hatlar",
    popular: "En Çok Bakılan Bölgeler",
    metro: "Merkez İlçeler",
    coast: "Sahil ve Kuzey Hattı",
    south: "İç ve Güney Hatlar",
    cardCta: "Transfer sayfasını aç",
    back: "Ana Sayfaya Dön",
    call: "Telefonla Ara",
    districtTitle: (name) => `${name} Transfer`,
    districtLead: (name, route) => `${name} bölgesinden İzmir merkez, Adnan Menderes Havalimanı, otel, terminal ve şehir dışı rotalara özel transfer. Öne çıkan rota: ${route}.`
  },
  en: {
    lang: "en",
    code: "EN",
    flag: "🇬🇧",
    label: "English",
    path: "en/districts/",
    prefix: "../../",
    pagePrefix: "../",
    districtPrefix: "../",
    canonical: `${siteUrl}/en/districts/`,
    ogLocale: "en_US",
    title: "Izmir District Transfer Guide | Nokta Transfer Service Areas",
    description: "Izmir district transfer guide in English. Airport pickup, hotel transfer and private transportation for Konak, Bornova, Karsiyaka, Cesme, Urla and all districts.",
    kicker: "IZMIR DISTRICT TRANSFER GUIDE",
    h1: "Where Nokta Transfer Serves",
    lead: "Find private transfer information for Izmir city districts, coastal towns and airport routes in English.",
    featured: "Featured Routes",
    popular: "Most Requested Areas",
    metro: "Central Districts",
    coast: "Coastal and Northern Line",
    south: "Inner and Southern Routes",
    cardCta: "Open transfer page",
    back: "Back to Home",
    call: "Call Now",
    districtTitle: (name) => `${name} Transfer in Izmir`,
    districtLead: (name, route) => `Private transfer from ${name} to Izmir city center, Adnan Menderes Airport, hotels, terminals and long-distance routes. Popular route: ${route}.`
  },
  de: {
    lang: "de",
    code: "DE",
    flag: "🇩🇪",
    label: "Deutsch",
    path: "de/bezirke/",
    prefix: "../../",
    pagePrefix: "../",
    districtPrefix: "../",
    canonical: `${siteUrl}/de/bezirke/`,
    ogLocale: "de_DE",
    title: "Izmir Bezirke Transfer Guide | Nokta Transfer Servicegebiete",
    description: "Deutschsprachiger Transfer Guide für Izmir Bezirke. Flughafen Transfer, Hotel Transfer und privater Fahrservice für Konak, Bornova, Karsiyaka, Cesme, Urla und alle Bezirke.",
    kicker: "IZMIR BEZIRKE TRANSFER GUIDE",
    h1: "Wo Nokta Transfer fährt",
    lead: "Finden Sie private Transferinformationen für zentrale Bezirke, Küstenorte und Flughafenrouten in Izmir auf Deutsch.",
    featured: "Wichtige Routen",
    popular: "Häufig gesuchte Gebiete",
    metro: "Zentrale Bezirke",
    coast: "Küsten- und Nordlinie",
    south: "Innere und südliche Routen",
    cardCta: "Transferseite öffnen",
    back: "Zur Startseite",
    call: "Jetzt anrufen",
    districtTitle: (name) => `${name} Transfer in Izmir`,
    districtLead: (name, route) => `Privater Transfer von ${name} ins Zentrum von Izmir, zum Flughafen Adnan Menderes, zu Hotels, Terminals und Langstrecken. Beliebte Route: ${route}.`
  },
  ru: {
    lang: "ru",
    code: "RU",
    flag: "🇷🇺",
    label: "Русский",
    path: "ru/rajony/",
    prefix: "../../",
    pagePrefix: "../",
    districtPrefix: "../",
    canonical: `${siteUrl}/ru/rajony/`,
    ogLocale: "ru_RU",
    title: "Районы Измира | Гид по трансферу Nokta Transfer",
    description: "Гид по районам Измира на русском языке. Трансфер из аэропорта, поездки в отель и частный водитель для Konak, Bornova, Karsiyaka, Cesme, Urla и всех районов.",
    kicker: "ГИД ПО РАЙОНАМ ИЗМИРА",
    h1: "Где работает Nokta Transfer",
    lead: "Выберите район Измира и откройте страницу с информацией о частном трансфере, аэропорте, отеле и дальних маршрутах на русском языке.",
    featured: "Популярные маршруты",
    popular: "Часто выбираемые районы",
    metro: "Центральные районы",
    coast: "Побережье и север",
    south: "Юг и внутренние районы",
    cardCta: "Открыть страницу",
    back: "На главную",
    call: "Позвонить",
    districtTitle: (name) => `Трансфер ${name} в Измире`,
    districtLead: (name, route) => `Частный трансфер из ${name} в центр Измира, аэропорт Adnan Menderes, отели, терминалы и междугородние направления. Популярный маршрут: ${route}.`
  },
  uk: {
    lang: "uk",
    code: "UK",
    flag: "🇺🇦",
    label: "Українська",
    path: "uk/raiony/",
    prefix: "../../",
    pagePrefix: "../",
    districtPrefix: "../",
    canonical: `${siteUrl}/uk/raiony/`,
    ogLocale: "uk_UA",
    title: "Райони Ізміра | Гід трансферів Nokta Transfer",
    description: "Гід районами Ізміра українською мовою. Трансфер з аеропорту, поїздки до готелю та приватний водій для Konak, Bornova, Karsiyaka, Cesme, Urla і всіх районів.",
    kicker: "ГІД РАЙОНАМИ ІЗМІРА",
    h1: "Де працює Nokta Transfer",
    lead: "Оберіть район Ізміра та відкрийте сторінку з інформацією про приватний трансфер, аеропорт, готель і далекі маршрути українською мовою.",
    featured: "Популярні маршрути",
    popular: "Найчастіше обирають",
    metro: "Центральні райони",
    coast: "Узбережжя та північ",
    south: "Південь і внутрішні райони",
    cardCta: "Відкрити сторінку",
    back: "На головну",
    call: "Подзвонити",
    districtTitle: (name) => `Трансфер ${name} в Ізмірі`,
    districtLead: (name, route) => `Приватний трансфер з ${name} до центру Ізміра, аеропорту Adnan Menderes, готелів, терміналів і міжміських напрямків. Популярний маршрут: ${route}.`
  }
};

const guideLanguageCards = Object.values(districtGuideLocales);

function getDistrictGuideHref(prefix, lang = "tr") {
  const guide = districtGuideLocales[lang] || districtGuideLocales.tr;
  return lang === "tr" ? `${prefix}ilceler.html` : `${prefix}${guide.path}`;
}

function getLocalizedDistrictHref(guide, page) {
  return guide.lang === "tr" ? `${guide.districtPrefix}${page.slug}/` : `${guide.districtPrefix}${page.slug}/`;
}

function localizedDetailIntro(guide, name) {
  return {
    en: `${name} area service includes airport pickup, hotel transfer, city center rides, terminal routes and long-distance private transportation with Nokta Transfer.`,
    de: `Der Service in ${name} umfasst Flughafenabholung, Hoteltransfer, Fahrten ins Zentrum, Terminalrouten und private Langstreckenfahrten mit Nokta Transfer.`,
    ru: `Услуга в районе ${name} включает встречу в аэропорту, трансфер в отель, поездки в центр, терминалы и междугородние частные маршруты с Nokta Transfer.`,
    uk: `Послуга в районі ${name} включає зустріч в аеропорту, трансфер до готелю, поїздки в центр, термінали та міжміські приватні маршрути з Nokta Transfer.`
  }[guide.lang] || `${name} transfer service is available with Nokta Transfer.`;
}

function localizedDetailLabels(guide) {
  return {
    en: {
      popular: "Popular transfer needs",
      related: "Related district pages",
      airport: "Adnan Menderes Airport",
      hotel: "Hotel and marina transfer",
      vehicle: "Private sedan / VIP vehicle"
    },
    de: {
      popular: "Beliebte Transferwünsche",
      related: "Verwandte Bezirksseiten",
      airport: "Flughafen Adnan Menderes",
      hotel: "Hotel- und Marina-Transfer",
      vehicle: "Private Limousine / VIP Fahrzeug"
    },
    ru: {
      popular: "Популярные запросы",
      related: "Похожие страницы районов",
      airport: "Аэропорт Adnan Menderes",
      hotel: "Трансфер в отель и марину",
      vehicle: "Private sedan / VIP автомобиль"
    },
    uk: {
      popular: "Популярні запити",
      related: "Схожі сторінки районів",
      airport: "Аеропорт Adnan Menderes",
      hotel: "Трансфер до готелю та марини",
      vehicle: "Private sedan / VIP автомобіль"
    }
  }[guide.lang] || {};
}

function guideAlternates(pagePath = "") {
  const suffix = pagePath ? `${pagePath}/` : "";
  return `    <link rel="alternate" hreflang="tr" href="${siteUrl}${pagePath ? `/${pagePath}/` : "/ilceler.html"}" />
    <link rel="alternate" hreflang="en" href="${siteUrl}/en/${suffix || "districts/"}" />
    <link rel="alternate" hreflang="de" href="${siteUrl}/de/${suffix || "bezirke/"}" />
    <link rel="alternate" hreflang="ru" href="${siteUrl}/ru/${suffix || "rajony/"}" />
    <link rel="alternate" hreflang="uk" href="${siteUrl}/uk/${suffix || "raiony/"}" />
    <link rel="alternate" hreflang="x-default" href="${siteUrl}/transfer-rehberi/" />`;
}

function baseHead({ title, description, canonical, prefix = "../", ogLocale = "tr_TR", alternates = "" }) {
  return `<meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <meta name="google-site-verification" content="8JhMSGWUzM4-ZQO4eWGDDoP2H8L8Ni2cGRH_Tad32oI" />
    <link rel="canonical" href="${canonical}" />
${alternates}
    <link rel="preload" as="image" href="${prefix}assets/izmir-saat-kulesi-hero.webp" type="image/webp" />
    <link rel="icon" href="${prefix}assets/nokta-transfer-logo.jpeg" type="image/jpeg" />
    <link rel="apple-touch-icon" href="${prefix}assets/pwa-icon-192.png" />
    <link rel="manifest" href="${prefix}site.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Nokta Transfer" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Nokta Transfer" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${siteUrl}/assets/nokta-transfer-logo.jpeg" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:locale" content="${ogLocale}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/assets/nokta-transfer-logo.jpeg" />
    <meta name="theme-color" content="#050505" />
    <link rel="stylesheet" href="${prefix}styles.css" />
${googleAdsHeadSnippet()}`;
}

function districtPageTemplate(page) {
  const title = `${page.name} Transfer | ${page.name} Havalimanı ve VIP Ulaşım | Nokta Transfer`;
  const description = `Nokta Transfer ile ${page.name} transfer, ${page.name} havalimanı transfer, şehir içi ve şehir dışı VIP ulaşım hizmeti. 7/24 net fiyat ve konforlu araç.`;
  const whatsappText = encodeURIComponent(`Merhaba Nokta Transfer, ${page.name} transfer hizmeti için bilgi almak istiyorum.`);
  const districtFaq = [
    [`${page.name} transfer hizmeti hangi rotalarda verilir?`, `${page.name} çıkışlı İzmir merkez, Adnan Menderes Havalimanı, otel, terminal, fuar ve şehir dışı rota talepleri için özel transfer planı yapılır.`],
    [`${page.name} havalimanı transfer fiyatı önceden belli olur mu?`, "Evet. Alınacak yer, varış noktası ve yol tercihi netleştiğinde yolculuk öncesi tahmini ücret bilgisi paylaşılır."],
    [`${page.name} için gece araç çağırabilir miyim?`, "Uygun araç durumuna göre 7/24 destek verilir. Gece yolculukları, uçuş saatleri ve erken saat transferleri için hızlı iletişim sağlanır."]
  ];
  const relatedPages = districtPages
    .filter((item) => item.slug !== page.slug && item.zone === page.zone)
    .slice(0, 6)
    .map((item) => `<a href="../${item.slug}/">${escapeHtml(item.name)} Transfer</a>`)
    .join("");

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${page.name} Transfer`,
    serviceType: `${page.name} havalimanı transfer ve şehir içi ulaşım`,
    areaServed: {
      "@type": "Place",
      name: `${page.name}, İzmir`
    },
    provider: {
      "@id": `${siteUrl}/#business`
    },
    url: `${siteUrl}/${page.slug}/`,
    description
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: districtFaq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Nokta Transfer", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "İlçe Transfer Rehberi", item: `${siteUrl}/ilceler.html` },
      { "@type": "ListItem", position: 3, name: `${page.name} Transfer`, item: `${siteUrl}/${page.slug}/` }
    ]
  };

  return `<!doctype html>
<html lang="tr">
  <head>
    ${baseHead({ title, description, canonical: `${siteUrl}/${page.slug}/` })}
    <script type="application/ld+json">${jsonLd(serviceSchema)}</script>
    <script type="application/ld+json">${jsonLd(faqSchema)}</script>
    <script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script>
  </head>
  <body class="seo-page">
    ${headerTemplate("../", "guide")}

    <main>
      <section class="seo-hero">
        <div class="wrap seo-hero-inner">
          <span class="section-kicker">${escapeHtml(page.zone.toUpperCase())} TRANSFER HATTI</span>
          <h1>${escapeHtml(page.name)} Transfer</h1>
          <p>${escapeHtml(page.name)} bölgesinden İzmir merkez, Adnan Menderes Havalimanı, otel, terminal ve şehir dışı rotalara 7/24 özel transfer hizmeti.</p>
          <div class="seo-cta">
            <a href="../telefon-donusum.html">Telefonla Ara</a>
            <a href="../whatsapp-donusum.html?text=${whatsappText}" target="_blank" rel="noopener">WhatsApp ile Bilgi Al</a>
            <button type="button" data-install-app><span data-install-text>Uygulama İndir</span></button>
          </div>
        </div>
      </section>

      <section class="section seo-content">
        <div class="wrap seo-grid">
          <article class="seo-card seo-main-card">
            <span class="district-label">${escapeHtml(page.note)}</span>
            <h2>${escapeHtml(page.name)} Havalimanı Transfer</h2>
            <p>
              ${escapeHtml(page.name)} transfer hizmetinde amaç yolculuğu baştan netleştirmek, konforlu aracı doğru noktaya yönlendirmek ve sürpriz ücret yaşamadan ulaşım sağlamaktır. Nokta Transfer; ${escapeHtml(page.name)} havalimanı transfer, şehir içi transfer, VIP araç ve uzun mesafe transfer taleplerinde 7/24 destek verir.
            </p>
            <p>
              En çok kullanılan rota: <strong>${escapeHtml(page.route)}</strong>. Araç talebinde alınacak yer, gidilecek yer ve saat bilgisi netleştirilir; uygun araç seçeneği ve tahmini ücret yolculuk öncesi paylaşılır.
            </p>
          </article>

          <aside class="seo-card">
            <h2>Öne Çıkan Hizmetler</h2>
            <ul class="seo-list">
              <li>${escapeHtml(page.name)} şehir içi transfer</li>
              <li>${escapeHtml(page.name)} Adnan Menderes Havalimanı transfer</li>
              <li>${escapeHtml(page.name)} VIP transfer</li>
              <li>${escapeHtml(page.name)} otel ve terminal transferi</li>
              <li>Net fiyat, konforlu araç, 7/24 iletişim</li>
            </ul>
          </aside>

          <article class="seo-card">
            <h2>Neden Nokta Transfer?</h2>
            <p>
              İzmir'de transfer hizmeti arayan yolcular için hızlı iletişim, temiz araç, sürücü desteği ve rota öncesi fiyat bilgisi önemlidir. Nokta Transfer bu süreci sade tutar: konumu paylaşın, rota netleşsin, araç yönlendirilsin.
            </p>
          </article>

          <article class="seo-card">
            <h2>${escapeHtml(page.name)} Transfer S.S.S.</h2>
            <div class="seo-faq-mini">
              ${districtFaq
                .map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`)
                .join("\n              ")}
            </div>
          </article>

          <article class="seo-card">
            <h2>Yakın Bölge Sayfaları</h2>
            <div class="seo-links">
              ${relatedPages}
              ${getPrimaryServiceLinks("../", 4)}
              <a href="../ilceler.html">Tüm İzmir İlçeleri</a>
            </div>
          </article>
        </div>
      </section>
    </main>

    ${siteFooter("../")}
    ${floatingContact("../")}
    <script src="../script.js"></script>
  </body>
</html>`;
}

function servicePageTemplate(page) {
  const whatsappText = encodeURIComponent(`Merhaba Nokta Transfer, ${page.name} hizmeti için bilgi almak istiyorum.`);
  const relatedServices = servicePages
    .filter((item) => item.slug !== page.slug)
    .slice(0, 6)
    .map((item) => `<a href="../${item.slug}/">${escapeHtml(item.name)}</a>`)
    .join("");
  const districtLinks = districtPages
    .filter((item) => ["Çeşme", "Urla", "Karşıyaka", "Bornova", "Foça", "Selçuk"].includes(item.name))
    .map((item) => `<a href="../${item.slug}/">${escapeHtml(item.name)} Transfer</a>`)
    .join("");

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.name,
    serviceType: page.name,
    provider: {
      "@id": `${siteUrl}/#business`
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "İzmir"
    },
    url: `${siteUrl}/${page.slug}/`,
    description: page.description
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Nokta Transfer", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: page.name, item: `${siteUrl}/${page.slug}/` }
    ]
  };

  return `<!doctype html>
<html lang="tr">
  <head>
    ${baseHead({ title: page.title, description: page.description, canonical: `${siteUrl}/${page.slug}/` })}
    <script type="application/ld+json">${jsonLd(serviceSchema)}</script>
    <script type="application/ld+json">${jsonLd(faqSchema)}</script>
    <script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script>
  </head>
  <body class="seo-page">
    ${headerTemplate("../", "guide")}

    <main>
      <section class="seo-hero service-seo-hero">
        <div class="wrap seo-hero-inner">
          <span class="section-kicker">${escapeHtml(page.kicker)}</span>
          <h1>${escapeHtml(page.name)}</h1>
          <p>${escapeHtml(page.lead)}</p>
          <div class="seo-cta">
            <a href="../telefon-donusum.html">Telefonla Ara</a>
            <a href="../whatsapp-donusum.html?text=${whatsappText}" target="_blank" rel="noopener">WhatsApp ile Bilgi Al</a>
            <button type="button" data-install-app><span data-install-text>Uygulama İndir</span></button>
          </div>
        </div>
      </section>

      <section class="section seo-content">
        <div class="wrap seo-grid">
          <article class="seo-card seo-main-card">
            <span class="district-label">${escapeHtml(page.route)}</span>
            <h2>${escapeHtml(page.name)} Hizmeti</h2>
            ${page.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n            ")}
          </article>

          <aside class="seo-card">
            <h2>Öne Çıkanlar</h2>
            <ul class="seo-list">
              ${page.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n              ")}
            </ul>
          </aside>

          <article class="seo-card">
            <h2>Sık Sorulanlar</h2>
            <div class="seo-faq-mini">
              ${page.faq
                .map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`)
                .join("\n              ")}
            </div>
          </article>

          <article class="seo-card">
            <h2>İlgili Transfer Sayfaları</h2>
            <div class="seo-links">
              ${relatedServices}
              ${districtLinks}
            </div>
          </article>
        </div>
      </section>
    </main>

    ${siteFooter("../")}
    ${floatingContact("../")}
    <script src="../script.js"></script>
  </body>
</html>`;
}

function languagePageTemplate(page) {
  const canonical = `${siteUrl}/${page.lang}/`;
  const langName = {
    en: "English",
    de: "Deutsch",
    ru: "Русский",
    uk: "Українська"
  }[page.lang] || "English";
  const greeting = {
    en: "Hello",
    de: "Hallo",
    ru: "Здравствуйте",
    uk: "Вітаю"
  }[page.lang] || "Hello";
  const whatsappText = encodeURIComponent(`${greeting} Nokta Transfer, I would like information about Izmir transfer service.`);
  const alternates = `    <link rel="alternate" hreflang="tr" href="${siteUrl}/" />
    <link rel="alternate" hreflang="en" href="${siteUrl}/en/" />
    <link rel="alternate" hreflang="de" href="${siteUrl}/de/" />
    <link rel="alternate" hreflang="ru" href="${siteUrl}/ru/" />
    <link rel="alternate" hreflang="uk" href="${siteUrl}/uk/" />
    <link rel="alternate" hreflang="x-default" href="${siteUrl}/" />`;

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#business`,
    name: "Nokta Transfer",
    image: `${siteUrl}/assets/nokta-transfer-logo.jpeg`,
    telephone: "+905060436591",
    geo: {
      "@type": "GeoCoordinates",
      latitude: 38.4237,
      longitude: 27.1428
    },
    areaServed: {
      "@type": "City",
      name: "Izmir"
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Izmir",
      addressCountry: "TR"
    },
    url: canonical,
    priceRange: "₺₺",
    openingHours: "Mo-Su 00:00-23:59",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+905060436591",
      contactType: "customer service",
      areaServed: "TR",
      availableLanguage: ["Turkish", "English", "German", "Russian", "Ukrainian"]
    },
    description: page.description
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer
      }
    }))
  };

  return `<!doctype html>
<html lang="${page.lang}">
  <head>
    ${baseHead({
      title: page.title,
      description: page.description,
      canonical,
      prefix: "../",
      ogLocale: {
        de: "de_DE",
        ru: "ru_RU",
        uk: "uk_UA"
      }[page.lang] || "en_US",
      alternates
    })}
    <script type="application/ld+json">${jsonLd(localBusinessSchema)}</script>
    <script type="application/ld+json">${jsonLd(faqSchema)}</script>
  </head>
  <body class="seo-page language-page">
    ${headerTemplate("../", "home", page.lang)}

    <main>
      <section class="seo-hero language-hero">
        <div class="wrap seo-hero-inner">
          <span class="section-kicker">${escapeHtml(page.kicker)}</span>
          <h1>${escapeHtml(page.h1)}</h1>
          <p>${escapeHtml(page.lead)}</p>
          <div class="seo-cta">
            <a href="../telefon-donusum.html">${escapeHtml(page.primary)}</a>
            <a href="../whatsapp-donusum.html?text=${whatsappText}" target="_blank" rel="noopener">${escapeHtml(page.secondary)}</a>
          </div>
        </div>
      </section>

      <section class="section seo-content" id="services">
        <div class="wrap language-intro">
          <span class="section-kicker">${escapeHtml(langName)} Service Page</span>
          <h2>${escapeHtml(page.servicesTitle)}</h2>
          <p>${escapeHtml(page.servicesLead)}</p>
          <div class="language-guide-link">
            <a href="${getDistrictGuideHref("../", page.lang)}">${escapeHtml(page.routesTitle)}</a>
          </div>
        </div>

        <div class="wrap language-grid">
          ${page.services
            .map(
              ([title, text], index) => `<article class="seo-card language-card reveal${index ? ` delay-${Math.min(index, 2)}` : ""}">
            <span class="district-label">0${index + 1}</span>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(text)}</p>
          </article>`
            )
            .join("\n          ")}
        </div>

        <div class="wrap seo-grid language-seo-grid">
          <article class="seo-card">
            <h2>${escapeHtml(page.routesTitle)}</h2>
            <ul class="seo-list">
              ${page.routes.map((route) => `<li>${escapeHtml(route)}</li>`).join("\n              ")}
            </ul>
          </article>

          <article class="seo-card" id="language-faq">
            <h2>${escapeHtml(page.faqTitle)}</h2>
            <div class="seo-faq-mini">
              ${page.faq
                .map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`)
                .join("\n              ")}
            </div>
          </article>
        </div>
      </section>
    </main>

    ${siteFooter("../", page.footerText, page.lang)}
    ${floatingContact("../")}
    <script src="../script.js"></script>
  </body>
</html>`;
}

function guideGatewayTemplate() {
  const title = "Nokta Transfer Rehberi | Çok Dilli İzmir Transfer Bölgeleri";
  const description = "Nokta Transfer İzmir ilçe ve rota rehberi. Türkçe, İngilizce, Almanca, Rusça ve Ukraynaca transfer bölge sayfaları.";
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nokta Transfer Çok Dilli Rehber",
    url: `${siteUrl}/transfer-rehberi/`,
    inLanguage: ["tr-TR", "en-US", "de-DE", "ru-RU", "uk-UA"],
    about: "İzmir transfer bölgeleri ve çok dilli ilçe rehberleri",
    provider: {
      "@id": `${siteUrl}/#business`
    }
  };

  return `<!doctype html>
<html lang="tr">
  <head>
    ${baseHead({
      title,
      description,
      canonical: `${siteUrl}/transfer-rehberi/`,
      prefix: "../",
      alternates: `    <link rel="alternate" hreflang="tr" href="${siteUrl}/transfer-rehberi/" />
    <link rel="alternate" hreflang="en" href="${siteUrl}/en/districts/" />
    <link rel="alternate" hreflang="de" href="${siteUrl}/de/bezirke/" />
    <link rel="alternate" hreflang="ru" href="${siteUrl}/ru/rajony/" />
    <link rel="alternate" hreflang="uk" href="${siteUrl}/uk/raiony/" />
    <link rel="alternate" hreflang="x-default" href="${siteUrl}/transfer-rehberi/" />`
    })}
    <script type="application/ld+json">${jsonLd(collectionSchema)}</script>
  </head>
  <body class="district-page guide-gateway-page">
    ${headerTemplate("../", "guide")}

    <main>
      <section class="district-page-hero guide-gateway-hero">
        <div class="wrap guide-gateway-shell">
          <div class="district-page-copy reveal">
            <span class="section-kicker">ÇOK DİLLİ TRANSFER REHBERİ</span>
            <h1>İzmir Transfer <span>Dilini Seç</span></h1>
            <p>
              İzmir ilçeleri, havalimanı transferi, sahil hattı ve şehir dışı rotalar için hazırlanan rehberi kendi dilinizde açın.
            </p>
          </div>

          <div class="guide-language-grid reveal delay-1" aria-label="Rehber dili seçimi">
            ${guideLanguageCards
              .map(
                (item) => `<a class="guide-language-card" href="../${item.path}" lang="${item.lang}">
              <span>${item.flag}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <small>${escapeHtml(item.kicker)}</small>
            </a>`
              )
              .join("\n            ")}
          </div>
        </div>
      </section>
    </main>

    ${siteFooter("../")}
    ${floatingContact("../")}
    <script src="../script.js"></script>
  </body>
</html>`;
}

function districtCards(pages, guide) {
  return pages
    .map(
      (page) => `<a class="localized-district-card" href="${getLocalizedDistrictHref(guide, page)}">
                <span>${escapeHtml(page.zone)}</span>
                <strong>${escapeHtml(guide.districtTitle(page.name))}</strong>
                <small>${escapeHtml(guide.districtLead(page.name, page.route))}</small>
                <b>${escapeHtml(guide.cardCta)}</b>
              </a>`
    )
    .join("\n              ");
}

function localizedDistrictGuideTemplate(guide) {
  const featured = ["konak-transfer", "cesme-transfer", "bornova-transfer", "karsiyaka-transfer", "buca-transfer", "gaziemir-transfer", "mordogan-transfer", "gumuldur-transfer"];
  const featuredPages = featured.map((slug) => districtPages.find((page) => page.slug === slug)).filter(Boolean);
  const metroPages = districtPages.filter((page) => ["Merkez"].includes(page.zone));
  const coastPages = districtPages.filter((page) => ["Sahil", "Kuzey"].includes(page.zone));
  const southPages = districtPages.filter((page) => ["Güney"].includes(page.zone));
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: guide.title,
    url: guide.canonical,
    inLanguage: guide.lang,
    about: guide.description,
    provider: {
      "@id": `${siteUrl}/#business`
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: districtPages.map((page, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: guide.districtTitle(page.name),
        url: `${siteUrl}/${guide.lang}/${page.slug}/`
      }))
    }
  };

  return `<!doctype html>
<html lang="${guide.lang}">
  <head>
    ${baseHead({
      title: guide.title,
      description: guide.description,
      canonical: guide.canonical,
      prefix: guide.prefix,
      ogLocale: guide.ogLocale,
      alternates: guideAlternates()
    })}
    <script type="application/ld+json">${jsonLd(collectionSchema)}</script>
  </head>
  <body class="district-page localized-district-page">
    ${headerTemplate(guide.prefix, "guide", guide.lang)}

    <main>
      <section class="district-page-hero">
        <div class="wrap district-page-shell">
          <div class="district-page-copy reveal">
            <span class="section-kicker">${escapeHtml(guide.kicker)}</span>
            <h1>${escapeHtml(guide.h1)}</h1>
            <p>${escapeHtml(guide.lead)}</p>
            <div class="district-page-actions" aria-label="Quick actions">
              <a href="${guide.prefix}${guide.lang}/">${escapeHtml(guide.back)}</a>
              <a href="${guide.prefix}telefon-donusum.html">${escapeHtml(guide.call)}</a>
            </div>
          </div>

          <aside class="district-detail-card guide-language-panel reveal delay-1">
            <span class="district-label">LANGUAGE</span>
            <h2>${guide.flag} ${escapeHtml(guide.label)}</h2>
            <p>${escapeHtml(guide.description)}</p>
            <div class="guide-mini-languages">
              ${guideLanguageCards
                .map((item) => `<a href="${guide.prefix}${item.path}" lang="${item.lang}"${item.lang === guide.lang ? ' class="is-active" aria-current="page"' : ""}>${item.flag} ${escapeHtml(item.label)}</a>`)
                .join("\n              ")}
            </div>
          </aside>
        </div>
      </section>

      <section class="section district-guide district-guide-page">
        <div class="wrap localized-district-directory">
          <article class="district-panel district-feature reveal">
            <span class="district-label">${escapeHtml(guide.featured)}</span>
            <h3>${escapeHtml(guide.popular)}</h3>
            <div class="localized-district-grid">
              ${districtCards(featuredPages, guide)}
            </div>
          </article>

          <article class="district-panel reveal delay-1">
            <span class="district-label">METRO</span>
            <h3>${escapeHtml(guide.metro)}</h3>
            <div class="localized-district-grid">
              ${districtCards(metroPages, guide)}
            </div>
          </article>

          <article class="district-panel reveal delay-2">
            <span class="district-label">COAST</span>
            <h3>${escapeHtml(guide.coast)}</h3>
            <div class="localized-district-grid">
              ${districtCards(coastPages, guide)}
            </div>
          </article>

          <article class="district-panel reveal">
            <span class="district-label">SOUTH</span>
            <h3>${escapeHtml(guide.south)}</h3>
            <div class="localized-district-grid">
              ${districtCards(southPages, guide)}
            </div>
          </article>
        </div>
      </section>
    </main>

    ${siteFooter(guide.prefix, undefined, guide.lang)}
    ${floatingContact(guide.prefix)}
    <script src="${guide.prefix}script.js"></script>
  </body>
</html>`;
}

function localizedDistrictPageTemplate(page, guide) {
  const pageTitle = guide.districtTitle(page.name);
  const description = guide.districtLead(page.name, page.route);
  const whatsappText = encodeURIComponent(`${pageTitle} - ${page.route}`);
  const detailLabels = localizedDetailLabels(guide);
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: pageTitle,
    serviceType: pageTitle,
    areaServed: {
      "@type": "Place",
      name: `${page.name}, Izmir`
    },
    provider: {
      "@id": `${siteUrl}/#business`
    },
    url: `${siteUrl}/${guide.lang}/${page.slug}/`,
    description
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Nokta Transfer", item: `${siteUrl}/${guide.lang}/` },
      { "@type": "ListItem", position: 2, name: guide.h1, item: guide.canonical },
      { "@type": "ListItem", position: 3, name: pageTitle, item: `${siteUrl}/${guide.lang}/${page.slug}/` }
    ]
  };

  return `<!doctype html>
<html lang="${guide.lang}">
  <head>
    ${baseHead({
      title: `${pageTitle} | Nokta Transfer`,
      description,
      canonical: `${siteUrl}/${guide.lang}/${page.slug}/`,
      prefix: "../../",
      ogLocale: guide.ogLocale,
      alternates: guideAlternates(page.slug)
    })}
    <script type="application/ld+json">${jsonLd(serviceSchema)}</script>
    <script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script>
  </head>
  <body class="seo-page localized-district-detail-page">
    ${headerTemplate("../../", "guide", guide.lang)}

    <main>
      <section class="seo-hero">
        <div class="wrap seo-hero-inner">
          <span class="section-kicker">${escapeHtml(page.zone)} / ${escapeHtml(guide.label)}</span>
          <h1>${escapeHtml(pageTitle)}</h1>
          <p>${escapeHtml(description)}</p>
          <div class="seo-cta">
            <a href="../../telefon-donusum.html">${escapeHtml(guide.call)}</a>
            <a href="../../whatsapp-donusum.html?text=${whatsappText}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </section>

      <section class="section seo-content">
        <div class="wrap seo-grid">
          <article class="seo-card seo-main-card">
            <span class="district-label">${escapeHtml(page.note)}</span>
            <h2>${escapeHtml(pageTitle)}</h2>
            <p>${escapeHtml(description)}</p>
            <p>${escapeHtml(localizedDetailIntro(guide, page.name))}</p>
          </article>

          <aside class="seo-card">
            <h2>${escapeHtml(detailLabels.popular)}</h2>
            <ul class="seo-list">
              <li>${escapeHtml(page.route)}</li>
              <li>${escapeHtml(detailLabels.airport)}</li>
              <li>${escapeHtml(detailLabels.hotel)}</li>
              <li>${escapeHtml(detailLabels.vehicle)}</li>
            </ul>
          </aside>

          <article class="seo-card">
            <h2>${escapeHtml(detailLabels.related)}</h2>
            <div class="seo-links">
              <a href="${getDistrictGuideHref("../../", guide.lang)}">${escapeHtml(guide.h1)}</a>
              ${districtPages
                .filter((item) => item.slug !== page.slug && item.zone === page.zone)
                .slice(0, 6)
                .map((item) => `<a href="../${item.slug}/">${escapeHtml(guide.districtTitle(item.name))}</a>`)
                .join("\n              ")}
            </div>
          </article>
        </div>
      </section>
    </main>

    ${siteFooter("../../", undefined, guide.lang)}
    ${floatingContact("../../")}
    <script src="../../script.js"></script>
  </body>
</html>`;
}

for (const page of districtPages) {
  const dir = `dist/${page.slug}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, districtPageTemplate(page), "utf8");
}

await mkdir("dist/transfer-rehberi", { recursive: true });
await writeFile("dist/transfer-rehberi/index.html", guideGatewayTemplate(), "utf8");

for (const page of servicePages) {
  const dir = `dist/${page.slug}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, servicePageTemplate(page), "utf8");
}

for (const page of languagePages) {
  const dir = `dist/${page.lang}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, languagePageTemplate(page), "utf8");
}

for (const guide of guideLanguageCards.filter((item) => item.lang !== "tr")) {
  await mkdir(`dist/${guide.path}`, { recursive: true });
  await writeFile(`dist/${guide.path}index.html`, localizedDistrictGuideTemplate(guide), "utf8");

  for (const page of districtPages) {
    const dir = `dist/${guide.lang}/${page.slug}`;
    await mkdir(dir, { recursive: true });
    await writeFile(`${dir}/index.html`, localizedDistrictPageTemplate(page, guide), "utf8");
  }
}

const sitemapUrls = [
  { loc: `${siteUrl}/`, priority: "1.0" },
  ...languagePages.map((page) => ({ loc: `${siteUrl}/${page.lang}/`, priority: "0.9" })),
  { loc: `${siteUrl}/transfer-rehberi/`, priority: "0.84" },
  { loc: `${siteUrl}/ilceler.html`, priority: "0.82" },
  ...guideLanguageCards
    .filter((guide) => guide.lang !== "tr")
    .map((guide) => ({ loc: `${siteUrl}/${guide.path}`, priority: "0.82" })),
  ...servicePages.map((page) => ({ loc: `${siteUrl}/${page.slug}/`, priority: "0.86" })),
  ...districtPages.map((page) => ({ loc: `${siteUrl}/${page.slug}/`, priority: "0.72" })),
  ...guideLanguageCards
    .filter((guide) => guide.lang !== "tr")
    .flatMap((guide) => districtPages.map((page) => ({ loc: `${siteUrl}/${guide.lang}/${page.slug}/`, priority: "0.7" })))
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${sitemapLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

await writeFile("dist/sitemap.xml", sitemap, "utf8");
