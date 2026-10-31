import { renderPaintedIcon } from './paintedIcons.js';
// Compatibility entry point; mapped interface/portrait keys use painted assets.
// 无需任何外部位图下载，毫秒级即时矢量渲染，支持任意分辨率、高光金属倒角与宝石反射

export const VECTOR_ICONS = {
  // ==================== 1. 穿戴装备 10 大部位及神兵 ====================
  // 武器：圣殿十字大剑
  weapon_sword: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_blade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="35%" stop-color="#cbd5e1"/>
          <stop offset="70%" stop-color="#64748b"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
        <linearGradient id="v_gold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="50%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
      </defs>
      <path d="M50 14 L52 12 L50 10 L28 32 L26 36 L30 38 Z" fill="#94a3b8" opacity="0.3"/>
      <path d="M52 10 L54 12 L30 40 L26 40 L24 36 L48 10 Z" fill="url(#v_blade)" stroke="#475569" stroke-width="0.8"/>
      <line x1="49" y1="13" x2="28" y2="38" stroke="#ffffff" stroke-width="1" stroke-linecap="round"/>
      <path d="M18 36 Q25 31 34 26 L38 30 Q33 39 28 46 Z" fill="url(#v_gold)" stroke="#451a03" stroke-width="0.8"/>
      <circle cx="28" cy="36" r="3" fill="#dc2626" stroke="#fef08a" stroke-width="0.5"/>
      <line x1="24" y1="40" x2="15" y2="49" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="24" y1="40" x2="15" y2="49" stroke="#f59e0b" stroke-width="1" stroke-dasharray="1 3"/>
      <circle cx="13" cy="51" r="3.5" fill="url(#v_gold)" stroke="#451a03" stroke-width="0.8"/>
    </svg>
  `,

  // 武器：奥术水晶魔杖
  weapon_staff: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v_arcane_orb" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#f5d0fe"/>
          <stop offset="40%" stop-color="#c084fc"/>
          <stop offset="80%" stop-color="#7e22ce"/>
          <stop offset="100%" stop-color="#3b0764"/>
        </radialGradient>
      </defs>
      <line x1="52" y1="12" x2="14" y2="52" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
      <line x1="50" y1="14" x2="16" y2="50" stroke="#b45309" stroke-width="1" stroke-linecap="round"/>
      <path d="M42 22 Q48 10 56 12 Q52 24 44 26 Z" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <path d="M44 26 Q36 20 40 12 Q50 18 46 28 Z" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <circle cx="48" cy="16" r="8" fill="url(#v_arcane_orb)" stroke="#e879f9" stroke-width="1"/>
      <circle cx="46" cy="14" r="2.5" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="48" cy="16" rx="11" ry="5" fill="none" stroke="#38bdf8" stroke-width="0.8" transform="rotate(-30 48 16)" stroke-dasharray="3 2"/>
    </svg>
  `,

  // 武器：精灵龙骨长弓
  weapon_bow: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_wood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d97706"/>
          <stop offset="50%" stop-color="#92400e"/>
          <stop offset="100%" stop-color="#451a03"/>
        </linearGradient>
      </defs>
      <path d="M16 12 Q48 24 48 52" fill="none" stroke="url(#v_wood)" stroke-width="4" stroke-linecap="round"/>
      <path d="M16 12 Q48 24 48 52" fill="none" stroke="#fde047" stroke-width="1" opacity="0.6"/>
      <circle cx="16" cy="12" r="2.5" fill="#eab308"/>
      <circle cx="48" cy="52" r="2.5" fill="#eab308"/>
      <line x1="16" y1="12" x2="48" y2="52" stroke="#e2e8f0" stroke-width="1"/>
      <line x1="16" y1="12" x2="48" y2="52" stroke="#38bdf8" stroke-width="0.5" opacity="0.8"/>
      <line x1="22" y1="42" x2="52" y2="20" stroke="#f1f5f9" stroke-width="1.5"/>
      <polygon points="54,18 48,19 51,25" fill="#ef4444"/>
    </svg>
  `,

  // 头部：圣殿骑士十字重盔
  helmet: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_helm" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="40%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <path d="M32 6 Q28 14 30 18 Q36 14 32 6 Z" fill="#dc2626"/>
      <path d="M30 6 Q20 12 18 20 Q28 16 30 6 Z" fill="#991b1b"/>
      <path d="M18 22 Q32 14 46 22 L48 42 L42 54 L22 54 L16 42 Z" fill="url(#v_helm)" stroke="#caa048" stroke-width="1.2"/>
      <rect x="30" y="24" width="4" height="26" fill="#f5c042" stroke="#854d0e" stroke-width="0.5"/>
      <rect x="20" y="32" width="24" height="4" fill="#f5c042" stroke="#854d0e" stroke-width="0.5"/>
      <line x1="22" y1="34" x2="28" y2="34" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="36" y1="34" x2="42" y2="34" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="26" cy="44" r="0.8" fill="#000000"/>
      <circle cx="28" cy="46" r="0.8" fill="#000000"/>
      <circle cx="36" cy="46" r="0.8" fill="#000000"/>
      <circle cx="38" cy="44" r="0.8" fill="#000000"/>
    </svg>
  `,

  // 项链：炽天使红宝金坠
  necklace: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v_ruby" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fca5a5"/>
          <stop offset="40%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#450a0a"/>
        </radialGradient>
      </defs>
      <path d="M16 14 Q32 32 48 14" fill="none" stroke="#f5c042" stroke-width="2" stroke-dasharray="2 2"/>
      <path d="M22 18 Q32 36 42 18" fill="none" stroke="#d97706" stroke-width="1"/>
      <path d="M24 38 Q32 30 40 38 L32 50 Z" fill="#eab308" stroke="#78350f" stroke-width="1"/>
      <polygon points="32,32 38,40 32,48 26,40" fill="url(#v_ruby)" stroke="#fef08a" stroke-width="0.8"/>
      <circle cx="30" cy="36" r="1.2" fill="#ffffff" opacity="0.9"/>
    </svg>
  `,

  // 衣服：狮王秘银重胸甲
  armor: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_plate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#cbd5e1"/>
          <stop offset="50%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <path d="M12 20 Q20 12 26 20 L24 32 L12 26 Z" fill="#eab308" stroke="#713f12" stroke-width="1"/>
      <path d="M52 20 Q44 12 38 20 L40 32 L52 26 Z" fill="#eab308" stroke="#713f12" stroke-width="1"/>
      <path d="M20 18 L44 18 L46 36 L32 54 L18 36 Z" fill="url(#v_plate)" stroke="#caa048" stroke-width="1.5"/>
      <circle cx="32" cy="30" r="7" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <path d="M29 32 L35 32 M32 29 L32 33" stroke="#451a03" stroke-width="1"/>
      <path d="M24 40 L40 40 L38 46 L26 46 Z" fill="#334155" stroke="#caa048" stroke-width="0.8"/>
      <path d="M26 46 L38 46 L35 51 L29 51 Z" fill="#1e293b" stroke="#caa048" stroke-width="0.8"/>
    </svg>
  `,

  // 护手：精钢龙鳞护手
  gloves: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_steel_glove" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
      </defs>
      <path d="M18 14 L46 14 L44 32 L20 32 Z" fill="url(#v_steel_glove)" stroke="#caa048" stroke-width="1.2"/>
      <circle cx="32" cy="22" r="2.5" fill="#f59e0b"/>
      <rect x="20" y="34" width="24" height="6" rx="2" fill="#475569" stroke="#64748b" stroke-width="0.8"/>
      <rect x="22" y="42" width="20" height="8" rx="2" fill="#334155" stroke="#64748b" stroke-width="0.8"/>
      <polygon points="24,50 26,56 28,50" fill="#eab308"/>
      <polygon points="30,50 32,57 34,50" fill="#eab308"/>
      <polygon points="36,50 38,56 40,50" fill="#eab308"/>
    </svg>
  `,

  // 披风：暗夜猩红战袍
  cloak: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_cape_grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="60%" stop-color="#991b1b"/>
          <stop offset="100%" stop-color="#450a0a"/>
        </linearGradient>
      </defs>
      <line x1="22" y1="14" x2="42" y2="14" stroke="#f5c042" stroke-width="3" stroke-linecap="round"/>
      <circle cx="22" cy="14" r="3" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <circle cx="42" cy="14" r="3" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <path d="M22 16 Q14 36 10 56 Q32 50 54 56 Q50 36 42 16 Z" fill="url(#v_cape_grad)" stroke="#7f1d1d" stroke-width="1"/>
      <path d="M22 16 Q26 36 28 52" stroke="#7f1d1d" stroke-width="1.5" fill="none"/>
      <path d="M42 16 Q38 36 36 52" stroke="#7f1d1d" stroke-width="1.5" fill="none"/>
      <path d="M10 56 Q32 50 54 56" stroke="#f5c042" stroke-width="1.2" fill="none"/>
    </svg>
  `,

  // 腰带：暗金狮头战带
  belt: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_leather" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#78350f"/>
          <stop offset="100%" stop-color="#271105"/>
        </linearGradient>
      </defs>
      <rect x="8" y="24" width="48" height="16" rx="3" fill="url(#v_leather)" stroke="#caa048" stroke-width="1.2"/>
      <line x1="8" y1="32" x2="56" y2="32" stroke="#451a03" stroke-width="1" stroke-dasharray="2 2"/>
      <rect x="24" y="20" width="16" height="24" rx="4" fill="#eab308" stroke="#713f12" stroke-width="1.2"/>
      <circle cx="32" cy="32" r="5" fill="#dc2626" stroke="#fef08a" stroke-width="0.8"/>
      <circle cx="16" cy="32" r="1.8" fill="#f5c042"/>
      <circle cx="48" cy="32" r="1.8" fill="#f5c042"/>
    </svg>
  `,

  // 护腿：龙皮复合钢铠护腿
  pants: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_pants_grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <path d="M16 12 L30 12 L28 48 L14 48 Z" fill="url(#v_pants_grad)" stroke="#caa048" stroke-width="1"/>
      <path d="M34 12 L48 12 L50 48 L36 48 Z" fill="url(#v_pants_grad)" stroke="#caa048" stroke-width="1"/>
      <circle cx="22" cy="24" r="5" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <circle cx="42" cy="24" r="5" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <line x1="21" y1="32" x2="21" y2="44" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
      <line x1="43" y1="32" x2="43" y2="44" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,

  // 护靴：圣殿骑士精钢战靴
  boots: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_boots_metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
      </defs>
      <path d="M18 12 L34 12 L34 36 L48 44 L48 52 L14 52 L14 36 Z" fill="url(#v_boots_metal)" stroke="#caa048" stroke-width="1.2"/>
      <path d="M36 42 L48 44 L48 52 L36 52 Z" fill="#eab308" stroke="#713f12" stroke-width="0.8"/>
      <polygon points="12,46 6,48 12,50" fill="#f5c042"/>
      <rect x="18" y="24" width="16" height="4" rx="1" fill="#78350f"/>
    </svg>
  `,

  // 戒指：群星誓约蓝晶魔戒
  ring: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v_sapphire" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#bae6fd"/>
          <stop offset="40%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#082f49"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="36" r="16" fill="none" stroke="#f5c042" stroke-width="5"/>
      <circle cx="32" cy="36" r="16" fill="none" stroke="#d97706" stroke-width="1"/>
      <polygon points="32,10 42,16 32,24 22,16" fill="#eab308" stroke="#78350f" stroke-width="0.8"/>
      <polygon points="32,12 39,17 32,22 25,17" fill="url(#v_sapphire)" stroke="#ffffff" stroke-width="0.6"/>
      <circle cx="30" cy="15" r="1" fill="#ffffff"/>
    </svg>
  `,

  // 盾牌：狮鹫龙纹塔盾
  shield: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_shield_face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <path d="M14 12 L50 12 L50 36 Q50 54 32 60 Q14 54 14 36 Z" fill="url(#v_shield_face)" stroke="#caa048" stroke-width="2"/>
      <path d="M18 16 L46 16 L46 36 Q46 50 32 55 Q18 50 18 36 Z" fill="none" stroke="#d97706" stroke-width="1"/>
      <polygon points="32,22 40,32 32,42 24,32" fill="#eab308" stroke="#78350f" stroke-width="1"/>
      <circle cx="32" cy="32" r="3" fill="#ef4444"/>
    </svg>
  `,

  // ==================== 2. 核心货币、资源与材料 ====================
  // 金币：古帝国浮雕金币
  coin_gold: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v_gold_coin" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="40%" stop-color="#eab308"/>
          <stop offset="80%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#713f12"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="24" fill="#78350f"/>
      <circle cx="32" cy="32" r="23" fill="url(#v_gold_coin)"/>
      <circle cx="32" cy="32" r="19" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="2 1.5"/>
      <path d="M32 18 L34 29 L45 31 L34 33 L32 44 L30 33 L19 31 L30 29 Z" fill="#fef08a" stroke="#854d0e" stroke-width="0.8"/>
    </svg>
  `,

  // 晶石：奥术魔力多面棱晶
  crystal_gem: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_cyan_gem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a5f3fc"/>
          <stop offset="35%" stop-color="#38bdf8"/>
          <stop offset="70%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <polygon points="32,10 50,22 42,50 22,50 14,22" fill="url(#v_cyan_gem)" stroke="#e0f2fe" stroke-width="1"/>
      <polygon points="32,10 42,26 22,26" fill="#e0f2fe" opacity="0.6"/>
      <polygon points="22,26 14,22 22,50" fill="#0284c7" opacity="0.5"/>
      <polygon points="42,26 50,22 42,50" fill="#075985" opacity="0.5"/>
      <circle cx="30" cy="18" r="1.5" fill="#ffffff"/>
    </svg>
  `,

  // 功勋：皇家金狮勋章
  prestige_badge: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,10 40,10 44,28 32,24 20,28" fill="#7e22ce" stroke="#caa048" stroke-width="1"/>
      <circle cx="32" cy="38" r="15" fill="#eab308" stroke="#713f12" stroke-width="1.2"/>
      <polygon points="32,25 36,34 45,34 38,40 41,49 32,43 23,49 26,40 19,34 28,34" fill="#fef08a" stroke="#854d0e" stroke-width="0.8"/>
      <circle cx="32" cy="38" r="3" fill="#dc2626"/>
    </svg>
  `,

  // 8星升星晶石
  star_crystal: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v_star_g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="30%" stop-color="#fef08a"/>
          <stop offset="70%" stop-color="#eab308"/>
          <stop offset="100%" stop-color="#713f12"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="20" fill="none" stroke="#f5c042" stroke-width="0.8" stroke-dasharray="3 3"/>
      <polygon points="32,8 36,26 54,26 40,36 46,54 32,42 18,54 24,36 10,26 28,26" fill="url(#v_star_g)" stroke="#ffffff" stroke-width="1"/>
      <circle cx="32" cy="32" r="6" fill="#ffffff" filter="drop-shadow(0 0 4px #f59e0b)"/>
    </svg>
  `,

  // 保护水晶
  protect_crystal: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v_shield_c" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#bbf7d0"/>
          <stop offset="50%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#14532d"/>
        </linearGradient>
      </defs>
      <path d="M20 14 L44 14 L46 32 Q46 48 32 54 Q18 48 18 32 Z" fill="url(#v_shield_c)" stroke="#86efac" stroke-width="1.5"/>
      <circle cx="32" cy="32" r="6" fill="#ffffff" opacity="0.8"/>
    </svg>
  `,

  // 钥匙：红木/青铜/白金
  key_redwood: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="10" fill="none" stroke="#b91c1c" stroke-width="3"/>
      <line x1="29" y1="29" x2="48" y2="48" stroke="#b91c1c" stroke-width="4" stroke-linecap="round"/>
      <line x1="42" y1="42" x2="46" y2="38" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>
      <line x1="46" y1="46" x2="50" y2="42" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  key_bronze: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="10" fill="none" stroke="#d97706" stroke-width="3"/>
      <line x1="29" y1="29" x2="48" y2="48" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
      <line x1="42" y1="42" x2="46" y2="38" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>
      <line x1="46" y1="46" x2="50" y2="42" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  key_platinum: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="10" fill="none" stroke="#38bdf8" stroke-width="3"/>
      <line x1="29" y1="29" x2="48" y2="48" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
      <line x1="42" y1="42" x2="46" y2="38" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
      <line x1="46" y1="46" x2="50" y2="42" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,

  // 消耗品与材料
  potion_hp: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <rect x="27" y="10" width="10" height="6" rx="1.5" fill="#d97706" stroke="#78350f" stroke-width="0.8"/>
      <path d="M26 16 L38 16 L44 26 C48 34 46 50 32 52 C18 50 16 34 20 26 Z" fill="#991b1b" stroke="#f5c042" stroke-width="1.2"/>
      <path d="M22 28 C28 32 36 32 42 28 C45 36 43 47 32 49 C21 47 19 36 22 28 Z" fill="#ef4444" opacity="0.9"/>
      <ellipse cx="26" cy="34" rx="2.5" ry="6" fill="#ffffff" opacity="0.5" transform="rotate(-15 26 34)"/>
    </svg>
  `,
  potion_mp: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <rect x="27" y="10" width="10" height="6" rx="1.5" fill="#d97706" stroke="#78350f" stroke-width="0.8"/>
      <path d="M26 16 L38 16 L44 26 C48 34 46 50 32 52 C18 50 16 34 20 26 Z" fill="#1e40af" stroke="#38bdf8" stroke-width="1.2"/>
      <path d="M22 28 C28 32 36 32 42 28 C45 36 43 47 32 49 C21 47 19 36 22 28 Z" fill="#3b82f6" opacity="0.9"/>
      <ellipse cx="26" cy="34" rx="2.5" ry="6" fill="#ffffff" opacity="0.5" transform="rotate(-15 26 34)"/>
    </svg>
  `,
  fish_golden: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 32 C20 18 42 20 48 32 C42 44 20 46 12 32 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.2"/>
      <polygon points="48,32 56,22 53,32 56,42" fill="#d97706" stroke="#78350f" stroke-width="1"/>
      <circle cx="20" cy="29" r="2" fill="#000000"/>
      <circle cx="19" cy="28.5" r="0.6" fill="#ffffff"/>
      <path d="M28 26 Q32 32 28 38" fill="none" stroke="#fef08a" stroke-width="1.5"/>
      <path d="M34 27 Q38 32 34 37" fill="none" stroke="#fef08a" stroke-width="1.5"/>
    </svg>
  `,
  scroll_tp: `
    <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="18" width="28" height="28" rx="3" fill="#fef3c7" stroke="#b45309" stroke-width="1.2" transform="rotate(45 32 32)"/>
      <line x1="22" y1="32" x2="42" y2="32" stroke="#dc2626" stroke-width="2"/>
      <circle cx="32" cy="32" r="4" fill="#dc2626" stroke="#fef08a" stroke-width="0.8"/>
    </svg>
  `,

  // ==================== 3. 主城 5 大建筑徽记 ====================
  bld_smithy: `
    <svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 36 L52 36 L48 44 L40 44 L42 54 L22 54 L24 44 L16 44 Z" fill="#64748b" stroke="#f59e0b" stroke-width="1.2"/>
      <rect x="22" y="16" width="20" height="12" rx="2" fill="#eab308" stroke="#713f12" stroke-width="1" transform="rotate(-25 32 22)"/>
      <line x1="32" y1="22" x2="48" y2="34" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="28" cy="34" r="1.5" fill="#f97316"/>
      <circle cx="36" cy="32" r="1" fill="#ef4444"/>
    </svg>
  `,
  bld_palace: `
    <svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 44 L16 22 L26 32 L32 16 L38 32 L48 22 L52 44 Z" fill="#eab308" stroke="#713f12" stroke-width="1.2"/>
      <circle cx="16" cy="20" r="2" fill="#ef4444"/>
      <circle cx="32" cy="14" r="2.5" fill="#38bdf8"/>
      <circle cx="48" cy="20" r="2" fill="#ef4444"/>
      <rect x="12" y="44" width="40" height="6" rx="1" fill="#b45309"/>
      <circle cx="24" cy="47" r="1.5" fill="#ffffff"/>
      <circle cx="32" cy="47" r="1.5" fill="#ffffff"/>
      <circle cx="40" cy="47" r="1.5" fill="#ffffff"/>
    </svg>
  `,
  bld_dragons: `
    <svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 42 Q28 16 48 24 L52 34 L38 40 L44 50 Q28 54 14 42 Z" fill="#dc2626" stroke="#f5c042" stroke-width="1.2"/>
      <circle cx="38" cy="28" r="2.5" fill="#fbbf24"/>
      <circle cx="38" cy="28" r="1" fill="#000000"/>
      <polygon points="42,38 44,44 46,38" fill="#ffffff"/>
    </svg>
  `,
  bld_fishing: `
    <svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 32 Q26 20 46 26 Q54 22 50 32 Q54 42 46 38 Q26 44 14 32 Z" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>
      <circle cx="42" cy="28" r="1.5" fill="#000000"/>
      <path d="M30 14 Q30 26 24 28" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    </svg>
  `,
  bld_tavern: `
    <svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="22" width="22" height="28" rx="4" fill="#92400e" stroke="#f5c042" stroke-width="1.2"/>
      <path d="M42 26 Q52 26 52 36 Q52 46 42 46" fill="none" stroke="#f5c042" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="31" cy="22" rx="13" ry="5" fill="#fef3c7" stroke="#b45309" stroke-width="0.8"/>
    </svg>
  `
};

