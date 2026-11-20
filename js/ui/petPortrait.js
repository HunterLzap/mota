import { renderGameIcon } from './iconHelper.js';

// Shared 4×3 painted portrait sheets for the pet directory and combat lineup.
const PET_PORTRAIT_ORDER = [
  'golden_dragon', 'mermaid', 'silver_dragon', 'djinn',
  'harpy', 'faerie_dragon', 'light_spirit', 'black_angel',
  'gryphon', 'winter_wolf', 'phoenix', 'naga',
  'pixie', 'succubus', 'white_angel', 'sphinx',
  'thunderbird', 'unicorn', 'pegasus', 'imp', 'nightmare', 'gorgon'
];

export function renderPetPortrait(conf) {
  const index = PET_PORTRAIT_ORDER.indexOf(conf.id);
  if (index < 0) return renderGameIcon(conf.id, { size: 'w-full h-full' });
  const sheet = index < 12 ? '01' : '02';
  const cell = index % 12;
  const x = [0, 33.333333, 66.666667, 100][cell % 4];
  const y = Math.floor(cell / 4) * 50;
  return `<div class="pet-portrait-art" role="img" aria-label="${conf.name}肖像" style="background-image:url('images/portraits/pets-${sheet}.png');background-position:${x}% ${y}%"></div>`;
}
