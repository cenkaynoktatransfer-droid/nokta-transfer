import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { districtPages, siteUrl } from "./seo-data.mjs";

const files = [
  "index.html",
  "ilceler.html",
  "styles.css",
  "script.js",
  "robots.txt",
  "sitemap.xml",
  "assets"
];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of files) {
  await cp(file, `dist/${file}`, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pageTemplate(page) {
  const title = `${page.name} Transfer | ${page.name} Havalimanı ve VIP Ulaşım | Nokta Transfer`;
  const description = `Nokta Transfer ile ${page.name} transfer, ${page.name} havalimanı transfer, şehir içi ve şehir dışı VIP ulaşım hizmeti. 7/24 net fiyat ve konforlu araç.`;
  const whatsappText = encodeURIComponent(`Merhaba Nokta Transfer, ${page.name} transfer hizmeti için bilgi almak istiyorum.`);
  const relatedPages = districtPages
    .filter((item) => item.slug !== page.slug && item.zone === page.zone)
    .slice(0, 6)
    .map((item) => `<a href="../${item.slug}/">${escapeHtml(item.name)} Transfer</a>`)
    .join("");

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <meta name="google-site-verification" content="8JhMSGWUzM4-ZQO4eWGDDoP2H8L8Ni2cGRH_Tad32oI" />
    <link rel="canonical" href="${siteUrl}/${page.slug}/" />
    <link rel="preload" as="image" href="../assets/izmir-saat-kulesi-hero.webp" type="image/webp" />
    <link rel="icon" href="../assets/nokta-transfer-logo.jpeg" type="image/jpeg" />
    <link rel="apple-touch-icon" href="../assets/nokta-transfer-logo.jpeg" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${siteUrl}/assets/nokta-transfer-logo.jpeg" />
    <meta property="og:url" content="${siteUrl}/${page.slug}/" />
    <meta property="og:locale" content="tr_TR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/assets/nokta-transfer-logo.jpeg" />
    <meta name="theme-color" content="#050505" />
    <link rel="stylesheet" href="../styles.css" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "${escapeHtml(page.name)} Transfer",
        "serviceType": "${escapeHtml(page.name)} havalimanı transfer ve şehir içi ulaşım",
        "areaServed": {
          "@type": "Place",
          "name": "${escapeHtml(page.name)}, İzmir"
        },
        "provider": {
          "@id": "${siteUrl}/#business"
        },
        "url": "${siteUrl}/${page.slug}/",
        "description": "${escapeHtml(description)}"
      }
    </script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Nokta Transfer",
            "item": "${siteUrl}/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "İlçe Transfer Rehberi",
            "item": "${siteUrl}/ilceler.html"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "${escapeHtml(page.name)} Transfer",
            "item": "${siteUrl}/${page.slug}/"
          }
        ]
      }
    </script>
  </head>
  <body class="seo-page">
    <header class="header">
      <div class="wrap nav">
        <a class="logo" href="../index.html#anasayfa" aria-label="Nokta Transfer">
          <img src="../assets/nokta-transfer-logo.jpeg" alt="" />
          <span>NOKTA</span> TRANSFER
        </a>
        <nav class="menu" aria-label="Ana menü">
          <a href="../index.html#anasayfa">Anasayfa</a>
          <a href="../index.html#bolgeler">Hizmet Bölgeleri</a>
          <a class="menu-taxi is-current" href="../ilceler.html" aria-label="İzmir ilçe transfer rehberi">
            <img src="../assets/taxi-menu-icon.png" alt="" draggable="false" />
          </a>
          <a href="../index.html#fiyat">Fiyatlandırma</a>
          <a href="../index.html#sss">S.S.S.</a>
        </nav>
        <a class="nav-phone" href="tel:+905060436591">Hemen Ara: 0506 043 65 91</a>
      </div>
    </header>

    <main>
      <section class="seo-hero">
        <div class="wrap seo-hero-inner">
          <span class="section-kicker">${escapeHtml(page.zone.toUpperCase())} TRANSFER HATTI</span>
          <h1>${escapeHtml(page.name)} Transfer</h1>
          <p>${escapeHtml(page.name)} bölgesinden İzmir merkez, Adnan Menderes Havalimanı, otel, terminal ve şehir dışı rotalara 7/24 özel transfer hizmeti.</p>
          <div class="seo-cta">
            <a href="tel:+905060436591">Telefonla Ara</a>
            <a href="https://wa.me/905060436591?text=${whatsappText}" target="_blank" rel="noopener">WhatsApp ile Bilgi Al</a>
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

    <div class="floating-contact" aria-label="Hızlı iletişim">
      <a class="float-call" href="tel:+905060436591" aria-label="Telefonla ara">☏</a>
      <a class="float-whatsapp" href="https://wa.me/905060436591" aria-label="WhatsApp ile yaz">
        <span class="wa-icon" aria-hidden="true"></span>
      </a>
    </div>
  </body>
</html>`;
}

for (const page of districtPages) {
  const dir = `dist/${page.slug}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, pageTemplate(page), "utf8");
}

const sitemapUrls = [
  { loc: `${siteUrl}/`, priority: "1.0" },
  { loc: `${siteUrl}/ilceler.html`, priority: "0.8" },
  ...districtPages.map((page) => ({ loc: `${siteUrl}/${page.slug}/`, priority: "0.7" }))
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>2026-05-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

await writeFile("dist/sitemap.xml", sitemap, "utf8");
