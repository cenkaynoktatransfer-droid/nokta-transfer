# Nokta Transfer Google Ads Kampanya Planı

Bu plan Google Ads Search kampanyası için hazırlandı. Kampanyanın ana amacı telefon araması ve WhatsApp tıklaması almaktır.

## Kampanya

- Kampanya adı: `Nokta Transfer - Izmir Search`
- Kampanya tipi: Search
- Lokasyon: İzmir ve yakın çevre
- Dil: Türkçe
- Dönüşüm hedefleri: Telefon tıklaması, WhatsApp tıklaması, hızlı rezervasyon formu tıklaması
- İlk aşama eşleme: Phrase + bazı marka/işletme Exact
- Bütçe önerisi: düşük bütçede günlük 300-500 TL ile başla, dönüşüm maliyetine göre artır

## Ad Group Yapısı

- `Izmir Transfer`: genel transfer niyeti
- `Havalimani Transfer`: Adnan Menderes ve airport transfer aramaları
- `Uygun Fiyat Transfer`: uygun, ucuz, net fiyat, sabit fiyat aramaları
- `VIP Transfer`: Vito, Mercedes, lüks ve özel araç aramaları
- `Sahil Hatlari`: Çeşme, Alaçatı, Urla, Foça, Seferihisar, Selçuk
- `Merkez Ilceler`: Karşıyaka, Bornova, Konak, Buca, Gaziemir
- `Alternatif Arayanlar`: TAG/Martı/taksi alternatifi arayan kullanıcılar

## Rakip / Marka Kelimeleri

`martı tag`, `tag taksi` gibi kelimeler yalnızca keyword test grubunda tutuldu. Reklam başlıklarında veya açıklamalarda bu markaları kullanma. Google Ads politikası, markanın sadece keyword olarak kullanımıyla reklam metninde kullanımını ayrı değerlendirir; reklam metninde rakip marka kullanımı şikayet ve onay riski doğurabilir.

## Dosyalar

- Keyword import: `ads/google-ads-keywords.csv`
- Negatif keyword import: `ads/google-ads-negative-keywords.csv`
- Reklam metni önerileri: `ads/google-ads-ad-copy.md`

## Dönüşüm Takibi İçin Gerekli Bilgiler

Google Ads panelinden şu değerler alınmalı:

- Google tag id: `AW-XXXXXXXXX`
- Telefon dönüşüm label
- WhatsApp dönüşüm label
- Rezervasyon formu dönüşüm label

Bu bilgiler gelince siteye telefon, WhatsApp ve form tıklaması için dönüşüm eventi bağlanacak.
