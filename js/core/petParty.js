import { PET_CONFIGS } from '../config/pets.js';

// Only the main companion supplies attributes and learned books. Supports share
// innate traits; experience and stamina coefficients are single-player rules.
export function getPetParty(data) {
  const pets = Array.isArray(data.pets) ? data.pets : [];
  const used = new Set();
  const ids = [data.activePetId, ...(Array.isArray(data.supportPetIds) ? data.supportPetIds.slice(0, 2) : [null, null])];
  return Array.from({ length: 3 }, (_, slot) => {
    const id = ids[slot];
    const pet = !used.has(id) && Object.hasOwn(PET_CONFIGS, id) ? pets.find(entry => entry.id === id) : null;
    if (pet) used.add(id);
    const stamina = pet ? (pet.stamina ?? 100) : 0;
    return {
      slot,
      pet: pet || null,
      config: pet ? PET_CONFIGS[id] : null,
      // 原作三阈值：<80 天赋失效；<60 属性减半；<40 属性无效。active 保留为“特性生效”兼容旧调用。
      active: Boolean(pet && stamina >= 80),
      traitActive: Boolean(pet && stamina >= 80),
      attributeMultiplier: !pet ? 0 : stamina >= 80 ? 1 : stamina >= 40 ? 0.5 : 0
    };
  });
}

export function getPartyTraits(data) {
  const effects = {};
  for (const member of getPetParty(data).filter(member => member.traitActive)) {
    for (const [key, value] of Object.entries(member.config.traitEffect || {})) {
      effects[key] = typeof value === 'boolean' ? Boolean(effects[key] || value)
        : key === 'counterBoost' ? (effects[key] || 0) + value
        : Math.max(effects[key] || 0, value);
    }
  }
  return effects;
}
