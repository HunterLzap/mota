import { getPetParty } from '../petParty.js';
import { PET_CONFIGS } from '../../config/pets.js';
import { PET_SKILL_BOOKS } from '../../config/petSkills.js';

export function addPetExperience(state, pet, amount) {
  if (!pet || !Number.isFinite(amount) || amount <= 0) return;
  pet.exp = (pet.exp || 0) + amount;
  while (pet.level < 100 && pet.exp >= state.getNextLevelExp(pet.level)) {
    pet.exp -= state.getNextLevelExp(pet.level);
    pet.level++;
  }
}

export function getEligibleContractPets(data, egg) {
  if (!egg || egg.type !== 'egg' || !Number.isSafeInteger(egg.count) || egg.count <= 0) return [];
  const tier = egg.id === 'pet_egg_gold' ? 'gold' : egg.id === 'pet_egg_darkgold' ? 'darkgold' : null;
  return Object.keys(PET_CONFIGS).filter(id => PET_CONFIGS[id].minLevel <= data.level && (!tier || PET_CONFIGS[id].defaultTier === tier) && !data.pets.some(pet => pet.id === id));
}

export function getContractChoices(state) {
  if (!state.data.hasChosenClass || (state.data.onboardingVersion === 2 ? !state.data.questProgress.quest_13?.claimed : state.data.level < 20)) return [];
  const ids = new Set(state.data.bag.flatMap(egg => state.getEligibleContractPets(egg)));
  return [...ids].map(id => ({ id, name: PET_CONFIGS[id].name, trait: PET_CONFIGS[id].traitName, gold: 5000 + PET_CONFIGS[id].minLevel * 500, crystal: 50 + PET_CONFIGS[id].minLevel * 2 }));
}

export function hatchPetEgg(state, preferredId) {
  const eggs = state.data.bag.filter(item => item.type === 'egg' && item.count > 0);
  if (!eggs.length) return { success: false, msg: '缺少神兽契约蛋！' };
  const choice = preferredId === null ? null : state.getContractChoices().find(choice => choice.id === preferredId);
  if (preferredId !== null && !choice) return { success: false, msg: '这位伙伴尚不符合契约条件，或已经拥有。' };
  if (choice && (![state.data.gold, state.data.crystal].every(Number.isFinite) || state.data.gold < choice.gold || state.data.crystal < choice.crystal)) return { success: false, msg: `赛拉的契约仪式需要${choice.gold}金币和${choice.crystal}魔晶，另消耗一枚符合条件的契约蛋。` };
  let egg, candidates = [];
  for (const available of eggs) {
    candidates = state.getEligibleContractPets(available);
    if (choice && !candidates.includes(preferredId)) continue;
    if (candidates.length) { egg = available; break; }
  }
  if (!candidates.length) return { success: false, msg: '当前等级可缔约的神兽已全部拥有，请提升等级后再孵化；保留契约蛋。' };
  const id = choice ? preferredId : candidates[Math.floor(Math.random() * candidates.length)];
  const cfg = PET_CONFIGS[id];
  if (choice) { state.data.gold -= choice.gold; state.data.crystal -= choice.crystal; }
  egg.count--;
  if (egg.count <= 0) state.data.bag = state.data.bag.filter(item => item !== egg);
  state.data.pets.push({ id, level: 1, exp: 0, tier: cfg.defaultTier || 'gold', stamina: 100,
    apt: { ...cfg.defaultApt }, skills: [] });
  state.addSystemLog(`【神兽】成功孵化【${cfg.name}】！`, 'pet');
  return { success: true, petId: id, msg: `成功孵化【${cfg.name}】！` };
}

export function setActivePet(state, petId) {
  return state.setPetPartySlot(0, petId);
}

export function setPetPartySlot(state, slot, petId) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 2 || (petId !== null && (!Object.hasOwn(PET_CONFIGS, petId) || !state.data.pets.some(pet => pet.id === petId)))) return { success: false, msg: '请选择已缔约的伙伴与有效位置。' };
  const ids = getPetParty(state.data).map(member => member.pet?.id || null);
  const previous = ids[slot];
  const other = petId === null ? -1 : ids.indexOf(petId);
  if (other >= 0 && other !== slot) ids[other] = previous;
  ids[slot] = petId;
  state.data.activePetId = ids[0];
  state.data.supportPetIds = ids.slice(1);
  if (slot === 0 && petId) state.triggerQuestAction('set_active_pet');
  state.notify();
  return { success: true };
}

export function washPetAptitude(state, petId) {
  const pet = state.data.pets.find(pet => pet.id === petId);
  const pill = state.data.bag.find(item => item.id === 'pill_reborn' && item.count > 0);
  if (!pet || !pill) return { success: false, msg: '请选择已孵化的伙伴，并准备远古重铸灵药；主线使命会提供首批灵药。' };
  pill.count--;
  if (!pill.count) state.data.bag = state.data.bag.filter(item => item !== pill);
  const base = pet.tier === 'purplegold' ? 2500 : pet.tier === 'darkgold' ? 1800 : 1200;
  for (const key of ['str', 'int', 'dex', 'con']) pet.apt[key] = base + Math.floor(Math.random() * 600);
  state.triggerQuestAction('wash_pet');
  state.notify();
  return { success: true };
}

