# Dijital Orrery — Güneş · Dünya · Ay

LEGO Technic tarzı bir **orrery** modelinin dijital, 3D ve tarayıcıda çalışan
karşılığı — ama mekanik değil: Güneş, Dünya ve Ay uzayda serbest durur.
Onları yerinde tutan tek şey efemeristen gelen konumlarıdır; kol, mil, taban
ya da bağlantı çubuğu yoktur. Takvim halkası, yörüngenin dışında aynı düzlemde
yüzen bir kadran olarak seçilen tarihin yörünge açısını okutur.

```bash
npm install
npm run dev      # http://localhost:5173
npm run verify   # 45 astronomik doğrulama kontrolü
npm run build
```

## Kullanım

| Etkileşim | Ne yapar |
|---|---|
| Fareyle sürükle | Sahneyi dikey eksen etrafında çevirir |
| Tekerlek / pinch | Yakınlaştırma |
| Alt kaydırıcı | Yıl içinde saat çözünürlüğünde gezinme — Dünya yörüngede ilerler |
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

- **Dünya'nın yörünge açısı** `HelioVector(Body.Earth)`'ten türetilen gerçek
  ekliptik boylamdır — "365 günü 360 dereceye böl" değil. Bu yüzden Ocak dilimi
  31.56°, Temmuz dilimi 29.59°'dir: Dünya günberide (ocak başı) daha hızlıdır.
- **Eksen eğikliği** 23.4393° ve *uzayda sabit yönlüdür*. Eğiklik grubu yörünge
  konumundan bağımsız tutulur; konumla birlikte dönseydi mevsimler kaybolurdu.
  Doğrulama: kutup–Güneş açısı Haziran gündönümünde 66.56°, Aralıkta 113.44°,
  ekinokslarda 90.00°.
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

Her şey ekliptik düzlemdedir (`y = 0`). Dünya 22 birim yarıçapta döner,
Ay ona 3.4 birim uzakta; takvim halkası 27.5–31.8 arasında yüzer, yani Ay'ın
en dış konumu (25.4) ile arasında boşluk kalır ve hiçbir cisim halkaya
değmez.

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
    sun.js                Güneş küresi, korona ve ışık kaynağı
    calendarRing.js       yüzen takvim kadranı, dilimler, gösterge
    earthMoonSystem.js    serbest duran Dünya + Ay ve yörünge izleri
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
