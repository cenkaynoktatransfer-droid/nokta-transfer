# Nokta Transfer Google Ads Donusum Kurulumu

Google Ads hesabi icin en mantikli donusumler:

1. `Arac Cagirma / Rota Lead`
   - Site uzerindeki `Simdi Arac Cagir` ve rezervasyon formu icin.
   - Kategori: potansiyel musteri veya form gonderimi.
   - Sayim: bir.
   - Deger: sabit deger kullanilacaksa 1 TRY.
   - Vercel degiskeni: `GOOGLE_ADS_BOOKING_LABEL`

2. `Telefon Aramasi Tiklamasi`
   - Tum `tel:` linkleri icin.
   - Kategori: telefon aramasi veya iletisim.
   - Sayim: bir.
   - Vercel degiskeni: `GOOGLE_ADS_CALL_LABEL`

3. `WhatsApp Tiklamasi`
   - WhatsApp butonlari ve bilgi alma linkleri icin.
   - Kategori: iletisim veya potansiyel musteri.
   - Sayim: bir.
   - Vercel degiskeni: `GOOGLE_ADS_WHATSAPP_LABEL`

Google Ads etiket kimligi:

```text
AW-18102129467
```

Google Ads'te her donusum aksiyonu olusturulduktan sonra `send_to` icindeki etiketin slash sonrasini kopyalayin.

Ornek:

```text
AW-18102129467/AbCdEfGhIjK
```

Buradaki sadece `AbCdEfGhIjK` kismi Vercel environment variable degeridir.

Vercel Environment Variables:

```text
GOOGLE_ADS_ID=AW-18102129467
GOOGLE_ADS_BOOKING_LABEL=...
GOOGLE_ADS_CALL_LABEL=...
GOOGLE_ADS_WHATSAPP_LABEL=...
```

Degiskenler eklendikten sonra Production redeploy yapilmalidir.
