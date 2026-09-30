// 西方奇幻精致矢量插画与原画素材库 (精美 Western Fantasy 风格)
export const ART_ASSETS = {
  // 职业立绘
  hero_warrior: `
    <svg viewBox="0 0 200 240" class="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="w_gold" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="50%" stop-color="#eab308"/>
          <stop offset="100%" stop-color="#854d0e"/>
        </radialGradient>
        <linearGradient id="w_steel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="50%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <linearGradient id="w_cape" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#450a0a"/>
        </linearGradient>
      </defs>
      <!-- 披风 -->
      <path d="M50 80 Q30 150 20 230 Q100 210 180 230 Q170 150 150 80 Z" fill="url(#w_cape)" opacity="0.95"/>
      <!-- 重铠躯干 -->
      <path d="M60 80 L140 80 L130 170 L100 190 L70 170 Z" fill="url(#w_steel)" stroke="#eab308" stroke-width="2"/>
      <!-- 圣光胸甲十字纹 -->
      <path d="M100 90 L100 160 M75 120 L125 120" stroke="url(#w_gold)" stroke-width="5" stroke-linecap="round"/>
      <!-- 肩铠 -->
      <path d="M40 80 Q60 55 80 80 L70 110 L45 100 Z" fill="url(#w_gold)" stroke="#713f12" stroke-width="2"/>
      <path d="M160 80 Q140 55 120 80 L130 110 L155 100 Z" fill="url(#w_gold)" stroke="#713f12" stroke-width="2"/>
      <!-- 骑士重盔 -->
      <path d="M75 40 Q100 20 125 40 L125 75 L75 75 Z" fill="url(#w_steel)" stroke="#eab308" stroke-width="2"/>
      <path d="M85 55 L115 55" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/> <!-- 面罩眼缝蓝光 -->
      <path d="M96 15 Q100 5 104 15 L108 38 L92 38 Z" fill="#dc2626"/> <!-- 盔缨红翎 -->
      <!-- 黄金圣剑 -->
      <path d="M155 100 L185 30 L190 35 L160 105 Z" fill="#f8fafc" stroke="#eab308" stroke-width="1.5"/>
      <circle cx="160" cy="105" r="5" fill="#f59e0b"/>
      <!-- 狮鹫圣盾 -->
      <path d="M25 100 L65 95 L55 165 L25 140 Z" fill="url(#w_steel)" stroke="url(#w_gold)" stroke-width="3"/>
      <circle cx="45" cy="125" r="10" fill="url(#w_gold)"/>
    </svg>
  `,

  hero_mage: `
    <svg viewBox="0 0 200 240" class="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="m_arcane" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#e879f9"/>
          <stop offset="60%" stop-color="#8b5cf6"/>
          <stop offset="100%" stop-color="#3b0764"/>
        </radialGradient>
        <linearGradient id="m_robe" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#312e81"/>
          <stop offset="50%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- 奥术光环 -->
      <circle cx="100" cy="90" r="70" fill="none" stroke="#a855f7" stroke-width="2" stroke-dasharray="8 4" opacity="0.6"/>
      <!-- 法袍 -->
      <path d="M55 90 L145 90 L165 230 L35 230 Z" fill="url(#m_robe)" stroke="#c084fc" stroke-width="2"/>
      <path d="M90 90 L100 230 L110 90" stroke="#f59e0b" stroke-width="2"/>
      <!-- 兜帽与面容 -->
      <path d="M65 45 Q100 15 135 45 Q145 85 100 85 Q55 85 65 45 Z" fill="#1e1b4b" stroke="#a855f7" stroke-width="2"/>
      <circle cx="88" cy="58" r="3" fill="#38bdf8"/>
      <circle cx="112" cy="58" r="3" fill="#38bdf8"/>
      <!-- 奥术水晶法杖 -->
      <line x1="165" y1="35" x2="165" y2="230" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
      <polygon points="165,15 150,38 180,38" fill="url(#m_arcane)" stroke="#f472b6" stroke-width="2"/>
      <circle cx="165" cy="30" r="14" fill="#a855f7" opacity="0.3"/>
      <!-- 漂浮符文法球 -->
      <circle cx="45" cy="110" r="16" fill="url(#m_arcane)" stroke="#e879f9" stroke-width="2"/>
    </svg>
  `,

  hero_hunter: `
    <svg viewBox="0 0 200 240" class="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="h_cloak" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#14532d"/>
          <stop offset="50%" stop-color="#052e16"/>
          <stop offset="100%" stop-color="#022c22"/>
        </linearGradient>
      </defs>
      <!-- 游侠绿林斗篷 -->
      <path d="M45 80 Q25 150 15 230 Q100 215 185 230 Q175 150 155 80 Z" fill="url(#h_cloak)"/>
      <path d="M65 75 L135 75 L125 170 L75 170 Z" fill="#78350f" stroke="#eab308" stroke-width="1.5"/>
      <!-- 精灵兜帽 -->
      <path d="M70 45 Q100 20 130 45 L135 80 Q100 70 65 80 Z" fill="#14532d" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M85 58 Q100 62 115 58" stroke="#10b981" stroke-width="2"/>
      <!-- 追猎者战弓 -->
      <path d="M30 40 Q75 130 30 220" fill="none" stroke="#d97706" stroke-width="5" stroke-linecap="round"/>
      <line x1="30" y1="40" x2="30" y2="220" stroke="#f8fafc" stroke-width="1.5"/>
      <!-- 箭袋与羽箭 -->
      <rect x="140" y="80" width="22" height="70" rx="6" fill="#451a03" stroke="#b45309" stroke-width="2"/>
      <line x1="145" y1="65" x2="145" y2="85" stroke="#22c55e" stroke-width="3"/>
      <line x1="152" y1="60" x2="152" y2="85" stroke="#f59e0b" stroke-width="3"/>
    </svg>
  `,

  // 终极 Boss：黑翼龙皇
  boss_dragonking: `
    <svg viewBox="0 0 240 240" class="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="d_core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="50%" stop-color="#7f1d1d"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
        <linearGradient id="d_wing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="50%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#450a0a"/>
        </linearGradient>
      </defs>
      <!-- 巨大龙翼 -->
      <path d="M120 100 Q40 20 10 90 Q30 160 120 150 Z" fill="url(#d_wing)" stroke="#ef4444" stroke-width="2"/>
      <path d="M120 100 Q200 20 230 90 Q210 160 120 150 Z" fill="url(#d_wing)" stroke="#ef4444" stroke-width="2"/>
      <!-- 巨龙胸膛与鳞片 -->
      <path d="M90 110 L150 110 L140 210 L100 210 Z" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
      <path d="M100 130 L140 130 M105 155 L135 155 M110 180 L130 180" stroke="#dc2626" stroke-width="3"/>
      <!-- 威严黑龙头颅 -->
      <path d="M95 50 Q120 25 145 50 L140 95 L100 95 Z" fill="#020617" stroke="#ef4444" stroke-width="2"/>
      <!-- 龙角 -->
      <path d="M98 45 Q70 15 60 25 Q80 40 98 45 Z" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <path d="M142 45 Q170 15 180 25 Q160 40 142 45 Z" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <!-- 龙皇血瞳 -->
      <circle cx="108" cy="65" r="4" fill="#fbbf24"/>
      <circle cx="132" cy="65" r="4" fill="#fbbf24"/>
      <circle cx="108" cy="65" r="1.5" fill="#ef4444"/>
      <circle cx="132" cy="65" r="1.5" fill="#ef4444"/>
      <!-- 龙炎吐息光芒 -->
      <polygon points="120,90 105,120 135,120" fill="url(#d_core)"/>
    </svg>
  `,

  // 场景：宏伟魔塔
  tower_spire: `
    <svg viewBox="0 0 200 240" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="t_sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="60%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#311042"/>
        </linearGradient>
        <linearGradient id="t_stone" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- 天空与乌云 -->
      <rect width="200" height="240" fill="url(#t_sky)"/>
      <path d="M10 40 Q50 20 90 45 Q150 25 190 50" stroke="#c084fc" stroke-width="1.5" fill="none" opacity="0.4"/>
      <!-- 魔塔塔身（递进结构） -->
      <polygon points="85,20 115,20 120,70 80,70" fill="url(#t_stone)" stroke="#a855f7" stroke-width="1.5"/>
      <polygon points="75,70 125,70 135,140 65,140" fill="url(#t_stone)" stroke="#a855f7" stroke-width="2"/>
      <polygon points="55,140 145,140 160,230 40,230" fill="url(#t_stone)" stroke="#a855f7" stroke-width="2"/>
      <!-- 塔顶通天红魔光 -->
      <circle cx="100" cy="18" r="6" fill="#ef4444" filter="drop-shadow(0 0 6px #ef4444)"/>
      <line x1="100" y1="18" x2="100" y2="0" stroke="#f43f5e" stroke-width="3"/>
      <!-- 魔塔各层发光窗棂 -->
      <rect x="96" y="45" width="8" height="14" rx="3" fill="#fbbf24"/>
      <rect x="94" y="95" width="12" height="18" rx="4" fill="#fbbf24"/>
      <rect x="92" y="165" width="16" height="24" rx="4" fill="#fbbf24"/>
    </svg>
  `
};

export function getAsset(key) {
  return ART_ASSETS[key] || '';
}
export const getIllustration = getAsset;
