import { gameState } from '../core/state.js';
import { getFeatureAccess } from '../core/journey.js';
import { gameModal } from './modal.js';

// Apply to existing entry controls without changing the surrounding layout.
export function markFeatureEntrances(container, mapping) {
  for (const [selector, feature] of Object.entries(mapping)) {
    for (const element of container.querySelectorAll(selector)) {
      const access = getFeatureAccess(gameState.data, feature);
      if (access.available || !element.setAttribute) continue;
      element.setAttribute('aria-disabled', 'true');
      element.setAttribute('title', access.message);
      element.classList?.add('feature-locked');
      const control = element.matches?.('button') ? element : element.querySelector?.('button');
      if (control) {
        control.classList?.add('feature-entry-locked');
        control.setAttribute('aria-disabled', 'true');
        control.setAttribute('title', access.message);
      }
      const label = control === element ? `第${access.chapter}章领奖后开启` : access.label;
      const hint = `<span class="feature-lock-hint block text-xs text-slate-300">${label}</span>`;
      // 建筑卡片将前置条件放在入口旁，避免成为第三个游离的布局区块。
      if (control && control !== element) control.insertAdjacentHTML?.('afterend', hint);
      else element.insertAdjacentHTML?.('beforeend', hint);
      element.addEventListener('click', event => {
        const current = getFeatureAccess(gameState.data, feature);
        if (current.available) return;
        event.preventDefault(); event.stopImmediatePropagation();
        gameModal.alert(current.message, '冒险指引');
      }, true);
    }
  }
}