export function learnPetSkill(state, petId, bookId) {
  const pet = state.data.pets.find(pet => pet.id === petId);
  const cfg = PET_SKILL_BOOKS[bookId];
  const book = state.data.bag.find(item => (item.id === bookId || item.bookId === bookId) && (item.count ?? 1) > 0);
  if (!pet || !cfg || !book) return { success: false, msg: '神兽或对应魔导书不存在！' };
  if (!Array.isArray(pet.skills)) pet.skills = [];
  if (pet.skills.includes(bookId) || pet.skills.includes(cfg.skillId)) return { success: false, msg: '神兽已掌握此技能！' };
  if (pet.skills.length >= 4) return { success: false, msg: '技能槽已满 4 格！' };
  pet.skills.push(bookId);
  book.count = (book.count ?? 1) - 1;
  if (book.count <= 0) state.data.bag = state.data.bag.filter(item => item !== book);
  state.triggerQuestAction('learn_skill');
  state.addSystemLog(`【神兽】${PET_CONFIGS[petId]?.name || '神兽'}领悟【${cfg.skillName}】！`, 'pet');
  return { success: true, msg: `成功研习【${cfg.skillName}】！` };
}

export function forgetPetSkill(state, petId, learnedId) {
  const pet = state.data.pets.find(pet => pet.id === petId);
  const cfg = Object.values(PET_SKILL_BOOKS).find(book => book.id === learnedId || book.skillId === learnedId);
  const index = pet?.skills?.indexOf(learnedId) ?? -1;
  if (!pet || !cfg || index < 0) return { success: false, msg: '这位伙伴当前没有掌握该魔典。' };
  pet.skills.splice(index, 1);
  state.grantBattleLoot({ id: cfg.id, bookId: cfg.id, name: cfg.name || `远古魔导书·【${cfg.skillName}】`, type: 'skill_book', quality: cfg.quality || 'darkgold', icon: cfg.icon || 'images/items/skill_book.svg', count: 1 });
  state.notify();
  return { success: true, msg: `【${cfg.skillName}】已退回行囊，空出的魔典槽可学习其他技能。` };
}

export function feedPet(state, petId, itemId) {
  const pet = state.data.pets.find(p => p.id === petId);
  if (!pet) return { success: false, msg: '未找到该神兽' };
  const foodEffects = { pet_food: 35, pet_food_basic: 15, pet_food_luxury: 60 };
  const restore = foodEffects[itemId] || 0;
  if (!restore) return { success: false, msg: '未知的宠物食品。' };
  if ((pet.stamina ?? 100) >= 100) return { success: false, msg: '伙伴体力已满，无需再喂食。' };
  const food = state.data.bag.find(i => i.id === itemId && i.count > 0);
  if (!food) return { success: false, msg: `背包中没有【${itemId === 'pet_food' ? '魔能兽肉排' : itemId === 'pet_food_basic' ? '普通宠物口粮' : '豪华宠物饼干'}】` };

  pet.stamina = Math.min(100, (pet.stamina ?? 100) + restore);
  food.count--;
  if (food.count <= 0) state.data.bag = state.data.bag.filter(i => i !== food);
  state.notify();
  return { success: true, msg: `喂养成功！${pet.name || '神兽'} 当前体力已恢复至 ${pet.stamina}/100！` };
}

export function feedPetWithGold(state, petId, targetStamina) {
  const pet = state.data.pets.find(p => p.id === petId);
  if (!pet) return { success: false, msg: '未找到该神兽' };
  const current = pet.stamina ?? 100;
  const target = Math.min(60, Math.max(0, Math.floor(targetStamina)));
  if (current >= target) return { success: false, msg: `金币喂养最多恢复到 ${target} 点体力。` };
  const missing = target - current;
  const cost = missing * 10;
  if (state.data.gold < cost) return { success: false, msg: `金币不足！恢复 ${missing} 点体力需要 ${cost} 金币。` };
  state.data.gold -= cost;
  pet.stamina = target;
  state.notify();
  return { success: true, msg: `兽栏喂养完成：${pet.name || '神兽'} 体力恢复至 ${pet.stamina}/100，消耗 ${cost} 金币。` };
}

