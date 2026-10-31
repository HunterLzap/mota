import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PAINTED_ICONS, getPaintedIcon, renderPaintedIcon } from '../js/assets/paintedIcons.js';
import { getVectorIcon } from '../js/assets/vectorIcons.js';
import { renderGameIcon } from '../js/ui/iconHelper.js';

for (const [key, art] of Object.entries(PAINTED_ICONS)) {
  const html = renderGameIcon(key);
  assert.ok(html.includes('data-painted-icon="'+art.key+'"'), 'Icon helper missed '+key);
  assert.ok(!html.includes('<svg') && !html.includes('.svg'), 'Mapped art fell back to SVG: '+key);
  const compatibility = getVectorIcon(key,'w-full h-full');
  assert.ok(compatibility.includes('data-painted-icon='),'Compatibility renderer missed '+key);
  assert.ok(renderGameIcon(compatibility).includes('data-painted-icon='),'Nested battle art disappeared: '+key);
}
for (const id of ['warrior','mage','hunter']) {
  for (const input of [id, 'avatar_'+id, 'hero_'+id, 'images/heroes/avatar_'+id+'.svg', {icon:'images/heroes/avatar_'+id+'.svg'}]) {
    assert.equal(getPaintedIcon(input).key,id);
    assert.ok(renderGameIcon(input).includes('data-painted-icon="'+id+'"'));
  }
}
for (const [file, columns, rows] of [['images/ui/interface-emblems-v1.png',4,4],['images/portraits/character-heads-v1.png',3,2]]) {
  const bytes=fs.readFileSync(new URL('../'+file,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16)/columns,bytes.readUInt32BE(20)/rows,'Non-square source cells');
}
assert.equal(renderPaintedIcon('unknown'), '');
assert.equal(getPaintedIcon('golden_dragon'),null,'Character atlas replaced a pet');
console.log('PASS painted character/interface aliases, legacy entry points, nested battle rendering and square PNG cells: '+Object.keys(PAINTED_ICONS).length+' mapped keys');
