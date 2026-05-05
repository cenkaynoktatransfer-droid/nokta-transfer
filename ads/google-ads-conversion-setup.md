# Nokta Transfer Google Ads Donusum Kurulumu

Videoda gorunen uyari:

```text
Donusum izleme ayarlari tamamlanmadi
```

Site tarafi hazirlandi. Artik uc tane donusum URL'i var:

```text
https://www.noktatransfer.com.tr/rezervasyon-donusum.html
https://www.noktatransfer.com.tr/telefon-donusum.html
https://www.noktatransfer.com.tr/whatsapp-donusum.html
```

## En Kolay Kurulum

Google Ads > Hedefler > Donusumler > Yeni donusum islemi > Web sitesi.

Uc ayri donusum olusturun:

1. `Arac Cagirma / Rota Lead`
   - Kategori: Potansiyel musteri
   - Donusum turu: Sayfa yukleme
   - URL kurali: URL `rezervasyon-donusum.html` icerir
   - Sayim: Bir
   - Birincil islem: Evet

2. `Telefon Aramasi Tiklamasi`
   - Kategori: Telefon aramasi veya iletisim
   - Donusum turu: Sayfa yukleme
   - URL kurali: URL `telefon-donusum.html` icerir
   - Sayim: Bir
   - Birincil islem: Evet

3. `WhatsApp Tiklamasi`
   - Kategori: Potansiyel musteri veya iletisim
   - Donusum turu: Sayfa yukleme
   - URL kurali: URL `whatsapp-donusum.html` icerir
   - Sayim: Bir
   - Birincil islem: Evet

Bu yontemde Google Ads label kopyalama gerekmiyor. Kullanici butona bastiginda once donusum sayfasi acilir, Google bunu sayar, sonra otomatik telefon/WhatsApp'a yonlenir.

## Etiket Bilgisi

Aktif Google Ads tag:

```text
AW-18102129467
```

## Ileri Seviye Label Yontemi

Google Ads size `AW-18102129467/XXXXXXX` gibi event snippet verirse slash sonrasi `XXXXXXX` kismini Vercel Environment Variables'a ekleyebilirsiniz:

```text
GOOGLE_ADS_ID=AW-18102129467
GOOGLE_ADS_BOOKING_LABEL=...
GOOGLE_ADS_CALL_LABEL=...
GOOGLE_ADS_WHATSAPP_LABEL=...
```

URL donusumleri kuruluysa label yontemini ayrica acmayin; ayni tiklama iki kez sayilabilir.
