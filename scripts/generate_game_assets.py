#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《魔塔世界》2011 经典中世纪魔幻页游全套高保真矢量美术资产生成引擎
生成包含：10大槽位神兵防具、官方13大原著套装徽标、全部特殊道具与丹药宝石、
22种远古神兽完整立绘头像、三大职业头像、三大古代城邦国徽、核心建筑图标等。
"""

import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(ROOT_DIR, 'images')

def ensure_dirs():
    for sub in ['items', 'pets', 'heroes', 'ui', 'maps', 'bosses', 'monsters']:
        os.makedirs(os.path.join(IMAGES_DIR, sub), exist_ok=True)

# 基础渐变库与公用滤镜
COMMON_DEFS = """
<defs>
  <!-- 金色金属渐变 -->
  <linearGradient id="g_gold" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#fffbeb"/>
    <stop offset="25%" stop-color="#fef08a"/>
    <stop offset="55%" stop-color="#d97706"/>
    <stop offset="85%" stop-color="#92400e"/>
    <stop offset="100%" stop-color="#451a03"/>
  </linearGradient>
  <radialGradient id="g_gold_rad" cx="40%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="30%" stop-color="#fef08a"/>
    <stop offset="60%" stop-color="#eab308"/>
    <stop offset="85%" stop-color="#b45309"/>
    <stop offset="100%" stop-color="#713f12"/>
  </radialGradient>

  <!-- 秘银白钢渐变 -->
  <linearGradient id="g_steel" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="30%" stop-color="#e2e8f0"/>
    <stop offset="65%" stop-color="#94a3b8"/>
    <stop offset="90%" stop-color="#475569"/>
    <stop offset="100%" stop-color="#1e293b"/>
  </linearGradient>

  <!-- 漆黑暗曜铁渐变 -->
  <linearGradient id="g_darkiron" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#475569"/>
    <stop offset="50%" stop-color="#1e293b"/>
    <stop offset="100%" stop-color="#090d16"/>
  </linearGradient>

  <!-- 红宝石鲜血渐变 -->
  <radialGradient id="g_ruby" cx="35%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#fecaca"/>
    <stop offset="30%" stop-color="#ef4444"/>
    <stop offset="70%" stop-color="#b91c1c"/>
    <stop offset="100%" stop-color="#450a0a"/>
  </radialGradient>

  <!-- 蓝宝石奥术渐变 -->
  <radialGradient id="g_sapphire" cx="35%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#bae6fd"/>
    <stop offset="30%" stop-color="#38bdf8"/>
    <stop offset="70%" stop-color="#0284c7"/>
    <stop offset="100%" stop-color="#082f49"/>
  </radialGradient>

  <!-- 翡翠碧玉渐变 -->
  <radialGradient id="g_emerald" cx="35%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#bbf7d0"/>
    <stop offset="30%" stop-color="#22c55e"/>
    <stop offset="70%" stop-color="#15803d"/>
    <stop offset="100%" stop-color="#052e16"/>
  </radialGradient>

  <!-- 紫金星辉渐变 -->
  <radialGradient id="g_purple" cx="35%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#f5d0fe"/>
    <stop offset="30%" stop-color="#c084fc"/>
    <stop offset="70%" stop-color="#7e22ce"/>
    <stop offset="100%" stop-color="#3b0764"/>
  </radialGradient>

  <!-- 烈焰炽火渐变 -->
  <linearGradient id="g_fire" x1="0%" y1="100%" x2="0%" y2="0%">
    <stop offset="0%" stop-color="#b91c1c"/>
    <stop offset="40%" stop-color="#ea580c"/>
    <stop offset="75%" stop-color="#f59e0b"/>
    <stop offset="100%" stop-color="#fef08a"/>
  </linearGradient>

  <!-- 外发光与投影滤镜 -->
  <filter id="f_glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="2" result="blur"/>
    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
  </filter>
  <filter id="f_gold_glow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#f5c042" flood-opacity="0.8"/>
  </filter>
</defs>
"""

def wrap_svg(inner_content, bg=None, size=64):
    bg_xml = ""
    if bg == "dark_slot":
        bg_xml = f'<rect width="{size}" height="{size}" rx="10" fill="#0d1117" stroke="#334155" stroke-width="1.5"/>'
    elif bg == "gold_frame":
        bg_xml = f'<rect width="{size}" height="{size}" rx="10" fill="#18130c" stroke="#d97706" stroke-width="1.8"/>'
    elif bg == "pet_circle":
        bg_xml = f'<circle cx="{size/2}" cy="{size/2}" r="{size/2-2}" fill="#111827" stroke="#ca8a04" stroke-width="2"/>'
    
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" class="w-full h-full">
{COMMON_DEFS}
{bg_xml}
{inner_content}
</svg>"""

# ==================== 资产图纸定义 ====================
ASSETS = {}

# ----------------- 1. 10大槽位装备与神兵 -----------------
ASSETS['items/wpn_sword'] = wrap_svg("""
  <!-- 圣光长剑 (战士) -->
  <path d="M48 8 L56 16 L34 38 L26 38 L26 30 Z" fill="url(#g_steel)" stroke="#334155" stroke-width="0.8"/>
  <path d="M50 10 L54 14 L33 35 L30 35 L30 32 Z" fill="#ffffff" opacity="0.4"/>
  <line x1="53" y1="11" x2="28" y2="36" stroke="#ffffff" stroke-width="1.2"/>
  <path d="M22 34 Q30 30 36 24 L38 26 Q32 36 28 42 Z" fill="url(#g_gold)" stroke="#78350f" stroke-width="0.8"/>
  <circle cx="28" cy="34" r="3" fill="url(#g_ruby)" stroke="#fef08a" stroke-width="0.5"/>
  <line x1="25" y1="37" x2="16" y2="48" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="14" cy="50" r="4" fill="url(#g_gold)" stroke="#78350f" stroke-width="0.8"/>
""")

ASSETS['items/wpn_staff'] = wrap_svg("""
  <!-- 奥术水晶魔杖 (法师) -->
  <line x1="52" y1="12" x2="14" y2="52" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
  <line x1="50" y1="14" x2="16" y2="50" stroke="#b45309" stroke-width="1" stroke-linecap="round"/>
  <path d="M42 22 Q48 10 56 12 Q52 24 44 26 Z" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <path d="M44 26 Q36 20 40 12 Q50 18 46 28 Z" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <circle cx="48" cy="16" r="8" fill="url(#g_purple)" stroke="#e879f9" stroke-width="1" filter="url(#f_glow)"/>
  <circle cx="46" cy="14" r="2.5" fill="#ffffff" opacity="0.9"/>
  <ellipse cx="48" cy="16" rx="11" ry="5" fill="none" stroke="#38bdf8" stroke-width="0.8" transform="rotate(-30 48 16)" stroke-dasharray="3 2"/>
""")

ASSETS['items/wpn_bow'] = wrap_svg("""
  <!-- 龙骨战弓 (猎人) -->
  <path d="M16 12 Q48 24 48 52" fill="none" stroke="#92400e" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M16 12 Q48 24 48 52" fill="none" stroke="url(#g_gold)" stroke-width="1.5" opacity="0.8"/>
  <circle cx="16" cy="12" r="3" fill="url(#g_gold)" stroke="#451a03" stroke-width="0.5"/>
  <circle cx="48" cy="52" r="3" fill="url(#g_gold)" stroke="#451a03" stroke-width="0.5"/>
  <line x1="16" y1="12" x2="48" y2="52" stroke="#e2e8f0" stroke-width="1.2"/>
  <line x1="22" y1="42" x2="52" y2="20" stroke="#f1f5f9" stroke-width="2" stroke-linecap="round"/>
  <polygon points="54,18 48,19 51,25" fill="#ef4444"/>
""")

