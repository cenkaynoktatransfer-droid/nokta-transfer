# Nokta Transfer Ziyaretci Sayaci

Sayaç mantığı:

- Sunucu ziyaretçinin IP adresini güvenli şekilde hashler.
- Aynı IP adresi ikinci kez sayılmaz.
- Yeni IP ilk kez girerse sayaç 1 artar; aynı IP tekrar girerse toplam sayı aynı kalır.
- 1000 ve üzeri sayılar sitede kısaltılır: 1000 = 1K, 1500 = 1,5K, 1000000 = 1M.

Kalıcı çalışması için Vercel'de Upstash Redis bağlantısı gerekir. Canlı Vercel ortamında Redis yoksa sayaç geçici hafızaya düşmez; sıfırlanmış sayı göstermemek için kurulum uyarısı döner.

Desteklenen environment variable isimleri:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

veya:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Alternatif eski isimler de desteklenir:

```text
REDIS_REST_API_URL
REDIS_REST_API_TOKEN
REDIS_REST_URL
REDIS_REST_TOKEN
```

Opsiyonel başlangıç sayısı:

```text
VISITOR_COUNTER_BASELINE=0
```

Yerel geliştirmede geçici hafızayı açmak için:

```text
VISITOR_COUNTER_ALLOW_MEMORY=1
```

Vercel kurulum adımı:

1. Vercel Dashboard > nokta-transfer projesi > Storage veya Marketplace.
2. Upstash Redis ekle ve projeye bağla.
3. Environment Variables içinde `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` oluştuğunu kontrol et.
4. Production redeploy al.
