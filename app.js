/**
 * DUNGEON CHRONICLES - FRONTEND APPLICATION
 * Server-authoritative RPG engine client using pure vanilla ES6 JavaScript.
 */

(function () {
  'use strict';

  // Ensure config exists
  const config = window.APP_CONFIG || {
    API_BASE: 'http://127.0.0.1:8000/api'
  };

  const API_BASE = config.API_BASE.replace(/\/+$/, '');
  const HEALTH_URL = API_BASE.replace(/\/api$/, '') + '/healthz';

  // Global State Cache
  let gameState = null;
  let isActionInProgress = false;

  // DOM Elements Cache
  const elements = {
    // Header & Status
    serverStatus: document.getElementById('server-status'),
    statusText: document.getElementById('status-text'),
    headerFloor: document.getElementById('header-floor'),
    toastContainer: document.getElementById('toast-container'),

    // Vitals & Profile
    charName: document.getElementById('char-name'),
    charLevel: document.getElementById('char-level'),
    charGold: document.getElementById('char-gold'),
    hpNumbers: document.getElementById('hp-numbers'),
    hpBarFill: document.getElementById('hp-bar-fill'),
    xpNumbers: document.getElementById('xp-numbers'),
    xpBarFill: document.getElementById('xp-bar-fill'),

    // Attributes & Allocation
    freePointsBadge: document.getElementById('free-points-badge'),
    freePointsText: document.getElementById('free-points-text'),
    statStr: document.getElementById('stat-str'),
    bonusStr: document.getElementById('bonus-str'),
    statAgi: document.getElementById('stat-agi'),
    bonusAgi: document.getElementById('bonus-agi'),
    statVit: document.getElementById('stat-vit'),
    bonusVit: document.getElementById('bonus-vit'),
    statInt: document.getElementById('stat-int'),
    bonusInt: document.getElementById('bonus-int'),
    statAtkHint: document.getElementById('stat-atk-hint'),
    statHpHint: document.getElementById('stat-hp-hint'),

    allocButtons: {
      str: document.getElementById('btn-alloc-str'),
      agi: document.getElementById('btn-alloc-agi'),
      vit: document.getElementById('btn-alloc-vit'),
      int: document.getElementById('btn-alloc-int'),
    },

    // Derived Ratings
    derivedAttack: document.getElementById('derived-attack'),
    derivedDodge: document.getElementById('derived-dodge'),
    derivedCrit: document.getElementById('derived-crit'),
    derivedMaxHp: document.getElementById('derived-maxhp'),

    // Equipment
    equippedWeaponSlot: document.getElementById('equipped-weapon-slot'),
    equippedArmorSlot: document.getElementById('equipped-armor-slot'),

    // Dungeon & Arena
    dungeonFloorTitle: document.getElementById('dungeon-floor-title'),
    dungeonHighestFloor: document.getElementById('dungeon-highest-floor'),
    exploreView: document.getElementById('explore-view'),
    battleView: document.getElementById('battle-view'),
    btnEnterDungeon: document.getElementById('btn-enter-dungeon'),

    // Active Battle
    enemyName: document.getElementById('enemy-name'),
    enemyLevelBadge: document.getElementById('enemy-level-badge'),
    enemyXpHint: document.getElementById('enemy-xp-hint'),
    enemyGoldHint: document.getElementById('enemy-gold-hint'),
    enemyHpNumbers: document.getElementById('enemy-hp-numbers'),
    enemyHpBarFill: document.getElementById('enemy-hp-bar-fill'),
    enemyDamageVal: document.getElementById('enemy-damage-val'),

    // Combat Actions
    btnAttack: document.getElementById('btn-action-attack'),
    btnHeal: document.getElementById('btn-action-heal'),
    btnFlee: document.getElementById('btn-action-flee'),

    // Combat Log
    combatLog: document.getElementById('combat-log'),
    btnClearLog: document.getElementById('btn-clear-log'),

    // Shop & Inventory
    btnBuyPotion: document.getElementById('btn-buy-potion'),
    btnRestInn: document.getElementById('btn-rest-inn'),
    inventoryList: document.getElementById('inventory-list'),
    inventoryCountBadge: document.getElementById('inventory-count-badge'),
  };

  // -----------------------------------------------------------------
  // Audio Synthesizer (Web Audio API - Zero External Assets)
  // -----------------------------------------------------------------
  const audioCtx = (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined')
    ? new (window.AudioContext || window.webkitAudioContext)()
    : null;

  function playSound(type) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'crit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(750, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'victory') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392, now); // G4
        osc.frequency.setValueAtTime(523.25, now + 0.1); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // -----------------------------------------------------------------
  // Toast Notifications
  // -----------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // -----------------------------------------------------------------
  // API Fetch Utility
  // -----------------------------------------------------------------
  async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = { 'Content-Type': 'application/json' };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        let errDetail = `HTTP ${response.status} Error`;
        try {
          const errData = await response.json();
          if (errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      return await response.json();
    } catch (err) {
      console.error(`API Error on [${endpoint}]:`, err);
      showToast(err.message || 'Server communication failed.', 'error');
      throw err;
    }
  }

  // -----------------------------------------------------------------
  // Health & Server Beacon
  // -----------------------------------------------------------------
  async function checkServerHealth() {
    try {
      const res = await fetch(HEALTH_URL, { method: 'GET' });
      if (res.ok) {
        elements.serverStatus.classList.add('online');
        elements.statusText.textContent = 'API Connected';
        return true;
      }
    } catch (_) {}
    elements.serverStatus.classList.remove('online');
    elements.statusText.textContent = 'Backend Offline';
    return false;
  }

  // -----------------------------------------------------------------
  // Combat Log Renderer
  // -----------------------------------------------------------------
  function appendLog(text, type = 'system') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${text}`;
    elements.combatLog.appendChild(entry);
    elements.combatLog.scrollTop = elements.combatLog.scrollHeight;
  }

  function renderBatchLogs(logs) {
    if (!logs || !logs.length) return;
    logs.forEach(item => {
      appendLog(item.text, item.type);
      if (item.type === 'crit') playSound('crit');
      else if (item.type === 'player_attack' || item.type === 'enemy_attack') playSound('hit');
      else if (item.type === 'victory') playSound('victory');
      else if (item.type === 'heal') playSound('heal');
      else if (item.type === 'loot') playSound('coin');
    });
  }

  // -----------------------------------------------------------------
  // UI Render Engine
  // -----------------------------------------------------------------
  function renderState(state) {
    if (!state) return;
    gameState = state;

    const char = state.character;
    const stats = state.stats;
    const battle = state.active_battle;
    const inventory = state.inventory || [];
    const equipment = state.equipment || { weapon: null, armor: null };

    // Header
    elements.headerFloor.textContent = `Floor ${char.current_floor}`;

    // Profile & Vitals
    elements.charName.textContent = char.name;
    elements.charLevel.textContent = `Lv. ${char.level}`;
    elements.charGold.textContent = char.gold.toLocaleString();

    // Health
    const hpPercent = Math.max(0, Math.min(100, Math.round((char.current_hp / stats.max_hp) * 100)));
    elements.hpNumbers.textContent = `${char.current_hp} / ${stats.max_hp}`;
    elements.hpBarFill.style.width = `${hpPercent}%`;

    // XP
    const xpPercent = Math.max(0, Math.min(100, Math.round((char.xp / char.next_xp) * 100)));
    elements.xpNumbers.textContent = `${char.xp} / ${char.next_xp}`;
    elements.xpBarFill.style.width = `${xpPercent}%`;

    // Attributes
    elements.statStr.textContent = stats.total_str;
    elements.bonusStr.textContent = stats.bonus_str > 0 ? `(+${stats.bonus_str})` : '';
    elements.statAgi.textContent = stats.total_agi;
    elements.bonusAgi.textContent = stats.bonus_agi > 0 ? `(+${stats.bonus_agi})` : '';
    elements.statVit.textContent = stats.total_vit;
    elements.bonusVit.textContent = stats.bonus_vit > 0 ? `(+${stats.bonus_vit})` : '';
    elements.statInt.textContent = stats.total_int;
    elements.bonusInt.textContent = stats.bonus_int > 0 ? `(+${stats.bonus_int})` : '';

    elements.statAtkHint.textContent = `+${stats.total_str * 2}`;
    elements.statHpHint.textContent = `+${stats.total_vit * 10} HP`;

    // Dynamic Allocation [+] Buttons
    const hasFreePoints = char.free_stat_points > 0;
    if (hasFreePoints) {
      elements.freePointsBadge.classList.remove('hidden');
      elements.freePointsText.textContent = `${char.free_stat_points} Unspent Point${char.free_stat_points > 1 ? 's' : ''}`;
      Object.values(elements.allocButtons).forEach(btn => btn.classList.remove('hidden'));
    } else {
      elements.freePointsBadge.classList.add('hidden');
      Object.values(elements.allocButtons).forEach(btn => btn.classList.add('hidden'));
    }

    // Derived Ratings
    elements.derivedAttack.textContent = `${stats.attack_power} DMG`;
    elements.derivedDodge.textContent = `${(stats.dodge_chance * 100).toFixed(1)}%`;
    elements.derivedCrit.textContent = `${(stats.crit_chance * 100).toFixed(1)}%`;
    elements.derivedMaxHp.textContent = `${stats.max_hp} HP`;

    // Equipment Slots
    renderEquippedSlot(elements.equippedWeaponSlot, equipment.weapon, 'weapon');
    renderEquippedSlot(elements.equippedArmorSlot, equipment.armor, 'armor');

    // Dungeon & Arena
    elements.dungeonFloorTitle.textContent = `Floor ${char.current_floor} - ${getFloorSubtitle(char.current_floor)}`;
    elements.dungeonHighestFloor.textContent = `Floor ${char.highest_floor}`;

    if (battle) {
      // In Battle
      elements.exploreView.classList.add('hidden');
      elements.battleView.classList.remove('hidden');

      elements.enemyName.textContent = battle.enemy_name;
      elements.enemyLevelBadge.textContent = `Lv. ${battle.enemy_level}`;
      elements.enemyXpHint.textContent = `+${battle.enemy_xp} XP`;
      elements.enemyGoldHint.textContent = `+${battle.enemy_gold} Gold`;
      elements.enemyDamageVal.textContent = battle.enemy_damage;

      const enemyHpPct = Math.max(0, Math.min(100, Math.round((battle.enemy_hp / battle.enemy_max_hp) * 100)));
      elements.enemyHpNumbers.textContent = `${battle.enemy_hp} / ${battle.enemy_max_hp}`;
      elements.enemyHpBarFill.style.width = `${enemyHpPct}%`;
    } else {
      // Safe / Ready to Explore
      elements.exploreView.classList.remove('hidden');
      elements.battleView.classList.add('hidden');
      elements.btnEnterDungeon.querySelector('.cta-text').textContent = `Explore Floor ${char.current_floor}`;
    }

    // Inventory
    renderInventory(inventory);
  }

  function getFloorSubtitle(floor) {
    if (floor <= 3) return 'The Forgotten Crypts';
    if (floor <= 7) return 'The Sunken Catacombs';
    if (floor <= 12) return 'The Infernal Hollows';
    if (floor <= 18) return 'The Obsidian Citadel';
    return 'The Abyssal Sanctum';
  }

  function renderEquippedSlot(container, item, slotType) {
    if (!item) {
      container.className = 'equip-slot-box empty';
      container.innerHTML = `<div class="slot-placeholder">No ${slotType} equipped</div>`;
      return;
    }

    container.className = `equip-slot-box rarity-${item.rarity}`;
    const statsList = [];
    if (item.bonus_str) statsList.push(`+${item.bonus_str} STR`);
    if (item.bonus_agi) statsList.push(`+${item.bonus_agi} AGI`);
    if (item.bonus_vit) statsList.push(`+${item.bonus_vit} VIT`);
    if (item.bonus_int) statsList.push(`+${item.bonus_int} INT`);
    const statText = statsList.length ? statsList.join(', ') : 'Standard item';

    container.innerHTML = `
      <div class="equipped-item-details">
        <div class="equipped-item-name">
          <span>${item.name}</span>
          <span class="item-rarity-tag">(${item.rarity})</span>
        </div>
        <div class="equipped-item-stats">${statText}</div>
      </div>
      <button class="btn-unequip" data-slot="${slotType}" title="Unequip this item">Unequip</button>
    `;

    container.querySelector('.btn-unequip').addEventListener('click', () => {
      handleUnequip(slotType);
    });
  }

  function renderInventory(items) {
    elements.inventoryCountBadge.textContent = `${items.length} Item${items.length === 1 ? '' : 's'}`;

    if (!items.length) {
      elements.inventoryList.innerHTML = `
        <div class="empty-inventory">
          Your backpack is empty. Venture into the dungeon to uncover loot!
        </div>
      `;
      return;
    }

    elements.inventoryList.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = `inventory-item-card rarity-${item.rarity}`;

      const slotIcon = item.slot === 'weapon' ? '🗡️' : '🛡️';
      const statsList = [];
      if (item.bonus_str) statsList.push(`+${item.bonus_str} STR`);
      if (item.bonus_agi) statsList.push(`+${item.bonus_agi} AGI`);
      if (item.bonus_vit) statsList.push(`+${item.bonus_vit} VIT`);
      if (item.bonus_int) statsList.push(`+${item.bonus_int} INT`);
      const statStr = statsList.length ? statsList.join(', ') : 'Basic gear';

      card.innerHTML = `
        <div class="item-info">
          <div class="item-name-row">
            <span class="item-slot-icon">${slotIcon}</span>
            <span class="item-title">${item.name}</span>
            <span class="item-rarity-tag">${item.rarity}</span>
          </div>
          <div class="item-bonus-stats">${statStr}</div>
          <div class="item-sell-value">Sell: <strong>${item.sell_price}g</strong></div>
        </div>
        <div class="item-actions">
          ${
            item.is_equipped
              ? '<span class="btn-equipped-label">Equipped</span>'
              : `<button class="btn-item-action btn-equip" data-id="${item.id}">Equip</button>`
          }
          <button class="btn-item-action btn-sell" data-id="${item.id}" title="Sell for ${item.sell_price} gold">Sell</button>
        </div>
      `;

      const equipBtn = card.querySelector('.btn-equip');
      if (equipBtn) {
        equipBtn.addEventListener('click', () => handleEquip(item.id));
      }

      const sellBtn = card.querySelector('.btn-sell');
      if (sellBtn) {
        sellBtn.addEventListener('click', () => handleSell(item.id));
      }

      elements.inventoryList.appendChild(card);
    });
  }

  // -----------------------------------------------------------------
  // Action Handlers
  // -----------------------------------------------------------------
  async function loadInitialState() {
    try {
      await checkServerHealth();
      const state = await apiCall('/state');
      renderState(state);
    } catch (err) {
      appendLog('Could not connect to backend server. Make sure the backend is running.', 'death');
    }
  }

  async function handleAllocate(stat) {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/character/allocate', {
        method: 'POST',
        body: JSON.stringify({ stat })
      });
      showToast(res.message, 'success');
      renderState(res.state);
      playSound('heal');
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  async function handleEnterDungeon() {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/dungeon/enter', { method: 'POST' });
      appendLog(res.message, 'floor_advance');
      renderState(res.state);
      playSound('hit');
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  async function handleCombatAction(action) {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/dungeon/action', {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      renderBatchLogs(res.logs);
      renderState(res.state);
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  async function handleEquip(itemId) {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/inventory/equip', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId })
      });
      showToast(res.message, 'success');
      renderState(res.state);
      playSound('hit');
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  async function handleUnequip(slot) {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/inventory/unequip', {
        method: 'POST',
        body: JSON.stringify({ slot })
      });
      showToast(res.message, 'info');
      renderState(res.state);
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  async function handleSell(itemId) {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/inventory/sell', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId })
      });
      showToast(res.message, 'success');
      renderState(res.state);
      playSound('coin');
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  async function handleBuyPotion() {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/shop/buy-potion', { method: 'POST' });
      showToast(res.message, 'success');
      appendLog(res.message, 'heal');
      renderState(res.state);
      playSound('heal');
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  async function handleRestInn() {
    if (isActionInProgress) return;
    isActionInProgress = true;
    try {
      const res = await apiCall('/shop/rest-inn', { method: 'POST' });
      showToast(res.message, 'success');
      appendLog(res.message, 'heal');
      renderState(res.state);
      playSound('victory');
    } catch (_) {
    } finally {
      isActionInProgress = false;
    }
  }

  // -----------------------------------------------------------------
  // Event Listeners Binding
  // -----------------------------------------------------------------
  function initEvents() {
    // Stat Allocation
    elements.allocButtons.str.addEventListener('click', () => handleAllocate('str'));
    elements.allocButtons.agi.addEventListener('click', () => handleAllocate('agi'));
    elements.allocButtons.vit.addEventListener('click', () => handleAllocate('vit'));
    elements.allocButtons.int.addEventListener('click', () => handleAllocate('int'));

    // Dungeon Exploration & Combat
    elements.btnEnterDungeon.addEventListener('click', handleEnterDungeon);
    elements.btnAttack.addEventListener('click', () => handleCombatAction('attack'));
    elements.btnHeal.addEventListener('click', () => handleCombatAction('heal'));
    elements.btnFlee.addEventListener('click', () => handleCombatAction('flee'));

    // Clear Log
    elements.btnClearLog.addEventListener('click', () => {
      elements.combatLog.innerHTML = '<div class="log-entry log-system"><span class="log-time">[System]</span> Log cleared.</div>';
    });

    // Town Shop
    elements.btnBuyPotion.addEventListener('click', handleBuyPotion);
    elements.btnRestInn.addEventListener('click', handleRestInn);

    // Periodic Server Health Check
    setInterval(checkServerHealth, 10000);
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadInitialState();
  });
})();
