# HabaNada User Guide — How to Block Ads and Rewrite Clickbait Using On-Device AI

> [!TIP]
> **💡 TL;DR**
> HabaNada is an innovative Chrome extension that combines standard ad-blocking capabilities with advanced AI-powered content rewriting. Utilizing Chrome's built-in, local Gemini Nano model, the extension classifies and rewrites sensational clickbait headlines into neutral, factual titles. It also blocks auto-play video ads, subscription pop-ups (annoyances), and push notification permission prompts, all entirely on-device to guarantee absolute user privacy.

## Overview of HabaNada

HabaNada introduces a next-generation approach to web page sanitization. Traditional ad blockers rely solely on static host list filtering, which frequently misses native advertisements and clickbait headlines. HabaNada uses **on-device artificial intelligence** on your computer to analyze content semantics. This allows you to not only hide standard display banners but also rewrite annoying news headlines directly inside the page layout.

## Key Features

### Ad & Popup Blocking (AdBlock)
The extension automatically removes banners, collapses empty space of known ad slots, and neutralizes obfuscated bypass scripts (like AdShield).

### Local AI Clickbait Rewriting (Anti-Clickbait)
Using Chrome's built-in Gemini Nano model, HabaNada classifies headlines. Sensationalist clickbait (e.g. *"Shocking! You won't believe what happened..."*) is rewritten to a calm, factual style directly on the webpage.

### Annoyance & Push Notification Prevention
HabaNada dynamically hides newsletter subscription banners, cookie modals, and similar overlay prompts, restoring scroll lock on the body. It also intercepts and blocks browser push permission popups.

### Complete Data Privacy
All AI operations execute locally on your machine. Your browsing data and content text are never sent to external servers or third-party cloud services.

---

## Quick Start Guide

Follow these steps to enable local AI features in your Google Chrome browser:

1. **Step 1: Enable built-in AI** — Navigate to `chrome://flags/#optimization-guide-on-device-model` and switch the parameter to **Enabled BypassPrefRequirement**.
2. **Step 2: Enable Prompt API** — Go to `chrome://flags/#prompt-api-for-sharing` and set it to **Enabled**. After this, relaunch Google Chrome.
3. **Step 3: Download model weights** — Visit `chrome://components/`, locate **Optimization Guide On Device Model**, and click **Check for update** to download Gemini Nano.
4. **Step 4: Load Extension** — Open `chrome://extensions/`, enable Developer Mode, click "Load unpacked", and select the root directory of the HabaNada project.

---

## Keyboard Shortcuts & Tips

| Action | Shortcut / Method | Description |
| :--- | :--- | :--- |
| **Open Settings Menu** | `Alt + Shift + H` (or click icon) | Opens the extension popup containing stats, toggle switches, and AI status. |
| **Quick Whitelisting** | Domain Toggle in Popup | Instantly disables ad blocking on the current website if layouts break. |
| **Check AI Status** | Status Indicator in Popup | Displays the current initialization status of Gemini Nano on your device. |

---

## FAQ / Troubleshooting

#### Why are headlines not rewritten instantly?
When first loading a page, the local AI requires a brief fraction of a second to classify and rewrite the text. The results are cached, so subsequent page scrolls or re-visits are rendered instantly.

#### Does this extension slow down my system?
No, all classification is executed locally using your computer's hardware acceleration. Caching prevents redundant processing of previously seen headlines.

#### How do I allow ads on my favorite site?
Simply click the HabaNada icon in your toolbar and disable the **Block Ads** toggle for the current domain. Your settings will persist.
