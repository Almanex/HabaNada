/**
 * HabaNada — Service Worker (Background Script)
 * Manages extension state, domain whitelist, dynamic Declarative Net Request rules,
 * global settings (like clickbait toggling), in-memory tab stats, persistent total stats,
 * and message routing.
 */

/** @type {string} Storage keys */
const WHITELIST_KEY = 'habanada_whitelist';
const STATS_KEY = 'habanada_stats';
const SETTINGS_KEY = 'habanada_settings';

/** Last known AI status relayed from content script / bridge */
let lastKnownAIStatus = {
  available: false,
  statusText: 'checking'
};

/** 
 * In-memory stats per tab
 * @type {Map<number, {blocked: number, rewritten: number}>}
 */
const tabStats = new Map();

/**
 * Get the whitelist from chrome.storage.local
 * @returns {Promise<string[]>} Array of whitelisted domains
 */
async function getWhitelist() {
  const result = await chrome.storage.local.get(WHITELIST_KEY);
  return result[WHITELIST_KEY] || [];
}

/**
 * Check if the extension is enabled for a given domain
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
async function isEnabled(domain) {
  const whitelist = await getWhitelist();
  return !whitelist.includes(domain);
}

/**
 * Toggle extension for a domain (add/remove from whitelist)
 * @param {string} domain
 * @returns {Promise<boolean>} New enabled state
 */
async function toggleDomain(domain) {
  const whitelist = await getWhitelist();
  const index = whitelist.indexOf(domain);
  if (index > -1) {
    whitelist.splice(index, 1);
  } else {
    whitelist.push(domain);
  }
  await chrome.storage.local.set({ [WHITELIST_KEY]: whitelist });
  await updateWhitelistRules(); // Sync dynamic rules immediately
  return !whitelist.includes(domain);
}

/**
 * Get global settings
 * @returns {Promise<{ rewriteClickbait: boolean }>}
 */
async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] || { rewriteClickbait: true };
}

/**
 * Update global settings
 * @param {{ rewriteClickbait?: boolean }} delta
 * @returns {Promise<{ rewriteClickbait: boolean }>}
 */
async function updateSettings(delta) {
  const settings = await getSettings();
  if (delta.rewriteClickbait !== undefined) {
    settings.rewriteClickbait = delta.rewriteClickbait;
  }
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

/**
 * Update declarativeNetRequest dynamic rules based on current whitelist.
 * Allows all requests on whitelisted domains by overriding static blocking rules.
 */
async function updateWhitelistRules() {
  try {
    const whitelist = await getWhitelist();
    
    // Get all existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    // Filter rules created by HabaNada (starting at ID 10000)
    const removeRuleIds = existingRules
      .filter(r => r.id >= 10000 && r.id < 20000)
      .map(r => r.id);
    
    // Create new rules for each whitelisted domain
    const addRules = whitelist.map((domain, index) => {
      return {
        id: 10000 + index,
        priority: 10, // Higher than static block rules (priority 1)
        action: { type: 'allowAllRequests' },
        condition: {
          urlFilter: `||${domain}`,
          resourceTypes: ['main_frame', 'sub_frame']
        }
      };
    });
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
    console.log('[HabaNada BG] Whitelist rules synchronized:', whitelist);
  } catch (err) {
    console.error('[HabaNada BG] Failed to sync whitelist dynamic rules:', err);
  }
}

/**
 * Update stats counters (both in-memory tab stats and persistent total stats)
 * @param {{ blocked?: number, rewritten?: number }} delta
 * @param {number} [tabId]
 */
async function updateStats(delta, tabId) {
  // 1. Update in-memory tab-specific stats
  if (tabId) {
    const current = tabStats.get(tabId) || { blocked: 0, rewritten: 0 };
    if (delta.blocked) current.blocked += delta.blocked;
    if (delta.rewritten) current.rewritten += delta.rewritten;
    tabStats.set(tabId, current);
  }

  // 2. Update persistent total stats
  const result = await chrome.storage.local.get(STATS_KEY);
  const stats = result[STATS_KEY] || { blocked: 0, rewritten: 0 };
  if (delta.blocked) stats.blocked += delta.blocked;
  if (delta.rewritten) stats.rewritten += delta.rewritten;
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

/**
 * Get current stats (both for active tab and total)
 * @param {number} [tabId]
 * @returns {Promise<{ tab: {blocked: number, rewritten: number}, total: {blocked: number, rewritten: number} }>}
 */
async function getStats(tabId) {
  const result = await chrome.storage.local.get(STATS_KEY);
  const total = result[STATS_KEY] || { blocked: 0, rewritten: 0 };
  
  // Clone to avoid mutating in-memory map state directly
  const tab = tabId ? { ...(tabStats.get(tabId) || { blocked: 0, rewritten: 0 }) } : { blocked: 0, rewritten: 0 };
  
  return { tab, total };
}

// Reset tab stats on new page navigation (BEFORE any network rules are matched)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Only main frame navigations
    tabStats.set(details.tabId, { blocked: 0, rewritten: 0 });
    console.log(`[HabaNada BG] Stats reset on navigation for tab ${details.tabId}`);
  }
});

