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
    return { slot, pet: pet || null, config: pet ? PET_CONFIGS[id] : null, active: Boolean(pet && (pet.stamina ?? 100) >= 60) };
  });
}

export function getPartyTraits(data) {
  const effects = {};
  for (const member of getPetParty(data).filter(member => member.active)) {
    for (const [key, value] of Object.entries(member.config.traitEffect || {})) {
      effects[key] = typeof value === 'boolean' ? Boolean(effects[key] || value)
        : key === 'counterBoost' ? (effects[key] || 0) + value
        : Math.max(effects[key] || 0, value);
    }
  }
  return effects;
}
