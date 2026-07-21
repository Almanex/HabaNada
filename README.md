<div align="center">
  <img width="150" height="150" alt="image" src="https://github.com/user-attachments/assets/b2e7e7d7-3d3d-4ecc-b18a-a469cafaa3af" />


# <div align="center">HabaNada</div>
  
[README_RU](docs/README_RU.md) | [README_DE](docs/README_DE.md) | [README_EN](README.md) | [GUIDE_RU](docs/GUIDE_RU.md) | [GUIDE_DE](docs/GUIDE_DE.md) | [GUIDE_EN](docs/GUIDE_EN.md)



*Hybrid ad blocker and AI-powered clickbait rewriter Chrome extension utilizing on-device Gemini Nano.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform: Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-orange.svg)](https://developer.chrome.com/)
[![Engine: Gemini Nano](https://img.shields.io/badge/Engine-Gemini%20Nano-purple.svg)](https://developer.chrome.com/docs/ai/built-in)

</div>
---

## Overview

HabaNada is a next-generation browser extension for Google Chrome that combines a high-performance network request blocker with semantic content filtering. Unlike standard ad blockers that rely solely on static filter lists, HabaNada leverages Chrome's built-in on-device AI (Gemini Nano) to identify native ads and dynamically rewrite sensationalist clickbait headlines into neutral, informative text. All AI processing is performed locally on your device, ensuring privacy and fast execution.

---

## Key Features

- **Hybrid Ad Blocking** — Combines Declarative Net Request rules targeting known ad networks with dynamic CSS layout collapsing to remove empty placeholders and sponsored containers.
- **Anti-Adblock Bypass Protection** — Synchronously intercepts and blocks anti-adblock scripts (like AdShield and OptiDigital) in the Main World before browser fetch, and dynamically hides warning modals/overlays while restoring page scroll.
- **Native Notification & Annoyance Blocker** — Overrides the browser's native push notification prompt API to prevent intrusive popups, and blocks obtrusive subscription overlays (annoyances) using a heuristic text matching algorithm.
- **Local AI Clickbait Rewriting** — Uses the on-device `window.ai.languageModel` API to classify headlines and rewrite sensationalist clickbait into informative titles.
- **Independent Feature Controls** — Allows users to toggle Ad Blocking and Clickbait Rewriting independently on a per-domain and global basis.
- **Multilingual & Themed Popup** — Fully localized popup interface supporting English, Russian, German, Spanish, and French, with automatic dark/light theme switching matching the browser settings.

---

## Tech Stack

| Component | Technology | Details / Purpose |
| --- | --- | --- |
| Extension Framework | WebExtensions API (Manifest V3) | Service worker, Declarative Net Request, content scripts |
| AI Engine | Gemini Nano (window.ai) | Local on-device language model API |
| Script Interception | DOM MutationObserver | Intercepts dynamic script additions and handles SPA updates |
| Styling | CSS3 | Dynamic CSS injection for collapsing ad slot layouts |

---

## Getting Started

### Prerequisites

To run HabaNada, you need Google Chrome version 128 or later with built-in AI capabilities enabled.

1. Navigate to `chrome://flags/#optimization-guide-on-device-model` and set it to **Enabled BypassPrefRequirement**.
2. Navigate to `chrome://flags/#prompt-api-for-sharing` and set it to **Enabled**.
3. Relaunch Chrome.
4. Navigate to `chrome://components/` and look for **Optimization Guide On Device Model**. Click **Check for update** to ensure the model is fully downloaded.

### Installation

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the root directory containing this extension's `manifest.json`.

---

## Development & Architecture

The extension is structured into five core components:

- `manifest.json` — Configuration file declaring permissions, background scripts, and `document_start` content script injection.
- `background.js` — Service worker managing dynamic whitelist rules, stats reset, and extension communication.
- `content.js` — Executed at `document_start`. Handles DOM mutation observation, AdShield script blocking, style injection, and caches classification results to prevent duplicate processing on SPA page updates.
- `bridge.js` — Injected into the page's main world to gain access to Chrome's built-in `ai.languageModel` API, processing classification tasks.
- `rules.json` — Static declarativeNetRequest ruleset containing network block rules for known ad providers.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