ASSETS['items/arm_chest'] = wrap_svg("""
  <!-- 护胸·狮王秘银重铠 -->
  <path d="M12 20 Q20 12 26 20 L24 32 L12 26 Z" fill="url(#g_gold)" stroke="#713f12" stroke-width="1"/>
  <path d="M52 20 Q44 12 38 20 L40 32 L52 26 Z" fill="url(#g_gold)" stroke="#713f12" stroke-width="1"/>
  <path d="M20 18 L44 18 L46 36 L32 54 L18 36 Z" fill="url(#g_steel)" stroke="#caa048" stroke-width="1.5"/>
  <circle cx="32" cy="30" r="7" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <path d="M29 32 L35 32 M32 29 L32 33" stroke="#451a03" stroke-width="1.2"/>
  <path d="M24 40 L40 40 L38 46 L26 46 Z" fill="#334155" stroke="#caa048" stroke-width="0.8"/>
  <path d="M26 46 L38 46 L35 51 L29 51 Z" fill="#1e293b" stroke="#caa048" stroke-width="0.8"/>
""")

ASSETS['items/arm_robe'] = wrap_svg("""
  <!-- 护胸·秘法长袍 -->
  <path d="M20 14 L44 14 L50 28 L40 32 L44 54 L20 54 L24 32 L14 28 Z" fill="url(#g_purple)" stroke="#eab308" stroke-width="1.5"/>
  <path d="M30 14 L34 14 L36 54 L28 54 Z" fill="url(#g_gold)" opacity="0.7"/>
  <circle cx="32" cy="24" r="3.5" fill="url(#g_sapphire)" stroke="#ffffff" stroke-width="0.8"/>
""")

ASSETS['items/eq_helmet'] = wrap_svg("""
  <!-- 头盔·圣耀重盔 -->
  <path d="M32 6 Q28 14 30 18 Q36 14 32 6 Z" fill="#dc2626"/>
  <path d="M30 6 Q20 12 18 20 Q28 16 30 6 Z" fill="#991b1b"/>
  <path d="M18 22 Q32 14 46 22 L48 42 L42 54 L22 54 L16 42 Z" fill="url(#g_steel)" stroke="#caa048" stroke-width="1.5"/>
  <rect x="30" y="24" width="4" height="26" fill="url(#g_gold)" stroke="#854d0e" stroke-width="0.5"/>
  <rect x="20" y="32" width="24" height="4" fill="url(#g_gold)" stroke="#854d0e" stroke-width="0.5"/>
  <line x1="22" y1="34" x2="28" y2="34" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="36" y1="34" x2="42" y2="34" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
""")

ASSETS['items/eq_pants'] = wrap_svg("""
  <!-- 护腿·秘银腿甲 -->
  <path d="M16 12 L30 12 L28 48 L14 48 Z" fill="url(#g_steel)" stroke="#caa048" stroke-width="1.2"/>
  <path d="M34 12 L48 12 L50 48 L36 48 Z" fill="url(#g_steel)" stroke="#caa048" stroke-width="1.2"/>
  <circle cx="22" cy="24" r="5" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <circle cx="42" cy="24" r="5" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <line x1="21" y1="32" x2="21" y2="44" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <line x1="43" y1="32" x2="43" y2="44" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
""")

ASSETS['items/eq_boots'] = wrap_svg("""
  <!-- 护靴·泰坦战靴 -->
  <path d="M18 12 L34 12 L34 36 L48 44 L48 52 L14 52 L14 36 Z" fill="url(#g_steel)" stroke="#caa048" stroke-width="1.5"/>
  <path d="M36 42 L48 44 L48 52 L36 52 Z" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <polygon points="12,46 6,48 12,50" fill="url(#g_gold)"/>
  <rect x="18" y="24" width="16" height="4" rx="1" fill="#78350f"/>
""")

ASSETS['items/eq_gloves'] = wrap_svg("""
  <!-- 护手·铁拳臂铠 -->
  <path d="M18 14 L46 14 L44 32 L20 32 Z" fill="url(#g_steel)" stroke="#caa048" stroke-width="1.2"/>
  <circle cx="32" cy="22" r="3" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.5"/>
  <rect x="20" y="34" width="24" height="6" rx="2" fill="#475569" stroke="#64748b" stroke-width="0.8"/>
  <rect x="22" y="42" width="20" height="8" rx="2" fill="#334155" stroke="#64748b" stroke-width="0.8"/>
  <polygon points="24,50 26,56 28,50" fill="url(#g_gold)"/>
  <polygon points="30,50 32,57 34,50" fill="url(#g_gold)"/>
  <polygon points="36,50 38,56 40,50" fill="url(#g_gold)"/>
""")

ASSETS['items/eq_cloak'] = wrap_svg("""
  <!-- 披风·晨曦战袍 -->
  <line x1="22" y1="14" x2="42" y2="14" stroke="url(#g_gold)" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="22" cy="14" r="3.5" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <circle cx="42" cy="14" r="3.5" fill="url(#g_gold)" stroke="#713f12" stroke-width="0.8"/>
  <path d="M22 16 Q14 36 10 56 Q32 50 54 56 Q50 36 42 16 Z" fill="url(#g_ruby)" stroke="#7f1d1d" stroke-width="1.2"/>
  <path d="M22 16 Q26 36 28 52" stroke="#7f1d1d" stroke-width="1.5" fill="none"/>
  <path d="M42 16 Q38 36 36 52" stroke="#7f1d1d" stroke-width="1.5" fill="none"/>
  <path d="M10 56 Q32 50 54 56" stroke="url(#g_gold)" stroke-width="1.5" fill="none"/>
""")

ASSETS['items/eq_belt'] = wrap_svg("""
  <!-- 腰带·龙筋重带 -->
  <rect x="8" y="24" width="48" height="16" rx="3" fill="#78350f" stroke="#caa048" stroke-width="1.2"/>
  <line x1="8" y1="32" x2="56" y2="32" stroke="#451a03" stroke-width="1" stroke-dasharray="2 2"/>
  <rect x="24" y="20" width="16" height="24" rx="4" fill="url(#g_gold)" stroke="#713f12" stroke-width="1.2"/>
  <circle cx="32" cy="32" r="5" fill="url(#g_ruby)" stroke="#fef08a" stroke-width="0.8"/>
  <circle cx="16" cy="32" r="2" fill="url(#g_gold)"/>
  <circle cx="48" cy="32" r="2" fill="url(#g_gold)"/>
""")

ASSETS['items/eq_necklace'] = wrap_svg("""
  <!-- 项链·星辰护符 -->
  <path d="M16 14 Q32 32 48 14" fill="none" stroke="url(#g_gold)" stroke-width="2.2" stroke-dasharray="2 2"/>
  <path d="M22 18 Q32 36 42 18" fill="none" stroke="#d97706" stroke-width="1"/>
  <path d="M24 38 Q32 30 40 38 L32 50 Z" fill="url(#g_gold)" stroke="#78350f" stroke-width="1"/>
  <polygon points="32,32 38,40 32,48 26,40" fill="url(#g_ruby)" stroke="#fef08a" stroke-width="0.8"/>
  <circle cx="30" cy="36" r="1.5" fill="#ffffff" opacity="0.9"/>
""")

ASSETS['items/eq_ring'] = wrap_svg("""
  <!-- 戒指·誓约金戒 -->
  <circle cx="32" cy="36" r="16" fill="none" stroke="url(#g_gold)" stroke-width="5.5"/>
  <circle cx="32" cy="36" r="16" fill="none" stroke="#d97706" stroke-width="1"/>
  <polygon points="32,10 42,16 32,24 22,16" fill="url(#g_gold)" stroke="#78350f" stroke-width="0.8"/>
  <polygon points="32,12 39,17 32,22 25,17" fill="url(#g_sapphire)" stroke="#ffffff" stroke-width="0.6"/>
  <circle cx="30" cy="15" r="1.5" fill="#ffffff"/>
""")

