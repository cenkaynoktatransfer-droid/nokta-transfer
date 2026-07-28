# Nokta Transfer Ziyaretci Sayaci

Sayaç mantığı:

- Siteye yapılan her giriş sayaç toplamını artırır.
- Aynı cihazdan tekrar girilirse de yeni ziyaret olarak sayılır.
- En altta görünen sayı toplam giriş sayısıdır.

Kalıcı çalışması için Vercel'de Redis/KV bağlantısı gerekir. Desteklenen environment variable isimleri:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

veya:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Opsiyonel başlangıç sayısı:

```text
VISITOR_COUNTER_BASELINE=0
```

Bu değişkenler yoksa sayaç geliştirme/test için hafızada çalışır; sunucu yeniden başladığında sayı sıfırlanabilir.