/**
 * 统一获取纯 SVG 矢量游戏图标，杜绝 Emoji
 */
export function getVectorIcon(key, wrapperClass = 'w-8 h-8', extraClass = '') {
  if (!key) return '';
  const painted = renderPaintedIcon(key, { size: wrapperClass, className: extraClass });
  if (painted) return painted;
  const svg = VECTOR_ICONS[key];
  if (svg) {
    return `<div class="inline-flex items-center justify-center ${wrapperClass} ${extraClass} pointer-events-none">${svg}</div>`;
  }
  // 智能模糊降级
  const k = key.toLowerCase();
  if (k.includes('hp') || k.includes('red_potion') || k.includes('potion_hp') || k.includes('health')) return getVectorIcon('potion_hp', wrapperClass, extraClass);
  if (k.includes('mp') || k.includes('blue_potion') || k.includes('potion_mp') || k.includes('mana')) return getVectorIcon('potion_mp', wrapperClass, extraClass);
  if (k.includes('fish') || k.includes('bait') || k.includes('lamprey')) return getVectorIcon('fish_golden', wrapperClass, extraClass);
  if (k.includes('scroll') || k.includes('teleport')) return getVectorIcon('scroll_tp', wrapperClass, extraClass);
  if (k.includes('sword') || k.includes('blade') || k.includes('weapon')) return getVectorIcon('weapon_sword', wrapperClass, extraClass);
  if (k.includes('staff') || k.includes('wand')) return getVectorIcon('weapon_staff', wrapperClass, extraClass);
  if (k.includes('bow')) return getVectorIcon('weapon_bow', wrapperClass, extraClass);
  if (k.includes('chest') || k.includes('plate') || k.includes('robe') || k.includes('armor')) return getVectorIcon('armor', wrapperClass, extraClass);
  if (k.includes('helm')) return getVectorIcon('helmet', wrapperClass, extraClass);
  if (k.includes('necklace') || k.includes('pendant')) return getVectorIcon('necklace', wrapperClass, extraClass);
  if (k.includes('glove')) return getVectorIcon('gloves', wrapperClass, extraClass);
  if (k.includes('belt')) return getVectorIcon('belt', wrapperClass, extraClass);
  if (k.includes('pants') || k.includes('greaves')) return getVectorIcon('pants', wrapperClass, extraClass);
  if (k.includes('boot')) return getVectorIcon('boots', wrapperClass, extraClass);
  if (k.includes('cloak')) return getVectorIcon('cloak', wrapperClass, extraClass);
  if (k.includes('ring')) return getVectorIcon('ring', wrapperClass, extraClass);
  if (k.includes('shield')) return getVectorIcon('shield', wrapperClass, extraClass);
  if (k.includes('key')) return getVectorIcon('key_bronze', wrapperClass, extraClass);
  if (k.includes('crystal') || k.includes('gem')) return getVectorIcon('star_crystal', wrapperClass, extraClass);
  if (k.includes('gold') || k.includes('coin')) return getVectorIcon('coin_gold', wrapperClass, extraClass);

  return getVectorIcon('weapon_sword', wrapperClass, extraClass);
}
