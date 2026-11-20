// 单机行动日时钟：游戏“天数”由有效行动点推进，不依赖现实时间。
// 设计详见 docs/COMPREHENSIVE_REDESIGN_SPEC_2026-11-01.md §3.4。
export const ACTION_POINTS_PER_DAY = 30;

export const ACTION_POINTS = Object.freeze({
  wild: 1,
  wildBoss: 3,
  castleFloor: 1,
  dungeonFloor: 2,
  dragon: 3,
  arena: 1,
  bounty: 2,
  trial: 3,
  stronghold: 3
});

export function createActionClock() {
  return {
    day: 1,
    points: 0,
    pointsPerDay: ACTION_POINTS_PER_DAY,
    totalActions: 0
  };
}

export function actionDayKey(day) {
  const value = Number.isSafeInteger(day) && day > 0 ? day : 1;
  return `action-day-${value}`;
}
