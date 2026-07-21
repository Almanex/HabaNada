# HabaNada

*Hybrider Adblocker und KI-gestütztes Tool zum Umschreiben von Clickbait basierend auf dem lokalen Modell Gemini Nano in Chrome.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform: Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-orange.svg)](https://developer.chrome.com/)
[![Engine: Gemini Nano](https://img.shields.io/badge/Engine-Gemini%20Nano-purple.svg)](https://developer.chrome.com/docs/ai/built-in)

---

## Übersicht

HabaNada ist eine Browser-Erweiterung der nächsten Generation für Google Chrome, die einen leistungsstarken Netzwerk-Request-Blocker mit semantischer Inhaltsfilterung kombiniert. Im Gegensatz zu Standard-Adblockern, die sich ausschließlich auf statische Filterlisten verlassen, nutzt HabaNada die integrierte lokale künstliche Intelligenz (Gemini Nano) von Chrome, um native Werbung zu klassifizieren und sensationelle Clickbait-Schlagzeilen dynamisch in neutralen, informativen Text umzuschreiben. Alle KI-Berechnungen werden lokal auf Ihrem Gerät durchgeführt, was den Datenschutz der Benutzerdaten und eine schnelle Ausführung garantiert.

---

## Hauptfunktionen

- **Hybrides Adblocking** — Kombination von Declarative Net Request-Regeln zur Blockierung bekannter Werbenetzwerke mit dynamischer Ausblendung leerer Werbeblöcke (CSS-Layout-Kollabierung).
- **Schutz vor Adblock-Umgehung** — Synchrones Abfangen und Blockieren von Anti-Adblock-Skripten (wie AdShield und OptiDigital) in der Main World vor dem Browser-Fetch, sowie dynamisches Ausblenden von Warn-Modals bei gleichzeitiger Scroll-Wiederherstellung.
- **Benachrichtigungs- und Belästigungsblocker (Annoyances)** — Überschreibt die native Push-Benachrichtigungs-API des Browsers, um störende Popups zu verhindern, und blockiert aufdringliche Newsletter-Overlays mithilfe eines DOM-Eltern-Suchalgorithmus.
- **Lokale KI gegen Clickbait** — Verwendung der integrierten Chrome-API `window.ai.languageModel` zur Klassifizierung und zum Umschreiben sensationeller Clickbait-Schlagzeilen.
- **Unabhängige Funktionssteuerung** — Separate Schalter zur Steuerung der Werbeblockierung (pro Domain) und des Clickbait-Schutzes (global), die eine unabhängige Konfiguration ermöglichen.
- **Mehrsprachigkeit** — Vollständig lokalisierte Popup-Benutzeroberfläche, die automatisch die Sprache des Browsers erkennt und Deutsch, Englisch, Russisch, Spanisch und Französisch unterstützt.

---

## Technologischer Stack

| Komponente | Technologie | Details / Zweck |
| --- | --- | --- |
| Erweiterungs-Framework | WebExtensions API (Manifest V3) | Service Worker, Declarative Net Request, Content-Skripte |
| KI-Engine | Gemini Nano (window.ai) | Lokale On-Device Sprachmodell-API in Chrome |
| Skript-Interzeption | DOM MutationObserver | Überwachung von DOM-Änderungen und Blockierung dynamischer Skripte |
| Styling | CSS3 | Dynamische Injektion von Stylesheets zum Kollabieren von Werbelayouts |

---

## Schnelleinstieg

### Voraussetzungen

Um HabaNada auszuführen, benötigen Sie Google Chrome Version 128 oder neuer mit aktivierten integrierten KI-Funktionen.

1. Rufen Sie `chrome://flags/#optimization-guide-on-device-model` auf und wählen Sie **Enabled BypassPrefRequirement**.
2. Rufen Sie `chrome://flags/#prompt-api-for-sharing` auf und wählen Sie **Enabled**.
3. Starten Sie Google Chrome neu.
4. Rufen Sie `chrome://components/` auf, suchen Sie nach **Optimization Guide On Device Model** und klicken Sie auf **Nach Updates suchen**, um das Modell herunterzuladen.

### Installation

1. Klonen oder laden Sie dieses Repository auf Ihren lokalen Computer herunter.
2. Öffnen Sie Google Chrome und rufen Sie die Seite zur Verwaltung von Erweiterungen `chrome://extensions/` auf.
3. Aktivieren Sie den **Entwicklermodus** mit dem Schalter in der oberen rechten Ecke.
4. Klicken Sie auf die Schaltfläche **Entpackte Erweiterung laden** in der linken oberen Ecke.
5. Wählen Sie das Stammverzeichnis der Erweiterung aus, das die Datei `manifest.json` enthält.

---

## Entwicklung und Architektur

Die Erweiterung besteht aus fünf Kernkomponenten:

- `manifest.json` — Konfigurationsdatei, die Berechtigungen, Hintergrundskripte und Injektionsparameter deklariert.
- `background.js` — Service Worker, der die Domain-Whitelist, die dynamischen DNR-Regeln und Statistiken verwaltet.
- `content.js` — Content-Skript, das in der Phase `document_start` ausgeführt wird. Es blockiert AdShield-Skripte, injiziert Stylesheets, verwaltet MutationObserver und kachelt KI-Entscheidungen, um redundante Abfragen auf SPA-Seiten zu vermeiden.
- `bridge.js` — Skript, das in die Hauptwelt der Seite injiziert wird, um Zugriff auf die lokale API `ai.languageModel` zu erhalten, und Klassifizierungen ausführt.
- `rules.json` — Statische declarativeNetRequest-Regeldatei zur Blockierung von Netzwerkanfragen bekannter Werbeanbieter.

---

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. Details finden Sie in der Datei LICENSE.
