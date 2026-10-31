// 自动战斗：速度决定出手频率；状态与回复按独立的战斗时间推进。
// 覆盖：22 种神兽正版特性（连击、祝福恒定最大、虚弱、混乱、不屈、致死、复活、偷袭免反击、假死等）
// 职业原版 9 大技能/光环/被动、古堡探险免费复活一次、侍从助战
import { CLASSES, NATIONS, getClassSkills } from '../config/classes.js';
import { PET_CONFIGS } from '../config/pets.js';
import { MERCENARIES } from '../config/estate.js';
import { getSynergyStrike } from '../config/dungeons.js';
import { PET_SKILL_BOOKS } from '../config/petSkills.js';
import { getPetParty, getPartyTraits } from './petParty.js';

// 单机速度换算采用递减收益，避免高等级敏捷同时放大伤害与频率而压倒其他职业。
// 每秒两次仅作为异常存档的演算保护，正常成长区间保持连续增长。
export function getActionInterval(speed, classId = null) {
  const value = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  return Math.max(0.5, (CLASSES[classId]?.baseActionInterval || 10) / Math.sqrt(1 + value / 100));
}

export function getPlayerActionSpeed(stats, data, isPvp = false) {
  const traits = getPartyTraits(data);
  const auras = isPvp ? [] : getClassSkills(data.classId, stats.skillLevelBonus || 0, data).filter(skill => skill.category === 'aura');
  const auraBoost = auras.reduce((sum, skill) => sum + (skill.effect?.teamSpeedBoost || 0), 0);
  const speed = Number.isFinite(stats.speed) ? Math.max(0, stats.speed) : 0;
  return speed * (1 + (traits.speedBoostPct || 0)) * (1 + auraBoost) +
    (data.estate?.hiredMercId === 'merc_bard' ? 25 : 0);
}

export function getPlayerActionInterval(stats, data, isPvp = false) {
  return getActionInterval(getPlayerActionSpeed(stats, data, isPvp), data.classId);
}

export function getPlayerSynergyStrike(data) {
  const main = getPetParty(data)[0];
  const merc = MERCENARIES.find(merc => merc.id === data.estate?.hiredMercId);
  if (!main.active && !merc) return null;
  return getSynergyStrike(data.classId, merc?.id || '', main.active ? main.pet.id : '');
}

