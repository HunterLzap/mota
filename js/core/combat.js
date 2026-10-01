// 核心文字战报战斗引擎：100% 还原《魔塔世界》百度百科原著
// 覆盖：22 种神兽正版特性（连击、祝福恒定最大、虚弱、混乱、不屈、致死、复活、偷袭免反击、假死等）
// 职业原版 9 大技能/光环/被动、古堡探险免费复活一次、侍从助战
import { CLASSES, NATIONS, getClassSkills } from '../config/classes.js';
import { PET_CONFIGS } from '../config/pets.js';
import { MERCENARIES } from '../config/estate.js';
import { getSynergyStrike } from '../config/dungeons.js';
import { PET_SKILL_BOOKS } from '../config/petSkills.js';

export function runCombat(playerStats, enemyStats, playerData, enemyData) {
  const cls = CLASSES[playerData.classId] || CLASSES.warrior;
  const skills = getClassSkills(cls.id, playerStats.skillLevelBonus || 0);
  const passive = skills.filter(skill => skill.category === 'passive').map(skill => skill.effect || {});
  const aura = enemyData.isPvp ? [] : skills.filter(skill => skill.category === 'aura').map(skill => skill.effect || {});
  const sumEffect = (effects, key) => effects.reduce((sum, effect) => sum + (effect[key] || 0), 0);
  const logs = [];
  const configuredAbilities = enemyData.abilities ?? enemyStats.abilities ?? [];
  const enemyAbilities = Array.isArray(configuredAbilities) ? configuredAbilities.filter(ability => Number.isInteger(ability.interval) && ability.interval >= 2) : [];
  const enemyRebirth = enemyData.rebirth ?? enemyStats.rebirth;
  let turn = 1;
  const maxTurns = 35;

  // 出战宠物与体力检测 (体力低于 60 则特性失效)
  const activePetObj = playerData.pets ? playerData.pets.find(p => p.id === playerData.activePetId) : null;
  const petCfg = activePetObj ? PET_CONFIGS[activePetObj.id] : null;
  const petStamina = activePetObj ? (activePetObj.stamina !== undefined ? activePetObj.stamina : 100) : 100;
  const isPetActive = petCfg && petStamina >= 60;
  const petLearnedSkills = isPetActive ? Object.values(PET_SKILL_BOOKS)
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
    feignDeathUsed: false,
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
    shield: hasPhases ? phase1Shield : 0,
    maxShield: hasPhases ? phase1Shield : 0,
    phase2EnrageHp,
    phase3Minion,
    isEnraged: false,
    phase3Triggered: false
  };
  e.preparedAbility = null;

  // 宠物特性参数快捷提取
  const petTrait = isPetActive ? petCfg.traitName : null;
  const traitEffect = isPetActive ? petCfg.traitEffect || {} : {};
  p.speed *= 1 + (traitEffect.speedBoostPct || 0);
  p.counter = Math.min(75, p.counter + (traitEffect.counterBoost || 0));
  p.lifesteal *= 1 + (traitEffect.lifestealBoost || 0);
  const hasPurify = Boolean(traitEffect.immuneControl || petLearnedSkills.includes('high_purify'));
  p.atk *= 1 + sumEffect(aura, 'teamAtkBoost');
  p.hit += sumEffect(aura, 'teamHitBoost');
  p.speed *= 1 + sumEffect(aura, 'teamSpeedBoost');
  const mpShieldRate = sumEffect(passive, 'mpShieldRate');
  const reflectDmg = sumEffect(passive, 'reflectDmg');

  // 开场战报
  logs.push({
    turn: 0,
    type: 'start',
    message: `【战斗开始】勇者 ${p.name} 遭遇了 ${e.name}！双方剑拔弩张！`,
    playerHp: p.hp,
    enemyHp: e.hp
  });

  if (e.hasPhases && e.shield > 0) {
    logs.push({
      turn: 0,
      type: 'warning',
      message: `【多阶段首领战】${e.name} 周身笼罩着【远古神圣护盾】（护盾值: ${e.shield}）！必须彻底碎灭护盾方可直伤其本体！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
    if (enemyData.dialogue) {
      logs.push({
        turn: 0,
        type: 'special',
        message: `【首领战前咆哮】${e.name} 狂笑道：“${enemyData.dialogue}”`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }
  }

  if (nationCfg) {
    logs.push({
      turn: 0,
      type: 'passive',
      message: `【国家天命】所属【${nationCfg.name}】：${nationCfg.buffDesc}！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }

  if (activePetObj && petCfg) {
    if (petStamina < 60) {
      logs.push({
        turn: 0,
        type: 'warning',
        message: `【神兽乏力】出战神兽【${petCfg.name}】体力仅剩 ${petStamina}/100（低于60），神兽特性【${petCfg.traitName}】暂已失效！请及时喂食魔能兽肉排！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    } else {
      logs.push({
        turn: 0,
        type: 'passive',
        message: `【神兽随行】神兽【${petCfg.name}】昂首出阵！激活原著专属特性【${petCfg.traitName}】— ${petCfg.traitDesc}`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }
  }

  if (assistingSlave) {
    logs.push({
      turn: 0,
      type: 'passive',
      message: `【侍从助战】俘虏侍从【${assistingSlave.name}】戴罪立功，手持锁链协同主人出战！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }

  if (hiredMerc) {
    if (hiredMerc.id === 'merc_paladin') {
      logs.push({
        turn: 0,
        type: 'passive',
        message: `【佣兵援护】${hiredMerc.name} 踏步向前竖起钢铁巨盾，全队获得【${hiredMerc.aura}】，受到的伤害减免 18%！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    } else if (hiredMerc.id === 'merc_bard') {
      p.speed += 25;
      logs.push({
        turn: 0,
        type: 'passive',
        message: `【佣兵援护】${hiredMerc.name} 拨动鲁特琴奏响【${hiredMerc.aura}】，先手速度提升 25 点！`,
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
        logs.push({
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
    logs.push({
      turn: 0,
      type: 'passive',
      message: `【圣遗物·所罗门印戒】金光大盛！所罗门统御万象神威压制【${e.name}】，使其速度降低 20%，攻击力降低 15%！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }
  if (unlockedRelics.length > 0) {
    logs.push({
      turn: 0,
      type: 'passive',
      message: `【远古圣遗物】已觉醒 ${unlockedRelics.length} 大神圣圣遗物！传世神圣光环庇护勇者征战！`,
      playerHp: p.hp,
      enemyHp: e.hp
    });
  }

  // 战斗主循环
  while (p.hp > 0 && e.hp > 0 && turn <= maxTurns) {
    const playerFirst = p.speed >= e.speed;
    const firstActor = playerFirst ? 'player' : 'enemy';
    const secondActor = playerFirst ? 'enemy' : 'player';

    executeAction(firstActor);
    checkEnemyRebirth();
    checkBossPhases();
    if (p.hp <= 0 || e.hp <= 0) break;

    executeAction(secondActor);
    checkEnemyRebirth();
    checkBossPhases();
    if (p.hp <= 0 || e.hp <= 0) break;

    const auraHeal = Math.min(p.maxHp - p.hp, Math.floor(p.maxHp * sumEffect(aura, 'teamRegenHp')));
    const auraMana = Math.min(p.maxMp - p.mp, sumEffect(aura, 'teamRegenMp'));
    if (auraHeal > 0 || auraMana > 0) {
      p.hp += auraHeal;
      p.mp += auraMana;
      logs.push({ turn, type: 'heal', message: `【职业光环】恢复生命 ${auraHeal}、魔力 ${auraMana}。`, playerHp: p.hp, enemyHp: e.hp });
    }
    const regenPercent = Math.max(0, ...(playerData.estate?.activePotions || [])
      .filter(potion => (potion.remainingFights ?? potion.effect?.fights ?? 0) > 0)
      .map(potion => potion.effect?.regenPercent || 0));
    const potionHeal = Math.min(p.maxHp - p.hp, Math.floor(p.maxHp * regenPercent));
    if (potionHeal > 0) {
      p.hp += potionHeal;
      logs.push({ turn, type: 'heal', message: `【圣水祝福】恢复 ${potionHeal} 点生命。`, playerHp: p.hp, enemyHp: e.hp });
    }

    // 回合末神兽再生（银龙【再生】）
    if (isPetActive && petTrait === '再生') {
      const regenVal = Math.floor(p.maxHp * traitEffect.regenHpPct);
      if (p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + regenVal);
        logs.push({
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
      const yggRegen = Math.floor(p.maxHp * 0.08);
      p.hp = Math.min(p.maxHp, p.hp + yggRegen);
      logs.push({
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
      logs.push({
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
    const slow = p.statuses.find(status => status.type === 'slow' && status.duration);
    if (slow && --slow.duration <= 0) {
      p.speed /= 1 - slow.ratio;
      p.statuses = p.statuses.filter(status => status !== slow);
      logs.push({ turn, type: 'status', message: '【减速结束】勇者行动速度恢复。', playerHp: p.hp, enemyHp: e.hp });
    }
    if (p.hp <= 0 || e.hp <= 0) break;

    turn++;
  }

  function checkEnemyRebirth() {
    if (e.hp > 0 || e.rebirthAttempted || !enemyRebirth || !Number.isFinite(enemyRebirth.hpRatio) || enemyRebirth.hpRatio <= 0 || enemyRebirth.hpRatio > 1) return;
    e.rebirthAttempted = true;
    if (traitEffect.antiRevive) {
      logs.push({ turn, type: 'special', message: `【蛇女·致死】封断重生契约，${e.name} 的【${enemyRebirth.name}】无法复活！`, playerHp: p.hp, enemyHp: e.hp });
      return;
    }
    e.hp = Math.max(1, Math.floor(e.maxHp * enemyRebirth.hpRatio));
    e.preparedAbility = null;
    logs.push({ turn, type: 'heal', message: `【首领重生】${e.name} 发动【${enemyRebirth.name}】，恢复 ${e.hp} 点生命！本场仅一次。`, playerHp: p.hp, enemyHp: e.hp });
  }

  function checkDeathPrevention() {
    if (p.hp > 0) return false;
    if (petLearnedSkills.includes('high_rebirth') && !p.rebirthTriggered) {
      p.rebirthTriggered = true;
      if (Math.random() * 100 < PET_SKILL_BOOKS.book_rebirth.effect.rebirthChance) {
        p.hp = Math.floor(p.maxHp * PET_SKILL_BOOKS.book_rebirth.effect.healPercent);
        logs.push({ turn, type: 'heal', message: `【高级神佑】复生并恢复 ${p.hp} 点生命！`, playerHp: p.hp, enemyHp: e.hp });
        return true;
      }
    }

    // 检查阿瓦隆仙子圣鞘免死
    if (unlockedRelics.includes('relic_avalon') && !p.relicAvalonUsed) {
      p.relicAvalonUsed = true;
      p.hp = Math.floor(p.maxHp * 0.35);
      logs.push({
        turn,
        type: 'heal',
        message: `【圣遗物·阿瓦隆圣鞘】生命垂危之际唤醒仙子结界！驱散致死打击，自愈恢复 ${p.hp} 点生命值！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
      return true;
    }

    // 检查凤凰【复活】
    if (isPetActive && petTrait === '复活' && !p.phoenixRevived) {
      p.phoenixRevived = true;
      if (Math.random() * 100 < traitEffect.reviveChance) {
        p.hp = Math.floor(p.maxHp * traitEffect.reviveHpPct);
        logs.push({
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
      logs.push({
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

  function resolveTurnEndDot(entity, name) {
    const poison = entity.statuses.find(s => s.type === 'poison');
    if (poison) {
      let dmg = poison.dmg;
      if (entity === e) dmg = Math.floor(dmg * (1 + (traitEffect.dotBoost || 0)));
      if (entity === p && isPetActive && petTrait === '庇护') {
        dmg = Math.floor(dmg * 0.2); // 庇护降低 80% 持续伤害
      }
      if (entity === p && playerStats.dmgResist) dmg = Math.floor(dmg * (1 - Math.min(0.5, playerStats.dmgResist / 100)));
      if (entity === p && mpShieldRate > 0 && p.mp > 0) {
        const absorbed = Math.min(p.mp, Math.floor(dmg * mpShieldRate));
        p.mp -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) logs.push({ turn, type: 'special', message: `【寒冰护盾】消耗 ${absorbed} 魔力抵消毒伤。`, playerHp: p.hp, enemyHp: e.hp });
      }
      dmg = Math.min(entity.hp, dmg);
      entity.hp = Math.max(0, entity.hp - dmg);
      if (entity === p && p.hp > 0 && playerStats.magicAbsorb) {
        const restored = Math.min(p.maxMp - p.mp, Math.floor(dmg * playerStats.magicAbsorb / 100));
        p.mp += restored;
        if (restored > 0) logs.push({ turn, type: 'special', message: `【法力吸收】毒伤转化为 ${restored} 点魔力。`, playerHp: p.hp, enemyHp: e.hp });
      }
      logs.push({
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
    if (absorbed > 0) logs.push({ turn, type: 'special',
      message: `【神圣护盾】抵御追加攻击 ${absorbed} 点，余盾 ${e.shield}。`,
      playerHp: p.hp, enemyHp: e.hp });
    return dealt;
  }

  function applyEnemyStatus(status) {
    if (status.duration) status.duration = Math.ceil(status.duration * (traitEffect.debuffDurationBoost || 1));
    const existing = e.statuses.find(current => current.type === status.type);
    if (existing) Object.assign(existing, status);
    else e.statuses.push(status);
  }

  function applyPlayerStatus(status, damage) {
    const names = { poison: '剧毒', weaken: '虚弱', slow: '减速', stun: '眩晕', confusion: '混乱', wound: '重创' };
    const immune = petLearnedSkills.includes('high_purify') ||
      (traitEffect.immuneControl && ['stun', 'confusion'].includes(status.type)) ||
      (traitEffect.immuneDebuffs && ['weaken', 'slow', 'wound'].includes(status.type));
    if (immune) {
      logs.push({ turn, type: 'status', message: `【神圣庇佑】免疫${names[status.type] || '不良状态'}。`, playerHp: p.hp, enemyHp: e.hp });
      return;
    }
    const applied = { ...status };
    if (status.type === 'poison') applied.dmg = Math.floor(damage * status.rate);
    const existing = p.statuses.find(current => current.type === status.type);
    if (status.type === 'slow' && !existing) p.speed *= 1 - status.ratio;
    if (existing) Object.assign(existing, applied);
    else p.statuses.push(applied);
    logs.push({ turn, type: 'status', message: `【首领法术】勇者陷入${names[status.type] || '不良状态'}，持续${status.duration}回合。`, playerHp: p.hp, enemyHp: e.hp });
  }

  function interruptEnemySpell() {
    if (e.preparedAbility) {
      logs.push({ turn, type: 'status', message: `【施法中断】${e.name} 的【${e.preparedAbility.ability.name}】被控制打断。`, playerHp: p.hp, enemyHp: e.hp });
      e.preparedAbility = null;
    }
  }

  function checkBossPhases() {
    // 多阶段首领：P2 绝境狂暴 与 P3 冥府死契
    if (e.hasPhases && e.hp > 0) {
      if (!e.isEnraged && e.hp <= e.phase2EnrageHp) {
        e.isEnraged = true;
        const atkBuff = Math.floor(e.atk * 0.35);
        e.atk += atkBuff;
        logs.push({
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
        logs.push({
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
        logs.push({
          turn,
          type: 'status',
          message: `【圣光辟邪】${attacker.name} 免疫眩晕，金芒闪烁瞬间驱散异常！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
        attacker.statuses.splice(stunIdx, 1);
      } else {
        if (!isPlayer) interruptEnemySpell();
        logs.push({
          turn,
          type: 'status',
          message: `【眩晕倒地】${attacker.name} 头晕目眩，无法动弹，跳过本回合！`,
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
        logs.push({
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
        logs.push({
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

    // 佣兵与神兽全屏合击奥义判定 (第 3 回合或首领护盾存在且未释放过)
    if (isPlayer && !p.synergyStrikeUsed && (hiredMerc || isPetActive) && (turn === 3 || (e.shield > 0 && turn >= 2)) && defender.hp > 0) {
      p.synergyStrikeUsed = true;
      const petId = activePetObj ? activePetObj.id : '';
      const mercId = hiredMerc ? hiredMerc.id : '';
      const strike = getSynergyStrike(p.classId, mercId, petId);

      let synergyDmg = Math.floor(p.atk * strike.mult * 1.5);

      if (strike.shatterShield && e.shield > 0) {
        const brokenShield = e.shield;
        e.shield = 0;
        logs.push({
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
          logs.push({
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
          logs.push({
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
        const healAmt = Math.floor(p.maxHp * strike.healPct);
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
      }

      if (strike.stun && defender.hp > 0) {
        applyEnemyStatus({ type: 'stun', duration: 1 });
      }

      if (strike.defReduce && defender.hp > 0) {
        const defCut = Math.floor(defender.def * strike.defReduce);
        defender.def = Math.max(10, defender.def - defCut);
      }

      const allyName = hiredMerc ? hiredMerc.name : (petCfg ? petCfg.name : '随行契约者');
      logs.push({
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
      if (e.preparedAbility && turn >= e.preparedAbility.dueTurn) {
        const ability = e.preparedAbility.ability;
        e.preparedAbility = null;
        if (e.mp >= ability.mpCost) {
          skillUsed = ability;
          e.mp -= ability.mpCost;
          dmgMultiplier = ability.multiplier || 1;
        } else logs.push({ turn, type: 'status', message: `【施法中断】${e.name} 魔力不足，无法释放【${ability.name}】。`, playerHp: p.hp, enemyHp: e.hp });
      }
      if (!e.preparedAbility && !skillUsed) {
        const ability = enemyAbilities.find(ability => turn % ability.interval === ability.interval - 1 && e.mp >= ability.mpCost);
        if (ability) {
          e.preparedAbility = { ability, dueTurn: turn + 1 };
          logs.push({ turn, type: 'warning', message: `【首领蓄势】${e.name} 正在蓄势【${ability.name}】，下次行动将释放！控制可打断，对应神兽庇佑可抵御。`, playerHp: p.hp, enemyHp: e.hp });
        }
      }
    }

    if (isPlayer) {
      const activeSkills = skills.filter(s => s.category === 'attack');
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
    if (Math.random() * 100 > hitChance) {
      logs.push({
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
    if (isPlayer && isPetActive && petTrait === '祝福') {
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
    if (wound) extraCrit += wound.critBonus;
    const targetDef = Math.max(0, defender.def - (isPlayer ? playerStats.armorBreak || 0 : 0)) * (isPlayer && activeRunicWords.includes('oath') ? 0.82 : 1.0);
    const rawDmg = Math.max(15, (attacker.atk * atkBonusPct * dmgMultiplier) - Math.floor(targetDef * 0.55));
    let finalDmg = Math.floor(rawDmg * rollRatio);
    if (wound) finalDmg = Math.floor(finalDmg * (1 + wound.damageBonus));
    if (isPlayer && playerStats.dmgBonus) finalDmg = Math.floor(finalDmg * (1 + playerStats.dmgBonus / 100));
    if (isPlayer && ((skillUsed && p.classId === 'mage') || (playerStats.armorBreak || 0) > 0) && playerStats.magicDmg) finalDmg = Math.floor(finalDmg * (1 + playerStats.magicDmg / 100));
    if (isPlayer && defender.hp <= defender.maxHp * 0.3 && playerStats.finishDmg) finalDmg = Math.floor(finalDmg * (1 + playerStats.finishDmg / 100));

    // 暴击判定
    const firstStrikeCrit = isPlayer && turn === 1 && activeRunicWords.includes('hermes') ? 20 : 0;
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

    // 造成伤害
    let applyDmg = finalDmg;
    if (!isPlayer && hiredMerc && hiredMerc.id === 'merc_paladin') {
      applyDmg = Math.floor(applyDmg * 0.82); // 佣兵减免 18%
    }
    if (!isPlayer && playerStats.dmgResist) {
      const resistRatio = Math.min(0.5, playerStats.dmgResist / 100);
      applyDmg = Math.floor(applyDmg * (1 - resistRatio));
    }
    if (!isPlayer && skillUsed?.damageType === 'magic') applyDmg = Math.floor(applyDmg * (1 - Math.min(0.6, Math.max(0, (playerStats.magicResist || 0) / 100))));

    if (!isPlayer && mpShieldRate > 0 && p.mp > 0) {
      const absorbed = Math.min(p.mp, Math.floor(applyDmg * mpShieldRate));
      p.mp -= absorbed;
      applyDmg -= absorbed;
      if (absorbed > 0) logs.push({ turn, type: 'special', message: `【寒冰护盾】消耗 ${absorbed} 魔力抵消等量伤害。`, playerHp: p.hp, enemyHp: e.hp });
    }

    // 小妖精【假死】判定
    if (!isPlayer && defender.hp <= applyDmg && isPetActive && petTrait === '假死' && !p.feignDeathUsed) {
      if (Math.random() * 100 < traitEffect.feignDeathChance) {
        p.feignDeathUsed = true;
        logs.push({
          turn,
          type: 'special',
          message: `【小妖精·假死】受到致命打击的一瞬，小妖精施展【假死】奇术，本次 ${applyDmg} 点毁灭伤害全数无效！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
        return;
      }
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
        logs.push({ turn, type: 'special', message: `【法力吸收】受到伤害转化为 ${restored} 点魔力。`, playerHp: p.hp, enemyHp: e.hp });
      }
    }

    // 生成出招战报
    let actionDesc = skillUsed ? `施展【${skillUsed.name}】` : `挥舞兵刃发动普攻`;
    let critText = isCrit ? `【暴击致命破击！】` : '';
    let shieldText = shieldAbsorbed > 0 ? (e.shield > 0 ? `（护盾抵御 ${shieldAbsorbed} 点，余盾 ${e.shield}）` : `（护盾粉碎吸收 ${shieldAbsorbed} 点！）`) : '';
    logs.push({
      turn,
      type: isCrit ? 'crit' : 'damage',
      message: `【第${turn}回合】${attacker.name} ${actionDesc}，对 ${defender.name} 造成了 ${applyDmg + shieldAbsorbed} 点伤害！${critText}${shieldText}`,
      playerHp: p.hp,
      enemyHp: e.hp
    });

    checkBossPhases();

    // 符文之语【天罚审判】真实伤害追击
    if (isPlayer && activeRunicWords.includes('divine_wrath') && Math.random() < 0.20 && defender.hp > 0) {
      const smiteDmg = Math.floor(p.atk * 1.5);
      defender.hp = Math.max(0, defender.hp - smiteDmg);
      logs.push({
        turn,
        type: 'crit',
        message: `【天罚审判】诸神降下雷霆裁决！对【${defender.name}】造成 ${smiteDmg} 点神圣破甲真实伤害！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 符文之语【救赎】受击神圣愈合
    if (!isPlayer && activeRunicWords.includes('redemption') && Math.random() < 0.25 && p.hp > 0) {
      p.hp = Math.min(p.maxHp, p.hp + 300);
      logs.push({
        turn,
        type: 'heal',
        message: `【符文之语·救赎】圣光垂怜愈合！${p.name} 受到神圣洗礼，瞬间恢复 300 点生命值！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    // 圣遗物【朗基努斯命运圣枪】暴击神圣裁决真伤
    if (isPlayer && isCrit && unlockedRelics.includes('relic_longinus') && Math.random() < 0.35 && defender.hp > 0) {
      const holyTrueDmg = Math.min(1500, Math.floor(defender.hp * 0.05) + 200);
      defender.hp = Math.max(0, defender.hp - holyTrueDmg);
      logs.push({
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
      logs.push({
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
      logs.push({
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
      const avalonHeal = Math.floor(p.maxHp * 0.35);
      p.hp = Math.min(p.maxHp, p.hp + avalonHeal);
      logs.push({
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
      logs.push({
        turn,
        type: 'status',
        message: `【震荡击晕】${defender.name} 被重箭砸中要害，陷入 1 回合眩晕状态！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }

    if (isLifestealSkill && isPlayer && applyDmg > 0) {
      const healAmt = Math.min(p.maxHp - p.hp, Math.floor(applyDmg * skillUsed.lifestealRate * (1 + (traitEffect.lifestealBoost || 0))));
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      logs.push({
        turn,
        type: 'heal',
        message: `【生命汲取】法术暗影回流，勇者汲取恢复了 ${healAmt} 点生命！`,
        playerHp: p.hp,
        enemyHp: e.hp
      });
    }
    if (isPlayer && p.lifesteal > 0 && applyDmg > 0) {
      const healed = Math.min(p.maxHp - p.hp, Math.floor(applyDmg * p.lifesteal / 100));
      if (healed > 0) {
        p.hp += healed;
        logs.push({ turn, type: 'heal', message: `【吸血】恢复 ${healed} 点生命。`, playerHp: p.hp, enemyHp: e.hp });
      }
    }
    if (!isPlayer && skillUsed?.enemyLifesteal > 0 && applyDmg > 0 && e.hp > 0) {
      const resisted = Math.min(1, Math.max(0, traitEffect.lifestealResist || 0));
      const healed = Math.min(e.maxHp - e.hp, Math.floor(applyDmg * skillUsed.enemyLifesteal * (1 - resisted)));
      if (healed > 0) {
        e.hp += healed;
        logs.push({ turn, type: 'heal', message: `【首领汲取】${skillUsed.name} 从实际生命伤害汲取 ${healed} 点生命${resisted ? '（庇护削弱）' : ''}。`, playerHp: p.hp, enemyHp: e.hp });
      }
    }

    if (isSlowSkill && defender.hp > 0 && !defender.statuses.some(status => status.type === 'slow')) {
      defender.speed *= 1 - skillUsed.slowRate;
      defender.statuses.push({ type: 'slow' });
      logs.push({ turn, type: 'status', message: `【寒冰减速】${defender.name} 速度降低 ${Math.round(skillUsed.slowRate * 100)}%。`, playerHp: p.hp, enemyHp: e.hp });
    }

    if (!isPlayer && reflectDmg > 0 && applyDmg > 0) {
      const reflected = Math.floor(applyDmg * reflectDmg);
      damageEnemy(reflected);
      logs.push({ turn, type: 'damage', message: `【烈焰护盾】反弹 ${reflected} 点伤害。`, playerHp: p.hp, enemyHp: e.hp });
    }

    // 宠物特性触发 (攻击命中后)
    if (isPlayer && isPetActive) {
      if (traitEffect.weakenChance && defender.hp > 0 && Math.random() * 100 < traitEffect.weakenChance) {
        const first = !e.statuses.some(status => status.type === 'weaken');
        applyEnemyStatus({ type: 'weaken', ratio: traitEffect.weakenRatio, duration: 3 });
        if (first) logs.push({ turn, type: 'status', message: `【鸟妖·虚弱】目标攻击力降低 ${Math.round(traitEffect.weakenRatio * 100)}%，持续3回合。`, playerHp: p.hp, enemyHp: e.hp });
      }
      if (traitEffect.grievDmgBonus && defender.hp > 0 && !e.statuses.some(status => status.type === 'wound')) {
        applyEnemyStatus({ type: 'wound', damageBonus: traitEffect.grievDmgBonus, critBonus: traitEffect.grievCritBonus });
        logs.push({ turn, type: 'status', message: '【重创】目标受到伤害与暴击几率提高，不重复叠加。', playerHp: p.hp, enemyHp: e.hp });
      }
      // 光灵【破魔】
      if (petTrait === '破魔' && e.mp > 0) {
        const burnMp = Math.min(e.mp, Math.floor(applyDmg * traitEffect.manaBurnRate));
        e.mp -= burnMp;
        logs.push({
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
        logs.push({
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
        logs.push({
          turn,
          type: 'status',
          message: `【腐蚀毒刺】剧毒刺入血肉，目标每回合将受到流血毒蚀！`,
          playerHp: p.hp,
          enemyHp: e.hp
        });
      }

      // 金龙【连击】
      const comboChance = Math.max(traitEffect.doubleStrikeChance || 0, petLearnedSkills.includes('high_multihit') ? PET_SKILL_BOOKS.book_multihit.effect.multiHitChance : 0);
      if (comboChance && defender.hp > 0 && Math.random() * 100 < comboChance && !isDoubleHitSkill) {
        const secondDmg = damageEnemy(Math.max(10, Math.floor(finalDmg * (traitEffect.secondStrikeMultiplier || 0.6))));
        logs.push({
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
      logs.push({ turn, type: 'damage', message: `【套装连击】普攻追加第二击，造成 ${secondDmg} 点伤害！`, playerHp: p.hp, enemyHp: e.hp });
    }

    // 连击技能额外一段伤害 (如战士疾风连击)
    if (isDoubleHitSkill && defender.hp > 0) {
      const extraDmg = damageEnemy(Math.max(10, Math.floor(finalDmg * 0.95)));
      logs.push({
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
        const counterDmg = isPlayer ? rawCounter : damageEnemy(rawCounter);
        if (isPlayer) attacker.hp = Math.max(0, attacker.hp - counterDmg);
        logs.push({
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
  logs.push({
    turn,
    type: 'end',
    victory,
    message: victory
      ? `【战斗大捷】勇者 ${p.name} 斩落了 ${e.name}，大获全胜！`
      : `【战败退却】勇者 ${p.name} 在与 ${e.name} 的决斗中力竭负伤，不得不退回休整...`,
    playerHp: p.hp,
    enemyHp: e.hp
  });

  return { victory, logs, remainingHp: p.hp, remainingMp: p.mp };
}
