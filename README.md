# Dijital Orrery — Güneş · Dünya · Ay

LEGO Technic tarzı mekanik bir **orrery** modelinin dijital, 3D ve tarayıcıda
çalışan karşılığı: merkezde dikey mil üzerinde Güneş, tabanda ay etiketli
takvim halkası, ve seçilen tarihe göre halka üzerinde doğru açıya dönen
Dünya + Ay kolu.

```bash
npm install
npm run dev      # http://localhost:5173
npm run verify   # 45 astronomik doğrulama kontrolü
npm run build
```

## Kullanım

| Etkileşim | Ne yapar |
|---|---|
| Fareyle sürükle | Modeli dikey mil etrafında çevirir (elle çevirme hissi) |
| Tekerlek / pinch | Yakınlaştırma |
| Alt kaydırıcı | Yıl içinde saat çözünürlüğünde gezinme — kol halkada döner |
| Tarih/saat kutusu | Belirli bir ana atlama (UTC) |
| ‹ 2026 › | Yıl değiştirme (halka o yılın gerçek açılarıyla yeniden kurulur) |
| ▶ Oynat + hız | 1 saat/sn ile 30 gün/sn arası otomatik akış |
| Boşluk | Oynat / duraklat |
| ← → | Bir gün ileri/geri (Shift ile bir saat) |
| Kamera düğmeleri | Üstten / perspektif / yandan / Dünya'ya kilitli görünüm |

Tarih adres çubuğuna `?t=2026-06-21T08:24:00Z` olarak yazılır; bağlantı
paylaşılabilir.

## Teknoloji seçimi

- **Three.js** — WebGL tabanlı 3D sahne
- **Vite** — geliştirme ortamı ve build
- **astronomy-engine** — efemeris (`HelioVector`, `GeoVector`, `SiderealTime`,
  `MoonPhase`, `Seasons`)

Önerilen yığın olduğu gibi kullanıldı. Tek sahne ve birkaç DOM panelinden
oluşan bir uygulamada React/react-three-fiber, karşılığını vermeyen bir build
ağırlığı getirirdi.

## Model doğruluğu

Ölçekler **stilizedir** (fiziksel modelde olduğu gibi), açısal ilişkiler
gerçektir:

- **Kolun açısı** `HelioVector(Body.Earth)`'ten türetilen gerçek ekliptik
  boylamdır — "365 günü 360 dereceye böl" değil. Bu yüzden Ocak dilimi
  31.56°, Temmuz dilimi 29.59°'dir: Dünya günberide (ocak başı) daha hızlıdır.
- **Eksen eğikliği** 23.4393° ve *uzayda sabit yönlüdür*. Dünya sistemi bilinçli
  olarak kolun çocuğu değildir; çocuğu olsaydı eksen kolla birlikte döner ve
  mevsimler kaybolurdu. Doğrulama: kutup–Güneş açısı Haziran gündönümünde
  66.56°, Aralıkta 113.44°, ekinokslarda 90.00°.
- **Dünya'nın dönüşü** Greenwich görünür yıldız zamanından gelir; 24 saatte
  360.9856° ilerler.
- **Ay** `GeoVector(Body.Moon)` ile gerçek yönünde durur (~5.1° yörünge eğimi
  dahil), aynı yüzünü Dünya'ya döner, uzaklığı günberi/günöte oranıyla
  ±%6 değişir.
- **Terminatör** Güneş sahnenin orijininde olduğu için shader'da
  `normalize(-worldPosition)` ile tam doğru konumdadır; gece tarafında şehir
  ışıkları görünür.

### Sahne çerçevesi

```
+X = ilkbahar ekinoksu (ekliptik boylam 0°)
-Z = ekliptik boylam 90°
+Y = ekliptik kuzey kutbu
```

Ekliptik düzlem `y = 0`; takvim halkası referans modeldeki gibi bunun altında,
taban seviyesindedir (`SCALE.ringY`).

### Takvim halkasının kapanması

Takvim yılı 365 gün, tropik yıl 365.2422 gündür. Aralık dilimi bir sonraki
yılın 1 Ocak boylamına bağlansaydı halka 359.75°'de kapanır ve arada boşluk
kalırdı. Fiziksel halka gibi tam daire olması için Aralık dilimi *aynı yılın*
1 Ocak boylamına kapanır; artık yıl sapması bu dilime yazılır.

## Dosya yapısı

```
src/
  main.js                 uygulama girişi, durum ve döngü
  config.js               ölçekler, renkler, ekliptik→sahne dönüşümü
  astro/calculations.js   astronomy-engine sarmalayıcıları
  scene/
    sun.js                Güneş, dikey mil, taban göbeği
    calendarRing.js       takvim halkası, ay dilimleri, mevsim işaretleri
    earthMoonArm.js       mekanik kol + Dünya/Ay alt sistemi
    earthMaterial.js      Dünya ve Ay shader'ları (terminatör, şehir ışıkları)
    starfield.js          deterministik yıldız arka planı
    textures.js           texture yükleyici
    textSprite.js         kameraya dönük metin etiketleri
  ui/
    timeControls.js       zaman çubuğu, oynatma, hız, yıl
    infoPanel.js          bilgi paneli + ay fazı çizimi
    cameraViews.js        kamera ön ayarları
scripts/verify.mjs        45 astronomik doğrulama kontrolü
```

## Veri kaynakları

Dünya ve Ay texture'ları: [three.js örnek texture'ları](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets)
(NASA Visible Earth kaynaklı).