export function runCombat(playerStats, enemyStats, playerData, enemyData) {
  const cls = CLASSES[playerData.classId] || CLASSES.warrior;
  const enemyClassId = enemyData.classId || enemyStats.classId || null;
  const skills = getClassSkills(cls.id, playerStats.skillLevelBonus || 0, playerData);
  const passive = skills.filter(skill => skill.category === 'passive').map(skill => skill.effect || {});
  const aura = enemyData.isPvp ? [] : skills.filter(skill => skill.category === 'aura').map(skill => skill.effect || {});
  const sumEffect = (effects, key) => effects.reduce((sum, effect) => sum + (effect[key] || 0), 0);
  const logs = [];
  let elapsed = 0;
  let acting = null;
  const actionCounts = { player: 0, enemy: 0 };
  const actionProgress = { player: 0, enemy: 0 };
  const record = entry => logs.push({ ...entry, playerMp: p.mp, enemyMp: e.mp, time: Number(elapsed.toFixed(4)), actor: acting,
    action: acting ? actionCounts[acting] : null,
    playerInterval: getActionInterval(p.speed, cls.id), enemyInterval: getActionInterval(e.speed, enemyClassId) });
  const configuredAbilities = enemyData.abilities ?? enemyStats.abilities ?? [];
  const enemyAbilities = Array.isArray(configuredAbilities) ? configuredAbilities.filter(ability => Number.isInteger(ability.interval) && ability.interval >= 2) : [];
  const enemyRebirth = enemyData.rebirth ?? enemyStats.rebirth;
  const pendingPhaseEchoes = [];
  let recoverySeal = null;
  let turn = 1;
  const maxTurns = 30; // 每轮10秒，单场最多300秒。

  // 出战宠物与体力检测 (体力低于 60 则特性失效)
  const party = getPetParty(playerData);
  const activePetObj = party[0].pet;
  const petCfg = activePetObj ? PET_CONFIGS[activePetObj.id] : null;
  const petStamina = activePetObj ? (activePetObj.stamina !== undefined ? activePetObj.stamina : 100) : 100;
  const isPetActive = party.some(member => member.active);
  const petLearnedSkills = petCfg && petStamina >= 60 ? Object.values(PET_SKILL_BOOKS)
    .filter(book => (activePetObj.skills || []).some(id => id === book.id || id === book.skillId))
    .map(book => book.skillId) : [];

  // 国家阵营被动
  const nationCfg = playerData.nation ? NATIONS[playerData.nation] : null;

  // 雇佣佣兵
  const hiredMerc = playerData.estate && playerData.estate.hiredMercId
    ? MERCENARIES.find(m => m.id === playerData.estate.hiredMercId)
    : null;

  // 助战侍从
  const assistingSlave = playerData.assistingSlave || null;

  // 战斗实体状态
  const p = {
    name: playerData.name || '亚诺勇者',
    classId: playerData.classId || 'warrior',
    hp: playerStats.hp,
    maxHp: playerStats.maxHp,
    mp: playerStats.mp,
    maxMp: playerStats.maxMp,
    atk: playerStats.atk,
    def: playerStats.def,
    speed: playerStats.speed,
    crit: playerStats.crit,
    dodge: playerStats.dodge,
    hit: playerStats.hit,
    counter: playerStats.counter,
    lifesteal: playerStats.lifesteal,
    statuses: [],
    phoenixRevived: false,
    rebirthTriggered: false,
    castleRevived: false,
    clericHealed: false,
    relicAvalonUsed: false,
    synergyStrikeUsed: false
  };

  const unlockedRelics = playerData.relics?.unlocked || [];

  const hasPhases = Boolean(enemyData.hasPhases || enemyStats.hasPhases);
  const phase1Shield = enemyData.phase1Shield || enemyStats.phase1Shield || 0;
  const phase2EnrageHp = enemyData.phase2EnrageHp || enemyStats.phase2EnrageHp || Math.floor((enemyStats.hp || 100) * 0.5);
  const phase3Minion = enemyData.phase3Minion || enemyStats.phase3Minion || null;
  const openingShield = Math.max(0, enemyData.openingShield ?? enemyStats.openingShield ?? 0);

  const e = {
    name: enemyData.name || '魔塔凶兽',
    icon: enemyData.icon || 'enemy_default',
    hp: enemyStats.hp,
    maxHp: enemyStats.maxHp || enemyStats.hp || 100,
    mp: enemyStats.mp ?? 100,
    maxMp: enemyStats.maxMp ?? 100,
    atk: enemyStats.atk,
    def: enemyStats.def,
    speed: enemyStats.speed ?? 15,
    crit: enemyStats.crit ?? 10,
    dodge: enemyStats.dodge ?? 5,
    hit: enemyStats.hit ?? 95,
    counter: enemyStats.counter ?? 0,
    statuses: [],
    hasPhases,
    shield: hasPhases ? phase1Shield : openingShield,
    maxShield: hasPhases ? phase1Shield : openingShield,
    phase2EnrageHp,
    phase3Minion,
    isEnraged: false,
    phase3Triggered: false
  };
  e.preparedAbility = null;
  const triggeredPhaseAbilities = new Set();

  // 宠物特性参数快捷提取
  const traitEffect = getPartyTraits(playerData);
  p.speed = getPlayerActionSpeed(playerStats, playerData, enemyData.isPvp);
  p.counter = Math.min(75, p.counter + (traitEffect.counterBoost || 0));
  p.lifesteal *= 1 + (traitEffect.lifestealBoost || 0);
  const hasPurify = Boolean(traitEffect.immuneControl || petLearnedSkills.includes('high_purify'));
  p.atk *= 1 + sumEffect(aura, 'teamAtkBoost');
  p.hit += sumEffect(aura, 'teamHitBoost');
  const mpShieldRate = sumEffect(passive, 'mpShieldRate');
  const reflectDmg = sumEffect(passive, 'reflectDmg');

  // 开场战报
  record({
    turn: 0,
    type: 'start',
    message: `【战斗开始】勇者 ${p.name} 遭遇了 ${e.name}！双方剑拔弩张！`,
    playerHp: p.hp,
    enemyHp: e.hp
  });

  if (e.shield > 0) {
    record({
      turn: 0,
      type: 'warning',
      message: `【${e.hasPhases ? '多阶段首领战' : '首领结界'}】${e.name} 周身笼罩着【远古神圣护盾】（护盾值: ${e.shield}）！必须彻底碎灭护盾方可直伤其本体！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
    if (enemyData.dialogue) {
      record({
        turn: 0,
        type: 'special',
        message: `【首领战前咆哮】${e.name} 狂笑道：“${enemyData.dialogue}”`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }
  }

  if (nationCfg) {
    record({
      turn: 0,
      type: 'passive',
      message: `【国家天命】所属【${nationCfg.name}】：${nationCfg.buffDesc}！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }

  if (activePetObj && petCfg) {
    if (petStamina < 60) {
      record({
        turn: 0,
        type: 'warning',
        message: `【神兽乏力】出战神兽【${petCfg.name}】体力仅剩 ${petStamina}/100（低于60），神兽特性【${petCfg.traitName}】暂已失效！请及时喂食魔能兽肉排！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    } else {
      record({
        turn: 0,
        type: 'passive',
        message: `【神兽随行】神兽【${petCfg.name}】昂首出阵！激活特性【${petCfg.traitName}】— ${petCfg.traitDesc}`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }
  }
  for (const member of party.slice(1).filter(member => member.pet)) {
    record({ turn: 0, type: member.active ? 'passive' : 'warning',
      message: `【副宠${member.slot}】${member.config.name} · ${member.active ? '天赋【' + member.config.traitName + '】生效' : '疲劳，天赋暂停'}`,
      playerHp: p.hp, enemyHp: e.hp });
  }

  if (assistingSlave) {
    record({
      turn: 0,
      type: 'passive',
      message: `【侍从助战】俘虏侍从【${assistingSlave.name}】戴罪立功，手持锁链协同主人出战！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }

  if (hiredMerc) {
    if (hiredMerc.id === 'merc_paladin') {
      record({
        turn: 0,
        type: 'passive',
        message: `【佣兵援护】${hiredMerc.name} 踏步向前竖起钢铁巨盾，全队获得【${hiredMerc.aura}】，受到的伤害减免 18%！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    } else if (hiredMerc.id === 'merc_bard') {
      record({
        turn: 0,
        type: 'passive',
        message: `【佣兵援护】${hiredMerc.name} 拨动鲁特琴奏响【${hiredMerc.aura}】，行动速度提升 25 点！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }
  }

  // 装备远古符文之语共鸣展示
  const activeRunicWords = [];
  if (playerData.equipped) {
    Object.values(playerData.equipped).forEach(item => {
      if (item && item.runicWord && (item.durability === undefined || item.durability > 0)) {
        activeRunicWords.push(item.runicWord);
        record({
          turn: 0,
          type: 'passive',
          message: `【远古神铸】装备【${item.name}】激活符文之语【${item.runicWordName || item.runicWord}】！神圣符文光辉环绕！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }
    });
  }

  // 远古神圣圣遗物开局威能与广播
  if (unlockedRelics.includes('relic_solomon')) {
    e.speed = Math.floor(e.speed * 0.8);
    e.atk = Math.floor(e.atk * 0.85);
    record({
      turn: 0,
      type: 'passive',
      message: `【圣遗物·所罗门印戒】金光大盛！所罗门统御万象神威压制【${e.name}】，使其速度降低 20%，攻击力降低 15%！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }
  if (unlockedRelics.length > 0) {
    record({
      turn: 0,
      type: 'passive',
      message: `【远古圣遗物】已觉醒 ${unlockedRelics.length} 大神圣圣遗物！传世神圣光环庇护勇者征战！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }

  const initialIntervals = { player: getActionInterval(p.speed, cls.id), enemy: getActionInterval(e.speed, enemyClassId) };

  // 两条独立行动进度。中途减速保留已经积累的进度，只改变剩余时间。
  while (p.hp > 0 && e.hp > 0 && turn <= maxTurns) {
    const boundary = turn * 10;
    while (p.hp > 0 && e.hp > 0) {
      acting = null;
      const playerInterval = getActionInterval(p.speed, cls.id);
      const enemyInterval = getActionInterval(e.speed, enemyClassId);
      const playerWait = Math.max(0, 1 - actionProgress.player) * playerInterval;
      const enemyWait = Math.max(0, 1 - actionProgress.enemy) * enemyInterval;
      const wait = Math.min(playerWait, enemyWait);
      const expiry = Math.min(recoverySeal?.expiresAt ?? Infinity, ...p.statuses.filter(status => status.expiresAt !== undefined).map(status => status.expiresAt));
      const dt = Math.min(wait, Math.max(0, boundary - elapsed), Math.max(0, expiry - elapsed));
      actionProgress.player += dt / playerInterval;
      actionProgress.enemy += dt / enemyInterval;
      elapsed = Math.min(boundary, elapsed + dt);
      expireTimedStatuses();
      if (wait > dt + 1e-8) {
        if (elapsed < boundary - 1e-8) continue;
        break;
      }
      acting = playerWait <= enemyWait + 1e-8 ? 'player' : 'enemy';
      actionProgress[acting] = Math.max(0, actionProgress[acting] - 1);
      actionCounts[acting]++;
      executeAction(acting);
      updateRecoverySeal();
      checkEnemyRebirth();
      if (acting === 'player') resolvePhaseEcho();
      checkBossPhases();
    }
    acting = null;
    if (p.hp <= 0 || e.hp <= 0) break;

    const auraHeal = restorePlayerHealth(Math.floor(p.maxHp * sumEffect(aura, 'teamRegenHp')), '职业光环');
    const auraMana = Math.min(p.maxMp - p.mp, Math.floor(sumEffect(aura, 'teamRegenMp')));
    if (auraHeal > 0 || auraMana > 0) {
      p.mp += auraMana;
      record({ turn, type: 'heal', message: `【职业光环】恢复生命 ${auraHeal}、魔力 ${auraMana}。`, playerHp: p.hp, enemyHp: e.hp });
    }
    const regenPercent = Math.max(0, ...(playerData.estate?.activePotions || [])
      .filter(potion => (potion.remainingFights ?? potion.effect?.fights ?? 0) > 0)
      .map(potion => potion.effect?.regenPercent || 0));
    const potionHeal = restorePlayerHealth(Math.floor(p.maxHp * regenPercent), '圣水祝福');
    if (potionHeal > 0) {
      record({ turn, type: 'heal', message: `【圣水祝福】恢复 ${potionHeal} 点生命。`, playerHp: p.hp, enemyHp: e.hp });
    }

    // 回合末神兽再生（银龙【再生】）
    if (traitEffect.regenHpPct) {
      if (p.hp < p.maxHp) {
        const regenVal = restorePlayerHealth(Math.floor(p.maxHp * traitEffect.regenHpPct), '银龙再生');
        record({
          turn,
          type: 'heal',
          message: `【银龙·再生】远古银龙盘旋降下圣泉之愈，勇者生命恢复了 ${regenVal} 点！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }
    }

    // 回合末圣遗物【世界树·尤克特拉希尔终焉之果】每回合创世自愈
    if (unlockedRelics.includes('relic_yggdrasil') && p.hp > 0 && p.hp < p.maxHp) {
      const yggRegen = restorePlayerHealth(Math.floor(p.maxHp * 0.08), '世界树');
      record({
        turn,
        type: 'heal',
        message: `【圣遗物·世界树终焉之果】创世生机流转滋养身躯，自愈恢复 ${yggRegen} 点生命值！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 侍从偶发奇袭支援
    if (assistingSlave && turn % 3 === 0 && e.hp > 0) {
      const slaveDmg = Math.floor(p.atk * 0.45);
      damageEnemy(slaveDmg);
      checkBossPhases();
      record({
        turn,
        type: 'damage',
        message: `【侍从奇袭】${assistingSlave.name} 趁隙扑上挥链锁喉，造成 ${slaveDmg} 点辅助伤害！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 回合末持续流血/中毒结算
    resolveTurnEndDot(p, '勇者');
    resolveTurnEndDot(e, e.name);
    checkEnemyRebirth();
    if (p.hp <= 0 || e.hp <= 0) break;

    turn++;
  }

  function expireTimedStatuses() {
    updateRecoverySeal();
    for (const status of [...p.statuses]) {
      if (status.expiresAt === undefined || status.expiresAt > elapsed + 1e-8) continue;
      if (status.type === 'slow') p.speed /= 1 - status.ratio;
      p.statuses = p.statuses.filter(current => current !== status);
      record({ turn, type: 'status', message: status.type === 'slow'
        ? '【减速结束】勇者行动速度恢复。' : '【状态消退】重创已消退。', playerHp: p.hp, enemyHp: e.hp });
    }
  }

  function updateRecoverySeal() {
    if (!recoverySeal) return;
    const reason = p.hp <= 0 || e.hp <= 0 ? '战斗已结束'
      : elapsed >= recoverySeal.expiresAt - 1e-8 ? `${recoverySeal.duration}秒引导到期`
      : e.statuses.some(status => ['stun', 'confusion'].includes(status.type)) ? '控制打断引导'
      : e.mp <= 0 ? '龙皇魔力耗尽' : null;
    if (!reason) return;
    recoverySeal = null;
    record({ turn, type: 'status', recoverySealEnded: reason,
      message: `【黑焰逆流消散】${reason}，生命回复恢复正常。`, playerHp: p.hp, enemyHp: e.hp });
  }

  // Revival sets health directly; only ordinary healing passes through the channel.
  function restorePlayerHealth(amount, source) {
    updateRecoverySeal();
    if (p.hp <= 0 || amount <= 0) return 0;
    const missing = Math.max(0, p.maxHp - p.hp);
    const healed = Math.min(missing, Math.floor(amount * (1 - (recoverySeal?.ratio || 0)) + 1e-9));
    const prevented = Math.min(missing, amount) - healed;
    p.hp += healed;
    if (prevented > 0) record({ turn, type: 'status', healingPrevented: prevented, healingRestored: healed,
      healingSource: source, sealExpiresAt: recoverySeal.expiresAt,
      message: `【黑焰逆流】${source}实际恢复 ${healed} 点生命，压制 ${prevented} 点回复；控制或破魔可中断引导。`,
      playerHp: p.hp, enemyHp: e.hp });
    return healed;
  }

  function checkEnemyRebirth() {
    if (e.hp > 0 || e.rebirthAttempted || !enemyRebirth || !Number.isFinite(enemyRebirth.hpRatio) || enemyRebirth.hpRatio <= 0 || enemyRebirth.hpRatio > 1) return;
    e.rebirthAttempted = true;
    if (traitEffect.antiRevive) {
      record({ turn, type: 'special', message: `【蛇女·致死】封断重生契约，${e.name} 的【${enemyRebirth.name}】无法复活！`, playerHp: p.hp, enemyHp: e.hp });
      return;
    }
    e.hp = Math.max(1, Math.floor(e.maxHp * enemyRebirth.hpRatio));
    e.preparedAbility = null;
    record({ turn, type: 'heal', message: `【首领重生】${e.name} 发动【${enemyRebirth.name}】，恢复 ${e.hp} 点生命！本场仅一次。`, playerHp: p.hp, enemyHp: e.hp });
  }

  function checkDeathPrevention() {
    if (p.hp > 0) return false;
    if (petLearnedSkills.includes('high_rebirth') && !p.rebirthTriggered) {
      p.rebirthTriggered = true;
      if (Math.random() * 100 < PET_SKILL_BOOKS.book_rebirth.effect.rebirthChance) {
        p.hp = Math.floor(p.maxHp * PET_SKILL_BOOKS.book_rebirth.effect.healPercent);
        record({ turn, type: 'heal', message: `【高级神佑】复生并恢复 ${p.hp} 点生命！`, playerHp: p.hp, enemyHp: e.hp });
        return true;
      }
    }

    // 检查阿瓦隆仙子圣鞘免死
    if (unlockedRelics.includes('relic_avalon') && !p.relicAvalonUsed) {
      p.relicAvalonUsed = true;
      p.hp = Math.floor(p.maxHp * 0.35);
      record({
        turn,
        type: 'heal',
        message: `【圣遗物·阿瓦隆圣鞘】生命垂危之际唤醒仙子结界！驱散致死打击，自愈恢复 ${p.hp} 点生命值！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
      return true;
    }

    // 检查凤凰【复活】
    if (traitEffect.reviveChance && !p.phoenixRevived) {
      p.phoenixRevived = true;
      if (Math.random() * 100 < traitEffect.reviveChance) {
        p.hp = Math.max(1, Math.floor(p.maxHp * traitEffect.reviveHpPct));
        record({
          turn,
          type: 'heal',
          message: `【凤凰·涅槃】不灭神火冲霄！凤凰烈焰唤醒勇者，恢复 ${Math.round(traitEffect.reviveHpPct * 100)}% 生命值！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
        return true;
      }
    }

    // 检查古堡探险单次免死复活机会
    if (playerData.isCastleExplore && !p.castleRevived) {
      p.castleRevived = true;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      record({
        turn,
        type: 'heal',
        message: `【古堡庇佑·全满复活】触发古堡探险每场 1 次的【满血复活】机会！勇者生命与法力瞬间恢复至全满！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
      return true;
    }

    return false;
  }

  // Each lethal opponent hit gets its own roll; poison and self-harm bypass it.
  function tryFeignDeath(damage) {
    if (p.hp <= 0 || damage < p.hp || !traitEffect.feignDeathChance) return false;
    if (Math.random() * 100 >= traitEffect.feignDeathChance) return false;
    record({
      turn, type: 'special',
      message: `【小妖精·假死】受到致命打击的一瞬，小妖精施展【假死】奇术，本次 ${damage} 点伤害全数无效！`,
      playerHp: p.hp, enemyHp: e.hp
    });
    return true;
  }

  function resolveTurnEndDot(entity, name) {
    const poison = entity.statuses.find(s => s.type === 'poison');
    if (poison) {
      let dmg = poison.dmg;
      if (entity === e) dmg = Math.floor(dmg * (1 + (traitEffect.dotBoost || 0)));
      if (entity === p && traitEffect.dotResist) {
        dmg = Math.floor(dmg * 0.2); // 庇护降低 80% 持续伤害
      }
      if (entity === p && playerStats.dmgResist) dmg = Math.floor(dmg * (1 - Math.min(0.5, playerStats.dmgResist / 100)));
      if (entity === p && mpShieldRate > 0 && p.mp > 0) {
        const absorbed = Math.min(p.mp, Math.floor(dmg * mpShieldRate));
        p.mp -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) record({ turn, type: 'special', message: `【寒冰护盾】消耗 ${absorbed} 魔力抵消毒伤。`, playerHp: p.hp, enemyHp: e.hp });
      }
      dmg = Math.min(entity.hp, dmg);
      entity.hp = Math.max(0, entity.hp - dmg);
      if (entity === p && p.hp > 0 && playerStats.magicAbsorb) {
        const restored = Math.min(p.maxMp - p.mp, Math.floor(dmg * playerStats.magicAbsorb / 100));
        p.mp += restored;
        if (restored > 0) record({ turn, type: 'special', message: `【法力吸收】毒伤转化为 ${restored} 点魔力。`, playerHp: p.hp, enemyHp: e.hp });
      }
      record({
        turn,
        type: 'poison',
        message: `【毒发】${name} 受到剧毒侵蚀，损失了 ${dmg} 点生命值！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
      poison.duration--;
      if (poison.duration <= 0) {
        entity.statuses = entity.statuses.filter(s => s.type !== 'poison');
      }
      if (entity === p && p.hp <= 0) {
        checkDeathPrevention();
      }
    }
  }

  function damageEnemy(amount) {
    const absorbed = Math.min(e.shield, amount);
    e.shield -= absorbed;
    const dealt = Math.min(e.hp, Math.max(0, amount - absorbed));
    e.hp -= dealt;
    if (absorbed > 0) record({ turn, type: 'special',
      message: `【神圣护盾】抵御追加攻击 ${absorbed} 点，余盾 ${e.shield}。`,
      playerHp: p.hp, enemyHp: e.hp });
    return dealt;
  }

  function applyEnemyStatus(status) {
    if (status.duration) status.duration = Math.ceil(status.duration * (traitEffect.debuffDurationBoost || 1));
    const existing = e.statuses.find(current => current.type === status.type);
    if (existing) Object.assign(existing, status);
    else e.statuses.push(status);
    updateRecoverySeal();
  }

  function applyPlayerStatus(status, damage) {
    const names = { poison: '剧毒', weaken: '虚弱', slow: '减速', stun: '眩晕', confusion: '混乱', wound: '重创' };
    const immune = petLearnedSkills.includes('high_purify') ||
      (traitEffect.immuneControl && ['stun', 'confusion'].includes(status.type)) ||
      (traitEffect.immuneDebuffs && ['weaken', 'slow', 'wound'].includes(status.type));
    if (immune) {
      record({ turn, type: 'status', message: `【神圣庇佑】免疫${names[status.type] || '不良状态'}。`, playerHp: p.hp, enemyHp: e.hp });
      return;
    }
    const applied = { ...status };
    if (['slow', 'wound'].includes(status.type)) applied.expiresAt = elapsed + status.duration * 10;
    if (status.type === 'poison') applied.dmg = Math.floor(damage * status.rate);
    const existing = p.statuses.find(current => current.type === status.type);
    if (status.type === 'slow') {
      if (existing) p.speed /= 1 - existing.ratio;
      p.speed *= 1 - status.ratio;
    }
    if (existing) Object.assign(existing, applied);
    else p.statuses.push(applied);
    const duration = applied.expiresAt !== undefined ? `${status.duration * 10}秒`
      : `${status.duration}次${status.type === 'poison' ? '持续伤害' : '行动'}`;
    record({ turn, type: 'status', message: `【首领法术】勇者陷入${names[status.type] || '不良状态'}，持续${duration}。`, playerHp: p.hp, enemyHp: e.hp });
  }

  function interruptEnemySpell() {
    if (e.preparedAbility) {
      record({ turn, type: 'status', message: `【施法中断】${e.name} 的【${e.preparedAbility.ability.name}】被控制打断。`, playerHp: p.hp, enemyHp: e.hp });
      e.preparedAbility = null;
    }
  }

  function mitigatePlayerDamage(damage, magic = false) {
    if (hiredMerc?.id === 'merc_paladin') damage = Math.floor(damage * 0.82);
    if (playerStats.dmgResist) damage = Math.floor(damage * (1 - Math.min(0.5, playerStats.dmgResist / 100)));
    if (magic) damage = Math.floor(damage * (1 - Math.min(0.6, Math.max(0, (playerStats.magicResist || 0) / 100))));
    if (mpShieldRate > 0 && p.mp > 0) {
      const absorbed = Math.min(p.mp, Math.floor(damage * mpShieldRate));
      p.mp -= absorbed;
      damage -= absorbed;
      if (absorbed > 0) record({ turn, type: 'special', message: `【寒冰护盾】消耗 ${absorbed} 魔力抵消等量伤害。`, playerHp: p.hp, enemyHp: e.hp });
    }
    return damage;
  }

  function resolvePhaseEcho() {
    if (p.hp <= 0 || e.hp <= 0 || !pendingPhaseEchoes.length) return;
    if (e.statuses.some(status => ['stun', 'confusion'].includes(status.type))) {
      pendingPhaseEchoes.length = 0;
      record({ turn, type: 'status', message: '【余烬熄灭】控制打断龙皇引导，剩余余烬全部消散。', playerHp: p.hp, enemyHp: e.hp });
      return;
    }
    const echo = pendingPhaseEchoes[0], cost = echo.ability.echoes.mpCost;
    if (e.mp < cost) {
      pendingPhaseEchoes.length = 0;
      record({ turn, type: 'status', message: '【余烬熄灭】龙皇魔力不足，剩余余烬全部消散。', playerHp: p.hp, enemyHp: e.hp });
      return;
    }
    e.mp -= cost;
    echo.left--;
    if (!echo.left) pendingPhaseEchoes.shift();
    const raw = Math.floor(p.maxHp * echo.ability.echoes.maxHpDamageRatio);
    const damage = mitigatePlayerDamage(raw, true);
    const dealt = tryFeignDeath(damage) ? 0 : Math.min(p.hp, damage);
    p.hp -= dealt;
    record({ turn, type: 'damage', phaseEcho: true, sourceAbilityName: echo.ability.name,
      echoMaxHpDamage: raw, damage: dealt, manaSpent: cost, enemyMp: e.mp, echoesLeft: echo.left,
      message: `【龙息余烬】${echo.ability.name} 在勇者行动后反噬 ${dealt} 点魔法伤害，剩余${echo.left}次；控制或破魔可熄灭，魔抗与减伤有效。`,
      playerHp: p.hp, enemyHp: e.hp });
    if (dealt > 0 && p.hp > 0 && playerStats.magicAbsorb) {
      const restored = Math.min(p.maxMp - p.mp, Math.floor(dealt * playerStats.magicAbsorb / 100));
      if (restored > 0) {
        p.mp += restored;
        record({ turn, type: 'special', manaRestored: restored,
          message: `【法力吸收】余烬伤害转化为 ${restored} 点魔力。`, playerHp: p.hp, enemyHp: e.hp });
      }
    }
    checkDeathPrevention();
  }

  function checkBossPhases() {
    // Threshold spells are finite attempts; interrupting one consumes its phase.
    if (e.hp > 0 && p.hp > 0 && !e.preparedAbility) {
      const ability = enemyAbilities.find(ability => ability.hpThreshold > 0 && ability.hpThreshold < 1 &&
        !triggeredPhaseAbilities.has(ability) && e.hp <= e.maxHp * ability.hpThreshold && e.mp >= ability.mpCost);
      if (ability) {
        triggeredPhaseAbilities.add(ability);
        e.preparedAbility = { ability, dueAction: actionCounts.enemy + 1 };
        record({ turn, type: 'warning', abilityName: ability.name,
          phaseThreshold: ability.hpThreshold, dueEnemyAction: actionCounts.enemy + 1,
          message: `【首领蓄势】${e.name} 生命降至${Math.round(ability.hpThreshold * 100)}%以下，正在蓄势【${ability.name}】，下次行动释放；本阶段只尝试一次，控制可打断，魔抗可减轻龙息伤害。`,
          playerHp: p.hp, enemyHp: e.hp });
      }
    }
    // 多阶段首领：P2 绝境狂暴 与 P3 冥府死契
    if (e.hasPhases && e.hp > 0) {
      if (!e.isEnraged && e.hp <= e.phase2EnrageHp) {
        e.isEnraged = true;
        const atkBuff = Math.floor(e.atk * 0.35);
        e.atk += atkBuff;
        record({
          turn,
          type: 'warning',
          message: `【绝境嗜血狂暴】${e.name} 生命垂危陷入滔天狂怒！血瞳魔焰燃起，攻击力暴涨 +${atkBuff}（+35%）！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }

      if (!e.phase3Triggered && e.hp <= Math.floor(e.maxHp * 0.25)) {
        e.phase3Triggered = true;
        const healAmt = Math.floor(e.maxHp * 0.15);
        e.hp = Math.min(e.maxHp, e.hp + healAmt);
        const minionName = e.phase3Minion || '冥河怨灵随从';
        record({
          turn,
          type: 'special',
          message: `【冥府死契召唤】${e.name} 召唤出【${minionName}】！当场献祭随从汲取魔魂，生命自愈恢复 +${healAmt} 点！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }
    }

  }

  function executeAction(actor) {
    const isPlayer = actor === 'player';
    const attacker = isPlayer ? p : e;
    const defender = isPlayer ? e : p;
    const weakness = attacker.statuses.find(status => status.type === 'weaken');
    if (weakness) {
      weakness.duration--;
      if (weakness.duration <= 0) attacker.statuses = attacker.statuses.filter(status => status !== weakness);
    }

    // 异常判定：眩晕
    const stunIdx = attacker.statuses.findIndex(s => s.type === 'stun');
    if (stunIdx !== -1) {
      if (isPlayer && hasPurify) {
        record({
          turn,
          type: 'status',
          message: `【圣光辟邪】${attacker.name} 免疫眩晕，金芒闪烁瞬间驱散异常！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
        attacker.statuses.splice(stunIdx, 1);
      } else {
        if (!isPlayer) interruptEnemySpell();
        record({
          turn,
          type: 'status',
          message: `【眩晕倒地】${attacker.name} 头晕目眩，无法动弹，跳过本次行动！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
        if ((attacker.statuses[stunIdx].duration ?? 1) <= 1) attacker.statuses.splice(stunIdx, 1);
        else attacker.statuses[stunIdx].duration--;
        return;
      }
    }

    // 异常判定：混乱自残（魅魔【混乱】）
    const confIdx = attacker.statuses.findIndex(s => s.type === 'confusion');
    if (confIdx !== -1) {
      if (isPlayer && hasPurify) {
        record({
          turn,
          type: 'status',
          message: `【清醒圣洁】${attacker.name} 心智坚毅，不受魅魔低语蛊惑！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
        attacker.statuses.splice(confIdx, 1);
      } else {
        if (!isPlayer) interruptEnemySpell();
        const selfDmg = Math.floor(attacker.atk * 0.75);
        attacker.hp = Math.max(0, attacker.hp - selfDmg);
        record({
          turn,
          type: 'confusion',
          message: `【混乱自戕】${attacker.name} 陷入极度混乱，拔刃刺向自身，受到 ${selfDmg} 点混乱反噬！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
        if ((attacker.statuses[confIdx].duration ?? 1) <= 1) attacker.statuses.splice(confIdx, 1);
        else attacker.statuses[confIdx].duration--;
        if (isPlayer && p.hp <= 0) {
          checkDeathPrevention();
        }
        return;
      }
    }

    // 合击按自身行动次数触发，保持快慢双方各自的节奏。
    if (isPlayer && !p.synergyStrikeUsed && (hiredMerc || party[0].active) && (actionCounts.player >= 3 || (e.shield > 0 && actionCounts.player >= 2)) && defender.hp > 0) {
      p.synergyStrikeUsed = true;
      const strike = getPlayerSynergyStrike(playerData);

      let synergyDmg = Math.floor(p.atk * strike.mult * 1.5);

      if (strike.shatterShield && e.shield > 0) {
        const brokenShield = e.shield;
        e.shield = 0;
        record({
          turn,
          type: 'crit',
          message: `【烈火破界】${strike.name} 炽烈真火将 ${e.name} 剩余的 ${brokenShield} 点神圣护盾彻底轰成齑粉！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }

      if (e.shield > 0) {
        if (synergyDmg <= e.shield) {
          e.shield -= synergyDmg;
          record({
            turn,
            type: 'special',
            message: `【合击奥义受阻】${strike.name} 轰击在护盾上，扣除 ${synergyDmg} 点护盾值！（剩余护盾: ${e.shield}）`,
            playerHp: p.hp,
            enemyHp: e.hp
          });
          synergyDmg = 0;
        } else {
          synergyDmg -= e.shield;
          e.shield = 0;
          record({
            turn,
            type: 'special',
            message: `【合击破盾】${strike.name} 彻底击穿了 ${e.name} 的神圣护盾！余威直贯本体！`,
            playerHp: p.hp,
            enemyHp: e.hp
          });
        }
      }

      if (synergyDmg > 0) {
        defender.hp = Math.max(0, defender.hp - synergyDmg);
      }

      if (strike.healPct && p.hp < p.maxHp) {
        restorePlayerHealth(Math.floor(p.maxHp * strike.healPct), '合击');
      }

      if (strike.stun && defender.hp > 0) {
        applyEnemyStatus({ type: 'stun', duration: 1 });
      }

      if (strike.defReduce && defender.hp > 0) {
        const defCut = Math.floor(defender.def * strike.defReduce);
        defender.def = Math.max(10, defender.def - defCut);
      }

      const allyName = hiredMerc ? hiredMerc.name : (petCfg ? petCfg.name : '随行契约者');
      record({
        turn,
        type: 'crit',
        message: `【全屏合击奥义 · ${strike.name}】勇者与【${allyName}】战魂共鸣轰出神威！${strike.desc} 对【${defender.name}】造成 ${synergyDmg} 点破晓浩劫真伤！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });

      if (defender.hp <= 0) return;
    }

    // 技能尝试
    let skillUsed = null;
    let dmgMultiplier = 1.0;
    let extraHit = 0;
    let extraCrit = 0;
    let isDoubleHitSkill = false;
    let isStunSkill = false;
    let isLifestealSkill = false;
    let isSlowSkill = false;

    if (!isPlayer) {
      if (e.preparedAbility && actionCounts.enemy >= e.preparedAbility.dueAction) {
        const ability = e.preparedAbility.ability;
        e.preparedAbility = null;
        if (e.mp >= ability.mpCost) {
          skillUsed = ability;
          e.mp -= ability.mpCost;
          dmgMultiplier = ability.multiplier || 1;
        } else record({ turn, type: 'status', message: `【施法中断】${e.name} 魔力不足，无法释放【${ability.name}】。`, playerHp: p.hp, enemyHp: e.hp });
      }
      if (!e.preparedAbility && !skillUsed) {
        const ability = enemyAbilities.find(ability => !ability.hpThreshold &&
          actionCounts.enemy % ability.interval === ability.interval - 1 && e.mp >= ability.mpCost);
        if (ability) {
          e.preparedAbility = { ability, dueAction: actionCounts.enemy + 1 };
          record({ turn, type: 'warning', message: `【首领蓄势】${e.name} 正在蓄势【${ability.name}】，下次行动将释放！控制可打断，对应神兽庇佑可抵御。`, playerHp: p.hp, enemyHp: e.hp });
        }
      }
    }

    if (isPlayer) {
      const activeSkills = skills.filter(s => s.category === 'attack');
      const preferred = activeSkills.findIndex(skill => skill.id === playerData.skillTraining?.preferredAttackId);
      if (preferred >= 0) activeSkills.push(...activeSkills.splice(preferred, 1));
      for (let i = activeSkills.length - 1; i >= 0; i--) {
        const sk = activeSkills[i];
        let cost = sk.mpCost;
        if (traitEffect.mpCostReduction) cost = Math.floor(cost * (1 - traitEffect.mpCostReduction));

        if (p.mp >= cost && Math.random() < 0.65) {
          skillUsed = sk;
          p.mp -= cost;
          dmgMultiplier = sk.multiplier || 1.0;
          extraHit = sk.extraHit || 0;
          extraCrit = sk.extraCrit || 0;
          if (sk.multiHit && sk.multiHit > 1) isDoubleHitSkill = true;
          if (sk.stunChance) isStunSkill = true;
          if (sk.lifestealRate) isLifestealSkill = true;
          if (sk.slowRate) isSlowSkill = true;
          break;
        }
      }
    }

    // 命中与闪避判定
    let hitChance = Math.min(99, Math.max(50, (attacker.hit + extraHit) - defender.dodge));
    if (Math.random() * 100 > Math.max(hitChance, skillUsed?.minHitChance || 0)) {
      record({
        turn,
        type: 'dodge',
        message: `【未命中】${attacker.name} 发动突击，但被 ${defender.name} 迅捷闪身避开！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
      return;
    }

    // 伤害计算 (美人鱼【祝福】恒定取 100% 最大浮动)
    let rollRatio = 0.9 + Math.random() * 0.2;
    if (isPlayer && traitEffect.maxDamageRoll) {
      rollRatio = 1.1; // 恒定最大浮动
    }

    // 黑翼天使【不屈】血量越低攻击越高
    let atkBonusPct = 1.0;
    if (isPlayer && traitEffect.desperateAtkScale) {
      const lostHpPct = ((p.maxHp - p.hp) / p.maxHp);
      atkBonusPct += lostHpPct * traitEffect.desperateAtkScale;
    }

    if (weakness) atkBonusPct *= 1 - weakness.ratio;
    const wound = defender.statuses.find(status => status.type === 'wound');
    if (wound) extraCrit += wound.critBonus || 0;
    const targetDef = Math.max(0, defender.def - (isPlayer ? playerStats.armorBreak || 0 : 0)) * (isPlayer && activeRunicWords.includes('oath') ? 0.82 : 1.0);
    const rawDmg = Math.max(15, (attacker.atk * atkBonusPct * dmgMultiplier) - Math.floor(targetDef * 0.55));
    let finalDmg = Math.floor(rawDmg * rollRatio);
    if (wound) finalDmg = Math.floor(finalDmg * (1 + wound.damageBonus));
    if (isPlayer && playerStats.dmgBonus) finalDmg = Math.floor(finalDmg * (1 + playerStats.dmgBonus / 100));
    if (isPlayer && ((skillUsed && p.classId === 'mage') || (playerStats.armorBreak || 0) > 0) && playerStats.magicDmg) finalDmg = Math.floor(finalDmg * (1 + playerStats.magicDmg / 100));
    if (isPlayer && defender.hp <= defender.maxHp * 0.3 && playerStats.finishDmg) finalDmg = Math.floor(finalDmg * (1 + playerStats.finishDmg / 100));

    // 暴击判定
    const firstStrikeCrit = isPlayer && actionCounts.player === 1 && activeRunicWords.includes('hermes') ? 20 : 0;
    const totalCrit = attacker.crit + extraCrit + firstStrikeCrit - (!isPlayer ? sumEffect(aura, 'teamCritResist') * 100 : 0);
    const isCrit = Math.random() * 100 < totalCrit;
    if (isCrit) {
      let critMult = 1.85;
      if (isPlayer && petLearnedSkills.includes('high_crit')) critMult = PET_SKILL_BOOKS.book_crit.effect.critDmgMultiplier;
      if (isPlayer && playerStats.critDmg) {
        critMult += (playerStats.critDmg / 100);
      }
      finalDmg = Math.floor(finalDmg * critMult);
    }
    const breathDamage = !isPlayer && skillUsed?.maxHpDamageRatio > 0
      ? Math.floor(p.maxHp * Math.min(1, skillUsed.maxHpDamageRatio)) : 0;
    finalDmg += breathDamage;
    const manaBeforeDrain = p.mp;
    const manaDrained = !isPlayer && skillUsed?.manaDrainRatio > 0
      ? Math.floor(p.mp * Math.min(1, skillUsed.manaDrainRatio)) : 0;
    p.mp -= manaDrained;
    const manaBacklashDamage = mpShieldRate > 0 && p.mp > 0
      ? Math.floor(manaDrained * (skillUsed?.manaBacklashMultiplier || 0)) : 0;
    finalDmg += manaBacklashDamage;

    // 造成伤害
    let applyDmg = finalDmg;
    if (!isPlayer) applyDmg = mitigatePlayerDamage(applyDmg, skillUsed?.damageType === 'magic');

    if (!isPlayer && tryFeignDeath(applyDmg)) {
      p.mp = Math.min(p.maxMp, p.mp + manaDrained);
      return;
    }

    let shieldAbsorbed = 0;
    if (isPlayer && e.shield > 0) {
      if (applyDmg <= e.shield) {
        e.shield -= applyDmg;
        shieldAbsorbed = applyDmg;
        applyDmg = 0;
      } else {
        shieldAbsorbed = e.shield;
        applyDmg -= e.shield;
        e.shield = 0;
      }
    }

    applyDmg = Math.min(defender.hp, applyDmg);
    defender.hp = Math.max(0, defender.hp - applyDmg);
    if (!isPlayer && skillUsed && applyDmg > 0 && p.hp > 0) {
      for (const status of skillUsed.statuses || []) applyPlayerStatus(status, applyDmg);
    }
    if (!isPlayer && applyDmg > 0 && playerStats.magicAbsorb && p.hp > 0) {
      const restored = Math.min(p.maxMp - p.mp, Math.floor(applyDmg * playerStats.magicAbsorb / 100));
      if (restored > 0) {
        p.mp += restored;
        record({ turn, type: 'special', message: `【法力吸收】受到伤害转化为 ${restored} 点魔力。`, playerHp: p.hp, enemyHp: e.hp });
      }
    }

    // 生成出招战报
    let actionDesc = skillUsed ? `施展【${skillUsed.name}】` : `挥舞兵刃发动普攻`;
    let critText = isCrit ? `【暴击致命破击！】` : '';
    let shieldText = shieldAbsorbed > 0 ? (e.shield > 0 ? `（护盾抵御 ${shieldAbsorbed} 点，余盾 ${e.shield}）` : `（护盾粉碎吸收 ${shieldAbsorbed} 点！）`) : '';
    record({
      turn,
      type: isCrit ? 'crit' : 'damage',
      abilityName: skillUsed?.name || null,
      maxHpDamage: breathDamage,
      ...(manaDrained ? { manaDrained, manaBeforeDrain, manaBacklashDamage } : {}),
      damage: applyDmg + shieldAbsorbed,
      message: `【${elapsed.toFixed(1)}秒】${attacker.name} ${actionDesc}，对 ${defender.name} 造成了 ${applyDmg + shieldAbsorbed} 点伤害！${critText}${shieldText}${breathDamage > 0 ? `（龙息灼蚀按生命上限计算，魔抗与减伤仍有效）` : ''}${manaDrained ? `【黑焰抽取】抽走当前魔力${manaDrained}点，引发${manaBacklashDamage}点原始魔法反噬；反噬不暴击，仍经魔抗、减伤与魔力护盾减免。` : ''}`,
      playerHp: p.hp,
      enemyHp: e.hp
    });

    if (!isPlayer && skillUsed?.echoes && e.hp > 0) {
      pendingPhaseEchoes.push({ ability: skillUsed, left: skillUsed.echoes.charges });
      record({ turn, type: 'warning', message: `【余烬预警】${skillUsed.name} 留下${skillUsed.echoes.charges}次余烬，随后每次勇者行动结束消耗${skillUsed.echoes.mpCost}龙皇魔力，反噬生命上限${Math.round(skillUsed.echoes.maxHpDamageRatio * 100)}%的魔法伤害；控制或破魔可熄灭。`,
        playerHp: p.hp, enemyHp: e.hp });
    }
    if (!isPlayer && skillUsed?.healingSuppression && applyDmg > 0 && p.hp > 0 && e.hp > 0 && e.mp > 0) {
      recoverySeal = { ...skillUsed.healingSuppression, expiresAt: elapsed + skillUsed.healingSuppression.duration };
      record({ turn, type: 'warning', recoverySealStarted: true, sealExpiresAt: recoverySeal.expiresAt,
        message: `【黑焰逆流预警】${skillUsed.name}命中，龙皇引导${recoverySeal.duration}秒，生命回复降低${Math.round(recoverySeal.ratio * 100)}%；不叠加、不压制复活。控制或耗尽龙皇魔力可立即中断，净化只免异常，不能移除首领引导。`,
        playerHp: p.hp, enemyHp: e.hp });
    }

    checkBossPhases();

    // 符文之语【天罚审判】真实伤害追击
    if (isPlayer && activeRunicWords.includes('divine_wrath') && Math.random() < 0.20 && defender.hp > 0) {
      const smiteDmg = Math.floor(p.atk * 1.5);
      defender.hp = Math.max(0, defender.hp - smiteDmg);
      record({
        turn,
        type: 'crit',
        message: `【天罚审判】诸神降下雷霆裁决！对【${defender.name}】造成 ${smiteDmg} 点神圣破甲真实伤害！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 符文之语【救赎】受击神圣愈合
    if (!isPlayer && activeRunicWords.includes('redemption') && Math.random() < 0.25 && p.hp > 0) {
      const restored = restorePlayerHealth(300, '救赎');
      record({
        turn,
        type: 'heal',
        message: `【符文之语·救赎】圣光垂怜愈合！${p.name} 受到神圣洗礼，瞬间恢复 ${restored} 点生命值！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 圣遗物【朗基努斯命运圣枪】暴击神圣裁决真伤
    if (isPlayer && isCrit && unlockedRelics.includes('relic_longinus') && Math.random() < 0.35 && defender.hp > 0) {
      const holyTrueDmg = Math.min(1500, Math.floor(defender.hp * 0.05) + 200);
      defender.hp = Math.max(0, defender.hp - holyTrueDmg);
      record({
        turn,
        type: 'crit',
        message: `【圣遗物·朗基努斯命运圣枪】暴击引动神罚金芒！对【${defender.name}】追加造成 ${holyTrueDmg} 点神圣破晓真实伤害！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 圣遗物【普罗米修斯不灭火种】红莲灼烧
    if (isPlayer && unlockedRelics.includes('relic_prometheus') && defender.hp > 0) {
      const burnDmg = 250;
      defender.hp = Math.max(0, defender.hp - burnDmg);
      record({
        turn,
        type: 'damage',
        message: `【圣遗物·普罗米修斯】原初天火不灭灼烧！对【${defender.name}】额外造成 ${burnDmg} 点天火真伤！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 圣遗物【雷神之锤·米约尔尼尔遗片】雷霆眩晕
    if (isPlayer && unlockedRelics.includes('relic_mjolnir') && defender.hp > 0 && Math.random() < 0.25) {
      applyEnemyStatus({ type: 'stun', duration: 1 });
      record({
        turn,
        type: 'status',
        message: `【圣遗物·雷神之锤】九天雷霆咆哮炸裂！【${defender.name}】陷入雷霆麻痹，1 回合无法行动！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 圣遗物【阿瓦隆仙子圣鞘】濒死结界自愈
    if (!isPlayer && unlockedRelics.includes('relic_avalon') && !p.relicAvalonUsed && p.hp <= Math.floor(p.maxHp * 0.25) && p.hp > 0) {
      p.relicAvalonUsed = true;
      const avalonHeal = restorePlayerHealth(Math.floor(p.maxHp * 0.35), '阿瓦隆圣鞘');
      record({
        turn,
        type: 'heal',
        message: `【圣遗物·阿瓦隆圣鞘】生命垂危之际唤醒仙子结界！免疫毁灭伤痛，自愈恢复 ${avalonHeal} 点生命值！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 技能附带效果处理
    if ((isStunSkill || (isPlayer && traitEffect.stunBonus)) && defender.hp > 0 && Math.random() * 100 < (skillUsed?.stunChance || 0) + (traitEffect.stunBonus || 0)) {
      applyEnemyStatus({ type: 'stun', duration: 1 });
      record({
        turn,
        type: 'status',
        message: `【震荡击晕】${defender.name} 被重箭砸中要害，陷入 1 回合眩晕状态！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    if (isLifestealSkill && isPlayer && applyDmg > 0) {
      const healAmt = restorePlayerHealth(Math.floor(applyDmg * skillUsed.lifestealRate * (1 + (traitEffect.lifestealBoost || 0))), '生命汲取');
      record({
        turn,
        type: 'heal',
        message: `【生命汲取】法术暗影回流，勇者汲取恢复了 ${healAmt} 点生命！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }
    if (isPlayer && p.lifesteal > 0 && applyDmg > 0) {
      const healed = restorePlayerHealth(Math.floor(applyDmg * p.lifesteal / 100), '吸血');
      if (healed > 0) {
        record({ turn, type: 'heal', message: `【吸血】恢复 ${healed} 点生命。`, playerHp: p.hp, enemyHp: e.hp });
      }
    }
    if (!isPlayer && skillUsed?.enemyLifesteal > 0 && applyDmg > 0 && e.hp > 0) {
      const resisted = Math.min(1, Math.max(0, traitEffect.lifestealResist || 0));
      const healed = Math.min(e.maxHp - e.hp, Math.floor(applyDmg * skillUsed.enemyLifesteal * (1 - resisted)));
      if (healed > 0) {
        e.hp += healed;
        record({ turn, type: 'heal', message: `【首领汲取】${skillUsed.name} 从实际生命伤害汲取 ${healed} 点生命${resisted ? '（庇护削弱）' : ''}。`, playerHp: p.hp, enemyHp: e.hp });
      }
    }

    if (isSlowSkill && defender.hp > 0 && !defender.statuses.some(status => status.type === 'slow')) {
      defender.speed *= 1 - skillUsed.slowRate;
      defender.statuses.push({ type: 'slow' });
      record({ turn, type: 'status', message: `【寒冰减速】${defender.name} 速度降低 ${Math.round(skillUsed.slowRate * 100)}%。`, playerHp: p.hp, enemyHp: e.hp });
    }

    if (!isPlayer && reflectDmg > 0 && applyDmg > 0) {
      const reflected = Math.floor(applyDmg * reflectDmg);
      damageEnemy(reflected);
      record({ turn, type: 'damage', message: `【烈焰护盾】反弹 ${reflected} 点伤害。`, playerHp: p.hp, enemyHp: e.hp });
    }

    // 宠物特性触发 (攻击命中后)
    if (isPlayer && isPetActive) {
      if (traitEffect.weakenChance && defender.hp > 0 && Math.random() * 100 < traitEffect.weakenChance) {
        const first = !e.statuses.some(status => status.type === 'weaken');
        applyEnemyStatus({ type: 'weaken', ratio: traitEffect.weakenRatio, duration: 3 });
        if (first) record({ turn, type: 'status', message: `【鸟妖·虚弱】目标攻击力降低 ${Math.round(traitEffect.weakenRatio * 100)}%，持续目标的3次行动。`, playerHp: p.hp, enemyHp: e.hp });
      }
      if (traitEffect.grievDmgBonus && defender.hp > 0 && !e.statuses.some(status => status.type === 'wound')) {
        applyEnemyStatus({ type: 'wound', damageBonus: traitEffect.grievDmgBonus, critBonus: traitEffect.grievCritBonus });
        record({ turn, type: 'status', message: '【重创】目标受到伤害与暴击几率提高，不重复叠加。', playerHp: p.hp, enemyHp: e.hp });
      }
      // 光灵【破魔】
      if (traitEffect.manaBurnRate && e.mp > 0) {
        const burnMp = Math.min(e.mp, Math.floor(applyDmg * traitEffect.manaBurnRate));
        e.mp -= burnMp;
        updateRecoverySeal();
        record({
          turn,
          type: 'special',
          message: `【光灵·破魔】光灵真辉爆发，同时焚烧了 ${e.name} ${burnMp} 点魔法值！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }

      // 魅魔【混乱】
      if ((traitEffect.confuseChance || traitEffect.confuseBonus) && defender.hp > 0 && Math.random() * 100 < (traitEffect.confuseChance || 0) + (traitEffect.confuseBonus || 0)) {
        applyEnemyStatus({ type: 'confusion', duration: 1 });
        record({
          turn,
          type: 'status',
          message: `【魅魔·混乱】暗夜魅魔轻吐香风，${e.name} 意志沦陷陷入混乱！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }

      // 小恶魔【毒刺】
      const poisonBook = petLearnedSkills.includes('high_poison') ? PET_SKILL_BOOKS.book_poison.effect : {};
      const poisonRate = Math.max(traitEffect.poisonRate || 0, poisonBook.poisonRate || 0);
      if (poisonRate && applyDmg > 0 && defender.hp > 0) {
        applyEnemyStatus({ type: 'poison', dmg: Math.floor(applyDmg * poisonRate), duration: poisonBook.poisonDuration || 2 });
        record({
          turn,
          type: 'status',
          message: `【腐蚀毒刺】剧毒刺入血肉，目标每10秒受到一次毒伤！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }

      // 金龙【连击】
      const comboChance = Math.max(traitEffect.doubleStrikeChance || 0, petLearnedSkills.includes('high_multihit') ? PET_SKILL_BOOKS.book_multihit.effect.multiHitChance : 0);
      if (comboChance && defender.hp > 0 && Math.random() * 100 < comboChance && !isDoubleHitSkill) {
        const secondDmg = damageEnemy(Math.max(10, Math.floor(finalDmg * (traitEffect.secondStrikeMultiplier || 0.6))));
        record({
          turn,
          type: 'damage',
          message: `【金龙·连击】金龙怒啸掠过，顺势触发第二次猛攻，造成追加 ${secondDmg} 点伤害！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }
    }

    if (isPlayer && !skillUsed && defender.hp > 0 && playerStats.doubleStrike && Math.random() * 100 < playerStats.doubleStrike) {
      const secondDmg = damageEnemy(finalDmg);
      record({ turn, type: 'damage', message: `【套装连击】普攻追加第二击，造成 ${secondDmg} 点伤害！`, playerHp: p.hp, enemyHp: e.hp });
    }

    // 连击技能额外一段伤害 (如战士疾风连击)
    if (isDoubleHitSkill && defender.hp > 0) {
      const extraDmg = damageEnemy(Math.max(10, Math.floor(finalDmg * 0.95)));
      record({
        turn,
        type: 'damage',
        message: `【疾风再斩】剑光骤现，第二击紧随而至追加斩击造成 ${extraDmg} 点连击伤害！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 敌方反击判定 (冬狼【偷袭】绝对免反击)
    if (defender.hp > 0) {
      const isAntiCounter = isPlayer && traitEffect.antiCounter;
      if (!isAntiCounter && Math.random() * 100 < defender.counter) {
        const counterMultiplier = !isPlayer && petLearnedSkills.includes('high_counter') ? 1 + PET_SKILL_BOOKS.book_counter.effect.counterDmgBonus : 1;
        const rawCounter = Math.max(10, Math.floor(defender.atk * 0.65 * counterMultiplier));
        const counterDmg = isPlayer ? (tryFeignDeath(rawCounter) ? 0 : rawCounter) : damageEnemy(rawCounter);
        if (isPlayer) attacker.hp = Math.max(0, attacker.hp - counterDmg);
        record({
          turn,
          type: 'counter',
          message: `【反击怒斩】${defender.name} 稳住身形悍然反击，反刺 ${attacker.name} 造成 ${counterDmg} 点伤害！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }
    }

    // 阵亡判定与复活 (古堡探险 1 次免费复活 / 凤凰【复活】 / 圣遗物阿瓦隆圣鞘)
    if (p.hp <= 0) {
      if (checkDeathPrevention()) {
        return;
      }
    }
  }

  // 结算判定
  const victory = p.hp > 0 && e.hp <= 0;
  record({
    turn: Math.min(turn, maxTurns),
    type: 'end',
    victory,
    message: victory
      ? `【战斗大捷】勇者 ${p.name} 斩落了 ${e.name}，大获全胜！`
      : p.hp > 0 && e.hp > 0 ? '【战斗超时】300秒内未能击败对手，本次挑战失败。'
        : `【战败退却】勇者 ${p.name} 在与 ${e.name} 的决斗中力竭负伤，不得不退回休整...`,
    playerHp: p.hp,
    enemyHp: e.hp
  });

  return { victory, logs, remainingHp: p.hp, remainingMp: p.mp, duration: elapsed, actionCounts,
    initialIntervals, timedOut: p.hp > 0 && e.hp > 0 };
}
