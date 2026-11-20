async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const game = await context.newPage();
  const errors = [];
  game.on('pageerror', e => errors.push(e.message));
  const dismiss = async () => {
    for (let i = 0; i < 6; i++) {
      if (!await game.evaluate(() => window.gameModal.isOpen)) {
        await game.locator('#game-modal-overlay').waitFor({ state: 'hidden' }); return;
      }
      await game.locator('#game-modal-btn-confirm').click();
    }
    throw new Error('Modal did not settle');
  };
  const data = () => game.evaluate(() => JSON.parse(JSON.stringify(window.gameState.data)));
  try {
    await game.goto('http://127.0.0.1:8088');
    await game.locator('[data-class-id="hunter"]').click();
    await game.locator('#input-hero-name').fill('存档猎人');
    await game.locator('#btn-confirm-character').click();
    await game.locator('#btn-open-archive').click();
    const downloading = game.waitForEvent('download');
    await game.locator('#btn-archive-export-json').click();
    const download = await downloading;
    const stream = await download.createReadStream();
    let json = '';
    for await (const chunk of stream) json += chunk.toString();
    if (JSON.parse(json).saveData.name !== '存档猎人') throw new Error('Exported wrong character');
    await game.locator('[data-action="new-in"][data-slot="2"]').click();
    await game.locator('[data-class-id="mage"]').click();
    await game.locator('#input-hero-name').fill('存档法师');
    await game.locator('#btn-confirm-character').click();
    await game.locator('#btn-open-archive').click();
    await game.locator('[data-action="load-from"][data-slot="1"]').click();
    await dismiss();
    if ((await data()).name !== '存档猎人') throw new Error('Slot 1 was overwritten');
    if (await game.locator('#btn-confirm-character').isVisible()) throw new Error('Loaded character asked for class again');
    await game.locator('#btn-open-archive').click();
    await game.locator('#file-archive-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"saveData":{"level":0}}') });
    await game.locator('#game-modal-overlay').waitFor({ state: 'visible' });
    await dismiss();
    if ((await data()).name !== '存档猎人') throw new Error('Bad import overwrote save');
    const badPets = JSON.parse(json);
    badPets.saveData.pets = [null];
    await game.locator('#file-archive-import').setInputFiles({ name: 'bad-pets.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(badPets)) });
    await game.locator('#game-modal-overlay').waitFor({ state: 'visible' });
    await dismiss();
    if ((await data()).name !== '存档猎人' || !(await data()).pets[0]) throw new Error('Invalid pet data overwrote save');
    await game.locator('#file-archive-import').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
    await game.locator('#game-modal-overlay').waitFor({ state: 'visible' });
    await dismiss();
    await game.locator('#btn-close-archive-modal').click();
    await game.reload();
    if ((await data()).name !== '存档猎人') throw new Error('Import not persisted');
    const slots = await game.evaluate(() => [1, 2].map(i => JSON.parse(localStorage.getItem(`MOTA_WORLD_SAVE_SLOT_${i}`)).data.name));
    if (slots[0] !== '存档猎人' || slots[1] !== '存档法师') throw new Error('Slots not independent');
    const equipment = await game.evaluate(() => {
      const d = window.gameState.data;
      const info = { count: Object.values(d.equipped).filter(Boolean).length, weapon: d.equipped.weapon.uid };
      d.bag = Array.from({ length: 40 }, (_, i) => ({ id: `test_material_${i}`, name: '测试材料',
        count: 1, type: 'material', icon: 'images/items/star_crystal.svg', quality: 'blue' }));
      window.gameState.notify(); return info;
    });
    await game.locator('#nav-tab-equip').click();
    await game.locator('#btn-unequip-all').click();
    if ((await data()).bag.length !== 40 + equipment.count) throw new Error('Full bag lost unequipped gear');
    await game.locator('#nav-tab-bag').click();
    await game.locator(`[data-bag-uid="${equipment.weapon}"]`).click();
    await game.evaluate(() => document.getElementById('btn-bag-equip-item')?.click()); await dismiss();
    if ((await data()).equipped.weapon?.uid !== equipment.weapon) throw new Error('Owned gear could not be equipped from full bag');
    await game.reload();
    if ((await data()).equipped.weapon?.uid !== equipment.weapon) throw new Error('Full bag changes did not persist');
    const legacy = JSON.parse(json);
    legacy.saveData.level = 25;
    legacy.saveData.equipped.gloves = { id: 'owned_gloves', uid: 'owned-gloves', name: '既有护手', type: 'equip', slot: 'gloves', stats: { def: 1 } };
    legacy.saveData.equipped.offhand = { id: 'courage_shield', uid: 'legacy-shield', name: '勇气塔盾', type: 'equip', slot: 'offhand', level: 25, quality: 'purple', set: 'courage', stats: { def: 95, hp: 450, counter: 8 } };
    await game.locator('#btn-open-archive').click();
    await game.locator('#file-archive-import').setInputFiles({ name: 'legacy-shield.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
    await game.locator('#game-modal-overlay').waitFor({ state: 'visible' }); await dismiss();
    await game.locator('#btn-close-archive-modal').click();
    const migrated = await data();
    const gloves = migrated.bag.find(i => i.uid === 'legacy-shield');
    if (migrated.equipped.gloves.uid !== 'owned-gloves' || migrated.equipped.offhand || !gloves || gloves.id !== 'courage_gloves' || gloves.stats.def !== 95) throw new Error('Shield migration lost or changed equipment');
    await game.locator('#nav-tab-bag').click();
    await game.locator('[data-bag-uid="legacy-shield"]').click();
    await game.evaluate(() => document.getElementById('btn-bag-equip-item')?.click()); await dismiss();
    await game.reload();
    const afterMigration = await data();
    if (afterMigration.equipped.gloves.uid !== 'legacy-shield' || !afterMigration.bag.some(i => i.uid === 'owned-gloves') || Object.keys(afterMigration.equipped).length !== 10) throw new Error('Migrated gloves could not be worn and saved in ten slots');
    if (errors.length) throw new Error(errors.join('; '));
    return { downloaded: download.suggestedFilename(), slots, rejectedCorruptImport: true, importedAndReloaded: true,
      fullBagUnequipAndEquip: true, legacyShieldMigration: true, errors };
  } catch (error) {
    await game.screenshot({ path: 'output/playwright/archive-failure.png', fullPage: true });
    throw error;
  } finally { await context.close(); }
}
