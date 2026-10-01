// 野外大陆冒险与【黑羽蒙面女盗】奇遇 (西方奇幻冒险)
import { gameState } from '../core/state.js';
import { MAPS } from '../config/maps.js';
import { SPECIAL_ITEMS } from '../config/items.js';
import { sound } from '../core/sound.js';
import { gameModal } from './modal.js';
import { getVectorIcon } from '../assets/vectorIcons.js';

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

    this.container.innerHTML = `
      <div class="w-full h-full p-1.5 sm:p-2 flex flex-col justify-between select-none">
        
        <!-- 顶栏：面包屑 + 挂机巡逻营地收益一体化栏 -->
        <div class="mota-breadcrumb px-3 py-1.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow mb-2 flex-shrink-0">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-amber-200 font-bold text-xs">【野外征战】</span>
            <span class="text-slate-500">></span>
            <span class="text-amber-300 font-medium">亚诺大陆全境据点与魔物讨伐</span>
          </div>

          <!-- 挂机收益集成状态 -->
          <div class="flex items-center gap-3 text-xs">
            <div class="flex items-center gap-2 font-mono text-[11px] bg-black/50 px-2.5 py-0.5 rounded-lg border border-slate-800">
              <span class="text-emerald-300">营地: <b>${currentPatrolMap.name}</b> (${minutesAway}分)</span>
              <span class="text-slate-600">|</span>
              <span class="text-emerald-400">+${pendingExp} EXP</span>
              <span class="text-amber-400">+${pendingGold} 金</span>
              <span class="text-cyan-400">+${pendingCrystal} 晶</span>
            </div>
            <button id="btn-claim-idle" class="mota-btn-gold px-2.5 py-1 rounded-lg text-xs font-bold shadow flex items-center gap-1">
              <span>收获挂机收益</span>
            </button>
          </div>
        </div>

        <!-- 主体：左右两大核心面板 (5列据点选择 + 7列魔物讨伐与奇遇) -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          
          <!-- 左侧：亚诺大陆 5 大征战据点 (5列) -->
          <div class="md:col-span-5 mota-parchment-panel p-3 rounded-xl border-2 border-[#caa048] flex flex-col justify-between">
            <div class="text-xs font-bold text-amber-300 pb-1.5 border-b border-[#4a3520]/70 flex items-center justify-between flex-shrink-0">
              <span>亚诺全境 5 大据点</span>
              <span class="text-[10px] text-slate-400 font-mono">点击据点立即探查</span>
            </div>

            <div class="space-y-2 my-1.5 flex-1 content-center">
              ${MAPS.map((m) => {
                const isPatrol = currentPatrolMap.id === m.id;
                const isSelected = selectedMap.id === m.id;
                const isLocked = data.level < m.reqLevel;
                const isThiefHere = thief && thief.appeared && (m.id === 'swamp' || thief.location.includes(m.name.slice(-2)));

                return `
                  <div data-map-id="${m.id}" class="map-node-card cursor-pointer rounded-xl p-2 sm:p-2.5 border transition-all flex items-center justify-between ${
                    isSelected 
                      ? 'border-[#f5c042] bg-amber-950/80 shadow-[0_0_10px_rgba(245,192,66,0.35)]' 
                      : isPatrol
                      ? 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_6px_rgba(16,185,129,0.25)]'
                      : 'border-slate-800 bg-black/40 hover:border-slate-600'
                  } ${isLocked ? 'opacity-60' : ''}">
                    
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-black/60 border border-amber-800/80 p-1 flex items-center justify-center flex-shrink-0">
                        ${getVectorIcon('bld_dragons', 'w-full h-full')}
                      </div>
                      <div class="truncate min-w-0 leading-tight">
                        <div class="flex items-center gap-1.5">
                          <span class="font-bold text-xs ${isSelected ? 'text-amber-300' : 'text-slate-200'}">${m.name}</span>
                          <span class="text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                            isLocked ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-slate-800 text-slate-300'
                          }">
                            Lv.${m.reqLevel}+
                          </span>
                        </div>
                        <div class="text-[10px] text-slate-400 mt-0.5 truncate">${m.description}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      ${isPatrol ? `
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold flex items-center gap-1">
                          <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          巡逻中
                        </span>
                      ` : ''}

                      ${isThiefHere ? `
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-500 font-black animate-bounce">
                          女盗现身
                        </span>
                      ` : ''}
                    </div>

                  </div>
                `;
              }).join('')}
            </div>

            <div class="text-[10px] text-slate-500 text-center pt-1 border-t border-[#4a3520]/70 font-mono flex-shrink-0">
              设置巡逻营地可享持续挂机经验与金币产出
            </div>
          </div>

          <!-- 右侧：选定据点情报与魔物巢穴 (7列) -->
          <div class="md:col-span-7 mota-parchment-panel p-3.5 sm:p-4 rounded-xl border-2 border-[#caa048] flex flex-col justify-between">
            <div class="space-y-2.5">
              
              <!-- 据点抬头与营地迁移 -->
              <div class="flex items-center justify-between pb-2 border-b border-[#4a3520]/70">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-black/60 border border-amber-700/80 p-1 flex items-center justify-center flex-shrink-0">
                    ${getVectorIcon('bld_dragons', 'w-full h-full')}
                  </div>
                  <div class="truncate min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="font-black text-sm text-amber-300">${selectedMap.name}</h3>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        推荐 Lv.${selectedMap.reqLevel}+
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 truncate">${selectedMap.description}</p>
                  </div>
                </div>

                <div class="flex-shrink-0">
                  ${currentPatrolMap.id !== selectedMap.id ? `
                    <button id="btn-set-patrol" data-map-id="${selectedMap.id}" class="mota-btn-gold px-3 py-1 rounded-lg text-xs font-bold shadow flex items-center gap-1">
                      <span>移防营地至此处</span>
                    </button>
                  ` : `
                    <span class="text-[10px] px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">
                      当前巡航营地
                    </span>
                  `}
                </div>
              </div>

              <!-- 【黑羽蒙面女盗】现身悬赏条 (若女盗在此或通缉时醒目呈现) -->
              ${thief && thief.appeared ? `
                <div class="p-2.5 rounded-xl bg-red-950/60 border border-red-500/80 flex items-center justify-between gap-3 shadow-md">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded bg-red-900/60 border border-red-500 p-1 flex items-center justify-center flex-shrink-0">
                      ${getVectorIcon('weapon_sword', 'w-full h-full')}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-xs text-red-300">【王国通缉】黑羽蒙面女盗现身据点！</span>
                        <span class="text-[9px] px-1 py-0.2 rounded bg-red-900 text-white font-mono">限时夺宝</span>
                      </div>
                      <div class="text-[10px] text-slate-300 mt-0.5 truncate">女盗携巨量王国晶石与【保护水晶】潜伏于【${thief.location}】！</div>
                    </div>
                  </div>
                  <button id="btn-challenge-thief" class="mota-btn-gold px-3 py-1 rounded-lg text-xs font-black shadow flex-shrink-0 flex items-center gap-1">
                    <span>截击暗影女盗</span>
                  </button>
                </div>
              ` : ''}

              <!-- 驻地首领 / 区域霸主 Boss 特写卡片 -->
              ${selectedMap.boss ? `
                <div class="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/50 via-red-950/30 to-black/60 border-2 border-amber-500/70 shadow flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-red-950/60 border border-amber-500/80 p-1 flex items-center justify-center flex-shrink-0">
                      ${getVectorIcon('bld_dragons', 'w-full h-full')}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-black text-amber-300 truncate">${selectedMap.boss.name}</span>
                        <span class="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-200 border border-red-700 font-mono font-bold">
                          驻地领主 · Lv.${selectedMap.boss.level}
                        </span>
                      </div>
                      <div class="text-[10px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <span>生命: <b class="text-red-400 font-mono">${selectedMap.boss.hp}</b></span>
                        <span>攻击: <b class="text-amber-400 font-mono">${selectedMap.boss.atk}</b></span>
                        <span>防御: <b class="text-blue-400 font-mono">${selectedMap.boss.def}</b></span>
                        <span class="text-amber-300">必掉: <b>【${selectedMap.boss.guaranteedDrop.name}】x${selectedMap.boss.guaranteedDrop.count}</b></span>
                      </div>
                    </div>
                  </div>
                  <button id="btn-fight-wild-boss" class="mota-btn-gold px-3.5 py-1.5 rounded-xl text-xs font-black shadow flex-shrink-0 flex items-center gap-1">
                    <span>讨伐领主</span>
                  </button>
                </div>
              ` : ''}

              <!-- 该区域栖息魔物列表 -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs pb-1">
                  <span class="font-bold text-amber-300 text-xs">盘踞魔物 (击杀掉落装备与珍稀材料)：</span>
                  <span class="text-[10px] text-slate-400 font-mono">挂机产出: ${selectedMap.idleRate.expPerMin} EXP/分 · ${selectedMap.idleRate.goldPerMin} 金/分</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  ${selectedMap.monsters.map((mob, mIdx) => {
                    return `
                      <div class="p-2.5 rounded-xl bg-black/40 border border-slate-800 hover:border-slate-600 transition-all flex flex-col justify-between space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-lg bg-black/60 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0">
                            ${getVectorIcon('weapon_sword', 'w-full h-full')}
                          </div>
                          <div class="min-w-0 leading-tight">
                            <div class="text-xs font-bold text-amber-200 truncate">${mob.name}</div>
                            <div class="text-[10px] text-slate-400">爆装率: <b class="text-amber-400 font-mono">${Math.floor((mob.dropRate || 0.2) * 100)}%</b></div>
                          </div>
                        </div>

                        <!-- 属性简报 -->
                        <div class="grid grid-cols-3 gap-1 text-[10px] bg-black/50 p-1.5 rounded-lg border border-slate-800 text-center font-mono">
                          <div>
                            <span class="text-slate-500">生命</span>
                            <div class="text-red-400 font-bold">${mob.hp}</div>
                          </div>
                          <div>
                            <span class="text-slate-500">攻击</span>
                            <div class="text-amber-400 font-bold">${mob.atk}</div>
                          </div>
                          <div>
                            <span class="text-slate-500">护甲</span>
                            <div class="text-blue-400 font-bold">${mob.def}</div>
                          </div>
                        </div>

                        <div class="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                          <span>+${mob.gold} 金</span>
                          <span>+${mob.exp} EXP</span>
                        </div>

                        <!-- 讨伐按键 -->
                        <button data-mob-idx="${mIdx}" data-mob-name="${mob.name}" data-mob-hp="${mob.hp}" data-mob-atk="${mob.atk}" data-mob-def="${mob.def}" data-mob-icon="${mob.icon}" data-mob-drop="${mob.dropRate || 0.2}" class="btn-fight-mob w-full mota-btn-dark py-1.5 rounded-lg text-xs font-bold hover:text-amber-200 hover:border-amber-500 transition-all">
                          拔剑讨伐
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

            </div>

            <div class="text-[10px] text-slate-500 text-right pt-2 border-t border-[#4a3520]/70 font-mono">
              击败野外魔物可随机缴获各阶神装散件与升星结晶
            </div>
          </div>

        </div>

      </div>
    `;

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
          enemyData: { name: '【盗贼团精锐】黑羽蒙面女盗', icon: '' },
          enemyStats: { hp: thief.hp || 8000, atk: 380, def: 180, speed: 30 },
          onFinish: (victory) => {
            if (victory) {
              sound.playFanfare();
              gameState.gainCurrency(4500, 80, 50);
              gameState.data.bag.push({ ...SPECIAL_ITEMS.crystal_gold, count: 5, uid: 'th_' + Date.now() });
              gameState.data.bag.push({ ...SPECIAL_ITEMS.protect_crystal, count: 2, uid: 'th_p_' + Date.now() });
              gameState.data.maskedThief.appeared = false;
              gameState.triggerQuestAction('catch_thief', 1);

              if (gameState.data.currentQuestId === 'quest_18') {
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
          enemyData: { name: `【驻地领主】${boss.name}`, icon: '' },
          enemyStats: { hp: boss.hp, atk: boss.atk, def: boss.def, speed: 22 },
          onFinish: (victory) => {
            if (victory) {
              sound.playFanfare();
              const reward = gameState.settleWildBossVictory(curMap.id);
              if (!reward.success) return;
              const gDrop = reward.drop;
              const bossGear = reward.gear;

              if (boss.id === 'boss_forest' && gameState.data.currentQuestId === 'quest_17') {
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

        this.onStartBattle({
          enemyData: { name, icon: '' },
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
