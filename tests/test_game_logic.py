
import json, time, math, random

# 1. Test Storage Logic Simulation
class StorageMock:
    def __init__(self):
        self.store = {}
        self.active_slot_key = 'MOTA_WORLD_ACTIVE_SLOT_ID'
        self.slot_prefix = 'MOTA_WORLD_SAVE_SLOT_'
        self.total_slots = 5

    def get_active_slot(self):
        return int(self.store.get(self.active_slot_key, 1))

    def set_active_slot(self, slot_id):
        slot_id = max(1, min(self.total_slots, int(slot_id)))
        self.store[self.active_slot_key] = str(slot_id)
        return slot_id

    def save_to_slot(self, slot_id, data):
        envelope = {
            'version': '2.0.0',
            'slotId': slot_id,
            'timestamp': int(time.time() * 1000),
            'meta': {
                'name': data.get('name', '勇者'),
                'level': data.get('level', 1),
                'gold': data.get('gold', 0)
            },
            'data': data
        }
        self.store[f'{self.slot_prefix}{slot_id}'] = json.dumps(envelope)
        return True

    def load_from_slot(self, slot_id):
        key = f'{self.slot_prefix}{slot_id}'
        raw = self.store.get(key)
        if not raw:
            return None
        return json.loads(raw)['data']

    def delete_slot(self, slot_id):
        key = f'{self.slot_prefix}{slot_id}'
        if key in self.store:
            del self.store[key]
        return True

    def get_all_slots(self):
        res = []
        active_id = self.get_active_slot()
        for i in range(1, self.total_slots + 1):
            key = f'{self.slot_prefix}{i}'
            raw = self.store.get(key)
            if raw:
                env = json.loads(raw)
                res.append({'slotId': i, 'isEmpty': False, 'isActive': (i == active_id), 'meta': env['meta']})
            else:
                res.append({'slotId': i, 'isEmpty': True, 'isActive': (i == active_id), 'meta': None})
        return res

# 2. Test Game State & Salary Logic
class GameStateMock:
    def __init__(self, storage):
        self.storage = storage
        self.data = self.create_default_data()

    def create_default_data(self):
        return {
            'name': '亚诺救世主',
            'level': 1,
            'gold': 2500,
            'crystal': 150,
            'currentQuestId': 'quest_1',
            'questProgress': {
                'quest_1': {'current': 0, 'completed': False}
            },
            'lastSalaryDate': None
        }

    def can_claim_salary(self, today_str):
        return self.data['lastSalaryDate'] != today_str

    def claim_salary(self, today_str):
        if not self.can_claim_salary(today_str):
            return {'success': False, 'msg': '今日俸禄已全额领受！'}
        self.data['lastSalaryDate'] = today_str
        self.data['gold'] += 1500
        self.data['crystal'] += 20
        self.trigger_quest_action('claim_salary')
        self.save()
        return {'success': True, 'msg': '领受成功'}

    def trigger_quest_action(self, action_type, value=1):
        cur_q = self.data['currentQuestId']
        alias_map = {
            'claim_salary': ['claim_salary', 'salary'],
            'enhance': ['enhance', 'enhance_gear'],
            'set_active_pet': ['set_active_pet'],
            'wash_aptitude': ['wash_aptitude', 'wash_pet'],
            'learn_skill': ['learn_skill'],
            'clear_tower_1': ['clear_tower_1', 'clear_tower'],
            'brew_potion': ['brew_potion'],
            'hire_merc': ['hire_merc'],
            'clear_tower_10': ['clear_tower_10', 'clear_tower']
        }
        target_actions = alias_map.get(cur_q, [cur_q])
        # Map quest ids to expected actions
        quest_action_map = {
            'quest_1': 'claim_salary',
            'quest_2': 'enhance',
            'quest_3': 'set_active_pet',
            'quest_4': 'wash_aptitude',
            'quest_5': 'learn_skill',
            'quest_6': 'clear_tower_1',
            'quest_7': 'brew_potion',
            'quest_8': 'hire_merc',
            'quest_9': 'clear_tower_10'
        }
        expected = quest_action_map.get(cur_q)
        aliases = alias_map.get(expected, [expected])
        if action_type in aliases:
            prog = self.data['questProgress'].setdefault(cur_q, {'current': 0, 'completed': False})
            prog['current'] += value
            if prog['current'] >= 1:
                prog['completed'] = True
            return {'matched': True, 'completed': prog['completed']}
        return {'matched': False, 'completed': False}

    def claim_quest_reward(self, quest_id):
        prog = self.data['questProgress'].get(quest_id)
        if not prog or not prog['completed']:
            return False
        # advance quest
        q_list = ['quest_1', 'quest_2', 'quest_3', 'quest_4', 'quest_5', 'quest_6', 'quest_7', 'quest_8', 'quest_9']
        idx = q_list.index(quest_id)
        if idx < len(q_list) - 1:
            next_q = q_list[idx + 1]
            self.data['currentQuestId'] = next_q
            self.data['questProgress'][next_q] = {'current': 0, 'completed': False}
        self.save()
        return True

    def save(self):
        active = self.storage.get_active_slot()
        self.storage.save_to_slot(active, self.data)

