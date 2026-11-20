// 亚诺圣光王都：单人整备与挑战入口
// 采用多层级、全屏独立、高保真羊皮纸子页面流转架构，彻底告别挤压与混杂
import { gameState } from '../core/state.js';
import { markFeatureEntrances } from './featureAccess.js';
import { ITEM_SLOTS, SLOT_MAP, QUALITIES, SPECIAL_ITEMS, OFFICIAL_SETS, REFORGE_AFFIXES } from '../config/items.js';
import { SHOP_PRESTIGE_TIERS } from '../config/shops.js';
import { CITIES } from '../config/cities.js';
import { DRAGON_TRIALS } from '../config/dragonSlaying.js';
import { ROYAL_TRIALS } from '../config/trials.js';
import { ARENA_RANKS, ARENA_OPPONENTS, PRESTIGE_SHOP_ITEMS } from '../config/arena.js';
import { TAVERN_BOUNTIES, TAVERN_DRINKS } from '../config/tavern.js';
import { MERCENARIES } from '../config/estate.js';
import { RUNES, RUNIC_WORDS } from '../config/runes.js';
import { MILITARY_RANKS, STRONGHOLDS, FACTION_REWARDS } from '../config/factionWar.js';
import { NATIONS } from '../config/classes.js';
import { sound } from '../core/sound.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';
import { atmosphere } from '../effects/atmosphere.js';
import { tooltip } from './tooltip.js';
import { gameModal } from './modal.js';
import { getPlayerActionInterval } from '../core/combat.js';

const SOCKET_STAT_NAMES = {
  atk: '攻击', def: '防御', hp: '生命', maxHp: '生命', mp: '魔力', maxMp: '魔力',
  speed: '速度', str: '力量', int: '智力', dex: '敏捷', agi: '敏捷', con: '体魄',
  allStats: '全四维', crit: '暴击', dodge: '闪避', hit: '命中', critDmg: '暴击伤害',
  dmgReduce: '伤害减免', dmgResist: '伤害减免', dmgBoost: '伤害加成', dmgBonus: '伤害加成',
  magicResist: '魔抗'
};
const SOCKET_PERCENT_STATS = new Set(['crit', 'dodge', 'hit', 'critDmg', 'dmgReduce', 'dmgResist', 'dmgBoost', 'dmgBonus', 'magicResist']);
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const formatSocketStats = stats => Object.entries(stats).filter(([, value]) => Number.isFinite(value))
  .map(([key, value]) => `${SOCKET_STAT_NAMES[key] || key} ${value >= 0 ? '+' : ''}${value}${SOCKET_PERCENT_STATS.has(key) ? '%' : ''}`)
  .join(' / ') || '无额外属性';
const socketBonuses = gem => {
  const stats = gem.isRune || gem.type === 'rune' || RUNES[gem.id]
    ? (gem.stats || RUNES[gem.id]?.stats || {})
    : { [gem.stat]: gem.val };
  return formatSocketStats(stats);
};
const SMITHY_TABS = [
  ['smithy_enhance', '升星'], ['smithy_socket', '镶嵌'], ['smithy_reforge', '重铸'],
  ['smithy_repair', '修缮'], ['smithy_smelt', '分解'], ['smithy_smelt_set', '熔炼'], ['smithy_runes', '符文']
];

export class TownView {
  constructor(containerId, onOpenBattle) {
    this.container = document.getElementById(containerId);
    this.onOpenBattle = onOpenBattle;
    this.commissionChoices = {};
    
    // 子页面路由：
    // 'hub'              - 王都中心大街
    // 'smithy'           - 皇家铁匠铺工坊大厅
    // 'smithy_enhance'   - 升星精铸专室
    // 'smithy_socket'    - 宝石打孔镶嵌专室
    // 'smithy_repair'    - 全身耐久修缮室
    // 'smithy_smelt'     - 装备分解熔炉
    // 'smithy_reforge'   - 传奇词条神兵重铸专室
    // 'palace'           - 圣王大殿主厅
    // 'palace_salary'    - 每日俸禄早朝
    // 'palace_trials'    - 幻境试炼封号长廊
    // 'palace_arena'     - 王国角斗场竞技天梯
    // 'dragons'          - 远古屠龙圣殿
    // 'fishing'          - 碧波垂钓水域
    this.currentView = 'hub';
    this.shopCategory = 'consumable';
    this.honorCategory = 'career';
    this.selectedEquipSlot = 'weapon';
    this.arenaSubTab = 'duel'; // 'duel' | 'shop'
    this.selectedGemUid = null;
    this.selectedReforgeCrystal = null;
    this.selectedRunicWord = null;
    this.runicMaterialsOpen = false;
    // 套装熔炼：已选 4 件材料 uid 与目标部位
    this.smeltSelection = [];
    this.smeltTargetSlot = 'weapon';
    this.smeltEligiblePage = 0;
    // 铁匠铺行囊分页
    this.smithyBagPage = 0;
    // 皇家兽栏分页
    this.stablePage = 0;
    this.socketGemPage = 0;
    this.bountyPage = 0;
    this.runeMatPage = 0;
  }

  render() {
    if (!this.container) return;

    if (this.currentView === 'smithy' || this.currentView.startsWith('smithy_')) {
      atmosphere.setPreset('forge');
    } else if (this.currentView === 'fishing') {
      atmosphere.setPreset('forest');
    } else if (this.currentView.startsWith('tavern')) {
      atmosphere.setPreset('forge');
    } else {
      atmosphere.setPreset('palace');
    }

    let html = '';
    switch (this.currentView) {
      case 'hub':
        html = this.renderTownHub();
        break;
      case 'shop':
      case 'royal_shop':
        html = this.renderCityShop();
        break;
      case 'city_travel':
        html = this.renderCityTravel();
        break;
      case 'city_special':
        html = this.renderCitySpecial();
        break;
      case 'honor':
        html = this.renderHonorHall();
        break;
      case 'smithy':
        html = this.renderSmithyHub();
        break;
      case 'smithy_enhance':
        html = this.renderSmithyEnhance();
        break;
      case 'smithy_socket':
        html = this.renderSmithySocket();
        break;
      case 'smithy_repair':
        html = this.renderSmithyRepair();
        break;
      case 'smithy_smelt':
        html = this.renderSmithySmelt();
        break;
      case 'smithy_smelt_set':
        html = this.renderSmithySmeltSet();
        break;
      case 'smithy_reforge':
        html = this.renderSmithyReforge();
        break;
      case 'smithy_runes':
        html = this.renderSmithyRunes();
        break;
      case 'palace':
        html = this.renderPalaceHub();
        break;
      case 'palace_commissions':
        html = this.renderCommissions(true);
        break;
      case 'tavern_commissions':
        html = this.renderCommissions(false);
        break;
      case 'palace_salary':
        html = this.renderPalaceSalary();
        break;
      case 'palace_trials':
        html = this.renderPalaceTrials();
        break;
      case 'palace_arena':
        html = this.renderPalaceArena();
        break;
      case 'dragons':
        html = this.renderDragons();
        break;
      case 'fishing':
        html = this.renderFishing();
        break;
      case 'stable':
        html = this.renderStable();
        break;
      case 'tavern':
        html = this.renderTavernHub();
        break;
      case 'tavern_bounty':
        html = this.renderTavernBounty();
        break;
      case 'tavern_mercenary':
        html = this.renderTavernMercenary();
        break;
      case 'tavern_drinks':
        html = this.renderTavernDrinks();
        break;
      case 'faction_war':
        html = this.renderFactionWar();
        break;
      default:
        html = this.renderTownHub();
    }

    this.container.innerHTML = (this.currentView === 'smithy' || (this.currentView.startsWith('smithy_') && this.currentView !== 'smithy_runes'))
      ? this.renderSmithyWorkshop(html) : html;
    this.bindEvents();
    markFeatureEntrances(this.container, {
      '[data-goto="smithy_enhance"]': 'enhance', '[data-goto="smithy_socket"]': 'socket',
      '[data-goto="smithy_reforge"]': 'reforge', '[data-goto="palace_trials"]': 'trials',
      '#btn-do-enhance': 'enhance',
      '[data-goto="palace_arena"]': 'arena', '[data-goto="dragons"], [data-town-route="dragons"]': 'dragons', '[data-goto="faction_war"], [data-town-route="faction_war"]': 'faction'
    });
  }

  // ==========================================
  // 1. 【王都中心大街】(Town Hub)
  // ==========================================
  renderTownHub() {
    const data = gameState.data;
    const canClaim = gameState.canClaimSalary();
    const bounties = gameState.getTavernBounties();
    const readyBounties = bounties.filter(b => b.status === 'ready_to_claim').length;
    const availableBounties = bounties.filter(b => b.status === 'available').length;
    const equipped = Object.values(data.equipped || {}).filter(Boolean);
    const broken = equipped.filter(item => item.durability === 0).length;
    const repair = gameState.getRepairQuote();
    const activePet = data.pets.find(pet => pet.id === data.activePetId);
    const stats = gameState.getEffectiveStats();
    const city = CITIES[gameState.data.currentCity] || CITIES.capital;
    const statusFor = (id) => {
      switch (id) {
        case 'smithy': return repair.repaired ? `${repair.repaired} 件待修，费用 ${repair.cost.toLocaleString()} 金币` : '装备耐久完好';
        case 'palace': return canClaim ? '俸禄待领：1,500 金币、20 魔晶' : '今日俸禄已领取';
        case 'tavern': return readyBounties ? `${readyBounties} 份赏金可领取` : `可接悬赏 ${availableBounties} 份`;
        case 'fishing': return `金龙鱼 ${data.fishing?.arowana || 0} 尾 / 七鳃鳗 ${data.fishing?.lamprey || 0} 尾`;
        case 'dragons': return `今日剩余 ${data.dragon?.trialsLeft ?? 3} / 3 次`;
        case 'faction_war': return `军勋 ${data.factionWar?.merit || 0} 点`;
        case 'stable': return activePet ? `随行 ${activePet.name} 体力 ${activePet.stamina ?? 100} / 100` : '尚无随行神兽';
        case 'shop': return `金币 ${(data.gold || 0).toLocaleString()} · 魔晶 ${data.crystal || 0}`;
        default: return '';
      }
    };
    const places = (city.facilities || []).map(f => ({ ...f, id: f.id === 'shop' ? 'royal_shop' : f.id, status: statusFor(f.id) }));
    const specialClaimed = !!(city.special && data.cities?.[city.id]?.specialClaimedDay === gameState.getActionDay());
    const dirPlaces = city.special ? [...places, { id: 'city_special', name: city.special.name, desc: city.special.desc, status: specialClaimed ? '本行动日已领取' : '可领取' }] : places;
    return `
      <div class="town-directory classic-town h-full flex flex-col">
        <div class="mota-breadcrumb"><h2>${city.name}</h2><span>${city.short} · 主城中心</span>${city.special ? `<button data-goto="city_special" class="btn-goto-subview mota-btn-dark town-special-btn">${city.special.name}</button>` : ''}<button data-goto="honor" class="btn-goto-subview mota-btn-dark town-honor-btn">荣耀殿堂</button><button data-goto="city_travel" class="btn-goto-subview mota-btn-dark town-travel-btn">城际传送</button></div>
        <div class="town-atlas-layout">
        <section class="classic-town-scene" aria-label="${city.short}设施">
          <img src="${city.scene}" alt="${city.name}主城广场" class="classic-town-art">
          <div class="town-scene-caption"><span>${city.short}</span><h3>${city.short}</h3><p>${city.name} · 主城中心</p></div>
          ${places.map((place, index) => `<button data-goto="${place.id}" class="btn-goto-subview mota-building-card classic-town-location location-${place.id}" aria-label="${place.name}" title="${place.desc}"><span>${place.name}</span></button>`).join('')}
        </section>
        </div>
        <aside class="town-readiness classic-town-readiness" aria-label="出征整备">
          <div class="town-readiness-section"><strong>出征整备</strong><span>已穿戴 ${equipped.length} / 12 件${broken ? ` · ${broken} 件已损坏，属性失效` : ''}</span><button data-goto="smithy_repair" class="btn-goto-subview mota-btn-dark">${repair.repaired ? `修理 ${repair.cost.toLocaleString()} 金币` : '查看耐久与修理'}</button></div>
          <p>${activePet ? `随行神兽 Lv.${activePet.level} · 体力 ${activePet.stamina ?? 100} / 100` : '推进主线获得契约蛋，在神兽页孵化并出战。'}</p>
        </aside>
      </div>`;
  }

  // ==========================================
  // 城市商店（按当前城 shopCityId）
  renderCityShop() {
    const city = CITIES[gameState.data.currentCity] || CITIES.capital;
    const result = gameState.getCityShop(city.shopCityId);
    const back = `<button data-goto="hub" class="btn-goto-subview mota-btn-dark">返回${city.short}大街</button>`;
    if (!result.success) {
      return `<div class="town-shop-town h-full flex flex-col p-3"><div class="mota-breadcrumb"><h2>${city.shopLabel}</h2>${back}</div><p class="text-sm mt-3">${result.msg || '商店暂未开放。'}</p></div>`;
    }
    const cats = result.categories;
    if (!cats.some(c => c.id === this.shopCategory)) this.shopCategory = cats[0]?.id || 'consumable';
    const tier = result.tier;
    const tierLabel = (SHOP_PRESTIGE_TIERS[tier] || {}).label || '';
    const nextTier = result.nextTier;
    const list = result.goods.filter(g => g.category === this.shopCategory);
    const priceHtml = g => `${g.price.gold ? `<span class="shop-price-gold">金币 <b>${g.price.gold.toLocaleString()}</b></span>` : ''}${g.price.crystal ? `<span class="shop-price-crystal">魔晶 <b>${g.price.crystal}</b></span>` : ''}`;
    const reqPrestige = g => (SHOP_PRESTIGE_TIERS[g.unlock?.tier || 0] || {}).minPrestige || 0;
    const cards = list.map(g => {
      const lockedClass = g.locked ? ' is-locked' : (g.leftToday <= 0 ? ' is-soldout' : '');
      return `<div class="shop-goods-card${lockedClass}">
        <div class="shop-goods-head"><span class="shop-goods-icon">${renderGameIcon(g.itemData || g.icon, { size: 'w-full h-full' })}</span>
          <span class="shop-goods-name">${g.name}</span></div>
        <div class="shop-goods-price">${priceHtml(g) || '<span class="mota-muted">免费</span>'}</div>
        <div class="shop-goods-req">解锁：<span class="${g.levelOk ? 'ok' : 'no'}">Lv.${g.unlock.level}</span> · <span class="${g.prestigeOk ? 'ok' : 'no'}">声望 ${reqPrestige(g)}</span></div>
        <div class="shop-goods-limit">本行动日限购：<b>${g.leftToday}</b> / ${g.limit.perDay}</div>
        <div class="shop-goods-foot"><span class="shop-goods-reason">${g.lockReason || ''}</span>
          <button class="mota-btn-gold shop-buy-btn" data-buy-shop-goods="${g.id}" ${g.locked ? 'disabled' : ''}>购买</button></div>
      </div>`;
    }).join('') || '<p class="mota-muted text-xs">该分类暂无货品。</p>';
    return `<div class="town-shop-town h-full flex flex-col">
      <div class="mota-breadcrumb shop-breadcrumb"><h2>${result.shop.cityName} · ${result.shop.shopName}</h2>
        <span class="shop-wallet">金币 <b>${(gameState.data.gold || 0).toLocaleString()}</b> · 魔晶 <b>${gameState.data.crystal || 0}</b> · 声望 <b>${(result.prestige || 0).toLocaleString()}</b></span>
        ${back}</div>
      <div class="shop-tier-line">声望档：<b>${tierLabel}</b>${nextTier ? ` · 距 ${nextTier.label} 还差 ${Math.max(0, nextTier.minPrestige - (result.prestige || 0))} 声望` : ' · 已达最高档'}　|　声望仅作解锁门槛，不消耗</div>
      <nav class="shop-cat-tabs">${cats.map(c => `<button data-shop-cat="${c.id}" class="${this.shopCategory === c.id ? 'is-current' : ''}">${c.label}</button>`).join('')}</nav>
      <div class="shop-goods-grid">${cards}</div>
    </div>`;
  }

  // 城际传送（不消耗，按等级解锁）
  renderCityTravel() {
    const res = gameState.getCities();
    const current = CITIES[gameState.data.currentCity] || CITIES.capital;
    const back = `<button data-goto="hub" class="btn-goto-subview mota-btn-dark">返回${current.short}大街</button>`;
    const cards = res.cities.map(c => {
      const locked = !c.unlocked;
      return `<div class="shop-goods-card${locked ? ' is-locked' : ''}">
        <div class="shop-goods-head"><span class="shop-goods-name">${c.name}</span></div>
        <div class="shop-goods-req">${c.current ? '<span class="ok">当前所在</span>' : `需等级 <span class="${locked ? 'no' : 'ok'}">Lv.${c.unlockLevel}</span>`}</div>
        <div class="shop-goods-foot"><span class="shop-goods-reason">${locked ? '等级不足' : ''}</span>
          <button class="mota-btn-gold shop-buy-btn" data-travel-city="${c.id}" ${locked || c.current ? 'disabled' : ''}>${c.current ? '所在' : '传送'}</button></div>
      </div>`;
    }).join('');
    return `<div class="town-shop-town h-full flex flex-col">
      <div class="mota-breadcrumb"><h2>城际传送</h2>${back}</div>
      <div class="shop-tier-line">传送不消耗资源；达到对应等级后可在王都 · 克斯特 · 亚丁之间自由往返。</div>
      <div class="shop-goods-grid">${cards}</div>
    </div>`;
  }

  // 特色资源点（每城 1 个，每行动日限 1 次）
  renderCitySpecial() {
    const city = CITIES[gameState.data.currentCity] || CITIES.capital;
    const back = `<button data-goto="hub" class="btn-goto-subview mota-btn-dark">返回${city.short}大街</button>`;
    if (!city.special) {
      return `<div class="town-shop-town h-full flex flex-col p-3"><div class="mota-breadcrumb"><h2>特色资源点</h2>${back}</div><p class="text-sm mt-3">该主城暂无特色资源点。</p></div>`;
    }
    const claimed = gameState.data.cities?.[city.id]?.specialClaimedDay === gameState.getActionDay();
    return `<div class="town-shop-town h-full flex flex-col">
      <div class="mota-breadcrumb"><h2>${city.special.name}</h2>${back}</div>
      <div class="shop-tier-line">${city.special.desc} · 每行动日限 1 次。</div>
      <div class="shop-goods-grid">${'<div class="shop-goods-card">' +
        `<div class="shop-goods-head"><span class="shop-goods-name">${city.special.name}</span></div>` +
        `<div class="shop-goods-req">${claimed ? '<span class="no">本行动日已领取</span>' : '<span class="ok">今日可领取</span>'}</div>` +
        `<div class="shop-goods-foot"><span class="shop-goods-reason">${claimed ? '进入下一行动日再来' : ''}</span>` +
        `<button id="btn-claim-city-special" class="mota-btn-gold shop-buy-btn" ${claimed ? 'disabled' : ''}>${claimed ? '已领取' : '领取'}</button></div>` +
        '</div>'}</div>
    </div>`;
  }

  // 荣耀殿堂（成就 · 称号；各城标题栏进入）
  renderHonorHall() {
    const res = gameState.getAchievements();
    const back = `<button data-goto="hub" class="btn-goto-subview mota-btn-dark">返回</button>`;
    if (!res.success) return `<div class="town-shop-town h-full flex flex-col p-3"><div class="mota-breadcrumb"><h2>荣耀殿堂</h2>${back}</div><p class="text-sm mt-3">荣耀殿堂暂未开放。</p></div>`;
    const cats = res.categories || [];
    if (!cats.some(c => c.id === this.honorCategory)) this.honorCategory = cats[0]?.id || 'career';
    const items = (res.items || []).filter(a => a.category === this.honorCategory);
    const rows = items.map(a => {
      const p = a.progress || { current: 0, target: 1 };
      const pct = p.target > 0 ? Math.round(p.current / p.target * 100) : 0;
      const badge = a.claimed ? '<span class="honor-badge is-claimed">已领取</span>' : a.claimable ? '<span class="honor-badge is-claim">可领取</span>' : a.achieved ? '<span class="honor-badge is-done">已达成</span>' : '<span class="honor-badge is-locked">未达成</span>';
      const cls = a.claimed ? ' is-claimed' : a.claimable ? ' is-claimable' : '';
      return `<div class="honor-row${cls}">
        <div class="honor-row-main">
          <div class="honor-row-title"><span class="honor-name">${a.name}</span>${badge}${a.title ? `<span class="honor-title-reward">称号【${a.title}】</span>` : ''}</div>
          <div class="honor-desc">${a.desc}</div>
          <div class="honor-row-meta"><span class="honor-track"><i style="width:${pct}%"></i></span><span class="honor-prog">${p.current} / ${p.target}</span><span class="honor-reward">金币 ${(a.reward && a.reward.gold) || 0} · 声望 ${(a.reward && a.reward.prestige) || 0}</span></div>
        </div>
        <button class="mota-btn-gold honor-claim-btn" data-claim-ach="${a.id}" ${a.claimable ? '' : 'disabled'}>${a.claimed ? '已领取' : a.claimable ? '领取奖励' : '未达成'}</button>
      </div>`;
    }).join('') || '<p class="mota-muted text-xs">该分类暂无成就。</p>';
    const titles = res.titles || [];
    const catName = c => c === 'career' ? '转职封号' : c === 'rank' ? '军衔荣耀' : '成就称号';
    const titleRows = titles.length ? titles.map(t => `<div class="honor-title-row${res.activeTitle === t.name ? ' active' : ''}"><b>${t.name}</b><span class="honor-title-cat">${catName(t.category)}</span><button class="mota-btn-dark honor-equip-btn" data-equip-title="${t.name}">${res.activeTitle === t.name ? '已佩戴' : '佩戴'}</button></div>`).join('') : '<p class="mota-muted text-xs">暂无称号。</p>';
    return `<div class="town-shop-town honor-hall h-full flex flex-col">
      <div class="mota-breadcrumb"><h2>荣耀殿堂</h2><span class="honor-active">当前称号：<b>${res.activeTitle || '—'}</b></span>${back}</div>
      <nav class="shop-cat-tabs">${cats.map(c => `<button data-honor-cat="${c.id}" class="${this.honorCategory === c.id ? 'is-current' : ''}">${c.label}</button>`).join('')}</nav>
      <div class="honor-body">
        <div class="honor-list">${rows}</div>
        <aside class="honor-titles"><h4>称号（佩戴展示）</h4><div class="honor-title-list">${titleRows}</div></aside>
      </div>
    </div>`;
  }