ASSETS['items/shield'] = wrap_svg("""
  <!-- 盾牌·狮鹫金盾 -->
  <path d="M14 12 L50 12 L50 36 Q50 54 32 60 Q14 54 14 36 Z" fill="url(#g_darkiron)" stroke="#caa048" stroke-width="2"/>
  <path d="M18 16 L46 16 L46 36 Q46 50 32 55 Q18 50 18 36 Z" fill="none" stroke="#d97706" stroke-width="1"/>
  <polygon points="32,22 40,32 32,42 24,32" fill="url(#g_gold)" stroke="#78350f" stroke-width="1"/>
  <circle cx="32" cy="32" r="3.5" fill="url(#g_ruby)"/>
""")

# ----------------- 槽位暗纹镂空水印 (Empty Slot Watermarks) -----------------
SLOTS = ['weapon', 'armor', 'pants', 'cloak', 'helmet', 'gloves', 'boots', 'belt', 'necklace', 'ring']
for s in SLOTS:
    icon_key = "items/wpn_sword" if s == 'weapon' else "items/arm_chest" if s == 'armor' else f"items/eq_{s}"
    base_body = ASSETS[icon_key].split('</defs>')[1].replace('</svg>', '') if '</defs>' in ASSETS[icon_key] else ''
    ASSETS[f"ui/slot_{s}"] = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-full h-full opacity-25 filter grayscale hover:grayscale-0 transition-all">
{COMMON_DEFS}
<rect width="64" height="64" rx="8" fill="#18130c" stroke="#4a3520" stroke-width="1"/>
{base_body}
</svg>"""

# ----------------- 2. 官方13大原著套装徽标 -----------------
def make_set_badge(color1, color2, icon_type, aura_color="#f5c042"):
    return wrap_svg(f"""
      <circle cx="32" cy="32" r="26" fill="#18130c" stroke="{aura_color}" stroke-width="2" filter="url(#f_gold_glow)"/>
      <circle cx="32" cy="32" r="22" fill="none" stroke="{color1}" stroke-width="1" stroke-dasharray="3 2"/>
      <polygon points="32,12 48,22 48,42 32,52 16,42 16,22" fill="{color2}" stroke="{color1}" stroke-width="1.5"/>
      <circle cx="32" cy="32" r="8" fill="{color1}" stroke="#ffffff" stroke-width="1"/>
      <path d="M30 32 L34 32 M32 30 L32 34" stroke="#ffffff" stroke-width="1.5"/>
    """)

ASSETS['items/set_courage'] = make_set_badge("#eab308", "#78350f", "lion", "#f59e0b")
ASSETS['items/set_guardian'] = make_set_badge("#94a3b8", "#1e293b", "shield", "#38bdf8")
ASSETS['items/set_sagael'] = make_set_badge("#ea580c", "#451a03", "wolf", "#f97316")
ASSETS['items/set_judge'] = make_set_badge("#a855f7", "#3b0764", "scales", "#c084fc")
ASSETS['items/set_kester'] = make_set_badge("#22c55e", "#052e16", "leaf", "#4ade80")
ASSETS['items/set_punisher'] = make_set_badge("#ef4444", "#450a0a", "blade", "#f87171")
ASSETS['items/set_aden'] = make_set_badge("#fef08a", "#1e3a8a", "crown", "#fbbf24")
ASSETS['items/set_conqueror'] = make_set_badge("#e11d48", "#0f172a", "skull", "#fb7185")
ASSETS['items/set_destiny_goddess'] = make_set_badge("#c084fc", "#581c87", "star", "#e879f9")
ASSETS['items/set_wisdom_goddess'] = make_set_badge("#38bdf8", "#0c4a6e", "orb", "#7dd3fc")
ASSETS['items/set_wargod'] = make_set_badge("#f59e0b", "#7f1d1d", "fire", "#ef4444")
ASSETS['items/set_victory_goddess'] = make_set_badge("#facc15", "#854d0e", "wing", "#fde047")
ASSETS['items/set_karlis'] = make_set_badge("#ec4899", "#2e1065", "void", "#d946ef")

# ----------------- 3. 核心道具、消耗品与宝石 -----------------
ASSETS['items/key_redwood'] = wrap_svg("""
  <!-- 红木钥匙 -->
  <circle cx="22" cy="22" r="10" fill="none" stroke="#b91c1c" stroke-width="3.5"/>
  <circle cx="22" cy="22" r="5" fill="#450a0a"/>
  <line x1="29" y1="29" x2="48" y2="48" stroke="#b91c1c" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="42" y1="42" x2="46" y2="38" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>
  <line x1="46" y1="46" x2="50" y2="42" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>
""")

ASSETS['items/key_bronze'] = wrap_svg("""
  <!-- 青铜钥匙 -->
  <circle cx="22" cy="22" r="10" fill="none" stroke="url(#g_gold)" stroke-width="3.5"/>
  <circle cx="22" cy="22" r="5" fill="#451a03"/>
  <line x1="29" y1="29" x2="48" y2="48" stroke="url(#g_gold)" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="42" y1="42" x2="46" y2="38" stroke="url(#g_gold)" stroke-width="3" stroke-linecap="round"/>
  <line x1="46" y1="46" x2="50" y2="42" stroke="url(#g_gold)" stroke-width="3" stroke-linecap="round"/>
""")

ASSETS['items/key_platinum'] = wrap_svg("""
  <!-- 白金钥匙 -->
  <circle cx="22" cy="22" r="10" fill="none" stroke="#38bdf8" stroke-width="3.5"/>
  <polygon points="22,18 25,22 22,26 19,22" fill="#ffffff"/>
  <line x1="29" y1="29" x2="48" y2="48" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="42" y1="42" x2="46" y2="38" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <line x1="46" y1="46" x2="50" y2="42" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
""")

ASSETS['items/star_crystal'] = wrap_svg("""
  <!-- 升星水晶 -->
  <circle cx="32" cy="32" r="22" fill="none" stroke="url(#g_gold)" stroke-width="1" stroke-dasharray="3 3"/>
  <polygon points="32,8 36,26 54,26 40,36 46,54 32,42 18,54 24,36 10,26 28,26" fill="url(#g_gold)" stroke="#ffffff" stroke-width="1.2" filter="url(#f_glow)"/>
  <circle cx="32" cy="32" r="6" fill="#ffffff"/>
""")

ASSETS['items/protect_crystal'] = wrap_svg("""
  <!-- 保护水晶 -->
  <path d="M20 14 L44 14 L46 32 Q46 48 32 54 Q18 48 18 32 Z" fill="url(#g_emerald)" stroke="#86efac" stroke-width="1.8"/>
  <circle cx="32" cy="32" r="6" fill="#ffffff" opacity="0.85"/>
  <path d="M30 32 L34 32 M32 30 L32 34" stroke="#052e16" stroke-width="1.5"/>
""")

ASSETS['items/socket_crystal'] = wrap_svg("""
  <!-- 开孔水晶 -->
  <polygon points="32,8 48,24 40,54 24,54 16,24" fill="url(#g_sapphire)" stroke="#e0f2fe" stroke-width="1.5"/>
  <polygon points="32,8 40,28 24,28" fill="#ffffff" opacity="0.5"/>
  <circle cx="32" cy="40" r="3.5" fill="#ffffff"/>
