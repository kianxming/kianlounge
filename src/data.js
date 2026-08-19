export const GAME_VERSION = '0.1.0';

export const FACTIONS = [
  { id: 'straw_hat', name: 'Straw Hat Faction', short: 'Straw Hats', color: '#d5a93a', accent: '#f4dc8d' },
  { id: 'beasts', name: 'Beasts Pirates', short: 'Beasts', color: '#7d4ea3', accent: '#c7a9de' },
  { id: 'kozuki', name: 'Kozuki Faction', short: 'Kozuki', color: '#58a87c', accent: '#9ed7b6' },
  { id: 'kurozumi', name: 'Kurozumi Faction', short: 'Kurozumi', color: '#b35643', accent: '#db9d90' },
  { id: 'heart', name: 'Heart Pirates', short: 'Heart', color: '#d3c46e', accent: '#eee4ad' },
  { id: 'kid', name: 'Kid Pirates', short: 'Kid', color: '#a94848', accent: '#dd9191' },
  { id: 'big_mom', name: 'Big Mom Pirates', short: 'Big Mom', color: '#c56f9f', accent: '#e6b5cf' }
];

export const STRONGHOLDS = [
  { id: 'flower_capital', name: 'Flower Capital', x: 51, y: 28, owner: 'kurozumi', money: 5200, food: 7800, troops: 5200, development: 72, cap: 100 },
  { id: 'ebisu', name: 'Ebisu', x: 40, y: 35, owner: 'kurozumi', money: 2400, food: 3900, troops: 2100, development: 45, cap: 80 },
  { id: 'onigashima', name: 'Onigashima', x: 78, y: 13, owner: 'beasts', money: 4200, food: 7200, troops: 7000, development: 48, cap: 70 },
  { id: 'udon_prison', name: 'Udon Prison', x: 66, y: 50, owner: 'beasts', money: 2600, food: 5200, troops: 4300, development: 43, cap: 75 },
  { id: 'tokage_port', name: 'Tokage Port', x: 68, y: 38, owner: 'kozuki', money: 1800, food: 4100, troops: 2600, development: 36, cap: 70 },
  { id: 'bakura', name: 'Bakura', x: 58, y: 43, owner: 'beasts', money: 3100, food: 4800, troops: 3600, development: 50, cap: 80 },
  { id: 'amigasa', name: 'Amigasa', x: 31, y: 49, owner: 'kozuki', money: 1400, food: 4400, troops: 2500, development: 31, cap: 65 },
  { id: 'itachi_port', name: 'Itachi Port', x: 24, y: 61, owner: 'heart', money: 1800, food: 3300, troops: 2300, development: 32, cap: 65 },
  { id: 'habu_port', name: 'Habu Port', x: 45, y: 55, owner: 'kozuki', money: 2000, food: 3900, troops: 2700, development: 38, cap: 70 },
  { id: 'mogura_port', name: 'Mogura Port', x: 36, y: 76, owner: 'kid', money: 1700, food: 3500, troops: 2600, development: 30, cap: 60 },
  { id: 'ringo', name: 'Northern Cemetery / Ringo', x: 20, y: 31, owner: 'kozuki', money: 1300, food: 3600, troops: 2200, development: 30, cap: 60 },
  { id: 'kaeru_port', name: 'Kaeru Port', x: 17, y: 72, owner: 'heart', money: 1600, food: 3700, troops: 2100, development: 29, cap: 60 },
  { id: 'kibi_camp', name: 'Kibi Camp', x: 36, y: 44, owner: 'straw_hat', money: 1300, food: 4200, troops: 2800, development: 24, cap: 55 },
  { id: 'big_mom_anchorage', name: 'Big Mom Anchorage', x: 80, y: 63, owner: 'big_mom', money: 2700, food: 5200, troops: 4200, development: 28, cap: 55 }
];