  // 2. 【皇家铁匠铺工坊大厅】(Smithy Hub)
  // ==========================================
  renderSmithyHub() {
    return this.renderSmithyEnhance();
  }

  renderSmithyWorkshop(content) {
    // Reuse each room's controls and quotes; only their shared presentation changes.
    const template = document.createElement('template');
    template.innerHTML = content;
    const detail = template.content.querySelector('.smithy-detail');
    const slots = template.content.querySelector('.smithy-slot-panel');
    const materials = template.content.querySelector('.smithy-material-panel');
    if (materials) {
      let scroll = detail.querySelector('.smithy-scroll');
      if (!scroll) {
        scroll = document.createElement('div');
        scroll.className = 'smithy-scroll flex-1 min-h-0 overflow-y-auto';
        const empty = detail.querySelector('.smithy-empty');
        if (empty) scroll.append(empty);
        detail.prepend(scroll);
      }
      scroll.prepend(materials);
    }
    const active = this.currentView === 'smithy' ? 'smithy_enhance' : this.currentView;
    const data = gameState.data;
    // 行囊分页：全部条目仍渲染进 DOM（保留既有计数/展开语义），仅当前页可见，避免滚动条。
    const bagPerPage = 8;
    const bagTotal = data.bag.length;
    const bagPages = Math.max(1, Math.ceil(bagTotal / bagPerPage));
    const bagPage = Math.min(Math.max(0, this.smithyBagPage || 0), bagPages - 1);
    this.smithyBagPage = bagPage;
    const bagStart = bagPage * bagPerPage;
    return `
      <section class="smithy-page smithy-workshop smithy-page-${active.replace('smithy_', '')}${this.currentView === 'smithy' ? ' smithy-page-hub' : ''}" aria-label="皇家铁匠铺">
        <header class="smithy-workshop-heading">
          <span class="smithy-npc-portrait class-portrait" role="img" aria-label="皇家铁匠肖像"></span>
          <div><h2><button type="button" data-goto="smithy" class="btn-goto-subview smithy-home">皇家铁匠铺</button></h2><p>皇家铁匠 · 选择身上装备与材料，核对费用后动工。</p></div>
          <button type="button" data-goto="hub" class="btn-goto-subview mota-btn-dark">返回王都</button>
        </header>
        <nav class="smithy-workshop-tabs" aria-label="铁匠工作">
          ${SMITHY_TABS.map(([view, label]) => `<button type="button" data-goto="${view}" aria-pressed="${active === view}" class="btn-goto-subview mota-btn-dark">${label}</button>`).join('')}
        </nav>
        <div class="smithy-workshop-body">
          ${detail.outerHTML}
          <aside class="smithy-workshop-inventory" aria-label="工坊装备与行囊">
            ${slots?.outerHTML || ''}
            <section class="smithy-workshop-bag mota-parchment-panel">
              <div class="smithy-heading smithy-bag-heading"><h3>行囊 · ${bagTotal} 组</h3><div class="smithy-bag-pager"><button type="button" id="smithy-bag-prev" class="mota-btn-dark" aria-label="上一页行囊" ${bagPage <= 0 ? 'disabled' : ''}>‹</button><span>${bagPage + 1} / ${bagPages}</span><button type="button" id="smithy-bag-next" class="mota-btn-dark" aria-label="下一页行囊" ${bagPage >= bagPages - 1 ? 'disabled' : ''}>›</button><button type="button" id="btn-workshop-bag" class="mota-btn-dark">整理 / 穿戴</button></div></div>
              <div class="smithy-bag-scroll custom-scrollbar" tabindex="0" aria-label="行囊物品，可展开查看">
                <div class="smithy-bag-grid">${data.bag.map((item, idx) => `<details class="smithy-bag-item${idx < bagStart || idx >= bagStart + bagPerPage ? ' smithy-bag-page-hidden' : ''}">
                  <summary><span class="smithy-item-icon">${renderGameIcon(item, { size: 'w-full h-full' })}</span><span class="smithy-bag-item-name">${escapeText(item.name)}</span><b>×${item.count ?? 1}</b></summary>
                  <p>${escapeText(item.desc || (item.slot ? `${SLOT_MAP[item.slot]?.name || item.slot} · +${item.stars || 0} 星 · 需求等级 ${item.reqLevel || 1}` : '行囊物品'))}</p>
                  ${item.stats ? `<p>${escapeText(formatSocketStats(item.stats))}</p>` : ''}
                </details>`).join('') || '<p>行囊暂无物品。</p>'}</div>
              </div>
            </section>
          </aside>
        </div>
      </section>`;
  }

  renderSmithySlots(title, mode = 'smithy') {
    return `
      <div class="smithy-slot-panel mota-parchment-panel p-3 flex flex-col min-h-0">
        <h3 class="smithy-heading text-xs font-bold">${title}</h3>
        <div class="smithy-slot-grid smithy-scroll grid grid-cols-2 gap-2 my-2 min-h-0 overflow-y-auto">
          ${ITEM_SLOTS.map(slot => {
            const item = gameState.data.equipped[slot.id];
            return `
              <button type="button" data-${mode}-slot="${slot.id}" aria-pressed="${this.selectedEquipSlot === slot.id}" class="btn-select-${mode}-slot smithy-slot-button flex items-center text-left gap-2 p-2">
                <span class="smithy-item-icon w-8 h-8 flex-shrink-0 p-1">${renderGameIcon(item || slot.id, { size: 'w-full h-full' })}</span>
                <span class="min-w-0">
                  <span class="smithy-slot-name block">${slot.name}${item ? `<span class="smithy-slot-stars">+${item.stars || 0} 星</span>` : ''}</span>
                  <span class="smithy-slot-item block">${item ? item.name : '未穿戴'}</span>
                </span>
              </button>
            `;
          }).join('')}
        </div>
        <p class="smithy-slot-note text-xs">选择身上装备；空部位需先从行囊穿戴。</p>
      </div>
    `;
  }

  renderSmithyEnhance() {
    const data = gameState.data;
    const item = data.equipped[this.selectedEquipSlot];
    const curStars = item ? (item.stars || 0) : 0;
    const maxed = curStars >= 8;
    const successRate = gameState.getEnhancementSuccessRate(item);
    const costCrystal = Math.max(1, curStars + 1);
    const starItem = data.bag.find(entry => entry.id === 'star_crystal');
    const starCount = starItem ? (starItem.count || 0) : 0;
    const protCount = data.bag.filter(entry => entry.id === 'protect_crystal').reduce((sum, entry) => sum + (entry.count || 0), 0);

    return `
      <div class="smithy-page smithy-page-enhance w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb px-3 py-1.5 flex items-center justify-between mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs"><span>皇家铁匠铺</span><span>→</span><strong>装备升星精铸专室</strong></div>
          <button type="button" data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 text-xs">返回铁匠铺</button>
        </div>
        <div class="smithy-layout flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSmithySlots('选择要升星的装备部位')}
          <div class="smithy-detail mota-parchment-panel p-4 flex flex-col min-h-0">
            ${item ? `
              <div class="smithy-scroll flex-1 min-h-0 overflow-y-auto">
                <div class="smithy-heading flex items-center gap-3">
                  <div class="smithy-item-icon w-14 h-14 flex-shrink-0 p-2">${renderGameIcon(item, { size: 'w-full h-full' })}</div>
                  <div class="min-w-0"><h3 class="text-base font-bold">${item.name}</h3><p class="text-xs">${SLOT_MAP[item.slot]?.name || item.slot} · 当前 +${curStars} 星</p></div>
                </div>
                ${maxed ? `
                  <div class="smithy-maxed py-6 text-center" role="status">
                    <strong class="block text-2xl">+8 星</strong>
                    <p class="mt-3">已达到最高星阶，无需继续精铸。</p>
                  </div>
                ` : `
                  <div class="smithy-enhance-preview my-4 p-3">
                    <div class="flex justify-around text-center gap-3"><div><span class="block text-xs">当前星阶</span><strong class="text-2xl">+${curStars} 星</strong></div><span aria-hidden="true">→</span><div><span class="block text-xs">升星后</span><strong class="text-2xl">+${curStars + 1} 星</strong></div></div>
                    <p class="mt-3 text-center">精铸成功率 <strong data-enhance-success-rate="${successRate}">${successRate}%</strong></p>
                  </div>
                  <div class="smithy-enhance-cost flex items-center justify-between gap-3 p-3">
                    <span class="flex items-center gap-2"><span class="smithy-item-icon w-8 h-8 p-1">${renderGameIcon('star_crystal', { size: 'w-full h-full' })}</span>消耗升星水晶</span><strong data-enhance-crystal-cost="${costCrystal}">${costCrystal} 颗 <span class="font-normal">(持有 ${starCount})</span></strong>
                  </div>
                  <label class="smithy-protect-option flex items-center justify-between gap-3 p-3 mt-2">
                    <span class="flex items-center gap-2"><input type="checkbox" id="chk-use-protect" class="accent-amber-500 w-4 h-4" ${protCount > 0 ? '' : 'disabled'}><span>使用保护水晶</span></span>
                    <span>持有 ${protCount} 颗</span>
                  </label>
                  <p class="smithy-rule-note text-xs mt-3">失败会降低 1 星，最低为 0 星。勾选保护后，失败时消耗 1 颗保护水晶，星级保持不变；成功不消耗保护水晶。</p>
                `}
              </div>
              <div class="smithy-action-bar pt-3 mt-3 flex-shrink-0">
                <button type="button" id="btn-do-enhance" class="w-full mota-btn-gold py-3 text-sm font-bold" ${maxed ? 'disabled' : ''}>${maxed ? '已达最高 8 星' : '立即执行升星精铸'}</button>
              </div>
            ` : `<div class="smithy-empty flex-1 flex flex-col items-center justify-center text-center"><h3>${SLOT_MAP[this.selectedEquipSlot]?.name || '该部位'}未穿戴装备</h3><p class="text-xs mt-2">可直接选择其他已穿戴部位，或从行囊穿戴装备。</p></div>`}
          </div>
        </div>
      </div>
    `;
  }

