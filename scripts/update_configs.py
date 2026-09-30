#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Update pets.js
pets_file = os.path.join(root, 'js/config/pets.js')
with open(pets_file, 'r', encoding='utf-8') as f:
    pets_code = f.read()

pet_ids = [
  'golden_dragon', 'mermaid', 'silver_dragon', 'djinn',
  'harpy', 'faerie_dragon', 'light_wisp', 'black_angel',
  'gryphon', 'winter_wolf', 'phoenix', 'naga',
  'pixie', 'succubus', 'white_angel', 'sphinx',
  'thunderbird', 'unicorn', 'pegasus', 'imp',
  'nightmare', 'medusa'
]

for pid in pet_ids:
    pattern = rf'({pid}:\s*\{{[^}}]*?icon:\s*)[\'"][^\'"]+[\'"]'
    target = r"\g<1>'images/pets/pet_" + pid + r".svg'"
    pets_code = re.sub(pattern, target, pets_code)

with open(pets_file, 'w', encoding='utf-8') as f:
    f.write(pets_code)

print("✓ Updated pets.js")

# 2. Update classes.js
classes_file = os.path.join(root, 'js/config/classes.js')
with open(classes_file, 'r', encoding='utf-8') as f:
    classes_code = f.read()

# Nations
classes_code = re.sub(r"(sagael:\s*\{[^}]*?icon:\s*)['\"][^'\"]+['\"]", r"\g<1>'images/ui/nation_sagael.svg'", classes_code)
classes_code = re.sub(r"(kester:\s*\{[^}]*?icon:\s*)['\"][^'\"]+['\"]", r"\g<1>'images/ui/nation_kester.svg'", classes_code)
classes_code = re.sub(r"(aden:\s*\{[^}]*?icon:\s*)['\"][^'\"]+['\"]", r"\g<1>'images/ui/nation_aden.svg'", classes_code)

# Classes
classes_code = re.sub(r"(warrior:\s*\{[^}]*?icon:\s*)['\"][^'\"]+['\"]", r"\g<1>'images/heroes/avatar_warrior.svg'", classes_code)
classes_code = re.sub(r"(mage:\s*\{[^}]*?icon:\s*)['\"][^'\"]+['\"]", r"\g<1>'images/heroes/avatar_mage.svg'", classes_code)
classes_code = re.sub(r"(hunter:\s*\{[^}]*?icon:\s*)['\"][^'\"]+['\"]", r"\g<1>'images/heroes/avatar_hunter.svg'", classes_code)

with open(classes_file, 'w', encoding='utf-8') as f:
    f.write(classes_code)

print("✓ Updated classes.js")