// Clean up tab stats when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
});

// Listen to declarativeNetRequest rule matches (blocked network requests)
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    // Only count blocking rules (ruleId < 10000)
    if (info.request && info.request.tabId > 0 && info.rule && info.rule.ruleId < 10000) {
      const tabId = info.request.tabId;
      console.log(`[HabaNada BG] Rule matched: blocked request on tab ${tabId} (Rule ID: ${info.rule.ruleId}, URL: ${info.request.url.substring(0, 80)})`);
      
      // 1. Update in-memory tab stats
      const current = tabStats.get(tabId) || { blocked: 0, rewritten: 0 };
      current.blocked += 1;
      tabStats.set(tabId, current);

      // 2. Update persistent total stats
      (async () => {
        try {
          const result = await chrome.storage.local.get(STATS_KEY);
          const stats = result[STATS_KEY] || { blocked: 0, rewritten: 0 };
          stats.blocked += 1;
          await chrome.storage.local.set({ [STATS_KEY]: stats });
        } catch (err) {
          console.warn('[HabaNada BG] Failed to update total stats from rule match:', err);
        }
      })();
    }
  });
}

// Startup listeners to sync dynamic rules on startup
chrome.runtime.onInstalled.addListener(async () => {
  await updateWhitelistRules();
});
chrome.runtime.onStartup.addListener(async () => {
  await updateWhitelistRules();
});

// Message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'GET_STATUS': {
          const enabled = await isEnabled(message.domain);
          const settings = await getSettings();
          sendResponse({ enabled, settings });
          break;
        }
        case 'TOGGLE_DOMAIN': {
          const enabled = await toggleDomain(message.domain);
          sendResponse({ enabled });
          break;
        }
        case 'GET_SETTINGS': {
          const settings = await getSettings();
          sendResponse(settings);
          break;
        }
        case 'UPDATE_SETTINGS': {
          const settings = await updateSettings(message.delta);
          sendResponse(settings);
          break;
        }
        case 'GET_STATS': {
          const stats = await getStats(message.tabId);
          sendResponse(stats);
          break;
        }
        case 'RESET_STATS': {
          // No-op fallback since webNavigation resets it earlier
          sendResponse({ ok: true });
          break;
        }
        case 'UPDATE_STATS': {
          const tabId = sender.tab?.id;
          await updateStats(message.delta, tabId);
          sendResponse({ ok: true });
          break;
        }
        case 'SET_AI_STATUS': {
          lastKnownAIStatus = {
            available: message.available,
            statusText: message.statusText
          };
          sendResponse({ ok: true });
          break;
        }
        case 'CHECK_AI_STATUS': {
          sendResponse(lastKnownAIStatus);
          break;
        }
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[HabaNada BG] Error handling message:', err);
      sendResponse({ error: err.message });
    }
  })();
  return true; // Keep message channel open for async response
});

console.log('[HabaNada] Service Worker initialized');
