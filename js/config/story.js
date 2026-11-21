// Shared progression curve and finite investigations earned through real battles.
import { DUNGEON_GATES } from './dungeons.js';

export const JOURNEY_DIALOGUE = {
  guard: {
    instructions: '接受委托后领取武器和护胸，再去行囊穿戴。',
    accepted: '罗兰交给你武器和护胸。先穿好，再出城。',
    speaker: { name: '守备官罗兰', portrait: 'warrior' },
    labels: { confirmLabel: '接受委托', cancelLabel: '稍后' }
  },
  epilogue: {
    title: '王都的归途',
    text: [
      '罗兰：巡逻队的幸存者已经回家。城外的道路终于恢复了往来。',
      '米拉：最初只是一份寻人的委托，没想到我们能走到这里。谢谢你没有放弃。',
      '赛拉：你的伙伴也该休息一下了。古门里还有未知的故事，等你准备好，我们再出发。',
      '你可以继续探索未通关的古门、培养新的伙伴，或挑战角斗场。'
    ].join('\n\n')
  },
  investigation(event, exp) {
    const experience = exp ? `经验 +${exp}，` : '调查经验已随战斗获得，';
    return `${event.speaker}：调查记录已经收好。补给和口粮交给你，继续追查下一条线索。\n\n${experience}声望 +${event.prestige}，伙伴口粮 x3。`;
  }
};

export const levelExperience = level => Math.floor(100 * Math.pow(level, 1.8) + level * 80);
const budget = (from, to) => Array.from({ length: to - from }, (_, i) => levelExperience(from + i)).reduce((a, b) => a + b, 0);
const episode = (id, title, speaker, text, action, target, count, from, to, prestige) => ({ id, title, speaker, text, action, target, count, exp: budget(from, to), prestige });
export const REGIONAL_STORIES = {
  quest_11: [
    episode('patrol_tracks', '寻找巡逻队的足迹', '守备官罗兰', '队员留下的血迹通往森林深处。击退4批林地魔物，找到最后一处营地；别急着与巨龙正面交锋。', 'wild', 'forest', 4, 13, 18, 80),
    episode('patrol_wolf', '救出被围困的斥候', '斥候米拉', '狼群困住了幸存的巡逻队。击败森林狼王，我就能带你辨认通往古门的路线。', 'boss', 'forest', 1, 18, 20, 80),
    episode('patrol_gate', '清理旧哨站', '斥候米拉', '试炼之门曾是巡逻队的旧哨站。完成五层调查，找回藏在关底的补给记录。', 'dungeon', 'trial_gate', 1, 20, 25, 80),
    episode('patrol_convoy', '护送幸存商队', '守备官罗兰', '商队见过龙焰，也见过有人运走王室秘宝。在峡谷击退6批魔物，把他们护送到安全的营地。', 'wild', 'canyon', 6, 25, 30, 80)
  ],
  quest_19: [
    episode('starmap_route', '辨认星图上的旧路', '斥候米拉', '女盗的星图标出了峡谷出口。击退6批峡谷魔物，查明前往极地的道路。', 'wild', 'canyon', 6, 36, 40, 200),
    episode('starmap_mirage', '穿过迷失的回廊', '学者艾琳', '变幻之门保存着星图的另一半。带上伙伴完成十层调查，找回被幻象遮住的坐标。', 'dungeon', 'mirage_gate', 1, 40, 45, 200),
    episode('starmap_supplies', '准备极地远征', '斥候米拉', '银龙的气息使荒原魔物躁动。击退6批荒原魔物，保护远征补给，让伙伴恢复体力后再出发。', 'wild', 'wasteland', 6, 45, 50, 200)
  ],
  quest_22: [
    episode('rift_traces', '追踪祭品车队', '守备官罗兰', '截获的军令指向荒原。击退6批魔物，找出祭品车队留下的黑焰印记。', 'wild', 'wasteland', 6, 52, 60, 400),
    episode('rift_storm', '夺回风暴观测站', '学者艾琳', '风暴之门能测定裂隙方向。完成十层调查，夺回被龙裔控制的观测站。', 'dungeon', 'storm_gate', 1, 60, 65, 400),
    episode('rift_swamp', '切断沼泽运输线', '守备官罗兰', '祭品正穿过毒瘴沼泽。击退6批魔物，截断运输线，再向巨龙之门推进。', 'wild', 'swamp', 6, 65, 70, 400)
  ],
  quest_24: [
    episode('oath_rescue', '救援裂隙前线', '圣光主教艾莲娜', '圣翼的供能已经切断，但前线仍有士兵被困。击退6批沼泽魔物，让伤员安全撤离；他们会为你的远征作证。', 'wild', 'swamp', 6, 71, 75, 1500),
    episode('oath_seal', '封存黑焰祭坛', '学者艾琳', '再次完整清理巨龙之门，封存祭坛。王国将以这次行动认可你的远征资格，而不是要求你空等声望。', 'dungeon', 'dragon_gate', 1, 75, 80, 1500)
  ]
};
export function getInvestigationSteps(event) {
  return event.action === 'dungeon' ? DUNGEON_GATES.find(gate => gate.id === event.target).totalFloors : event.count;
}

export function getInvestigationEarnedExperience(event, progress) {
  const steps = getInvestigationSteps(event);
  const completed = progress.current === event.count;
  const current = event.action === 'dungeon' ? completed ? steps : progress.floorProgress || 0 : progress.current;
  return Math.floor(event.exp * current / steps);
}

export function getRegionalStory(data) {
  if (data.onboardingVersion !== 2) return null;
  return (REGIONAL_STORIES[data.currentQuestId] || []).find(event => !data.questProgress?.[event.id]?.claimed) || null;
}