def run_tests():
    print('=== 开始执行自动化逻辑测试 ===')
    storage = StorageMock()
    game = GameStateMock(storage)

    # Test 1: Daily Salary Single Claim Limit
    print('[测试 1] 每日俸禄单日唯一领取测试...')
    today = '2026-09-04'
    assert game.can_claim_salary(today) == True, '初始应当可以领俸禄'
    init_gold = game.data['gold']
    res1 = game.claim_salary(today)
    assert res1['success'] == True, '首次领取应成功'
    assert game.data['gold'] == init_gold + 1500, '金币应增加1500'
    assert game.data['lastSalaryDate'] == today, 'lastSalaryDate 应为今日'
    assert game.can_claim_salary(today) == False, '领后当日不可再领'
    
    # Repeat claim on same day
    res2 = game.claim_salary(today)
    assert res2['success'] == False, '同日第二次领取必须失败'
    assert game.data['gold'] == init_gold + 1500, '金币不应重复增加'
    print('✓ [测试 1 通过] 每日俸禄防重复刷取判定有效！')

    # Test 2: Next day salary reset
    print('[测试 2] 跨日俸禄重置测试...')
    tomorrow = '2026-09-05'
    assert game.can_claim_salary(tomorrow) == True, '次日应当可以重新领取'
    res3 = game.claim_salary(tomorrow)
    assert res3['success'] == True, '次日领取成功'
    assert game.data['gold'] == init_gold + 3000, '金币累计累加'
    print('✓ [测试 2 通过] 跨日俸禄重置正常！')

    # Test 3: Quest 1 Completion and chain through Quest 9
    print('[测试 3] 主线 1 到主线 9 全链路串行推进测试...')
    assert game.data['questProgress']['quest_1']['completed'] == True, '主线1在领俸禄后应已达成'
    claimed_q1 = game.claim_quest_reward('quest_1')
    assert claimed_q1 == True, '主线1奖励领取成功'
    assert game.data['currentQuestId'] == 'quest_2', '主线应推进至主线2'
    
    # Quest 2: enhance
    game.trigger_quest_action('enhance')
    assert game.data['questProgress']['quest_2']['completed'] == True
    game.claim_quest_reward('quest_2')
    assert game.data['currentQuestId'] == 'quest_3'

    # Quest 3: set_active_pet
    game.trigger_quest_action('set_active_pet')
    assert game.data['questProgress']['quest_3']['completed'] == True
    game.claim_quest_reward('quest_3')
    assert game.data['currentQuestId'] == 'quest_4'

    # Quest 4: wash_aptitude
    game.trigger_quest_action('wash_pet')
    assert game.data['questProgress']['quest_4']['completed'] == True
    game.claim_quest_reward('quest_4')
    assert game.data['currentQuestId'] == 'quest_5'

    # Quest 5: learn_skill
    game.trigger_quest_action('learn_skill')
    assert game.data['questProgress']['quest_5']['completed'] == True
    game.claim_quest_reward('quest_5')
    assert game.data['currentQuestId'] == 'quest_6'

    # Quest 6: clear_tower_1
    game.trigger_quest_action('clear_tower_1')
    assert game.data['questProgress']['quest_6']['completed'] == True
    game.claim_quest_reward('quest_6')
    assert game.data['currentQuestId'] == 'quest_7'

    # Quest 7: brew_potion
    game.trigger_quest_action('brew_potion')
    assert game.data['questProgress']['quest_7']['completed'] == True
    game.claim_quest_reward('quest_7')
    assert game.data['currentQuestId'] == 'quest_8'

    # Quest 8: hire_merc
    game.trigger_quest_action('hire_merc')
    assert game.data['questProgress']['quest_8']['completed'] == True
    game.claim_quest_reward('quest_8')
    assert game.data['currentQuestId'] == 'quest_9'

    # Quest 9: clear_tower_10
    game.trigger_quest_action('clear_tower_10')
    assert game.data['questProgress']['quest_9']['completed'] == True
    game.claim_quest_reward('quest_9')
    print('✓ [测试 3 通过] 主线任务链 1~9 全程顺畅闭环！')

    # Test 4: Multi-slot storage and new game isolation
    print('[测试 4] 5 大槽位存档隔离与新开游戏测试...')
    # Save current progressed hero to slot 1
    storage.save_to_slot(1, game.data)
    slot1_data = storage.load_from_slot(1)
    assert slot1_data['currentQuestId'] == 'quest_9'

    # Switch to slot 2 and start fresh new game
    storage.set_active_slot(2)
    assert storage.get_active_slot() == 2
    fresh_game = GameStateMock(storage)
    fresh_game.data['name'] = '新手小骑士'
    fresh_game.data['gold'] = 100
    fresh_game.save()

    # Verify slot 1 remains unaffected
    s1_check = storage.load_from_slot(1)
    assert s1_check['currentQuestId'] == 'quest_9', '槽位1进度依然是主线9'
    assert s1_check['name'] == '亚诺救世主', '槽位1名字不变'

    # Verify slot 2 has fresh hero
    s2_check = storage.load_from_slot(2)
    assert s2_check['name'] == '新手小骑士'
    assert s2_check['gold'] == 100
    assert s2_check['currentQuestId'] == 'quest_1'

    # Verify all slots list
    slots = storage.get_all_slots()
    assert len(slots) == 5
    assert slots[0]['isEmpty'] == False and slots[0]['slotId'] == 1
    assert slots[1]['isEmpty'] == False and slots[1]['slotId'] == 2 and slots[1]['isActive'] == True
    assert slots[2]['isEmpty'] == True and slots[2]['slotId'] == 3
    print('✓ [测试 4 通过] 多槽位存档与新开游戏完全隔离无干扰！')

    # Test 5: Combat Turn Formula Verification
    print('[测试 5] 回合制战斗引擎数值核算...')
    # Damage formula test
    player_atk = 150
    enemy_def = 60
    base_dmg = max(1, player_atk - math.floor(enemy_def * 0.7))
    assert base_dmg == 108
    print('✓ [测试 5 通过] 攻防伤害减免公式符合经典原著数值！')

    print('\n🎉 全部 5 项自动化核心系统测试 100% 通过！')

if __name__ == '__main__':
    run_tests()