export const ROUTES = [
  ['flower_capital', 'ebisu'],
  ['flower_capital', 'bakura'],
  ['flower_capital', 'habu_port'],
  ['ebisu', 'amigasa'],
  ['ebisu', 'kibi_camp'],
  ['bakura', 'udon_prison'],
  ['bakura', 'tokage_port'],
  ['udon_prison', 'tokage_port'],
  ['tokage_port', 'habu_port'],
  ['habu_port', 'itachi_port'],
  ['itachi_port', 'amigasa'],
  ['amigasa', 'ringo'],
  ['ringo', 'kaeru_port'],
  ['kaeru_port', 'mogura_port'],
  ['mogura_port', 'big_mom_anchorage'],
  ['onigashima', 'tokage_port'],
  ['onigashima', 'big_mom_anchorage']
].map(([a, b], i) => ({ id: `route_${String(i + 1).padStart(2, '0')}`, a, b }));

export const OFFICERS = [
  { id: 'luffy', name: 'Monkey D. Luffy', faction: 'straw_hat', martial: 92, intelligence: 62, politics: 28, charisma: 96, traits: ['Natural Leader', 'Reckless'] },
  { id: 'zoro', name: 'Roronoa Zoro', faction: 'straw_hat', martial: 91, intelligence: 55, politics: 24, charisma: 73, traits: ['Genius Swordsman', 'Endurance Monster'] },
  { id: 'nami', name: 'Nami', faction: 'straw_hat', martial: 48, intelligence: 88, politics: 78, charisma: 82, traits: ['Navigator', 'Logistician'] },
  { id: 'kaido', name: 'Kaido', faction: 'beasts', martial: 100, intelligence: 71, politics: 49, charisma: 91, traits: ['Grand Commander', 'Endurance Monster'] },
  { id: 'king', name: 'King', faction: 'beasts', martial: 92, intelligence: 77, politics: 55, charisma: 76, traits: ['Commander', 'Calm'] },
  { id: 'queen', name: 'Queen', faction: 'beasts', martial: 86, intelligence: 84, politics: 62, charisma: 68, traits: ['Engineer', 'Reckless'] },
  { id: 'momonosuke', name: 'Kozuki Momonosuke', faction: 'kozuki', martial: 34, intelligence: 58, politics: 68, charisma: 83, traits: ['Natural Leader', 'Loyal'] },
  { id: 'kinemon', name: "Kin'emon", faction: 'kozuki', martial: 78, intelligence: 69, politics: 61, charisma: 79, traits: ['Commander', 'Loyal'] },
  { id: 'orochi', name: 'Kurozumi Orochi', faction: 'kurozumi', martial: 37, intelligence: 66, politics: 74, charisma: 42, traits: ['Cowardly'] },
  { id: 'fukurokuju', name: 'Fukurokuju', faction: 'kurozumi', martial: 72, intelligence: 75, politics: 63, charisma: 58, traits: ['Calm'] },
  { id: 'law', name: 'Trafalgar Law', faction: 'heart', martial: 90, intelligence: 94, politics: 69, charisma: 82, traits: ['Strategist', 'Calm'] },
  { id: 'bepo', name: 'Bepo', faction: 'heart', martial: 71, intelligence: 61, politics: 45, charisma: 70, traits: ['Loyal'] },
  { id: 'kid', name: 'Eustass Kid', faction: 'kid', martial: 91, intelligence: 72, politics: 40, charisma: 84, traits: ['Commander', 'Reckless'] },
  { id: 'killer', name: 'Killer', faction: 'kid', martial: 88, intelligence: 79, politics: 46, charisma: 72, traits: ['Duelist', 'Calm'] },
  { id: 'big_mom', name: 'Charlotte Linlin', faction: 'big_mom', martial: 99, intelligence: 68, politics: 57, charisma: 93, traits: ['Grand Commander', 'Monstrous Strength'] },
  { id: 'perospero', name: 'Charlotte Perospero', faction: 'big_mom', martial: 81, intelligence: 82, politics: 75, charisma: 74, traits: ['Strategist'] }
];

export const DEFAULT_PLAYER_FACTION = 'straw_hat';
export const SIM_MINUTES_PER_STEP = 30;
export const BASE_TRAVEL_MINUTES = 240;
