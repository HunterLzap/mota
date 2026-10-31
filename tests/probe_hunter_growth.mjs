import { GameState } from '../js/core/state.js';
import { CLASSES } from '../js/config/classes.js';

const original = { ...CLASSES.hunter.growth };
for (const growth of [
  { ...original },
  { ...original, atk: 4.5, speed: 1.3 },
  { ...original, atk: 4.5, speed: 1.0 },
  { ...original, atk: 4.0, speed: 1.0 }
]) {
  CLASSES.hunter.growth = growth;
  const state = new GameState();
  state.data.classId = 'hunter';
  state.data.hasChosenClass = true;
  state.data.onboardingVersion = 2;
  state.data.level = 89;
  state.data.allocatedStats = { str: 0, con: 100, dex: 500, int: 0 };
  const stats = state.getEffectiveStats();
  console.log(JSON.stringify({ growth, atk: stats.atk, speed: stats.speed, crit: stats.crit,
    dodge: stats.dodge, hp: stats.maxHp }));
}
CLASSES.hunter.growth = original;