""")

ASSETS['items/evolution_stone'] = wrap_svg("""
  <!-- 进化石 (黄金转暗金) -->
  <circle cx="32" cy="32" r="22" fill="url(#g_gold_rad)" stroke="#b45309" stroke-width="2"/>
  <path d="M22 32 A 10 10 0 0 1 42 32 A 10 10 0 0 1 22 32" fill="none" stroke="#451a03" stroke-width="3" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="4" fill="#dc2626"/>
""")

ASSETS['items/destiny_stone'] = wrap_svg("""
  <!-- 天命石 (暗金转紫金) -->
  <circle cx="32" cy="32" r="22" fill="url(#g_purple)" stroke="#f5d0fe" stroke-width="2" filter="url(#f_glow)"/>
  <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="4 2"/>
  <circle cx="28" cy="26" r="4" fill="#ffffff" opacity="0.8"/>
  <circle cx="38" cy="36" r="2" fill="#ffffff" opacity="0.8"/>
""")

ASSETS['items/pet_food'] = wrap_svg("""
  <!-- 远古魔能兽肉 -->
  <path d="M16 28 C16 16 34 16 42 22 C50 28 48 44 38 48 C28 52 16 40 16 28 Z" fill="url(#g_ruby)" stroke="#fecaca" stroke-width="1.5"/>
  <circle cx="44" cy="46" r="5" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
  <circle cx="48" cy="40" r="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
  <ellipse cx="28" cy="28" rx="4" ry="7" fill="#fca5a5" opacity="0.6" transform="rotate(-30 28 28)"/>
""")

ASSETS['items/pill_reborn'] = wrap_svg("""
  <!-- 远古重铸灵药 -->
  <path d="M18 42 L46 42 L42 54 L22 54 Z" fill="url(#g_gold)" stroke="#78350f" stroke-width="1"/>
  <circle cx="32" cy="26" r="14" fill="url(#g_gold_rad)" stroke="#ffffff" stroke-width="1.8" filter="url(#f_glow)"/>
  <circle cx="30" cy="23" r="3.5" fill="#ffffff"/>
  <path d="M16 26 Q24 20 32 26 Q40 32 48 26" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="2 2"/>
""")

ASSETS['items/pet_egg'] = wrap_svg("""
  <!-- 远古神兽契约蛋 -->
  <ellipse cx="32" cy="34" rx="18" ry="24" fill="url(#g_gold_rad)" stroke="#b45309" stroke-width="2"/>
  <path d="M22 28 Q32 36 42 28" fill="none" stroke="#78350f" stroke-width="2"/>
  <path d="M20 40 Q32 48 44 40" fill="none" stroke="#78350f" stroke-width="2"/>
  <polygon points="32,16 36,24 32,22 28,24" fill="#dc2626"/>
""")

ASSETS['items/bait_normal'] = wrap_svg("""
  <!-- 普通鱼饵 -->
  <rect x="18" y="24" width="28" height="24" rx="4" fill="#92400e" stroke="#caa048" stroke-width="1.2"/>
  <path d="M24 18 Q32 12 40 18" stroke="#38bdf8" stroke-width="2" fill="none"/>
  <path d="M26 32 Q32 38 38 32" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round"/>
""")

ASSETS['items/bait_luxury'] = wrap_svg("""
  <!-- 高级金晶虾饵 -->
  <path d="M20 38 Q32 20 46 26 Q40 46 24 42 Z" fill="url(#g_gold)" stroke="#b45309" stroke-width="1.5"/>
  <circle cx="42" cy="28" r="2" fill="#000000"/>
  <line x1="44" y1="26" x2="52" y2="20" stroke="#f59e0b" stroke-width="1.5"/>
  <line x1="42" y1="24" x2="48" y2="16" stroke="#f59e0b" stroke-width="1.5"/>
""")

ASSETS['items/crystal_gold'] = wrap_svg("""
  <!-- 黄金晶石 -->
  <polygon points="32,10 50,22 42,50 22,50 14,22" fill="url(#g_gold)" stroke="#fef08a" stroke-width="1.5"/>
  <polygon points="32,10 42,26 22,26" fill="#ffffff" opacity="0.6"/>
""")

ASSETS['items/crystal_darkgold'] = wrap_svg("""
  <!-- 暗金晶石 -->
  <polygon points="32,10 50,22 42,50 22,50 14,22" fill="url(#g_fire)" stroke="#fbbf24" stroke-width="1.5"/>
  <polygon points="32,10 42,26 22,26" fill="#ffffff" opacity="0.5"/>
""")

ASSETS['items/crystal_purplegold'] = wrap_svg("""
  <!-- 紫金晶石 -->
  <polygon points="32,10 50,22 42,50 22,50 14,22" fill="url(#g_purple)" stroke="#f5d0fe" stroke-width="1.5"/>
  <polygon points="32,10 42,26 22,26" fill="#ffffff" opacity="0.6"/>
""")

ASSETS['items/gem_atk'] = wrap_svg("""
  <!-- 攻击·金刚石 -->
  <polygon points="22,16 42,16 52,28 32,50 12,28" fill="url(#g_ruby)" stroke="#fecaca" stroke-width="1.5"/>
  <polygon points="22,16 42,16 32,28" fill="#ffffff" opacity="0.6"/>
  <line x1="12" y1="28" x2="52" y2="28" stroke="#ffffff" stroke-width="1" opacity="0.8"/>
""")

ASSETS['items/gem_def'] = wrap_svg("""
  <!-- 防御·玛瑙石 -->
  <ellipse cx="32" cy="32" rx="18" ry="15" fill="url(#g_sapphire)" stroke="#bae6fd" stroke-width="1.5"/>
  <path d="M18 32 Q32 24 46 32" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.7"/>
  <circle cx="28" cy="28" r="2" fill="#ffffff"/>
""")

ASSETS['items/gem_hp'] = wrap_svg("""
  <!-- 生命·红宝石 -->
  <path d="M32 18 C32 18 20 12 16 22 C12 32 32 48 32 48 C32 48 52 32 48 22 C44 12 32 18 32 18 Z" fill="url(#g_ruby)" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="24" cy="22" r="2.5" fill="#ffffff" opacity="0.8"/>
""")

ASSETS['items/gem_dex'] = wrap_svg("""
  <!-- 敏捷·翡翠石 -->
  <polygon points="32,14 48,32 32,50 16,32" fill="url(#g_emerald)" stroke="#bbf7d0" stroke-width="1.5"/>
  <polygon points="32,20 42,32 32,44 22,32" fill="#ffffff" opacity="0.5"/>
""")

ASSETS['items/potion_hp'] = wrap_svg("""
  <!-- 强效生命药剂 -->
  <rect x="27" y="10" width="10" height="6" rx="1.5" fill="#d97706" stroke="#78350f" stroke-width="0.8"/>
  <path d="M26 16 L38 16 L44 26 C48 34 46 50 32 52 C18 50 16 34 20 26 Z" fill="url(#g_ruby)" stroke="#f5c042" stroke-width="1.2"/>
  <ellipse cx="26" cy="34" rx="2.5" ry="6" fill="#ffffff" opacity="0.5" transform="rotate(-15 26 34)"/>
""")

ASSETS['items/potion_mp'] = wrap_svg("""
  <!-- 强效魔力药水 -->
  <rect x="27" y="10" width="10" height="6" rx="1.5" fill="#d97706" stroke="#78350f" stroke-width="0.8"/>
  <path d="M26 16 L38 16 L44 26 C48 34 46 50 32 52 C18 50 16 34 20 26 Z" fill="url(#g_sapphire)" stroke="#38bdf8" stroke-width="1.2"/>
  <ellipse cx="26" cy="34" rx="2.5" ry="6" fill="#ffffff" opacity="0.5" transform="rotate(-15 26 34)"/>