export function getCompanionTrainingQuote(state, petId) {
  if (state.data.onboardingVersion === 2 && !state.data.questProgress.quest_13?.claimed) return { success: false, msg: '完成古门哨站调查并交付委托后，赛拉会开启营地训练。' };
  const pet = state.data.pets.find(pet => pet.id === petId);
  if (!state.data.hasChosenClass || !pet || !Number.isSafeInteger(pet.level) || pet.level < 1 || pet.level >= Math.min(100, state.data.level)) return { success: false, msg: '伙伴已跟上你的等级，或尚未建立契约。' };
  if ((pet.stamina ?? 100) < 60) return { success: false, msg: '伙伴太疲惫，请先喂养恢复至至少60体力。' };
  if (!Number.isSafeInteger(pet.exp ?? 0) || (pet.exp ?? 0) < 0 || (pet.exp ?? 0) >= state.getNextLevelExp(pet.level)) return { success: false, msg: '伙伴经验记录异常，请重新载入。' };
  const targetLevel = Math.min(pet.level + 5, state.data.level, 100);
  let exp = -(pet.exp ?? 0);
  for (let level = pet.level; level < targetLevel; level++) exp += state.getNextLevelExp(level);
  return { success: true, petId, level: pet.level, petExp: pet.exp ?? 0, targetLevel, exp, gold: Math.max(100, Math.ceil(exp * 0.05)), crystal: (targetLevel - pet.level) * 5, food: 1 };
}

export function trainCompanion(state, expected) {
  const quote = state.getCompanionTrainingQuote(expected?.petId);
  if (!quote.success) return quote;
  if (['petId','level','petExp','targetLevel','exp','gold','crystal','food'].some(key => expected[key] !== quote[key])) return { success: false, msg: '伙伴成长或训练报价已变化，请重新选择。' };
  const food = state.data.bag.find(item => item.id === 'pet_food' && Number.isSafeInteger(item.count) && item.count > 0);
  if (!food || ![state.data.gold, state.data.crystal].every(Number.isFinite) || state.data.gold < quote.gold || state.data.crystal < quote.crystal) return { success: false, msg: `训练需要${quote.gold}金币、${quote.crystal}魔晶和1份兽肉。` };
  const pet = state.data.pets.find(pet => pet.id === quote.petId);
  state.data.gold -= quote.gold; state.data.crystal -= quote.crystal;
  food.count--; if (!food.count) state.data.bag = state.data.bag.filter(item => item !== food);
  pet.level = quote.targetLevel; pet.exp = 0;
  state.addSystemLog(`【伙伴训练】${PET_CONFIGS[pet.id]?.name || '伙伴'}在赛拉的营地训练至${pet.level}级。特性、资质、魔典与品阶保留。`, 'pet');
  state.notify();
  return { success: true, msg: `伙伴已成长至${pet.level}级。训练不会超过你的等级，也不改变品阶或资质。` };
}

export function evolvePet(state, petId) {
  const pet = state.data.pets.find(p => p.id === petId);
  if (!pet) return { success: false, msg: '未找到神兽' };

  if (pet.tier === 'gold') {
    if (pet.level < 30) return { success: false, msg: '黄金宠物需达到 30 级方可使用进化石！' };
    const stone = state.data.bag.find(i => i.id === 'evolution_stone' && i.count > 0);
    if (!stone) return { success: false, msg: '缺少【进化石】！' };
    stone.count--;
    if (stone.count <= 0) state.data.bag = state.data.bag.filter(i => i !== stone);

    pet.tier = 'darkgold';
    pet.level = 1;
    pet.exp = 0;
    pet.apt.str = Math.min(4500, Math.floor(pet.apt.str * 1.35));
    pet.apt.int = Math.min(4500, Math.floor(pet.apt.int * 1.35));
    pet.apt.dex = Math.min(4500, Math.floor(pet.apt.dex * 1.35));
    pet.apt.con = Math.min(4500, Math.floor(pet.apt.con * 1.35));
    state.notify();
    return { success: true, msg: '进化成功！神兽觉醒为【暗金神圣阶】，资质上限跃升至 4500！' };
  } else if (pet.tier === 'darkgold') {
    if (pet.level < 40) return { success: false, msg: '暗金宠物需达到 40 级方可使用天命石！' };
    const stone = state.data.bag.find(i => i.id === 'destiny_stone' && i.count > 0);
    if (!stone) return { success: false, msg: '缺少【天命石】（可通过屠银龙/金龙获得）！' };
    stone.count--;
    if (stone.count <= 0) state.data.bag = state.data.bag.filter(i => i !== stone);

    pet.tier = 'purplegold';
    pet.level = 1;
    pet.exp = 0;
    pet.apt.str = Math.min(6000, Math.floor(pet.apt.str * 1.45));
    pet.apt.int = Math.min(6000, Math.floor(pet.apt.int * 1.45));
    pet.apt.dex = Math.min(6000, Math.floor(pet.apt.dex * 1.45));
    pet.apt.con = Math.min(6000, Math.floor(pet.apt.con * 1.45));
    state.triggerQuestAction('evolve_purplegold');
    state.addSystemLog(`【神兽觉醒】神兽突破为【紫金传奇圣兽】，资质全面暴涨！`, 'pet');
    state.notify();
    return { success: true, msg: '终极进化达成！神兽突破为【紫金传奇圣兽】，获得传世神圣属性！' };
  }
  return { success: false, msg: '该宠物已达最高紫金阶品！' };
}
