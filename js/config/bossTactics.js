// Read-only encounter guidance; spell timing and effects come from the combat data.
export function getBossTactics(enemy) {
  const tips = [];
  const shield = enemy.openingShield || (enemy.hasPhases ? enemy.phase1Shield : 0);
  if (shield > 0) tips.push(`开场神圣护盾 ${shield.toLocaleString()} 点；普通攻击与技能均可击破。法师职业合击，或圣骑士配合凤凰、精灵龙、黑翼天使的合击可直接破盾。`);
  for (const ability of enemy.abilities || []) {
    tips.push(ability.hpThreshold
      ? `${ability.name}：生命降至${Math.round(ability.hpThreshold * 100)}%时蓄势，下次行动释放，每场只尝试一次；控制打断后不会重试。附加勇者生命上限${Math.round((ability.maxHpDamageRatio || 0) * 100)}%的魔法伤害，魔抗与减伤有效，这部分不会暴击。`
      : `${ability.name}：每${ability.interval}次个人行动施法，前一次行动蓄势；眩晕或混乱可打断，魔力耗尽后停止施法。`);
    if (ability.minHitChance) tips.push(`${ability.name}是范围法术，命中至少${ability.minHitChance}%；仍可闪避，魔抗与减伤有效。`);
    if (ability.echoes) tips.push(`${ability.name}命中后留下${ability.echoes.charges}次余烬：每次勇者行动结束消耗龙皇${ability.echoes.mpCost}魔力，反噬生命上限${Math.round(ability.echoes.maxHpDamageRatio * 100)}%的魔法伤害；眩晕、混乱或破魔可熄灭剩余余烬。不按连击段数重复触发，击败龙皇立即结束。`);
    if (ability.healingSuppression) tips.push(`${ability.name}命中后引导黑焰逆流：生命回复降低${Math.round(ability.healingSuppression.ratio * 100)}%，持续${ability.healingSuppression.duration}秒，不叠加，不压制复活；控制或耗尽龙皇魔力立即中断。净化不能移除首领引导，魔抗与减伤可减少这段时间承受的伤害。`);
    if (ability.manaDrainRatio) tips.push(`${ability.name}命中后抽走勇者当前魔力的${Math.round(ability.manaDrainRatio * 100)}%；有魔力护盾时引发护盾过载，按实抽魔力${ability.manaBacklashMultiplier || 0}倍追加原始魔法反噬，不暴击，魔抗、减伤与剩余魔力护盾有效。没有魔力护盾则只抽魔力。法力吸收装备可补回魔力；控制或破魔可阻止施法，净化不能免除抽取与反噬，无需指定伙伴。`);
  }
  if ((enemy.abilities || []).some(ability => ability.hpThreshold)) tips.push('光灵的破魔可耗尽龙皇魔力，减少后续施法；魔抗装备能减轻龙息，净化仅抵御附带异常，不能免除伤害。');
  const statuses = (enemy.abilities || []).flatMap(ability => ability.statuses || []);
  if (statuses.some(status => ['slow', 'weaken', 'wound'].includes(status.type))) tips.push('独角兽可免疫减速、虚弱与重创；主宠学习神圣净化也可抵御。');
  if (statuses.some(status => ['stun', 'confusion'].includes(status.type))) tips.push('白翼天使可免疫眩晕与混乱；主宠学习神圣净化也可抵御。');
  if (statuses.some(status => status.type === 'poison')) tips.push('银飞马可减轻持续伤害；主宠学习神圣净化可免疫剧毒。');
  if ((enemy.abilities || []).some(ability => ability.enemyLifesteal)) tips.push('银飞马可削弱汲取回复；控制打断也能阻止这次施法。');
  if (enemy.rebirth) tips.push('首领每场可重生一次；纳迦可封断重生，持续输出也可再次击败它。');
  return tips;
}