""")

ASSETS['items/fish_lamprey'] = wrap_svg("""
  <!-- 七鳃鳗 -->
  <path d="M12 34 Q24 20 42 26 Q54 30 50 38 Q36 44 12 34 Z" fill="#334155" stroke="#94a3b8" stroke-width="1.2"/>
  <circle cx="44" cy="28" r="1.5" fill="#ef4444"/>
  <circle cx="34" cy="31" r="1" fill="#94a3b8"/>
  <circle cx="30" cy="32" r="1" fill="#94a3b8"/>
  <circle cx="26" cy="33" r="1" fill="#94a3b8"/>
""")

ASSETS['items/fish_arowana'] = wrap_svg("""
  <!-- 金龙鱼 -->
  <path d="M12 32 C20 18 42 20 48 32 C42 44 20 46 12 32 Z" fill="url(#g_gold)" stroke="#b45309" stroke-width="1.5"/>
  <polygon points="48,32 56,22 53,32 56,42" fill="#d97706" stroke="#78350f" stroke-width="1"/>
  <circle cx="20" cy="29" r="2.5" fill="#000000"/>
  <circle cx="19" cy="28" r="0.8" fill="#ffffff"/>
  <path d="M28 26 Q32 32 28 38" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <path d="M34 27 Q38 32 34 37" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="16" y1="31" x2="10" y2="28" stroke="#eab308" stroke-width="1.5"/>
  <line x1="16" y1="33" x2="10" y2="36" stroke="#eab308" stroke-width="1.5"/>
""")

ASSETS['items/scroll_tp'] = wrap_svg("""
  <!-- 回城卷轴 -->
  <rect x="18" y="18" width="28" height="28" rx="3" fill="#fef3c7" stroke="#b45309" stroke-width="1.5" transform="rotate(45 32 32)"/>
  <circle cx="32" cy="32" r="6" fill="url(#g_ruby)" stroke="#fef08a" stroke-width="1"/>
""")

ASSETS['items/coin_gold'] = wrap_svg("""
  <!-- 金币 -->
  <circle cx="32" cy="32" r="24" fill="#78350f"/>
  <circle cx="32" cy="32" r="23" fill="url(#g_gold_rad)"/>
  <circle cx="32" cy="32" r="19" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="2 1.5"/>
  <path d="M32 18 L34 29 L45 31 L34 33 L32 44 L30 33 L19 31 L30 29 Z" fill="#fef08a" stroke="#854d0e" stroke-width="0.8"/>
""")

# ----------------- 4. 百度百科全部 22 种原著神兽宠物头像 -----------------
def make_pet(head_shape, eye_color, aura_color="#f5c042", extra=""):
    return wrap_svg(f"""
      <circle cx="32" cy="32" r="28" fill="#111827" stroke="{aura_color}" stroke-width="2.5" filter="url(#f_gold_glow)"/>
      <circle cx="32" cy="32" r="25" fill="none" stroke="#374151" stroke-width="1"/>
      {head_shape}
      {extra}
    """)

# 1. 金龙
ASSETS['pets/pet_golden_dragon'] = make_pet("""
  <path d="M18 44 Q22 24 38 20 L48 12 L44 26 Q52 34 46 46 Q32 50 18 44 Z" fill="url(#g_gold)" stroke="#78350f" stroke-width="1.2"/>
  <path d="M38 20 L48 10 M34 22 L42 14" stroke="#eab308" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="34,26 40,28 36,32" fill="#dc2626"/>
  <circle cx="36" cy="28" r="2.5" fill="#dc2626" stroke="#fef08a" stroke-width="0.5"/>
  <circle cx="35" cy="27" r="0.8" fill="#ffffff"/>
""", "#dc2626", "#f5c042")

# 2. 美人鱼
ASSETS['pets/pet_mermaid'] = make_pet("""
  <path d="M18 16 Q32 8 46 16 Q52 36 44 48 Q32 54 20 48 Q12 36 18 16 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="1"/>
  <circle cx="32" cy="30" r="11" fill="#fed7aa"/>
  <circle cx="28" cy="30" r="1.8" fill="#0284c7"/>
  <circle cx="36" cy="30" r="1.8" fill="#0284c7"/>
  <path d="M29 36 Q32 39 35 36" fill="none" stroke="#e11d48" stroke-width="1.2"/>
  <polygon points="32,16 34,20 32,22 30,20" fill="url(#g_gold)"/>
""", "#38bdf8", "#0ea5e9")

# 3. 银龙
ASSETS['pets/pet_silver_dragon'] = make_pet("""
  <path d="M18 44 Q22 24 38 20 L48 12 L44 26 Q52 34 46 46 Q32 50 18 44 Z" fill="url(#g_steel)" stroke="#0284c7" stroke-width="1.2"/>
  <path d="M38 20 L48 10 M34 22 L42 14" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="36" cy="28" r="2.5" fill="#38bdf8" stroke="#ffffff" stroke-width="0.5"/>
  <circle cx="35" cy="27" r="0.8" fill="#ffffff"/>
""", "#38bdf8", "#94a3b8")

# 4. 巨灵
ASSETS['pets/pet_djinn'] = make_pet("""
  <circle cx="32" cy="28" r="13" fill="url(#g_purple)" stroke="#c084fc" stroke-width="1"/>
  <path d="M20 42 Q32 38 44 42 Q38 52 32 54 Q26 52 20 42 Z" fill="#6b21a8"/>
  <circle cx="28" cy="27" r="2" fill="#fbbf24"/>
  <circle cx="36" cy="27" r="2" fill="#fbbf24"/>
  <circle cx="32" cy="14" r="3" fill="url(#g_gold)"/>
""", "#fbbf24", "#a855f7")

# 5. 鸟妖
ASSETS['pets/pet_harpy'] = make_pet("""
  <path d="M16 22 Q32 10 48 22 L44 38 Q32 48 20 38 Z" fill="#78350f" stroke="#d97706" stroke-width="1"/>
  <circle cx="32" cy="28" r="10" fill="#fbcfe8"/>
  <polygon points="32,28 35,36 29,36" fill="url(#g_gold)"/>
  <circle cx="27" cy="26" r="2" fill="#dc2626"/>
  <circle cx="37" cy="26" r="2" fill="#dc2626"/>
""", "#dc2626", "#d97706")

# 6. 仙女龙
ASSETS['pets/pet_faerie_dragon'] = make_pet("""
  <path d="M14 26 Q32 14 46 22 Q42 42 22 46 Z" fill="#ec4899" stroke="#f472b6" stroke-width="1"/>
  <circle cx="32" cy="30" r="10" fill="#a7f3d0"/>
  <circle cx="28" cy="28" r="2.2" fill="#8b5cf6"/>
  <circle cx="36" cy="28" r="2.2" fill="#8b5cf6"/>
  <line x1="28" y1="20" x2="22" y2="12" stroke="#f43f5e" stroke-width="1.5"/>
  <line x1="36" y1="20" x2="42" y2="12" stroke="#f43f5e" stroke-width="1.5"/>
""", "#8b5cf6", "#ec4899")

# 7. 光灵
ASSETS['pets/pet_light_wisp'] = make_pet("""
  <circle cx="32" cy="32" r="16" fill="url(#g_gold_rad)" filter="url(#f_glow)"/>
  <circle cx="32" cy="32" r="8" fill="#ffffff"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="3 3"/>
