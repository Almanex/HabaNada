/**
 * HabaNada — Popup Script
 * Manages the extension popup UI: domain toggle, clickbait toggle, AI status, stats display (both tab-specific and total).
 * Uses defensive programming to prevent crashes due to missing DOM elements.
 * Automatically translates the UI to Russian, German, Spanish, French, or English based on the browser's language setting.
 */

(() => {
  'use strict';

  console.log('[HabaNada Popup] Script loaded');

  // Detect UI language
  const uiLanguage = (chrome.i18n.getUILanguage() || navigator.language || 'en').toLowerCase();
  let lang = 'en';
  if (uiLanguage.startsWith('ru')) lang = 'ru';
  else if (uiLanguage.startsWith('de')) lang = 'de';
  else if (uiLanguage.startsWith('es')) lang = 'es';
  else if (uiLanguage.startsWith('fr')) lang = 'fr';

  const translations = {
    ru: {
      'lbl-current-domain': 'Текущий домен',
      'lbl-shield-active': 'Блокировка рекламы',
      'lbl-anti-clickbait': 'Антикликбейт (ИИ)',
      'lbl-on-this-page': 'На этой странице',
      'lbl-ads-hidden': 'Скрыто рекламы',
      'lbl-rewritten': 'Переписано',
      'lbl-footer': 'Работает на Gemini Nano',
      'domain-loading': 'загрузка...',
      'domain-internal': 'Внутренняя страница',
      'ai-online': 'ИИ: Активен (Gemini Nano)',
      'ai-offline': 'ИИ: Недоступен',
      'ai-checking': 'ИИ: Проверка...',
      'ai-downloading': 'ИИ: Загрузка модели...',
      'ai-api-disabled': 'ИИ: Отключен (проверьте флаги)',
      'ai-checking-page': 'ИИ: Проверка на странице...',
      'ai-disabled-internal': 'ИИ: Отключен на служебных страницах'
    },
    de: {
      'lbl-current-domain': 'Aktuelle Domain',
      'lbl-shield-active': 'Werbung blockieren',
      'lbl-anti-clickbait': 'Clickbait umschreiben',
      'lbl-on-this-page': 'Auf dieser Seite',
      'lbl-ads-hidden': 'Werbung ausgeblendet',
      'lbl-rewritten': 'Umgeschrieben',
      'lbl-footer': 'Unterstützt durch Gemini Nano',
      'domain-loading': 'wird geladen...',
      'domain-internal': 'Interne Seite',
      'ai-online': 'KI: Aktiv (Gemini Nano)',
      'ai-offline': 'KI: Nicht verfügbar',
      'ai-checking': 'KI: Überprüfung...',
      'ai-downloading': 'KI: Modell wird heruntergeladen...',
      'ai-api-disabled': 'KI: Deaktiviert (Flags prüfen)',
      'ai-checking-page': 'KI: Überprüfung der Seite...',
      'ai-disabled-internal': 'KI: Auf internen Seiten deaktiviert'
    },
    es: {
      'lbl-current-domain': 'Dominio actual',
      'lbl-shield-active': 'Bloquear anuncios',
      'lbl-anti-clickbait': 'Reescribir clickbait',
      'lbl-on-this-page': 'En esta página',
      'lbl-ads-hidden': 'Anuncios ocultados',
      'lbl-rewritten': 'Reescritos',
      'lbl-footer': 'Desarrollado por Gemini Nano',
      'domain-loading': 'cargando...',
      'domain-internal': 'Página interna',
      'ai-online': 'IA: Activa (Gemini Nano)',
      'ai-offline': 'IA: No disponible',
      'ai-checking': 'IA: Comprobando...',
      'ai-downloading': 'IA: Descargando modelo...',
      'ai-api-disabled': 'IA: Desactivada (comprobar flags)',
      'ai-checking-page': 'IA: Comprobando en la página...',
      'ai-disabled-internal': 'IA: Desactivada en páginas internas'
    },
    fr: {
      'lbl-current-domain': 'Domaine actuel',
      'lbl-shield-active': 'Bloquer les pubs',
      'lbl-anti-clickbait': 'Réécrire le clickbait',
      'lbl-on-this-page': 'Sur cette page',
      'lbl-ads-hidden': 'Publicités masquées',
      'lbl-rewritten': 'Réécrits',
      'lbl-footer': 'Propulsé par Gemini Nano',
      'domain-loading': 'chargement...',
      'domain-internal': 'Page interne',
      'ai-online': 'IA: Active (Gemini Nano)',
      'ai-offline': 'IA: Indisponible',
      'ai-checking': 'IA: Vérification...',
      'ai-downloading': 'IA: Téléchargement du modèle...',
      'ai-api-disabled': 'IA: Désactivée (vérifier les flags)',
      'ai-checking-page': 'IA: Vérification sur la page...',
      'ai-disabled-internal': 'IA: Désactivée sur les pages internes'
    },
    en: {
      'lbl-current-domain': 'Current domain',
      'lbl-shield-active': 'Block ads',
      'lbl-anti-clickbait': 'Rewrite clickbait',
      'lbl-on-this-page': 'On this page',
      'lbl-ads-hidden': 'Ads hidden',
      'lbl-rewritten': 'Rewritten',
      'lbl-footer': 'Powered by Gemini Nano',
      'domain-loading': 'loading...',
      'domain-internal': 'Internal Page',
      'ai-online': 'AI: Active (Gemini Nano)',
      'ai-offline': 'AI: Unavailable',
      'ai-checking': 'AI: Checking...',
      'ai-downloading': 'AI: Downloading model...',
      'ai-api-disabled': 'AI: API disabled (check flags)',
      'ai-checking-page': 'AI: Checking in page...',
      'ai-disabled-internal': 'AI: Disabled on internal pages'
    }
  };

  const domainEl = document.getElementById('domain-name');
  const toggleEl = document.getElementById('toggle-enabled');
  const toggleClickbait = document.getElementById('toggle-clickbait');
  const aiIndicator = document.getElementById('ai-indicator');
  const aiLabel = document.getElementById('ai-label');
  
  // Tab-specific elements
  const statBlocked = document.getElementById('stat-blocked');
  const statRewritten = document.getElementById('stat-rewritten');

  /** @type {string} Current tab's domain */
  let currentDomain = '';

  /**
   * Translate UI elements dynamically based on lang
   */
  function applyTranslations() {
    const t = translations[lang];
    for (const [id, text] of Object.entries(t)) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = text;
      }
    }
    // Handle elements containing nested markup (strong tags)
    const totalBlockedEl = document.getElementById('lbl-total-hidden');
    if (totalBlockedEl) {
      const labels = {
        ru: 'Всего скрыто: ',
        en: 'Total hidden: ',
        de: 'Insgesamt ausgeblendet: ',
        es: 'Total ocultados: ',
        fr: 'Total masqués : '
      };
      const text = labels[lang] || labels.en;
      totalBlockedEl.innerHTML = `${text}<strong id="total-blocked">0</strong>`;
    }
    const totalRewrittenEl = document.getElementById('lbl-total-rewritten');
    if (totalRewrittenEl) {
      const labels = {
        ru: 'Всего переписано: ',
        en: 'Total rewritten: ',
        de: 'Insgesamt umgeschrieben: ',
        es: 'Total reescritos: ',
        fr: 'Total réécrits : '
      };
      const text = labels[lang] || labels.en;
      totalRewrittenEl.innerHTML = `${text}<strong id="total-rewritten">0</strong>`;
    }
  }

  /**
   * Helper to retrieve the active tab in a robust manner
   * @returns {Promise<chrome.tabs.Tab|null>}
   */
  async function getActiveTab() {
    try {
      // 1. Try lastFocusedWindow (needed when inspecting popup)
      let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) return tab;
      
      // 2. Try currentWindow fallback
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) return tab;
      
      // 3. Absolute fallback (get any active tab)
      const tabs = await chrome.tabs.query({ active: true });
      return tabs[0] || null;
    } catch (err) {
      console.warn('[HabaNada Popup] Failed to query active tab:', err);
      return null;
    }
  }

  /**
   * Get the active tab's URL and extract domain
   * @returns {Promise<string>}
   */
  async function getCurrentDomain() {
    const tab = await getActiveTab();
    if (!tab?.url) return '';
    try {
      const url = new URL(tab.url);
      // Disable on internal Chrome pages
      if (url.protocol.startsWith('chrome') || url.protocol.startsWith('edge') || url.protocol === 'about:') {
        return '';
      }
      return url.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Update the AI status indicator
   * @param {'online'|'offline'|'checking'} status
   * @param {string} [customLabel]
   */
  function setAIStatus(status, customLabel) {
    if (aiIndicator) {
      aiIndicator.className = `indicator indicator--${status}`;
    }
    const defaultLabels = {
      online: translations[lang]['ai-online'],
      offline: translations[lang]['ai-offline'],
      checking: translations[lang]['ai-checking']
    };
    if (aiLabel) {
      aiLabel.textContent = customLabel || defaultLabels[status] || defaultLabels.checking;
    }
  }

  /**
   * Load and display stats for the active tab and the total stats
   */
  async function loadStats() {
    try {
      const tab = await getActiveTab();
      const tabId = tab?.id;
      
      const stats = await chrome.runtime.sendMessage({ 
        type: 'GET_STATS', 
        tabId 
      });
      
      if (stats) {
        // Update "On this page" stats
        if (statBlocked) statBlocked.textContent = stats.tab?.blocked || 0;
        if (statRewritten) statRewritten.textContent = stats.tab?.rewritten || 0;
        
        // Update "Total" stats
        // We re-query the DOM elements because applyTranslations overwrites the innerHTML
        const totalBlockedVal = document.getElementById('total-blocked');
        const totalRewrittenVal = document.getElementById('total-rewritten');
        
        if (totalBlockedVal) totalBlockedVal.textContent = stats.total?.blocked || 0;
        if (totalRewrittenVal) totalRewrittenVal.textContent = stats.total?.rewritten || 0;
      }
    } catch (err) {
      console.warn('[HabaNada Popup] Stats not loaded:', err);
    }
  }

  /**
   * Check AI availability relayed via background service worker
   */
  async function checkAIStatus() {
    setAIStatus('checking');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_AI_STATUS' });
      console.log('[HabaNada Popup] Relayed AI Status:', response);
      
      if (response?.available) {
        setAIStatus('online');
      } else {
        if (response?.statusText === 'after-download') {
          setAIStatus('checking', translations[lang]['ai-downloading']);
        } else if (response?.statusText === 'no' || response?.statusText === 'API not found') {
          setAIStatus('offline', translations[lang]['ai-api-disabled']);
        } else if (response?.statusText === 'checking') {
          setAIStatus('checking', translations[lang]['ai-checking-page']);
        } else if (response?.statusText) {
          setAIStatus('offline', `${translations[lang]['ai-offline']} (${response.statusText})`);
        } else {
          setAIStatus('offline');
        }
      }
    } catch (err) {
      console.error('[HabaNada Popup] Check AI error:', err);
      setAIStatus('offline');
    }
  }

  /**
   * Initialize popup
   */
  async function init() {
    console.log('[HabaNada Popup] Initializing...');
    
    // Apply localized strings
    applyTranslations();

    currentDomain = await getCurrentDomain();
    console.log('[HabaNada Popup] Resolved domain:', currentDomain);

    if (!currentDomain) {
      if (domainEl) domainEl.textContent = translations[lang]['domain-internal'];
      if (toggleEl) toggleEl.disabled = true;
      if (toggleClickbait) toggleClickbait.disabled = true;
      setAIStatus('offline', translations[lang]['ai-disabled-internal']);
      return;
    }

    if (domainEl) domainEl.textContent = currentDomain;

    // Get current status and settings
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STATUS',
        domain: currentDomain
      });
      console.log('[HabaNada Popup] Status response:', response);
      if (toggleEl) toggleEl.checked = response?.enabled ?? true;
      if (toggleClickbait) toggleClickbait.checked = response?.settings?.rewriteClickbait ?? true;
    } catch (err) {
      console.warn('[HabaNada Popup] Error getting status:', err);
      if (toggleEl) toggleEl.checked = true;
      if (toggleClickbait) toggleClickbait.checked = true;
    }

    // Toggle handler (domain enable/disable)
    if (toggleEl) {
      toggleEl.addEventListener('change', async () => {
        console.log('[HabaNada Popup] Toggle clicked. New checked state:', toggleEl.checked);
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'TOGGLE_DOMAIN',
            domain: currentDomain
          });
          toggleEl.checked = response?.enabled ?? toggleEl.checked;
          
          // Reload active tab to apply block/allow rules immediately
          const tab = await getActiveTab();
          if (tab?.id) {
            chrome.tabs.reload(tab.id);
          }
        } catch (err) {
          console.error('[HabaNada Popup] Toggle error:', err);
        }
      });
    }

    // Toggle handler (clickbait enable/disable setting)
    if (toggleClickbait) {
      toggleClickbait.addEventListener('change', async () => {
        console.log('[HabaNada Popup] Clickbait toggle clicked. New checked state:', toggleClickbait.checked);
        try {
          await chrome.runtime.sendMessage({
            type: 'UPDATE_SETTINGS',
            delta: { rewriteClickbait: toggleClickbait.checked }
          });
          
          // Reload active tab to apply settings immediately
          const tab = await getActiveTab();
          if (tab?.id) {
            chrome.tabs.reload(tab.id);
          }
        } catch (err) {
          console.error('[HabaNada Popup] Settings toggle error:', err);
        }
      });
    }

    // Load stats and AI status
    await Promise.all([
      loadStats(),
      checkAIStatus()
    ]);
  }

  // Run initialization after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
