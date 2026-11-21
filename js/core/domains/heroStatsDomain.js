import { CLASSES, NATIONS, getClassSkills } from '../../config/classes.js';
import { getPetParty } from '../petParty.js';
import { PET_CONFIGS } from '../../config/pets.js';
import { PET_SKILL_BOOKS } from '../../config/petSkills.js';
import { OFFICIAL_SETS } from '../../config/items.js';
import { ROYAL_TRIALS } from '../../config/trials.js';
import { RUNES, RUNIC_WORDS, checkRunicWord } from '../../config/runes.js';
import { MILITARY_RANKS } from '../../config/factionWar.js';
import { HOLY_RELICS, getUnlockedRelics, getRelicsTotalStats } from '../../config/relics.js';

export function getEffectiveStats(data, equipped) {
  const cls = CLASSES[data.classId] || CLASSES.warrior;
  const lvl = data.level;
  const alloc = data.allocatedStats;
  const nation = NATIONS[data.nation] || NATIONS.aden;
  const intAttack = cls.primaryStat === 'int' ? 2.6 : 2;
  const dexterity = cls.dexterityScaling || { atk: 0, speed: 1.3, crit: 0.22, dodge: 0.16 };

  let hp = cls.baseStats.hp + (lvl - 1) * cls.growth.hp + alloc.con * 16;
  let mp = cls.baseStats.mp + (lvl - 1) * cls.growth.mp + alloc.int * 8;
  let atk = cls.baseStats.atk + (lvl - 1) * cls.growth.atk + alloc.str * 2.6 + alloc.int * intAttack;
  let def = cls.baseStats.def + (lvl - 1) * cls.growth.def + alloc.con * 1.5;
  let speed = cls.baseStats.speed + (lvl - 1) * cls.growth.speed + alloc.dex * dexterity.speed;

  let crit = cls.baseStats.crit + alloc.dex * dexterity.crit;
  let dodge = cls.baseStats.dodge + alloc.dex * dexterity.dodge;
  let hit = cls.baseStats.hit;
  let counter = cls.baseStats.counter;
  let lifesteal = cls.baseStats.lifesteal;
  let magicResist = cls.baseStats.magicResist;
  let critDmg = 0;
  let dmgResist = 0;
  let dmgBonus = 0;
  const activeSetCounts = {};
  for (const item of Object.values(equipped)) {
    if (item?.setId && (item.durability === undefined || item.durability > 0)) activeSetCounts[item.setId] = (activeSetCounts[item.setId] || 0) + 1;
  }
  const setBonuses = Object.entries(activeSetCounts).flatMap(([id, count]) => {
    const set = OFFICIAL_SETS[id];
    return set ? [...(count >= 2 ? [set.bonus2] : []), ...(count >= 4 ? [set.bonus4] : []), ...(count >= 7 ? [set.bonus7] : [])] : [];
  });
  const sumSet = key => setBonuses.reduce((sum, bonus) => sum + (bonus[key] || 0), 0);
  const skillLevelBonus = sumSet('allSkillLv');
  const bonusAttributes = { str: 0, int: 0, dex: 0, con: 0 };
  const applyAttributes = attributes => {
    const all = attributes.allStats || 0;
    const str = (attributes.str || 0) + all;
    const int = (attributes.int || 0) + all;
    const dex = (attributes.dex ?? attributes.agi ?? 0) + all;
    const con = (attributes.con || 0) + all;
    for (const [key, value] of Object.entries({ str, int, dex, con })) bonusAttributes[key] += value;
    atk += str * 2.6 + int * intAttack + dex * dexterity.atk;
    hp += con * 16;
    mp += int * 8;
    def += con * 1.5;
    speed += dex * dexterity.speed;
    crit += dex * dexterity.crit;
    dodge += dex * dexterity.dodge;
  };

  // 职业被动进入属性计算，光环在战斗内区分 PVE/PVP。
  const passiveEffects = getClassSkills(cls.id, skillLevelBonus, data).filter(skill => skill.category === 'passive').map(skill => skill.effect || {});
  for (const effect of passiveEffects) {
    atk += (effect.atkBonus || 0) + (effect.strBonus || 0) * 2.6 + (effect.intBonus || 0) * intAttack + (effect.dexBonus || 0) * dexterity.atk;
    hp += effect.maxHpBonus || 0;
    mp += effect.maxMpBonus || 0;
    def += effect.defBonus || 0;
    speed += (effect.speedBonus || 0) + (effect.dexBonus || 0) * dexterity.speed;
    crit += (effect.critBonus || 0) + (effect.dexBonus || 0) * dexterity.crit;
    dodge += (effect.dodgeBonus || 0) + (effect.dexBonus || 0) * dexterity.dodge;
    magicResist += effect.magicResistBonus || 0;
    critDmg += (effect.critDmgBonus || 0) * 100;
  }
  atk += alloc.dex * dexterity.atk;

  // 国家特质加成
  if (nation.buffs) {
    if (nation.buffs.atkPct) atk *= (1 + nation.buffs.atkPct);
    if (nation.buffs.defPct) def *= (1 + nation.buffs.defPct);
    if (nation.buffs.hpPct) hp *= (1 + nation.buffs.hpPct);
    if (nation.buffs.counter) counter += nation.buffs.counter;
    if (nation.buffs.dodge) dodge += nation.buffs.dodge;
    if (nation.buffs.crit) crit += nation.buffs.crit;
  }

  // 封号属性加成
  if (data.royalTrials && data.royalTrials.completedStage > 0) {
    for (const trial of ROYAL_TRIALS.slice(0, data.royalTrials.completedStage)) {
      const tBonus = trial.statsBonus;
      if (tBonus.atk) atk += tBonus.atk;
      if (tBonus.def) def += tBonus.def;
      if (tBonus.maxHp) hp += tBonus.maxHp;
      if (tBonus.speed) speed += tBonus.speed;
      if (tBonus.crit) crit += tBonus.crit;
      if (tBonus.dodge) dodge += tBonus.dodge;
      if (tBonus.counter) counter += tBonus.counter;
      dmgBonus += tBonus.dmgBonus || 0;
    }
  }

  // 装备加成 (考虑耐久度，耐久为0则不提供加成)

  Object.values(equipped).forEach(item => {
    if (!item || (item.reqClass && item.reqClass !== data.classId)) return;
    if (item.durability !== undefined && item.durability <= 0) return; // 耐久为0失效

    const enhanceMult = 1 + (item.stars || 0) * 0.12;

    if (item.stats) {
      hp += (item.stats.hp ?? item.stats.maxHp ?? 0) * enhanceMult;
      mp += (item.stats.mp ?? item.stats.maxMp ?? 0) * enhanceMult;
      if (item.stats.atk) atk += item.stats.atk * enhanceMult;
      if (item.stats.def) def += item.stats.def * enhanceMult;
      if (item.stats.speed) speed += item.stats.speed * enhanceMult;
      if (item.stats.hit) hit += item.stats.hit;
      if (item.stats.crit) crit += item.stats.crit;
      if (item.stats.dodge) dodge += item.stats.dodge;
      if (item.stats.counter) counter += item.stats.counter;
      if (item.stats.lifesteal) lifesteal += item.stats.lifesteal;
      atk += ((item.stats.str || 0) * 2.6 + (item.stats.int || 0) * intAttack +
        (item.stats.dex || 0) * dexterity.atk) * enhanceMult;
      hp += (item.stats.con || 0) * 16 * enhanceMult;
      mp += (item.stats.int || 0) * 8 * enhanceMult;
      def += (item.stats.con || 0) * 1.5 * enhanceMult;
      speed += (item.stats.dex || 0) * dexterity.speed * enhanceMult;
      crit += (item.stats.dex || 0) * dexterity.crit;
      dodge += (item.stats.dex || 0) * dexterity.dodge;
      critDmg += item.stats.critDmg || 0;
      dmgResist += item.stats.dmgResist || 0;
      magicResist += item.stats.magicResist || 0;
      for (const key of Object.keys(bonusAttributes)) bonusAttributes[key] += item.stats[key] || 0;
    }

    if (item.gems && item.gems.length) {
      item.gems.forEach(g => {
        if (!g) return;
        if (g.stat === 'atk') atk += g.val;
        if (g.stat === 'def') def += g.val;
        if (g.stat === 'maxHp') hp += g.val;
        if (g.stat === 'speed') speed += g.val;
        const rStats = g.stats || (RUNES[g.id]?.stats);
        if (rStats) {
          if (rStats.atk) atk += rStats.atk;
          if (rStats.def) def += rStats.def;
          if (rStats.hp) hp += rStats.hp;
          if (rStats.speed) speed += rStats.speed;
          if (rStats.crit) crit += rStats.crit;
          if (rStats.dodge) dodge += rStats.dodge;
          if (rStats.critDmg) critDmg += rStats.critDmg;
          if (rStats.dmgReduce) dmgResist += rStats.dmgReduce;
          if (rStats.dmgBoost) dmgBonus += rStats.dmgBoost;
          applyAttributes(rStats);
        }
      });
    }

    // 远古符文之语共鸣加成
    if (item.runicWord) {
      const rw = RUNIC_WORDS.find(r => r.id === item.runicWord);
      if (rw && rw.bonus) {
        if (rw.bonus.atk) atk += rw.bonus.atk;
        if (rw.bonus.def) def += rw.bonus.def;
        if (rw.bonus.hp) hp += rw.bonus.hp;
        if (rw.bonus.speed) speed += rw.bonus.speed;
        if (rw.bonus.crit) crit += rw.bonus.crit;
        if (rw.bonus.dodge) dodge += rw.bonus.dodge;
        if (rw.bonus.critDmg) critDmg += rw.bonus.critDmg;
        if (rw.bonus.dmgReduce) dmgResist += rw.bonus.dmgReduce;
        applyAttributes(rw.bonus);
      }
    }

    if (item.reforge) {
      if (item.reforge.stat === 'counter') counter += item.reforge.val;
      if (item.reforge.stat === 'lifesteal') lifesteal += item.reforge.val;
      if (item.reforge.stat === 'critDmg') {
        crit += item.reforge.val * 0.2;
        critDmg += item.reforge.val;
      }
      if (item.reforge.stat === 'allStats') applyAttributes({ allStats: item.reforge.val });
      if (item.reforge.stat === 'dmgResist') {
        dmgResist += item.reforge.val;
        def += item.reforge.val * 2;
      }
    }

  });

  mp += sumSet('mp');
  hit += sumSet('hit');
  dmgBonus += sumSet('dmgBonus');

  // 原著官方套装属性加成：setBonuses 已按 2/4(/未来7) 档位过滤，统一按数值键累加，
  // 避免逐 key 硬编码遗漏（如未来 7 件档的 atk/def 等会被静默丢弃）。现网数值与旧实现等价。
  atk += sumSet('atk');
  def += sumSet('def');
  hp += sumSet('hp');
  speed += sumSet('speed');
  dodge += sumSet('dodge');
  crit += sumSet('crit');
  counter += sumSet('counter');
  lifesteal += sumSet('lifesteal');
  dmgResist += sumSet('dmgResist');
  critDmg += sumSet('critDmg');

  // 出战宠物属性（原作三阈值：80+ 全额，40~79 减半，<40 无效）
  const mainPetMember = getPetParty(data)[0];
  const activePetObj = mainPetMember.pet;
  const petAttributeMultiplier = mainPetMember.attributeMultiplier || 0;
  if (activePetObj && petAttributeMultiplier > 0) {
    const pCfg = PET_CONFIGS[activePetObj.id];
    if (pCfg) {
      const aptRatio = (activePetObj.apt.str + activePetObj.apt.con) / 3000;
      atk += Math.floor(((pCfg.baseBonus.atk || 0) * aptRatio + activePetObj.level * (pCfg.growth.atk || 3)) * petAttributeMultiplier);
      hp += Math.floor(((pCfg.baseBonus.maxHp || 0) * aptRatio + activePetObj.level * 20) * petAttributeMultiplier);
      def += Math.floor((pCfg.baseBonus.def || 0) * aptRatio * petAttributeMultiplier);
      speed += Math.floor((pCfg.baseBonus.speed || 0) * petAttributeMultiplier);
      if (pCfg.baseBonus.counter) counter += pCfg.baseBonus.counter * petAttributeMultiplier;
      if (pCfg.baseBonus.dodge) dodge += pCfg.baseBonus.dodge * petAttributeMultiplier;
      if (pCfg.baseBonus.crit) crit += pCfg.baseBonus.crit * petAttributeMultiplier;
      if (pCfg.baseBonus.lifesteal) lifesteal += pCfg.baseBonus.lifesteal * petAttributeMultiplier;
      // 四维资质全部进入有效属性：智力提供魔力，敏捷提供速度/闪避/暴击。
      const intApt = activePetObj.apt.int || 0;
      const dexApt = activePetObj.apt.dex || 0;
      mp += Math.floor((intApt / 3000) * 80 * petAttributeMultiplier);
      speed += Math.floor((dexApt / 3000) * 8 * petAttributeMultiplier);
      dodge += (dexApt / 3000) * 4 * petAttributeMultiplier;
      crit += (dexApt / 3000) * 4 * petAttributeMultiplier;
    }
    const learnedBooks = Object.values(PET_SKILL_BOOKS).filter(book =>
      (activePetObj.skills || []).some(id => id === book.id || id === book.skillId));
    for (const book of learnedBooks) {
      const effect = book.effect;
      counter += (effect.counterBonus || 0) * petAttributeMultiplier;
      crit += (effect.critBonus || 0) * petAttributeMultiplier;
      lifesteal += (effect.lifestealBonus || 0) * petAttributeMultiplier;
      speed += (effect.speedBonus || 0) * petAttributeMultiplier;
      dodge += (effect.dodgeBonus || 0) * petAttributeMultiplier;
      dmgResist += (effect.dmgReduction || 0) * 100 * petAttributeMultiplier;
    }
  }

  // 皇家酒馆特调麦酒 Buff
  const drinkBuff = data.tavern?.drinkBuff;
  if (drinkBuff && drinkBuff.buff) {
    if (drinkBuff.buff.atkPct) atk *= (1 + drinkBuff.buff.atkPct);
    if (drinkBuff.buff.dodge) dodge += drinkBuff.buff.dodge;
    if (drinkBuff.buff.speed) speed += drinkBuff.buff.speed;
    if (drinkBuff.buff.crit) crit += drinkBuff.buff.crit;
  }

  // 阵营要塞军衔加成
  if (data.factionWar && data.factionWar.militaryRank) {
    const rankCfg = MILITARY_RANKS.find(r => r.id === data.factionWar.militaryRank);
    if (rankCfg && rankCfg.stats) {
      if (rankCfg.stats.hp) hp += rankCfg.stats.hp;
      if (rankCfg.stats.atk) atk += rankCfg.stats.atk;
      if (rankCfg.stats.def) def += rankCfg.stats.def;
      if (rankCfg.stats.speed) speed += rankCfg.stats.speed;
      if (rankCfg.stats.crit) crit += rankCfg.stats.crit;
      if (rankCfg.stats.dmgReduce) dmgResist += rankCfg.stats.dmgReduce;
      applyAttributes(rankCfg.stats);
    }
  }

  // 远古神圣圣遗物加成 (魔塔 50~100 层终焉成就觉醒)
  if (data.relics && Array.isArray(data.relics.unlocked) && data.relics.unlocked.length > 0) {
    const rStats = getRelicsTotalStats(data.relics.unlocked);
    if (rStats.hp) hp += rStats.hp;
    if (rStats.mp) mp += rStats.mp;
    if (rStats.atk) atk += rStats.atk;
    if (rStats.def) def += rStats.def;
    if (rStats.speed) speed += rStats.speed;
    if (rStats.crit) crit += rStats.crit;
    if (rStats.critDmg) critDmg += rStats.critDmg;
    if (rStats.dmgResist) dmgResist += rStats.dmgResist;
    applyAttributes(rStats);
  }

  // Battle potions scale the complete loadout, including earned titles and companions.
  for (const potion of data.estate.activePotions || []) {
    const effect = potion.effect || {};
    if ((potion.remainingFights ?? effect.fights ?? 0) <= 0) continue;
    hp *= effect.hpMultiplier || 1;
    def *= effect.defMultiplier || 1;
    atk *= effect.atkMultiplier || 1;
    crit += effect.critBonus || 0;
  }

  const baseStr = (cls.id === 'warrior' ? 25 : cls.id === 'hunter' ? 18 : 10) + (lvl - 1) * (cls.id === 'warrior' ? 3 : 1);
  const baseDex = (cls.id === 'hunter' ? 26 : cls.id === 'warrior' ? 15 : 16) + (lvl - 1) * (cls.id === 'hunter' ? 3 : 1);
  const baseInt = (cls.id === 'mage' ? 28 : cls.id === 'hunter' ? 12 : 10) + (lvl - 1) * (cls.id === 'mage' ? 3 : 1);
  const baseCon = (cls.id === 'warrior' ? 22 : cls.id === 'hunter' ? 18 : 16) + (lvl - 1) * 2;

  return {
    hp: Math.floor(hp),
    maxHp: Math.floor(hp),
    mp: Math.floor(mp),
    maxMp: Math.floor(mp),
    atk: Math.floor(atk),
    def: Math.floor(def),
    speed: Math.floor(speed),
    crit: Math.min(80, Math.floor(crit)),
    dodge: Math.min(60, Math.floor(dodge)),
    hit: Math.floor(hit),
    counter: Math.min(75, Math.floor(counter)),
    lifesteal: Math.floor(lifesteal),
    magicResist: Math.floor(magicResist),
    critDmg: Math.floor(critDmg),
    dmgResist: Math.min(50, Math.floor(dmgResist)),
    dmgBonus: Math.floor(dmgBonus),
    skillLevelBonus,
    doubleStrike: sumSet('doubleStrike'),
    magicDmg: sumSet('magicDmg'),
    finishDmg: sumSet('finishDmg'),
    magicAbsorb: sumSet('magicAbsorb'),
    armorBreak: sumSet('armorBreak'),
    str: Math.floor(baseStr + alloc.str + bonusAttributes.str + passiveEffects.reduce((sum, e) => sum + (e.strBonus || 0), 0)),
    dex: Math.floor(baseDex + alloc.dex + bonusAttributes.dex + passiveEffects.reduce((sum, e) => sum + (e.dexBonus || 0), 0)),
    int: Math.floor(baseInt + alloc.int + bonusAttributes.int + passiveEffects.reduce((sum, e) => sum + (e.intBonus || 0), 0)),
    con: Math.floor(baseCon + alloc.con + bonusAttributes.con),
    baseStr,
    baseDex,
    baseInt,
    baseCon
  };
}