""", "#ffffff", "#fef08a")

# 8. 黑翼天使
ASSETS['pets/pet_black_angel'] = make_pet("""
  <path d="M12 28 Q24 16 32 30 Q40 16 52 28 Q44 46 32 44 Q20 46 12 28 Z" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.2"/>
  <circle cx="32" cy="28" r="9" fill="#e0e7ff"/>
  <circle cx="29" cy="27" r="1.8" fill="#4338ca"/>
  <circle cx="35" cy="27" r="1.8" fill="#4338ca"/>
  <ellipse cx="32" cy="16" rx="8" ry="2.5" fill="none" stroke="#818cf8" stroke-width="1.2"/>
""", "#4338ca", "#4f46e5")

# 9. 狮鹫
ASSETS['pets/pet_gryphon'] = make_pet("""
  <path d="M16 32 Q32 14 48 32 Q40 48 24 48 Z" fill="url(#g_gold)" stroke="#78350f" stroke-width="1.2"/>
  <polygon points="32,26 40,36 28,36" fill="#78350f"/>
  <circle cx="26" cy="26" r="2.5" fill="#ffffff" stroke="#78350f" stroke-width="0.8"/>
  <circle cx="26" cy="26" r="1" fill="#000000"/>
""", "#000000", "#eab308")

# 10. 冬狼
ASSETS['pets/pet_winter_wolf'] = make_pet("""
  <polygon points="20,18 25,28 16,30" fill="url(#g_steel)"/>
  <polygon points="44,18 48,30 39,28" fill="url(#g_steel)"/>
  <circle cx="32" cy="34" r="13" fill="url(#g_steel)" stroke="#cbd5e1" stroke-width="1"/>
  <circle cx="27" cy="32" r="2.2" fill="#38bdf8"/>
  <circle cx="37" cy="32" r="2.2" fill="#38bdf8"/>
  <polygon points="32,38 34,42 30,42" fill="#0f172a"/>
""", "#38bdf8", "#0284c7")

# 11. 凤凰
ASSETS['pets/pet_phoenix'] = make_pet("""
  <path d="M14 40 Q32 10 50 40 Q32 52 14 40 Z" fill="url(#g_fire)" stroke="#f59e0b" stroke-width="1.5"/>
  <polygon points="32,12 36,24 28,24" fill="url(#g_gold)"/>
  <polygon points="32,28 38,36 32,40 26,36" fill="#fef08a"/>
  <circle cx="28" cy="28" r="2" fill="#ffffff"/>
  <circle cx="36" cy="28" r="2" fill="#ffffff"/>
""", "#ffffff", "#ef4444")

# 12. 纳迦
ASSETS['pets/pet_naga'] = make_pet("""
  <path d="M18 18 Q32 10 46 18 Q50 36 32 48 Q14 36 18 18 Z" fill="url(#g_emerald)" stroke="#4ade80" stroke-width="1.2"/>
  <circle cx="32" cy="28" r="9" fill="#a7f3d0"/>
  <circle cx="28" cy="27" r="1.8" fill="#eab308"/>
  <circle cx="36" cy="27" r="1.8" fill="#eab308"/>
  <polygon points="32,14 36,20 28,20" fill="url(#g_gold)"/>
""", "#eab308", "#10b981")

# 13. 小妖精
ASSETS['pets/pet_pixie'] = make_pet("""
  <ellipse cx="20" cy="24" rx="8" ry="12" fill="#bae6fd" opacity="0.6" transform="rotate(-30 20 24)"/>
  <ellipse cx="44" cy="24" rx="8" ry="12" fill="#bae6fd" opacity="0.6" transform="rotate(30 44 24)"/>
  <circle cx="32" cy="32" r="10" fill="#fef08a" stroke="#ca8a04" stroke-width="1"/>
  <circle cx="28" cy="30" r="1.8" fill="#0284c7"/>
  <circle cx="36" cy="30" r="1.8" fill="#0284c7"/>
""", "#0284c7", "#facc15")

# 14. 魅魔
ASSETS['pets/pet_succubus'] = make_pet("""
  <path d="M22 20 Q16 10 24 14" stroke="#7f1d1d" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M42 20 Q48 10 40 14" stroke="#7f1d1d" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="11" fill="#f43f5e" stroke="#881337" stroke-width="1"/>
  <circle cx="28" cy="30" r="2" fill="#7e22ce"/>
  <circle cx="36" cy="30" r="2" fill="#7e22ce"/>
""", "#7e22ce", "#e11d48")

# 15. 白翼天使
ASSETS['pets/pet_white_angel'] = make_pet("""
  <ellipse cx="32" cy="14" rx="10" ry="3" fill="none" stroke="url(#g_gold)" stroke-width="2"/>
  <circle cx="32" cy="30" r="11" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
  <circle cx="28" cy="29" r="1.8" fill="#0284c7"/>
  <circle cx="36" cy="29" r="1.8" fill="#0284c7"/>
  <path d="M12 28 Q22 20 22 36" stroke="#ffffff" stroke-width="3" fill="none"/>
  <path d="M52 28 Q42 20 42 36" stroke="#ffffff" stroke-width="3" fill="none"/>
""", "#0284c7", "#f8fafc")

# 16. 狮身人面
ASSETS['pets/pet_sphinx'] = make_pet("""
  <path d="M18 20 L46 20 L42 44 L22 44 Z" fill="url(#g_gold)" stroke="#78350f" stroke-width="1.2"/>
  <circle cx="32" cy="30" r="8" fill="#fed7aa"/>
  <circle cx="28" cy="29" r="1.8" fill="#000000"/>
  <circle cx="36" cy="29" r="1.8" fill="#000000"/>
  <rect x="24" y="16" width="16" height="4" fill="#0284c7"/>
""", "#000000", "#f59e0b")

# 17. 雷鸟
ASSETS['pets/pet_thunderbird'] = make_pet("""
  <path d="M14 36 Q32 12 50 36 L38 46 L26 46 Z" fill="#1e3a8a" stroke="#38bdf8" stroke-width="1.5"/>
  <polygon points="32,24 38,36 28,36" fill="url(#g_gold)"/>
  <circle cx="26" cy="24" r="2.2" fill="#facc15"/>
  <path d="M40 16 L34 26 L42 26 L36 38" stroke="#facc15" stroke-width="1.5" fill="none"/>
""", "#facc15", "#3b82f6")

# 18. 独角兽
ASSETS['pets/pet_unicorn'] = make_pet("""
  <path d="M18 42 Q24 22 36 24 Q46 24 46 44 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2"/>
  <polygon points="30,10 34,22 28,22" fill="url(#g_gold)" stroke="#fef08a" stroke-width="0.8"/>
  <circle cx="38" cy="30" r="2" fill="#38bdf8"/>
""", "#38bdf8", "#e0e7ff")

# 19. 银飞马
ASSETS['pets/pet_pegasus'] = make_pet("""
  <path d="M18 42 Q24 22 36 24 Q46 24 46 44 Z" fill="url(#g_steel)" stroke="#94a3b8" stroke-width="1.2"/>
  <path d="M12 28 Q24 18 28 32" stroke="#ffffff" stroke-width="3" fill="none"/>
  <circle cx="38" cy="30" r="2" fill="#0284c7"/>
""", "#0284c7", "#94a3b8")

# 20. 小恶魔
ASSETS['pets/pet_imp'] = make_pet("""
  <polygon points="22,14 26,22 18,22" fill="#b91c1c"/>
  <polygon points="42,14 46,22 38,22" fill="#b91c1c"/>
  <circle cx="32" cy="32" r="12" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/>
  <circle cx="27" cy="30" r="2.2" fill="#fef08a"/>
  <circle cx="37" cy="30" r="2.2" fill="#fef08a"/>
  <polygon points="32,36 34,40 30,40" fill="#ffffff"/>