  renderSmithyRepair() {
    const data = gameState.data;
    const equipped = data.equipped || {};
    const { cost: totalRepairCost, repaired: needRepairCount } = gameState.getRepairQuote();
    const canRepair = needRepairCount > 0 && data.gold >= totalRepairCost;
    return `
      <div class="smithy-page smithy-page-repair w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb px-3 py-1.5 flex items-center justify-between mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs"><span>皇家铁匠铺</span><span>→</span><strong>全身耐久修缮室</strong></div>
          <button type="button" data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 text-xs">返回铁匠铺</button>
        </div>
        <div class="smithy-detail mota-parchment-panel flex-1 min-h-0 p-4 flex flex-col">
          <div class="smithy-heading flex items-center justify-between gap-3 flex-shrink-0">
            <div><h3 class="text-sm font-bold">全身 12 部位耐久状态</h3><p class="text-xs">耐久耗尽时装备属性失效，修复后恢复。</p></div>
            <div class="text-right text-xs">待修复 <strong>${needRepairCount}</strong> 件 · 总费用 <strong data-repair-total="${totalRepairCost}">${totalRepairCost}</strong> 金币</div>
          </div>
          <div class="smithy-repair-grid smithy-scroll grid grid-cols-2 sm:grid-cols-5 gap-3 my-3 flex-1 min-h-0 overflow-y-auto">
            ${ITEM_SLOTS.map(slot => {
              const item = equipped[slot.id];
              const curDur = item ? (item.durability ?? 100) : 0;
              const maxDur = item ? (item.maxDurability ?? 100) : 100;
              const pct = Math.max(0, Math.min(100, Math.floor(curDur / maxDur * 100)));
              const cost = gameState.getEquipmentRepairCost(item);
              const status = !item ? '空槽位 · 耐久不适用' : curDur <= 0 ? '已损坏 · 属性失效' : cost > 0 ? '已磨损 · 属性有效' : '耐久完好';
              return `
                <div data-repair-slot="${slot.id}" class="smithy-repair-cell p-3 flex flex-col gap-2">
                  <div class="flex items-center gap-2"><span class="smithy-item-icon w-8 h-8 flex-shrink-0 p-1">${renderGameIcon(item || slot.id, { size: 'w-full h-full' })}</span><strong class="text-xs">${slot.name}</strong></div>
                  <span class="smithy-repair-item text-xs">${item ? item.name : '未装备'}</span>
                  ${item ? `<div class="smithy-durability-track w-full h-2 bg-slate-800 overflow-hidden"><div class="h-full ${pct >= 70 ? 'bg-emerald-400' : pct >= 30 ? 'bg-amber-400' : 'bg-red-500'}" style="width:${pct}%"></div></div><span class="text-xs">耐久 ${curDur}/${maxDur}</span>` : ''}
                  <span class="smithy-repair-status text-xs ${item && curDur <= 0 ? 'smithy-warning' : ''}">${status}</span>
                  ${cost > 0 ? `<span class="smithy-repair-cost text-xs">修理 ${cost.toLocaleString()} 金币</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>
          <div class="smithy-action-bar pt-3 flex items-center justify-between gap-3 flex-shrink-0">
            <div class="text-xs"><span>持有金币 <strong>${data.gold.toLocaleString()}</strong></span>${needRepairCount > 0 && !canRepair ? `<p class="smithy-warning mt-1">还缺 ${(totalRepairCost - data.gold).toLocaleString()} 金币</p>` : ''}</div>
            <button type="button" id="btn-repair-all" class="mota-btn-gold px-5 py-3 text-xs font-bold" ${canRepair ? '' : 'disabled'}>${needRepairCount === 0 ? '无需修理' : canRepair ? `修复全部装备 · ${totalRepairCost.toLocaleString()} 金币` : '金币不足，无法修理'}</button>
          </div>
        </div>
      </div>
    `;
  }

  renderSmithySmelt() {
    const item = gameState.data.equipped[this.selectedEquipSlot];
    const quote = gameState.getEquipmentDisassemblyQuote(this.selectedEquipSlot);
    return `
      <div class="smithy-page smithy-page-smelt w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb px-3 py-1.5 flex items-center justify-between mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs"><span>皇家铁匠铺</span><span>→</span><strong>神兵分解熔炉</strong></div>
          <button type="button" data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 text-xs">返回铁匠铺</button>
        </div>
        <div class="smithy-layout flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSmithySlots('选择要分解的装备部位')}
          <div class="smithy-detail mota-parchment-panel p-4 flex flex-col min-h-0">
            <div class="smithy-heading flex-shrink-0"><h3 class="text-sm font-bold">晶石萃取</h3><p class="text-xs">分解装备不可撤销，须先摘除宝石与符文。</p></div>
            <div class="smithy-scroll flex-1 min-h-0 overflow-y-auto">
              ${item ? `
                <div class="smithy-smelt-preview my-4 p-4 text-center">
                  <div class="smithy-item-icon w-16 h-16 mx-auto p-2">${renderGameIcon(item, { size: 'w-full h-full' })}</div>
                  <h4 class="text-base font-bold mt-3">${item.name}</h4>
                  <p class="text-xs mt-2">${SLOT_MAP[item.slot]?.name || item.slot} · +${item.stars || 0} 星</p>
                  <p class="smithy-smelt-quote mt-4 p-3">${quote.success ? `分解产出：<strong>${quote.materialName} × ${quote.count}</strong>` : quote.msg}</p>
                  <p class="smithy-warning text-xs mt-3">分解后该装备与强化星级永久消失。</p>
                </div>
              ` : `<div class="smithy-empty py-8 text-center"><h4>${SLOT_MAP[this.selectedEquipSlot]?.name || '该部位'}未穿戴装备</h4><p class="text-xs mt-2">可直接选择其他已穿戴部位，或从行囊穿戴装备。</p></div>`}
            </div>
            <div class="smithy-action-bar pt-3 mt-3 flex-shrink-0">
              <button type="button" id="btn-disassemble-gear" class="w-full mota-btn-dark py-3 text-xs font-bold" ${item ? '' : 'disabled'}>${item ? '确认分解此装备' : '请先选择已穿戴装备'}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 皇家兽栏（宠物体力总览 / 三档食品 / 金币喂养）
  // ==========================================
  renderStable() {
    const data = gameState.data;
    const pets = data.pets || [];
    const foodCount = id => data.bag.find(item => item.id === id)?.count || 0;
    const foods = [
      { id: 'pet_food', name: '魔能兽肉排', restore: 35, count: foodCount('pet_food') },
      { id: 'pet_food_basic', name: '普通宠物口粮', restore: 15, count: foodCount('pet_food_basic') },
      { id: 'pet_food_luxury', name: '豪华宠物饼干', restore: 60, count: foodCount('pet_food_luxury') }
    ];
    const staminaState = stamina => stamina >= 80
      ? { label: '良好', detail: '属性 100%', cls: 'text-emerald-300', bar: 'bg-emerald-400' }
      : stamina >= 60
        ? { label: '天赋失效', detail: '属性 50%', cls: 'text-amber-300', bar: 'bg-amber-400' }
        : stamina >= 40
          ? { label: '属性减半', detail: '属性 50%', cls: 'text-orange-300', bar: 'bg-orange-400' }
          : { label: '属性无效', detail: '属性 0%', cls: 'text-red-400', bar: 'bg-red-500' };
    // 分页：每页 4 只，避免纵向滚动条
    const perPage = 4;
    const pages = Math.max(1, Math.ceil(pets.length / perPage));
    const page = Math.min(Math.max(0, this.stablePage || 0), pages - 1);
    this.stablePage = page;
    const shown = pets.slice(page * perPage, page * perPage + perPage);
    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">亚诺圣光王都</span>
            <span class="text-slate-500">-&gt;</span>
            <span class="text-amber-200 font-bold">皇家兽栏</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1"><span>返回王都大街</span></button>
        </div>
        <div class="flex-1 min-h-0 flex flex-col gap-2">
          <div class="mota-parchment-panel p-2.5 rounded-xl border-2 border-[#caa048] flex items-center justify-between flex-shrink-0">
            <div class="min-w-0">
              <h3 class="text-sm font-black text-amber-300">皇家兽栏 · 神兽体力照料</h3>
              <p class="text-[11px] text-slate-400 mt-0.5">体力 ≥80 属性全开；&lt;80 天赋失效；&lt;60 属性减半；&lt;40 属性无效。金币喂养可兜底恢复至 60。</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              ${pages > 1 ? `<div class="stable-pager flex items-center gap-1"><button id="stable-prev" class="mota-btn-dark px-2 py-1 rounded text-[11px]" aria-label="上一页神兽" ${page <= 0 ? 'disabled' : ''}>‹</button><span class="font-mono text-[11px]">${page + 1} / ${pages}</span><button id="stable-next" class="mota-btn-dark px-2 py-1 rounded text-[11px]" aria-label="下一页神兽" ${page >= pages - 1 ? 'disabled' : ''}>›</button></div>` : ''}
              <div class="text-xs text-right font-mono text-amber-200">持有金币<br><b class="text-amber-300">${data.gold.toLocaleString()}</b></div>
            </div>
          </div>
          <div class="flex-1 min-h-0 space-y-2">
            ${shown.length ? shown.map(pet => {
              const stamina = Math.max(0, Math.min(100, pet.stamina ?? 100));
              const state = staminaState(stamina);
              const isActive = data.activePetId === pet.id;
              const goldRecover = stamina < 60 ? 60 - stamina : 0;
              const goldCost = goldRecover * 10;
              const goldReady = goldRecover > 0 && data.gold >= goldCost;
              return `
                <div class="mota-parchment-panel p-2 rounded-xl border border-[#caa048]/70 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-black/50 border border-amber-700/80 p-1 flex items-center justify-center flex-shrink-0">${renderGameIcon(pet, { size: 'w-full h-full' })}</div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <strong class="text-xs text-amber-200">${escapeText(pet.name || pet.id)}</strong>
                      <span class="text-[10px] text-slate-400 font-mono">Lv.${pet.level ?? 1}</span>
                      ${isActive ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-600 text-amber-50 font-bold">随行主宠</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                      <div class="flex-1 h-2 rounded bg-black/60 border border-slate-700 overflow-hidden"><div class="${state.bar} h-full" style="width:${stamina}%"></div></div>
                      <span class="text-[10px] font-mono text-slate-300">体力 ${stamina}/100</span>
                    </div>
                    <p class="text-[10px] mt-0.5 ${state.cls}">${state.label} · ${state.detail}</p>
                  </div>
                  <div class="stable-pet-actions flex flex-wrap gap-1 justify-end flex-shrink-0" style="width:252px">
                    ${foods.map(food => {
                      const canFeed = food.count > 0 && stamina < 100;
                      return `<button data-stable-feed="${escapeText(pet.id)}" data-food-id="${food.id}" class="mota-btn-dark px-2 py-1 rounded text-[10px] font-bold ${canFeed ? '' : 'opacity-40 cursor-not-allowed'}" ${canFeed ? '' : 'disabled'}>${food.name}+${food.restore}·${food.count}</button>`;
                    }).join('')}
                    <button data-stable-gold="${escapeText(pet.id)}" class="mota-btn-gold px-2 py-1 rounded text-[10px] font-black ${goldReady ? '' : 'opacity-40 cursor-not-allowed'}" ${goldReady ? '' : 'disabled'}>${goldRecover > 0 ? `金币至60·${goldCost}` : '体力已达上限60'}</button>
                  </div>
                </div>
              `;
            }).join('') : `<div class="mota-parchment-panel p-6 rounded-xl border border-[#caa048]/60 text-center text-xs text-slate-400">尚无契约神兽。推进主线或使用契约蛋孵化，即可在兽栏照料体力。</div>`}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 铁匠铺 · 套装熔炼（4 件同套装同品质 + 晶石 → 指定部位）
  // ==========================================
  renderSmithySmeltSet() {
    const data = gameState.data;
    const SMELT_QUALITIES = ['gold', 'darkgold', 'purplegold'];
    const eligible = data.bag.filter(item => item.slot && item.setId && SMELT_QUALITIES.includes(item.quality));
    const eligPerPage = 2;
    const eligPages = Math.max(1, Math.ceil(eligible.length / eligPerPage));
    const eligPage = Math.min(Math.max(0, this.smeltEligiblePage || 0), eligPages - 1);
    this.smeltEligiblePage = eligPage;
    const eligStart = eligPage * eligPerPage;
    this.smeltSelection = (this.smeltSelection || []).filter(uid => eligible.some(item => item.uid === uid)).slice(0, 4);
    const selected = this.smeltSelection.map(uid => eligible.find(item => item.uid === uid)).filter(Boolean);
    const first = selected[0] || null;
    const sameSet = selected.length > 0 && selected.every(item => item.setId === first.setId && item.quality === first.quality);
    const setConf = first ? OFFICIAL_SETS[first.setId] : null;
    const qualityConf = first ? QUALITIES[first.quality] : null;
    const crystalId = first ? (first.quality === 'gold' ? 'crystal_gold' : first.quality === 'darkgold' ? 'crystal_darkgold' : 'crystal_purplegold') : null;
    const crystalName = crystalId === 'crystal_gold' ? '黄金晶石' : crystalId === 'crystal_darkgold' ? '暗金晶石' : crystalId === 'crystal_purplegold' ? '紫金晶石' : '对应品质晶石';
    const crystalOwned = crystalId ? (data.bag.find(item => item.id === crystalId)?.count || 0) : 0;
    const bannedSlots = new Set(selected.map(item => item.slot));
    let targetSlot = this.smeltTargetSlot || 'weapon';
    if (bannedSlots.has(targetSlot)) targetSlot = ITEM_SLOTS.find(slot => !bannedSlots.has(slot.id))?.id || 'weapon';
    this.smeltTargetSlot = targetSlot;
    const targetConf = SLOT_MAP[targetSlot];
    const ready = selected.length === 4 && sameSet && crystalOwned > 0 && !bannedSlots.has(targetSlot);
    const missing = selected.length !== 4 ? `还需选择 ${4 - selected.length} 件套装部件` : !sameSet ? '4 件材料必须同套装、同品质' : crystalOwned <= 0 ? `缺少 1 颗${crystalName}` : '';
    return `
      <div class="smithy-detail mota-parchment-panel p-4 flex flex-col min-h-0">
        <div class="smithy-heading flex items-center justify-between gap-3 flex-shrink-0">
          <div><h3 class="text-sm font-bold">套装熔炼 · 指定部位</h3><p class="text-xs">消耗 4 件同套装、同品质的套装部件与 1 颗对应品质晶石，熔炼出指定部位的该套装部件。</p></div>
        </div>
        <div class="smithy-scroll flex-1 min-h-0 overflow-y-auto my-1 space-y-1.5">
          <div>
            <h4 class="text-xs font-bold text-amber-300 mb-1.5">材料槽（${selected.length} / 4）</h4>
            <div class="grid grid-cols-4 gap-2">
              ${[0, 1, 2, 3].map(i => {
                const item = selected[i];
                return `<div class="smithy-smelt-mat p-1 rounded-lg border ${item ? 'border-amber-500/70 bg-amber-950/30' : 'border-dashed border-slate-600 bg-black/40'} flex flex-col items-center justify-center min-h-[38px] text-center">
                  ${item ? `<span class="smithy-item-icon w-8 h-8 p-1">${renderGameIcon(item, { size: 'w-full h-full' })}</span><span class="text-[10px] mt-1 truncate w-full">${escapeText(item.name)}</span>` : '<span class="text-[11px] text-slate-500">空槽</span>'}
                </div>`;
              }).join('')}
            </div>
          </div>
          <div>
            <h4 class="text-xs font-bold text-amber-300 mb-1.5">可熔炼套装部件（点击选择 / 取消）${eligPages > 1 ? ` <span class="inline-flex items-center gap-1 font-normal"><button type="button" id="smelt-elig-prev" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="上一页部件" ${eligPage <= 0 ? 'disabled' : ''}>‹</button><span>${eligPage + 1}/${eligPages}</span><button type="button" id="smelt-elig-next" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="下一页部件" ${eligPage >= eligPages - 1 ? 'disabled' : ''}>›</button></span>` : ''}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${eligible.length ? eligible.map((item, idx) => {
                const isSel = this.smeltSelection.includes(item.uid);
                const full = this.smeltSelection.length >= 4 && !isSel;
                const hidden = idx < eligStart || idx >= eligStart + eligPerPage;
                return `<button data-smelt-uid="${escapeText(item.uid)}" class="text-left p-2 rounded-lg border ${hidden ? 'smithy-smelt-elig-hidden ' : ''}${isSel ? 'border-amber-400 bg-amber-900/40' : 'border-slate-700 bg-black/40 hover:border-amber-500'} ${full ? 'opacity-40 cursor-not-allowed' : ''}" ${full ? 'disabled' : ''}>
                  <span class="flex items-center gap-2"><span class="smithy-item-icon w-7 h-7 p-0.5 flex-shrink-0">${renderGameIcon(item, { size: 'w-full h-full' })}</span>
                  <span class="min-w-0"><span class="block text-[11px] truncate">${escapeText(item.name)}</span><span class="block text-[10px] text-slate-400">${SLOT_MAP[item.slot]?.name || item.slot} · ${QUALITIES[item.quality]?.name || item.quality}</span></span></span>
                  ${isSel ? '<span class="block text-[10px] text-amber-300 mt-1">已选入材料槽</span>' : ''}
                </button>`;
              }).join('') : '<p class="text-[11px] text-slate-400">行囊中没有可熔炼的黄金 / 暗金 / 紫金套装部件。</p>'}
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h4 class="text-xs font-bold text-amber-300 mb-1.5">目标部位</h4>
              <select id="smelt-target-slot" class="w-full mota-btn-dark px-3 py-2 rounded-lg text-xs">
                ${ITEM_SLOTS.map(slot => `<option value="${slot.id}" ${slot.id === targetSlot ? 'selected' : ''} ${bannedSlots.has(slot.id) ? 'disabled' : ''}>${slot.name}${bannedSlots.has(slot.id) ? '（已作为材料）' : ''}</option>`).join('')}
              </select>
            </div>
            <div>
              <h4 class="text-xs font-bold text-amber-300 mb-1.5">所需晶石</h4>
              <div class="p-2 rounded-lg border ${crystalId && crystalOwned > 0 ? 'border-emerald-600/60 bg-emerald-950/20' : 'border-slate-700 bg-black/40'} text-[11px]">
                ${first ? `${crystalName} × 1 · 持有 <b class="${crystalOwned > 0 ? 'text-emerald-300' : 'text-red-400'}">${crystalOwned}</b>` : '请先选择 4 件同套装同品质材料'}
              </div>
            </div>
          </div>
          ${first ? `<div class="p-2 rounded-lg border border-amber-600/50 bg-amber-950/30 text-xs">
            <div class="font-bold text-amber-300">产出预览</div>
            <div class="mt-1 text-slate-200">${escapeText((setConf?.name || first.setId || '').replace(/[【】]/g, ''))} · ${targetConf.name}</div>
            <div class="text-[11px] text-slate-400 mt-1">品质 ${qualityConf?.name || first.quality} · 需求等级 ${setConf?.reqLevel || first.reqLevel || 1}</div>
          </div>` : ''}
        </div>
        <div class="smithy-action-bar pt-3 flex items-center justify-between gap-3 flex-shrink-0">
          <span class="text-[11px] ${ready ? 'text-emerald-300' : 'text-amber-300'}">${ready ? '材料齐备，可以熔炼。' : missing}</span>
          <button type="button" id="btn-do-smelt-set" class="mota-btn-gold px-5 py-3 text-xs font-bold" ${ready ? '' : 'disabled'}>确认熔炼</button>
        </div>
      </div>
    `;
  }

  renderSmithySocket() {
    const data = gameState.data;
    const item = data.equipped[this.selectedEquipSlot];
    const curSockets = item?.sockets || 0;
    const drillCount = data.bag.filter(entry => ['diamond_1', 'socket_crystal'].includes(entry.id))
      .reduce((sum, entry) => sum + (entry.count || 0), 0);
    const nextDrillCost = (curSockets + 1) * 1000;
    const bagGems = data.bag.filter(entry => !entry.slot && (entry.type === 'gem' || entry.type === 'rune' || entry.stat || RUNES[entry.id]));
    const gemPerPage = 2;
    const gemPages = Math.max(1, Math.ceil(bagGems.length / gemPerPage));
    const gemPage = Math.min(Math.max(0, this.socketGemPage || 0), gemPages - 1);
    this.socketGemPage = gemPage;
    const gemStart = gemPage * gemPerPage;
    const selectedGem = bagGems.find(entry => (entry.uid || entry.id) === this.selectedGemUid);
    if (!selectedGem) this.selectedGemUid = null;
    const drillReason = !item ? '请先选择已穿戴装备' : curSockets >= 4 ? '已达 4 孔上限'
      : drillCount < 1 ? '缺少打孔水晶或金刚钻' : data.gold < nextDrillCost ? `金币不足，还缺 ${nextDrillCost - data.gold}` : '';
    const inlayReason = !selectedGem ? '请先选择宝石或符文' : data.gold < 500 ? '金币不足，需 500 金币' : '';
    const word = RUNIC_WORDS.find(word => word.id === item?.runicWord);

    return `
      <div class="smithy-page smithy-page-socket w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb px-3 py-1.5 flex items-center justify-between mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs"><span>皇家铁匠铺</span><span>→</span><strong>宝石打孔与镶嵌工坊</strong></div>
          <button type="button" data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 text-xs">返回铁匠铺</button>
        </div>
        <div class="smithy-layout flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="smithy-socket-inventory">
            ${this.renderSmithySlots('选择要镶嵌的装备部位', 'socket')}
            <div class="smithy-material-panel mota-parchment-panel">
              <h3 class="smithy-heading text-xs font-bold">行囊宝石与符文 · ${bagGems.length} 组${gemPages > 1 ? ` <span class="socket-gem-pager inline-flex items-center gap-1 font-normal"><button type="button" id="socket-gem-prev" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="上一页材料" ${gemPage <= 0 ? 'disabled' : ''}>‹</button><span>${gemPage + 1}/${gemPages}</span><button type="button" id="socket-gem-next" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="下一页材料" ${gemPage >= gemPages - 1 ? 'disabled' : ''}>›</button></span>` : ''}</h3>
              <div class="smithy-scroll flex-1 min-h-0 overflow-y-auto">
                ${bagGems.length ? `<div class="smithy-gem-grid">
                  ${bagGems.map((gem, gi) => `<button type="button" data-gem-uid="${escapeText(gem.uid || gem.id)}" aria-pressed="${this.selectedGemUid === (gem.uid || gem.id)}" class="btn-select-bag-gem smithy-gem-button ${gi < gemStart || gi >= gemStart + gemPerPage ? 'socket-gem-hidden' : ''}">
                    <span class="smithy-item-icon w-8 h-8 p-1 flex-shrink-0">${renderGameIcon(gem, { size: 'w-full h-full' })}</span>
                    <span class="min-w-0"><strong>${escapeText(gem.name)}</strong><span class="smithy-gem-bonus">${gem.type === 'rune' || RUNES[gem.id] ? '符文' : '宝石'} · ${escapeText(socketBonuses(gem))}</span></span>
                    <b class="smithy-gem-count">×${gem.count || 1}</b>
                  </button>`).join('')}
                </div>` : `<div class="smithy-empty py-3 text-xs"><p>行囊中暂无宝石或符文。宝石可在王国角斗场的声望商行兑换。</p><button type="button" data-goto="palace_arena" class="btn-goto-subview mota-btn-dark px-3 py-2 mt-2">前往声望商行</button></div>`}
              </div>
            </div>
          </div>
          <div class="smithy-detail mota-parchment-panel flex flex-col min-h-0">
            ${item ? `
              <div class="smithy-heading flex items-center gap-3">
                <span class="smithy-item-icon w-10 h-10 p-1 flex-shrink-0">${renderGameIcon(item, { size: 'w-full h-full' })}</span>
                <div class="min-w-0"><h3 class="text-sm font-bold">${escapeText(item.name)}</h3><p class="text-xs">+${item.stars || 0} 星 · 已开 ${curSockets} / 4 孔 · 已镶嵌 ${(item.gems || []).filter(Boolean).length} 枚</p></div>
              </div>
              <div class="smithy-scroll flex-1 min-h-0 overflow-y-auto mt-2">
                <div class="socket-right">
                <p class="smithy-rule-note text-xs">镶嵌每次 500 金币；摘除免费、无损，需行囊可容纳。</p>
                <div class="smithy-socket-grid">
                  ${[0, 1, 2, 3].map(index => {
                    const gem = item.gems?.[index];
                    const open = index < curSockets;
                    return `<div class="smithy-socket-cell" data-socket-state="${!open ? 'locked' : gem ? 'filled' : 'empty'}" data-socket-index="${index}">
                      <div class="smithy-socket-description">
                        <span class="smithy-item-icon w-8 h-8 p-1 flex-shrink-0">${gem ? renderGameIcon(gem, { size: 'w-full h-full' }) : `<span class="smithy-socket-number">${index + 1}</span>`}</span>
                        <div class="min-w-0"><strong class="block">${gem ? escapeText(gem.name) : `第 ${index + 1} 孔 · ${open ? '可镶嵌' : '未开启'}`}</strong>
                          <span class="smithy-socket-bonus">${gem ? `${gem.isRune || RUNES[gem.id] ? '符文' : '宝石'} · ${escapeText(socketBonuses(gem))}` : open ? '选择左侧材料后镶入' : '开孔后可镶嵌宝石或符文'}</span>
                        </div>
                      </div>
                      ${!open ? '' : gem ? `<button type="button" data-slot="${this.selectedEquipSlot}" data-socket-idx="${index}" class="btn-remove-gem mota-btn-dark">无损摘除</button>`
                        : `<button type="button" data-slot="${this.selectedEquipSlot}" data-socket-idx="${index}" class="btn-inlay-gem mota-btn-gold" ${inlayReason ? 'disabled' : ''}>${inlayReason || '镶入选定材料'}</button>`}
                    </div>`;
                  }).join('')}
                </div>
                ${word ? `<p class="smithy-runic-note"><strong>${escapeText(word.name)}${item.durability === 0 ? '（装备损坏，未生效）' : ''}</strong><br>${escapeText(word.desc)}</p>` : ''}
                </div>
              </div>
            ` : `<div class="smithy-empty flex-1 flex flex-col items-center justify-center text-center"><h3>${SLOT_MAP[this.selectedEquipSlot]?.name || '该部位'}未穿戴装备</h3><p class="text-xs mt-2">选择其他已穿戴部位，或从行囊穿戴装备。</p></div>`}
            <div class="smithy-action-bar pt-2 mt-2 flex-shrink-0">
              <p class="smithy-quote text-xs">打孔水晶 / 金刚钻：<strong>${drillCount}</strong> 个 · 持有金币 <strong>${data.gold.toLocaleString()}</strong>${item && curSockets < 4 ? `<br>下一孔消耗 1 个打孔道具 + ${nextDrillCost.toLocaleString()} 金币` : ''}</p>
              <button type="button" id="btn-punch-socket" class="mota-btn-gold w-full py-2 mt-2 text-xs font-bold" ${drillReason ? 'disabled' : ''}>${drillReason || `开凿第 ${curSockets + 1} 孔`}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderSmithyReforge() {
    const data = gameState.data;
    const item = data.equipped[this.selectedEquipSlot];
    const crystalChoices = [
      { id: 'crystal_darkgold', name: '暗金晶石', detail: '数值取词条区间的较高一半' },
      { id: 'crystal_gold', name: '黄金晶石', detail: '数值取词条完整区间' }
    ].map(crystal => ({ ...crystal, count: data.bag.filter(entry => entry.id === crystal.id).reduce((sum, entry) => sum + (entry.count || 0), 0) }));
    if (!crystalChoices.some(crystal => crystal.id === this.selectedReforgeCrystal)) {
      this.selectedReforgeCrystal = crystalChoices.find(crystal => crystal.count > 0)?.id || 'crystal_gold';
    }
    const selectedCrystal = crystalChoices.find(crystal => crystal.id === this.selectedReforgeCrystal);
    const quote = gameState.getReforgeQuote(item);
    const pending = item?.pendingReforge;
    const disabledReason = !item ? '请先选择已穿戴装备' : pending ? '请先处理当前重铸结果'
      : quote.success === false ? quote.msg : selectedCrystal.count < 1 ? `${selectedCrystal.name}不足`
      : data.gold < quote.gold ? `金币不足，还缺 ${quote.gold - data.gold}`
      : data.crystal < quote.crystal ? `魔晶不足，还缺 ${quote.crystal - data.crystal}` : '';
    const affixText = affix => affix ? `${escapeText(affix.name)} +${affix.val}${escapeText(affix.unit)}` : '暂无传奇词条';

    return `
      <div class="smithy-page smithy-page-reforge w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb px-3 py-1.5 flex items-center justify-between mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs"><span>皇家铁匠铺</span><span>→</span><strong>传奇附魔 · 神兵重铸</strong></div>
          <button type="button" data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 text-xs">返回铁匠铺</button>
        </div>
        <div class="smithy-layout flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSmithySlots('选择要重铸的装备部位', 'reforge')}
          <div class="smithy-detail mota-parchment-panel flex flex-col min-h-0">
            <div class="smithy-scroll flex-1 min-h-0 overflow-y-auto">
              ${item ? `<div class="smithy-heading flex items-center gap-3">
                <span class="smithy-item-icon w-10 h-10 p-1 flex-shrink-0">${renderGameIcon(item, { size: 'w-full h-full' })}</span>
                <div class="min-w-0"><h3 class="text-sm font-bold">${escapeText(item.name)}</h3><p class="text-xs">${QUALITIES[item.quality]?.name || '装备'} · +${item.stars || 0} 星 · 需求等级 ${item.reqLevel || 1}</p></div>
              </div><p class="smithy-current-affix">当前词条：<strong>${affixText(item.reforge)}</strong></p>`
                : `<div class="smithy-empty py-3 text-center"><h3>${SLOT_MAP[this.selectedEquipSlot]?.name || '该部位'}未穿戴装备</h3><p class="text-xs mt-2">选择其他已穿戴部位，或从行囊穿戴装备。</p></div>`}
              <h4 class="smithy-section-label">选择本次消耗的晶石</h4>
              <div class="smithy-crystal-grid">
                ${crystalChoices.map(crystal => `<button type="button" data-use-crystal="${crystal.id}" aria-pressed="${this.selectedReforgeCrystal === crystal.id}" class="btn-select-reforge-crystal smithy-crystal-button">
                  <span class="smithy-item-icon w-8 h-8 p-1 flex-shrink-0">${renderGameIcon(crystal.id, { size: 'w-full h-full' })}</span>
                  <span class="min-w-0"><strong>${crystal.name} · ${crystal.count} 颗</strong><span>${crystal.detail}</span></span>
                </button>`).join('')}
              </div>
              <details class="smithy-affix-catalog">
                <summary class="smithy-section-label">传奇词条图鉴 <span>· 每次随机生成一种</span></summary>
                <dl class="smithy-affix-list">
                  ${REFORGE_AFFIXES.map(affix => `<div data-current="${item?.reforge?.id === affix.id}"><dt><strong>${affix.name}</strong><span>${affix.desc}</span></dt><dd>+${affix.min}～${affix.max}${affix.unit}</dd></div>`).join('')}
                </dl>
              </details>
            </div>
            <div class="smithy-action-bar pt-2 mt-2 flex-shrink-0">
              ${pending ? `<div class="smithy-reforge-pending" role="region" aria-label="重铸结果待选择">
                <h4>重铸完成 · 请选择</h4>
                <p>新词条：<strong>${affixText(pending.affix)}</strong></p>
                <p>原词条：${affixText(item.reforge)}</p>
                <p class="smithy-rule-note">材料已消耗。采用后属性才会改变；保留原词条不退材料。</p>
                <div class="smithy-reforge-choices"><button type="button" class="btn-resolve-reforge mota-btn-gold" data-accept="true">采用新词条</button><button type="button" class="btn-resolve-reforge mota-btn-dark" data-accept="false">保留原词条</button></div>
              </div>` : item && quote.success !== false ? `<div class="smithy-quote text-xs">
                <p>本次消耗：${selectedCrystal.name} × 1 · ${quote.gold}金币 · ${quote.crystal}魔晶</p>
                <p>持有：${selectedCrystal.count} 颗 · ${data.gold.toLocaleString()} 金币 · ${data.crystal.toLocaleString()} 魔晶</p>
              </div>` : ''}
              <button type="button" id="btn-do-reforge" class="mota-btn-gold w-full py-2 mt-2 text-xs font-bold" ${disabledReason ? 'disabled' : ''}>${disabledReason || '重铸传奇词条'}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 6. 【圣王宫殿主厅】(Palace Hub)
  // ==========================================
  renderPalaceHub() {
    const canClaim = gameState.canClaimSalary();

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">圣王大殿主厅</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王都大街</span>
          </button>
        </div>

        ${this.renderCommissionEntrance(true)}
        <!-- 圣王大殿三大功能入口 (紧凑舒展，绝不遮挡底部按键) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          
          <!-- 1. 每日俸禄大厅 -->
          <div data-goto="palace_salary" class="btn-goto-subview mota-building-card p-3 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-400/80 bg-amber-950/30 hover:border-amber-300 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center p-1.5 flex-shrink-0">
                    ${getVectorIcon('coin_gold', 'w-full h-full')}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-xs font-black text-amber-200 truncate">早朝 · 每日俸禄</h3>
                    <div class="text-[10px] text-amber-400/80">王室财政津贴领受</div>
                  </div>
                </div>
                <span class="mota-badge-gold px-2 py-0.5 rounded text-[10px] font-bold">${canClaim ? '可领赏' : '已领受'}</span>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>赏赐:</span>
                <span class="text-amber-300 font-mono">+1,500 金币 · +20 魔晶</span>
              </div>
            </div>

            <div class="pt-2 border-t border-amber-900/40">
              <button class="w-full mota-btn-gold py-1.5 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1">
                <span>觐见领俸禄 -></span>
              </button>
            </div>
          </div>

          <!-- 2. 王国角斗场 -->
          <div data-goto="palace_arena" class="btn-goto-subview mota-building-card p-3 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-rose-500/80 bg-rose-950/20 hover:border-rose-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center p-1.5 flex-shrink-0">
                    ${getVectorIcon('sword', 'w-full h-full')}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-xs font-black text-rose-200 truncate">王国角斗场 · 天梯</h3>
                    <div class="text-[10px] text-rose-400/80">天梯排名对决与声望商行</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-500 text-rose-200 text-[10px] font-bold">${gameState.data.arena?.rankTitle || '青铜角斗士'}</span>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>特色:</span>
                <span class="text-rose-300 font-mono">天梯争雄 · 军需商行兑换</span>
              </div>
            </div>

            <div class="pt-2 border-t border-rose-900/40">
              <button class="w-full mota-btn-dark py-1.5 rounded-lg text-xs font-bold text-rose-200 border border-rose-600/60 shadow flex items-center justify-center gap-1">
                <span>步入角斗场 -></span>
              </button>
            </div>
          </div>

          <!-- 3. 幻境试炼封号长廊 -->
          <div data-goto="palace_trials" class="btn-goto-subview mota-building-card p-3 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-purple-500/80 bg-purple-950/20 hover:border-purple-400 transition-all">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center p-1.5 flex-shrink-0">
                    ${getVectorIcon('bld_palace', 'w-full h-full')}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-xs font-black text-purple-200 truncate">职业七阶转职 · 试炼长廊</h3>
                    <div class="text-[10px] text-purple-400/80">七阶正统转职晋升与封号威压</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500 text-purple-200 text-[10px] font-bold">转职殿堂</span>
              </div>
              <div class="mt-2 p-1.5 rounded-lg bg-black/40 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>当前阶位:</span>
                <span class="text-amber-300 font-bold truncate ml-1">${gameState.getPromotedClassName()}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-purple-900/40">
              <button class="w-full mota-btn-dark py-1.5 rounded-lg text-xs font-bold text-purple-200 border border-purple-600/60 shadow flex items-center justify-center gap-1">
                <span>步入转职殿堂 -></span>
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 8. 【王国角斗场 · 竞技天梯】(Palace Arena Sub-page)
  // ==========================================
  renderPalaceArena() {
    const arenaData = gameState.data.arena || { points: 1000, rankTitle: '青铜角斗士', challengesLeft: 5 };
    const curPrestige = gameState.data.prestige || 0;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold">圣王大殿</span>
            <span class="text-slate-500">-></span>
            <span class="text-rose-300 font-bold">王国角斗场 (天梯争霸与声望商行)</span>
          </div>
          <button data-goto="palace" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王殿主厅</span>
          </button>
        </div>

        <!-- 顶部天梯状态仪表栏 -->
        <div class="px-3 py-2 rounded-xl bg-black/50 border border-amber-900/60 flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">当前段位:</span>
              <span class="px-2 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-200 font-bold text-[11px]">${arenaData.rankTitle}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">天梯积分:</span>
              <span class="text-amber-300 font-mono font-bold">${arenaData.points} 点</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">今日挑战剩余:</span>
              <span class="text-emerald-400 font-mono font-bold">${arenaData.challengesLeft} / 5 次</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">声望结余:</span>
              <span class="text-purple-300 font-mono font-bold">${curPrestige} 点</span>
            </div>
          </div>

          <!-- 模式切换按键 -->
          <div class="flex items-center gap-1.5">
            <button id="btn-arena-subtab-duel" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              this.arenaSubTab === 'duel' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'
            }">
              天梯角斗对决
            </button>
            <button id="btn-arena-subtab-shop" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              this.arenaSubTab === 'shop' ? 'mota-btn-gold text-amber-100 shadow' : 'mota-btn-dark text-slate-300'
            }">
              声望军需商行
            </button>
          </div>
        </div>

        <!-- 内容区域：根据 subtab 切换 -->
        <div class="flex-1 min-h-0">
          ${this.arenaSubTab === 'duel' ? `
            <!-- 天梯对手列表 (4大挑战目标) -->
            <div class="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              ${ARENA_OPPONENTS.map(opp => `
                <div class="p-3 rounded-xl bg-black/40 border border-[#4a3520] hover:border-amber-500/80 transition-all flex flex-col justify-between shadow">
                  <div>
                    <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                      <div class="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/70 p-1 flex items-center justify-center flex-shrink-0">
                        ${getVectorIcon(opp.avatar || 'hero_warrior', 'w-full h-full')}
                      </div>
                      <div class="min-w-0 flex-1">
                        <h4 class="text-xs font-black text-rose-200 truncate">${opp.name}</h4>
                        <div class="text-[10px] text-amber-400/80 truncate">${opp.title}</div>
                      </div>
                    </div>

                    <div class="mt-2 space-y-1 text-[10px] bg-black/50 p-2 rounded-lg border border-slate-800">
                      <div class="flex justify-between">
                        <span class="text-slate-400">对手等级:</span>
                        <span class="text-slate-200 font-mono font-bold">Lv.${opp.level}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400">天梯积分:</span>
                        <span class="text-amber-300 font-mono font-bold">${opp.points} 点</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400">生命 / 攻击:</span>
                        <span class="text-rose-300 font-mono font-bold">${opp.hp} / ${opp.atk}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400">双抗防御:</span>
                        <span class="text-blue-300 font-mono font-bold">${opp.def}</span>
                      </div>
                    </div>

                    <div class="mt-2 p-1.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-300 flex items-center justify-between">
                      <span>胜赏:</span>
                      <span class="font-mono">+${opp.prestigeReward} 声望 · +${opp.goldReward} 金币</span>
                    </div>
                  </div>

                  <div class="pt-2 border-t border-[#4a3520]">
                    <button data-opp-id="${opp.id}" class="btn-challenge-arena-opp w-full py-2 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1 ${
                      arenaData.challengesLeft > 0 ? 'mota-btn-gold' : 'mota-btn-dark text-slate-500 opacity-60 cursor-not-allowed'
                    }">
                      <span>发起天梯对决 -></span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <!-- 声望军需商行 -->
            <div class="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 overflow-y-auto mota-custom-scroll pr-1">
              ${PRESTIGE_SHOP_ITEMS.map(item => {
                const canAfford = curPrestige >= item.costPrestige;
                return `
                  <div class="p-3 rounded-xl bg-black/40 border border-[#4a3520] hover:border-amber-500/80 transition-all flex flex-col justify-between shadow">
                    <div>
                      <div class="flex items-center gap-2 pb-2 border-b border-[#4a3520]">
                        <div class="w-9 h-9 rounded-xl bg-black/60 border border-purple-500/70 p-1 flex items-center justify-center flex-shrink-0">
                          ${renderGameIcon(item.itemData, { size: 'w-full h-full' })}
                        </div>
                        <div class="min-w-0 flex-1">
                          <h4 class="text-xs font-black text-amber-200 truncate">${item.name}</h4>
                          <span class="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700">军需物资</span>
                        </div>
                      </div>

                      <div class="mt-2 text-[10px] text-slate-400 line-clamp-2 min-h-[30px]">
                        ${item.desc}
                      </div>

                      <div class="mt-2 p-1.5 rounded-lg bg-black/50 border border-slate-800 flex items-center justify-between text-[10px]">
                        <span class="text-slate-400">所需声望:</span>
                        <span class="font-mono font-bold ${canAfford ? 'text-purple-300' : 'text-red-400'}">${item.costPrestige} 点</span>
                      </div>
                    </div>

                    <div class="pt-2 border-t border-[#4a3520]">
                      <button data-shop-id="${item.id}" ${canAfford ? '' : 'disabled'} class="btn-buy-prestige-item w-full py-1.5 rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1 ${
                        canAfford ? 'mota-btn-gold' : 'mota-btn-dark text-slate-500 opacity-60 cursor-not-allowed'
                      }">
                        <span>${canAfford ? '立即兑换' : '声望不足'}</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>
    `;
  }

  // ==========================================
  // 7. 【每日俸禄大殿】(Palace Salary Sub-page)
  // ==========================================
  renderPalaceSalary() {
    const canClaim = gameState.canClaimSalary();

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <button type="button" class="btn-goto-subview text-amber-300 font-bold cursor-pointer hover:underline" data-goto="palace">圣王大殿</button>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">圣王早朝 · 每日俸禄</span>
          </div>
          <button data-goto="palace" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王宫大厅</span>
          </button>
        </div>

        <!-- 主体：早朝圣殿特写 -->
        <div class="flex-1 min-h-0 mota-parchment-panel p-5 rounded-2xl flex flex-col justify-between border-2 border-amber-400/80 bg-amber-950/20">
          <div>
            <div class="flex items-center gap-3 pb-3 border-b border-[#4a3520]">
              <div class="w-12 h-12 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center p-2 shadow-inner">
                ${getVectorIcon('coin_gold', 'w-full h-full')}
              </div>
              <div>
                <h3 class="text-base font-black text-amber-300">圣王亨利七世 · 每日俸禄谕旨</h3>
                <p class="text-[11px] text-slate-400">亚诺王都国库每日为合格勇者拨付军饷津贴</p>
              </div>
            </div>

            <!-- 谕旨正文框 -->
            <div class="max-w-xl mx-auto my-4 p-5 rounded-2xl bg-black/60 border border-amber-500/50 space-y-3 text-center">
              <div class="text-xs font-bold text-amber-200 leading-relaxed">
                凡亚诺大陆英勇之士，持王国征召令者，每日皆可至大殿亲领王国赏赐！
              </div>

              <div class="grid grid-cols-2 gap-3 py-2">
                <div class="p-2.5 rounded-xl bg-black/60 border border-amber-600/40">
                  <div class="text-[11px] text-slate-400">赏赐金币</div>
                  <div class="text-lg font-black text-amber-400 font-mono mt-0.5">+1,500 G</div>
                </div>
                <div class="p-2.5 rounded-xl bg-black/60 border border-cyan-600/40">
                  <div class="text-[11px] text-slate-400">赏赐魔晶</div>
                  <div class="text-lg font-black text-cyan-400 font-mono mt-0.5">+20 魔晶</div>
                </div>
              </div>

              <div class="text-[11px] text-slate-400 font-mono">
                领取机制：每位玩家每日限领 1 次，次日拂晓重置
              </div>
            </div>
          </div>

          <!-- 领受按键 -->
          <div class="pt-3 border-t border-[#4a3520] max-w-md mx-auto w-full">
            ${canClaim ? `
              <button id="btn-claim-salary" class="w-full mota-btn-gold py-3 rounded-xl text-sm font-black shadow-xl border-2 border-amber-300 animate-pulse flex items-center justify-center gap-2">
                <span>恭敬晋谒圣王 · 领受今日王国俸禄</span>
              </button>
            ` : `
              <button disabled class="w-full py-3 rounded-xl text-xs font-bold bg-[#241c14] border border-[#5a4830] text-slate-500 cursor-not-allowed text-center">
                今日俸禄已领受完毕 (明日拂晓再度面圣)
              </button>
            `}
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 8. 【幻境试炼封号长廊】(Palace Trials Sub-page)
  // ==========================================
  renderPalaceTrials() {
    const data = gameState.data;
    const curTrialIdx = data.royalTrials?.completedStage || 0;
    const nextTrial = ROYAL_TRIALS[curTrialIdx];
    const classId = data.classId || 'warrior';

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none town-trials">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <button type="button" class="btn-goto-subview text-amber-300 font-bold cursor-pointer hover:underline" data-goto="palace">圣王大殿</button>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">职业七阶转职殿堂 · 封号试炼</span>
          </div>
          <button data-goto="palace" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王宫大厅</span>
          </button>
        </div>

        <!-- 主体：7大转职进阶图谱 (4列) + 下一阶段守关BOSS特写 (8列) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          
          <!-- 7大转职阶位荣耀长廊 -->
          <div class="md:col-span-4 mota-parchment-panel p-3 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            <div class="text-xs font-bold text-amber-300 pb-2 border-b border-[#4a3520] flex items-center justify-between">
              <span>七阶转职晋升图谱</span>
              <span class="text-[10px] text-slate-400 font-mono">阶位: ${curTrialIdx}/${ROYAL_TRIALS.length}</span>
            </div>

            <div class="space-y-1.5 my-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              ${ROYAL_TRIALS.map((t, idx) => {
                const isDone = idx < curTrialIdx;
                const isCurrent = idx === curTrialIdx;
                const promo = t.classPromotions?.[classId] || { title: `${t.title}阶`, desc: '' };
                return `
                  <div class="p-2 rounded-lg border flex items-center justify-between ${isCurrent ? 'bg-amber-950/60 border-amber-400 shadow' : isDone ? 'bg-black/50 border-emerald-800/60' : 'bg-black/30 border-slate-800 opacity-60'}">
                    <div class="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span class="w-6 h-6 rounded bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-xs font-bold text-amber-300 font-mono flex-shrink-0">${idx + 1}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold truncate ${isCurrent ? 'text-amber-200' : isDone ? 'text-emerald-300' : 'text-slate-400'}">
                          ${promo.title}
                        </div>
                        <div class="text-[10px] text-slate-500 font-mono">准入: Lv.${t.level} · 声望${t.fameReq}</div>
                      </div>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.2 rounded font-mono flex-shrink-0 ${isDone ? 'bg-emerald-950 text-emerald-300' : isCurrent ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-400'}">
                      ${isDone ? '已晋升' : isCurrent ? '当前考核' : '未解锁'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="text-[10px] text-slate-400 text-center pt-1 border-t border-[#4a3520]/50">
              每阶转职重铸职业封号，赋予勇者永久属性加成
            </div>
          </div>

          <!-- 守关幻象 BOSS 与考核详情 -->
          <div class="md:col-span-8 mota-parchment-panel p-4 sm:p-5 rounded-xl flex flex-col justify-between border-2 border-[#caa048]">
            ${nextTrial ? (() => {
              const promo = nextTrial.classPromotions?.[classId] || { title: `${nextTrial.title}阶转职`, desc: nextTrial.rewardDesc };
              const isLevelMet = (data.level || 1) >= nextTrial.level;
              const isFameMet = (data.prestige || 0) >= nextTrial.fameReq;
              const canChallenge = isLevelMet && isFameMet;

              return `
                <div>
                  <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
                    <div>
                      <h3 class="text-sm font-black text-amber-300">第 ${curTrialIdx + 1} 阶职业晋升试炼台</h3>
                      <div class="text-xs text-slate-400 mt-0.5">目标转职：<b class="text-amber-200">【${promo.title}】</b></div>
                    </div>
                    <div class="text-right text-xs font-mono">
                      <div class="${isLevelMet ? 'text-emerald-400' : 'text-red-400'}">等级要求: Lv.${data.level}/${nextTrial.level}</div>
                      <div class="${isFameMet ? 'text-emerald-400' : 'text-red-400'}">声望要求: ${data.prestige || 0}/${nextTrial.fameReq}</div>
                    </div>
                  </div>

                  <div class="my-3 p-3.5 rounded-xl bg-black/50 border border-[#4a3520] space-y-2.5">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-2xl bg-purple-950/60 border-2 border-purple-500 flex items-center justify-center p-1.5 shadow-inner flex-shrink-0">
                        ${getVectorIcon('bld_palace', 'w-full h-full')}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-black text-red-400">【考核镇守】${nextTrial.bossName}</div>
                        <div class="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          转职意境：<span class="text-amber-300">${promo.desc}</span>
                        </div>
                        <div class="text-xs text-slate-300 mt-0.5">
                          晋阶战力赏赐：<span class="text-emerald-400 font-mono">${nextTrial.rewardDesc}</span>
                        </div>
                      </div>
                    </div>

                    <!-- BOSS 战力三维 -->
                    <div class="grid grid-cols-3 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                      <div class="p-2 bg-black/60 rounded text-center text-red-400">
                        生命: ${nextTrial.bossStats.hp.toLocaleString()}
                      </div>
                      <div class="p-2 bg-black/60 rounded text-center text-amber-400">
                        攻击: ${nextTrial.bossStats.atk.toLocaleString()}
                      </div>
                      <div class="p-2 bg-black/60 rounded text-center text-blue-400">
                        防御: ${nextTrial.bossStats.def.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 挑战按键 -->
                <div class="pt-3 border-t border-[#4a3520]">
                  <button id="btn-challenge-trial" class="w-full mota-btn-gold py-3 rounded-xl text-xs font-bold shadow-md border-amber-300 flex items-center justify-center gap-1.5 ${canChallenge ? '' : 'opacity-70'}">
                    <span>开启转职试炼 (晋升【${promo.title}】)</span>
                  </button>
                </div>
              `;
            })() : `
              <div class="h-full flex flex-col items-center justify-center text-amber-300 text-sm font-bold text-center p-6 space-y-2">
                <div class="text-base font-black text-amber-200">恭贺勇士！你已达成终极绝地转职【${gameState.getPromotedClassName()}】！</div>
                <div class="text-xs text-slate-400">七大王宫试炼全通，战阵威仪已臻绝巅，名扬亚诺千古青史！</div>
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // 9. 【远古屠龙殿】(Dragons Sub-page)
  // ==========================================
  renderDragons() {
    const data = gameState.data;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none town-dragons">
        
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">远古屠龙殿</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono text-slate-300">
              今日剩余次数: <b class="text-amber-400">${data.dragon?.trialsLeft ?? 3}</b> / 3
            </span>
            <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
              <span>← 返回王都大街</span>
            </button>
          </div>
        </div>

        <!-- 3 大远古巨龙对决殿堂 -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          ${DRAGON_TRIALS.map((dragon, idx) => {
            const isLevelOk = data.level >= dragon.minLevel;
            return `
              <div class="mota-parchment-panel p-4 rounded-2xl flex flex-col justify-between border-2 border-red-900/60 bg-red-950/20">
                <div>
                  <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]">
                    <div class="w-8 h-8 rounded-lg bg-red-950/70 border border-red-500/70 flex items-center justify-center p-1">
                      ${getVectorIcon('bld_dragons', 'w-full h-full')}
                    </div>
                    <span class="text-xs font-mono text-amber-400 font-bold">Lv.${dragon.minLevel} 可战</span>
                  </div>

                  <div class="my-3 text-center">
                    <h3 class="text-base font-black text-amber-200">${dragon.name}</h3>
                    <div class="text-xs text-red-400 font-mono mt-1">${dragon.title}</div>
                  </div>

                  <div class="p-3 rounded-xl bg-black/60 border border-slate-800 text-xs space-y-1.5 font-mono">
                    <div class="text-slate-300 flex justify-between">
                      <span>生命:</span><b class="text-red-400">${dragon.hp.toLocaleString()}</b>
                    </div>
                    <div class="text-slate-300 flex justify-between">
                      <span>攻击:</span><b class="text-amber-400">${dragon.atk.toLocaleString()}</b>
                    </div>
                    <div class="text-slate-300 flex justify-between">
                      <span>防御:</span><b class="text-blue-400">${dragon.def.toLocaleString()}</b>
                    </div>
                    <div class="pt-1 border-t border-slate-800 text-[11px] text-purple-300">
                      爆落：${dragon.rewardDesc}
                    </div>
                  </div>
                </div>

                <div class="pt-3">
                  <button data-dragon-id="${dragon.id}" class="btn-fight-dragon w-full mota-btn-gold py-2.5 rounded-xl text-xs font-bold shadow ${isLevelOk ? '' : 'opacity-50'}">
                    拔剑诛杀此龙
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }

  // ==========================================
  // 10. 【碧波垂钓水域】(Fishing Sub-page)
  // ==========================================
  renderFishing() {
    const data = gameState.data;
    const normalBait = data.bag.find(i => i.id === 'bait_normal')?.count || 0;
    const luxuryBait = data.bag.find(i => i.id === 'bait_luxury')?.count || 0;
    const lampreyFish = data.fishing?.lamprey || 0;
    const arowanaFish = data.fishing?.arowana || 0;
    const today = gameState.getActionDay();
    const exchangeCount = data.fishing?.exchangeDay === today ? (data.fishing?.exchangeCount || 0) : 0;
    const exchangeLeft = Math.max(0, 3 - exchangeCount);

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none town-fishing">
        <!-- 面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">碧波垂钓亭</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王都大街</span>
          </button>
        </div>

        <!-- 垂钓水域大特写 -->
        <div class="flex-1 min-h-0 mota-parchment-panel p-5 rounded-2xl flex flex-col border-2 border-cyan-900/60 bg-cyan-950/20">
          <div class="min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <div class="flex items-center justify-between pb-3 border-b border-[#4a3520]">
              <div>
                <h3 class="text-sm font-black text-amber-300">亚诺护城水域 · 悠闲泛舟垂钓</h3>
                <p class="text-[11px] text-slate-400">酒馆一星悬赏提供普通鱼饵，四星悬赏提供高级鱼饵。带来垂钓可捕获鱼类与额外魔晶。</p>
              </div>
              <div class="flex gap-3 text-xs bg-black/60 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                <div>七鳃鳗: <b class="text-cyan-400">${data.fishing?.lamprey || 0}</b> 尾</div>
                <div>金龙鱼: <b class="text-amber-400">${data.fishing?.arowana || 0}</b> 尾</div>
              </div>
            </div>

            <!-- 两大钓台 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <!-- 普通鱼饵 -->
              <div class="p-4 rounded-xl bg-black/50 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-cyan-300">普通鱼饵垂钓</span>
                    <span class="text-slate-400 font-mono">持有: ${normalBait} 份</span>
                  </div>
                  <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                    稳定垂钓野生七鳃鳗，每次可获得丰厚魔晶石和金币储备。
                  </p>
                </div>
                <button id="btn-fish-normal" class="w-full mota-btn-dark py-2.5 rounded-xl text-xs font-bold text-cyan-300 border-cyan-700/60 ${normalBait > 0 ? '' : 'opacity-40'}">
                  抛投普通鱼饵 (钓七鳃鳗)
                </button>
              </div>

              <!-- 高级鱼饵 -->
              <div class="p-4 rounded-xl bg-black/50 border border-amber-600/50 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-amber-300">秘制高级鱼饵垂钓</span>
                    <span class="text-amber-400 font-mono">持有: ${luxuryBait} 份</span>
                  </div>
                  <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                    特供高级鱼饵，有极高概率引诱万中无一的【金龙鱼】，爆落天命道具！
                  </p>
                </div>
                <button id="btn-fish-luxury" class="w-full mota-btn-gold py-2.5 rounded-xl text-xs font-black shadow-md border-amber-300 ${luxuryBait > 0 ? '' : 'opacity-40'}">
                  抛投高级鱼饵 (博取金龙鱼)
                </button>
              </div>
            </div>

            <!-- 鱼市兑换 -->
            <div class="mt-2 p-4 rounded-xl bg-black/50 border border-cyan-800/60">
              <div class="flex items-center justify-between pb-2 border-b border-cyan-900/60">
                <div>
                  <h4 class="text-xs font-bold text-cyan-300">鱼市兑换</h4>
                  <p class="text-[11px] text-slate-400 mt-0.5">鱼获兑换基础资源。本行动日剩余兑换次数：<b class="text-cyan-300">${exchangeLeft}</b> / 3。</p>
                </div>
                <div class="text-[11px] text-slate-400 font-mono">七鳃鳗 ${lampreyFish} 尾 · 金龙鱼 ${arowanaFish} 尾</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div class="p-3 rounded-lg bg-black/40 border border-slate-800">
                  <div class="text-xs font-bold text-cyan-300">七鳃鳗 ×10</div>
                  <p class="text-[11px] text-slate-400 mt-1">兑换 魔晶 ×50</p>
                  <button data-fish-exchange="lamprey" data-fish-qty="1" class="w-full mt-2 mota-btn-dark py-2 rounded-lg text-[11px] font-bold ${lampreyFish >= 10 && exchangeLeft >= 1 ? '' : 'opacity-40 cursor-not-allowed'}" ${lampreyFish >= 10 && exchangeLeft >= 1 ? '' : 'disabled'}>兑换 1 次</button>
                </div>
                <div class="p-3 rounded-lg bg-black/40 border border-slate-800">
                  <div class="text-xs font-bold text-amber-300">金龙鱼 ×5</div>
                  <p class="text-[11px] text-slate-400 mt-1">兑换 魔晶 ×30 + 普通宠物口粮 ×2</p>
                  <button data-fish-exchange="arowana" data-fish-qty="1" class="w-full mt-2 mota-btn-gold py-2 rounded-lg text-[11px] font-black ${arowanaFish >= 5 && exchangeLeft >= 1 ? '' : 'opacity-40 cursor-not-allowed'}" ${arowanaFish >= 5 && exchangeLeft >= 1 ? '' : 'disabled'}>兑换 1 次</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 13. 【皇家酒馆大厅】(Tavern Hub)
  // ==========================================
  renderTavernHub() {
    const data = gameState.data;
    const bounties = gameState.getTavernBounties();
    const hasClaimable = bounties.some(b => b.status === 'ready_to_claim');
    const inProgressCount = bounties.filter(b => b.status === 'in_progress').length;
    const drinkBuff = data.tavern?.drinkBuff;
    const activeMercId = data.estate?.hiredMercId;
    const activeMerc = MERCENARIES.find(m => m.id === activeMercId) || { name: '尚未招募', role: '独自旅行', aura: '暂无', auraDesc: '在下方选择一位护卫，支付招募费后才会随行。' };

    return `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none town-tavernhub">
        
        <!-- 顶部面包屑与酒馆招牌 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">亚诺皇家酒馆 (冒险者天堂)</span>
          </div>
          <div class="text-[11px] text-amber-300/80 font-mono hidden sm:block">
            麦酒香气四溢 · 赏金猎人聚集地
          </div>
        </div>

        ${this.renderCommissionEntrance(false)}
        <!-- 中部主体：横幅与三大分区卡片 -->
        <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
          
          <!-- 全景迎宾横幅 -->
          <div class="p-4 rounded-xl border border-amber-600/40 bg-gradient-to-r from-amber-950/80 via-black/80 to-amber-950/70 shadow-lg flex items-center justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-500/50 text-amber-300 text-[10px] font-bold">王国驻地</span>
                <h2 class="text-base font-black text-amber-100 tracking-wider">野猪与利刃 · 皇家酒馆</h2>
              </div>
              <p class="text-xs text-amber-200/80 leading-relaxed max-w-2xl">
                壁炉内的松木烈焰熊熊跳跃，游吟诗人的鲁特琴声伴随刀剑碰撞的粗豪笑谈回荡在石墙之间。在此揭榜领赏、雇佣传奇勇士、痛饮特调烈酒！
              </p>
            </div>
            <div class="hidden md:flex flex-col items-end text-xs text-amber-300/90 font-mono space-y-1">
              <span>随行盟友: <strong class="text-amber-200">${activeMerc.name}</strong></span>
              <span>特调酒力: <strong class="${drinkBuff ? 'text-amber-400' : 'text-slate-400'}">${drinkBuff ? drinkBuff.name : '未饮用'}</strong></span>
            </div>
          </div>

          <!-- 三大功能入口卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            <!-- 1. 皇家赏金悬赏木榜 -->
            <div data-goto="tavern_bounty" class="btn-goto-subview mota-building-card p-4 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all relative">
              ${hasClaimable ? `
                <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-bounce shadow">
                  赏金待结
                </div>
              ` : ''}
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/60 flex items-center justify-center p-2 shadow-inner">
                    ${renderGameIcon('skill_book', { size: 'w-full h-full' })}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200">赏金悬赏木榜</h3>
                    <p class="text-[10px] text-amber-400/80">每日 4 大通缉凶魔首领</p>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  治安署与圣堂签发的高额通缉榜。斩杀幽影狼王、暗影女盗、腐毒恶蟾与裂谷飞龙，兑付巨额金币与军功声望！
                </p>
                <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>悬赏状态:</span>
                  <span class="text-amber-300">${hasClaimable ? '有赏金可领！' : inProgressCount > 0 ? `${inProgressCount} 个通缉讨伐中` : '4 份通缉令待揭'}</span>
                </div>
              </div>

              <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span class="text-[11px] text-slate-400 font-normal">通缉令与悬赏金</span>
                <button class="px-3 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                  查看悬赏榜 ->
                </button>
              </div>
            </div>

            <!-- 2. 佣兵公会驻所 -->
            <div data-goto="tavern_mercenary" class="btn-goto-subview mota-building-card p-4 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/60 flex items-center justify-center p-2 shadow-inner">
                    ${renderGameIcon('avatar_warrior', { size: 'w-full h-full' })}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200">佣兵公会驻所</h3>
                    <p class="text-[10px] text-amber-400/80">誓约传奇战友 · 随行护卫</p>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  三大传奇佣兵：圣光救赎神官、誓约神圣铁卫与逐风游侠诗人。出战可为全队赋予减伤、大回血或速度暴增！
                </p>
                <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>当前随行:</span>
                  <span class="text-amber-300">${activeMerc.name}</span>
                </div>
              </div>

              <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span class="text-[11px] text-slate-400 font-normal">盟友立誓与阵位调配</span>
                <button class="px-3 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                  拜会佣兵 ->
                </button>
              </div>
            </div>

            <!-- 3. 吧台特酿与游吟诗人 -->
            <div data-goto="tavern_drinks" class="btn-goto-subview mota-building-card p-4 rounded-xl flex flex-col justify-between cursor-pointer border-2 border-amber-600/70 hover:border-amber-400 transition-all">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/60 flex items-center justify-center p-2 shadow-inner">
                    ${renderGameIcon('potion_hp', { size: 'w-full h-full' })}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-amber-200">吧台特酿与诗人</h3>
                    <p class="text-[10px] text-amber-400/80">全日战斗属性 Buff · 大陆秘闻</p>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  矮人黑铁黑啤、月光精灵甘露与炎龙烈性朗姆。畅饮一杯激发生理极限，探听魔塔深渊首领战术弱点！
                </p>
                <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>当前酒力:</span>
                  <span class="text-amber-300">${drinkBuff ? drinkBuff.buff.desc : '尚待畅饮'}</span>
                </div>
              </div>

              <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span class="text-[11px] text-slate-400 font-normal">畅饮佳酿与史诗听闻</span>
                <button class="px-3 py-1 rounded-lg mota-btn-gold text-xs font-bold shadow">
                  前往吧台 ->
                </button>
              </div>
            </div>

          </div>

        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="hub" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回王都中心大街</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">亚诺历 1024 年 · 皇家公会酒馆</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 14. 【赏金悬赏木榜】(Tavern Bounty Board)
  // ==========================================
  renderTavernBounty() {
    const bounties = gameState.getTavernBounties();
    const bountyPerPage = 2;
    const bountyPages = Math.max(1, Math.ceil(bounties.length / bountyPerPage));
    const bountyPage = Math.min(Math.max(0, this.bountyPage || 0), bountyPages - 1);
    this.bountyPage = bountyPage;
    const bountyStart = bountyPage * bountyPerPage;

    return `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none town-bounty">
        <!-- 顶部面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold cursor-pointer btn-goto-subview" data-goto="hub">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer btn-goto-subview" data-goto="tavern">皇家酒馆</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">每日赏金悬赏木榜</span>
          </div>
          <div class="flex items-center gap-3 text-[11px] text-amber-300/80 font-mono">
            ${bountyPages > 1 ? `<span class="inline-flex items-center gap-1"><button type="button" id="bounty-prev" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="上一页悬赏" ${bountyPage <= 0 ? 'disabled' : ''}>‹</button><span>${bountyPage + 1}/${bountyPages}</span><button type="button" id="bounty-next" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="下一页悬赏" ${bountyPage >= bountyPages - 1 ? 'disabled' : ''}>›</button></span>` : ''}
            <span class="hidden sm:block">每日拂晓自动更新 · 斩杀领主领取赏金</span>
          </div>
        </div>

        <!-- 悬赏卡片列表 (每页 2 张) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 town-bounty-list">
          ${bounties.map((b, bi) => {
            const isCompleted = b.status === 'completed';
            const isReadyToClaim = b.status === 'ready_to_claim';
            const isInProgress = b.status === 'in_progress';
            const starsText = `${b.stars} 星级难度`;

            return `
              <div class="p-3.5 rounded-xl border-2 ${bi < bountyStart || bi >= bountyStart + bountyPerPage ? 'bounty-hidden ' : ''}${isCompleted ? 'border-slate-800 bg-black/40 opacity-70' : isReadyToClaim ? 'border-amber-400 bg-amber-950/40 shadow-lg' : isInProgress ? 'border-red-600/70 bg-red-950/30 shadow' : 'border-amber-700/60 bg-black/50'} flex flex-col justify-between transition-all">
                
                <!-- 头部：标题与星级 -->
                <div>
                  <div class="flex items-center justify-between pb-2 border-b border-amber-900/40">
                    <div class="flex items-center gap-2">
                      <span class="text-amber-400 font-bold text-xs tracking-wider">${b.title}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-600/60 text-amber-300 font-mono">
                        Lv.${b.reqLevel}
                      </span>
                    </div>
                    <span class="text-amber-400 font-mono text-xs font-bold">${starsText}</span>
                  </div>

                  <!-- 目标与首领详情 -->
                  <div class="mt-2.5 flex items-start gap-3">
                    <div class="w-14 h-14 rounded-xl bg-black/60 border border-amber-700/50 flex-shrink-0 flex items-center justify-center p-1 shadow-inner">
                      ${renderGameIcon(b.avatar, { size: 'w-full h-full' })}
                    </div>
                    <div class="flex-1 min-w-0 space-y-1">
                      <p class="text-xs text-slate-300 leading-relaxed font-sans">${b.desc}</p>
                      <div class="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>生命: <strong class="text-rose-300">${b.stats.hp}</strong></span>
                        <span>攻击: <strong class="text-amber-200">${b.stats.atk}</strong></span>
                        <span>防御: <strong class="text-blue-300">${b.stats.def}</strong></span>
                      </div>
                    </div>
                  </div>

                  <!-- 赏金预览 -->
                  <div class="mt-2.5 p-2 rounded-lg bg-black/50 border border-amber-900/30 flex items-center justify-between text-xs font-mono">
                    <div class="flex items-center gap-3 text-amber-300">
                      <span>金币: +${b.rewards.gold}</span>
                      <span>声望: +${b.rewards.prestige}</span>
                      <span>魔晶: +${b.rewards.crystal}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      ${b.rewards.items.map(it => `
                        <span title="${it.name} x${it.count}" class="inline-flex items-center">
                          ${renderGameIcon(it.id, { size: 'w-5 h-5' })}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                </div>

                <!-- 底部操作按钮 -->
                <div class="pt-2.5 mt-2.5 border-t border-amber-900/40 flex items-center justify-between">
                  <span class="text-[11px] text-slate-400">
                    ${isCompleted ? '[已结案] 今日悬赏已领受' : isReadyToClaim ? '已讨伐！首级已验，速速领赏！' : isInProgress ? '通缉中：速前往深渊将其击毙！' : '尚未接取此悬赏令'}
                  </span>
                  <div>
                    ${isCompleted ? `
                      <span class="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400 text-xs font-mono">
                        已完成
                      </span>
                    ` : isReadyToClaim ? `
                      <button data-bounty-id="${b.id}" class="btn-claim-bounty px-4 py-1.5 rounded-lg mota-btn-gold text-xs font-black shadow animate-pulse">
                        领受赏金！
                      </button>
                    ` : isInProgress ? `
                      <button data-bounty-id="${b.id}" class="btn-fight-bounty px-4 py-1.5 rounded-lg bg-red-900/90 hover:bg-red-800 border border-red-500 text-red-100 text-xs font-bold shadow">
                        出击讨伐 ->
                      </button>
                    ` : `
                      <button data-bounty-id="${b.id}" class="btn-accept-bounty px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-500 text-amber-300 text-xs font-bold shadow">
                        揭榜接令 ->
                      </button>
                    `}
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="tavern" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回酒馆大厅</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">每日赏金于跨日清晨重置</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 15. 【吧台特酿与游吟诗人】(Tavern Drinks & Bard)
  // ==========================================
  renderTavernDrinks() {
    const data = gameState.data;
    const currentDrink = data.tavern?.drinkBuff;

    return `
      <div class="w-full h-full p-2 flex flex-col justify-between select-none town-drinks">
        <!-- 顶部面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold cursor-pointer btn-goto-subview" data-goto="hub">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer btn-goto-subview" data-goto="tavern">皇家酒馆</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">吧台特酿与游吟诗人</span>
          </div>
          <div class="text-[11px] text-amber-300/80 font-mono hidden sm:block">
            麦芽清香 · 今日战斗属性常驻增益
          </div>
        </div>

        <!-- 中部主体：当前酒力状态 + 3 种美酒卡片 + 游吟诗人史诗台词 -->
        <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
          
          <!-- 当前特调酒力状态栏 -->
          <div class="p-3.5 rounded-xl border ${currentDrink ? 'border-amber-400 bg-amber-950/40 shadow-md' : 'border-slate-800 bg-black/40'} flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center p-1.5 shadow-inner">
                ${renderGameIcon('potion_hp', { size: 'w-full h-full' })}
              </div>
              <div>
                <h4 class="text-xs font-bold text-amber-200">当前特调酒力状态</h4>
                <p class="text-[11px] text-slate-300">
                  ${currentDrink ? `<strong class="text-amber-400">【${currentDrink.name}】</strong>已生效！— ${currentDrink.buff.desc}（今日全程生效）` : '今日尚未痛饮美酒，快来上一杯特调麦酒为探险助威！'}
                </p>
              </div>
            </div>
            <div class="text-xs text-amber-400 font-mono">
              持有金币: <strong class="text-amber-300">${data.gold}</strong>
            </div>
          </div>

          <!-- 三大特酿饮品卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${TAVERN_DRINKS.map(d => {
              const isCurrent = currentDrink && currentDrink.id === d.id;

              return `
                <div class="p-3.5 rounded-xl border-2 ${isCurrent ? 'border-amber-400 bg-amber-950/40' : 'border-amber-800/60 bg-black/50'} flex flex-col justify-between transition-all">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between pb-2 border-b border-amber-900/40">
                      <span class="text-amber-200 font-bold text-xs">${d.name}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-600/60 text-amber-300 font-mono">
                        ${d.costGold} 金币
                      </span>
                    </div>

                    <div class="p-2 rounded bg-black/40 border border-slate-800 text-[11px] text-amber-300 font-mono">
                      特性: ${d.buff.desc}
                    </div>

                    <p class="text-[11px] text-slate-400 italic leading-relaxed pt-1">
                      ${d.quote}
                    </p>
                  </div>

                  <div class="pt-3 mt-3 border-t border-amber-900/40 flex items-center justify-end">
                    ${isCurrent ? `
                      <span class="px-3 py-1 rounded bg-amber-950 border border-amber-500 text-amber-300 text-xs font-bold font-mono">
                        [正在生效中]
                      </span>
                    ` : `
                      <button data-drink-id="${d.id}" class="btn-order-drink px-3.5 py-1.5 rounded-lg mota-btn-gold text-xs font-bold shadow">
                        痛饮一杯 (${d.costGold}G) ->
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- 游吟诗人见闻录 -->
          <div class="p-3.5 rounded-xl border border-amber-700/40 bg-black/40 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-amber-400 font-bold text-xs">游吟诗人的鲁特琴秘闻</span>
              <span class="text-[10px] text-slate-500 font-mono">· 战术弱点与大陆史诗</span>
            </div>
            <p class="text-xs text-amber-100/80 leading-relaxed italic">
              “年轻的骑士啊，听我一曲：首领施法前必有一次蓄势，抓住这个窗口以控制技打断，就能化解它的杀招；法术伤害靠魔抗与减伤抵挡，物理连击则凭闪避与铁卫的庇护周旋。出征前喂饱神兽、排好克制阵容，方能在魔塔深渊走得更远！”
            </p>
          </div>

        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="tavern" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回酒馆大厅</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">亚诺皇家酒馆 · 麦酒长廊</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 16. 【佣兵公会驻所】(Tavern Mercenary Guild)
  // ==========================================
  renderTavernMercenary() {
    const data = gameState.data;
    const hiredMercId = data.estate?.hiredMercId;
    const activeMerc = MERCENARIES.find(m => m.id === hiredMercId) || { name: '尚未招募', role: '独自旅行', aura: '暂无', auraDesc: '在下方选择一位护卫，支付招募费后才会随行。' };

    return `
      <div class="mercenary-page w-full h-full p-2 flex flex-col justify-between select-none town-merc">
        
        <!-- 顶部面包屑 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold cursor-pointer btn-goto-subview" data-goto="hub">亚诺圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-300 font-bold cursor-pointer btn-goto-subview" data-goto="tavern">皇家酒馆</span>
            <span class="text-slate-500">-></span>
            <span class="text-amber-200 font-bold">佣兵公会驻所</span>
          </div>
          <div class="text-[11px] text-amber-300/80 font-mono hidden sm:block">
            誓约传奇盟友 · 赋予主角战阵光环
          </div>
        </div>

        <!-- 中部主体：当前随行佣兵 + 3 传奇佣兵卡片 -->
        <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
          
          <!-- 当前随行盟友状态 -->
          <div class="mercenary-active-summary mota-parchment-panel p-3.5 rounded-xl border border-amber-400 bg-amber-950/40 shadow-md flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-amber-950 border border-amber-500/70 flex items-center justify-center p-1 shadow-inner">
                ${renderGameIcon(activeMerc.avatar || 'avatar_warrior', { size: 'w-full h-full' })}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded bg-amber-900/80 border border-amber-500/60 text-amber-200 text-[10px] font-bold font-mono">${activeMerc.role}</span>
                  <h4 class="text-sm font-black text-amber-100">${activeMerc.name}</h4>
                </div>
                <p class="text-xs text-amber-300 font-mono mt-0.5">
                  随行光环【${activeMerc.aura}】：${activeMerc.auraDesc}
                </p>
              </div>
            </div>
            <div class="hidden sm:block text-xs font-mono text-amber-300 font-bold">
              ${hiredMercId ? '[随行护卫中]' : '[等待招募]'}
            </div>
          </div>

          <!-- 三大传奇佣兵卡片列表 -->
          <div class="mercenary-grid grid grid-cols-1 md:grid-cols-3 gap-3">
            ${MERCENARIES.map(m => {
              const isHired = hiredMercId === m.id;

              return `
                <div class="mercenary-card mota-parchment-panel p-4 rounded-xl border-2 ${isHired ? 'border-amber-400 bg-amber-950/30 shadow-lg' : 'border-slate-800 bg-black/40 hover:border-amber-600/60'} flex flex-col justify-between transition-all" data-current="${isHired}">
                  <div class="space-y-2.5">
                    <div class="mercenary-heading flex items-center justify-between pb-2 border-b border-amber-900/40">
                      <div>
                        <span class="text-[10px] text-amber-400/80 font-mono">${m.role}</span>
                        <h4 class="text-xs font-bold text-amber-200">${m.name}</h4>
                      </div>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-amber-600/40 text-amber-300 font-mono">
                        ${m.aura}
                      </span>
                    </div>

                    <div class="mercenary-introduction flex items-center gap-3">
                      <div class="mercenary-portrait w-12 h-12 rounded-xl bg-black/50 border border-amber-600/40 flex-shrink-0 flex items-center justify-center p-1" role="img" aria-label="${m.name}肖像">
                        ${renderGameIcon(m.avatar || 'avatar_warrior', { size: 'w-full h-full' })}
                      </div>
                      <p class="text-[11px] text-slate-300 leading-relaxed font-sans">
                        ${m.desc}
                      </p>
                    </div>

                    <div class="p-2 rounded bg-black/50 border border-slate-800 text-[11px] text-amber-200/90 font-mono leading-relaxed">
                      战阵特效: ${m.auraDesc}
                    </div>
                  </div>

                  <div class="mercenary-contract pt-3 mt-3 border-t border-amber-900/40 flex flex-col gap-2">
                    ${!isHired ? `<p class="text-xs text-slate-300">雇佣费用：<strong class="text-amber-200">${m.hireCostGold.toLocaleString()} 金币</strong><br>持有：${data.gold.toLocaleString()} 金币${data.gold < m.hireCostGold ? ' · 金币不足' : ''}</p>${hiredMercId ? '<p class="text-xs text-slate-300">签订后将替换当前随行佣兵。</p>' : ''}` : ''}
                    ${isHired ? `
                      <span class="px-3.5 py-1.5 rounded-lg bg-amber-950 border border-amber-500 text-amber-300 text-xs font-bold font-mono">
                        [誓约随行中]
                      </span>
                    ` : `
                      <button data-merc-id="${m.id}" class="btn-tavern-hire-merc px-4 py-1.5 rounded-lg mota-btn-gold text-xs font-bold shadow">
                        誓约随行出战 ->
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>

        <!-- 底部返回按键 -->
        <div class="pt-2 border-t border-amber-900/40 flex items-center justify-between mt-2 flex-shrink-0">
          <button data-goto="tavern" class="btn-goto-subview px-4 py-1.5 rounded-lg mota-btn-dark border border-amber-600/50 text-amber-300 text-xs font-bold shadow flex items-center gap-2">
            <span><- 返回酒馆大厅</span>
          </button>
          <span class="text-[11px] text-slate-500 font-mono">随行佣兵将在战斗首回合登场施展支援战吼</span>
        </div>

      </div>
    `;
  }

  // ==========================================
  // 事件绑定与子页面跳转控制
  // ==========================================
  renderCommissionEntrance(palace) {
    const list = gameState.getCommissions(palace ? ['nation_guide'] : ['story_side', 'tavern']);
    const ready = list.filter(entry => entry.status === 'ready').length;
    const active = list.filter(entry => entry.status === 'active').length;
    return `<button type="button" data-goto="${palace ? 'palace' : 'tavern'}_commissions" class="btn-goto-subview mota-btn-dark px-3 py-2 mb-2 text-xs flex-shrink-0">
      ${palace ? '城邦使者 · 国家指引' : '酒馆任务簿 · 誓言的信物与一次委托'} · ${ready ? `${ready} 份可交付` : active ? `${active} 份进行中` : palace ? '12级接取' : '15级委托 / 19级支线 / 25–60级远行'}
    </button>`;
  }

  renderCommissions(palace) {
    const list = gameState.getCommissions(palace ? ['nation_guide'] : ['story_side', 'tavern']);
    return `<div class="w-full h-full p-2 flex flex-col">
      <div class="mota-breadcrumb px-3 py-2 mb-2 flex items-center justify-between flex-shrink-0">
        <h2 id="commission-heading" tabindex="-1" class="text-sm font-bold">${palace ? '城邦使者 · 国家指引' : '皇家酒馆 · 任务簿'}</h2>
        <button type="button" data-goto="${palace ? 'palace' : 'tavern'}" class="btn-goto-subview mota-btn-dark px-3 py-1 text-xs">返回${palace ? '圣王大殿' : '皇家酒馆'}</button>
      </div>
      <p class="mota-parchment-panel p-2 text-xs mb-2 flex-shrink-0">每份委托只可交付一次，接取后开始记录。${palace ? '国家在缔约时已选定，使者不会改变你的归属。' : '这里的委托独立于每日悬赏，跨日保留进度。'}暗金契约蛋可在45级起缔约；此前保留在行囊中。</p>
      <div class="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1" aria-label="委托列表">
        ${list.map(entry => {
          const reward = entry.rewards, locked = Boolean(entry.lockedReason);
          const selectedChoice = entry.choiceId || this.commissionChoices[entry.id];
          const needsChoice = entry.status === 'ready' && entry.choices.length && !entry.choices.some(item => item.id === selectedChoice);
          const stateText = { available: '待接取', active: '进行中', ready: '可交付', claimed: '已交付' }[entry.status];
          return `<article class="mota-parchment-panel p-3" data-commission-card="${entry.id}">
            <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-bold">${entry.title}</h3><span class="text-xs">Lv.${entry.minLevel} · ${stateText}</span></div>
            <p class="text-xs mt-2 whitespace-pre-line">${escapeText(entry.speaker)}：${escapeText(entry.status === 'claimed' ? entry.ending : entry.offer)}</p>
            ${entry.progressText && ['active', 'ready'].includes(entry.status) ? `<p class="text-xs mt-2" data-commission-story="${entry.id}" role="status">${escapeText(entry.progressText)}</p>` : ''}
            <p class="text-xs mt-2" role="status">${entry.requirement.label} · ${entry.current}/${entry.requirement.count}${entry.id === 'oath_token' && entry.current > 0 ? entry.status === 'claimed' ? ' · 银质徽记已交还巡逻队' : ' · 银质徽记已找回，待交还' : ''}</p>
            <p class="text-xs mt-2">报酬：经验 ${reward.exp} / 金币 ${reward.gold} / 魔晶 ${reward.crystal} / 声望 ${reward.prestige} / ${reward.items.map(item => `${item.name} ×${item.count}`).join('、')}</p>
            ${entry.choices.length ? `<fieldset class="mt-2 text-xs min-w-0">
              <legend>${entry.status === 'claimed' ? '已领取的装备' : '装备目标 · 完成后任选一件，其他报酬照常领取'}</legend>
              ${entry.choices.filter(item => entry.status !== 'claimed' || !entry.choiceId || item.id === entry.choiceId).map(item => `<label class="block mt-2 p-2 border border-stone-600 cursor-pointer">
                ${entry.status === 'ready' ? `<input type="radio" name="commission-${entry.id}" data-commission-choice="${entry.id}" value="${item.id}" ${selectedChoice === item.id ? 'checked' : ''}> ` : ''}
                <strong>${escapeText(item.name)}</strong> · ${item.level}级 · ${formatSocketStats(item.stats)}
                <span class="block mt-1">${escapeText(item.desc)}</span>
              </label>${entry.status !== 'claimed' ? this.renderCommissionEquipmentPreview(entry.id, item.id) : ''}`).join('')}
            </fieldset>` : ''}
            <div class="flex items-center gap-2 mt-3">
              <button type="button" data-commission-id="${entry.id}" data-commission-action="${entry.status === 'ready' ? 'claim' : 'accept'}" class="btn-commission mota-btn-gold px-4 py-2 text-xs" ${(locked || needsChoice || ['active', 'claimed'].includes(entry.status)) ? 'disabled' : ''}>
                ${entry.status === 'claimed' ? '报酬已领取' : locked ? escapeText(entry.lockedReason) : needsChoice ? '先选择一件装备' : entry.status === 'ready' ? `${entry.id === 'oath_token' ? '交还信物' : '交付报告'} · 领取报酬` : entry.status === 'active' ? '等待完成目标' : '接取委托'}
              </button>
              ${entry.status === 'active' ? `<button type="button" data-commission-go="${entry.id}" class="mota-btn-dark px-3 py-2 text-xs">前往${escapeText(entry.destination)}</button>` : ''}
            </div>
          </article>`;
        }).join('')}
      </div>
    </div>`;
  }

  renderCommissionEquipmentPreview(id, choiceId) {
    const preview = gameState.getCommissionEquipmentPreview(id, choiceId);
    if (!preview.success) return '';
    const rows = [['maxHp', '生命', ''], ['atk', '攻击', ''], ['magicResist', '魔抗', '%'],
      ['dmgResist', '减伤', '%'], ['interval', '出手间隔', '秒']];
    return `<details class="mt-1 text-xs" data-commission-preview="${choiceId}">
      <summary class="cursor-pointer">与当前装备比较 · ${escapeText(preview.currentName)}</summary>
      <p class="mt-1">按当前培养与搭配计算，奖励装备为无强化、无宝石。${preview.canEquip ? '等级已满足，可领取后穿戴。' : `需${preview.reqLevel}级才能穿戴。`}</p>
      <table class="w-full mt-1"><thead><tr><th>属性</th><th>当前</th><th>换装后</th><th>变化</th></tr></thead><tbody>
        ${rows.map(([key, label, unit]) => {
          const before = key === 'interval' ? getPlayerActionInterval(preview.before, gameState.data) : preview.before[key] || 0;
          const after = key === 'interval' ? getPlayerActionInterval(preview.after, gameState.data) : preview.after[key] || 0;
          const delta = Math.round((after - before) * 100) / 100;
          const format = value => String(Math.round(value * 100) / 100);
          return `<tr data-goal-stat="${key}"><th scope="row">${label}</th><td>${format(before)}${unit}</td><td data-goal-value="${key}">${format(after)}${unit}</td><td>${delta > 0 ? '+' : ''}${format(delta)}${unit}</td></tr>`;
        }).join('')}
      </tbody></table>
    </details>`;
  }

  bindEvents() {
    this.container.querySelectorAll('[data-town-route]').forEach(button => {
      const entrance = this.container.querySelector(`.classic-town-location[data-goto="${button.dataset.townRoute}"]`);
      button.onclick = () => {
        if (entrance) { entrance.click(); return; }
        this.currentView = button.dataset.townRoute;
        this.render();
      };
    });
    const bountyPrev = this.container.querySelector('#bounty-prev');
    if (bountyPrev) bountyPrev.addEventListener('click', () => { this.bountyPage = Math.max(0, (this.bountyPage || 0) - 1); this.render(); });
    const bountyNext = this.container.querySelector('#bounty-next');
    if (bountyNext) bountyNext.addEventListener('click', () => { this.bountyPage = (this.bountyPage || 0) + 1; this.render(); });
    const runeMatPrev = this.container.querySelector('#rune-mat-prev');
    if (runeMatPrev) runeMatPrev.addEventListener('click', () => { this.runeMatPage = Math.max(0, (this.runeMatPage || 0) - 1); this.render(); });
    const runeMatNext = this.container.querySelector('#rune-mat-next');
    if (runeMatNext) runeMatNext.addEventListener('click', () => { this.runeMatPage = (this.runeMatPage || 0) + 1; this.render(); });
    this.container.querySelectorAll('[data-commission-choice]').forEach(input => {
      input.addEventListener('change', () => {
        this.commissionChoices[input.dataset.commissionChoice] = input.value;
        const button = this.container.querySelector(`[data-commission-id="${input.dataset.commissionChoice}"]`);
        if (button) { button.disabled = false; button.textContent = '交付报告 · 领取所选装备'; }
      });
    });
    const focusCommission = id => {
      const candidate = this.container.querySelector(`[data-commission-go="${id}"]`) ||
        this.container.querySelector(`[data-commission-id="${id}"]:not(:disabled)`) ||
        this.container.querySelector('#commission-heading');
      candidate?.focus({ preventScroll: true });
    };
    this.container.querySelectorAll('.btn-commission').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.commissionId;
        const action = button.dataset.commissionAction;
        const entry = gameState.getCommissions().find(config => config.id === id);
        const choiceId = entry?.choices.length ? this.commissionChoices[id] : undefined;
        const execute = () => {
          const result = action === 'claim' ? gameState.claimCommission(id, choiceId) : gameState.acceptCommission(id);
          this.render();
          focusCommission(id);
          gameModal.alert(result.msg, result.success ? action === 'claim' ? '委托交付' : '委托接取' : '委托提示');
        };
        if (action === 'claim' && entry?.choices.length) {
          const chosen = entry.choices.find(item => item.id === choiceId);
          if (!chosen) return;
          gameModal.confirm(`选择【${chosen.name}】作为本次装备报酬。\n${formatSocketStats(chosen.stats)}\n\n只能取得其中一件装备，其他报酬全部照常领取。`, execute, () => {}, '确认远行装备');
        } else if (action === 'claim') execute();
        else {
          gameModal.confirm(`${entry.speaker}：${entry.offer}\n\n目标：${entry.requirement.label}。`, execute, () => {}, entry.title);
        }
      });
    });
    this.container.querySelectorAll('[data-commission-go]').forEach(button => {
      button.addEventListener('click', () => {
        const entry = gameState.getCommissions().find(config => config.id === button.dataset.commissionGo);
        if (entry?.status !== 'active') return;
        if (entry.requirement.event === 'tower') {
          window.appInstance.views.tower.subTab = 'castle';
          window.switchMainTab('tower');
          document.querySelector('#btn-start-redwood, #btn-challenge-castle-floor')?.focus();
        } else {
          window.appInstance.views.wild.selectedMapId = entry.requirement.target;
          window.switchMainTab('wild');
          document.querySelector(entry.requirement.event === 'wild_boss' ? '#btn-fight-wild-boss' : '.btn-fight-mob')?.focus();
        }
      });
    });
    // 页面跳转路由事件
    this.container.querySelectorAll('.btn-goto-subview').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-goto');
        if (targetView) {
          this.currentView = targetView;
          this.render();
          if (targetView.startsWith('smithy_')) this.container.querySelector(`.smithy-workshop-tabs [data-goto="${targetView}"]`)?.focus({ preventScroll: true });
          if (targetView.endsWith('_commissions')) this.container.querySelector('#commission-heading')?.focus();
          else if (['palace', 'tavern'].includes(targetView)) this.container.querySelector(`[data-goto="${targetView}_commissions"]`)?.focus();
        }
      });
    });

    // 城市商店：页签切换 + 购买（当前城 shopCityId，真扣款入包）
    const curCity = CITIES[gameState.data.currentCity] || CITIES.capital;
    this.container.querySelectorAll('[data-shop-cat]').forEach(btn => {
      btn.onclick = () => { this.shopCategory = btn.getAttribute('data-shop-cat'); this.render(); };
    });
    this.container.querySelectorAll('[data-buy-shop-goods]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-buy-shop-goods');
        const shop = gameState.getCityShop(curCity.shopCityId);
        const good = shop.success ? shop.goods.find(g => g.id === id) : null;
        if (!good) return;
        const cost = `${good.price.gold ? good.price.gold.toLocaleString() + ' 金币' : ''}${good.price.crystal ? (good.price.gold ? ' · ' : '') + good.price.crystal + ' 魔晶' : ''}`;
        gameModal.confirm(`确定购买【${good.name}】×1？\n花费：${cost}\n购买后本行动日剩余：${Math.max(0, good.leftToday - 1)} / ${good.limit.perDay}`, () => {
          const res = gameState.buyCityShopGoods(curCity.shopCityId, id, 1);
          this.render();
          gameModal.alert(res.msg, curCity.shopLabel);
        }, () => this.render(), curCity.shopLabel + ' · 确认购买');
      };
    });
    // 城际传送（不消耗，按等级解锁）
    this.container.querySelectorAll('[data-travel-city]').forEach(btn => {
      btn.onclick = () => {
        const res = gameState.travelToCity(btn.getAttribute('data-travel-city'));
        if (!res.success) return gameModal.alert(res.msg, '城际传送');
        this.currentView = 'hub';
        this.render();
        gameModal.alert(res.msg, '城际传送');
      };
    });
    // 特色资源点领取（每行动日 1 次）
    const specialBtn = this.container.querySelector('#btn-claim-city-special');
    if (specialBtn) specialBtn.onclick = () => {
      const res = gameState.claimCitySpecial(gameState.data.currentCity || 'capital');
      this.render();
      gameModal.alert(res.msg, '特色资源点');
    };

    // 荣耀殿堂：分类切换 + 领取成就 + 佩戴称号
    this.container.querySelectorAll('[data-honor-cat]').forEach(btn => {
      btn.onclick = () => { this.honorCategory = btn.getAttribute('data-honor-cat'); this.render(); };
    });
    this.container.querySelectorAll('[data-claim-ach]').forEach(btn => {
      btn.onclick = () => { const res = gameState.claimAchievement(btn.getAttribute('data-claim-ach')); this.render(); gameModal.alert(res.msg, '荣耀殿堂'); };
    });
    this.container.querySelectorAll('[data-equip-title]').forEach(btn => {
      btn.onclick = () => { const res = gameState.setActiveTitle(btn.getAttribute('data-equip-title')); this.render(); gameModal.alert(res.msg, '称号'); };
    });

    this.container.querySelector('#btn-workshop-bag')?.addEventListener('click', () => {
      window.switchMainTab?.('bag');
    });
    const bagPrev = this.container.querySelector('#smithy-bag-prev');
    if (bagPrev) bagPrev.addEventListener('click', () => {
      this.smithyBagPage = Math.max(0, (this.smithyBagPage || 0) - 1);
      this.render();
    });
    const bagNext = this.container.querySelector('#smithy-bag-next');
    if (bagNext) bagNext.addEventListener('click', () => {
      this.smithyBagPage = (this.smithyBagPage || 0) + 1;
      this.render();
    });

    // Preserve keyboard focus when the selected smithy slot rerenders its details.
    this.container.querySelectorAll('.btn-select-smithy-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-smithy-slot');
        this.selectedEquipSlot = slotKey;
        this.render();
        this.container.querySelector(`[data-smithy-slot="${slotKey}"]`)?.focus();
      });
    });

    // 领取俸禄 (达成主线1)
    const btnSalary = document.getElementById('btn-claim-salary');
    if (btnSalary && gameState.canClaimSalary()) {
      btnSalary.addEventListener('click', () => {
        const res = gameState.claimSalary();
        if (!res.success) {
          gameModal.alert(res.msg, '圣王早朝俸禄');
          this.render();
          return;
        }

        if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_1') {
          gameModal.confirm(
            `恭敬晋谒圣王！成功领受今日王国俸禄：金币 +1500，魔晶 +20！\n\n【主线任务达成】初临王都 · 晋谒圣王！\n圣王恩赐丰厚奖赏：经验 +500，金币 +1500，魔晶 +20，职业武器、防具各1件，升星水晶x3！\n\n是否立即领受圣王犒赏并开启下一阶段主线【工欲善其事 · 装备升星】？`,
            () => {
              gameState.claimQuestReward('quest_1');
              gameModal.alert('丰厚犒赏已存入行囊！已自动为你开启下一阶段主线【工欲善其事 · 装备升星】，先打开行囊穿戴职业武器和防具，再前往铁匠铺升星。', '主线推进', () => {
                if (window.switchMainTab) window.switchMainTab('bag');
              });
            },
            () => {
              this.render();
            },
            '主线大捷 · 晋谒圣王'
          );
        } else {
          gameModal.alert(res.msg, '圣王早朝俸禄');
          this.render();
        }
      });
    }

    // 执行升星精铸 (达成主线2)
    const btnEnhance = document.getElementById('btn-do-enhance');
    if (btnEnhance) {
      btnEnhance.addEventListener('click', () => {
        const useProt = document.getElementById('chk-use-protect')?.checked || false;
        const res = gameState.enhanceEquipment(this.selectedEquipSlot, useProt);
        if (res.success) {
          sound.playFanfare();
          gameState.triggerQuestAction('enhance');
          if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_2') {
            gameModal.confirm(
              `升星大吉！${res.msg}\n\n【主线任务达成】工欲善其事 · 装备升星！\n奖赏：经验 +800，金币 +2000，魔晶 +30，【远古神兽契约蛋】x1、【远古重铸灵药】x3！\n\n是否立即领受犒赏并开启下一阶段主线【远古契约 · 神兽随行】？`,
              () => {
                gameState.claimQuestReward('quest_2');
                gameModal.alert('丰厚犒赏已存入行囊！已为你开启下一阶段主线【远古契约 · 神兽随行】，前往神兽圣境孵化契约蛋，再将伙伴设为出战主宠。', '主线推进', () => {
                  if (window.switchMainTab) window.switchMainTab('pets');
                });
              },
              () => {
                this.render();
              },
              '主线大捷 · 装备升星'
            );
            this.render();
            return;
          }
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '装备升星结果');
        this.render();
      });
    }

    // 全身一键修理
    const btnRepair = document.getElementById('btn-repair-all');
    if (btnRepair) {
      btnRepair.addEventListener('click', () => {
        const res = gameState.repairAllEquipment();
        gameModal.alert(res.msg, '铁匠铺耐久修缮');
        this.render();
      });
    }

    // 装备分解
    const btnDis = document.getElementById('btn-disassemble-gear');
    if (btnDis) {
      btnDis.addEventListener('click', () => {
        const slotKey = this.selectedEquipSlot;
        const quote = gameState.getEquipmentDisassemblyQuote(slotKey);
        if (!quote.success) return gameModal.alert(quote.msg, '熔炉分解');
        gameModal.confirm(
          `确定要分解【${quote.name}】吗？装备将彻底消失，返还【${quote.materialName}】x${quote.count}。\n${quote.stars ? `强化 +${quote.stars} 星也将消失。\n` : ''}分解无法撤销。`,
          () => {
            const result = gameState.disassembleEquipment(slotKey, quote.uid);
            gameModal.alert(result.msg, '熔炉分解结果');
            this.render();
          },
          () => {},
          '分解装备确认'
        );
      });
    }

    // 挑战职业八阶转职试炼
    const btnTrial = document.getElementById('btn-challenge-trial');
    if (btnTrial) {
      btnTrial.addEventListener('click', () => {
        const curStage = gameState.data.royalTrials?.completedStage || 0;
        const trial = ROYAL_TRIALS[curStage];
        if (!trial) return;
        if (gameState.data.level < trial.level) return gameModal.alert(`等级未达标！需达到 Lv.${trial.level}`, '转职试炼等级限制');
        if ((gameState.data.prestige || 0) < trial.fameReq) return gameModal.alert(`声望未达标！需竞技场/战场声望达到 ${trial.fameReq} 点（当前: ${gameState.data.prestige || 0}）`, '转职试炼声望限制');

        this.onOpenBattle({
          enemyData: { name: `【转职镇守】${trial.bossName}`, icon: trial.icon },
          enemyStats: { hp: trial.bossStats.hp, atk: trial.bossStats.atk, def: trial.bossStats.def, speed: 18 },
          onFinish: (victory) => {
            if (victory) {
              const result = gameState.completeRoyalTrial(curStage);
              if (!result.success) return;
              const newTitle = result.title;

              gameModal.alert(`转职册封大捷！你成功战胜 ${trial.bossName}，荣获【${trial.title}】之封号，成功转职晋阶为【${newTitle}】！勇者属性大幅提升！`, '转职册封大捷');
              gameState.notify();
              this.render();
            }
          }
        });
      });
    }

    // 挑战巨龙
    this.container.querySelectorAll('.btn-fight-dragon').forEach(btn => {
      btn.addEventListener('click', () => {
        const dId = btn.getAttribute('data-dragon-id');
        const entered = gameState.startDragonChallenge(dId);
        if (!entered.success) return gameModal.alert(entered.msg, '屠龙讨伐');
        const { dragon, challengeId } = entered;
        this.onOpenBattle({
          enemyData: { name: `【远古巨龙】${dragon.name}`, icon: getVectorIcon(dragon.icon, 'w-full h-full'), level: dragon.minLevel, abilities: dragon.abilities },
          enemyStats: { hp: dragon.hp, maxHp: dragon.hp, mp: dragon.mp, maxMp: dragon.mp, atk: dragon.atk, def: dragon.def, speed: 20 },
          onFinish: (victory) => {
            const result = gameState.settleDragonChallenge(dId, challengeId, victory);
            if (!result.success) return;
            if (result.victory) {
              gameModal.alert(`讨伐${dragon.name}大捷！获得经验 +${result.exp}、金币 +${result.gold}、魔晶 +${result.crystal}、声望 +${result.prestige}；${result.drops.map(item => `${item.name} x${item.count || 1}`).join('、')}已存入行囊。\n\n${result.story}`, result.firstClear ? '屠龙大捷 · 新的线索' : '屠龙大捷');
            } else {
              gameModal.alert('讨伐未果，已使用的挑战次数不返还。', '屠龙历练');
            }
            this.render();
          }
        });
      });
    });

    // 垂钓
    const btnFishNorm = document.getElementById('btn-fish-normal');
    if (btnFishNorm) {
      btnFishNorm.addEventListener('click', () => {
        const res = gameState.fish(false);
        gameModal.alert(res.msg, '碧波水域垂钓');
        this.render();
      });
    }
    const btnFishLux = document.getElementById('btn-fish-luxury');
    if (btnFishLux) {
      btnFishLux.addEventListener('click', () => {
        const res = gameState.fish(true);
        gameModal.alert(res.msg, '碧波水域垂钓');
        this.render();
      });
    }
    // 鱼市兑换
    this.container.querySelectorAll('[data-fish-exchange]').forEach(btn => {
      btn.addEventListener('click', () => {
        const kind = btn.getAttribute('data-fish-exchange');
        const qty = parseInt(btn.getAttribute('data-fish-qty') || '1', 10) || 1;
        const res = gameState.exchangeFish(kind, qty);
        if (res.success) sound.playCoin(); else sound.playBlock();
        this.render();
        gameModal.alert(res.msg, '鱼市兑换');
      });
    });

    // 皇家兽栏：分页
    const stablePrev = this.container.querySelector('#stable-prev');
    if (stablePrev) stablePrev.addEventListener('click', () => { this.stablePage = Math.max(0, (this.stablePage || 0) - 1); this.render(); });
    const stableNext = this.container.querySelector('#stable-next');
    if (stableNext) stableNext.addEventListener('click', () => { this.stablePage = (this.stablePage || 0) + 1; this.render(); });
    // 皇家兽栏：食品喂养
    this.container.querySelectorAll('[data-stable-feed]').forEach(btn => {      btn.addEventListener('click', () => {
        const petId = btn.getAttribute('data-stable-feed');
        const foodId = btn.getAttribute('data-food-id');
        const res = gameState.feedPet(petId, foodId);
        if (res.success) sound.playCoin(); else sound.playBlock();
        this.render();
        gameModal.alert(res.msg, '皇家兽栏');
      });
    });
    // 皇家兽栏：金币喂养（最多恢复到 60）
    this.container.querySelectorAll('[data-stable-gold]').forEach(btn => {
      btn.addEventListener('click', () => {
        const petId = btn.getAttribute('data-stable-gold');
        const res = gameState.feedPetWithGold(petId, 60);
        if (res.success) sound.playCoin(); else sound.playBlock();
        this.render();
        gameModal.alert(res.msg, '皇家兽栏');
      });
    });

    // 套装熔炼：选择 / 取消材料
    this.container.querySelectorAll('[data-smelt-uid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-smelt-uid');
        const current = this.smeltSelection || [];
        if (current.includes(uid)) this.smeltSelection = current.filter(item => item !== uid);
        else if (current.length < 4) this.smeltSelection = [...current, uid];
        this.render();
      });
    });
    // 套装熔炼：候选部件翻页
    const eligPrev = this.container.querySelector('#smelt-elig-prev');
    if (eligPrev) eligPrev.addEventListener('click', () => { this.smeltEligiblePage = Math.max(0, (this.smeltEligiblePage || 0) - 1); this.render(); });
    const eligNext = this.container.querySelector('#smelt-elig-next');
    if (eligNext) eligNext.addEventListener('click', () => { this.smeltEligiblePage = (this.smeltEligiblePage || 0) + 1; this.render(); });
    // 套装熔炼：目标部位切换
    const smeltTarget = this.container.querySelector('#smelt-target-slot');
    if (smeltTarget) {
      smeltTarget.addEventListener('change', () => {
        this.smeltTargetSlot = smeltTarget.value;
        this.render();
        this.container.querySelector('#smelt-target-slot')?.focus({ preventScroll: true });
      });
    }
    // 套装熔炼：确认熔炼
    const btnSmeltSet = this.container.querySelector('#btn-do-smelt-set');
    if (btnSmeltSet) {
      btnSmeltSet.addEventListener('click', () => {
        const uids = [...(this.smeltSelection || [])];
        const target = this.smeltTargetSlot;
        if (uids.length !== 4) return gameModal.alert('请先选择 4 件同套装、同品质的套装部件。', '套装熔炼');
        gameModal.confirm('确定消耗 4 件套装部件与 1 颗对应品质晶石，熔炼出指定部位部件？', () => {
          const res = gameState.smeltSetPieces(uids, target);
          if (res.success) {
            sound.playFanfare();
            this.smeltSelection = [];
          } else {
            sound.playBlock();
          }
          this.render();
          gameModal.alert(res.msg, '套装熔炼');
        }, () => {}, '套装熔炼');
      });
    }

