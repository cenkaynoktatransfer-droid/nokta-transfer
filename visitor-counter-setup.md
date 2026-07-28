# Nokta Transfer Ziyaretci Sayaci

Sayaç mantığı:

- Tarayıcı her cihaz için `localStorage` içinde tekil bir cihaz kimliği üretir.
- Sunucu bu kimliği hashler ve aynı cihazı ikinci kez saymaz.
- PC ilk kez girerse 1, telefon ilk kez girerse 2, başka cihazlar 3, 4, 5 diye devam eder.
- 1000 ve üzeri sayılar sitede kısaltılır: 1000 = 1K, 1500 = 1,5K, 1000000 = 1M.

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
