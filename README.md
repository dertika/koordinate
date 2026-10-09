# Koordinate

**Orte, die bleiben.** Koordinate macht aus einem frei gewählten Kartenausschnitt ein druckfertiges Poster, zum Beispiel vom Wohnort, Hochzeitsort, der Geburtsstadt oder einem Lieblingsplatz. Alles passiert lokal im Browser. Es gibt kein Backend, keine Accounts und kein Tracking.

## Funktionen

- **Ort finden:** Ortssuche über Nominatim/OpenStreetMap, „Meinen Standort verwenden". Die Karte lässt sich frei verschieben und zoomen.
- **Ausschnitt wählen:** Das Poster liegt als Rahmen über der Karte, und was im Kartenfenster zu sehen ist, wird zum Bild. Es gibt die Formate A4, A3, 30 × 40, 50 × 70 jeweils hoch und quer sowie Quadrat (30 × 30).
- **Stile:** 8 Farbthemen: Papier (minimal hell), Nacht, Sepia, Pastell, Blaupause (monochrom blau), Tusche (schwarz-weiß), Salbei und Terrakotta. Land, Wasser, Grünflächen, Gebäude, Haupt- und Nebenstraßen, Papier und Schrift lassen sich einzeln umfärben. Gebäude, Wege/Bahnlinien und Ortsnamen sind abschaltbar, die Linienstärke ist einstellbar.
- **Beschriftung:** Titel, Untertitel, Koordinaten (Grad oder dezimal, automatisch aus der Kartenmitte oder als eigener Text) sowie Datum oder Widmung. Zur Wahl stehen 6 Schrift-Presets, die lokal mitgeliefert werden. Gestaltung: Rand in vier Stufen, Textbalken unter der Karte oder Text auf der Karte mit weichem Verlauf, optionale Rahmenlinie, zentriert oder linksbündig.
- **Export:** PNG mit 150, 300 oder 400 dpi samt eingebetteter dpi-Angabe, wahlweise PDF im exakten Papierformat. Die Karte wird für den Export offscreen in der Zielauflösung neu gerendert. Das Ergebnis ist also kein Screenshot der Vorschau.
- **Live-Vorschau:** Jede Änderung erscheint sofort. Vorschau und Export verwenden denselben Renderer, deshalb sieht das Bild genauso aus wie die Vorschau, nur schärfer.
- **Entwürfe teilen:** Alle Einstellungen stehen im URL-Hash („Entwurf teilen" kopiert den Link) und werden zusätzlich im `localStorage` gesichert.
- Responsive Oberfläche: Auf dem Desktop gibt es eine Seitenleiste, auf dem Handy ein Bottom-Sheet. Hell- und Dunkelmodus folgen dem System und lassen sich umschalten. Die Oberfläche ist auf Deutsch, Englisch ist vorbereitet (`src/i18n`).

## Schnellstart

```bash
npm install && npm run dev
```

Danach <http://localhost:5173> öffnen.

## Build

```bash
npm run build      # Typecheck + statischer Build nach dist/
npm run preview    # dist/ lokal ansehen
```

Den Ordner `dist/` kann jeder statische Webserver ausliefern. Die Pfade sind relativ, deshalb funktioniert auch ein Unterverzeichnis.

## Hosting

### Docker / Podman

```bash
docker build -t koordinate .
docker run --rm -p 8080:8080 koordinate
```

Das Image baut die App und liefert sie mit nginx aus (Port 8080, statisch, mit Sicherheits-Headern). Eine GitHub Action (`.github/workflows/image.yml`) baut bei jedem Push auf `main` das Image `ghcr.io/dertika/koordinate`.

### Podman-Quadlet

`deploy/koordinate.container` nach `~/.config/containers/systemd/` kopieren, danach:

```bash
systemctl --user daemon-reload
systemctl --user start koordinate
```

Die Unit startet den Container read-only, ohne zusätzliche Capabilities und mit `AutoUpdate=registry`.

### Konfiguration

Geocoder und Kartenquelle sind zur Laufzeit über `config.js` im Web-Root konfigurierbar. Im Container geht das per Volume-Mount, siehe Quadlet:

```js
window.KOORDINATE_CONFIG = {
  geocoderUrl: 'https://nominatim.example.org/search',
  geocoderEmail: 'kontakt@example.org',
  tileJsonUrl: 'https://tiles.openfreemap.org/planet',
  glyphsUrl: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  attribution: '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles',
};
```

Alternativ beim Build per Umgebungsvariable: `VITE_GEOCODER_URL`, `VITE_GEOCODER_EMAIL`, `VITE_TILEJSON_URL`, `VITE_GLYPHS_URL`, `VITE_ATTRIBUTION`.

Wenn du andere Endpoints einträgst, musst du auch die `connect-src`-Zeile der Content-Security-Policy in `deploy/nginx.conf` anpassen.

## Datenschutz

- Kein eigener Server, keine Accounts, keine Cookies, kein Analytics, keine Drittanbieter-Skripte.
- Schriften liegen lokal im Bundle. Es gibt keine Anfragen an Google Fonts.
- Das Bild entsteht ausschließlich auf deinem Gerät und wird nirgends hochgeladen.
- Ins Netz gehen nur zwei Arten von Anfragen: Kartenkacheln (Standard: [OpenFreeMap](https://openfreemap.org)) und Suchanfragen an den Geocoder (Standard: [Nominatim](https://nominatim.org)). Der Standort wird nur nach ausdrücklichem Klick über die Geolocation-API des Browsers abgefragt und nicht übertragen.

## Attribution und Fairness

- Jedes exportierte Bild enthält dezent „© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles". Mit der Option „Sehr klein" schrumpft der Hinweis auf etwa 1 mm Schrifthöhe am Rand, ganz entfernen lässt er sich nicht.
- Die Suche hält sich an die [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/): Sie wartet mit einem Debounce von 650 ms, sendet höchstens eine Anfrage pro Sekunde, speichert Ergebnisse zwischen, bricht veraltete Anfragen ab und übermittelt den Origin als Referer. Optional wird eine Kontaktadresse als `email` mitgeschickt. Für viel Traffic bitte einen eigenen Nominatim-Endpoint eintragen.

## Technik

- Vite und TypeScript, MapLibre GL JS mit Vektorkacheln im OpenMapTiles-Schema
- **Vorschau = Export:** Das Poster hat eine logische Größe (Papier-mm × 96/25,4). Die interaktive Karte wird in dieser Größe gelayoutet und per CSS-Transform auf den Bildschirm skaliert. Der Export rendert dieselbe Ansicht mit gleichem Zoom offscreen, aber mit `pixelRatio = dpi / 96`. Linien, Flächen und Text bleiben deshalb auch bei 50 × 70 cm vektorscharf.
- Wie hoch der Export maximal auflösen kann, wird aus den Grenzen von WebGL (`MAX_TEXTURE_SIZE`) und Canvas ermittelt. Schafft ein Browser, zum Beispiel iOS Safari, die gewünschten dpi nicht, zeigt die App an, welche Auflösung tatsächlich möglich ist.
- Das PDF erzeugt ein eigener Mini-Writer (`src/export/pdf.ts`) ohne zusätzliche Abhängigkeit.

```
src/
  config.ts          Endpoints & Attribution (Laufzeit/Build-Zeit)
  state.ts           Zustand, URL-Hash- und localStorage-Persistenz
  formats.ts         Papierformate
  i18n/              Übersetzungen (de = Referenz, en)
  map/style.ts       Style-Builder (MapLibre-Style-JSON pro Theme)
  map/stage.ts       Interaktive Karte + Poster-Overlay
  themes/presets/    Ein Theme pro Datei
  poster/            Schriften, Layout, gemeinsamer Renderer
  export/            Offscreen-Rendering, PNG-dpi, PDF, Browser-Limits
  ui/                Oberfläche (ohne Framework)
deploy/              nginx-Konfiguration, Podman-Quadlet
```

## Lizenzhinweise

Kartendaten © [OpenStreetMap](https://www.openstreetmap.org/copyright)-Mitwirkende (ODbL), Kacheln von [OpenFreeMap](https://openfreemap.org) im [OpenMapTiles](https://openmaptiles.org)-Schema. Schriften unter der SIL Open Font License über [Fontsource](https://fontsource.org).
