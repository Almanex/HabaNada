# Project Context: HabaNada

This document provides technical context and architectural overview of HabaNada for developer reference and AI assistant integration.

---

## Extension Architectural Overview

HabaNada is a Google Chrome extension (Manifest V3) combining Declarative Net Request (DNR) rules with local on-device AI semantic filtering.

```
                  +-----------------------------------+
                  |           Chrome Browser          |
                  +-----------------+-----------------+
                                    |
            [DNR Network Blocks]    |    [Injected content.js]
            (rules.json / whitelist)|    (runs at document_start)
                                    |
                                    v
                  +-----------------+-----------------+
                  |          Web Page DOM             |
                  |  - CSS collapser hides ad slots   |
                  |  - Intercepts AdShield scripts    |
                  +-----------------+-----------------+
                                    |
                                    v [injectBridge]
                  +-----------------+-----------------+
                  |      bridge.js (Main World)       |
                  |  - Accesses window.ai.languageModel|
                  +-----------------+-----------------+
                                    |
                                    v [local execution]
                  +-----------------+-----------------+
                  |     Gemini Nano (On-Device AI)    |
                  +-----------------------------------+
```

---

## File Responsibilities

- **`manifest.json`** — Declares extension permissions (`declarativeNetRequest`, `webNavigation`, `storage`), service worker declaration, and injects `content.js` at `document_start` on `<all_urls>`. Registers `bridge.js` as a web accessible resource.
- **`background.js`** — Service worker managing extension lifecycle, persistent stats, in-memory tab stats, and dynamic whitelist rules. Dynamic whitelist rules with action `allowAllRequests` override static blocking rules on whitelisted domains. It also resets tab-specific stats using `chrome.webNavigation.onBeforeNavigate`.
- **`content.js`** — Injected content script executing at `document_start`. 
  - Injects `bridge.js` into the page's Main World synchronously at the earliest tick of execution to ensure script intercepts are active.
  - Installs a script-blocking MutationObserver as a secondary script interception layer.
  - Injects a stylesheet to collapse empty space of known ad dimensions/classes.
  - Runs `removeAntiAdblockNotices()` which scans the DOM for annoyance keywords (anti-adblock notices, newsletters, notifications) and walks up the element ancestors to find and hide the fixed/absolute wrapper containers.
  - Caches classification results in `decisionCache` (Map) to prevent loops on SPA (React/Vue) page updates.
- **`bridge.js`** — Main world script that executes in the page context. 
  - Monkey-patches `document.createElement('script')` and `Element.prototype.setAttribute('src')` to intercept and block AdShield and other recovery scripts *synchronously* before browser fetch.
  - Overrides `window.Notification.requestPermission` to silently block native push notification prompts.
  - Acts as a proxy, communicating with Chrome's built-in `window.ai.languageModel` API to classify and rewrite content, passing results back to `content.js` via `window.postMessage`.
- **`rules.json`** — Static declarativeNetRequest rules defining standard blocklists for known ad providers, trackers, and widgets.
- **`popup/`** — Houses `popup.html`, `popup.css`, and `popup.js`. Provides localized toggles for Ad Blocking (domain whitelist) and Anti-clickbait (global setting), as well as status indicators for Gemini Nano and tab/total statistics.

---

## Core Technical Mechanics

### 1. Synchronous Script Interception
To completely neutralize adblock bypass scripts (like AdShield / OptiDigital) before execution, `bridge.js` is injected synchronously into the Main World at `document_start`. It intercepts:
- `document.createElement('script')` via a custom descriptor set on the script's `src` property.
- `Element.prototype.setAttribute('src', value)` for `<script>` tags.
If a script URL contains AdShield signatures (long obfuscated hashes, `html-load.com`, or `target_type=notice`), the setter changes the script's `type` to `text/plain` and sets `src` to empty, stopping the fetch and execution. Input URLs are defensively converted to strings to ensure SVG script elements and Trusted Types (like `TrustedScriptURL` on Yandex) do not trigger runtime TypeErrors.

### 2. Annoyance & Push Notification Blocking
- **Native Push Prompts** — `bridge.js` overrides `window.Notification.requestPermission` with a callback-compatible handler that automatically rejects with `default` permission, bypassing the browser's native prompt.
- **Obtrusive Modal Overlays** — `content.js` runs `removeAntiAdblockNotices()` on page load and DOM mutations. If an element contains target keywords (e.g. newsletter subscriptions, adblock notices), the script walks up to 5 ancestors in the DOM tree, verifies that the target node is a valid Element, and hides the fixed/absolute positioning container, restoring page overflow scroll.

### 3. Main World Bridge Communication
Communication between `content.js` and `bridge.js` is performed using `window.postMessage` with strict `source` verification:
- `habanada-status-update` — Sends whitelist settings to bridge.js.
- `habanada-ai-status` — Signals Gemini Nano readiness and status messages.
- `habanada-ai-request` — Sends batches of texts for classification.
- `habanada-ai-response` — Returns classification results containing types (`ad`, `rewrite`, `ok`) and the replacement text values.

### 4. Classification Caching
To prevent infinite loops where the extension rewrites a headline, the SPA (React/Vue) page updates and restores it, and the extension rewrites it again, `content.js` maintains a cache of decisions based on normalized text content. Subsequent renders are resolved instantly using the cache without querying the AI again, keeping CPU usage low.

---

## Environment Setup & Chrome Flags

To develop or test this extension, Gemini Nano must be enabled in Chrome:
- `chrome://flags/#optimization-guide-on-device-model` -> **Enabled BypassPerfRequirement**
- `chrome://flags/#prompt-api-for-sharing` -> **Enabled**
- `chrome://components/` -> **Optimization Guide On Device Model** -> Click **Check for update** to download the on-device model weights.