export function getEquipmentPreview(state, itemUid) {
  const candidate = state.getEquippableItem(itemUid);
  if (!candidate.success) return candidate;
  const { item } = candidate;
  return {
    success: true,
    before: state.getEffectiveStats(),
    after: state.getEffectiveStats({ ...state.data.equipped, [item.slot]: item }),
    currentName: state.data.equipped[item.slot]?.name || '未穿戴',
    targetName: item.name
  };
}

export function updateRunicWord(data, slotKey, ownedItem) {
  const item = ownedItem || data.equipped[slotKey];
  if (!item) return null;
  if (!Array.isArray(item.gems) || item.gems.length < 2) {
    item.runicWord = null;
    item.runicWordName = null;
    return null;
  }
  const runeIds = [];
  for (let i = 0; i < item.gems.length; i++) {
    const g = item.gems[i];
    if (!g || !g.isRune) {
      item.runicWord = null;
      item.runicWordName = null;
      return null;
    }
    runeIds.push(g.id);
  }
  const matchedRw = checkRunicWord(slotKey, runeIds);
  if (matchedRw) {
    item.runicWord = matchedRw.id;
    item.runicWordName = matchedRw.name;
    return matchedRw;
  } else {
    item.runicWord = null;
    item.runicWordName = null;
    return null;
  }
}

export function checkUnlockRelics(state, floor, publish) {
  if (!state.data.relics) state.data.relics = { unlocked: [], activeRelics: [] };
  if (!Array.isArray(state.data.relics.unlocked)) state.data.relics.unlocked = [];

  const newlyUnlocked = [];
  const available = getUnlockedRelics(floor);
  for (const relic of available) {
    if (!state.data.relics.unlocked.includes(relic.id)) {
      state.data.relics.unlocked.push(relic.id);
      newlyUnlocked.push(relic);
      state.addSystemLog(`【圣遗物觉醒】攻克魔塔第 ${relic.unlockFloor} 层！远古神圣圣遗物【${relic.name}】震撼觉醒，领悟神威【${relic.passiveName}】！`, 'quest', publish);
    }
  }
  if (publish && newlyUnlocked.length > 0) {
    state.notify();
  }
  return newlyUnlocked;
}

export function getRelics(data) {
  if (!data.relics) data.relics = { unlocked: [], activeRelics: [] };
  const maxFloor = data.castle?.maxReachedFloor || 1;
  return HOLY_RELICS.map(r => ({
    ...r,
    isUnlocked: (data.relics.unlocked || []).includes(r.id) || maxFloor >= r.unlockFloor
  }));
}
