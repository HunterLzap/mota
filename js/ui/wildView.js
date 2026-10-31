// 野外大陆冒险与【黑羽蒙面女盗】奇遇 (西方奇幻冒险)
import { gameState } from '../core/state.js';
import { MAPS } from '../config/maps.js';
import { SPECIAL_ITEMS } from '../config/items.js';
import { sound } from '../core/sound.js';
import { gameModal } from './modal.js';
import { getVectorIcon } from '../assets/vectorIcons.js';
import { renderGameIcon } from './iconHelper.js';
import { getWildPortraitStyle, getWildRegionStyle } from './wildArtwork.js';

export class WildView {
  constructor(containerId, onStartBattle) {
    this.container = document.getElementById(containerId);
    this.onStartBattle = onStartBattle;
    this.selectedMapId = gameState.data.currentMapId || 'forest';
  }

  render() {
    const data = gameState.data;
    const currentPatrolMap = MAPS.find(m => m.id === (data.currentMapId || 'forest')) || MAPS[0];
    const selectedMap = MAPS.find(m => m.id === this.selectedMapId) || currentPatrolMap;
    const patrolRates = gameState.getPatrolRates(selectedMap.id);
    const formatRate = value => Number(value.toFixed(2)).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
    const thief = data.maskedThief;

    if (data.currentQuestId === 'quest_18' && (!thief || !thief.appeared)) {
      if (!data.maskedThief) data.maskedThief = {};
      data.maskedThief.appeared = true;
      data.maskedThief.location = selectedMap.name;
    }

    // 计算野外挂机收益
    const pending = gameState.getIdleRewards();
    const minutesAway = pending.minutes;
    const pendingExp = pending.exp;
    const pendingGold = pending.gold;
    const pendingCrystal = pending.crystal;

    this.container.innerHTML = `<section class="wild-page wild-atlas">
      <header class="mota-breadcrumb wild-atlas-heading"><h2>野外征战</h2><span>营地：${currentPatrolMap.name} · ${minutesAway}分 · +${pendingExp} EXP / +${pendingGold} 金 / +${pendingCrystal} 晶</span><button id="btn-claim-idle" class="mota-btn-gold">收获挂机收益</button></header>
      <div class="wild-grid">
        <nav class="wild-map-list mota-parchment-panel" aria-label="亚诺大陆据点"><div class="wild-map-nodes">
          ${MAPS.map(map => `<button type="button" data-map-id="${map.id}" aria-pressed="${selectedMap.id === map.id}" class="map-node-card"><span class="wild-map-copy"><span class="wild-region-art wild-map-thumbnail" style="${getWildRegionStyle(map.id)}" aria-hidden="true"></span><span class="wild-map-label"><strong>${map.name}</strong><small>Lv.${map.reqLevel}+${currentPatrolMap.id === map.id ? ' · 巡逻中' : data.level < map.reqLevel ? ' · 未解锁' : ''}</small></span></span></button>`).join('')}
        </div></nav>
        <section class="wild-map-detail mota-parchment-panel">
          <div class="wild-dossier">
            <div class="wild-region-summary"><div class="wild-region-art wild-region-panorama" role="img" aria-label="${selectedMap.name}景观" data-region-art="${selectedMap.id}" style="${getWildRegionStyle(selectedMap.id)}"></div>
              <div class="wild-region-heading"><h3>${selectedMap.name}</h3><p>${selectedMap.description}</p><small>推荐 Lv.${selectedMap.reqLevel}+</small>
                ${currentPatrolMap.id !== selectedMap.id ? `<button id="btn-set-patrol" data-map-id="${selectedMap.id}" class="mota-btn-gold">移防营地至此处</button>` : '<span>当前巡航营地</span>'}
              </div>
            </div>
            <div class="wild-dossier-list">
              ${thief && thief.appeared ? `<div class="wild-thief-card"><span class="wild-thief-icon">${renderGameIcon('boss_thief', { size: 'w-full h-full' })}</span><div><strong>黑羽蒙面女盗</strong><small>潜伏于【${thief.location}】 · 追索王国晶石</small></div><button id="btn-challenge-thief" class="mota-btn-gold">截击暗影女盗</button></div>` : ''}
              ${selectedMap.boss ? `<div class="wild-boss-card"><div class="wild-enemy-portrait" role="img" aria-label="${selectedMap.boss.name}肖像" style="${getWildPortraitStyle(selectedMap.boss.id)}"></div><div class="wild-boss-copy"><strong>${selectedMap.boss.name} · Lv.${selectedMap.boss.level}</strong><small>生命 ${selectedMap.boss.hp} · 攻击 ${selectedMap.boss.atk} · 防御 ${selectedMap.boss.def}</small><small>必掉：${selectedMap.boss.guaranteedDrop.name} ×${selectedMap.boss.guaranteedDrop.count}</small></div><button id="btn-fight-wild-boss" class="mota-btn-gold">讨伐领主</button></div>` : ''}
              <section class="wild-encounters"><h3 class="wild-monster-caption">盘踞魔物</h3><div class="wild-monster-grid">
                ${selectedMap.monsters.map((mob, index) => `<article class="wild-monster-card"><div class="wild-monster-identity"><div class="wild-enemy-portrait" role="img" aria-label="${mob.name}肖像" style="${getWildPortraitStyle(mob.icon)}"></div><strong>${mob.name}</strong></div>
                  <dl>${[['生命', mob.hp], ['攻击', mob.atk], ['护甲', mob.def]].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
                  <p>爆装率 ${Math.floor((mob.dropRate || 0.2) * 100)}%</p><p>+${mob.gold} 金 · +${mob.exp} EXP</p>
                  <button data-mob-idx="${index}" data-mob-name="${mob.name}" data-mob-hp="${mob.hp}" data-mob-atk="${mob.atk}" data-mob-def="${mob.def}" data-mob-icon="${mob.icon}" data-mob-drop="${mob.dropRate || 0.2}" class="btn-fight-mob mota-btn-dark">拔剑讨伐</button></article>`).join('')}
              </div></section>
              <p class="wild-patrol-rates">巡逻产出：${formatRate(patrolRates.expPerMin)} 经验 / ${formatRate(patrolRates.goldPerMin)} 金币 / ${formatRate(patrolRates.crystalPerMin)} 魔晶，每分钟</p>
            </div>
          </div>
        </section>
      </div>
    </section>`;

    this.bindEvents();
  }

  bindEvents() {
    // 切换选中的地图据点
    document.querySelectorAll('.map-node-card').forEach(card => {
      card.addEventListener('click', () => {
        const mid = card.getAttribute('data-map-id');
        if (mid) {
          this.selectedMapId = mid;
          sound.playSlash();
          this.render();
        }
      });
    });

    // 设立当前挂机营地
    const btnSetPatrol = document.getElementById('btn-set-patrol');
    if (btnSetPatrol) {
      btnSetPatrol.addEventListener('click', () => {
        const mid = btnSetPatrol.getAttribute('data-map-id');
        if (mid) {
          const result = gameState.setPatrolMap(mid);
          if (result.success) sound.playFanfare();
          gameModal.alert(result.msg, '营地部署');
          this.render();
        }
      });
    }

    // 领取挂机收益
    const btnClaim = document.getElementById('btn-claim-idle');
    if (btnClaim) {
      btnClaim.addEventListener('click', () => {
        const result = gameState.claimIdleRewards();
        if (!result.success) return gameModal.alert(result.msg, '巡逻收益');
        const { exp: gainExp, gold: gainGold, crystal: gainCrystal } = result;
        sound.playCoin();
        gameModal.alert(`成功收获巡逻战果！

获得经验 +${gainExp}
金币 +${gainGold}
魔晶石 +${gainCrystal}！`, '巡逻大捷');
        gameState.notify();
        this.render();
      });
    }

    // 挑战黑羽蒙面女盗
    const btnThief = document.getElementById('btn-challenge-thief');
    if (btnThief) {
      btnThief.addEventListener('click', () => {
        const thief = gameState.data.maskedThief;
        if (!thief || !thief.appeared) return;

        this.onStartBattle({
          enemyData: { name: '【盗贼团精锐】黑羽蒙面女盗', icon: 'boss_thief' },
          enemyStats: { hp: thief.hp || 8000, atk: 380, def: 180, speed: 30 },
          onFinish: (victory) => {
            if (victory) {
              sound.playFanfare();
              gameState.gainCurrency(4500, 80, 50);
              gameState.data.bag.push({ ...SPECIAL_ITEMS.crystal_gold, count: 5, uid: 'th_' + Date.now() });
              gameState.data.bag.push({ ...SPECIAL_ITEMS.protect_crystal, count: 2, uid: 'th_p_' + Date.now() });
              gameState.data.maskedThief.appeared = false;
              gameState.triggerQuestAction('catch_thief', 1);

              if (gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_18') {
                gameModal.confirm(
                  `击溃黑羽蒙面女盗！成功截获被盗宝物：黄金晶石x5、保护水晶x2、魔晶+80、金币+4500！

【主线任务达成】暗影潜行 · 截获重宝！
赏赐：经验 +60000，金币 +120000，魔晶 +800，【碎裂金刚钻】x3！

是否立即领受犒赏并开启下一篇章【极地裁决 · 讨伐银龙】？`,
                  () => {
                    gameState.claimQuestReward('quest_18');
                    gameModal.alert('犒赏已发放！新主线【极地裁决 · 讨伐银龙】已开启，前往圣光王都远古屠龙圣殿讨伐耀光秘银巨龙吧！', '主线推进', () => {
                      if (window.switchMainTab) window.switchMainTab('town');
                    });
                  },
                  () => this.render(),
                  '主线大捷 · 截击女盗'
                );
                return;
              } else {
                gameModal.alert('击溃黑羽蒙面女盗！成功截获被盗宝物：黄金晶石x5、保护水晶x2、魔晶+80、金币+4500！女盗仓皇遁逃！', '女盗奇遇大捷');
              }
              gameState.notify();
              this.render();
            }
          }
        });
      });
    }

    // 讨伐野外驻地领主 Boss (达成主线17)
    const btnWildBoss = document.getElementById('btn-fight-wild-boss');
    if (btnWildBoss) {
      btnWildBoss.addEventListener('click', () => {
        const curMap = MAPS.find(m => m.id === this.selectedMapId) || MAPS[0];
        const boss = curMap.boss;
        if (!boss) return;

        if (gameState.data.level < boss.level) {
          gameModal.alert(`勇者等级不足！需达到 Lv.${boss.level} 方可向驻地领主【${boss.name}】发起讨伐！`, '领主威压');
          return;
        }

        this.onStartBattle({
          enemyData: { name: `【驻地领主】${boss.name}`, portraitKey: boss.id, icon: boss.icon === 'monster_wolf' ? 'images/pets/pet_winter_wolf.svg' : getVectorIcon(boss.icon, 'w-full h-full'), level: boss.level },
          enemyStats: { hp: boss.hp, atk: boss.atk, def: boss.def, speed: boss.speed },
          onFinish: (victory) => {
            if (victory) {
              sound.playFanfare();
              const reward = gameState.settleWildBossVictory(curMap.id);
              if (!reward.success) return;
              const gDrop = reward.drop;
              const bossGear = reward.gear;

              if (boss.id === 'boss_forest' && gameState.data.onboardingVersion !== 2 && gameState.data.currentQuestId === 'quest_17') {
                gameModal.confirm(
                  `讨伐大胜！诛灭驻地霸主【${boss.name}】！
缴获：经验 +${reward.exp}，金币 +${reward.gold}，魔晶 +${reward.crystal}，【${gDrop.name}】x${gDrop.count}，装备【${bossGear.name}】！

【主线任务达成】密林梦魇 · 斩杀狼王！
赏赐：经验 +50000，金币 +100000，魔晶 +600，【保护水晶】x2！

是否立即领受犒赏并开启下一篇章【暗影潜行 · 截获重宝】？`,
                  () => {
                    if (!gameState.claimQuestReward('quest_17')) return;
                    gameModal.alert('犒赏已发放！新主线【暗影潜行 · 截获重宝】已开启，黑羽蒙面女盗正在野外现身潜逃，立即截击吧！', '主线推进', () => {
                      this.render();
                    });
                  },
                  () => this.render(),
                  '主线大捷 · 斩杀狼王'
                );
                return;
              } else {
                gameModal.alert(
                  `讨伐大捷！成功诛灭驻地霸主【${boss.name}】！

缴获战利品：
- 经验 +${reward.exp}
- 金币 +${reward.gold}
- 魔晶 +${reward.crystal}
- 必掉：【${gDrop.name}】x${gDrop.count}
- 爆装：【${bossGear.name}】(+0星)`,
                  '领主陨落'
                );
              }
              gameState.notify();
              this.render();
            }
          }
        });
      });
    }

    // 讨伐普通小怪
    document.querySelectorAll('.btn-fight-mob').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-mob-name');
        const hp = parseInt(btn.getAttribute('data-mob-hp'), 10);
        const atk = parseInt(btn.getAttribute('data-mob-atk'), 10);
        const def = parseInt(btn.getAttribute('data-mob-def'), 10);
        const icon = btn.getAttribute('data-mob-icon');
        const dropRate = parseFloat(btn.getAttribute('data-mob-drop') || '0.2');

        const curMap = MAPS.find(m => m.id === this.selectedMapId) || MAPS[0];
        if (gameState.data.level < curMap.reqLevel) {
          gameModal.alert(`勇者等级不足！需达到 Lv.${curMap.reqLevel} 方可在【${curMap.name}】讨伐魔物。`, '区域尚未解锁');
          return;
        }

        this.onStartBattle({
          enemyData: { name, portraitKey: icon, icon: icon === 'monster_wolf' ? 'images/pets/pet_winter_wolf.svg' : getVectorIcon(icon, 'w-full h-full') },
          enemyStats: { hp, atk, def, speed: 18 },
          onFinish: (victory) => {
            if (victory) {
              const reward = gameState.settleWildVictory(curMap.id, Number(btn.getAttribute('data-mob-idx')));
              if (!reward.success) return;
              const expGain = reward.exp;
              const goldGain = reward.gold;
              const extraDropMsg = reward.drops.length
                ? '\n战利品：' + reward.drops.map(item => `【${item.name}】x${item.count || 1}`).join('、')
                : '';

              sound.playCoin();
              gameModal.alert(`讨伐获胜！成功消灭【${name}】！

获得经验 +${expGain}
金币 +${goldGain}，魔晶 +${reward.crystal}${extraDropMsg}`, '野外讨伐大捷');
              gameState.notify();
              this.render();
            }
          }
        });
      });
    });
  }
}
