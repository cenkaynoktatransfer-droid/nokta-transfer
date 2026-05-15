# Nokta Transfer Ziyaretci Sayaci

Sayaç mantığı:

- Tarayıcı her cihaz için `localStorage` içinde tekil bir cihaz kimliği üretir.
- Bu kimlik sunucuya gönderilir.
- Sunucu kimliği SHA-256 ile hashler ve aynı cihazı ikinci kez saymaz.
- Cihaz tarayıcı verisini silerse veya farklı tarayıcı kullanırsa yeni cihaz gibi sayılabilir.

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
