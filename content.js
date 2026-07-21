/**
 * HabaNada — Content Script
 * Scans DOM for main article title (H1) and teaser/promo blocks,
 * sends them to Main World AI bridge for clickbait rewriting or native ad blocking,
 * and modifies the DOM based on results.
 * Runs in Isolated World.
 */

(() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────
  const SOURCE_REQUEST = 'habanada-ai-request';
  const SOURCE_RESPONSE = 'habanada-ai-response';
  const SOURCE_STATUS = 'habanada-ai-status';
  const PROCESSED_ATTR = 'data-habanada-processed';
  const HIDDEN_CLASS = 'habanada-hidden';
  
  // BATCH_SIZE of 3 and MAX_CONCURRENT of 2 for lightweight execution
  const BATCH_SIZE = 3;
  const MAX_CONCURRENT = 2;

  /** 
   * CSS selectors for elements to analyze:
   * Only target the main page title (H1) for clickbait, and teaser/promo blocks for native ads.
   * We do NOT scan H2, H3, H4 inside the article text to prevent false positives and timeouts.
   */
  const TARGET_SELECTORS = [
    'h1',
    '[class*="teaser"]', '[class*="promo"]'
  ].join(', ');

  // ── State ──────────────────────────────────────────────────────────
  let isAdBlockEnabled = true;
  let isClickbaitEnabled = true;
  let aiAvailable = false;
  let requestCounter = 0;
  const decisionCache = new Map(); // Cache to prevent duplicate classifications on SPA re-renders
  /** @type {Map<number, {resolve: Function, reject: Function}>} */
  const pendingRequests = new Map();

  // ── AdShield / OptiDigital Interception ─────────────────────────────
  const scriptObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'SCRIPT') {
          const rawSrc = node.src;
          if (!rawSrc) continue;
          const src = typeof rawSrc === 'string' ? rawSrc : String(rawSrc);
          if (src.startsWith('chrome-extension:')) continue;
          
          let isAdShield = false;
          try {
            const url = new URL(src);
            const filename = url.pathname.split('/').pop() || '';
            const hostname = url.hostname.toLowerCase();
            
            // Whitelist trusted CDN domains to prevent false positives on third-party services
            const trustedCdns = [
              'cloudflare.com', 'cloudflareinsights.com', 'google-analytics.com', 
              'googletagmanager.com', 'googleapis.com', 'gstatic.com', 
              'yandex.net', 'yastatic.net', 'jquery.com', 'bootstrapcdn.com'
            ];
            const isTrustedCdn = trustedCdns.some(domain => hostname === domain || hostname.endsWith('.' + domain));

            // Whitelist common static asset/build folders to avoid blocking legitimate bundled scripts
            const isStaticFolder = /\/(static|assets|webpack|dist|js|build|packs|modules|wp-includes|wp-content|themes|plugins|npm|node_modules)\//i.test(url.pathname) ||
                                  /\/(main|common|vendor|vendors|app|index)\..+\.js$/i.test(filename);

            if (!isTrustedCdn && !isStaticFolder) {
              // Check for very long alphanumeric strings in hostname or filename (AdShield signature)
              const isObfuscatedFile = /^[a-z0-9]{30,}/i.test(filename.replace(/\.js$/, ''));
              const isObfuscatedHost = /^[a-z0-9]{20,}/i.test(hostname.split('.')[0]);
              
              if (
                src.includes('optidigital') ||
                src.includes('adshield') ||
                src.includes('target_type=') ||
                isObfuscatedFile ||
                isObfuscatedHost
              ) {
                isAdShield = true;
              }
            }
          } catch (e) {
            // Fallback for relative paths - check that they don't contain standard directories
            const isStaticFolderFallback = /\/(static|assets|webpack|dist|js|build|packs|modules|wp-includes|wp-content|themes|plugins|npm|node_modules)\//i.test(src);
            if (!isStaticFolderFallback) {
              if (
                src.includes('optidigital') || 
                src.includes('adshield') || 
                src.includes('target_type=') || 
                /^[a-z0-9]{30,}/i.test(src)
              ) {
                isAdShield = true;
              }
            }
          }
          
          if (isAdShield) {
            console.log('[HabaNada] Blocked AdShield / OptiDigital script:', src);
            node.type = 'text/plain'; // Prevent execution
            node.remove(); // Remove from DOM
          }
        }
      }
    }
  });
  
  function startScriptObserver() {
    const target = document.documentElement || document;
    if (target) {
      scriptObserver.observe(target, { childList: true, subtree: true });
    } else {
      setTimeout(startScriptObserver, 1);
    }
  }
  startScriptObserver();

  // ── Styles ─────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .${HIDDEN_CLASS},
    ins.adsbygoogle,
    [class*="adsbygoogle" i],
    [id^="yandex_rtb" i],
    [class*="yandex-rtb" i],
    [id^="ya_direct" i],
    [class*="ya-partner" i],
    [class*="ya_direct" i],
    [class*="creative-" i],
    [class*="creative_container" i],
    [class*="creativecontainer" i],
    [class*="header-bidding" i],
    [class*="traffic-exchange" i],
    [class*="scrooge-" i],
    creative-container,
    .creative-container,
    .creative-placeholder,
    header-bidding,
    .header-bidding,
    traffic-exchange-widget,
    .traffic-exchange-widget,
    [id*="header-bottom" i],
    [class*="header-bottom" i],
    [id*="read-also" i],
    [class*="read-also" i],
    [class*="advertisement" i],
    [class*="ad-wrapper" i],
    [class*="ad-container" i],
    [class*="ad-slot" i],
    [class*="ad-banner" i],
    [class*="ad-block" i],
    [class*="outbrain" i],
    [class*="taboola" i],
    [class*="teads" i],
    [class*="adform" i],
    [class*="criteo" i],
    [class*="sponsored-recommendation" i],
    [class*="native-ad" i],
    [id*="advertisement" i],
    [id*="ad-wrapper" i],
    [id*="ad-container" i],
    [id*="ad-slot" i],
    [id*="ad-banner" i],
    [id*="ad-block" i],
    [id*="outbrain" i],
    [id*="taboola" i] {
      display: none !important;
      height: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;
  
  function injectStyles() {
    const parent = document.head || document.documentElement;
    if (parent) {
      parent.appendChild(style);
    } else {
      setTimeout(injectStyles, 1);
    }
  }
  injectStyles();
  injectBridge();

  // ── Empty Ad Wrapper Collapsing ─────────────────────────────────────
  const AD_CHILD_SELECTOR = [
    'ins.adsbygoogle', '[class*="adsbygoogle" i]', '[id^="yandex_rtb" i]', '[class*="yandex-rtb" i]',
    '[id^="ya_direct" i]', '[class*="ya-partner" i]', '[class*="ya_direct" i]', '[class*="creative-" i]',
    '[class*="creative_container" i]', '[class*="creativecontainer" i]', '[class*="header-bidding" i]',
    '[class*="traffic-exchange" i]', '[class*="scrooge-" i]',
    'creative-container', '.creative-container', '.creative-placeholder', 'header-bidding', '.header-bidding',
    'traffic-exchange-widget', '.traffic-exchange-widget', '[id*="header-bottom" i]', '[class*="header-bottom" i]',
    '[id*="read-also" i]', '[class*="read-also" i]', '[class*="advertisement" i]', '[class*="ad-wrapper" i]',
    '[class*="ad-container" i]', '[class*="ad-slot" i]', '[class*="ad-banner" i]', '[class*="ad-block" i]',
    '[class*="outbrain" i]', '[class*="taboola" i]', '[class*="teads" i]', '[class*="adform" i]', '[class*="criteo" i]',
    '[class*="sponsored-recommendation" i]', '[class*="native-ad" i]', '[id*="advertisement" i]',
    '[id*="ad-wrapper" i]', '[id*="ad-container" i]', '[id*="ad-slot" i]', '[id*="ad-banner" i]',
    '[id*="ad-block" i]', '[id*="outbrain" i]', '[id*="taboola" i]'
  ].join(', ');

  function collapseEmptyAdWrappers() {
    const containers = document.querySelectorAll(
      '.container-fluid, [class*="creative_container" i], [class*="creativecontainer" i], [class*="header-bidding" i], .creative-container, .header-bidding'
    );
    for (const container of containers) {
      const hasAdChild = container.querySelector(AD_CHILD_SELECTOR);
      if (hasAdChild) {
        const text = container.textContent.trim();
        if (text.length < 5) {
          const hasImages = container.querySelector('img, iframe:not([class*="ad"]):not([id*="ad"]):not([src*="ad"])');
          if (!hasImages) {
            container.style.setProperty('display', 'none', 'important');
            container.style.setProperty('height', '0', 'important');
            container.style.setProperty('min-height', '0', 'important');
            container.style.setProperty('margin', '0', 'important');
            container.style.setProperty('padding', '0', 'important');
          }
        }
      }
    }
  }

  // ── Autoplay Video Ad Blocking ─────────────────────────────────────
  let lastUserInteractionTime = 0;
  let lastClickedElement = null;
  
  // Track user clicks to allow user-initiated videos
  document.addEventListener('click', (event) => {
    lastUserInteractionTime = Date.now();
    lastClickedElement = event.target;
  }, true);

  function checkUserInitiated(video) {
    const now = Date.now();
    const wasClickedRecently = (now - lastUserInteractionTime) < 2000; // 2 seconds window
    if (!wasClickedRecently || !lastClickedElement) return false;

    // Check if click was inside this player container
    const container = video.closest('.jwplayer, [class*="player" i], [class*="video" i], [id*="player" i], [id*="video" i]') || video.parentElement;
    return !!(container && container.contains(lastClickedElement));
  }

  function blockAutoplayVideoAds() {
    if (!isAdBlockEnabled) return;
    const videos = document.querySelectorAll('video');
    
    for (const video of videos) {
      // Allow if the user directly clicked inside this video player
      if (checkUserInitiated(video)) continue;
      
      const isAutoplay = video.autoplay || video.hasAttribute('autoplay');
      const isMuted = video.muted || video.hasAttribute('muted');
      
      const playerContainer = video.closest('.jwplayer');
      const isJwAd = playerContainer && (
        playerContainer.classList.contains('jw-flag-ads') || 
        playerContainer.classList.contains('jw-flag-autoplay')
      );
      
      const isInsideAdWrapper = video.closest(
        '[class*="video-ad" i], [class*="outstream" i], [class*="connatix" i], [class*="primis" i], [class*="sticky-video" i], [class*="floating-video" i]'
      );

      // Block if player is explicitly ad-flagged, wrapped in ads container, or is playing automatically
      if (isJwAd || isInsideAdWrapper || isAutoplay || isMuted) {
        video.pause();
        video.muted = true;
        
        const targetContainer = playerContainer || isInsideAdWrapper || video.parentElement;
        if (targetContainer && !targetContainer.hasAttribute('data-habanada-video-blocked')) {
          targetContainer.style.setProperty('display', 'none', 'important');
          targetContainer.style.setProperty('height', '0', 'important');
          targetContainer.style.setProperty('min-height', '0', 'important');
          targetContainer.style.setProperty('margin', '0', 'important');
          targetContainer.style.setProperty('padding', '0', 'important');
          targetContainer.setAttribute('data-habanada-video-blocked', 'true');
          console.log('[HabaNada] Blocked and collapsed autoplay video ad player:', targetContainer.className || targetContainer.id);
        }
      }
    }
  }

  // Intercept programmatic play requests on videos
  document.addEventListener('play', (event) => {
    if (!isAdBlockEnabled) return;
    const video = event.target;
    if (video && video.tagName === 'VIDEO') {
      // Allow if the user directly clicked inside this video player
      if (checkUserInitiated(video)) return;
      
      const isMuted = video.muted || video.hasAttribute('muted');
      const isAutoplay = video.autoplay || video.hasAttribute('autoplay');
      const playerContainer = video.closest('.jwplayer');
      const isJwAd = playerContainer && (
        playerContainer.classList.contains('jw-flag-ads') || 
        playerContainer.classList.contains('jw-flag-autoplay')
      );
      
      const isInsideAdWrapper = video.closest(
        '[class*="video-ad" i], [class*="outstream" i], [class*="connatix" i], [class*="primis" i], [class*="sticky-video" i], [class*="floating-video" i]'
      );
      
      if (isJwAd || isInsideAdWrapper || isAutoplay || isMuted || !event.isTrusted) {
        video.pause();
        video.muted = true;
        const targetContainer = playerContainer || isInsideAdWrapper || video.parentElement;
        if (targetContainer) {
          targetContainer.style.setProperty('display', 'none', 'important');
          targetContainer.style.setProperty('height', '0', 'important');
          targetContainer.style.setProperty('min-height', '0', 'important');
          targetContainer.style.setProperty('margin', '0', 'important');
          targetContainer.style.setProperty('padding', '0', 'important');
          targetContainer.setAttribute('data-habanada-video-blocked', 'true');
          console.log('[HabaNada] Intercepted and collapsed dynamic autoplay video ad player');
        }
      }
    }
  }, true);

  // ── Anti-AdBlock Notice Killer ─────────────────────────────────────
  function removeAntiAdblockNotices() {
    if (!isAdBlockEnabled) return;
    
    const elements = document.querySelectorAll('div, section, dialog, p, span, h1, h2, h3');
    const keywords = [
      // Anti-AdBlock
      'разрешите рекламу', 'отключите блокировщик', 'обнаружен блокировщик',
      'доходов от рекламы', 'пожалуйста, разрешите', 'пожалуйста, отключите',
      'disable your adblock', 'disable your ad blocker', 'adblock detected',
      'ad blocker detected', 'whitelist us', 'whitelist our', 'allow ads',
      'please allow ads', 'ad revenue', 'support this site with ads',
      
      // Annoyances (Subscriptions, Notifications, Newsletters)
      'разрешить уведомления', 'включить уведомления', 'подпишитесь на новости', 
      'подпишитесь на рассылку', 'наша рассылка', 'подписка на новости',
      'subscribe to our newsletter', 'sign up for our newsletter', 'subscribe to newsletter',
      'get our newsletter', 'stay updated', 'receive notifications', 'allow notifications',
      'enable notifications', 'get the latest updates', 'subscribe now'
    ];
    
    let noticeFound = false;
    
    for (const el of elements) {
      if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
      
      const text = el.textContent.toLowerCase();
      const hasKeyword = keywords.some(kw => text.includes(kw));
      
      if (hasKeyword) {
        // Walk up to 5 levels to find the actual overlay/modal container
        let targetToHide = null;
        let current = el;
        
        for (let depth = 0; depth < 5; depth++) {
          if (!current || current.nodeType !== Node.ELEMENT_NODE || current === document.body || current === document.documentElement) break;
          
          let isOverlay = false;
          try {
            const style = window.getComputedStyle(current);
            isOverlay = style.position === 'fixed' || style.position === 'absolute' || parseInt(style.zIndex) > 100;
          } catch (e) {}
          
          const classNameAndId = (current.className || '') + ' ' + (current.id || '');
          const isNoticeClass = /[a-z0-9-_]*(notice|modal|overlay|popup|adblock|dialog)[a-z0-9-_]*/i.test(classNameAndId);
          
          if (isOverlay || isNoticeClass || current.tagName === 'DIALOG') {
            targetToHide = current;
            break;
          }
          current = current.parentElement;
        }
        
        // Default to the element itself if no overlay ancestor found
        const finalTarget = targetToHide || el;
        
        if (finalTarget && !finalTarget.hasAttribute('data-habanada-notice-hidden')) {
          finalTarget.style.setProperty('display', 'none', 'important');
          finalTarget.style.setProperty('visibility', 'hidden', 'important');
          finalTarget.style.setProperty('opacity', '0', 'important');
          finalTarget.style.setProperty('pointer-events', 'none', 'important');
          finalTarget.setAttribute('data-habanada-notice-hidden', 'true');
          noticeFound = true;
          console.log('[HabaNada] Hiding anti-adblock notice container:', finalTarget.className || finalTarget.id || finalTarget.tagName);
        }
      }
    }
    
    if (noticeFound) {
      document.body.style.setProperty('overflow', 'auto', 'important');
      document.body.style.setProperty('overflow-y', 'auto', 'important');
      document.body.style.setProperty('position', 'static', 'important');
      document.documentElement.style.setProperty('overflow', 'auto', 'important');
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
      document.body.classList.remove('modal-open', 'sp-no-scroll', 'adblock-lock');
    }
  }

  // ── Bridge Communication ───────────────────────────────────────────

  /**
   * Inject bridge.js into the page's Main World
   */
  function injectBridge() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('bridge.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  /**
   * Listen for responses from bridge.js
   */
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    // AI status update
    if (event.data?.source === SOURCE_STATUS) {
      aiAvailable = event.data.available;
      console.log(`[HabaNada] AI available: ${aiAvailable} (${event.data.statusText})`);
      
      // Relay status to background service worker so popup can see it
      chrome.runtime.sendMessage({
        type: 'SET_AI_STATUS',
        available: aiAvailable,
        statusText: event.data.statusText
      }).catch(() => {});

      if (aiAvailable && (isAdBlockEnabled || isClickbaitEnabled)) {
        scanDOM();
      }
      return;
    }

    // AI classification response
    if (event.data?.source === SOURCE_RESPONSE) {
      const { requestId, results, error } = event.data;
      const pending = pendingRequests.get(requestId);
      if (pending) {
        pendingRequests.delete(requestId);
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(results);
        }
      }
      return;
    }
  });

  /**
   * Send a batch of texts to the AI bridge for classification
   * @param {string[]} texts
   * @returns {Promise<Array<{type: 'ad'|'ok'|'rewrite', value: string}>>}
   */
  function requestClassification(texts) {
    return new Promise((resolve, reject) => {
      const requestId = ++requestCounter;
      pendingRequests.set(requestId, { resolve, reject });

      window.postMessage({
        source: SOURCE_REQUEST,
        requestId,
        texts
      }, '*');

      // Timeout after 90 seconds (generous headroom for local AI queue on slower devices)
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          reject(new Error(`Classification timeout (req ${requestId})`));
        }
      }, 90000);
    });
  }

  function normalizeText(text) {
    return (text || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * Collect unprocessed text elements from the DOM
   * @returns {Array<{element: Element, text: string}>}
   */
  function collectElements() {
    const selectors = [];
    if (isClickbaitEnabled) {
      selectors.push('h1');
    }
    if (isAdBlockEnabled) {
      selectors.push(
        '[class*="teaser"]', '[class*="promo"]',
        '[class*="advertis" i]', '[class*="ad-box" i]', '[class*="ad-wrapper" i]', 
        '[class*="ad-container" i]', '[class*="ad-slot" i]', '[class*="ad-banner" i]',
        '[class*="outbrain" i]', '[class*="taboola" i]', '[class*="native-ad" i]'
      );
    }
    
    if (selectors.length === 0) return [];
      
    const elements = document.querySelectorAll(selectors.join(', '));
    const results = [];

    for (const el of elements) {
      // Skip already processed
      if (el.hasAttribute(PROCESSED_ATTR)) continue;

      // Skip elements inside header, footer, nav, menus, sidebars, and search boxes
      // BUT never skip the main H1 title tag, even if it is wrapped in an HTML5 <header> container
      if (el.tagName !== 'H1') {
        if (el.closest('header, footer, nav, [class*="menu"], [class*="nav"], [class*="sidebar"], [id*="sidebar"], [class*="search"]')) {
          continue;
        }
      }

      // Skip invisible elements
      if (el.offsetParent === null && el.tagName !== 'BODY') continue;

      const text = (el.textContent || '').trim();

      // Skip empty or very short text
      if (text.length < 5) continue;

      // Skip very long text
      if (text.length > 500) continue;

      // Check cache first to avoid re-processing identical text (e.g. on React re-renders)
      const normText = normalizeText(text);
      if (decisionCache.has(normText)) {
        const decision = decisionCache.get(normText);
        el.setAttribute(PROCESSED_ATTR, 'true');
        if (decision.type === 'ad') {
          hideAdElement(el);
        } else if (decision.type === 'rewrite') {
          rewriteHeadline(el, decision.value);
        }
        continue; // Skip AI classification
      }

      results.push({ element: el, text });
    }

    return results;
  }

  /**
   * Split array into batches
   * @template T
   * @param {T[]} array
   * @param {number} size
   * @returns {T[][]}
   */
  function chunk(array, size) {
    const batches = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }

  // ── DOM Modification ───────────────────────────────────────────────

  /**
   * Hide an ad element by finding its closest meaningful container
   * @param {Element} element
   */
  function hideAdElement(element) {
    // Find the closest ad card/item/sidebar. Exclude top-level article/section tags
    const container = element.closest('aside, li, [class*="card"], [class*="item"], [class*="teaser"], [class*="promo"]') || element;
    
    // Safety check: Never hide main page wrappers, the body, or elements containing the main H1 title
    if (
      container.tagName === 'BODY' || 
      container.tagName === 'HTML' || 
      (container.tagName !== 'H1' && container.querySelector('h1')) || 
      container.classList.contains('post-layout')
    ) {
      console.warn('[HabaNada] Refusing to hide main page container:', container.tagName, container.className);
      // Fallback to hiding the element itself
      element.classList.add(HIDDEN_CLASS);
      element.setAttribute(PROCESSED_ATTR, 'true');
      return;
    }

    container.classList.add(HIDDEN_CLASS);
    container.setAttribute(PROCESSED_ATTR, 'true');
    console.log('[HabaNada] Hidden ad container:', container.tagName, container.className);
  }

  /**
   * Rewrite a clickbait headline with neutral text
   * @param {Element} element
   * @param {string} newText
   */
  function rewriteHeadline(element, newText) {
    const originalText = element.textContent;
    element.textContent = newText;
    element.setAttribute(PROCESSED_ATTR, 'true');
    element.setAttribute('data-habanada-original', originalText);
    element.title = `Original: ${originalText}`;
    console.log(`[HabaNada] Rewritten: "${originalText}" → "${newText}"`);
  }

  // ── Main Processing Pipeline ───────────────────────────────────────

  /**
   * Process a batch of elements through the AI classifier
   * @param {Array<{element: Element, text: string}>} batch
   */
  async function processBatch(batch) {
    const texts = batch.map(item => item.text);

    try {
      const results = await requestClassification(texts);
      let blockedCount = 0;
      let rewrittenCount = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const { element, text } = batch[i];
        const normText = normalizeText(text);

        // Mark as processed regardless of result
        element.setAttribute(PROCESSED_ATTR, 'true');

        switch (result.type) {
          case 'ad':
            decisionCache.set(normText, { type: 'ad' });
            hideAdElement(element);
            blockedCount++;
            break;
          case 'rewrite':
            {
              const original = element.textContent || '';
              const cleanOriginal = original.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
              const cleanRewritten = result.value.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
              if (cleanOriginal !== cleanRewritten) {
                decisionCache.set(normText, { type: 'rewrite', value: result.value });
                rewriteHeadline(element, result.value);
                rewrittenCount++;
              } else {
                decisionCache.set(normText, { type: 'ok' });
                console.log(`[HabaNada] Ignored identical rewrite: "${original}"`);
              }
            }
            break;
          case 'ok':
          default:
            decisionCache.set(normText, { type: 'ok' });
            // Normal content, leave untouched
            break;
        }
      }

      // Report stats to background
      if (blockedCount > 0 || rewrittenCount > 0) {
        chrome.runtime.sendMessage({
          type: 'UPDATE_STATS',
          delta: { blocked: blockedCount, rewritten: rewrittenCount }
        }).catch(() => {}); // Fire-and-forget
      }
    } catch (err) {
      console.error('[HabaNada] Batch processing error:', err);
      // Mark all as processed to prevent re-processing
      for (const { element } of batch) {
        element.setAttribute(PROCESSED_ATTR, 'true');
      }
    }
  }

  /**
   * Scan the DOM and process all unprocessed elements
   * Limits concurrency to MAX_CONCURRENT batches at a time
   */
  async function scanDOM() {
    if (!aiAvailable) return;
    if (!isAdBlockEnabled && !isClickbaitEnabled) return;

    const elements = collectElements();
    if (elements.length === 0) return;

    console.log(`[HabaNada] Scanning ${elements.length} elements`);

    const batches = chunk(elements, BATCH_SIZE);

    // Process batches with limited concurrency
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
      const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT);
      await Promise.all(concurrentBatches.map(batch => processBatch(batch)));
    }

    console.log('[HabaNada] Scan complete');
  }

  // ── MutationObserver ────────────────────────────────

  let debounceTimer = null;

  /**
   * Debounced DOM mutation handler
   */
  function onDOMMutation() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      scanDOM();
      if (isAdBlockEnabled) {
        collapseEmptyAdWrappers();
        blockAutoplayVideoAds();
        removeAntiAdblockNotices();
      }
    }, 500);
  }

  /**
   * Start observing DOM for new content (infinite scroll, SPA navigation)
   */
  function startObserver() {
    const target = document.body || document.documentElement;
    if (!target) {
      setTimeout(startObserver, 10);
      return;
    }
    const observer = new MutationObserver((mutations) => {
      // Only react to mutations that add new nodes
      const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
      if (hasNewNodes) {
        onDOMMutation();
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  // ── Initialization ─────────────────────────────────────────────────

  async function init() {
    try {
      // Check if extension is enabled for this domain
      const domain = window.location.hostname;
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STATUS',
        domain
      });

      isAdBlockEnabled = !!response?.enabled;
      isClickbaitEnabled = !!response?.settings?.rewriteClickbait;

      if (!isAdBlockEnabled && !isClickbaitEnabled) {
        console.log(`[HabaNada] Disabled (both AdBlock and Clickbait off) for ${domain}`);
        style.remove();
        scriptObserver.disconnect();
        return;
      }

      if (!isAdBlockEnabled) {
        style.remove();
        scriptObserver.disconnect();
      }

      console.log(`[HabaNada] Active on ${domain}. AdBlock: ${isAdBlockEnabled}, Clickbait: ${isClickbaitEnabled}`);

      // Signal background script to reset tab stats for this new page load
      await chrome.runtime.sendMessage({ type: 'RESET_STATS' }).catch(() => {});

      // Notify bridge.js about the AdBlock status
      window.postMessage({
        source: 'habanada-status-update',
        adBlockEnabled: isAdBlockEnabled
      }, '*');

      // Start MutationObserver for dynamic content
      startObserver();

      // Initial cleanup of empty ad wrappers and autoplay video ads
      if (isAdBlockEnabled) {
        collapseEmptyAdWrappers();
        blockAutoplayVideoAds();
        removeAntiAdblockNotices();
      }

    } catch (err) {
      console.error('[HabaNada] Initialization error:', err);
    }
  }

  init();
})();
