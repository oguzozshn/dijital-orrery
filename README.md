# Dijital Orrery — Güneş · Dünya · Ay

LEGO Technic tarzı mekanik bir **orrery** (güneş sistemi modeli) modelinin
dijital, 3D ve tarayıcıda çalışan karşılığı: merkezde dikey mil üzerinde Güneş,
tabanda ay etiketli takvim halkası, ve seçilen tarihe göre halka üzerinde doğru
açıya dönen Dünya + Ay kolu.

## Kurulum

```bash
npm install
npm run dev
```

Doğrulama testleri:

```bash
npm run verify
```

## Teknolojiler

- **Three.js** — WebGL tabanlı 3D sahne
- **Vite** — geliştirme ortamı ve build
- **astronomy-engine** — efemeris (`HelioVector`, `GeoVector`, `SiderealTime`, `MoonPhase`)

## Model doğruluğu

Ölçekler **stilizedir** (fiziksel LEGO modelde olduğu gibi), açısal ilişkiler
gerçektir:

- Kolun takvim halkasındaki açısı, `HelioVector(Body.Earth)`'ten türetilen
  gerçek ekliptik boylamdır — "365 günü 360 dereceye böl" yaklaşımı değil.
  Bu yüzden Ocak dilimi ~31.6°, Temmuz dilimi ~29.6°'dir (günberi/günöte).
- Dünya'nın kendi ekseni etrafındaki dönüşü Greenwich görünür yıldız
  zamanından (`SiderealTime`), eksen eğikliği 23.439°'dir.
- Ay'ın konumu `GeoVector(Body.Moon)`'dan gelir; ~5.1° yörünge eğimi dahildir.

### Sahne çerçevesi

```
+X = ilkbahar ekinoksu (ekliptik boylam 0°)
-Z = ekliptik boylam 90°
+Y = ekliptik kuzey kutbu
```

## Veri kaynakları

Dünya ve Ay texture'ları: [three.js örnek texture'ları](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets)
(NASA Visible Earth kaynaklı).
