import os, re

def run_tests():
    errors = []

    # 1. Check index.html layout
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    if 'max-w-6xl' in html:
        errors.append('index.html contains residual max-w-6xl')
    if 'max-w-7xl' in html:
        errors.append('index.html contains residual max-w-7xl')
    if 'id="quest-tracker-mount"' not in html:
        errors.append('index.html missing quest-tracker-mount')
    if 'id="system-log-mount"' not in html:
        errors.append('index.html missing system-log-mount')

    # 2. Check all views in js/ui for max-w-6xl
    ui_files = [os.path.join('js/ui', f) for f in os.listdir('js/ui') if f.endswith('.js')]
    for path in ui_files:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'max-w-6xl' in content:
            errors.append(f'{path} contains max-w-6xl')
        if 'max-w-7xl' in content:
            errors.append(f'{path} contains max-w-7xl')

    # 3. Check SystemLogView implementation
    if not os.path.exists('js/ui/systemLogView.js'):
        errors.append('js/ui/systemLogView.js missing')
    else:
        with open('js/ui/systemLogView.js', 'r', encoding='utf-8') as f:
            log_code = f.read()
        if 'class SystemLogView' not in log_code:
            errors.append('SystemLogView class not found in systemLogView.js')
        if 'systemLogs' not in log_code:
            errors.append('systemLogs reference not found in systemLogView.js')

    # 4. Check main.js mounts systemLogView
    with open('js/main.js', 'r', encoding='utf-8') as f:
        main_code = f.read()
    if 'SystemLogView' not in main_code:
        errors.append('SystemLogView not imported or mounted in main.js')
    if 'system-log-mount' not in main_code:
        errors.append('system-log-mount not initialized in main.js')

    # 5. Check state.js systemLogs
    with open('js/core/state.js', 'r', encoding='utf-8') as f:
        state_code = f.read()
    if 'addSystemLog' not in state_code:
        errors.append('addSystemLog not found in state.js')
    if 'systemLogs' not in state_code:
        errors.append('systemLogs not found in state.js')

    # 6. Check townView.js smithy 2x5 grid
    with open('js/ui/townView.js', 'r', encoding='utf-8') as f:
        town_code = f.read()
    if 'grid-cols-2' not in town_code:
        errors.append('2-column grid not found in townView.js')

    # 7. Check button renames and redundant UI removal
    if '<span>人物</span>' not in html or '<span>装备</span>' not in html or '<span>背包</span>' not in html or '<span>宠物</span>' not in html:
        errors.append('index.html missing renamed buttons: 人物, 装备, 背包, 宠物')
    if '🌍 大世界探险' in html:
        errors.append('index.html still has redundant 🌍 大世界探险 label')
    if '👑 勇者功能' in html:
        errors.append('index.html still has redundant 👑 勇者功能 label')
    if 'system-ticker-mount' in html:
        errors.append('index.html still has redundant system-ticker-mount')

    for path in ui_files:
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        if '👑 勇者核心功能' in c:
            errors.append(f'{path} still contains 👑 勇者核心功能')

    if errors:
        print('FAILED with errors:')
        for e in errors:
            print(' -', e)
        exit(1)
    else:
        print('SUCCESS: All layout, naming and system log verifications passed 100%!')

if __name__ == '__main__':
    run_tests()
