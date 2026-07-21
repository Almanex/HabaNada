# HabaNada Benutzerhandbuch — Wie Sie Werbung blockieren und Clickbait mithilfe lokaler KI umschreiben

> [!TIP]
> **💡 Zusammenfassung**
> HabaNada ist eine innovative Chrome-Erweiterung, die klassischen Werbeblocker (AdBlock) mit modernstem KI-gestütztem Umschreiben von Inhalten kombiniert. Durch die Verwendung des integrierten und lokalen Gemini Nano-Modells in Chrome klassifiziert und formuliert die Erweiterung sensationelle Clickbait-Schlagzeilen in neutrale, sachliche Titel um. Zusätzlich blockiert HabaNada automatisch Autoplay-Videowerbung, Newsletter-Abo-Popups (Annoyances) und Push-Benachrichtigungsaufforderungen direkt auf Ihrem Computer, um absolute Privatsphäre zu garantieren.

## Übersicht über HabaNada

HabaNada bietet einen zukunftsweisenden Ansatz zur Bereinigung von Webseiten. Traditionelle Werbeblocker basieren ausschließlich auf statischen Filterlisten, wodurch native Werbeanzeigen und Clickbait-Bereiche oft durchrutschen. HabaNada nutzt **lokale künstliche Intelligenz auf Ihrem Computer**, um die Semantik von Inhalten zu analysieren. Dies ermöglicht es Ihnen, nicht nur Standard-Werbebanner auszublenden, sondern auch störende Schlagzeilen direkt auf der Seite neu zu schreiben.

## Hauptfunktionen

### Blockierung von Werbung & Popups (AdBlock)
Die Erweiterung entfernt automatisch Werbebanner, kollabiert leere Platzhalter bekannter Werbeflächen und neutralisiert verschleierte Umgehungsskripte (wie AdShield).

### Lokales KI-Umschreiben von Clickbait (Anti-Clickbait)
Mithilfe des in Chrome integrierten Gemini Nano-Modells klassifiziert HabaNada Schlagzeilen. Reißerische Formulierungen (z. B. *"Schockierend! Sie werden nicht glauben, was passiert ist..."*) werden direkt im Layout der Webseite in einen sachlichen, informativen Stil umgeschrieben.

### Verhindern von Belästigungen & Push-Meldungen
HabaNada blendet Newsletter-Anmeldebanner, Cookie-Modale und ähnliche Overlay-Aufforderungen dynamisch aus und entsperrt das Scrollen auf der Seite. Ebenso werden native Push-Berechtigungsanfragen des Browsers abgefangen und blockiert.

### Absolute Privatsphäre
Alle KI-Berechnungen finden lokal auf Ihrem Computer statt. Ihre Browsing-Daten und gelesenen Texte werden zu keinem Zeitpunkt an externe Server oder Drittanbieter-Cloud-Dienste gesendet.

---

## Schnellstart-Anleitung

Befolgen Sie diese Schritte, um die lokalen KI-Funktionen in Ihrem Google Chrome-Browser zu aktivieren:

1. **Schritt 1: Aktivieren der integrierten KI** — Öffnen Sie `chrome://flags/#optimization-guide-on-device-model` und stellen Sie den Parameter auf **Enabled BypassPrefRequirement**.
2. **Schritt 2: Prompt API aktivieren** — Öffnen Sie `chrome://flags/#prompt-api-for-sharing` und wählen Sie **Enabled**. Starten Sie Google Chrome anschließend neu.
3. **Schritt 3: Modelldateien herunterladen** — Öffnen Sie `chrome://components/`, suchen Sie nach **Optimization Guide On Device Model** und klicken Sie auf **Nach Updates suchen**, um Gemini Nano herunterzuladen.
4. **Schritt 4: Erweiterung installieren** — Öffnen Sie `chrome://extensions/`, aktivieren Sie den Entwicklermodus, klicken Sie auf „Entpackte Erweiterung laden“ und wählen Sie das Stammverzeichnis des HabaNada-Projekts aus.

---

## Tastaturkurzbefehle & Tipps

| Aktion | Tastenkombination / Methode | Beschreibung |
| :--- | :--- | :--- |
| **Einstellungen öffnen** | `Alt + Shift + H` (oder Klick auf das Symbol) | Öffnet das Popup-Menü der Erweiterung mit Statistiken, Schaltern und dem KI-Status. |
| **Schnelle Whitelist** | Domain-Schalter im Popup | Deaktiviert die Werbeblockierung auf der aktuellen Website sofort, falls Layouts fehlerhaft dargestellt werden. |
| **KI-Status prüfen** | Status-Anzeige im Popup | Zeigt den aktuellen Initialisierungsstatus von Gemini Nano auf Ihrem System an. |

---

## FAQ / Fehlerbehebung

#### Warum werden Schlagzeilen nicht sofort umgeschrieben?
Beim ersten Laden einer Seite benötigt die lokale KI einen kurzen Moment, um den Text zu klassifizieren. Die Ergebnisse werden im Cache gespeichert, sodass zukünftige Besuche und Scrollvorgänge ohne Verzögerung gerendert werden.

#### Verlangsamt die Erweiterung mein System?
Nein, die gesamte Verarbeitung läuft lokal über die Hardwarebeschleunigung Ihres Computers. Der Cache verhindert zudem doppelte Anfragen für bereits gesehene Schlagzeilen.

#### Wie erlaube ich Werbung auf einer vertrauenswürдиgen Seite?
Klicken Sie einfach auf das HabaNada-Symbol in Ihrer Symbolleiste und deaktivieren Sie den Schalter **Werbung blockieren** für die aktuelle Domain. Die Einstellungen werden automatisch gespeichert.