""", "#fef08a", "#ef4444")

# 21. 梦魇
ASSETS['pets/pet_nightmare'] = make_pet("""
  <path d="M18 42 Q24 22 36 24 Q46 24 46 44 Z" fill="url(#g_darkiron)" stroke="#7e22ce" stroke-width="1.5"/>
  <path d="M26 22 Q30 14 36 18 Q38 12 44 20" stroke="url(#g_fire)" stroke-width="3" fill="none"/>
  <circle cx="38" cy="30" r="2.5" fill="#ef4444"/>
""", "#ef4444", "#a855f7")

# 22. 翼蛇女
ASSETS['pets/pet_medusa'] = make_pet("""
  <circle cx="32" cy="32" r="11" fill="#15803d" stroke="#166534" stroke-width="1"/>
  <circle cx="28" cy="30" r="2.2" fill="#facc15"/>
  <circle cx="36" cy="30" r="2.2" fill="#facc15"/>
  <path d="M22 22 Q16 12 24 16" stroke="#22c55e" stroke-width="2.5" fill="none"/>
  <path d="M32 20 Q32 10 36 14" stroke="#22c55e" stroke-width="2.5" fill="none"/>
  <path d="M42 22 Q48 12 40 16" stroke="#22c55e" stroke-width="2.5" fill="none"/>
""", "#facc15", "#22c55e")

# ----------------- 5. 三大职业立绘与头像 -----------------
ASSETS['heroes/avatar_warrior'] = wrap_svg("""
  <!-- 战士·圣殿骑士头像 -->
  <circle cx="32" cy="32" r="28" fill="#18130c" stroke="url(#g_gold)" stroke-width="2.5" filter="url(#f_gold_glow)"/>
  <path d="M18 20 Q32 12 46 20 L48 42 L42 52 L22 52 L16 42 Z" fill="url(#g_steel)" stroke="#caa048" stroke-width="1.5"/>
  <rect x="30" y="22" width="4" height="26" fill="url(#g_gold)"/>
  <rect x="20" y="30" width="24" height="4" fill="url(#g_gold)"/>
  <line x1="22" y1="32" x2="28" y2="32" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
  <line x1="36" y1="32" x2="42" y2="32" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
  <polygon points="32,6 35,14 29,14" fill="#dc2626"/>
""")

ASSETS['heroes/avatar_mage'] = wrap_svg("""
  <!-- 法师·秘术魔导士头像 -->
  <circle cx="32" cy="32" r="28" fill="#0f172a" stroke="#a855f7" stroke-width="2.5" filter="url(#f_glow)"/>
  <path d="M16 18 Q32 8 48 18 L44 48 Q32 54 20 48 Z" fill="url(#g_purple)" stroke="#c084fc" stroke-width="1.5"/>
  <ellipse cx="32" cy="32" rx="9" ry="11" fill="#090d16"/>
  <circle cx="28" cy="32" r="2" fill="#38bdf8" filter="url(#f_glow)"/>
  <circle cx="36" cy="32" r="2" fill="#38bdf8" filter="url(#f_glow)"/>
  <circle cx="32" cy="18" r="3" fill="url(#g_gold)"/>
""")

ASSETS['heroes/avatar_hunter'] = wrap_svg("""
  <!-- 猎人·精灵游侠头像 -->
  <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#22c55e" stroke-width="2.5" filter="url(#f_glow)"/>
  <path d="M18 18 Q32 10 46 18 L44 46 Q32 52 20 46 Z" fill="url(#g_emerald)" stroke="#86efac" stroke-width="1.5"/>
  <circle cx="32" cy="32" r="9" fill="#fed7aa"/>
  <circle cx="28" cy="31" r="2" fill="#15803d"/>
  <circle cx="36" cy="31" r="2" fill="#15803d"/>
  <path d="M26 14 L30 6 L32 14" stroke="#facc15" stroke-width="2" fill="none"/>
""")

# ----------------- 6. 三大古代城邦国徽战旗 -----------------
ASSETS['ui/nation_aden'] = wrap_svg("""
  <!-- 亚丁·金冠雄狮战盾 -->
  <path d="M12 12 L52 12 L52 36 Q52 54 32 60 Q12 54 12 36 Z" fill="#1e3a8a" stroke="url(#g_gold)" stroke-width="2.5"/>
  <path d="M16 16 L48 16 L48 36 Q48 50 32 55 Q16 50 16 36 Z" fill="none" stroke="#60a5fa" stroke-width="1"/>
  <polygon points="24,24 28,18 32,22 36,18 40,24" fill="url(#g_gold)" stroke="#78350f" stroke-width="0.8"/>
  <circle cx="32" cy="36" r="8" fill="url(#g_gold)"/>
  <circle cx="32" cy="36" r="3" fill="#dc2626"/>
""")

ASSETS['ui/nation_kester'] = wrap_svg("""
  <!-- 克斯特·森灵战狼绿叶 -->
  <circle cx="32" cy="32" r="26" fill="#064e3b" stroke="#22c55e" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#86efac" stroke-width="1" stroke-dasharray="4 2"/>
  <path d="M20 32 Q32 16 44 32 Q32 48 20 32 Z" fill="#22c55e"/>
  <polygon points="32,22 38,34 26,34" fill="#ffffff"/>
""")

ASSETS['ui/nation_sagael'] = wrap_svg("""
  <!-- 萨格尔·荒原战雕弯刀 -->
  <circle cx="32" cy="32" r="26" fill="#7f1d1d" stroke="url(#g_gold)" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#f87171" stroke-width="1"/>
  <line x1="18" y1="18" x2="46" y2="46" stroke="url(#g_gold)" stroke-width="2.5"/>
  <line x1="46" y1="18" x2="18" y2="46" stroke="url(#g_gold)" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="6" fill="#facc15" stroke="#78350f" stroke-width="1"/>
""")

# ----------------- 7. 技能魔导书与关键材料别名 -----------------
ASSETS['items/skill_book'] = wrap_svg("""
  <!-- 远古魔导书 -->
  <path d="M12 16 C12 16 22 12 32 16 C42 12 52 16 52 16 L52 48 C52 48 42 44 32 48 C22 44 12 48 12 48 Z" fill="#3b0764" stroke="url(#g_gold)" stroke-width="1.8"/>
  <path d="M32 16 L32 48" stroke="url(#g_gold)" stroke-width="1.5"/>
  <path d="M16 22 Q23 20 30 22 M16 28 Q23 26 30 28 M16 34 Q23 32 30 34" stroke="#c084fc" stroke-width="1" stroke-linecap="round"/>
  <path d="M34 22 Q41 20 48 22 M34 28 Q41 26 48 28 M34 34 Q41 32 48 34" stroke="#c084fc" stroke-width="1" stroke-linecap="round"/>
  <circle cx="32" cy="18" r="2.5" fill="url(#g_gold)" filter="url(#f_glow)"/>
""")

ASSETS['items/crystal_socket'] = ASSETS['items/socket_crystal']
ASSETS['items/crystal_protect'] = ASSETS['items/protect_crystal']

# ----------------- 8. 场景与全景画卷 16:9 矢量占位图 -----------------
def make_map(bg_gradient, landmark_svg, title=""):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" class="w-full h-full">
<defs>
  <linearGradient id="map_bg_{title}" x1="0%" y1="0%" x2="0%" y2="100%">
    {bg_gradient}
  </linearGradient>
  <filter id="f_mglow_{title}">
    <feGaussianBlur stdDeviation="3" result="blur"/>
    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
  </filter>
</defs>
<rect width="320" height="180" fill="url(#map_bg_{title})"/>
<!-- 地貌与建筑剪影 -->
{landmark_svg}
<!-- 暗黑哥特暗角 -->
<rect width="320" height="180" fill="none" stroke="#000000" stroke-width="6" opacity="0.7"/>
</svg>"""

