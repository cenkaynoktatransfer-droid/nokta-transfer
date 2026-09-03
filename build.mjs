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
    de: "Sprachauswahl"
  }[currentLang] || "Dil seçimi";
  const options = [
    { lang: "tr", label: "TR", href: `${prefix}index.html` },
    { lang: "en", label: "EN", href: `${prefix}en/` },
    { lang: "de", label: "DE", href: `${prefix}de/` }
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
      contact: "Kontakt",
      whatsapp: "WhatsApp schreiben",
      status: "24/7 erreichbar - schnelle Antwort",
      rights: "© 2026 Nokta Transfer. Alle Rechte vorbehalten.",
      designer: "Seitendesigner Asil Uzunoglu"
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
          <a href="${lang === "tr" ? `${prefix}ilceler.html` : "#services"}">${copy.areas}</a>
          <a href="${prefix}index.html#fiyat">${copy.pricing}</a>
          <a href="${lang === "tr" ? `${prefix}index.html#sss` : "#language-faq"}">${copy.faq}</a>
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
          <a class="menu-taxi${current === "guide" ? " is-current" : ""}" href="${prefix}ilceler.html" aria-label="${copy.guide}">
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
            <h2>Yakın Bölge Sayfaları</h2>
            <div class="seo-links">
              ${relatedPages}
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
  const langName = page.lang === "en" ? "English" : "Deutsch";
  const whatsappText = encodeURIComponent(`${page.lang === "en" ? "Hello" : "Hallo"} Nokta Transfer, I would like information about Izmir transfer service.`);
  const alternates = `    <link rel="alternate" hreflang="tr" href="${siteUrl}/" />
    <link rel="alternate" hreflang="en" href="${siteUrl}/en/" />
    <link rel="alternate" hreflang="de" href="${siteUrl}/de/" />
    <link rel="alternate" hreflang="x-default" href="${siteUrl}/" />`;

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#business`,
    name: "Nokta Transfer",
    image: `${siteUrl}/assets/nokta-transfer-logo.jpeg`,
    telephone: "+905060436591",
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
      ogLocale: page.lang === "de" ? "de_DE" : "en_US",
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

for (const page of districtPages) {
  const dir = `dist/${page.slug}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, districtPageTemplate(page), "utf8");
}

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

const sitemapUrls = [
  { loc: `${siteUrl}/`, priority: "1.0" },
  { loc: `${siteUrl}/en/`, priority: "0.9" },
  { loc: `${siteUrl}/de/`, priority: "0.9" },
  { loc: `${siteUrl}/ilceler.html`, priority: "0.82" },
  ...servicePages.map((page) => ({ loc: `${siteUrl}/${page.slug}/`, priority: "0.86" })),
  ...districtPages.map((page) => ({ loc: `${siteUrl}/${page.slug}/`, priority: "0.72" }))
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
