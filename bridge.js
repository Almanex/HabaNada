/**
 * HabaNada — Main World Bridge
 * Proxies content.js requests to window.ai.languageModel API (Gemini Nano).
 * Injected into the page's Main World to access window.ai.
 */

(() => {
  'use strict';

  let adBlockEnabled = true;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source === 'habanada-status-update') {
      adBlockEnabled = !!event.data.adBlockEnabled;
    }
  });

  // ── Synchronous Script Blocking ────────────────────────────────────
  function isAdShieldScript(src) {
    if (!adBlockEnabled) return false;
    if (!src) return false;
    
    const srcStr = typeof src === 'string' ? src : String(src);
    if (srcStr.startsWith('chrome-extension:')) return false;
    
    let isAdShield = false;
    try {
      const url = new URL(srcStr, window.location.href);
      const filename = url.pathname.split('/').pop() || '';
      const hostname = url.hostname.toLowerCase();
      
      const trustedCdns = [
        'cloudflare.com', 'cloudflareinsights.com', 'google-analytics.com', 
        'googletagmanager.com', 'googleapis.com', 'gstatic.com', 
        'yandex.net', 'yastatic.net', 'jquery.com', 'bootstrapcdn.com'
      ];
      const isTrustedCdn = trustedCdns.some(domain => hostname === domain || hostname.endsWith('.' + domain));

      const isStaticFolder = /\/(static|assets|webpack|dist|js|build|packs|modules|wp-includes|wp-content|themes|plugins|npm|node_modules)\//i.test(url.pathname) ||
                            /\/(main|common|vendor|vendors|app|index)\..+\.js$/i.test(filename);

      if (!isTrustedCdn && !isStaticFolder) {
        const isObfuscatedFile = /^[a-z0-9]{30,}/i.test(filename.replace(/\.js$/, ''));
        const isObfuscatedHost = /^[a-z0-9]{20,}/i.test(hostname.split('.')[0]);
        
        if (
          srcStr.includes('optidigital') ||
          srcStr.includes('adshield') ||
          srcStr.includes('html-load.com') ||
          srcStr.includes('target_type=') ||
          isObfuscatedFile ||
          isObfuscatedHost
        ) {
          isAdShield = true;
        }
      }
    } catch (e) {
      // Relative path fallback
      const isStaticFolderFallback = /\/(static|assets|webpack|dist|js|build|packs|modules|wp-includes|wp-content|themes|plugins|npm|node_modules)\//i.test(srcStr);
      if (!isStaticFolderFallback) {
        if (
          srcStr.includes('optidigital') || 
          srcStr.includes('adshield') || 
          srcStr.includes('html-load.com') || 
          srcStr.includes('target_type=') || 
          /^[a-z0-9]{30,}/i.test(srcStr)
        ) {
          isAdShield = true;
        }
      }
    }
    return isAdShield;
  }

  // Intercept document.createElement('script')
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const element = originalCreateElement.call(document, tagName, options);
    if (tagName && tagName.toLowerCase() === 'script') {
      const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      Object.defineProperty(element, 'src', {
        set: function(val) {
          if (isAdShieldScript(val)) {
            console.log('[HabaNada Bridge] Blocked script setter src:', val);
            element.type = 'text/plain';
            originalDescriptor.set.call(element, '');
            return;
          }
          originalDescriptor.set.call(element, val);
        },
        get: function() {
          return originalDescriptor.get.call(element);
        },
        configurable: true,
        enumerable: true
      });
    }
    return element;
  };

  // Intercept Element.prototype.setAttribute
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (this.tagName === 'SCRIPT' && name && name.toLowerCase() === 'src') {
      if (isAdShieldScript(value)) {
        console.log('[HabaNada Bridge] Blocked setAttribute src:', value);
        this.type = 'text/plain';
        originalSetAttribute.call(this, 'src', '');
        return;
      }
    }
    originalSetAttribute.call(this, name, value);
  };

  // Override Notification.requestPermission to block native push notification prompts
  if (typeof window !== 'undefined' && window.Notification && window.Notification.requestPermission) {
    window.Notification.requestPermission = function(callback) {
      console.log('[HabaNada Bridge] Intercepted and blocked native push notification permission request');
      if (typeof callback === 'function') {
        callback('default');
      }
      return Promise.resolve('default');
    };
  }

  const SOURCE_REQUEST = 'habanada-ai-request';
  const SOURCE_RESPONSE = 'habanada-ai-response';
  const SOURCE_STATUS = 'habanada-ai-status';

  /** @type {any} */
  let aiSession = null;
  let aiAvailable = false;

  const SYSTEM_PROMPT = `You are a content classifier for a technology blog. For the given text snippet, determine if it is an advertisement, clickbait, or normal content.

Classification rules:
- AD: Classify as AD ONLY if the text is clearly a commercial advertisement, sponsored product promotion, or sales pitch for an external product/service (e.g., "Купите со скидкой", "Лучший хостинг", "Зарабатывайте дома").
- REWRITE: If the text is a clickbait headline (exaggerated, sensationalized, or designed as curiosity gaps, e.g., "Шок! Вы не поверите что случилось..."), rewrite it neutrally and factually (10-200 characters).
- OK: Classify as OK if the text is a normal article title, technical subheading, feature description, list item, or general educational content (even if it describes software features or benefits like "Визуальное превосходство", "Умная интеграция", "Производительность").

Output format:
Output ONLY the classification result (AD, OK, or the rewrite). Do not add any extra text, explanations, or quotes.`;

  /**
   * Get the AI namespace across different global contexts
   * @returns {any}
   */
  function getAINamespace() {
    if (typeof window !== 'undefined' && window.ai) return window.ai;
    if (typeof self !== 'undefined' && self.ai) return self.ai;
    if (typeof ai !== 'undefined') return ai;
    if (typeof chrome !== 'undefined' && chrome.aiOriginTrial) return chrome.aiOriginTrial;
    if (typeof chrome !== 'undefined' && chrome.ai) return chrome.ai;
    return null;
  }

  /**
   * Initialize AI session
   */
  async function initAI() {
    try {
      const aiNamespace = getAINamespace();
      let modelAPI = null;

      if (aiNamespace) {
        // Support both new languageModel and old assistant naming
        modelAPI = aiNamespace.languageModel || aiNamespace.assistant;
      }

      // Fallback to global LanguageModel if defined directly
      if (!modelAPI && typeof LanguageModel !== 'undefined') {
        modelAPI = LanguageModel;
        console.log('[HabaNada Bridge] Using global LanguageModel class fallback');
      }

      if (!modelAPI) {
        console.warn('[HabaNada Bridge] window.ai / self.ai / ai / chrome.ai / LanguageModel are not available');
        broadcastStatus('no');
        return;
      }

      let avail = 'no';
      if (typeof modelAPI.capabilities === 'function') {
        const caps = await modelAPI.capabilities();
        avail = caps.available;
      } else if (typeof modelAPI.availability === 'function') {
        avail = await modelAPI.availability();
      }

      if (avail === 'no') {
        console.warn('[HabaNada Bridge] AI model not available on this device');
        broadcastStatus('no');
        return;
      }

      if (avail === 'after-download') {
        console.log('[HabaNada Bridge] AI model downloading...');
        broadcastStatus('after-download');
      }

      aiSession = await modelAPI.create({
        systemPrompt: SYSTEM_PROMPT
      });
      aiAvailable = true;
      console.log('[HabaNada Bridge] AI session initialized successfully');
      broadcastStatus('readily');
    } catch (err) {
      console.error('[HabaNada Bridge] Failed to initialize AI:', err);
      broadcastStatus('error');
    }
  }

  /**
   * Broadcast AI availability status to content script
   * @param {string} status
   */
  function broadcastStatus(status) {
    window.postMessage({
      source: SOURCE_STATUS,
      available: status === 'readily',
      statusText: status
    }, '*');
  }

  /**
   * Classify a single text snippet using the AI model
   * @param {string} text - Text snippet to classify
   * @returns {Promise<{type: 'ad'|'ok'|'rewrite', value: string}>}
   */
  async function classifySingleText(text) {
    const prompt = `You are a content classifier.
Classify this text snippet: "${text}"

Rules:
- AD: Classify as AD ONLY if the text is clearly a commercial advertisement, sponsored product promotion, or sales pitch for an external product/service (e.g., "Купите со скидкой", "Лучший хостинг", "Зарабатывайте дома").
- OK: Classify as OK if the text is a normal article title, technical subheading, feature description, list item, or general educational/news content (even if it describes software features or benefits like "Визуальное превосходство", "Умная интеграция").
- If the text is a clickbait headline (exaggerated, sensationalized, misleading, or designed as curiosity gaps, e.g., "Шок! Вы не поверите...", "Спала с моим мужем..."), do NOT output OK or AD. Instead, output a neutral, factual rewrite of the headline (10-200 characters) in the same language that removes the clickbait and emotional quotes.

Output ONLY the result (AD, OK, or the rewritten headline). Do not add any labels like "REWRITE:", explanations, or quotes.`;

    try {
      const response = await aiSession.prompt(prompt);
      const clean = response.trim();
      const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      let result = { type: 'ok', value: '' };

      // 1. Search for AD (ensuring no negation words like NOT or NO are present)
      const hasAD = lines.some(line => {
        const cleanLineUpper = line.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'’«»“”]/g, "").toUpperCase().trim();
        return /\bAD\b/.test(cleanLineUpper) && !/\b(NOT|NO|NEITHER|NORMAL)\b/.test(cleanLineUpper);
      });

      if (hasAD) {
        result = { type: 'ad', value: '' };
      } else {
        // 2. Search for a valid rewritten headline line
        let foundRewrite = null;
        for (const line of lines) {
          // Strip "REWRITE:" prefix if the model prepended it
          let cleanLine = line.replace(/^REWRITE\s*:?\s*/i, '').trim();
          // Clean up wrapping quotes if the model returned it as a quoted string
          cleanLine = cleanLine.replace(/^["'«“](.*)["'»”]$/, '$1').trim();

          const u = cleanLine.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'’«»“”]/g, "").toUpperCase().trim();

          if (
            cleanLine.length >= 10 &&
            cleanLine.length <= 200 &&
            !/[<>{}\[\]]/.test(cleanLine) &&
            u !== 'OK' &&
            u !== 'AD' &&
            u !== 'NORMAL' &&
            !u.startsWith('CLASSIFICATION')
          ) {
            foundRewrite = cleanLine;
            break;
          }
        }

        if (foundRewrite) {
          result = { type: 'rewrite', value: foundRewrite };
        } else {
          // 3. Fallback: check if any line indicates OK or NORMAL content
          const hasOK = lines.some(line => {
            const cleanLineUpper = line.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'’«»“”]/g, "").toUpperCase().trim();
            return /\bOK\b/.test(cleanLineUpper) || /\bNORMAL\b/.test(cleanLineUpper);
          });
          if (hasOK) {
            result = { type: 'ok', value: '' };
          }
        }
      }

      console.log(`[HabaNada Bridge] Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" => Raw AI: "${clean.replace(/\n/g, ' | ')}" => Decided: ${result.type.toUpperCase()}`);
      return result;
    } catch (err) {
      console.error('[HabaNada Bridge] Error classifying text snippet:', err);
      return { type: 'ok', value: '' }; // Fail safe
    }
  }

  /**
   * Classify an array of texts using the AI model
   * @param {string[]} texts - Array of text snippets to classify
   * @returns {Promise<Array<{type: 'ad'|'ok'|'rewrite', value: string}>>}
   */
  async function classifyTexts(texts) {
    if (!aiSession || !aiAvailable) {
      // Try to recreate session if it failed earlier
      await initAI();
      if (!aiSession || !aiAvailable) {
        throw new Error('AI session not available');
      }
    }

    try {
      // Process all texts in parallel using Promise.all
      const results = await Promise.all(texts.map(text => classifySingleText(text)));
      return results;
    } catch (err) {
      console.error('[HabaNada Bridge] Prompt error, resetting session:', err);
      aiSession = null;
      aiAvailable = false;
      throw err;
    }
  }

  // Listen for requests from content.js
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== SOURCE_REQUEST) return;

    const { requestId, texts } = event.data;

    try {
      const results = await classifyTexts(texts);
      window.postMessage({
        source: SOURCE_RESPONSE,
        requestId,
        results
      }, '*');
    } catch (err) {
      console.error(`[HabaNada Bridge] Classification error (req ${requestId}):`, err);
      window.postMessage({
        source: SOURCE_RESPONSE,
        requestId,
        results: Array(texts.length).fill({ type: 'ok', value: '' }),
        error: err.message
      }, '*');
    }
  });

  // Initialize on load
  initAI();
})();