    // 选装备槽位 (铁匠铺宝石工坊)
    this.container.querySelectorAll('.btn-select-socket-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-socket-slot');
        this.selectedEquipSlot = slotKey;
        this.render();
        this.container.querySelector(`[data-socket-slot="${slotKey}"]`)?.focus();
      });
    });

    // 镶嵌材料翻页
    const socketGemPrev = this.container.querySelector('#socket-gem-prev');
    if (socketGemPrev) socketGemPrev.addEventListener('click', () => { this.socketGemPage = Math.max(0, (this.socketGemPage || 0) - 1); this.render(); });
    const socketGemNext = this.container.querySelector('#socket-gem-next');
    if (socketGemNext) socketGemNext.addEventListener('click', () => { this.socketGemPage = (this.socketGemPage || 0) + 1; this.render(); });
    // 选背包宝石
    this.container.querySelectorAll('.btn-select-bag-gem').forEach(btn => {
      btn.addEventListener('click', () => {
        const gemUid = btn.getAttribute('data-gem-uid');
        this.selectedGemUid = gemUid;
        this.render();
        [...this.container.querySelectorAll('[data-gem-uid]')].find(button => button.dataset.gemUid === gemUid)?.focus();
      });
    });

    // 执行打孔
    const btnPunch = document.getElementById('btn-punch-socket');
    if (btnPunch) {
      btnPunch.addEventListener('click', () => {
        const res = gameState.punchSocket(this.selectedEquipSlot);
        if (res.success) {
          sound.playFanfare();
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '宝石工坊打孔');
        this.render();
      });
    }

    // 执行镶嵌 (达成主线10)
    this.container.querySelectorAll('.btn-inlay-gem').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.selectedGemUid) {
          gameModal.alert('请先在左侧【行囊宝石与符文】中选择材料！', '镶嵌提示');
          return;
        }
        const slotKey = btn.getAttribute('data-slot');
        const socketIdx = parseInt(btn.getAttribute('data-socket-idx'), 10);
        const res = gameState.inlayGem(slotKey, socketIdx, this.selectedGemUid);
        if (res.success) {
          sound.playFanfare();
          this.selectedGemUid = null;
          if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_10') {
            gameModal.confirm(
              `镶嵌大成！${res.msg}\n\n【主线任务达成】天外奇珍 · 宝石镶嵌！\n赏赐：经验 +15000，金币 +30000，魔晶 +100，【碎裂金刚钻】x2！\n\n是否立即领受犒赏并开启下一阶段主线【巨龙之威 · 首猎焰龙】？`,
              () => {
                gameState.claimQuestReward('quest_10');
                gameModal.alert('犒赏已存入行囊！已为你开启下一阶段主线【巨龙之威 · 首猎焰龙】，前往远古屠龙圣殿讨伐远古赤焰狂龙吧！', '主线推进', () => {
                  this.currentView = 'dragons';
                  this.render();
                });
              },
              () => this.render(),
              '主线大捷 · 宝石镶嵌'
            );
            return;
          }
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '宝石工坊镶嵌');
        this.render();
      });
    });

    // 无损摘除宝石
    this.container.querySelectorAll('.btn-remove-gem').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-slot');
        const socketIdx = parseInt(btn.getAttribute('data-socket-idx'), 10);
        const res = gameState.removeGem(slotKey, socketIdx);
        if (res.success) {
          sound.playCoin();
        }
        gameModal.alert(res.msg, '宝石工坊摘除');
        this.render();
      });
    });

    // 选装备槽位 (神兵重铸)
    this.container.querySelectorAll('.btn-select-reforge-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotKey = btn.getAttribute('data-reforge-slot');
        this.selectedEquipSlot = slotKey;
        this.render();
        this.container.querySelector(`[data-reforge-slot="${slotKey}"]`)?.focus();
      });
    });

    // 选重铸晶石类型
    this.container.querySelectorAll('.btn-select-reforge-crystal').forEach(btn => {
      btn.addEventListener('click', () => {
        const crystalId = btn.getAttribute('data-use-crystal');
        this.selectedReforgeCrystal = crystalId;
        this.render();
        this.container.querySelector(`[data-use-crystal="${crystalId}"]`)?.focus();
      });
    });

    const pendingItem = gameState.data.equipped[this.selectedEquipSlot];
    const pendingRoll = pendingItem?.pendingReforge?.rollId;
    this.container.querySelectorAll('.btn-resolve-reforge').forEach(btn => {
      btn.onclick = () => {
        const result = gameState.resolveEquipmentReforge(pendingItem?.uid, pendingRoll, btn.dataset.accept === 'true');
        gameModal.alert(result.msg, '重铸选择');
        this.render();
      };
    });

    // 执行神兵重铸 (达成主线16)
    const btnReforge = document.getElementById('btn-do-reforge');
    if (btnReforge) {
      btnReforge.addEventListener('click', () => {
        const crystalToUse = this.selectedReforgeCrystal || 'crystal_darkgold';
        const res = gameState.reforgeEquipment(this.selectedEquipSlot, crystalToUse, gameState.data.onboardingVersion === 2);
        if (res.success) {
          sound.playFanfare();
          if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_16') {
            gameModal.confirm(
              `重铸大成！${res.msg}\n\n【主线任务达成】传奇附魔 · 神兵重铸！\n赏赐：经验 +40000，金币 +80000，魔晶 +500，【暗金晶石】x3！\n\n是否立即领受犒赏并开启下一篇章【密林梦魇 · 斩杀狼王】？`,
              () => {
                gameState.claimQuestReward('quest_16');
                gameModal.alert('犒赏已发放！新主线【密林梦魇 · 斩杀狼王】已开启，前往野外征战微光森林诛灭驻地领主暗夜狼王吧！', '主线推进', () => {
                  if (window.switchMainTab) window.switchMainTab('wild');
                });
              },
              () => this.render(),
              '主线大捷 · 神兵重铸'
            );
            return;
          } else {
            gameModal.alert(res.msg, '神兵重铸大成');
          }
        } else {
          sound.playBlock();
          gameModal.alert(res.msg, '重铸提示');
        }
        this.render();
      });
    }

    // 角斗场子标签切换
    const btnTabDuel = document.getElementById('btn-arena-subtab-duel');
    if (btnTabDuel) {
      btnTabDuel.addEventListener('click', () => {
        this.arenaSubTab = 'duel';
        this.render();
      });
    }
    const btnTabShop = document.getElementById('btn-arena-subtab-shop');
    if (btnTabShop) {
      btnTabShop.addEventListener('click', () => {
        this.arenaSubTab = 'shop';
        this.render();
      });
    }

    // 挑战天梯角斗对手 (达成主线14)
    this.container.querySelectorAll('.btn-challenge-arena-opp').forEach(btn => {
      btn.addEventListener('click', () => {
        const oppId = btn.getAttribute('data-opp-id');
        const entered = gameState.startArenaChallenge(oppId);
        if (!entered.success) return gameModal.alert(entered.msg, '角斗挑战');
        const { opponent: opp, challengeId } = entered;

        this.onOpenBattle({
          enemyData: { name: `【天梯对手】${opp.name}`, icon: getVectorIcon(opp.avatar, 'w-full h-full'), level: opp.level, isPvp: true },
          enemyStats: { hp: opp.hp, atk: opp.atk, def: opp.def, speed: opp.speed, crit: opp.crit },
          onFinish: (victory) => {
            const res = gameState.settleArenaChallenge(oppId, challengeId, victory);
            if (!res.success) return;
            if (victory) {
              sound.playFanfare();
              if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_14') {
                gameModal.confirm(
                  `天梯大捷！战胜【${opp.name}】！天梯积分升至 ${res.points} 点（荣膺【${res.rank}】），获得声望 +${res.prestigeReward}、金币 +${res.goldReward}！\n\n【主线任务达成】天梯角逐 · 威震竞技！\n赏赐：经验 +35000，金币 +70000，魔晶 +400，【远古神兽契约蛋】！\n\n是否立即领受犒赏并开启下一阶段主线【魔塔破界 · 决战飞龙】？`,
                  () => {
                    gameState.claimQuestReward('quest_14');
                    gameModal.alert('犒赏已存入行囊！已为你开启终章主线【魔塔破界 · 决战飞龙】，挺进魔塔第 20 层直面关底恶龙吧！', '主线推进', () => {
                      if (window.switchMainTab) window.switchMainTab('tower');
                    });
                  },
                  () => this.render(),
                  '主线大捷 · 天梯争霸'
                );
              } else {
                gameModal.alert(`天梯大捷！战胜【${opp.name}】！天梯积分升至 ${res.points} 点（荣膺【${res.rank}】），获得声望 +${res.prestigeReward}、金币 +${res.goldReward}！`, '角斗胜利');
              }
            } else {
              sound.playBlock();
              gameModal.alert(`惜败于【${opp.name}】！胜败乃兵家常事，积分变化 ${res.pointsDelta}，获得安慰声望 +${res.prestigeReward}、金币 +${res.goldReward}！`, '角斗受挫');
            }
            this.render();
          }
        });
      });
    });

    // 声望商行兑换
    this.container.querySelectorAll('.btn-buy-prestige-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const shopId = btn.getAttribute('data-shop-id');
        const res = gameState.buyPrestigeItem(shopId);
        if (res.success) {
          sound.playCoin();
        } else {
          sound.playBlock();
        }
        gameModal.alert(res.msg, '声望军需商行');
        this.render();
      });
    });

    // ==========================================
    // 皇家酒馆事件交互
    // ==========================================
    // 讨伐悬赏凶魔
    this.container.querySelectorAll('.btn-fight-bounty').forEach(btn => {
      btn.addEventListener('click', () => {
        const bId = btn.getAttribute('data-bounty-id');
        const bounty = TAVERN_BOUNTIES.find(b => b.id === bId);
        if (!bounty) return;
        if (gameState.data.level < bounty.reqLevel) {
          return gameModal.alert(`勇者等级不足！该悬赏凶魔残暴异常，需达到 Lv.${bounty.reqLevel} 方可接战！`, '悬赏等级限制');
        }

        this.onOpenBattle({
          enemyData: { name: `【悬赏凶魔】${bounty.targetName}`, icon: bounty.avatar },
          enemyStats: { hp: bounty.stats.hp, atk: bounty.stats.atk, def: bounty.stats.def, speed: bounty.stats.speed, crit: bounty.stats.crit, dodge: bounty.stats.dodge },
          onFinish: (victory) => {
            if (victory) {
              gameState.completeBountyBattle(bId);
              sound.playFanfare();
              gameModal.alert(`悬赏讨伐告捷！你已成功斩杀【${bounty.targetName}】！速回王都酒馆悬赏木榜交验首级，领受丰厚赏金！`, '讨伐大捷');
              this.render();
            } else {
              sound.playBlock();
              gameModal.alert(`讨伐受挫！【${bounty.targetName}】凶威滔天，整顿装备与神兽后再行挑战吧！`, '讨伐未成');
            }
          }
        });
      });
    });

    // 揭榜接取悬赏
    this.container.querySelectorAll('.btn-accept-bounty').forEach(btn => {
      btn.addEventListener('click', () => {
        const bId = btn.getAttribute('data-bounty-id');
        const res = gameState.acceptBounty(bId);
        if (res.success) {
          sound.playCoin();
          this.render();
        } else {
          gameModal.alert(res.msg, '接取悬赏提示');
        }
      });
    });

    // 领受悬赏赏金
    this.container.querySelectorAll('.btn-claim-bounty').forEach(btn => {
      btn.addEventListener('click', () => {
        const bId = btn.getAttribute('data-bounty-id');
        const res = gameState.claimBountyReward(bId);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '领受赏金大捷');
          this.render();
        } else {
          gameModal.alert(res.msg, '领赏提示');
        }
      });
    });

    // 吧台点麦酒
    this.container.querySelectorAll('.btn-order-drink').forEach(btn => {
      btn.addEventListener('click', () => {
        const dId = btn.getAttribute('data-drink-id');
        const res = gameState.orderTavernDrink(dId);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '特调酒力通达');
          this.render();
        } else {
          gameModal.alert(res.msg, '点酒提示');
        }
      });
    });

    // 佣兵随行誓约切换
    this.container.querySelectorAll('.btn-tavern-hire-merc').forEach(btn => {
      btn.addEventListener('click', () => {
        const mId = btn.getAttribute('data-merc-id');
        const merc = MERCENARIES.find(m => m.id === mId);
        const hired = gameState.hireMercenary(mId);
        if (!hired.success) return gameModal.alert(hired.msg, '佣兵誓约');
        sound.playCoin();
        gameState.addSystemLog(`【皇家酒馆】与传奇佣兵【${merc?.name}】立下随行誓约！随行光环【${merc?.aura}】生效！`, 'estate');
        gameModal.alert(`随行誓约达成！传奇战友【${merc?.name}】（${merc?.role}）已列入先锋战阵，为你提供【${merc?.aura}】绝强庇护！`, '佣兵誓约');
        this.render();
      });
    });

    // 保存配方预览，不改变存档；固定动作只负责把下一枚符文写入首个空孔。
    this.container.querySelectorAll('button[data-runic-word]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wordId = btn.getAttribute('data-runic-word');
        if (!RUNIC_WORDS.some(word => word.id === wordId)) return;
        this.selectedRunicWord = wordId;
        this.render();
        this.container.querySelector(`button[data-runic-word="${wordId}"]`)?.focus();
      });
    });

    const materials = this.container.querySelector('details.runic-materials');
    materials?.addEventListener('toggle', () => {
      if (materials.isConnected) this.runicMaterialsOpen = materials.open;
    });

    // A rendered action belongs to this equipment, recipe and first empty socket.
    this.container.querySelectorAll('.btn-inscribe-rune').forEach(btn => {
      const slot = btn.getAttribute('data-inscribe-slot');
      const expectedItem = gameState.data.equipped[slot];
      const expectedWord = this.selectedRunicWord;
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const rUid = btn.getAttribute('data-inscribe-rune-id');
        const quote = this.getRuneInscriptionQuote(slot);
        if (quote.item !== expectedItem || Number(btn.dataset.inscribeSocket) !== quote.index) {
          this.render();
          return gameModal.alert('装备或孔位已变化，请重新选择后铭刻。', '铭刻提示');
        }
        const guided = btn.id === 'btn-inscribe-next-rune';
        const reason = guided ? quote.reason : quote.manualReason;
        if (reason || (guided && (expectedWord !== this.selectedRunicWord || rUid !== (quote.rune?.uid || quote.rune?.id)))) {
          this.render();
          return gameModal.alert(reason || '配方或符文材料已变化，请重新选择。', '铭刻提示');
        }
        const res = gameState.inlayGem(slot, quote.index, rUid);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '远古神铸铭刻');
          this.render();
        } else {
          gameModal.alert(res.msg, '铭刻提示');
        }
      });
    });

    // 符文摘除
    this.container.querySelectorAll('.btn-remove-rune').forEach(btn => {
      const slot = btn.getAttribute('data-remove-socket-slot');
      const idx = parseInt(btn.getAttribute('data-remove-socket-idx'), 10);
      const expectedItem = gameState.data.equipped[slot];
      const expectedGem = expectedItem?.gems?.[idx];
      btn.addEventListener('click', () => {
        if (gameState.data.equipped[slot] !== expectedItem || expectedItem?.gems?.[idx] !== expectedGem) {
          this.render();
          return gameModal.alert('装备或孔内材料已变化，请重新选择。', '摘除提示');
        }
        const res = gameState.removeGem(slot, idx);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '符文石收回');
          this.render();
        } else {
          gameModal.alert(res.msg, '摘除提示');
        }
      });
    });

    // 阵营要塞出征攻城
    this.container.querySelectorAll('.btn-challenge-stronghold').forEach(btn => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-stronghold-id');
        const stronghold = STRONGHOLDS.find(s => s.id === sId);
        if (!stronghold) return;
        if (gameState.data.level < stronghold.reqLevel) {
          return gameModal.alert(`勇者等级不足！该要塞驻军凶悍，需达到 Lv.${stronghold.reqLevel} 方可进军攻城！`, '攻城等级限制');
        }

        this.onOpenBattle({
          enemyData: { name: stronghold.defender.name, icon: 'boss_darkangel' },
          enemyStats: { hp: stronghold.defender.hp, atk: stronghold.defender.atk, def: stronghold.defender.def, speed: stronghold.defender.speed, crit: stronghold.defender.crit, dodge: stronghold.defender.dodge },
          onFinish: (victory) => {
            if (victory) {
              const res = gameState.completeStrongholdVictory(sId);
              sound.playFanfare();
              gameModal.alert(`攻城大捷！你已成功攻克【${stronghold.name}】！夺取帝国军勋 +${res.merit}，缴获军饷 +${res.gold} 金币！${res.promoted ? " 阵营军衔荣升为【" + res.promoted.name + "】！" : ""}`, '要塞攻克');
              this.render();
            } else {
              sound.playBlock();
              gameModal.alert('攻城受挫！敌方驻守统领顽强死守，整顿兵马战阵后再行出击吧！', '战术撤退');
            }
          }
        });
      });
    });

    // 领受每日军饷
    const btnClaimSalary = this.container.querySelector('#btn-claim-faction-salary');
    if (btnClaimSalary) {
      btnClaimSalary.addEventListener('click', () => {
        const res = gameState.claimFactionSalary();
        if (res.success) {
          sound.playCoin();
          gameModal.alert(`领受大捷！已发放【${res.rankName}】每日军饷：${res.salary} 金币入国库！`, '军饷领受');
          this.render();
        } else {
          gameModal.alert(res.msg, '军饷提示');
        }
      });
    }

    // 军需官兑换
    this.container.querySelectorAll('.btn-exchange-faction-reward').forEach(btn => {
      btn.addEventListener('click', () => {
        const rId = btn.getAttribute('data-reward-id');
        const res = gameState.exchangeFactionReward(rId);
        if (res.success) {
          sound.playCoin();
          gameModal.alert(res.msg, '军勋兑换大捷');
          this.render();
        } else {
          gameModal.alert(res.msg, '兑换提示');
        }
      });
    });

  }

  // ==========================================
  // 5.5 【远古神铸 · 符文之语工坊】(Smithy Runes Sub-page)
  // ==========================================
  getRuneInscriptionQuote(slot = this.selectedEquipSlot) {
    const data = gameState.data;
    const item = data.equipped[slot];
    const word = RUNIC_WORDS.find(entry => entry.id === this.selectedRunicWord);
    const gems = item?.gems || [];
    const sockets = item?.sockets || 0;
    const index = Array.from({ length: sockets }, (_, i) => i).find(i => !gems[i]) ?? sockets;
    const rune = word && data.bag.find(entry => entry.id === word.runes[index] && (entry.count ?? 1) > 0);
    const manualReason = !item ? '当前部位未穿戴装备，请先穿戴。'
      : !sockets ? '装备尚无孔位，请先开孔。'
      : index >= sockets ? '孔位已满，请先摘除材料。'
      : data.gold < 500 ? `金币不足，还缺 ${500 - data.gold} 金币。` : '';
    let reason = '', label = '';
    const block = (text, button) => { reason = text; label = button; };
    // Keep physical indices: a gap must never hide a wrong rune after it.
    const extra = word && gems.findIndex((gem, i) => gem && i >= word.runes.length);
    const mismatch = word && gems.findIndex((gem, i) => gem && i < word.runes.length && (!gem.isRune || gem.id !== word.runes[i]));
    if (!item) block(manualReason, '请先穿戴装备');
    else if (!word) block('选择左侧配方，查看孔序与材料库存。', '请先选择配方');
    else if (!word.validSlots.includes(slot)) block('当前装备部位不适用，请选择配方列出的部位。', '装备部位不适用');
    else if (extra >= 0) block(`第 ${extra + 1} 孔有额外材料，请先摘除。`, '请先摘除额外材料');
    else if (mismatch >= 0) block(`第 ${mismatch + 1} 孔顺序不符，应为【${RUNES[word.runes[mismatch]].name}】，请先摘除该孔材料。`, '请先调整符文顺序');
    else if (sockets < word.runes.length) block(`配方需要 ${word.runes.length} 孔，当前 ${sockets} 孔；请先前往宝石工坊开孔。`, '孔位不足，需先开孔');
    else if (word.runes.every((id, i) => gems[i]?.isRune && gems[i].id === id)) block('配方已完整匹配，无需继续铭刻。', '配方已完成');
    else if (manualReason) block(manualReason, '金币不足');
    else if (!rune) block(`缺少【${RUNES[word.runes[index]].name}】，可前往边境军需兑换。`, '缺少所需符文');
    else label = `铭刻下一枚 · 第 ${index + 1} 孔`;
    return { item, word, gems, sockets, index, rune, reason, label, manualReason };
  }

  renderSmithyRunes() {
    const data = gameState.data;
    const { item, word, gems, sockets, index, rune, reason, label, manualReason } = this.getRuneInscriptionQuote();
    const storedWord = RUNIC_WORDS.find(entry => entry.id === item?.runicWord);
    const active = Boolean(storedWord && item.durability !== 0);
    const shortName = entry => entry.name.replace('【符文之语】', '').replace(/\s*\([^)]*\)/g, '').trim();
    const bagRunes = data.bag.filter(entry => (entry.type === 'rune' || RUNES[entry.id]) && (entry.count ?? 1) > 0);
    const runeMatPerPage = 6;
    const runeMatPages = Math.max(1, Math.ceil(bagRunes.length / runeMatPerPage));
    const runeMatPage = Math.min(Math.max(0, this.runeMatPage || 0), runeMatPages - 1);
    this.runeMatPage = runeMatPage;
    const runeMatStart = runeMatPage * runeMatPerPage;
    const stock = id => bagRunes.filter(entry => entry.id === id).reduce((sum, entry) => sum + (entry.count ?? 1), 0);
    const slotNames = entry => entry.validSlots.map(slot => SLOT_MAP[slot]?.name || slot).join('、');
    const status = storedWord
      ? `${shortName(storedWord)} · ${active ? '符文共鸣已生效' : '装备损坏，共鸣未生效；修理后恢复。'}`
      : item?.durability === 0 ? `装备损坏，属性未生效。${reason || '可铭刻，修理后恢复属性。'}`
      : reason || `配方尚未完成，下一枚：${rune.name}。`;
    const targetAttributes = `data-inscribe-slot="${this.selectedEquipSlot}" data-inscribe-socket="${index}" data-equipment-uid="${escapeText(item?.uid || '')}"`;
    return `
      <div class="smithy-page smithy-page-runes w-full h-full p-1.5 sm:p-2 flex flex-col select-none">
        <div class="mota-breadcrumb px-3 py-1.5 flex items-center justify-between mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs"><span>皇家铁匠铺</span><span>→</span><strong>符文之语铭刻工坊</strong></div>
          <button type="button" data-goto="smithy" class="btn-goto-subview mota-btn-dark px-3 py-1 text-xs">返回铁匠铺</button>
        </div>
        <div class="smithy-layout flex-1 min-h-0 grid gap-3">
          <div class="smithy-rune-inventory">
            ${this.renderSmithySlots('选择装备部位', 'socket')}
            <section class="smithy-material-panel mota-parchment-panel runic-catalog">
              <h3 class="smithy-heading text-xs font-bold">符文圣典 · 7 种配方</h3>
              <div class="smithy-rune-recipes smithy-scroll">${RUNIC_WORDS.map(entry => `
                <button type="button" data-runic-word="${entry.id}" aria-pressed="${word?.id === entry.id}" class="runic-recipe-choice">
                  <strong>${escapeText(shortName(entry))}</strong>
                  <span>${slotNames(entry)}</span>
                </button>`).join('')}
              </div>
              <button type="button" data-goto="faction_war" class="btn-goto-subview mota-btn-dark runic-source-link">获取符文 · 边境军需</button>
            </section>
          </div>
          <section class="smithy-detail mota-parchment-panel flex flex-col min-h-0">
            <div class="smithy-heading flex items-center gap-2">
              <span class="smithy-item-icon w-8 h-8 p-1 flex-shrink-0">${renderGameIcon(item || this.selectedEquipSlot, { size: 'w-full h-full' })}</span>
              <div class="min-w-0"><h3 class="text-sm font-bold">${escapeText(item?.name || `${SLOT_MAP[this.selectedEquipSlot]?.name}未穿戴装备`)}</h3>
                <p class="text-xs">${item ? `+${item.stars || 0} 星 · ${sockets} 孔 · 耐久 ${item.durability ?? 100}/${item.maxDurability ?? 100}` : '先从行囊穿戴，再进行铭刻。'}</p></div>
            </div>
            <p class="runic-status smithy-rune-state" data-active="${active}" role="status">${escapeText(status)}</p>
            <div class="smithy-scroll runic-detail-scroll flex-1 min-h-0 overflow-y-auto">
              <div class="runic-recipe-detail">
                ${word ? `<h4>${escapeText(word.name)}</h4><p class="runic-recipe-slots">适用：${slotNames(word)}</p>
                  <ol class="runic-recipe-order">${word.runes.map((id, i) => `<li>第 ${i + 1} 孔 · ${escapeText(RUNES[id].name)} <span>行囊 ${stock(id)} 枚${gems[i]?.isRune && gems[i].id === id ? ' · 已铭刻' : ''}</span></li>`).join('')}</ol>
                  <p>${escapeText(word.desc)}</p>` : '<p>选择左侧配方，查看每孔顺序、效果与行囊库存。</p>'}
              </div>
              <h4 class="smithy-section-label">装备孔位 <span>· 摘除免费，需行囊可容纳</span></h4>
              <div class="smithy-socket-grid smithy-rune-sockets">${Array.from({ length: sockets }, (_, i) => {
                const gem = gems[i];
                return `<div class="smithy-socket-cell runic-socket-cell" data-runic-socket="${i}" data-socket-state="${gem ? 'filled' : 'empty'}">
                  <div class="smithy-socket-description"><span class="smithy-item-icon w-8 h-8 p-1 flex-shrink-0">${gem ? renderGameIcon(gem, { size: 'w-full h-full' }) : `<span class="smithy-socket-number">${i + 1}</span>`}</span>
                    <div class="min-w-0"><strong>第 ${i + 1} 孔 · ${gem ? escapeText(gem.name) : i === index ? '下一空孔' : '空孔'}</strong>
                    <span class="smithy-socket-bonus">${gem ? escapeText(socketBonuses(gem)) : '可保留空孔'}</span></div></div>
                  ${gem ? `<button type="button" data-remove-socket-slot="${this.selectedEquipSlot}" data-remove-socket-idx="${i}" class="btn-remove-rune mota-btn-dark">无损摘除</button>` : ''}
                </div>`;
              }).join('')}</div>
              ${item && sockets < (word?.runes.length || 1) ? '<button type="button" data-goto="smithy_socket" class="btn-goto-subview mota-btn-dark runic-source-link">前往宝石工坊开孔</button>' : ''}
              <details class="runic-materials smithy-affix-catalog" ${this.runicMaterialsOpen ? 'open' : ''}>
                <summary class="smithy-section-label">手动铭刻 · 行囊符文 ${bagRunes.length} 组${runeMatPages > 1 ? ` <span class="inline-flex items-center gap-1 font-normal"><button type="button" id="rune-mat-prev" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="上一页符文" ${runeMatPage <= 0 ? 'disabled' : ''}>‹</button><span>${runeMatPage + 1}/${runeMatPages}</span><button type="button" id="rune-mat-next" class="mota-btn-dark px-1 rounded text-[10px]" aria-label="下一页符文" ${runeMatPage >= runeMatPages - 1 ? 'disabled' : ''}>›</button></span>` : ''}</summary>
                <p class="smithy-rule-note text-xs">每次填入最靠前的空孔。额外符文会中断已完成的共鸣。</p>
                <div class="smithy-gem-grid">${bagRunes.map((entry, ri) => `
                  <button type="button" ${targetAttributes} data-inscribe-rune-id="${escapeText(entry.uid || entry.id)}" class="btn-inscribe-rune smithy-gem-button ${ri < runeMatStart || ri >= runeMatStart + runeMatPerPage ? 'rune-mat-hidden' : ''}" ${manualReason ? 'disabled' : ''}>
                    <span class="min-w-0"><strong>${escapeText(entry.name)}</strong><span class="smithy-gem-bonus">${escapeText(socketBonuses(entry))}</span></span><b class="smithy-gem-count">×${entry.count ?? 1}</b>
                  </button>`).join('') || '<p>暂无符文，可在边境军需兑换。</p>'}</div>
              </details>
              <p class="smithy-rule-note runic-rule">共鸣从第 1 孔按配方校验；允许尾部空孔，中间空洞、普通宝石或额外符文会中断共鸣。</p>
            </div>
            <div class="smithy-action-bar runic-action-bar">
              <p class="smithy-quote text-xs">每次 500 金币 + 1 枚符文 · 持有 ${data.gold.toLocaleString()} 金币</p>
              <p id="runic-action-reason" class="smithy-rune-target">${escapeText(reason || `第 ${index + 1} 孔：${rune.name}`)}</p>
              <div class="runic-actions">
                <button type="button" id="btn-inscribe-next-rune" ${targetAttributes} data-inscribe-rune-id="${escapeText(rune?.uid || rune?.id || '')}" aria-describedby="runic-action-reason" class="btn-inscribe-rune mota-btn-gold" ${reason ? 'disabled' : ''}>${label}</button>
                ${item?.durability === 0 ? '<button type="button" data-goto="smithy_repair" class="btn-goto-subview mota-btn-dark">前往修理室</button>' : ''}
              </div>
            </div>
          </section>
        </div>
      </div>`;
  }

  // ==========================================
  // 6. 【边境战场 · 三大阵营要塞争夺战】(Faction War Sub-page)
  // ==========================================
  renderFactionWar() {
    const data = gameState.data;
    const fw = data.factionWar || { merit: 0, militaryRank: "recruit", strongholds: {}, dailyClaimed: false };
    const curRank = MILITARY_RANKS.find(r => r.id === fw.militaryRank) || MILITARY_RANKS[0];
    const nation = NATIONS[data.nation] || NATIONS.aden;

    return `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none town-faction">
        
        <!-- 面包屑与顶部状态 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex items-center justify-between shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-400 font-bold">圣光王都</span>
            <span class="text-slate-500">-></span>
            <span class="text-indigo-300 font-bold">边境战场 · 三大城邦要塞争夺战</span>
          </div>
          <button data-goto="hub" class="btn-goto-subview mota-btn-dark px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:border-amber-400 flex items-center gap-1">
            <span>← 返回王都大街</span>
          </button>
        </div>

        <!-- 阵营与军衔统帅横幅 -->
        <div class="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/60 mb-2 flex flex-wrap items-center justify-between gap-2 shadow flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-black/60 border border-indigo-400 p-1 flex items-center justify-center flex-shrink-0">
              ${getVectorIcon(data.nation ? `nation_${data.nation}` : "nation_aden", "w-full h-full")}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-indigo-200">阵营: ${nation.name}</span>
                <span class="px-2 py-0.2 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[10px] font-bold">
                  军衔: ${curRank.name}
                </span>
              </div>
              <div class="text-[10px] text-slate-300 font-mono mt-0.5">
                军衔特质: <b class="text-amber-300">${curRank.buffDesc}</b> · 阵营天命: ${nation.buffDesc}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right font-mono text-xs">
              <div class="text-slate-400 text-[10px]">可兑换军勋</div>
              <div class="text-amber-400 font-bold text-sm">${fw.merit || 0} 点</div>
              <div class="text-slate-400 text-[10px]">累计战功: ${gameState.getTotalFactionMerit()} · 晋衔不扣战功</div>
            </div>
            <button id="btn-claim-faction-salary" class="mota-btn-gold px-3 py-1.5 rounded-lg text-xs font-bold shadow ${fw.dailyClaimed ? "opacity-40 cursor-not-allowed" : ""}">
              ${fw.dailyClaimed ? "今日军饷已领" : `领受军饷 (${curRank.dailySalary}金)`}
            </button>
          </div>
        </div>

        <!-- 主体区域：左右双架构 (左侧3大要塞沙盘 + 右侧军勋战备军需官) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5">
          
          <!-- 左侧：三大要塞战略攻防沙盘 (md:col-span-7) -->
          <div class="md:col-span-7 flex flex-col justify-between bg-black/40 border border-indigo-900/60 rounded-xl p-2.5 shadow">
            <div>
              <div class="flex items-center justify-between pb-1.5 border-b border-[#4a3520] mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="w-5 h-5 flex items-center justify-center">${getVectorIcon("bld_palace", "w-5 h-5")}</span>
                  <h3 class="font-bold text-xs text-amber-300">边境三大战略要塞要冲</h3>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">攻克敌方据点夺取帝国军勋</span>
              </div>

              <!-- 3大要塞卡片 -->
              <div class="space-y-2.5">
                ${STRONGHOLDS.map(s => {
                  const shState = fw.strongholds && fw.strongholds[s.id] ? fw.strongholds[s.id] : { captured: false };
                  const isCaptured = shState.captured;
                  const isLevelMet = data.level >= s.reqLevel;
                  return `
                    <div class="p-2.5 rounded-xl bg-black/60 border ${isCaptured ? "border-emerald-600/70 bg-emerald-950/20" : "border-slate-800 hover:border-indigo-500/50"} transition-all flex flex-col justify-between">
                      <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-lg bg-black/80 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0">
                            ${getVectorIcon(s.icon ? s.icon.replace("images/ui/", "").replace(".svg", "") : "nation_aden", "w-full h-full")}
                          </div>
                          <div>
                            <div class="flex items-center gap-1.5">
                              <span class="text-xs font-black text-amber-200">${s.name}</span>
                              <span class="text-[9px] text-indigo-300 font-mono">(${s.title})</span>
                              ${isCaptured ? '<span class="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500 text-[9px] font-bold">[已攻克]</span>' : ""}
                            </div>
                            <div class="text-[9px] text-slate-400">${s.desc}</div>
                          </div>
                        </div>
                        <span class="text-[10px] font-mono ${isLevelMet ? "text-emerald-400" : "text-rose-400"}">
                          准入: Lv.${s.reqLevel}
                        </span>
                      </div>

                      <div class="mt-2 flex items-center justify-between">
                        <div class="text-[10px] text-slate-300 font-mono">
                          驻守敌统帅: <b class="text-rose-300">${s.defender.name}</b> (HP: ${s.defender.hp.toLocaleString()})
                          <br>攻克战利品: <span class="text-amber-300">军勋 +${s.meritReward}</span> · <span class="text-amber-200">金币 +${s.goldReward.toLocaleString()}</span>
                        </div>
                        <button data-stronghold-id="${s.id}" class="btn-challenge-stronghold px-3 py-1.5 rounded-lg text-xs font-bold shadow ${isCaptured ? "mota-btn-dark border border-emerald-600/70 text-emerald-300" : (isLevelMet ? "mota-btn-gold" : "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500")} flex-shrink-0">
                          ${isCaptured ? "再度破关" : (isLevelMet ? "出征攻城 ->" : `需Lv.${s.reqLevel}`)}
                        </button>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="pt-2 border-t border-[#4a3520] text-[10px] text-slate-400 flex items-center justify-between">
              <span>每日攻占据点可稳步累计战勋，战败无任何惩罚。</span>
              <span class="text-amber-300 font-mono">军勋可随时前往军需官处兑换圣物</span>
            </div>
          </div>

          <!-- 右侧：战备军需官 · 军勋圣物兑换 (md:col-span-5) -->
          <div class="md:col-span-5 flex flex-col justify-between bg-black/40 border border-indigo-900/60 rounded-xl p-2.5 shadow">
            <div>
              <div class="flex items-center justify-between pb-1.5 border-b border-[#4a3520] mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="w-5 h-5 flex items-center justify-center">${getVectorIcon("coin_gold", "w-5 h-5")}</span>
                  <h3 class="font-bold text-xs text-amber-300">战备军需官 · 军勋兑换</h3>
                </div>
                <span class="text-[10px] text-amber-400 font-mono">结余军勋: ${fw.merit || 0}</span>
              </div>

              <!-- 兑换物品列表 -->
              <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                ${FACTION_REWARDS.map(rw => {
                  const canAfford = (fw.merit || 0) >= rw.costMerit;
                  return `
                    <div class="p-2 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition-all">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-black/80 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0">
                          ${renderGameIcon(rw, { size: "w-full h-full" })}
                        </div>
                        <div class="min-w-0">
                          <div class="text-xs font-bold text-amber-200 truncate">${rw.name}</div>
                          <div class="text-[9px] text-slate-400 truncate">${rw.desc}</div>
                          <div class="text-[10px] text-amber-400 font-mono font-bold mt-0.5">消耗军勋: ${rw.costMerit} 点</div>
                        </div>
                      </div>
                      <button data-reward-id="${rw.id}" class="btn-exchange-faction-reward px-2.5 py-1.5 rounded-lg text-xs font-bold shadow ${canAfford ? "mota-btn-gold" : "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500"} flex-shrink-0">
                        兑换
                      </button>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="pt-2 border-t border-[#4a3520] text-[10px] text-slate-400 text-center">
              军勋永不清空，随着击破要塞与日常战事稳步增长。
            </div>
          </div>

        </div>

      </div>
    `;
  }

}