ASSETS['maps/city_bg'] = make_map('<stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#020617"/>', '<polygon points="0,180 80,110 160,140 240,90 320,180" fill="#0f172a"/><polygon points="120,140 140,70 160,70 180,140" fill="#1e293b" stroke="#eab308" stroke-width="1.5"/>', 'city')
ASSETS['maps/map_palace'] = make_map('<stop offset="0%" stop-color="#450a0a"/><stop offset="100%" stop-color="#090d16"/>', '<polygon points="60,180 60,60 100,40 220,40 260,60 260,180" fill="#1c1917" stroke="#f59e0b" stroke-width="2"/><circle cx="160" cy="80" r="16" fill="#78350f" stroke="#eab308" stroke-width="2"/>', 'palace')
ASSETS['maps/map_smithy'] = make_map('<stop offset="0%" stop-color="#7c2d12"/><stop offset="100%" stop-color="#090d16"/>', '<polygon points="0,180 100,100 220,100 320,180" fill="#1e293b"/><rect x="130" y="110" width="60" height="40" fill="#ea580c" filter="url(#f_mglow_smithy)"/><polygon points="140,110 160,80 180,110" fill="#f59e0b"/>', 'smithy')
ASSETS['maps/map_dragons'] = make_map('<stop offset="0%" stop-color="#311042"/><stop offset="100%" stop-color="#020617"/>', '<polygon points="40,180 100,80 160,130 220,70 280,180" fill="#0f172a" stroke="#a855f7" stroke-width="1.5"/><circle cx="160" cy="50" r="12" fill="#ef4444" filter="url(#f_mglow_dragons)"/>', 'dragons')
ASSETS['maps/map_fishing'] = make_map('<stop offset="0%" stop-color="#0e7490"/><stop offset="100%" stop-color="#020617"/>', '<path d="M0 140 Q160 110 320 140 L320 180 L0 180 Z" fill="#083344"/><rect x="40" y="130" width="80" height="8" fill="#78350f"/>', 'fishing')
ASSETS['maps/map_tavern'] = make_map('<stop offset="0%" stop-color="#78350f"/><stop offset="100%" stop-color="#0c0a09"/>', '<polygon points="40,180 40,80 160,40 280,80 280,180" fill="#1c1917" stroke="#b45309" stroke-width="2"/>', 'tavern')
ASSETS['maps/map_arena'] = make_map('<stop offset="0%" stop-color="#831843"/><stop offset="100%" stop-color="#020617"/>', '<ellipse cx="160" cy="120" rx="120" ry="40" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/><line x1="80" y1="120" x2="240" y2="120" stroke="#f43f5e" stroke-width="1.5"/>', 'arena')
ASSETS['maps/world_map'] = make_map('<stop offset="0%" stop-color="#292524"/><stop offset="100%" stop-color="#0c0a09"/>', '<polygon points="40,140 100,60 180,90 260,50 300,140" fill="#44403c" stroke="#caa048" stroke-width="1.5"/>', 'world')
ASSETS['maps/map_forest'] = make_map('<stop offset="0%" stop-color="#064e3b"/><stop offset="100%" stop-color="#020617"/>', '<polygon points="20,180 50,110 80,180" fill="#065f46"/><polygon points="90,180 130,90 170,180" fill="#047857"/><polygon points="200,180 240,100 280,180" fill="#065f46"/>', 'forest')
ASSETS['maps/map_canyon'] = make_map('<stop offset="0%" stop-color="#3b0764"/><stop offset="100%" stop-color="#090d16"/>', '<polygon points="0,60 110,180 0,180" fill="#1e1b4b"/><polygon points="320,60 210,180 320,180" fill="#1e1b4b"/>', 'canyon')
ASSETS['maps/map_wasteland'] = make_map('<stop offset="0%" stop-color="#78350f"/><stop offset="100%" stop-color="#0c0a09"/>', '<polygon points="0,180 80,130 180,150 260,110 320,180" fill="#292524"/><path d="M120 140 Q160 90 200 140" stroke="#f59e0b" stroke-width="3" fill="none"/>', 'wasteland')
ASSETS['maps/map_swamp'] = make_map('<stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#020617"/>', '<path d="M0 130 Q160 150 320 130 L320 180 L0 180 Z" fill="#064e3b"/><circle cx="100" cy="140" r="15" fill="#10b981" opacity="0.4" filter="url(#f_mglow_swamp)"/>', 'swamp')
ASSETS['maps/map_volcano'] = make_map('<stop offset="0%" stop-color="#7f1d1d"/><stop offset="100%" stop-color="#020617"/>', '<polygon points="60,180 160,60 260,180" fill="#18181b"/><polygon points="140,60 160,80 180,60" fill="#ea580c" filter="url(#f_mglow_volcano)"/>', 'volcano')
ASSETS['maps/tower_bg'] = make_map('<stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#020617"/>', '<polygon points="130,180 145,30 175,30 190,180" fill="#111827" stroke="#a855f7" stroke-width="2"/><circle cx="160" cy="30" r="8" fill="#ef4444" filter="url(#f_mglow_tower)"/>', 'tower')
ASSETS['maps/map_castle'] = ASSETS['maps/tower_bg']

# ----------------- 9. 领主首领魔物 -----------------
ASSETS['bosses/boss_thief'] = wrap_svg("""
  <circle cx="32" cy="32" r="28" fill="#1c1917" stroke="#78716c" stroke-width="2.5"/>
  <ellipse cx="32" cy="28" rx="14" ry="16" fill="#292524"/>
  <rect x="20" y="26" width="24" height="12" fill="#0c0a09"/>
  <circle cx="27" cy="30" r="2" fill="#facc15"/>
  <circle cx="37" cy="30" r="2" fill="#facc15"/>
""")
ASSETS['bosses/boss_dragon_red'] = wrap_svg("""
  <circle cx="32" cy="32" r="28" fill="#450a0a" stroke="#dc2626" stroke-width="2.5" filter="url(#f_glow)"/>
  <path d="M18 44 Q22 24 38 20 L48 12 L44 26 Q52 34 46 46 Q32 50 18 44 Z" fill="#991b1b" stroke="#ea580c" stroke-width="1.5"/>
  <circle cx="36" cy="28" r="2.5" fill="#fef08a"/>
""")
ASSETS['bosses/boss_dragon_silver'] = wrap_svg("""
  <circle cx="32" cy="32" r="28" fill="#0f172a" stroke="#93c5fd" stroke-width="2.5" filter="url(#f_glow)"/>
  <path d="M18 44 Q22 24 38 20 L48 12 L44 26 Q52 34 46 46 Q32 50 18 44 Z" fill="url(#g_steel)" stroke="#60a5fa" stroke-width="1.5"/>
  <circle cx="36" cy="28" r="2.5" fill="#38bdf8"/>
""")
ASSETS['bosses/boss_dragon_golden'] = wrap_svg("""
  <circle cx="32" cy="32" r="28" fill="#1c1917" stroke="#f59e0b" stroke-width="2.5" filter="url(#f_gold_glow)"/>
  <path d="M18 44 Q22 24 38 20 L48 12 L44 26 Q52 34 46 46 Q32 50 18 44 Z" fill="url(#g_gold)" stroke="#d97706" stroke-width="1.5"/>
  <circle cx="36" cy="28" r="2.5" fill="#ef4444"/>
""")

def write_all_svgs():
    ensure_dirs()
    count = 0
    for rel_path, svg_content in ASSETS.items():
        file_path = os.path.join(IMAGES_DIR, f"{rel_path}.svg")
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(svg_content.strip())
        count += 1
    print(f"✓ 成功生成 {count} 个高保真 SVG 矢量图标至 images/ 资产目录！")

if __name__ == '__main__':
    write_all_svgs()
