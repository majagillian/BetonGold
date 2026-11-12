# Betongold – Vom Lottoglück zum Immobilienimperium

Ein Handyspiel (Android und Web) über Immobilien: Du gewinnst 1.000.000 € im Lotto und baust im Fantasieland **Aurelien** dein Immobilienimperium auf. Häuser renovieren und verkaufen, Häuser bauen und vermieten, Kredite aufnehmen und zurückzahlen – und Rohrbrüche, Mietausfälle und Mietnomaden überstehen.

## App herunterladen

- **Android:** Unter [Releases](../../releases/latest) die Datei `Betongold.apk` herunterladen, auf dem Handy öffnen und die Installation aus unbekannten Quellen erlauben.
- **iPhone / Browser:** Die Web-Version läuft unter GitHub Pages (Link im Bereich „Deployments“ bzw. unter *Settings → Pages*). Auf dem iPhone in Safari öffnen und über „Teilen → Zum Home-Bildschirm“ als App ablegen.

Jeder Push auf `main` baut automatisch eine neue APK und aktualisiert die Web-Version (siehe `.github/workflows`).

## Spielinhalt

- **Realistische 3D-Grafik:** Häuser, Innenräume und die Weltkarte werden mit three.js in 3D berechnet (Licht, Schatten, Holz-, Fliesen-, Ziegel- und Putzmaterialien).
- **Weltkarte:** Die Insel Aurelien in 3D – verschieben, zoomen, Regionen antippen. Gesperrte Regionen liegen im Nebel.
- **Besichtigung Raum für Raum:** 3D-Rundgang durch jedes Objekt. Jedes Haus hat mindestens einen Mangel (Schimmel, Setzungsriss, alte Elektrik, Holzwurm …), den man im Raum entdecken kann. Gefundene Mängel drücken den Kaufpreis; der Hauptmangel muss vor dem Vermieten behoben werden.
- **Renovierungsplaner:** Pro Raum Boden, Wandfarbe, Küchen- und Badmodell wählen – mit Live-Vorschau. Grundriss ändern: Wanddurchbruch zur offenen Wohnküche, Zimmer teilen, Gäste-WC, Balkon, Dachausbau. Regionaler Geschmack beeinflusst Wert und Miete.
- **Möbliert oder unmöbliert vermieten:** Vier Einrichtungsstile mit höherer Miete, aber häufigerem Mieterwechsel.
- **Gegenspieler Viktor:** Bei Top-Objekten kommt es zum Bieterduell – das höhere Gebot gewinnt. Liegengelassene Top-Objekte schnappt er sich.
- **Gamification:** Erfahrungspunkte und Ränge mit Rabatten, 26 Erfolge, Monatsaufgaben, tägliches Glücksrad mit Serienbonus, Goldbarren (nur im Spiel verdienbar), Rangliste gegen andere Investoren, Sounds und Vibration.

- **Charakter-Editor:** Name, Geschlecht (inkl. nicht-binär), Pronomen, 12 Hauttöne, Körperbau, Größe, Alter, Gesichtsform, Augen, Brauen, Mund, Lippenfarbe, Bart, Sommersprossen, Vitiligo, 17 Frisuren, 16 Haarfarben, Kopfbedeckungen (u. a. Hidschab, Turban, Kippa), 10 Oberteile, Hosen und Röcke, Schuhe, Brillen, Schmuck, Hörgerät, Rollstuhl, Gehstock und Beinprothese.
- **7+1 Regionen** mit eigenen Immobilien, Preisen, Mieten, Nachfrage und Ereignissen: Kleeweiler, Mühlental, Lumenhafen, Pilzhain, Wolkenspitz, Sonnenküste, Kronstadt und Neuwerk.
- **10 Level** mit eigenen Zielen; jedes Level schaltet neue Regionen und Funktionen frei.
- **Zwei Strategien:** Fix & Flip (renovieren, Home Staging, verkaufen) oder Bauen & Vermieten (Inserat, Besichtigung, Mieterauswahl mit Warnzeichen).
- **Bank:** Dispo, Renovierungskredit, Hypothek, Baufinanzierung, Investorenkapital, Bonität, Versicherungen, Hausverwaltung, GmbH.
- **Mahnkette:** Zahlungserinnerung → 1. Mahnung → 2. Mahnung (Notverkauf, Umschuldung oder Stundung) → Zwangsversteigerung → Insolvenz. Bei Insolvenz startest du am Anfang des vorherigen Levels neu.
- **Über 30 Ereignisse**, z. B. Rohrbruch, Heizungsausfall, Schimmel, Mietausfall, Mietnomaden, Hochwasser, Lawine, Sturmflut, Zinserhöhung, Immobiliencrash, Mietpreisbremse und Viktor von Hohenstein.

Ein Spielmonat vergeht mit dem Knopf „Nächster Monat“. Der Spielstand wird automatisch auf dem Gerät gespeichert.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm test         # Tests der Spiel-Engine
npm run build    # Produktions-Build nach dist/
```

Android-APK lokal bauen (benötigt Android SDK und Java 21):

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

**Technik:** Preact + TypeScript + Vite, alle Grafiken als SVG im Code, Android-Hülle mit Capacitor.

| Ordner | Inhalt |
| --- | --- |
| `src/game` | Spiellogik: Daten, Wirtschaft, Ereignisse, Level, Monatsabschluss |
| `src/art` | Figuren, Häuser und Regionen als SVG |
| `src/ui` | Bildschirme und Bedienung |
| `tests` | Tests der Spiel-Engine |
