// 宠物打书魔典库配置 (2010魔塔经典契约魔导书系统)
export const PET_SKILL_BOOKS = {
  book_poison: {
    id: 'book_poison', name: '远古魔导书·【腐蚀毒刺】', skillId: 'high_poison', skillName: '腐蚀毒刺',
    icon: 'images/items/skill_book.svg', quality: 'darkgold',
    desc: '命中后附加实际生命伤害15%的毒伤，每10秒结算一次，共2次；再次命中刷新，不叠加。',
    effect: { poisonRate: 0.15, poisonDuration: 2 }
  },
  book_counter: {
    id: 'book_counter',
    name: '远古魔导书·【高级反击】',
    skillId: 'high_counter',
    skillName: '高级反击',
    icon: 'skill_counter',
    quality: 'darkgold',
    desc: '受到普通物理攻击时，反击几率提升 30%，反击伤害额外提升 40%！',
    effect: { counterBonus: 30, counterDmgBonus: 0.4 }
  },
  book_multihit: {
    id: 'book_multihit',
    name: '远古魔导书·【高级连击】',
    skillId: 'high_multihit',
    skillName: '高级连击',
    icon: 'skill_multihit',
    quality: 'darkgold',
    desc: '出手攻击时有 35% 几率触发双连击，能再次进行一次迅捷普攻！',
    effect: { multiHitChance: 35 }
  },
  book_lifesteal: {
    id: 'book_lifesteal',
    name: '远古魔导书·【高级吸血】',
    skillId: 'high_lifesteal',
    skillName: '高级吸血',
    icon: 'skill_lifesteal',
    quality: 'purple',
    desc: '主角攻击与技能造成的伤害，25% 转化为自身生命值恢复！',
    effect: { lifestealBonus: 25 }
  },
  book_crit: {
    id: 'book_crit',
    name: '远古魔导书·【高级必杀】',
    skillId: 'high_crit',
    skillName: '高级必杀',
    icon: 'skill_crit',
    quality: 'purple',
    desc: '暴击率提升 15%，暴击伤害由 185% 跃升为 240%！',
    effect: { critBonus: 15, critDmgMultiplier: 2.4 }
  },
  book_purify: {
    id: 'book_purify',
    name: '远古魔导书·【神圣净化】',
    skillId: 'high_purify',
    skillName: '神圣净化',
    icon: 'skill_purify',
    quality: 'darkgold',
    desc: '圣光庇佑！绝对免疫任何混乱、眩晕、冰冻与流血负面状态！',
    effect: { immuneStatus: true }
  },
  book_rebirth: {
    id: 'book_rebirth',
    name: '远古魔导书·【高级神佑】',
    skillId: 'high_rebirth',
    skillName: '高级神佑',
    icon: 'skill_rebirth',
    quality: 'darkgold',
    desc: '阵亡时有 35% 几率触发神圣复生，复活并恢复 50% 生命值（每场战斗生效一次）！',
    effect: { rebirthChance: 35, healPercent: 0.5 }
  },
  book_iron_skin: {
    id: 'book_iron_skin',
    name: '远古魔导书·【钢铁硬化】',
    skillId: 'iron_skin',
    skillName: '钢铁硬化',
    icon: 'skill_iron_skin',
    quality: 'purple',
    desc: '天生坚韧！受到的一切物理与法术伤害固定减免 20%！',
    effect: { dmgReduction: 0.2 }
  },
  book_swift: {
    id: 'book_swift',
    name: '远古魔导书·【高级神速】',
    skillId: 'high_swift',
    skillName: '高级神速',
    icon: 'skill_swift',
    quality: 'purple',
    desc: '行动速度提升30点，缩短出手间隔；战斗中闪避率提升14%。',
    effect: { speedBonus: 30, dodgeBonus: 14 }
  }
};
