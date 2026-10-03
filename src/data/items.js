// DarkRaiders item catalogue: every item, weapon, mod, augment, material, trinket and blueprint in the game.
// Pure data: no imports, no DOM. See docs/ARCHITECTURE.md for the schema. Names and flavour text are our own (parody tone).

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_INFO = {
  common: { name: 'Common', color: '#a8a8a0' },
  uncommon: { name: 'Uncommon', color: '#5cc860' },
  rare: { name: 'Rare', color: '#4aa0f0' },
  epic: { name: 'Epic', color: '#c058f0' },
  legendary: { name: 'Legendary', color: '#f0a030' },
};

export const AMMO_TYPES = ['ammo_light', 'ammo_medium', 'ammo_heavy', 'ammo_shotgun', 'ammo_energy', 'ammo_launcher'];

export const AMMO_INFO = {
  ammo_light: { name: 'Light Ammo', armorPen: 'very weak' },
  ammo_medium: { name: 'Medium Ammo', armorPen: 'moderate' },
  ammo_heavy: { name: 'Heavy Ammo', armorPen: 'strong' },
  ammo_shotgun: { name: 'Shotgun Ammo', armorPen: 'weak' },
  ammo_energy: { name: 'Energy Clip', armorPen: 'strong' },
  ammo_launcher: { name: 'Launcher Ammo', armorPen: 'very strong' },
};

// Weapon tier `mods` are cumulative multipliers relative to tier I (tier IV = base stats x tier-4 mods).
// Mod `stats` are multipliers applied to the weapon's stats (mag multiplier rounds to nearest int).
export const ITEMS = {

  // ======================================================================
  // Ammunition
  // ======================================================================
  ammo_light: {
    name: 'Light Ammo', type: 'ammo', rarity: 'common', weight: 0.017, stack: 100, value: 4,
    desc: 'Rounds for pistols, SMGs and light rifles. ARK plating treats them as a mild suggestion.', icon: 'ammoLight', tags: ['ammo'],
    ammo: { per: 1 },
  },
  ammo_medium: {
    name: 'Medium Ammo', type: 'ammo', rarity: 'common', weight: 0.025, stack: 80, value: 6,
    desc: 'Intermediate rifle rounds for the middle of everything. Not too hot, not too cold, adequately lethal.',
    icon: 'ammo_medium', tags: ['ammo'], ammo: { per: 1 },
  },
  ammo_heavy: {
    name: 'Heavy Ammo', type: 'ammo', rarity: 'common', weight: 0.05, stack: 60, value: 12,
    desc: 'Full-power rounds that punch through ARK armour. Every trigger pull is a strongly worded letter.',
    icon: 'ammo_heavy', tags: ['ammo'], ammo: { per: 1 },
  },
  ammo_shotgun: {
    name: 'Shotgun Ammo', type: 'ammo', rarity: 'common', weight: 0.085, stack: 20, value: 20,
    desc: 'Buckshot shells. Devastating up close, purely decorative at range.', icon: 'ammo_shotgun', tags: ['ammo'], ammo: { per: 1 },
  },
  ammo_energy: {
    name: 'Energy Clip', type: 'ammo', rarity: 'rare', weight: 0.3, stack: 5, value: 200,
    desc: 'Charge cell for experimental energy weapons. One clip refills the whole magazine. Do not lick the contacts.',
    icon: 'ammo_energy', tags: ['ammo'],
    ammo: { per: 1, refillsMag: true },
  },
  ammo_launcher: {
    name: 'Launcher Ammo', type: 'ammo', rarity: 'rare', weight: 0.1, stack: 24, value: 250,
    desc: 'Anti-ARK payloads that only detonate on machines. Raiders are not covered by this policy.',
    icon: 'ammo_launcher', tags: ['ammo'], ammo: { per: 1 },
  },

  // ======================================================================
  // Weapons
  // ======================================================================
  kettel: {
    name: 'Teapot', type: 'weapon', rarity: 'common', weight: 7, stack: 1, value: 840,
    desc: 'Cheap semi-auto rifle in light calibre. Quick follow-up shots, weak against ARK plating. Short, stout, whistles when hot.',
    icon: 'gun_rifle', recycle: { metal_parts: 3, rubber_parts: 2 }, tags: ['assault_rifle', 'ammo_light'],
    weapon: {
      class: 'assault_rifle', ammo: 'ammo_light', dmg: 8.5, rpm: 450, mag: 20, reload: 2.2, range: 30, spread: 3.5, adsSpread: 1.2,
      recoil: 1.51, projSpeed: 340, pellets: 1, mode: 'semi', armorPen: 0.1, headMul: 2.5, noise: 42, moveMul: 0.938, handling: 0.58,
      durability: 625, slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { metal_parts: 8, plastic_parts: 10 }, mods: { projSpeed: 1.25, reload: 0.87, durability: 1.1 },
          value: 2000,
        },
        {
          tier: 3, level: 2, cost: { metal_parts: 10, simple_gun_parts: 1 }, mods: { projSpeed: 1.5, reload: 0.74, durability: 1.2 },
          value: 3000,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 3, simple_gun_parts: 1 },
          mods: { projSpeed: 1.75, reload: 0.6, durability: 1.3 }, value: 5000,
        },
      ],
    },
  },
  rattlr: {
    name: 'Maraca', type: 'weapon', rarity: 'common', weight: 6, stack: 1, value: 1750,
    desc: 'Budget full-auto rifle that holds up at medium range, but reloads two rounds at a time. Shake well before use.',
    icon: 'gun_rifle', recycle: { metal_parts: 8 }, tags: ['assault_rifle', 'ammo_medium'],
    weapon: {
      class: 'assault_rifle', ammo: 'ammo_medium', dmg: 9, rpm: 500, mag: 12, reload: 2.8, range: 34, spread: 4, adsSpread: 1.5,
      recoil: 1.39, projSpeed: 380, pellets: 1, mode: 'auto', armorPen: 0.4, headMul: 2, noise: 50, moveMul: 0.932, handling: 0.55,
      durability: 517, slots: ['muzzle', 'underbarrel', 'stock'],
      tiers: [
        { tier: 2, level: 1, cost: { metal_parts: 10, rubber_parts: 10 }, mods: { mag: 1.333, durability: 1.1 }, value: 3000 },
        {
          tier: 3, level: 2, cost: { mechanical_components: 3, simple_gun_parts: 1 }, mods: { mag: 1.667, durability: 1.2 },
          value: 5000,
        },
        { tier: 4, level: 3, cost: { mechanical_components: 3, simple_gun_parts: 1 }, mods: { mag: 2, durability: 1.3 }, value: 7000 },
      ],
    },
  },
  arpeggo: {
    name: 'Cha-Cha-Cha', type: 'weapon', rarity: 'uncommon', weight: 7, stack: 1, value: 5500,
    desc: 'Three-round-burst rifle. One, two, three, and again. Rewards rhythm and accuracy at medium range.', icon: 'gun_rifle',
    recycle: { simple_gun_parts: 2, mechanical_components: 2 }, tags: ['assault_rifle', 'ammo_medium'],
    weapon: {
      class: 'assault_rifle', ammo: 'ammo_medium', dmg: 9.5, rpm: 900, mag: 24, reload: 2.6, range: 36, spread: 3.5, adsSpread: 1.1,
      recoil: 0.8, projSpeed: 400, pellets: 1, mode: 'burst', burst: 3, burstDelay: 0.33, armorPen: 0.4, headMul: 2, noise: 50,
      moveMul: 0.936, handling: 0.57, durability: 729, slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { mechanical_components: 4, simple_gun_parts: 1 },
          mods: { rpm: 1.2, reload: 0.875, durability: 1.1 }, value: 8000,
        },
        {
          tier: 3, level: 2, cost: { mechanical_components: 5, medium_gun_parts: 1 }, mods: { rpm: 1.4, reload: 0.75, durability: 1.2 },
          value: 11500,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 5, medium_gun_parts: 1 }, mods: { rpm: 1.6, reload: 0.5, durability: 1.3 },
          value: 15000,
        },
      ],
    },
  },
  tempesta: {
    name: 'Light Drizzle', type: 'weapon', rarity: 'epic', weight: 11, stack: 1, value: 13000,
    desc: 'Full-auto medium rifle with a deep magazine and steady, predictable recoil. Forecast: scattered lead all day.',
    icon: 'gun_rifle', recycle: { advanced_mechanical_components: 2, medium_gun_parts: 2 }, tags: ['assault_rifle', 'ammo_medium'],
    weapon: {
      class: 'assault_rifle', ammo: 'ammo_medium', dmg: 10, rpm: 550, mag: 25, reload: 2.8, range: 36, spread: 4, adsSpread: 1.4,
      recoil: 1.05, projSpeed: 400, pellets: 1, mode: 'auto', armorPen: 0.4, headMul: 1.5, noise: 50, moveMul: 0.919, handling: 0.46,
      durability: 950, slots: ['muzzle', 'underbarrel', 'mag'],
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 2, medium_gun_parts: 1 },
          mods: { spread: 0.834, reload: 0.87, durability: 1.1 }, value: 17000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 2, medium_gun_parts: 3 },
          mods: { spread: 0.667, reload: 0.74, durability: 1.2 }, value: 22000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, medium_gun_parts: 3 },
          mods: { spread: 0.5, reload: 0.6, durability: 1.3 }, value: 27000,
        },
      ],
    },
  },
  betina: {
    name: 'Big Betty', type: 'weapon', rarity: 'epic', weight: 11, stack: 1, value: 8000,
    desc: 'Heavy-calibre assault rifle. Slow cadence, long reload, and every round bites through armour. Betty doesn\'t do small talk.',
    icon: 'gun_rifle', recycle: { advanced_mechanical_components: 1, heavy_gun_parts: 2 }, tags: ['assault_rifle', 'ammo_heavy'],
    weapon: {
      class: 'assault_rifle', ammo: 'ammo_heavy', dmg: 16, rpm: 400, mag: 22, reload: 4.5, range: 35, spread: 4.5, adsSpread: 1.6,
      recoil: 1.01, projSpeed: 380, pellets: 1, mode: 'auto', armorPen: 0.6, headMul: 1.5, noise: 50, moveMul: 0.924, handling: 0.49,
      durability: 759, slots: ['muzzle', 'underbarrel', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, heavy_gun_parts: 2 },
          mods: { rpm: 1.05, reload: 0.889, durability: 1.1 }, value: 11000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 1, heavy_gun_parts: 2 },
          mods: { rpm: 1.1, reload: 0.778, durability: 1.2 }, value: 14000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, heavy_gun_parts: 2 },
          mods: { rpm: 1.15, reload: 0.667, durability: 1.3 }, value: 18000,
        },
      ],
    },
  },
  ferrox: {
    name: 'One-Hit Wonder', type: 'weapon', rarity: 'common', weight: 8, stack: 1, value: 475,
    desc: 'Break-action rifle holding a single heavy round, then a reload. Make it count; the encore takes a while.', icon: 'gun_rifle',
    recycle: { metal_parts: 2, rubber_parts: 1 }, tags: ['battle_rifle', 'ammo_heavy'],
    weapon: {
      class: 'battle_rifle', ammo: 'ammo_heavy', dmg: 40, rpm: 60, mag: 1, reload: 2.4, range: 42, spread: 3, adsSpread: 0.6,
      recoil: 1.1, projSpeed: 450, pellets: 1, mode: 'semi', armorPen: 0.6, headMul: 2.5, noise: 54, moveMul: 0.898, handling: 0.32,
      durability: 152, slots: ['muzzle', 'underbarrel', 'stock'],
      tiers: [
        { tier: 2, level: 1, cost: { metal_parts: 7 }, mods: { reload: 0.87, durability: 1.1 }, value: 1000 },
        { tier: 3, level: 2, cost: { metal_parts: 9, simple_gun_parts: 1 }, mods: { reload: 0.74, durability: 1.2 }, value: 2000 },
        {
          tier: 4, level: 3, cost: { mechanical_components: 1, simple_gun_parts: 1 }, mods: { reload: 0.61, durability: 1.3 },
          value: 2900,
        },
      ],
    },
  },
  renegayde: {
    name: 'Yeehaw', type: 'weapon', rarity: 'rare', weight: 10, stack: 1, value: 7000,
    desc: 'Lever-action rifle loaded round by round. Pinpoint accurate when crouched and still. Hat sold separately.', icon: 'gun_rifle',
    recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['battle_rifle', 'ammo_medium'],
    weapon: {
      class: 'battle_rifle', ammo: 'ammo_medium', dmg: 35, rpm: 90, mag: 8, reload: 4.4, range: 48, spread: 3, adsSpread: 0.5,
      recoil: 0.71, projSpeed: 480, pellets: 1, mode: 'lever', reloadEach: 0.55, armorPen: 0.4, headMul: 2.25, noise: 49,
      moveMul: 0.934, handling: 0.56, durability: 269, slots: ['muzzle', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { recoil: 0.917, rpm: 1.25, durability: 1.1 }, value: 10000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { recoil: 0.834, rpm: 1.5, durability: 1.2 }, value: 13000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, medium_gun_parts: 2 },
          mods: { recoil: 0.75, rpm: 1.75, durability: 1.3 }, value: 17000,
        },
      ],
    },
  },
  afelion: {
    name: 'Solar Flair', type: 'weapon', rarity: 'legendary', weight: 10, stack: 1, value: 27500,
    desc: 'Experimental energy rifle firing two-round bursts of high-velocity bolts. Cannot be upgraded; it already thinks it\'s perfect.',
    icon: 'gun_energy', recycle: { magnetic_accelerator: 2, complex_gun_parts: 1 }, tags: ['battle_rifle', 'ammo_energy', 'experimental'],
    weapon: {
      class: 'battle_rifle', ammo: 'ammo_energy', dmg: 30, rpm: 600, mag: 10, reload: 3.5, range: 55, spread: 2.5, adsSpread: 0.5,
      recoil: 0.6, projSpeed: 420, pellets: 1, mode: 'burst', burst: 2, burstDelay: 0.45, armorPen: 0.6, headMul: 2, noise: 49,
      moveMul: 0.908, handling: 0.39, durability: 1130, slots: ['underbarrel', 'stock'], tiers: [],
    },
  },
  stitchr: {
    name: 'Sewing Machine', type: 'weapon', rarity: 'common', weight: 5, stack: 1, value: 800,
    desc: 'Light-ammo SMG that hems targets at close range. Bucks hard on long sprays, so keep your stitches short.', icon: 'gun_smg',
    recycle: { metal_parts: 3, rubber_parts: 2 }, tags: ['smg', 'ammo_light'],
    weapon: {
      class: 'smg', ammo: 'ammo_light', dmg: 6.5, rpm: 680, mag: 20, reload: 2, range: 20, spread: 5, adsSpread: 2.2, recoil: 2.74,
      projSpeed: 300, pellets: 1, mode: 'auto', armorPen: 0.1, headMul: 1.75, noise: 47, moveMul: 0.961, handling: 0.74,
      durability: 713, slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { metal_parts: 8, rubber_parts: 12 }, mods: { spread: 0.834, reload: 0.87, durability: 1.1 },
          value: 2000,
        },
        {
          tier: 3, level: 2, cost: { metal_parts: 10, simple_gun_parts: 1 }, mods: { spread: 0.667, reload: 0.74, durability: 1.2 },
          value: 3000,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 3, simple_gun_parts: 1 },
          mods: { spread: 0.5, reload: 0.6, durability: 1.3 }, value: 5000,
        },
      ],
    },
  },
  canta: {
    name: 'Karaoke', type: 'weapon', rarity: 'rare', weight: 4, stack: 1, value: 7000,
    desc: 'Medium-calibre SMG with a blistering fire rate and real stopping power. Everybody gets a turn at the mic.', icon: 'gun_smg',
    recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['smg', 'ammo_medium'],
    weapon: {
      class: 'smg', ammo: 'ammo_medium', dmg: 6.5, rpm: 850, mag: 18, reload: 2.5, range: 24, spread: 5.5, adsSpread: 2.4, recoil: 3,
      projSpeed: 320, pellets: 1, mode: 'auto', armorPen: 0.4, headMul: 1.75, noise: 43, moveMul: 0.967, handling: 0.78,
      durability: 784, slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { mechanical_components: 1, medium_gun_parts: 2 },
          mods: { spread: 0.85, mag: 1.111, reload: 0.86, durability: 1.1 }, value: 7000,
        },
        {
          tier: 3, level: 2, cost: { mechanical_components: 1, medium_gun_parts: 2 },
          mods: { spread: 0.7, mag: 1.222, reload: 0.71, durability: 1.2 }, value: 7000,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 2, medium_gun_parts: 2 },
          mods: { spread: 0.55, mag: 1.333, reload: 0.57, durability: 1.3 }, value: 7000,
        },
      ],
    },
  },
  bobkat: {
    name: 'Zoomies', type: 'weapon', rarity: 'epic', weight: 7, stack: 1, value: 13000,
    desc: 'Absurdly fast-firing SMG. Wild spread, terrifying up close, and clearly had sugar before the raid.', icon: 'gun_smg',
    recycle: { advanced_mechanical_components: 2, light_gun_parts: 2 }, tags: ['smg', 'ammo_light'],
    weapon: {
      class: 'smg', ammo: 'ammo_light', dmg: 6, rpm: 1000, mag: 20, reload: 2.2, range: 21, spread: 6, adsSpread: 2.6, recoil: 2.71,
      projSpeed: 300, pellets: 1, mode: 'auto', armorPen: 0.1, headMul: 2, noise: 45, moveMul: 0.96, handling: 0.73, durability: 1525,
      slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 2, light_gun_parts: 1 },
          mods: { spread: 0.722, reload: 0.87, durability: 1.1 }, value: 17000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 2, light_gun_parts: 3 },
          mods: { spread: 0.49, reload: 0.74, durability: 1.2 }, value: 22000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, light_gun_parts: 3 },
          mods: { spread: 0.275, reload: 0.6, durability: 1.3 }, value: 27000,
        },
      ],
    },
  },
  el_torro: {
    name: 'Bull Market', type: 'weapon', rarity: 'uncommon', weight: 8, stack: 1, value: 5000,
    desc: 'Pump-action shotgun loaded shell by shell. Two or three hits drop most Raiders. Past performance guarantees nothing.',
    icon: 'gun_shotgun', recycle: { mechanical_components: 2, simple_gun_parts: 2 }, tags: ['shotgun', 'ammo_shotgun'],
    weapon: {
      class: 'shotgun', ammo: 'ammo_shotgun', dmg: 7.5, rpm: 70, mag: 5, reload: 3.5, range: 11, spread: 9, adsSpread: 7, recoil: 0.97,
      projSpeed: 220, pellets: 9, mode: 'pump', reloadEach: 0.6, armorPen: 0.25, headMul: 1, noise: 47, moveMul: 0.942, handling: 0.61,
      durability: 136, slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { mechanical_components: 3, simple_gun_parts: 1 }, mods: { rpm: 1.175, mag: 1.2, durability: 1.1 },
          value: 7000,
        },
        {
          tier: 3, level: 2, cost: { mechanical_components: 4, heavy_gun_parts: 1 }, mods: { rpm: 1.35, mag: 1.4, durability: 1.2 },
          value: 10000,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 4, heavy_gun_parts: 1 }, mods: { rpm: 1.5, mag: 1.6, durability: 1.3 },
          value: 13000,
        },
      ],
    },
  },
  volcano: {
    name: 'Lava Lamp', type: 'weapon', rarity: 'epic', weight: 8, stack: 1, value: 10000,
    desc: 'Semi-auto shotgun with a tighter pattern and a quick trigger. Damage falls off fast; extremely groovy up close.',
    icon: 'gun_shotgun', recycle: { advanced_mechanical_components: 2, heavy_gun_parts: 2 }, tags: ['shotgun', 'ammo_shotgun'],
    weapon: {
      class: 'shotgun', ammo: 'ammo_shotgun', dmg: 5.5, rpm: 200, mag: 6, reload: 3, range: 13, spread: 8, adsSpread: 6.5, recoil: 1.57,
      projSpeed: 230, pellets: 9, mode: 'semi', armorPen: 0.25, headMul: 1, noise: 50, moveMul: 0.955, handling: 0.7, durability: 181,
      slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, heavy_gun_parts: 2 },
          mods: { rpm: 1.1, reload: 0.87, durability: 1.1 }, value: 13000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 2, heavy_gun_parts: 1 },
          mods: { rpm: 1.2, reload: 0.74, durability: 1.2 }, value: 17000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, heavy_gun_parts: 3 },
          mods: { rpm: 1.3, reload: 0.6, durability: 1.3 }, value: 22000,
        },
      ],
    },
  },
  dolabre: {
    name: 'Hair Dryer', type: 'weapon', rarity: 'legendary', weight: 8, stack: 1, value: 27500,
    desc: 'Experimental energy shotgun: wide heat blast from the hip, or hold to focus a long-range beam. Cannot be upgraded. Keep away from baths.',
    icon: 'gun_energy', recycle: { magnetic_accelerator: 2 }, tags: ['shotgun', 'ammo_energy', 'experimental'],
    weapon: {
      class: 'shotgun', ammo: 'ammo_energy', dmg: 12, rpm: 120, mag: 8, reload: 3.3, range: 14, spread: 10, adsSpread: 1, recoil: 1,
      projSpeed: 250, pellets: 5, mode: 'charge', chargeTime: 0.6, armorPen: 0.6, headMul: 1, noise: 59, moveMul: 0.925, handling: 0.5,
      durability: 500, slots: [], chargedDmg: 50, chargedRange: 60, tiers: [],
    },
  },
  hairpyn: {
    name: 'Library Card', type: 'weapon', rarity: 'common', weight: 3, stack: 1, value: 450,
    desc: 'Slide-action pistol with a built-in silencer. Quiet, accurate and slow. Everyone topside is asked to keep it down.',
    icon: 'gun_pistol', recycle: { metal_parts: 2, rubber_parts: 1 }, tags: ['pistol', 'ammo_light'],
    weapon: {
      class: 'pistol', ammo: 'ammo_light', dmg: 20, rpm: 120, mag: 8, reload: 1.8, range: 18, spread: 2.5, adsSpread: 0.8, recoil: 0.45,
      projSpeed: 260, pellets: 1, mode: 'semi', armorPen: 0.1, headMul: 2.5, noise: 11, moveMul: 0.967, handling: 0.78, durability: 274,
      slots: ['mag'],
      tiers: [
        { tier: 2, level: 1, cost: { metal_parts: 8 }, mods: { rpm: 1.1, reload: 0.87, durability: 1.1 }, value: 1000 },
        {
          tier: 3, level: 2, cost: { metal_parts: 9, simple_gun_parts: 1 }, mods: { rpm: 1.2, reload: 0.74, durability: 1.2 },
          value: 2000,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 1, simple_gun_parts: 1 }, mods: { rpm: 1.3, reload: 0.6, durability: 1.3 },
          value: 2900,
        },
      ],
    },
  },
  burleta: {
    name: 'Old Reliable', type: 'weapon', rarity: 'uncommon', weight: 4, stack: 1, value: 2900,
    desc: 'Dependable semi-auto pistol with decent damage and accuracy. Never the best gun in the room. Never once let you down.',
    icon: 'gun_pistol', recycle: { mechanical_components: 1, simple_gun_parts: 2 }, tags: ['pistol', 'ammo_light'],
    weapon: {
      class: 'pistol', ammo: 'ammo_light', dmg: 10, rpm: 420, mag: 12, reload: 1.6, range: 20, spread: 3, adsSpread: 1, recoil: 1.27,
      projSpeed: 270, pellets: 1, mode: 'semi', armorPen: 0.1, headMul: 2.5, noise: 43, moveMul: 0.977, handling: 0.84, durability: 656,
      slots: ['muzzle', 'mag'],
      tiers: [
        {
          tier: 2, level: 1, cost: { mechanical_components: 3, simple_gun_parts: 1 }, mods: { reload: 0.834, durability: 1.1 },
          value: 5000,
        },
        {
          tier: 3, level: 2, cost: { mechanical_components: 3, simple_gun_parts: 1 }, mods: { reload: 0.667, durability: 1.2 },
          value: 7000,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 4, light_gun_parts: 1 }, mods: { reload: 0.5, durability: 1.3 },
          value: 10000,
        },
      ],
    },
  },
  venattor: {
    name: 'BOGO', type: 'weapon', rarity: 'rare', weight: 5, stack: 1, value: 7000,
    desc: 'Semi-auto pistol that fires two projectiles per trigger pull but only charges you one round. Limited-time offer, forever.',
    icon: 'gun_pistol', recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['pistol', 'ammo_medium'],
    weapon: {
      class: 'pistol', ammo: 'ammo_medium', dmg: 8, rpm: 380, mag: 10, reload: 1.9, range: 24, spread: 3.5, adsSpread: 1.2,
      recoil: 1.94, projSpeed: 300, pellets: 2, mode: 'semi', armorPen: 0.4, headMul: 2, noise: 52, moveMul: 0.965, handling: 0.76,
      durability: 729, slots: ['underbarrel', 'mag'],
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { rpm: 1.13, reload: 0.84, durability: 1.1 }, value: 10000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { rpm: 1.26, reload: 0.67, durability: 1.2 }, value: 13000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, medium_gun_parts: 2 },
          mods: { rpm: 1.4, reload: 0.5, durability: 1.3 }, value: 17000,
        },
      ],
    },
  },
  anvill: {
    name: 'Paperweight', type: 'weapon', rarity: 'uncommon', weight: 5, stack: 1, value: 5000,
    desc: 'Single-action hand cannon. Huge damage and headshot multiplier, clumsy handling. Also stops paperwork blowing away.',
    icon: 'gun_pistol', recycle: { mechanical_components: 2, simple_gun_parts: 2 }, tags: ['pistol', 'ammo_heavy'],
    weapon: {
      class: 'pistol', ammo: 'ammo_heavy', dmg: 40, rpm: 110, mag: 6, reload: 3, range: 30, spread: 3, adsSpread: 0.8, recoil: 1.24,
      projSpeed: 320, pellets: 1, mode: 'semi', armorPen: 0.6, headMul: 2.5, noise: 53, moveMul: 0.954, handling: 0.69, durability: 188,
      slots: ['muzzle', 'tech'],
      tiers: [
        {
          tier: 2, level: 1, cost: { mechanical_components: 3, simple_gun_parts: 1 },
          mods: { recoil: 0.968, rpm: 1.25, durability: 1.1 }, value: 7000,
        },
        {
          tier: 3, level: 2, cost: { mechanical_components: 4, heavy_gun_parts: 1 }, mods: { recoil: 0.938, rpm: 1.5, durability: 1.2 },
          value: 10000,
        },
        {
          tier: 4, level: 3, cost: { mechanical_components: 4, heavy_gun_parts: 1 },
          mods: { recoil: 0.906, rpm: 1.75, durability: 1.3 }, value: 13000,
        },
      ],
    },
  },
  torrento: {
    name: 'Firehose', type: 'weapon', rarity: 'rare', weight: 12, stack: 1, value: 7000,
    desc: 'Belt-fed LMG with an enormous magazine. Only truly accurate while crouched; otherwise it just waters the whole street.',
    icon: 'gun_lmg', recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['lmg', 'ammo_medium'],
    weapon: {
      class: 'lmg', ammo: 'ammo_medium', dmg: 8, rpm: 800, mag: 60, reload: 5.5, range: 34, spread: 6, adsSpread: 2.5, recoil: 1.29,
      projSpeed: 380, pellets: 1, mode: 'auto', armorPen: 0.4, headMul: 2, noise: 59, moveMul: 0.907, handling: 0.38, durability: 1113,
      slots: ['muzzle', 'mag', 'stock'], crouchSpreadMul: 0.5,
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { mag: 1.167, reload: 0.85, durability: 1.1 }, value: 10000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { mag: 1.333, reload: 0.7, durability: 1.2 }, value: 13000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, medium_gun_parts: 2 },
          mods: { mag: 1.5, reload: 0.55, durability: 1.3 }, value: 17000,
        },
      ],
    },
  },
  ospray: {
    name: 'Birdwatcher', type: 'weapon', rarity: 'rare', weight: 7, stack: 1, value: 7000,
    desc: 'Scoped bolt-action rifle with reliable damage and pinpoint accuracy. Find a quiet perch and tick something off your list.',
    icon: 'gun_sniper', recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['sniper', 'ammo_medium'],
    weapon: {
      class: 'sniper', ammo: 'ammo_medium', dmg: 45, rpm: 45, mag: 8, reload: 3, range: 80, spread: 6, adsSpread: 0.2, recoil: 0.53,
      projSpeed: 600, pellets: 1, mode: 'bolt', armorPen: 0.4, headMul: 2, noise: 52, moveMul: 0.919, handling: 0.46, durability: 135,
      slots: ['muzzle', 'underbarrel', 'mag', 'stock'],
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { rpm: 1.25, reload: 0.875, durability: 1.1 }, value: 10000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 1, medium_gun_parts: 2 },
          mods: { rpm: 1.667, reload: 0.75, durability: 1.2 }, value: 13000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, medium_gun_parts: 2 },
          mods: { rpm: 2.5, reload: 0.625, durability: 1.3 }, value: 17000,
        },
      ],
    },
  },
  jupitor: {
    name: 'Gas Giant', type: 'weapon', rarity: 'legendary', weight: 9, stack: 1, value: 27500,
    desc: 'Experimental bolt-action energy sniper. Exceptional damage and accuracy, slow handling. Cannot be upgraded. Mostly hot air, all lethal.',
    icon: 'gun_energy', recycle: { magnetic_accelerator: 2, complex_gun_parts: 1 }, tags: ['sniper', 'ammo_energy', 'experimental'],
    weapon: {
      class: 'sniper', ammo: 'ammo_energy', dmg: 75, rpm: 35, mag: 5, reload: 3.2, range: 90, spread: 6, adsSpread: 0.15, recoil: 1.32,
      projSpeed: 550, pellets: 1, mode: 'bolt', armorPen: 0.85, headMul: 2, noise: 56, moveMul: 0.909, handling: 0.39, durability: 222,
      slots: [], tiers: [],
    },
  },
  raskal: {
    name: 'Party Popper', type: 'weapon', rarity: 'rare', weight: 4, stack: 1, value: 7000,
    desc: 'Break-action launcher whose anti-ARK payloads only detonate on machines. Confetti sold separately.', icon: 'gun_launcher',
    recycle: { advanced_mechanical_components: 1, heavy_gun_parts: 2 }, tags: ['launcher', 'ammo_launcher'],
    weapon: {
      class: 'launcher', ammo: 'ammo_launcher', dmg: 75, rpm: 60, mag: 1, reload: 2.2, range: 26, spread: 3, adsSpread: 1.5,
      recoil: 0.61, projSpeed: 45, pellets: 1, mode: 'launcher', armorPen: 0.85, headMul: 1, noise: 59, moveMul: 0.967, handling: 0.78,
      durability: 136, slots: [], explodeRadius: 2.5, arkOnlyDetonation: true,
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, heavy_gun_parts: 2 }, mods: { reload: 0.93, durability: 1.1 },
          value: 10000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 1, heavy_gun_parts: 2 }, mods: { reload: 0.87, durability: 1.2 },
          value: 13000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, heavy_gun_parts: 2 }, mods: { reload: 0.8, durability: 1.3 },
          value: 17000,
        },
      ],
    },
  },
  hullkracker: {
    name: 'Can Opener', type: 'weapon', rarity: 'epic', weight: 7, stack: 1, value: 10000,
    desc: 'Pump-action launcher holding five anti-ARK shells that only detonate on machines. Turns every ARK into a tin of something.',
    icon: 'gun_launcher', recycle: { advanced_mechanical_components: 2, heavy_gun_parts: 2 }, tags: ['launcher', 'ammo_launcher'],
    weapon: {
      class: 'launcher', ammo: 'ammo_launcher', dmg: 100, rpm: 75, mag: 5, reload: 4.5, range: 34, spread: 3, adsSpread: 1.5,
      recoil: 0.14, projSpeed: 60, pellets: 1, mode: 'launcher', reloadEach: 0.8, armorPen: 0.85, headMul: 1, noise: 59, moveMul: 0.952,
      handling: 0.68, durability: 216, slots: ['underbarrel', 'stock'], explodeRadius: 3, arkOnlyDetonation: true,
      tiers: [
        {
          tier: 2, level: 1, cost: { advanced_mechanical_components: 1, heavy_gun_parts: 2 }, mods: { rpm: 1.18, durability: 1.1 },
          value: 13000,
        },
        {
          tier: 3, level: 2, cost: { advanced_mechanical_components: 2, heavy_gun_parts: 1 }, mods: { rpm: 1.35, durability: 1.2 },
          value: 17000,
        },
        {
          tier: 4, level: 3, cost: { advanced_mechanical_components: 2, heavy_gun_parts: 3 }, mods: { rpm: 1.53, durability: 1.3 },
          value: 22000,
        },
      ],
    },
  },
  equaliser: {
    name: 'Hostile Takeover', type: 'weapon', rarity: 'legendary', weight: 14, stack: 1, value: 27500,
    desc: 'Experimental high-capacity beam rifle that melts through ARK armour. Cannot be upgraded. Acquires whatever it points at.',
    icon: 'gun_energy', recycle: { magnetic_accelerator: 2, complex_gun_parts: 1 }, tags: ['energy', 'ammo_energy', 'experimental'],
    weapon: {
      class: 'energy', ammo: 'ammo_energy', dmg: 10, rpm: 600, mag: 50, reload: 3.5, range: 40, spread: 2, adsSpread: 0.8, recoil: 0.77,
      projSpeed: 400, pellets: 1, mode: 'beam', armorPen: 0.85, headMul: 2, noise: 59, moveMul: 0.917, handling: 0.45, durability: 3450,
      slots: [], tiers: [],
    },
  },

  // ======================================================================
  // Weapon mods
  // ======================================================================
  angled_grip_i: {
    name: 'Angled Grip I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Underbarrel grip that tames side-to-side kick for a tighter spread. Your wrists send their regards.',
    icon: 'mod_grip', recycle: { plastic_parts: 6 },
    tags: ['mod', 'underbarrel'],
    mod: {
      slot: 'underbarrel', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'pistol', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'venattor', 'ospray', 'hullkracker',
      ],
      stats: { spread: 0.8 },
    },
  },
  angled_grip_ii: {
    name: 'Angled Grip II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'A sharper angle on the same idea: noticeably tighter spread from the underbarrel. Ergonomic, allegedly.', icon: 'mod_grip',
    recycle: { mechanical_components: 1, duct_tape: 1 }, tags: ['mod', 'underbarrel'],
    mod: {
      slot: 'underbarrel', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'pistol', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'venattor', 'ospray', 'hullkracker',
      ],
      stats: { spread: 0.7 },
    },
  },
  angled_grip_iii: {
    name: 'Angled Grip III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Top-shelf angled grip for a much tighter spread, at the cost of slower aiming. Comes with an opinionated manual.',
    icon: 'mod_grip', recycle: { mod_components: 1, duct_tape: 2 }, tags: ['mod', 'underbarrel'],
    mod: {
      slot: 'underbarrel', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'pistol', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'venattor', 'ospray', 'hullkracker',
      ],
      stats: { spread: 0.6, adsSpeed: 0.7 },
    },
  },
  anvill_splitter: {
    name: 'Paper Shredder', type: 'mod', rarity: 'legendary', weight: 0.5, stack: 1, value: 7000,
    desc: 'Tech mod for the Paperweight: every round shreds into four weaker projectiles. Nothing stays confidential.', icon: 'mod_tech',
    recycle: { mod_components: 1, processor: 1 }, tags: ['mod', 'tech'],
    mod: { slot: 'tech', fits: ['pistol'], weapons: ['anvill'], stats: { pellets: 4, dmg: 0.3 } },
  },
  compensator_i: {
    name: 'Compensator I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Muzzle device that tightens per-shot dispersion. It is not compensating for anything, it insists.',
    icon: 'mod_muzzle', recycle: { metal_parts: 5 },
    tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { spread: 0.85 },
    },
  },
  compensator_ii: {
    name: 'Compensator II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Better compensator for noticeably tighter shot dispersion. Very secure in itself.', icon: 'mod_muzzle',
    recycle: { mechanical_components: 1, wires: 1 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { spread: 0.7 },
    },
  },
  compensator_iii: {
    name: 'Compensator III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Premium compensator for much tighter dispersion. Wears your weapon down faster, as overachievers do.',
    icon: 'mod_muzzle', recycle: { mod_components: 1, wires: 2 },
    tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { spread: 0.55, durabilityBurn: 1.2 },
    },
  },
  extended_barrel_i: {
    name: 'Extended Barrel I', type: 'mod', rarity: 'uncommon', weight: 0.25, stack: 1, value: 1000,
    desc: 'Longer barrel: faster bullets and more range before falloff. Reach out and touch someone, rudely.',
    icon: 'mod_muzzle', recycle: { metal_parts: 5 },
    tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { projSpeed: 1.1, range: 1.05 },
    },
  },
  extended_barrel_ii: {
    name: 'Extended Barrel II', type: 'mod', rarity: 'rare', weight: 0.5, stack: 1, value: 3000,
    desc: 'An even longer barrel for faster bullets and longer range. Snags on every doorframe in Desperanza.', icon: 'mod_muzzle',
    recycle: { mechanical_components: 1, wires: 1 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { projSpeed: 1.2, range: 1.1 },
    },
  },
  extended_barrel_iii: {
    name: 'Extended Barrel III', type: 'mod', rarity: 'epic', weight: 0.75, stack: 1, value: 5000,
    desc: 'The longest barrel: fastest bullets and best range, with a little extra recoil. Measured in zip codes.', icon: 'mod_muzzle',
    recycle: { mod_components: 1, wires: 1 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { projSpeed: 1.3, range: 1.15, recoil: 1.15 },
    },
  },
  extended_light_mag_i: {
    name: 'Extended Light Mag I', type: 'mod', rarity: 'common', weight: 0.5, stack: 1, value: 640,
    desc: 'Larger magazine for light-ammo weapons. A few more reasons to keep holding the trigger.',
    icon: 'mod_mag', recycle: { plastic_parts: 6 }, tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'pistol', 'smg'], weapons: ['kettel', 'stitchr', 'bobkat', 'hairpyn', 'burleta'],
      stats: { mag: 1.25 },
    },
  },
  extended_light_mag_ii: {
    name: 'Extended Light Mag II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Bigger magazine for light-ammo weapons. Fewer reloads, more hubris.',
    icon: 'mod_mag', recycle: { mechanical_components: 1, steel_spring: 1 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'pistol', 'smg'], weapons: ['kettel', 'stitchr', 'bobkat', 'hairpyn', 'burleta'],
      stats: { mag: 1.5 },
    },
  },
  extended_light_mag_iii: {
    name: 'Extended Light Mag III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Biggest magazine for light-ammo weapons. Reloading becomes a rumour you heard once.',
    icon: 'mod_mag', recycle: { mod_components: 1, steel_spring: 2 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'pistol', 'smg'], weapons: ['kettel', 'stitchr', 'bobkat', 'hairpyn', 'burleta'],
      stats: { mag: 1.75 },
    },
  },
  extended_medium_mag_i: {
    name: 'Extended Medium Mag I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Larger magazine for medium-ammo weapons. A medium-sized upgrade for medium-sized problems.',
    icon: 'mod_mag', recycle: { plastic_parts: 6 }, tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: ['arpeggo', 'tempesta', 'renegayde', 'canta', 'venattor', 'torrento', 'ospray'], stats: { mag: 1.2 },
    },
  },
  extended_medium_mag_ii: {
    name: 'Extended Medium Mag II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Bigger magazine for medium-ammo weapons. Like a family-size snack bag, but louder.',
    icon: 'mod_mag', recycle: { mechanical_components: 1, steel_spring: 1 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: ['arpeggo', 'tempesta', 'renegayde', 'canta', 'venattor', 'torrento', 'ospray'], stats: { mag: 1.4 },
    },
  },
  extended_medium_mag_iii: {
    name: 'Extended Medium Mag III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Biggest magazine for medium-ammo weapons. Deep enough to store your feelings in, if you had time.',
    icon: 'mod_mag', recycle: { mod_components: 1, steel_spring: 2 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: ['arpeggo', 'tempesta', 'renegayde', 'canta', 'venattor', 'torrento', 'ospray'], stats: { mag: 1.6 },
    },
  },
  extended_shotgun_mag_i: {
    name: 'Extended Shotgun Mag I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Extra shell capacity for shotguns. One more \'and another thing\' per argument.',
    icon: 'mod_mag', recycle: { plastic_parts: 6 }, tags: ['mod', 'mag'],
    mod: { slot: 'mag', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { mag: 1.35 } },
  },
  extended_shotgun_mag_ii: {
    name: 'Extended Shotgun Mag II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'More shell capacity for shotguns, for conversations that just keep going.',
    icon: 'mod_mag', recycle: { mechanical_components: 1, steel_spring: 1 },
    tags: ['mod', 'mag'], mod: { slot: 'mag', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { mag: 1.7 } },
  },
  extended_shotgun_mag_iii: {
    name: 'Extended Shotgun Mag III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Doubles a shotgun\'s shell capacity. Ends discussions twice as often.',
    icon: 'mod_mag', recycle: { mod_components: 1, steel_spring: 2 },
    tags: ['mod', 'mag'], mod: { slot: 'mag', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { mag: 2 } },
  },
  horizontal_grip: {
    name: 'Horizontal Grip', type: 'mod', rarity: 'epic', weight: 0.5, stack: 1, value: 7000,
    desc: 'Balanced grip that cuts both recoil and spread, at the cost of slower aiming. Work-life balance for guns.', icon: 'mod_grip',
    recycle: { mod_components: 1, duct_tape: 2 }, tags: ['mod', 'underbarrel'],
    mod: {
      slot: 'underbarrel', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'pistol', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'venattor', 'ospray', 'hullkracker',
      ],
      stats: { spread: 0.7, recoil: 0.7, adsSpeed: 0.7 },
    },
  },
  kinetic_converter: {
    name: 'Espresso Stock', type: 'mod', rarity: 'legendary', weight: 0.75, stack: 1, value: 7000,
    desc: 'Legendary stock that raises fire rate at the cost of control. Three shots of espresso, zero chill.', icon: 'mod_stock',
    recycle: { mod_components: 1, duct_tape: 2 }, tags: ['mod', 'stock'],
    mod: {
      slot: 'stock', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'lmg', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'betina', 'ferrox', 'renegayde', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'torrento', 'ospray', 'hullkracker',
      ],
      stats: { rpm: 1.15, recoil: 1.2, spread: 1.2 },
    },
  },
  lightweight_stock: {
    name: 'Lightweight Stock', type: 'mod', rarity: 'epic', weight: 0.25, stack: 1, value: 5000,
    desc: 'Skeleton stock: lightning-fast aim and draw, but much more recoil. Saved weight by skipping leg day.', icon: 'mod_stock',
    recycle: { mod_components: 1, duct_tape: 1 }, tags: ['mod', 'stock'],
    mod: {
      slot: 'stock', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'lmg', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'betina', 'ferrox', 'renegayde', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'torrento', 'ospray', 'hullkracker',
      ],
      stats: { adsSpeed: 3, equipSpeed: 1.3, recoil: 1.5, recovery: 1.5 },
    },
  },
  muzzle_brake_i: {
    name: 'Muzzle Brake I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Muzzle device that reduces recoil in every direction. Keeps your sights roughly in the same county.',
    icon: 'mod_muzzle', recycle: { metal_parts: 5 },
    tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { recoil: 0.85, spread: 0.92 },
    },
  },
  muzzle_brake_ii: {
    name: 'Muzzle Brake II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Better muzzle brake for less recoil and a touch less spread. Your shoulder files fewer complaints.', icon: 'mod_muzzle',
    recycle: { mechanical_components: 1, wires: 1 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { recoil: 0.8, spread: 0.9 },
    },
  },
  muzzle_brake_iii: {
    name: 'Muzzle Brake III', type: 'mod', rarity: 'rare', weight: 0.5, stack: 1, value: 5000,
    desc: 'Premium muzzle brake: much less recoil and tighter spread, but your weapon wears out faster.', icon: 'mod_muzzle',
    recycle: { mod_components: 1, wires: 2 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { recoil: 0.75, spread: 0.88, durabilityBurn: 1.2 },
    },
  },
  padded_stock: {
    name: 'Padded Stock', type: 'mod', rarity: 'epic', weight: 0.5, stack: 1, value: 5000,
    desc: 'Heavy cushioned stock that greatly improves stability. Slower to draw and aim, much like a recliner.', icon: 'mod_stock',
    recycle: { mod_components: 1, duct_tape: 1 }, tags: ['mod', 'stock'],
    mod: {
      slot: 'stock', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'lmg', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'betina', 'ferrox', 'renegayde', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'torrento', 'ospray', 'hullkracker',
      ],
      stats: { recoil: 0.85, spread: 0.8, equipSpeed: 0.8, adsSpeed: 0.7 },
    },
  },
  shotgun_choke_i: {
    name: 'Shotgun Choke I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Choke that narrows a shotgun\'s pellet pattern. Turns \'spray and pray\' into \'aim and pray\'.',
    icon: 'mod_muzzle', recycle: { metal_parts: 5 },
    tags: ['mod', 'muzzle'], mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { spread: 0.9 } },
  },
  shotgun_choke_ii: {
    name: 'Shotgun Choke II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Tighter choke for a narrower pellet pattern. Reaches slightly further across the room.', icon: 'mod_muzzle',
    recycle: { mechanical_components: 1, wires: 1 }, tags: ['mod', 'muzzle'],
    mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { spread: 0.8 } },
  },
  shotgun_choke_iii: {
    name: 'Shotgun Choke III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Tightest choke: the narrowest pellet pattern, but faster wear on the weapon. Peak focus, at a price.',
    icon: 'mod_muzzle', recycle: { mod_components: 1, wires: 2 },
    tags: ['mod', 'muzzle'],
    mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { spread: 0.7, durabilityBurn: 1.2 } },
  },
  shotgun_silencer: {
    name: 'Shotgun Silencer', type: 'mod', rarity: 'epic', weight: 0.5, stack: 1, value: 5000,
    desc: 'Suppressor for shotguns. Halves firing noise, which is still extremely loud. Science is doing its best.',
    icon: 'mod_muzzle', recycle: { mod_components: 1, wires: 1 },
    tags: ['mod', 'muzzle'], mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { noise: 0.5 } },
  },
  silencer_i: {
    name: 'Silencer I', type: 'mod', rarity: 'uncommon', weight: 0.25, stack: 1, value: 2000,
    desc: 'Suppressor that shrinks how far away your shots are heard. The ARK still hear you, just less of you.', icon: 'mod_muzzle',
    recycle: { mechanical_components: 1, wires: 1 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { noise: 0.8 },
    },
  },
  silencer_ii: {
    name: 'Silencer II', type: 'mod', rarity: 'rare', weight: 0.5, stack: 1, value: 5000,
    desc: 'Better suppressor: your shots carry over a much shorter radius. Library-adjacent.', icon: 'mod_muzzle',
    recycle: { mod_components: 1, wires: 2 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { noise: 0.6 },
    },
  },
  silencer_iii: {
    name: 'Silencer III', type: 'mod', rarity: 'epic', weight: 0.75, stack: 1, value: 7000,
    desc: 'Best suppressor: barely audible shots, but faster weapon wear. Whisper mode for problem-solving.', icon: 'mod_muzzle',
    recycle: { mod_components: 1, wires: 3 }, tags: ['mod', 'muzzle'],
    mod: {
      slot: 'muzzle', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'renegayde', 'stitchr', 'canta', 'bobkat', 'burleta', 'anvill',
        'torrento', 'ospray',
      ],
      stats: { noise: 0.4, durabilityBurn: 1.2 },
    },
  },
  stable_stock_i: {
    name: 'Stable Stock I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Stock that speeds up recovery from recoil and spread. Helps your aim get back on its feet.',
    icon: 'mod_stock', recycle: { rubber_parts: 6 },
    tags: ['mod', 'stock'],
    mod: {
      slot: 'stock', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'lmg', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'betina', 'ferrox', 'renegayde', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'torrento', 'ospray', 'hullkracker',
      ],
      stats: { recoil: 0.92, recovery: 0.8 },
    },
  },
  stable_stock_ii: {
    name: 'Stable Stock II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Steadier stock for faster recoil and spread recovery. Emotionally available to your rifle.', icon: 'mod_stock',
    recycle: { mechanical_components: 1, duct_tape: 1 }, tags: ['mod', 'stock'],
    mod: {
      slot: 'stock', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'lmg', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'betina', 'ferrox', 'renegayde', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'torrento', 'ospray', 'hullkracker',
      ],
      stats: { recoil: 0.88, recovery: 0.65 },
    },
  },
  stable_stock_iii: {
    name: 'Stable Stock III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Steadiest stock: fastest recoil and spread recovery, slightly slower draw. A therapist, but wooden.', icon: 'mod_stock',
    recycle: { mod_components: 1, duct_tape: 2 }, tags: ['mod', 'stock'],
    mod: {
      slot: 'stock', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'lmg', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'betina', 'ferrox', 'renegayde', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'torrento', 'ospray', 'hullkracker',
      ],
      stats: { recoil: 0.84, recovery: 0.5, equipSpeed: 0.8 },
    },
  },
  vertical_grip_i: {
    name: 'Vertical Grip I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Underbarrel grip that reduces muzzle climb for less recoil. For guns with ambitions of flight.',
    icon: 'mod_grip', recycle: { plastic_parts: 6 },
    tags: ['mod', 'underbarrel'],
    mod: {
      slot: 'underbarrel', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'pistol', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'venattor', 'ospray', 'hullkracker',
      ],
      stats: { recoil: 0.8 },
    },
  },
  vertical_grip_ii: {
    name: 'Vertical Grip II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Better vertical grip for noticeably less recoil. Keeps the barrel grounded and humble.', icon: 'mod_grip',
    recycle: { mechanical_components: 1, duct_tape: 1 }, tags: ['mod', 'underbarrel'],
    mod: {
      slot: 'underbarrel', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'pistol', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'venattor', 'ospray', 'hullkracker',
      ],
      stats: { recoil: 0.7 },
    },
  },
  vertical_grip_iii: {
    name: 'Vertical Grip III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Top-tier vertical grip: much less recoil, but slower aiming. Holds on like it\'s owed money.', icon: 'mod_grip',
    recycle: { mechanical_components: 2, duct_tape: 2 }, tags: ['mod', 'underbarrel'],
    mod: {
      slot: 'underbarrel', fits: ['assault_rifle', 'battle_rifle', 'launcher', 'pistol', 'shotgun', 'smg', 'sniper'],
      weapons: [
        'kettel', 'rattlr', 'arpeggo', 'tempesta', 'betina', 'ferrox', 'afelion', 'stitchr', 'canta', 'bobkat', 'el_torro', 'volcano',
        'venattor', 'ospray', 'hullkracker',
      ],
      stats: { recoil: 0.6, adsSpeed: 0.7 },
    },
  },

  // ======================================================================
  // Augments
  // ======================================================================
  free_loadout_augment: {
    name: 'Hand-Me-Down Augment', type: 'augment', rarity: 'common', weight: 1, stack: 1, value: 660,
    desc: 'Bare-bones rig issued with free loadouts. Light shields only, no safe pocket. Free the way a timeshare pitch is free.',
    icon: 'augment', recycle: { rubber_parts: 6, plastic_parts: 6 }, tags: ['augment', 'free_loadout_augment'],
    augment: { backpack: 14, weightLimit: 35, quick: 4, safe: 0, weaponSlots: 2, shields: ['light'] },
  },
  looting_mk_1: {
    name: 'Hoarder Mk. 1', type: 'augment', rarity: 'uncommon', weight: 1, stack: 1, value: 640,
    desc: 'Entry-level hoarding rig with a roomy backpack. Every item is worth keeping. That\'s how they get you.',
    icon: 'augment', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['augment', 'looting'], augment: { backpack: 18, weightLimit: 50, quick: 4, safe: 1, weaponSlots: 2, shields: ['light'] },
  },
  combat_mk_1: {
    name: 'Gym Bro Mk. 1', type: 'augment', rarity: 'uncommon', weight: 2, stack: 1, value: 640,
    desc: 'Entry-level combat rig that supports medium shields. Day one of the program; nobody is swole yet.',
    icon: 'augment', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['augment', 'combat'],
    augment: { backpack: 16, weightLimit: 45, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium'] },
  },
  tactical_mk_1: {
    name: 'Overthinker Mk. 1', type: 'augment', rarity: 'uncommon', weight: 2, stack: 1, value: 640,
    desc: 'Entry-level tactical rig with an extra quick-use slot. Has a plan, a backup plan and a spreadsheet.',
    icon: 'augment', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['augment', 'tactical'],
    augment: { backpack: 15, weightLimit: 40, quick: 5, safe: 1, weaponSlots: 2, shields: ['light', 'medium'] },
  },
  looting_mk_2: {
    name: 'Hoarder Mk. 2', type: 'augment', rarity: 'rare', weight: 2, stack: 1, value: 2000,
    desc: 'Improved hoarding rig with trinket pockets. Shakes off latched Late Fees after 1 s, unlike the real kind.',
    icon: 'augment', recycle: { magnet: 1, electrical_components: 1 },
    tags: ['augment', 'looting'],
    augment: {
      backpack: 22, weightLimit: 60, quick: 4, safe: 2, weaponSlots: 2, shields: ['light'], extra: { trinket: 3 }, perk: 'tick_shake',
      perkDesc: 'Automatically throws off latched Late Fees after 1 s.',
    },
  },
  combat_mk_2: {
    name: 'Gym Bro Mk. 2', type: 'augment', rarity: 'rare', weight: 3, stack: 1, value: 2000,
    desc: 'Improved combat rig with heavy shield support, a grenade slot and slow health regen. Never skips shield day.', icon: 'augment',
    recycle: { electrical_components: 1, magnet: 1 }, tags: ['augment', 'combat'],
    augment: {
      backpack: 18, weightLimit: 55, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], extra: { grenade: 1 },
      perk: 'regen_1hp_5s', perkDesc: 'Restores 1 HP every 5 s; paused for 30 s after taking damage.',
    },
  },
  tactical_mk_2: {
    name: 'Overthinker Mk. 2', type: 'augment', rarity: 'rare', weight: 2, stack: 1, value: 2000,
    desc: 'Improved tactical rig that pops a small smoke cloud when your shield breaks. The exit strategy is built in.', icon: 'augment',
    recycle: { electrical_components: 1, magnet: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 17, weightLimit: 45, quick: 5, safe: 1, weaponSlots: 2, shields: ['light', 'medium'], extra: { trap: 1 },
      perk: 'shield_break_smoke', perkDesc: 'When your shield breaks, pops a small smoke cloud (fixed cooldown).',
    },
  },
  looting_mk_3_cautious: {
    name: 'Hoarder Mk. 3 (Paranoid)', type: 'augment', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Top hoarding rig. A broken shield triggers a weak adrenaline hit, and built-in binoculars let you watch everyone.',
    icon: 'augment', recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'looting'],
    augment: {
      backpack: 24, weightLimit: 70, quick: 5, safe: 2, weaponSlots: 2, shields: ['light'], perk: 'shield_break_adrenaline',
      perkDesc: 'When your shield breaks, injects a weak Adrenaline Shot (fixed cooldown). Integrated Binoculars.',
      integrated: 'integrated_binoculars',
    },
  },
  looting_mk_3_safekeeper: {
    name: 'Hoarder Mk. 3 (Squirrel)', type: 'augment', rarity: 'epic', weight: 5, stack: 1, value: 5000,
    desc: 'Top hoarding rig whose safe pocket takes any item, not just small ones. Bury the good nut where nobody looks.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'looting'],
    augment: {
      backpack: 18, weightLimit: 65, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], extra: { trinket: 2 },
      perk: 'safe_any', perkDesc: 'Safe pocket accepts any item, not just small ones.',
    },
  },
  looting_mk_3_survivor: {
    name: 'Hoarder Mk. 3 (Cockroach)', type: 'augment', rarity: 'epic', weight: 4, stack: 1, value: 5000,
    desc: 'Top hoarding rig. Downed and lying still, you regenerate up to 75% of downed health. Outlives everything.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'looting'],
    augment: {
      backpack: 20, weightLimit: 80, quick: 5, safe: 3, weaponSlots: 2, shields: ['light', 'medium'], extra: { trap: 1 },
      perk: 'downed_regen', perkDesc: 'While downed and stationary, health regenerates up to 75% of downed health.',
    },
  },
  combat_mk_3_aggressive: {
    name: 'Gym Bro Mk. 3 (Swole)', type: 'augment', rarity: 'epic', weight: 5, stack: 1, value: 5000,
    desc: 'Top combat rig with heavy shields, two grenade slots and 2 HP every 5 s while you avoid hits. Gains only.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'combat'],
    augment: {
      backpack: 18, weightLimit: 65, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], extra: { grenade: 2 },
      perk: 'regen_2hp_5s', perkDesc: 'Restores 2 HP every 5 s; paused for 30 s after taking damage.',
    },
  },
  combat_mk_3_flanking: {
    name: 'Gym Bro Mk. 3 (Side Hustle)', type: 'augment', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Top combat rig: stowed pistols and hand cannons equip 33% faster, plus three trap slots. Always has a side gig.',
    icon: 'augment', recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'combat'],
    augment: {
      backpack: 20, weightLimit: 60, quick: 5, safe: 2, weaponSlots: 2, shields: ['light', 'medium'], extra: { trap: 3 },
      perk: 'fast_sidearm', perkDesc: 'Stowed pistols and hand cannons equip 33% faster.',
    },
  },
  tactical_mk_3_defensive: {
    name: 'Overthinker Mk. 3 (Worst Case)', type: 'augment', rarity: 'epic', weight: 5, stack: 1, value: 5000,
    desc: 'Top tactical rig: use Shield Rechargers while running, and one is built in. Planned for this exact disaster.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 20, weightLimit: 60, quick: 5, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], perk: 'recharge_on_move',
      perkDesc: 'Shield Rechargers can be used while running. Integrated Shield Recharger.', integrated: 'integrated_shield_recharger',
    },
  },
  tactical_mk_3_healing: {
    name: 'Overthinker Mk. 3 (Self-Care)', type: 'augment', rarity: 'epic', weight: 4, stack: 1, value: 5000,
    desc: 'Top tactical rig. When you\'re revived it releases a cloud that heals nearby Raiders for 20 HP. Self-care is a team sport.',
    icon: 'augment', recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 16, weightLimit: 55, quick: 4, safe: 3, weaponSlots: 2, shields: ['light', 'medium'], extra: { healing: 3 },
      perk: 'revive_heal_cloud', perkDesc: 'When revived, releases a healing cloud restoring 20 HP to nearby Raiders (30 s cooldown).',
    },
  },
  tactical_mk_3_revival: {
    name: 'Overthinker Mk. 3 (Rebrand)', type: 'augment', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Top tactical rig with slow health regen and a built-in defibrillator. Every failure is just a pivot.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 16, weightLimit: 65, quick: 5, safe: 2, weaponSlots: 2, shields: ['light'], perk: 'regen_1hp_5s',
      perkDesc: 'Restores 1 HP every 5 s (paused 30 s after damage). Integrated Defibrillator.', integrated: 'integrated_defibrillator',
    },
  },
  tactical_mk_3_smoke: {
    name: 'Overthinker Mk. 3 (Ghosting)', type: 'augment', rarity: 'epic', weight: 4, stack: 1, value: 5000,
    desc: 'Top tactical rig that deploys a smoke cloud when your shield breaks. Vanishes mid-conversation, every time.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 19, weightLimit: 50, quick: 5, safe: 2, weaponSlots: 2, shields: ['light', 'medium'], extra: { trap: 2 },
      perk: 'shield_break_smoke', perkDesc: 'When your shield breaks, deploys a smoke cloud (fixed cooldown).',
    },
  },

  // ======================================================================
  // Shields
  // ======================================================================
  light_shield: {
    name: 'Light Shield', type: 'shield', rarity: 'uncommon', weight: 5, stack: 1, value: 640,
    desc: 'Lightweight shield pack that absorbs 40% of incoming damage until depleted. Thin, like most excuses.', icon: 'shield_light',
    recycle: { plastic_parts: 4 }, tags: ['shield'], shield: { cls: 'light', capacity: 40, mitigation: 0.4, moveMul: 1 },
  },
  medium_shield: {
    name: 'Medium Shield', type: 'shield', rarity: 'rare', weight: 7, stack: 1, value: 2000,
    desc: 'Balanced shield pack with a deeper charge. Slightly slows you down. The sensible family car of shields.',
    icon: 'shield_medium', recycle: { ark_circuitry: 1 },
    tags: ['shield'], shield: { cls: 'medium', capacity: 70, mitigation: 0.425, moveMul: 0.95 },
  },
  heavy_shield: {
    name: 'Heavy Shield', type: 'shield', rarity: 'epic', weight: 9, stack: 1, value: 5500,
    desc: 'Heavy shield pack that soaks over half of incoming damage. Noticeably slows you down; you\'re wearing a sofa.',
    icon: 'shield_heavy', recycle: { ark_circuitry: 2, voltage_converter: 1 }, tags: ['shield'],
    shield: { cls: 'heavy', capacity: 80, mitigation: 0.525, moveMul: 0.85 },
  },

  // ======================================================================
  // Healing & recharge consumables
  // ======================================================================
  bandage: {
    name: 'Bandage', type: 'consumable', rarity: 'common', weight: 0.1, stack: 5, value: 250,
    desc: 'Gradually restores 20 HP over 10 s. Works on wounds. Does nothing for the economy.',
    icon: 'bandage', recycle: { fabric: 2 }, tags: ['healing'],
    use: { time: 1.5, healOverTime: { amount: 20, dur: 10 } },
  },
  herbal_bandage: {
    name: 'Herbal Bandage', type: 'consumable', rarity: 'uncommon', weight: 0.15, stack: 5, value: 900,
    desc: 'Improvised poultice bandage that restores 35 HP over 10 s. Smells like a wellness retreat that went bust.',
    icon: 'bandage', recycle: { assorted_seeds: 2, fabric: 5 },
    tags: ['healing'], use: { time: 1.5, healOverTime: { amount: 35, dur: 10 } },
  },
  sterilized_bandage: {
    name: 'Sterilized Bandage', type: 'consumable', rarity: 'rare', weight: 0.2, stack: 3, value: 2000,
    desc: 'Sterile dressing that restores 50 HP over 10 s. Easily the cleanest object for a hundred miles.',
    icon: 'bandage', recycle: { fabric: 1, antiseptic: 1 }, tags: ['healing'],
    use: { time: 1.5, healOverTime: { amount: 50, dur: 10 } },
  },
  adrenaline_shot: {
    name: 'Adrenaline Shot', type: 'consumable', rarity: 'common', weight: 0.2, stack: 5, value: 300,
    desc: 'Fully restores stamina and boosts stamina regen for 10 s. Side effects include sprinting into decisions.', icon: 'adrenaline',
    recycle: { chemicals: 1, plastic_parts: 1 }, tags: ['stamina'], use: { time: 1, stamina: 100, effect: 'adrenaline', dur: 10 },
  },
  agave_juice: {
    name: 'Agave Juice', type: 'consumable', rarity: 'common', weight: 0.2, stack: 5, value: 1800,
    desc: 'Bitter homebrew: costs 5 HP, then boosts stamina regen for 10 s. Desperanza\'s finest beverage, by default.',
    icon: 'adrenaline', tags: ['stamina'],
    use: { time: 1, heal: -5, effect: 'adrenaline', dur: 10 },
  },
  fruit_mix: {
    name: 'Fruit Mix', type: 'consumable', rarity: 'uncommon', weight: 0.3, stack: 5, value: 1800,
    desc: 'A handful of foraged fruit that restores 25 HP and 50 stamina. Your one portion of fruit this year.',
    icon: 'food', tags: ['healing'],
    use: { time: 2, heal: 25, stamina: 50 },
  },
  defibrillator: {
    name: 'Defibrillator', type: 'consumable', rarity: 'rare', weight: 0.75, stack: 3, value: 1000,
    desc: 'Quickly revives a downed Raider and restores 50 HP. Shout \'clear!\', then say something encouraging.',
    icon: 'defib', recycle: { plastic_parts: 1, moss: 1 },
    tags: ['healing'], use: { time: 1.5, heal: 50, effect: 'revive' },
  },
  vyta_shot: {
    name: 'Wellness Shot', type: 'consumable', rarity: 'rare', weight: 0.4, stack: 3, value: 2200,
    desc: 'Potent injection that restores 50 HP after a slow 4 s use. Contains ginger, probably. Nobody checked.',
    icon: 'adrenaline', recycle: { chemicals: 4, syringe: 1 },
    tags: ['healing'], use: { time: 4, heal: 50 },
  },
  vyta_spray: {
    name: 'Wellness Mist', type: 'consumable', rarity: 'epic', weight: 1, stack: 1, value: 3400,
    desc: 'Continuous healing mist, 10 HP/s up to 150 HP, on yourself or allies. The spa day Desperanza can\'t afford.', icon: 'bandage',
    recycle: { antiseptic: 1, canister: 1 }, tags: ['healing'],
    use: { time: 0, healOverTime: { amount: 150, dur: 15 }, effect: 'spray', ally: true },
  },
  shield_recharger: {
    name: 'Shield Recharger', type: 'consumable', rarity: 'uncommon', weight: 0.15, stack: 5, value: 520,
    desc: 'Gradually recharges 40 shield over 10 s. Have you tried turning it off and on again?',
    icon: 'shieldRecharger', recycle: { rubber_parts: 4 }, tags: ['shield_recharge'],
    use: { time: 2, shieldOverTime: { amount: 40, dur: 10 } },
  },
  surge_shield_recharger: {
    name: 'Power Nap Recharger', type: 'consumable', rarity: 'rare', weight: 0.2, stack: 5, value: 1200,
    desc: 'Dumps 50 shield charge at once after a 5 s use. Five seconds of rest, fully refreshed. Science.',
    icon: 'shieldRecharger', recycle: { electrical_components: 1 },
    tags: ['shield_recharge'], use: { time: 5, shield: 50 },
  },
  integrated_shield_recharger: {
    name: 'Integrated Shield Recharger', type: 'consumable', rarity: 'common', weight: 0, stack: 1, value: 0,
    desc: 'Augment-bound shield recharger: 50 shield, 120 s cooldown. Cannot be dropped. Comes with the subscription.',
    icon: 'shieldRecharger', tags: ['shield_recharge'], use: { time: 5, shield: 50, cooldown: 120, reusable: true }, bound: true,
  },
  integrated_defibrillator: {
    name: 'Integrated Defibrillator', type: 'consumable', rarity: 'rare', weight: 0, stack: 1, value: 0,
    desc: 'Augment-bound defibrillator: revives a downed Raider, 240 s cooldown. Cannot be dropped, much like your problems.',
    icon: 'defib', tags: ['healing'],
    use: { time: 1.5, heal: 50, effect: 'revive', cooldown: 240, reusable: true }, bound: true,
  },

  // ======================================================================
  // Grenades & throwables
  // ======================================================================
  light_impact_grenade: {
    name: 'Light Impact Grenade', type: 'grenade', rarity: 'common', weight: 0.1, stack: 5, value: 270,
    desc: 'Detonates on impact for explosive damage in a small radius. No fuse, no patience, no refunds.',
    icon: 'grenade', recycle: { chemicals: 1, plastic_parts: 1 },
    tags: ['grenade'], throw: { kind: 'impact', fuse: 0, radius: 2.5, dmg: 30 },
  },
  heavy_fuze_grenade: {
    name: 'Heavy Fuze Grenade', type: 'grenade', rarity: 'rare', weight: 0.2, stack: 3, value: 1600,
    desc: 'Timed grenade with a big blast and a 3 s fuse. Counting out loud helps nobody but feels great.',
    icon: 'grenade', recycle: { oil: 1, rubber_parts: 2 }, tags: ['grenade'],
    throw: { kind: 'frag', fuse: 3, radius: 7.5, dmg: 80 },
  },
  shrapnel_grenade: {
    name: 'Shrapnel Grenade', type: 'grenade', rarity: 'uncommon', weight: 0.15, stack: 5, value: 800,
    desc: 'Makeshift fuze grenade that bursts into razor fragments. Weak against ARK plating, rough on anyone in a T-shirt.',
    icon: 'grenade', recycle: { crude_explosives: 1, metal_parts: 1 }, tags: ['grenade'],
    throw: { kind: 'frag', fuse: 2.5, radius: 6, dmg: 60, armorPen: 0.1 },
  },
  snap_blast_grenade: {
    name: 'Sticky Situation', type: 'grenade', rarity: 'uncommon', weight: 0.2, stack: 3, value: 800,
    desc: 'Sticks to surfaces and ARK, then detonates after 3 s. Clingy in the most explosive way possible.',
    icon: 'grenade', recycle: { chemicals: 1, magnet: 1 },
    tags: ['grenade'], throw: { kind: 'sticky', fuse: 3, radius: 7.5, dmg: 70 },
  },
  seeker_grenade: {
    name: 'Job Seeker', type: 'grenade', rarity: 'uncommon', weight: 0.2, stack: 5, value: 640,
    desc: 'Homes in on a single ARK within 20 m and explodes on impact. Highly motivated. Willing to relocate.',
    icon: 'grenade', recycle: { crude_explosives: 1 },
    tags: ['grenade'], throw: { kind: 'impact', fuse: 0, radius: 3, dmg: 50, homing: 20, arkOnly: true },
  },
  blaze_grenade: {
    name: 'Hot Mess', type: 'grenade', rarity: 'rare', weight: 0.2, stack: 5, value: 1600,
    desc: 'Bursts on impact and carpets the area in fire: 5 dmg/s for 10 s. A hot mess, but on purpose.',
    icon: 'grenade_fire', recycle: { metal_parts: 4, oil: 2 },
    tags: ['grenade'], throw: { kind: 'fire', fuse: 0, radius: 6, dmg: 5, dur: 10 },
  },
  gas_grenade: {
    name: 'Gas Grenade', type: 'grenade', rarity: 'common', weight: 0.2, stack: 3, value: 270,
    desc: 'Releases a toxic cloud that drains the stamina of Raiders inside it. Smells like the break-room fridge.', icon: 'grenade_gas',
    recycle: { chemicals: 1, rubber_parts: 1 }, tags: ['grenade'],
    throw: { kind: 'gas', fuse: 0, radius: 5, dmg: 0, dur: 20, staminaDrain: 25 },
  },
  smoke_grenade: {
    name: 'Smoke Grenade', type: 'grenade', rarity: 'rare', weight: 0.2, stack: 5, value: 1000,
    desc: 'Large, lingering smoke cloud that blocks ARK and Raider vision. Exit stage left, coughing.',
    icon: 'smoke', recycle: { chemicals: 2, canister: 1 },
    tags: ['grenade'], throw: { kind: 'smoke', fuse: 0, radius: 7.5, dmg: 0, dur: 20 },
  },
  lil_smoke_grenade: {
    name: 'Smoke Break', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 300,
    desc: 'Pops a small smoke cloud on impact that lasts about 6 s. Short, union-mandated, over too soon.',
    icon: 'smoke', recycle: { chemicals: 1, plastic_parts: 1 },
    tags: ['grenade'], throw: { kind: 'smoke', fuse: 0, radius: 2.5, dmg: 0, dur: 6 },
  },
  lure_grenade: {
    name: 'Clickbait', type: 'grenade', rarity: 'uncommon', weight: 0.4, stack: 3, value: 1000,
    desc: 'Noisy sticky beacon that draws nearby ARK and their fire for 15 s. You won\'t believe what happens next.', icon: 'grenade_lure',
    recycle: { speaker_component: 1 }, tags: ['grenade'], throw: { kind: 'lure', fuse: 0.5, radius: 50, dmg: 0, dur: 15, sticky: true },
  },
  showstoppa: {
    name: 'Blue Screen', type: 'grenade', rarity: 'rare', weight: 0.4, stack: 5, value: 2100,
    desc: 'Delayed EMP burst that stuns ARK for 7 s and Raiders for 2 s. Please wait while everything restarts.', icon: 'grenade_stun',
    recycle: { electrical_components: 1, voltage_converter: 1 }, tags: ['grenade'],
    throw: { kind: 'stun', fuse: 3.5, radius: 6, dmg: 0, stunArk: 7, stunRaider: 2 },
  },
  tagging_grenade: {
    name: 'Tag, You\'re It', type: 'grenade', rarity: 'rare', weight: 0.4, stack: 3, value: 1000,
    desc: 'Marks every Raider and ARK in the blast so you can track them for 30 s. No tag-backs.', icon: 'grenade',
    recycle: { plastic_parts: 1, sensors: 1 }, tags: ['grenade'], throw: { kind: 'tagging', fuse: 1.5, radius: 6, dmg: 0, dur: 30 },
  },
  trailblazr: {
    name: 'Hot Gossip', type: 'grenade', rarity: 'rare', weight: 1, stack: 3, value: 2200,
    desc: 'Leaves a trail of flammable gas along its flight path that ignites in a chain reaction. Spreads just like gossip.',
    icon: 'grenade_fire',
    recycle: { crude_explosives: 2 }, tags: ['grenade'], throw: { kind: 'fire', fuse: 0, radius: 2, dmg: 20, dur: 6, trail: 12 },
  },
  wulfpack: {
    name: 'Reply-All', type: 'grenade', rarity: 'epic', weight: 1, stack: 1, value: 6000,
    desc: 'Splits into twelve homing missiles that hunt down every ARK nearby. Nobody asked for this many responses.', icon: 'grenade',
    recycle: { ark_motion_core: 1, explosive_compound: 1 }, tags: ['grenade'],
    throw: { kind: 'wolfpack', fuse: 1.5, radius: 40, dmg: 166, missiles: 12, arkOnly: true },
  },
  blue_light_stick: {
    name: 'Blue Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light with a blue glow for 40 s. Sets a calming mood for your last stand.',
    icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#4aa0f0' },
  },
  green_light_stick: {
    name: 'Green Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light with a green glow for 40 s. Means \'go\' to friends and \'loot here\' to everyone.',
    icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#5cc860' },
  },
  red_light_stick: {
    name: 'Red Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light with a red glow for 40 s. Universal sign for \'danger\' and \'tiny rave down here\'.',
    icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#e84a30' },
  },
  yellow_light_stick: {
    name: 'Yellow Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light with a yellow glow for 40 s. Mildly cautionary, like a strongly worded sticky note.',
    icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#f0d040' },
  },
  firecracker: {
    name: 'Firecracker', type: 'grenade', rarity: 'common', weight: 0.05, stack: 5, value: 270,
    desc: 'Sparks and pops for a few seconds. A cheap distraction, and the only party anyone throws anymore.',
    icon: 'grenade', recycle: { plastic_parts: 3 }, tags: ['grenade'],
    throw: { kind: 'noise', fuse: 0.5, radius: 20, dmg: 0, dur: 7.5 },
  },

  // ======================================================================
  // Traps & mines
  // ======================================================================
  blaze_grenade_trap: {
    name: 'Hot Mess Trap', type: 'trap', rarity: 'rare', weight: 0.3, stack: 3, value: 1000,
    desc: 'Laser tripwire rigged to a Hot Mess. Fire for whoever forgot to look at their feet.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'fire', fuse: 0, radius: 6, dmg: 5, dur: 10, tripwire: 6 },
  },
  gas_grenade_trap: {
    name: 'Gas Grenade Trap', type: 'trap', rarity: 'common', weight: 0.25, stack: 3, value: 300,
    desc: 'Laser tripwire rigged to a Gas Grenade. A stamina-draining welcome mat for uninvited guests.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'gas', fuse: 0, radius: 5, dmg: 0, dur: 20, staminaDrain: 25, tripwire: 6 },
  },
  lure_grenade_trap: {
    name: 'Clickbait Trap', type: 'trap', rarity: 'uncommon', weight: 0.25, stack: 3, value: 1000,
    desc: 'Laser tripwire rigged to a Clickbait. Whoever trips it gets a lot of ARK engagement.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'lure', fuse: 0, radius: 50, dmg: 0, dur: 15, tripwire: 6 },
  },
  smoke_grenade_trap: {
    name: 'Smoke Grenade Trap', type: 'trap', rarity: 'rare', weight: 0.3, stack: 3, value: 640,
    desc: 'Laser tripwire rigged to a Smoke Grenade. Instant fog for surprise visitors, or a surprise exit.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'smoke', fuse: 0, radius: 7.5, dmg: 0, dur: 20, tripwire: 6 },
  },
  explosive_mine: {
    name: 'Explosive Mine', type: 'trap', rarity: 'rare', weight: 0.4, stack: 3, value: 1500,
    desc: 'Proximity mine that pops up and explodes 1 s after triggering. Delivers a short, loud opinion.',
    icon: 'mine', recycle: { oil: 2, sensors: 1 },
    tags: ['trap'], throw: { kind: 'mine_explosive', fuse: 1, radius: 7.5, dmg: 40, trigger: 3 },
  },
  gas_mine: {
    name: 'Gas Mine', type: 'trap', rarity: 'common', weight: 0.25, stack: 3, value: 270,
    desc: 'Proximity mine that releases a stamina-draining gas cloud. A surprise cardio audit.',
    icon: 'mine', recycle: { chemicals: 1, rubber_parts: 1 },
    tags: ['trap'], throw: { kind: 'gas', fuse: 1, radius: 5, dmg: 0, dur: 20, staminaDrain: 25, trigger: 3 },
  },
  jolt_mine: {
    name: 'Shock Value', type: 'trap', rarity: 'rare', weight: 0.2, stack: 3, value: 850,
    desc: 'Proximity mine that stuns ARK for 7 s and Raiders for 4 s. Its entire personality is shock value.',
    icon: 'mine', recycle: { battery: 1, plastic_parts: 2 },
    tags: ['trap'], throw: { kind: 'mine_jolt', fuse: 1, radius: 5, dmg: 0, stunArk: 7, stunRaider: 4, trigger: 3 },
  },
  pulse_mine: {
    name: 'Personal Space', type: 'trap', rarity: 'uncommon', weight: 0.25, stack: 3, value: 470,
    desc: 'Proximity mine that knocks back everything around it. Enforces boundaries firmly and without discussion.',
    icon: 'mine', recycle: { chemicals: 6 }, tags: ['trap'],
    throw: { kind: 'mine_explosive', fuse: 1, radius: 7.5, dmg: 0, knockback: 10, trigger: 3 },
  },
  dedline: {
    name: 'Hard Deadline', type: 'trap', rarity: 'epic', weight: 1, stack: 1, value: 6000,
    desc: 'Timed charge: after 6 s it obliterates everything within 10 m. Non-negotiable, like every deadline.', icon: 'mine',
    recycle: { explosive_compound: 1, ark_circuitry: 1 }, tags: ['trap'],
    throw: { kind: 'mine_explosive', fuse: 6, radius: 10, dmg: 1000, timer: true },
  },
  trigga_nade: {
    name: 'Remote Work', type: 'trap', rarity: 'rare', weight: 0.4, stack: 3, value: 1000,
    desc: 'Sticky remote charge. Throw it, then detonate it whenever you like. Productivity has never been higher.', icon: 'grenade',
    recycle: { chemicals: 1, processor: 1 }, tags: ['trap'], throw: { kind: 'trigger', fuse: 1.5, radius: 7.5, dmg: 90, sticky: true },
  },

  // ======================================================================
  // Gadgets & utility
  // ======================================================================
  barricade_kit: {
    name: 'Barricade Kit', type: 'gadget', rarity: 'uncommon', weight: 0.4, stack: 3, value: 640,
    desc: 'Deployable cover that blocks incoming fire until destroyed (500 HP). Flat-pack, no tiny hex key required.',
    icon: 'barricade', recycle: { metal_parts: 4 },
    tags: ['gadget'], throw: { kind: 'barricade', fuse: 0, radius: 1.5, dmg: 0, hp: 500, dismantle: 5 },
  },
  door_blocker: {
    name: 'Door Blocker', type: 'gadget', rarity: 'common', weight: 0.2, stack: 3, value: 270,
    desc: 'Locks a powered door shut until someone breaches it. A \'Do Not Disturb\' sign with real commitment.',
    icon: 'barricade', recycle: { metal_parts: 2 }, tags: ['gadget'],
    throw: { kind: 'barricade', fuse: 0, radius: 0.5, dmg: 0, target: 'door' },
  },
  remote_raider_flare: {
    name: 'Cry For Help', type: 'gadget', rarity: 'common', weight: 0.2, stack: 3, value: 270,
    desc: 'Place it, then trigger it remotely to launch a distress flare. Sends a message nobody will answer in time.',
    icon: 'flare', recycle: { chemicals: 1, rubber_parts: 1 },
    tags: ['gadget'], throw: { kind: 'flare', fuse: 0, radius: 12, dmg: 0, dur: 30, remote: true },
  },
  fireworks_box: {
    name: 'Fireworks Box', type: 'gadget', rarity: 'rare', weight: 0.5, stack: 1, value: 2000,
    desc: 'Remote-triggered fireworks. Loud, bright and deeply distracting. Celebrate something. Anything.',
    icon: 'flare', recycle: { explosive_compound: 1 },
    tags: ['gadget'], throw: { kind: 'lure', fuse: 0, radius: 40, dmg: 0, dur: 10, remote: true },
  },
  surge_coil: {
    name: 'Bug Zapper', type: 'gadget', rarity: 'rare', weight: 0.4, stack: 3, value: 2100,
    desc: 'Deployable coil that zaps everything nearby every 2 s. ARK flock to it like moths to a porch light.', icon: 'trap',
    recycle: { electrical_components: 1, sensors: 1 }, tags: ['gadget'],
    throw: { kind: 'stun', fuse: 2, radius: 6, dmg: 6, stunArk: 1, stunRaider: 0.5, interval: 2, hp: 40, lure: true },
  },
  white_flag: {
    name: 'White Flag', type: 'gadget', rarity: 'common', weight: 0.2, stack: 5, value: 640,
    desc: 'Plant it to signal peaceful intent. Works about as often as shouting \'Don\'t shoot!\', which is sometimes.',
    icon: 'flag', recycle: { fabric: 5, plastic_parts: 1 },
    tags: ['gadget'], throw: { kind: 'flare', fuse: 0, radius: 3, dmg: 0, dur: 60, flag: 'white' },
  },
  zipline: {
    name: 'Zipline', type: 'gadget', rarity: 'rare', weight: 0.4, stack: 3, value: 1000,
    desc: 'Fires a line up to 60 m between two points for fast traversal. Yelling \'wheee\' is optional but encouraged.',
    icon: 'zipline', recycle: { rope: 1, metal_parts: 1 },
    tags: ['gadget'], throw: { kind: 'zipline_skip', fuse: 0, radius: 0, dmg: 0, range: 60 },
  },
  noisemaker: {
    name: 'Noisemaker', type: 'gadget', rarity: 'common', weight: 0.3, stack: 3, value: 640,
    desc: 'Proximity sensor that sounds an alarm when enemy Raiders come close. A doorbell for paranoid people.',
    icon: 'gadget', recycle: { speaker_component: 1 },
    tags: ['gadget'], throw: { kind: 'noise', fuse: 0, radius: 8, dmg: 0, dur: 4, sensor: true },
  },
  binoculars: {
    name: 'Binoculars', type: 'gadget', rarity: 'common', weight: 0.5, stack: 1, value: 640,
    desc: 'Two-step magnification for scouting ahead without exposing yourself. Birdwatching, but the birds shoot back.',
    icon: 'binoculars', recycle: { rubber_parts: 2, plastic_parts: 4 }, tags: ['gadget'],
    use: { time: 0.3, effect: 'binoculars', range: 60, reusable: true },
  },
  integrated_binoculars: {
    name: 'Integrated Binoculars', type: 'gadget', rarity: 'common', weight: 0, stack: 1, value: 0,
    desc: 'Augment-bound binoculars. Cannot be dropped. Nosy-neighbour mode, permanently installed.', icon: 'binoculars', tags: ['gadget'],
    use: { time: 0.3, effect: 'binoculars', range: 60, reusable: true }, bound: true,
  },
  photoelectric_cloak: {
    name: 'Out Of Office', type: 'gadget', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Bends light so ARK lose track of you while you move slowly. Recharges between uses. You are not at your desk.', icon: 'cloak',
    recycle: { advanced_electrical_components: 1, speaker_component: 1 }, tags: ['gadget'],
    use: { time: 0.5, effect: 'cloak', dur: 12, cooldown: 25, moveMul: 0.5, reusable: true },
  },
  powered_descender: {
    name: 'Golden Parachute', type: 'gadget', rarity: 'epic', weight: 5, stack: 1, value: 10000,
    desc: 'Slows your fall when used in mid-air; needs a moment to spool up. Used to be for executives only.', icon: 'gadget',
    recycle: { advanced_electrical_components: 1, ark_circuitry: 1 }, tags: ['gadget'],
    use: { time: 0.3, effect: 'descend', dur: 8, reusable: true },
  },
  snap_hook: {
    name: 'Social Climber', type: 'gadget', rarity: 'legendary', weight: 5, stack: 1, value: 14000,
    desc: 'Grappling launcher for scaling structures and crossing gaps up to 20 m. Climbs the ladder, skips the rungs.', icon: 'grapple',
    recycle: { power_rod: 1, rope: 3 }, tags: ['gadget'], use: { time: 0.2, effect: 'grapple', range: 20, cooldown: 4, reusable: true },
  },
  recorder: {
    name: 'Recorder', type: 'gadget', rarity: 'uncommon', weight: 0.2, stack: 1, value: 1000,
    desc: 'A playable recorder. Attracts ARK and impresses other Raiders, if \'impresses\' means \'pains deeply\'.',
    icon: 'instrument', recycle: { plastic_parts: 10 },
    tags: ['gadget'], use: { time: 0, effect: 'lure', radius: 30, dur: 6, reusable: true },
  },
  shaker: {
    name: 'Shaker', type: 'gadget', rarity: 'uncommon', weight: 0.2, stack: 1, value: 1000,
    desc: 'A rhythmic shaker. Attracts ARK and impresses other Raiders. Every apocalypse needs a percussion section.',
    icon: 'instrument', recycle: { plastic_parts: 10 },
    tags: ['gadget'], use: { time: 0, effect: 'lure', radius: 30, dur: 6, reusable: true },
  },
  acoustic_guitar: {
    name: 'Acoustic Guitar', type: 'gadget', rarity: 'legendary', weight: 1, stack: 1, value: 7000,
    desc: 'A playable acoustic guitar. ARK come running and Raiders sing along. Someone always requests the one song you know.',
    icon: 'instrument',
    recycle: { wires: 6, metal_parts: 4 }, tags: ['gadget'], use: { time: 0, effect: 'lure', radius: 40, dur: 8, reusable: true },
  },
  flame_spray: {
    name: 'Flame Spray', type: 'gadget', rarity: 'uncommon', weight: 1, stack: 1, value: 2000,
    desc: 'Makeshift flamethrower: 10 dmg/s in a short cone until the can runs dry. The most aggressive air freshener.', icon: 'gadget',
    recycle: { canister: 1, fyreball_burner: 1 }, tags: ['gadget'], use: { time: 0, effect: 'flame', dmg: 10, range: 6, dur: 10 },
  },

  // ======================================================================
  // Keys
  // ======================================================================
  damn_grounds_control_tower_key: {
    name: 'Dam Grounds Control Tower Key', type: 'key', rarity: 'epic', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens the locked top-floor room of the Control Tower on Dam Grounds.', icon: 'key', tags: ['key', 'damn_grounds'],
    key: { map: 'damn_grounds', room: 'control_tower' },
  },
  damn_grounds_controlled_access_zone_key: {
    name: 'Dam Grounds Controlled Access Zone Key', type: 'key', rarity: 'rare', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens the locked building in the Controlled Access Zone on Dam Grounds.', icon: 'key', tags: ['key', 'damn_grounds'],
    key: { map: 'damn_grounds', room: 'controlled_access_zone' },
  },
  damn_grounds_staff_room_key: {
    name: 'Dam Grounds Staff Room Key', type: 'key', rarity: 'uncommon', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens the staff room in the Research & Administration building on Dam Grounds.', icon: 'key', tags: ['key', 'damn_grounds'],
    key: { map: 'damn_grounds', room: 'staff_room' },
  },
  damn_grounds_surveillance_key: {
    name: 'Dam Grounds Surveillance Key', type: 'key', rarity: 'uncommon', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens the surveillance room south of Water Treatment on Dam Grounds.', icon: 'key', tags: ['key', 'damn_grounds'],
    key: { map: 'damn_grounds', room: 'surveillance' },
  },
  damn_grounds_testing_annex_key: {
    name: 'Dam Grounds Testing Annex Key', type: 'key', rarity: 'rare', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens one of the locked doors inside the Testing Annex on Dam Grounds.', icon: 'key', tags: ['key', 'damn_grounds'],
    key: { map: 'damn_grounds', room: 'testing_annex' },
  },
  sandy_city_hospital_key: {
    name: 'Sandy City Hospital Key', type: 'key', rarity: 'rare', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens a locked ward on the hospital\'s second floor in Sandy City.', icon: 'key', tags: ['key', 'sandy_city'],
    key: { map: 'sandy_city', room: 'hospital' },
  },
  sandy_city_space_travel_employee_card: {
    name: 'Sandy City Space Travel Employee Card', type: 'key', rarity: 'uncommon', weight: 0.25, stack: 1, value: 100,
    desc: 'Keycard for the staff-only floor of the Space Travel building in Sandy City.', icon: 'key', tags: ['key', 'sandy_city'],
    key: { map: 'sandy_city', room: 'space_travel' },
  },
  sandy_city_residential_master_key: {
    name: 'Sandy City Residential Master Key', type: 'key', rarity: 'uncommon', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens several locked apartments throughout Sandy City.', icon: 'key', tags: ['key', 'sandy_city'],
    key: { map: 'sandy_city', room: 'residential' },
  },
  sandy_city_town_hall_key: {
    name: 'Sandy City Town Hall Key', type: 'key', rarity: 'epic', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens the north door into the Town Hall in Sandy City.', icon: 'key', tags: ['key', 'sandy_city'],
    key: { map: 'sandy_city', room: 'town_hall' },
  },
  green_gate_cellar_key: {
    name: 'Green Gate Cellar Key', type: 'key', rarity: 'rare', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens a farmhouse cellar west of the olive grove on Green Gate.', icon: 'key', tags: ['key', 'green_gate'],
    key: { map: 'green_gate', room: 'cellar' },
  },
  green_gate_communication_tower_key: {
    name: 'Green Gate Communication Tower Key', type: 'key', rarity: 'rare', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens the locked basement room under the Communication Tower on Green Gate.', icon: 'key', tags: ['key', 'green_gate'],
    key: { map: 'green_gate', room: 'communication_tower' },
  },
  green_gate_confiscation_room_key: {
    name: 'Green Gate Confiscation Room Key', type: 'key', rarity: 'epic', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens the confiscation room in the Security Wing tunnels of Green Gate.', icon: 'key', tags: ['key', 'green_gate'],
    key: { map: 'green_gate', room: 'confiscation_room' },
  },
  green_gate_village_key: {
    name: 'Green Gate Village Key', type: 'key', rarity: 'uncommon', weight: 0.25, stack: 1, value: 100,
    desc: 'Opens a locked house in the village on Green Gate.', icon: 'key', tags: ['key', 'green_gate'],
    key: { map: 'green_gate', room: 'village' },
  },
  patrol_car_key: {
    name: 'Patrol Car Key', type: 'key', rarity: 'uncommon', weight: 0.25, stack: 1, value: 100,
    desc: 'Unlocks the abandoned patrol car on Green Gate.', icon: 'key', tags: ['key', 'green_gate'],
    key: { map: 'green_gate', room: 'patrol_car' },
  },
  raider_hatch_key: {
    name: 'Doggy Door Key', type: 'key', rarity: 'rare', weight: 0.01, stack: 1, value: 2000,
    desc: 'Opens any Doggy Door for an emergency extraction. Crawl through with whatever dignity you have left.',
    icon: 'key', tags: ['key', 'any'],
    key: { map: 'any', room: 'raider_hatch' },
  },

  // ======================================================================
  // Materials
  // ======================================================================
  metal_parts: {
    name: 'Metal Parts', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 75,
    desc: 'Scrap metal. The backbone of almost every recipe, and the cause of every Raider\'s back problems.',
    icon: 'metalParts', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  plastic_parts: {
    name: 'Plastic Parts', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 60,
    desc: 'Assorted plastic scrap for casings and grips. It will outlive us all, so you may as well use it.',
    icon: 'plastic_parts', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  rubber_parts: {
    name: 'Rubber Parts', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 50,
    desc: 'Rubber offcuts for seals, grips and gaskets. Bouncy, but not in a fun way.', icon: 'rubber_parts', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  fabric: {
    name: 'Fabric', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 50,
    desc: 'Cloth scraps for bandages and gear; refines into Durable Cloth. Formerly someone\'s favourite shirt.',
    icon: 'fabric', tags: ['material', 'basic'], material: { tier: 'basic' },
  },
  chemicals: {
    name: 'Chemicals', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 50,
    desc: 'Jars of reagents: the base for ammo, explosives and meds. The labels are long gone; vibes only.',
    icon: 'chemicals', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  // --- refined materials ---
  mechanical_components: {
    name: 'Mechanical Components', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 10, value: 640,
    desc: 'Refined moving parts needed for most weapon work. Things that go clunk, professionally.',
    icon: 'component', recycle: { rubber_parts: 2, metal_parts: 3 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  electrical_components: {
    name: 'Electrical Components', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 10, value: 640,
    desc: 'Refined circuitry for gear, augments and gadgets. Still warm from whatever it used to run.',
    icon: 'component', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  durable_cloth: {
    name: 'Durable Cloth', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 10, value: 640,
    desc: 'Tough cloth refined from fabric for bandages and medical upgrades. Survives the wash, and the apocalypse.',
    icon: 'fabric', recycle: { fabric: 6 }, tags: ['material', 'refined'],
    material: { tier: 'refined' },
  },
  crude_explosives: {
    name: 'Crude Explosives', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 10, value: 270,
    desc: 'Unstable homemade filler for grenades, mines and launcher ammo. Store far from your stash, and yourself.',
    icon: 'explosive', recycle: { chemicals: 3 }, tags: ['material', 'refined'],
    material: { tier: 'refined' },
  },
  explosive_compound: {
    name: 'Explosive Compound', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 1000,
    desc: 'Stable, potent explosive compound for advanced ordnance. Crude Explosives, but it went to college.',
    icon: 'explosive', recycle: { crude_explosives: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  antiseptic: {
    name: 'Antiseptic', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1000,
    desc: 'Medical-grade antiseptic for advanced healing items. Stings exactly as much as you fear it will.',
    icon: 'chemicals', recycle: { chemicals: 10 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  mod_components: {
    name: 'Mod Components', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1750,
    desc: 'Precision parts for crafting tier III and specialist weapon mods. Tiny, fiddly, always at the bottom of the bag.',
    icon: 'component', recycle: { mechanical_components: 1, steel_spring: 1 }, tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  simple_gun_parts: {
    name: 'Simple Gun Parts', type: 'material', rarity: 'uncommon', weight: 0.3, stack: 10, value: 330,
    desc: 'Generic firearm parts for building and upgrading basic weapons. Some assembly required. Lots, actually.',
    icon: 'gun_parts', recycle: { metal_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  light_gun_parts: {
    name: 'Light Gun Parts', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 700,
    desc: 'Parts for light-ammo weapons like SMGs and pistols. Small enough to lose down the back of a couch.',
    icon: 'gun_parts', recycle: { simple_gun_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  medium_gun_parts: {
    name: 'Medium Gun Parts', type: 'material', rarity: 'rare', weight: 0.4, stack: 5, value: 700,
    desc: 'Parts for rifles and other medium-ammo weapons. Neither here nor there, but absolutely essential.',
    icon: 'gun_parts', recycle: { simple_gun_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  heavy_gun_parts: {
    name: 'Heavy Gun Parts', type: 'material', rarity: 'rare', weight: 0.5, stack: 5, value: 700,
    desc: 'Parts for heavy rifles, shotguns, hand cannons and launchers. Each weighs about as much as your conscience.',
    icon: 'gun_parts', recycle: { simple_gun_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  // --- advanced materials ---
  advanced_mechanical_components: {
    name: 'Advanced Mechanical Components', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1750,
    desc: 'High-grade mechanical assemblies for top-tier weapons and Gun Garage III. Clunks with a premium feel.', icon: 'component',
    recycle: { steel_spring: 1, mechanical_components: 1 }, tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  advanced_electrical_components: {
    name: 'Advanced Electrical Components', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1750,
    desc: 'High-grade electronics for top-tier augments and gear. Smarter than most of the people carrying them.',
    icon: 'component', recycle: { wires: 1, electrical_components: 1 },
    tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  complex_gun_parts: {
    name: 'Complex Gun Parts', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Rare precision parts used in experimental weapons. Comes with a manual nobody has ever finished.',
    icon: 'gun_parts', recycle: { simple_gun_parts: 3 },
    tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  magnetic_accelerator: {
    name: 'Magnetic Accelerator', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 5500,
    desc: 'Magnetic coil assembly that drives experimental and top-tier weapons. Keep away from your bank cards.', icon: 'component',
    recycle: { advanced_mechanical_components: 1, ark_motion_core: 1 }, tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  power_rod: {
    name: 'Power Rod', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 5000,
    desc: 'Dense energy-storage rod for heavy shields and advanced gadgets. Hums ominously. That\'s normal. Probably.', icon: 'battery',
    recycle: { advanced_electrical_components: 1, ark_circuitry: 1 }, tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  exodos_modules: {
    name: 'Exit Strategy Modules', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 2750,
    desc: 'Mysterious modules of unknown, possibly orbital origin, prized by gunsmiths. Nobody has read the terms.',
    icon: 'component', recycle: { magnet: 2, processor: 2 },
    tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  // --- topside materials ---
  battery: {
    name: 'Battery', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 250,
    desc: 'An old but serviceable battery for energy clips, shields and mines. Licking it to check is a local tradition.',
    icon: 'battery', recycle: { metal_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  wires: {
    name: 'Wires', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 200,
    desc: 'A bundle of copper wiring for traps, mods and electronics. Already tangled; it came that way.',
    icon: 'wires', recycle: { rubber_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  sensors: {
    name: 'Sensors', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500,
    desc: 'Salvaged sensor modules for mines, coils and keys. They have seen things, and they logged all of it.',
    icon: 'component', recycle: { wires: 1, metal_parts: 1 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  steel_spring: {
    name: 'Steel Spring', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'A sturdy coil spring for magazines and mechanical parts. Boing, but with structural integrity.',
    icon: 'metalParts', recycle: { metal_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  oil: {
    name: 'Oil', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'A can of lubricant oil for anything that squeaks. Including, in desperate times, your knees.',
    icon: 'canister', recycle: { chemicals: 3 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  canister: {
    name: 'Canister', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'An empty pressurised canister. Holds gas, juice or a terrible idea, depending on the crafter.',
    icon: 'canister', recycle: { plastic_parts: 3 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  duct_tape: {
    name: 'Duct Tape', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'Fixes everything until the next raid. Holds every grip and stock together, plus three Desperanza buildings.',
    icon: 'fabric', recycle: { fabric: 3 }, tags: ['material', 'topside'],
    material: { tier: 'topside' },
  },
  rope: {
    name: 'Rope', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500,
    desc: 'Strong braided rope for ziplines and grappling gear. Also good for tying up loose ends.',
    icon: 'fabric', recycle: { fabric: 5 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  magnet: {
    name: 'Magnet', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'A strong permanent magnet. Attracted to metal, augments, and the very bottom of your bag.',
    icon: 'metalParts', recycle: { metal_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  processor: {
    name: 'Processor', type: 'material', rarity: 'rare', weight: 0.2, stack: 5, value: 500,
    desc: 'A salvaged microprocessor for top-tier augments. Faster than anything else still running, including you.',
    icon: 'component', recycle: { wires: 1, plastic_parts: 1 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  speaker_component: {
    name: 'Speaker Component', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500,
    desc: 'A small speaker driver for noisemakers and lures. Ideal for making noise, terrible for keeping secrets.',
    icon: 'component', recycle: { plastic_parts: 2, rubber_parts: 3 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  voltage_converter: {
    name: 'Voltage Converter', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500,
    desc: 'Steps power up or down between systems. The only thing in the apocalypse that manages expectations.',
    icon: 'component', recycle: { wires: 1, rubber_parts: 1 },
    tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  synthesized_fuel: {
    name: 'Synthesized Fuel', type: 'material', rarity: 'rare', weight: 0.5, stack: 5, value: 700,
    desc: 'Volatile synthetic fuel for fire grenades and Bad Idea Bench upgrades. Smoking near it is a one-time choice.',
    icon: 'canister', recycle: { oil: 1, plastic_parts: 1 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  syringe: {
    name: 'Syringe', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500,
    desc: 'A sterile syringe for advanced medicine like the Wellness Shot. Point the sharp end away from your face.',
    icon: 'adrenaline', recycle: { plastic_parts: 3, chemicals: 2 },
    tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  motor: {
    name: 'Motor', type: 'material', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'A small electric motor. Wanted for Upcycler III; recycles into oil and mechanical components.', icon: 'component',
    recycle: { oil: 2, mechanical_components: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  industrial_battery: {
    name: 'Industrial Battery', type: 'material', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'A heavy industrial battery pack. Built to run a factory; now powering Sewing Circle upgrades.',
    icon: 'battery', recycle: { chemicals: 7, battery: 2 }, tags: ['material', 'topside'],
    material: { tier: 'topside' },
  },
  power_cable: {
    name: 'Power Cable', type: 'material', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'A thick insulated power cable for Sewing Circle upgrades. Reaches every outlet except the one you need.',
    icon: 'wires', recycle: { wires: 4 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  // --- nature materials ---
  assorted_seeds: {
    name: 'Assorted Seeds', type: 'material', rarity: 'common', weight: 0.05, stack: 100, value: 100,
    desc: 'Seeds of many kinds; seven in a canister make a Shaker. Auntie Synergy sells them as \'growth opportunities\'.',
    icon: 'seeds', tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  great_mullein: {
    name: 'Great Mullein', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'Medicinal herb for herbal bandages and antiseptic. Fuzzy leaves, firm opinions.', icon: 'plant', recycle: { assorted_seeds: 2 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  moss: {
    name: 'Moss', type: 'material', rarity: 'rare', weight: 0.3, stack: 10, value: 500,
    desc: 'Damp moss with antiseptic properties, used in defibrillators somehow. Grows on everything that sits still.',
    icon: 'plant', recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  mushroom: {
    name: 'Mushroom', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 1000,
    desc: 'An edible mushroom. Nugget wants a dozen for an upgrade and will not explain why.',
    icon: 'plant', tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  agave: {
    name: 'Agave', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 1000,
    desc: 'Spiky succulent. Press it into Agave Juice with an empty wine bottle. Ouch first, cheers after.',
    icon: 'plant', recycle: { assorted_seeds: 3 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  apricot: {
    name: 'Apricot', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640,
    desc: 'A sweet apricot for fruit mix. Nugget accepts them as tribute for his upgrades.',
    icon: 'fruit', recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  lemon: {
    name: 'Lemon', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640,
    desc: 'A sour lemon for fruit mix. When life gives you these, at least life is giving you something.',
    icon: 'fruit', recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  olives: {
    name: 'Olives', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640,
    desc: 'A handful of olives. Nugget takes them for an upgrade. Nobody else will, and that\'s fine.',
    icon: 'fruit', recycle: { assorted_seeds: 2 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  prickly_pear: {
    name: 'Prickly Pear', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640,
    desc: 'Cactus fruit for fruit mix and Nugget\'s upkeep. Mind the spines. It\'s not personal, it\'s a cactus.',
    icon: 'fruit', recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  candleberries: {
    name: 'Candleberries', type: 'material', rarity: 'rare', weight: 0.5, stack: 10, value: 460,
    desc: 'Waxy berries that glow faintly at night. The cheapest mood lighting left in the world.',
    icon: 'fruit', recycle: { assorted_seeds: 2 }, tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  roots: {
    name: 'Roots', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640,
    desc: 'Gnarled edible roots that recycle into seeds. Tastes like dirt with ambition.',
    icon: 'plant', recycle: { assorted_seeds: 1 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  resin: {
    name: 'Resin', type: 'material', rarity: 'common', weight: 0.4, stack: 10, value: 1000,
    desc: 'Sticky tree resin. It will get on everything you own, permanently, as a gift.',
    icon: 'plant', tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  fertilizer: {
    name: 'Fertilizer', type: 'material', rarity: 'uncommon', weight: 0.4, stack: 5, value: 1000,
    desc: 'A sack of fertilizer for the Desperanza gardens. Smells like growth. Mostly it just smells.',
    icon: 'plant', recycle: { assorted_seeds: 2 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  fossilized_lightning: {
    name: 'Static Souvenir', type: 'material', rarity: 'epic', weight: 0.25, stack: 1, value: 4000,
    desc: 'Glassy rock left where lightning struck during an Electric Boogaloo. Recycles into explosive compound.',
    icon: 'valuable', recycle: { explosive_compound: 3 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  // --- arc materials ---
  ark_alloy: {
    name: 'ARK Budget Alloy', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 200,
    desc: 'Light plating that falls off every destroyed ARK. Lowest-bidder grade, yet benches and shields want it anyway.',
    icon: 'arc_part', recycle: { metal_parts: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_powercell: {
    name: 'ARK Power Bill', type: 'material', rarity: 'common', weight: 0.5, stack: 5, value: 270,
    desc: 'Power cell pulled from an ARK. Feeds shield rechargers and Upcycler upgrades. Somebody, somewhere, is paying for it.',
    icon: 'arc_part', tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  advanced_ark_powercell: {
    name: 'ARK Premium Power Bill', type: 'material', rarity: 'rare', weight: 0.5, stack: 5, value: 640,
    desc: 'High-capacity ARK power cell for Energy Clips and Power Nap Rechargers. Hidden fees included.',
    icon: 'arc_part', recycle: { ark_powercell: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_ark_powercell: {
    name: 'Overdue ARK Power Bill', type: 'material', rarity: 'common', weight: 0.25, stack: 5, value: 293,
    desc: 'A cracked ARK power cell, long past due. Recycles into ARK Budget Alloy, which is more than most bills do.',
    icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_circuitry: {
    name: 'ARK Red Tape', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 1000,
    desc: 'Intact ARK circuit board, routed entirely through red tape. Used in Power Rods, Medium Shields and Hard Deadlines.',
    icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  burned_ark_circuitry: {
    name: 'Burned ARK Red Tape', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 5, value: 640,
    desc: 'Fire-damaged ARK circuitry. The paperwork burned, but the bureaucracy survived. Recycles into alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  glitched_ark_circuitry: {
    name: 'Glitched ARK Red Tape', type: 'material', rarity: 'legendary', weight: 0.5, stack: 1, value: 5000,
    desc: 'ARK circuitry still twitching with strange signals. Recycles into alloy and Exit Strategy Modules. Approved by nobody.',
    icon: 'arc_part', recycle: { exodos_modules: 1, ark_alloy: 6 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_motion_core: {
    name: 'ARK Motion to Dismiss', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 1000,
    desc: 'ARK servo core, filed in triplicate. Needed for Launcher Ammo, Magnetic Accelerators and Reply-All grenades.',
    icon: 'arc_part', recycle: { ark_alloy: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_ark_motion_core: {
    name: 'Overruled ARK Motion', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 5, value: 640,
    desc: 'A broken ARK servo core. Motion denied. Recycles into ARK Budget Alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_coolant: {
    name: 'ARK Chill Juice', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'Pressurised ARK coolant, cold enough to make a Hot Take reconsider. Recycles into a heap of chemicals.',
    icon: 'arc_part', recycle: { chemicals: 16 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  impure_ark_coolant: {
    name: 'Funky ARK Chill Juice', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640,
    desc: 'Contaminated ARK coolant with an alarming fizz. Still recycles into chemicals. Do not drink. Again.',
    icon: 'arc_part', recycle: { chemicals: 12 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_flex_rubber: {
    name: 'ARK Flex Time', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'Flexible ARK joint rubber that bends to fit any schedule. Recycles into a big pile of rubber parts.',
    icon: 'arc_part', recycle: { rubber_parts: 16 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  degraded_ark_rubber: {
    name: 'Revoked ARK Flex Time', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640,
    desc: 'Perished ARK rubber; the flexibility has been withdrawn by management. Recycles into rubber parts.',
    icon: 'arc_part', recycle: { rubber_parts: 11 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_performance_steel: {
    name: 'ARK Performance Review', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'High-tensile ARK steel that exceeds expectations. Recycles into a heap of metal parts.',
    icon: 'arc_part', recycle: { metal_parts: 12 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  rusty_ark_steel: {
    name: 'Rusty Performance Review', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640,
    desc: 'Corroded ARK steel plate. Needs improvement. Recycles into metal parts anyway.',
    icon: 'arc_part', recycle: { metal_parts: 8 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_synthetic_resin: {
    name: 'ARK Sticky Clause', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'ARK-grade synthetic resin, binding in every sense. Recycles into a heap of plastic parts.',
    icon: 'arc_part', recycle: { plastic_parts: 14 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  dried_out_ark_resin: {
    name: 'Dried-Out Sticky Clause', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640,
    desc: 'Brittle, dried-out ARK resin. The clause has lapsed. Recycles into plastic parts.',
    icon: 'arc_part', recycle: { plastic_parts: 9 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_thermo_lining: {
    name: 'ARK Silver Lining', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'Heat-proof ARK lining fabric. Every cloud has one; this one fell off a machine. Recycles into fabric.',
    icon: 'arc_part', recycle: { fabric: 16 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  tattered_ark_lining: {
    name: 'Tattered Silver Lining', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640,
    desc: 'Shredded ARK lining. Even the silver lining has seen better days. Recycles into fabric.',
    icon: 'arc_part', recycle: { fabric: 12 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  glitched_ark_light_ring: {
    name: 'Glitched ARK Ring Light', type: 'material', rarity: 'epic', weight: 0.5, stack: 1, value: 3000,
    desc: 'An ARK \'eye\' light ring, flickering erratically. Perfect for influencers with something to hide.', icon: 'arc_part',
    recycle: { advanced_electrical_components: 1, ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  glitched_ark_phased_array: {
    name: 'Just-a-Phase Array', type: 'material', rarity: 'rare', weight: 0.5, stack: 1, value: 2000,
    desc: 'A glitching ARK radar array. It\'s not broken, it\'s going through a phase. Recycles into sensors and alloy.',
    icon: 'arc_part', recycle: { sensors: 2, ark_alloy: 3 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  glitched_ark_power_converter: {
    name: 'Moody Power Converter', type: 'material', rarity: 'common', weight: 0.5, stack: 1, value: 640,
    desc: 'A sputtering ARK power converter. Up, down, up, sulk. Recycles into ARK Budget Alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  glitched_ark_transmitter: {
    name: 'Spam Transmitter', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 1, value: 1000,
    desc: 'A glitched ARK transmitter broadcasting gibberish around the clock. The unsubscribe link is broken.',
    icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  wazp_driver: {
    name: 'Buzzkill Rotor', type: 'material', rarity: 'rare', weight: 0.6, stack: 3, value: 640,
    desc: 'Rotor driver salvaged from a Buzzkill. Gun Garage upgrades want a stack. The party is over for that drone.',
    icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_wazp_driver: {
    name: 'Busted Buzzkill Rotor', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 270,
    desc: 'A mangled Buzzkill rotor driver. It will never fly again, but it recycles into alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  hornett_driver: {
    name: 'Middle Manager Rotor', type: 'material', rarity: 'rare', weight: 0.75, stack: 3, value: 1000,
    desc: 'Rotor driver from a Middle Manager. Used in Sewing Circle upgrades, Bug Zappers and Blue Screens. Delegates well.',
    icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_hornett_driver: {
    name: 'Demoted Manager Rotor', type: 'material', rarity: 'common', weight: 0.3, stack: 3, value: 640,
    desc: 'A mangled Middle Manager rotor driver, recently restructured. Recycles into alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  tikk_pod: {
    name: 'Late Fee Stub', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 3, value: 640,
    desc: 'Body pod from a Late Fee. Medicine Cabinet upgrades and Wellness Mist need them. Interest still accruing.',
    icon: 'arc_part', recycle: { chemicals: 2, ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_tikk_pod: {
    name: 'Torn Late Fee Stub', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 270,
    desc: 'A cracked Late Fee pod. Torn up, yet somehow you still owe it. Recycles into alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  popp_trigger: {
    name: 'Pop-Up Blocker', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 3, value: 640,
    desc: 'Detonator from a Pop-Up Ad. Wanted for Bad Idea Bench upgrades and Fireworks Boxes. Blocks one ad, forever.',
    icon: 'arc_part', recycle: { ark_alloy: 1, crude_explosives: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  fyreball_burner: {
    name: 'Hot Take Burner', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 3, value: 640,
    desc: 'Burner unit from a Hot Take, because every Hot Take needs a burner. Used for Flame Spray and Upcycler upgrades.',
    icon: 'arc_part', recycle: { ark_alloy: 1, crude_explosives: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_fyreball_burner: {
    name: 'Cold Take Burner', type: 'material', rarity: 'common', weight: 1, stack: 3, value: 270,
    desc: 'A broken Hot Take burner. The take has cooled considerably. Recycles into alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  fyrefly_burner: {
    name: 'Burnout Pilot Light', type: 'material', rarity: 'rare', weight: 0.75, stack: 3, value: 1000,
    desc: 'Burner unit from a Burnout, still flickering on pure fumes. Fuels Hot Gossip grenades.',
    icon: 'arc_part', recycle: { ark_alloy: 2, crude_explosives: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  snytch_scanner: {
    name: 'Narc Wiretap', type: 'material', rarity: 'uncommon', weight: 0.75, stack: 3, value: 1000,
    desc: 'Scanner head from a Narc. Junk Drawer upgrades want it. Unplug it before it calls its friends.',
    icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_snytch_scanner: {
    name: 'Busted Narc Wiretap', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 659,
    desc: 'A smashed Narc scanner that can\'t call anyone anymore. Traders still pay a decent tip-off fee.',
    icon: 'arc_part', tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  spottr_relay: {
    name: 'Plus One RSVP', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 1000,
    desc: 'Targeting relay from a Plus One. It confirmed attendance for an entire Shell Company. Recycles into electronics.',
    icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  komet_igniter: {
    name: 'Blackout Fuse', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'Igniter from a Rolling Blackout. Somebody\'s power is going out tonight. Used in Hard Deadlines.',
    icon: 'arc_part', recycle: { ark_alloy: 2, crude_explosives: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  sentinal_firing_core: {
    name: 'Nosy Neighbor Core', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 2000,
    desc: 'Laser firing core from a Neighborhood Watch. Never once minded its own business. Gun Garage III wants it.',
    icon: 'arc_part', recycle: { ark_alloy: 2, mechanical_components: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  surveyr_vault: {
    name: 'Data Dump', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'Data vault from a Data Miner, stuffed with everyone\'s passwords. Medicine Cabinet III wants a few.', icon: 'arc_part',
    recycle: { ark_alloy: 1, mechanical_components: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  shreddr_gyro: {
    name: 'Close Talker Gyro', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 2000,
    desc: 'Gyroscope from a Close Talker. Still spinning, still far too close. Goes into the Hair Dryer.',
    icon: 'arc_part', recycle: { ark_alloy: 2, mechanical_components: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  leapr_pulse_unit: {
    name: 'Parkour Dad\'s Knee', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Jump-jet pulse unit from a Parkour Dad. Junk Drawer III wants it. He\'ll be walking this one off for weeks.',
    icon: 'arc_part', recycle: { advanced_mechanical_components: 1, ark_alloy: 3 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_leapr_pulse_unit: {
    name: 'Parkour Dad\'s Bad Knee', type: 'material', rarity: 'common', weight: 0.3, stack: 3, value: 1000,
    desc: 'A damaged Parkour Dad pulse unit. He felt that one, and so will you. Recycles into alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  rocketier_driver: {
    name: 'Rocket Surgeon Driver', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Thruster driver from a Rocket Surgeon. Needed for Bad Idea Bench III and Reply-All grenades. It\'s not brain surgery.',
    icon: 'arc_part', recycle: { ark_alloy: 3, advanced_electrical_components: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_rocketier_driver: {
    name: 'Malpractice Driver', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 1000,
    desc: 'A damaged Rocket Surgeon driver. Something went very wrong in theatre. Recycles into alloy.',
    icon: 'arc_part', recycle: { ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  bastian_cell: {
    name: 'HOA Dues Cell', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Heavy power cell from an HOA President. Sewing Circle III wants it. Late payments are not accepted.',
    icon: 'arc_part', recycle: { advanced_mechanical_components: 1, ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  bombardeer_cell: {
    name: 'Offshore Cell', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Artillery power cell from a Shell Company, officially registered somewhere sunny. The Upcycler III wants it.',
    icon: 'arc_part', recycle: { advanced_mechanical_components: 1, ark_alloy: 3 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  assessr_matrix: {
    name: 'Tax Bracket Matrix', type: 'material', rarity: 'epic', weight: 0.5, stack: 1, value: 5000,
    desc: 'Analysis matrix from a Tax Assessor. It has already estimated what you owe. Recycles into premium power.', icon: 'arc_part',
    recycle: { advanced_mechanical_components: 1, advanced_ark_powercell: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  vaporiser_regulator: {
    name: 'Vape Lord Coil', type: 'material', rarity: 'epic', weight: 0.5, stack: 3, value: 6000,
    desc: 'Thermal regulator from a Vape Lord. Smells faintly of mango. The Hair Dryer won\'t work without one.',
    icon: 'arc_part', recycle: { advanced_electrical_components: 1, ark_circuitry: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  turbyne_compressor: {
    name: 'Lossy Compressor', type: 'material', rarity: 'epic', weight: 0.5, stack: 3, value: 5000,
    desc: 'Compressor from a Cloud Service. Some data was lost in compression, mostly yours. Powers the Golden Parachute.',
    icon: 'arc_part', recycle: { ark_motion_core: 1, ark_circuitry: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  matriark_reactor: {
    name: 'Helicopter Mom Reactor', type: 'material', rarity: 'legendary', weight: 10, stack: 1, value: 11000,
    desc: 'The reactor heart of a Helicopter Mom. Enormous, enormously valuable, and still hovering. Builds the Solar Flair.',
    icon: 'arc_part', recycle: { power_rod: 1, magnetic_accelerator: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  queene_reactor: {
    name: 'Security Deposit', type: 'material', rarity: 'legendary', weight: 10, stack: 1, value: 11000,
    desc: 'The reactor heart of The Landlady. Worth a fortune, and you were never meant to get it back. Builds two legendaries.',
    icon: 'arc_part', recycle: { power_rod: 1, magnetic_accelerator: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },

  // ======================================================================
  // Valuables (recyclable salvage)
  // ======================================================================
  alarm_clock: {
    name: 'Alarm Clock', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Rings at 6 a.m. sharp, apocalypse or not. Recycles into plastic parts and a processor.',
    icon: 'salvage', recycle: { plastic_parts: 6, processor: 1 },
    tags: ['recyclable'],
  },
  bicycle_pump: {
    name: 'Bicycle Pump', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Inflates tyres nobody owns any more. Recycles into canisters and metal parts.',
    icon: 'salvage', recycle: { canister: 4, metal_parts: 10 },
    tags: ['recyclable'],
  },
  broken_flashlight: {
    name: 'Broken Flashlight', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Perfect for not seeing things. Recycles into batteries and metal parts.',
    icon: 'salvage', recycle: { battery: 2, metal_parts: 6 },
    tags: ['recyclable'],
  },
  broken_guidance_system: {
    name: 'Broken Guidance System', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Lost its sense of direction, which is relatable. Recycles into processors.',
    icon: 'salvage', recycle: { processor: 4 }, tags: ['recyclable'],
  },
  broken_handheld_radio: {
    name: 'Broken Handheld Radio', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Picks up nothing but static and ARK hold music. Recycles into sensors and wires.',
    icon: 'salvage', recycle: { sensors: 3, wires: 2 }, tags: ['recyclable'],
  },
  broken_taser: {
    name: 'Broken Taser', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Still tingles if you hold it wrong, so don\'t. Recycles into batteries and wires.',
    icon: 'salvage', recycle: { battery: 2, wires: 2 }, tags: ['recyclable'],
  },
  camera_lens: {
    name: 'Camera Lens', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 5, value: 640,
    desc: 'Zoomed in on the end of the world and blinked. Recycles into plastic parts.',
    icon: 'salvage', recycle: { plastic_parts: 8 }, tags: ['recyclable'],
  },
  candle_holder: {
    name: 'Candle Holder', type: 'valuable', rarity: 'uncommon', weight: 2, stack: 3, value: 640,
    desc: 'Holds candles. Nobody has candles. Recycles into metal parts.',
    icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  coolant: {
    name: 'Coolant', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Bright green, pre-war and definitely not a sports drink. Recycles into chemicals and oil.',
    icon: 'salvage', recycle: { chemicals: 5, oil: 2 }, tags: ['recyclable'],
  },
  cooling_coil: {
    name: 'Cooling Coil', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'It used to keep something cold; now it\'s just chill. Recycles into chemicals and steel springs.',
    icon: 'salvage', recycle: { chemicals: 6, steel_spring: 2 },
    tags: ['recyclable'],
  },
  cooling_fan: {
    name: 'Cooling Fan', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Spins loudly, cools nothing, raised a lot of money. Recycles into plastic parts and wires.',
    icon: 'salvage', recycle: { plastic_parts: 14, wires: 4 },
    tags: ['recyclable'],
  },
  cracked_bioscanner: {
    name: 'Cracked Bioscanner', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Scans you, sighs, suggests seeing a doctor. Medicine Cabinet upgrades want it; recycles into rubber and batteries.',
    icon: 'salvage', recycle: { rubber_parts: 3, battery: 3 },
    tags: ['recyclable'],
  },
  crumpled_plastic_bottle: {
    name: 'Crumpled Plastic Bottle', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 270,
    desc: 'Somebody already crushed it for you. Recycles into plastic parts. The planet thanks you, slightly.',
    icon: 'salvage', recycle: { plastic_parts: 4 }, tags: ['recyclable'],
  },
  damaged_heat_sink: {
    name: 'Damaged Heat Sink', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Sank some heat, took some damage. Junk Drawer upgrades want it; recycles into metal parts and wires.',
    icon: 'salvage', recycle: { metal_parts: 6, wires: 2 },
    tags: ['recyclable'],
  },
  deflated_football: {
    name: 'Deflated Football', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 1000,
    desc: 'Lost its bounce, like the rest of us. Recycles into rubber parts and fabric.',
    icon: 'salvage', recycle: { rubber_parts: 9, fabric: 9 },
    tags: ['recyclable'],
  },
  diving_goggles: {
    name: 'Diving Goggles', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640,
    desc: 'For seeing clearly underwater, if you ever find clean water. Recycles into rubber parts.',
    icon: 'salvage', recycle: { rubber_parts: 12 }, tags: ['recyclable'],
  },
  dog_collar: {
    name: 'Dog Collar', type: 'valuable', rarity: 'rare', weight: 0.8, stack: 3, value: 640,
    desc: 'No dog, just a collar with a tag reading \'Good Boy\'. Nugget wants one for an upgrade. Recycles into fabric.',
    icon: 'salvage', recycle: { fabric: 8, metal_parts: 1 },
    tags: ['recyclable'],
  },
  expired_respirator: {
    name: 'Expired Respirator', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640,
    desc: 'Filters out everything except bad decisions. Also expired. Recycles into rubber parts and fabric.',
    icon: 'salvage', recycle: { rubber_parts: 8, fabric: 4 },
    tags: ['recyclable'],
  },
  flow_controller: {
    name: 'Flow Controller', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Controlled the flow of something important, once. Recycles into advanced mechanical parts and sensors.', icon: 'salvage',
    recycle: { advanced_mechanical_components: 1, sensors: 1 }, tags: ['recyclable'],
  },
  frequency_modulation_box: {
    name: 'Frequency Modulation Box', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Tunes into frequencies nobody broadcasts on anymore. Recycles into advanced electronics and a speaker.', icon: 'salvage',
    recycle: { advanced_electrical_components: 1, speaker_component: 1 }, tags: ['recyclable'],
  },
  fried_motherboard: {
    name: 'Fried Motherboard', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Smells like burnt toast and a lost save file. Junk Drawer upgrades want it; recycles into plastic and electronics.',
    icon: 'salvage', recycle: { plastic_parts: 5, electrical_components: 2 }, tags: ['recyclable'],
  },
  frying_pan: {
    name: 'Frying Pan', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640,
    desc: 'Cooks eggs, bonks heads, wins arguments. Recycles into metal parts.',
    icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  garlic_press: {
    name: 'Garlic Press', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 1000,
    desc: 'The most specific kitchen tool ever made. Recycles into a surprising amount of metal parts.',
    icon: 'salvage', recycle: { metal_parts: 12 }, tags: ['recyclable'],
  },
  geiger_counter: {
    name: 'Geiger Counter', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 3500,
    desc: 'Clicks nervously near anything interesting. Recycles into batteries and Exit Strategy Modules.',
    icon: 'salvage', recycle: { battery: 3, exodos_modules: 1 },
    tags: ['recyclable'],
  },
  headphones: {
    name: 'Headphones', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Noise-cancelling, the one luxury nobody can afford topside. Recycles into rubber parts and a speaker.', icon: 'salvage',
    recycle: { rubber_parts: 7, speaker_component: 1 }, tags: ['recyclable'],
  },
  household_cleaner: {
    name: 'Household Cleaner', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Kills 99.9% of germs and 0% of ARK. Recycles into plenty of chemicals.',
    icon: 'salvage', recycle: { chemicals: 11 }, tags: ['recyclable'],
  },
  humidifier: {
    name: 'Humidifier', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Adds moisture to air that is mostly smoke now. Recycles into canisters and wires.',
    icon: 'salvage', recycle: { canister: 2, wires: 2 }, tags: ['recyclable'],
  },
  ice_cream_scooper: {
    name: 'Ice Cream Scooper', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'A scoop with nothing left to scoop. Recycles into metal parts, the saddest flavour.',
    icon: 'salvage', recycle: { metal_parts: 7 }, tags: ['recyclable'],
  },
  industrial_charger: {
    name: 'Industrial Charger', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Charges anything, given enough cable and optimism. Recycles into metal parts and a voltage converter.', icon: 'salvage',
    recycle: { metal_parts: 5, voltage_converter: 1 }, tags: ['recyclable'],
  },
  industrial_magnet: {
    name: 'Industrial Magnet', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Picks up metal, and occasionally your gun. Recycles into metal parts and magnets.',
    icon: 'salvage', recycle: { metal_parts: 4, magnet: 2 },
    tags: ['recyclable'],
  },
  ion_sputter: {
    name: 'Ion Sputter', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 6000,
    desc: 'Nobody knows what it sputters, but it sells. Recycles into voltage converters and Exit Strategy Modules.', icon: 'salvage',
    recycle: { voltage_converter: 4, exodos_modules: 1 }, tags: ['recyclable'],
  },
  laboratory_reagents: {
    name: 'Laboratory Reagents', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Science in a box, mostly unlabeled. Bad Idea Bench upgrades want it; recycles into chemicals and crude explosives.',
    icon: 'salvage', recycle: { chemicals: 16, crude_explosives: 3 },
    tags: ['recyclable'],
  },
  magnetron: {
    name: 'Magnetron', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 6000,
    desc: 'The angry heart of an old microwave. Recycles into a magnetic accelerator and a steel spring.', icon: 'salvage',
    recycle: { magnetic_accelerator: 1, steel_spring: 1 }, tags: ['recyclable'],
  },
  metal_brackets: {
    name: 'Metal Brackets', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'They held up shelves; now they\'ll hold up your crafting. Recycles into metal parts.',
    icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  microscope: {
    name: 'Microscope', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'For looking very closely at very tiny problems. Recycles into advanced mechanical parts and magnets.', icon: 'salvage',
    recycle: { advanced_mechanical_components: 1, magnet: 3 }, tags: ['recyclable'],
  },
  mini_centrifuge: {
    name: 'Mini Centrifuge', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Spins samples very fast, for science or for fun. Recycles into advanced mechanical parts and canisters.', icon: 'salvage',
    recycle: { advanced_mechanical_components: 1, canister: 2 }, tags: ['recyclable'],
  },
  number_plate: {
    name: 'Number Plate', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 270,
    desc: 'A licence plate with a vanity message nobody can decode. Recycles into metal parts.',
    icon: 'salvage', recycle: { metal_parts: 3 }, tags: ['recyclable'],
  },
  polluted_air_filter: {
    name: 'Polluted Air Filter', type: 'valuable', rarity: 'rare', weight: 0.8, stack: 3, value: 1000,
    desc: 'It did its job. Just look at it. Recycles into fabric and oil.',
    icon: 'salvage', recycle: { fabric: 6, oil: 2 }, tags: ['recyclable'],
  },
  portable_tv: {
    name: 'Portable TV', type: 'valuable', rarity: 'rare', weight: 3, stack: 1, value: 2000,
    desc: 'Receives zero channels in glorious colour. Recycles into batteries and wires.',
    icon: 'salvage', recycle: { battery: 2, wires: 6 }, tags: ['recyclable'],
  },
  power_bank: {
    name: 'Power Bank', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Holds a charge better than most Raiders hold a grudge. Recycles into batteries and wires.',
    icon: 'salvage', recycle: { battery: 2, wires: 2 }, tags: ['recyclable'],
  },
  projector: {
    name: 'Projector', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Still loaded with slides from a pitch nobody finished. Recycles into wires and a processor.',
    icon: 'salvage', recycle: { wires: 2, processor: 1 }, tags: ['recyclable'],
  },
  radio: {
    name: 'Radio', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Tunes into the end-of-the-world broadcast, on repeat. Recycles into a speaker component and sensors.',
    icon: 'salvage', recycle: { speaker_component: 1, sensors: 1 },
    tags: ['recyclable'],
  },
  radio_relay: {
    name: 'Radio Relay', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Relays signals to nobody, very reliably. Recycles into speaker components and sensors.',
    icon: 'salvage', recycle: { speaker_component: 2, sensors: 2 },
    tags: ['recyclable'],
  },
  remote_control: {
    name: 'Remote Control', type: 'valuable', rarity: 'rare', weight: 0.8, stack: 3, value: 1000,
    desc: 'Its TV is long gone, but it still wants control. Recycles into plastic parts and sensors.',
    icon: 'salvage', recycle: { plastic_parts: 7, sensors: 1 },
    tags: ['recyclable'],
  },
  ripped_safety_vest: {
    name: 'Ripped Safety Vest', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 1000,
    desc: 'High-visibility: the exact opposite of what you want topside. Recycles into durable cloth and a magnet.',
    icon: 'salvage', recycle: { durable_cloth: 1, magnet: 1 },
    tags: ['recyclable'],
  },
  rocket_thruster: {
    name: 'Rocket Thruster', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Literally rocket science, now in pieces. Recycles into synthesized fuel and metal parts.', icon: 'salvage',
    recycle: { synthesized_fuel: 2, metal_parts: 6 }, tags: ['recyclable'],
  },
  rotary_encoder: {
    name: 'Rotary Encoder', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Counts rotations, mostly its own. Recycles into electrical components and processors.', icon: 'salvage',
    recycle: { electrical_components: 2, processor: 2 }, tags: ['recyclable'],
  },
  rubber_pad: {
    name: 'Rubber Pad', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'A thick, squishy rubber pad. Recycles into an extremely generous pile of rubber parts.',
    icon: 'salvage', recycle: { rubber_parts: 18 }, tags: ['recyclable'],
  },
  ruined_accordion: {
    name: 'Ruined Accordion', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Even ruined, it\'s louder than you\'d like. Recycles into rubber parts and steel springs.',
    icon: 'salvage', recycle: { rubber_parts: 18, steel_spring: 3 },
    tags: ['recyclable'],
  },
  ruined_augment: {
    name: 'Ruined Augment', type: 'valuable', rarity: 'common', weight: 3, stack: 1, value: 270,
    desc: 'Somebody\'s old rig, well past its warranty. Recycles into plastic and rubber parts.',
    icon: 'salvage', recycle: { plastic_parts: 2, rubber_parts: 2 },
    tags: ['recyclable'],
  },
  ruined_baton: {
    name: 'Ruined Baton', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Retired from crowd control; now it\'s a crowd of parts. Recycles into metal and rubber parts.',
    icon: 'salvage', recycle: { metal_parts: 6, rubber_parts: 3 },
    tags: ['recyclable'],
  },
  ruined_handcuffs: {
    name: 'Ruined Handcuffs', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'No key, no prisoner, no case, no idea who left them here. Recycles into metal parts.',
    icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  ruined_parachute: {
    name: 'Ruined Parachute', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Opened once, worked once, never again. Recycles into fabric.', icon: 'salvage', recycle: { fabric: 10 }, tags: ['recyclable'],
  },
  ruined_riot_shield: {
    name: 'Ruined Riot Shield', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'It has seen riots. It lost. Recycles into plastic and rubber parts.',
    icon: 'salvage', recycle: { plastic_parts: 10, rubber_parts: 6 },
    tags: ['recyclable'],
  },
  ruined_tactical_vest: {
    name: 'Ruined Tactical Vest', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Tactical once, ruined now, same as most plans. Recycles into fabric and a magnet.',
    icon: 'salvage', recycle: { fabric: 5, magnet: 1 }, tags: ['recyclable'],
  },
  rusted_bolts: {
    name: 'Rusted Bolts', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'A fistful of rusty bolts. Recycles into metal parts. The tetanus is complimentary.',
    icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  rusted_gear: {
    name: 'Rusted Gear', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Sells for 2,000 Scrip. You will carry 40 of these until the heat death of the universe. Gun Garage III wants 3.',
    icon: 'salvage', recycle: { metal_parts: 4, mechanical_components: 2 }, tags: ['recyclable'],
  },
  rusted_shut_medical_kit: {
    name: 'Rusted Shut Medical Kit', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'The longest waiting room in history. Medicine Cabinet upgrades want it; recycles into syringes and antiseptic.',
    icon: 'salvage', recycle: { syringe: 2, antiseptic: 1 },
    tags: ['recyclable'],
  },
  rusted_tools: {
    name: 'Rusted Tools', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Tools so rusty they need tools. Gun Garage upgrades want them; recycles into metal parts and a spring.',
    icon: 'salvage', recycle: { metal_parts: 8, steel_spring: 1 },
    tags: ['recyclable'],
  },
  sample_cleaner: {
    name: 'Sample Cleaner', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Cleans samples. Of what, nobody wrote down. Recycles into electrical components and a pile of seeds.', icon: 'salvage',
    recycle: { electrical_components: 2, assorted_seeds: 14 }, tags: ['recyclable'],
  },
  signal_amplifier: {
    name: 'Signal Amplifier', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Makes weak signals strong and bad news louder. Recycles into electrical components and voltage converters.', icon: 'salvage',
    recycle: { electrical_components: 2, voltage_converter: 2 }, tags: ['recyclable'],
  },
  spectrometer: {
    name: 'Spectrometer', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Splits light into colours for people who find rainbows too simple. Recycles into advanced electronics and sensors.',
    icon: 'salvage', recycle: { advanced_electrical_components: 1, sensors: 1 }, tags: ['recyclable'],
  },
  spectrum_analyzer: {
    name: 'Spectrum Analyzer', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 3500,
    desc: 'Analyses the whole spectrum. Results: inconclusive, but shiny. Recycles into sensors and Exit Strategy Modules.',
    icon: 'salvage', recycle: { sensors: 1, exodos_modules: 1 },
    tags: ['recyclable'],
  },
  spring_cushion: {
    name: 'Spring Cushion', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 2000,
    desc: 'Boing, but comfortable. Recycles into durable cloth and steel springs.',
    icon: 'salvage', recycle: { durable_cloth: 2, steel_spring: 2 },
    tags: ['recyclable'],
  },
  telemetry_transceiver: {
    name: 'Telemetry Transceiver', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Still sending data to a server that no longer exists. Recycles into advanced electronics and a processor.', icon: 'salvage',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['recyclable'],
  },
  thermostat: {
    name: 'Thermostat', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'The office thermostat war is over and nobody won. Recycles into rubber parts and sensors.',
    icon: 'salvage', recycle: { rubber_parts: 7, sensors: 1 },
    tags: ['recyclable'],
  },
  toaster: {
    name: 'Toaster', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Not a weapon. Yet. The Upcycler wants a few for upgrades; recycles into plastic parts and wires.',
    icon: 'salvage', recycle: { plastic_parts: 5, wires: 3 },
    tags: ['recyclable'],
  },
  torn_blanket: {
    name: 'Torn Blanket', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640,
    desc: 'Holes in all the wrong places and none of the warm ones. Recycles into fabric.',
    icon: 'salvage', recycle: { fabric: 12 }, tags: ['recyclable'],
  },
  turbo_pump: {
    name: 'Turbo Pump', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Pumps with turbo-charged enthusiasm. Recycles into mechanical components and oil.',
    icon: 'salvage', recycle: { mechanical_components: 1, oil: 3 },
    tags: ['recyclable'],
  },
  unusable_weapon: {
    name: 'Unusable Weapon', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Useless as a weapon, great as a donor. Recycles into metal parts and simple gun parts.', icon: 'salvage',
    recycle: { metal_parts: 4, simple_gun_parts: 5 }, tags: ['recyclable'],
  },
  water_filter: {
    name: 'Water Filter', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Filters water, which is more than anyone else is doing. Recycles into rubber parts and canisters.',
    icon: 'salvage', recycle: { rubber_parts: 2, canister: 3 },
    tags: ['recyclable'],
  },
  water_pump: {
    name: 'Water Pump', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Pumps water uphill against all odds. Recycles into metal parts and oil.',
    icon: 'salvage', recycle: { metal_parts: 4, oil: 2 }, tags: ['recyclable'],
  },

  // ======================================================================
  // Trinkets
  // ======================================================================
  leviathons_crown_ship_model: {
    name: '"Supply Chain" Ship Model', type: 'trinket', rarity: 'legendary', weight: 0.5, stack: 1, value: 10000,
    desc: 'A majestic model merchant ship, fully loaded with tiny backorders. Estimated arrival: never. Very valuable.',
    icon: 'trinket', tags: ['trinket'],
  },
  sirena_dorada_ship_model: {
    name: '"Tax Write-Off" Ship Model', type: 'trinket', rarity: 'epic', weight: 0.5, stack: 3, value: 7000,
    desc: 'A gleaming model yacht from sunnier days. Technically a business expense.', icon: 'trinket', tags: ['trinket'],
  },
  twilite_compass_ship_model: {
    name: '"Mid-Life Crisis" Ship Model', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 5, value: 1000,
    desc: 'A spirited two-master model ship, bought on impulse at forty. Sails nowhere, but fast.', icon: 'trinket', tags: ['trinket'],
  },
  velossity_ship_model: {
    name: '"Move Fast" Ship Model', type: 'trinket', rarity: 'rare', weight: 0.5, stack: 3, value: 3000,
    desc: 'A sleek racing-hull model. It moved fast. It broke things. It never apologised.', icon: 'trinket', tags: ['trinket'],
  },
  wynd_sprite_ship_model: {
    name: '"Sunk Cost" Ship Model', type: 'trinket', rarity: 'common', weight: 0.5, stack: 10, value: 1000,
    desc: 'A cheap but cheerful model sailboat. You\'ve carried it this far, so you may as well keep going.',
    icon: 'trinket', tags: ['trinket'],
  },
  air_freshener: {
    name: 'Air Freshener', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 5, value: 2000,
    desc: 'Still smells faintly of pine and mild desperation. Also the secret ingredient in Flame Spray.',
    icon: 'trinket', tags: ['trinket'],
  },
  alien_duck: {
    name: 'Little Green Duck', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 15, value: 1000,
    desc: 'A rubber duck with antennae. Comes in peace. Squeaks in peace. Probes nobody.',
    icon: 'trinket', tags: ['trinket'],
  },
  arcade_duck: {
    name: 'High Score Duck', type: 'trinket', rarity: 'epic', weight: 0.3, stack: 15, value: 7000,
    desc: 'A pixel-art rubber duck prize, won for 3,000 tickets. Worth every one of them, allegedly.',
    icon: 'trinket', tags: ['trinket'],
  },
  bloated_tuna_can: {
    name: 'Suspicious Tuna Can', type: 'trinket', rarity: 'common', weight: 0.2, stack: 15, value: 1000,
    desc: 'Do not open. Somebody will still buy it, which says a lot about the economy.', icon: 'trinket', tags: ['trinket'],
  },
  breathtaking_snow_globe: {
    name: 'Breathtaking Snow Globe', type: 'trinket', rarity: 'epic', weight: 0.2, stack: 1, value: 7000,
    desc: 'A pristine snow globe of a city that no longer exists. Shake it for weather nobody forecasts anymore.',
    icon: 'trinket', tags: ['trinket'],
  },
  bronze_statuette: {
    name: 'Bronze Statuette', type: 'trinket', rarity: 'legendary', weight: 0.5, stack: 25, value: 10000,
    desc: 'A heavy bronze figure of considerable age and no explanation. Collectors pay a fortune anyway.',
    icon: 'trinket', tags: ['trinket'],
  },
  burnt_out_candles: {
    name: 'Burnt-Out Candles', type: 'trinket', rarity: 'common', weight: 0.2, stack: 15, value: 640,
    desc: 'Stubs of old candles, burnt at both ends like every Raider\'s sleep schedule.',
    icon: 'trinket', tags: ['trinket'],
  },
  cat_bed: {
    name: 'Cat Bed', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 3, value: 1000,
    desc: 'A cosy cat bed. Nugget has claimed it for an upgrade and will not discuss it further.', icon: 'trinket', tags: ['trinket'],
  },
  coffee_pot: {
    name: 'Coffee Pot', type: 'trinket', rarity: 'common', weight: 0.3, stack: 3, value: 1000,
    desc: 'An old stovetop coffee pot. Brews despair, then coffee, in that order.',
    icon: 'trinket', tags: ['trinket'],
  },
  colorful_shoes: {
    name: 'Colorful Shoes', type: 'trinket', rarity: 'rare', weight: 0.5, stack: 3, value: 3000,
    desc: 'A pair of loud, colourful sneakers. Not stealthy. Not trying to be.', icon: 'trinket', tags: ['trinket'],
  },
  dart_board: {
    name: 'Dart Board', type: 'trinket', rarity: 'uncommon', weight: 1, stack: 3, value: 2000,
    desc: 'A well-used dart board. Someone pinned an ARK flyer to it and missed every single time.',
    icon: 'trinket', tags: ['trinket'],
  },
  doodly_duck: {
    name: 'Meeting Notes Duck', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 15, value: 3000,
    desc: 'A rubber duck covered in doodles from a meeting that could have been an email.', icon: 'trinket', tags: ['trinket'],
  },
  elephant_obelisk: {
    name: 'Elephant Obelisk', type: 'trinket', rarity: 'legendary', weight: 0.5, stack: 1, value: 10000,
    desc: 'An ornate carved elephant obelisk. Nobody knows why, but rich people used to buy these.', icon: 'trinket', tags: ['trinket'],
  },
  empty_wine_bottle: {
    name: 'Empty Wine Bottle', type: 'trinket', rarity: 'common', weight: 0.2, stack: 5, value: 1000,
    desc: 'An empty bottle; the party ended years ago. Pair it with agave to brew Agave Juice.', icon: 'trinket', tags: ['trinket'],
  },
  equatorial_sundial: {
    name: 'Equatorial Sundial', type: 'trinket', rarity: 'rare', weight: 0.5, stack: 3, value: 3000,
    desc: 'A brass equatorial sundial. Accurate to the minute on the one day it isn\'t cloudy.', icon: 'trinket', tags: ['trinket'],
  },
  expired_pasta: {
    name: 'Expired Pasta', type: 'trinket', rarity: 'common', weight: 0.1, stack: 15, value: 1000,
    desc: 'Best before the apocalypse. Still sealed, still technically food, still very much expired.', icon: 'trinket', tags: ['trinket'],
  },
  faded_photograph: {
    name: 'Faded Photograph', type: 'trinket', rarity: 'common', weight: 0.3, stack: 15, value: 640,
    desc: 'Strangers smiling at a beach. Nobody knows whose it is. Everyone agrees it looks nice.', icon: 'trinket', tags: ['trinket'],
  },
  familiar_duck: {
    name: 'Deja Duck', type: 'trinket', rarity: 'epic', weight: 0.3, stack: 15, value: 7000,
    desc: 'A rubber duck that looks oddly familiar. You\'ve definitely looted this duck before. Haven\'t you?',
    icon: 'trinket', tags: ['trinket'],
  },
  film_reel: {
    name: 'Film Reel', type: 'trinket', rarity: 'rare', weight: 0.2, stack: 3, value: 2000,
    desc: 'A reel of pre-war film. Possibly a lost classic. Possibly a toothpaste commercial.',
    icon: 'trinket', tags: ['trinket'],
  },
  fine_wristwatch: {
    name: 'Fine Wristwatch', type: 'trinket', rarity: 'rare', weight: 0.2, stack: 3, value: 3000,
    desc: 'A luxury wristwatch, still ticking. Worth more than the Raider wearing it, and the Raider next to them.',
    icon: 'trinket', tags: ['trinket'],
  },
  flashy_duck: {
    name: 'Influencer Duck', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 15, value: 3000,
    desc: 'A sequined rubber duck with more followers than any Raider. Only photographed from its good side.',
    icon: 'trinket', tags: ['trinket'],
  },
  frosty_duck: {
    name: 'Brain Freeze Duck', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 15, value: 3000,
    desc: 'A frosted-blue rubber duck, cold to the touch. Squeezing it hurts your forehead somehow.',
    icon: 'trinket', tags: ['trinket'],
  },
  gentle_duck: {
    name: 'Emotional Support Duck', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 15, value: 1000,
    desc: 'A soft, smiling rubber duck. Listens to your extraction stories without judgment.',
    icon: 'trinket', tags: ['trinket'],
  },
  lantzs_mixtape_5th_edition: {
    name: 'Doc Reboot\'s Mixtape (Vol. 404)', type: 'trinket', rarity: 'epic', weight: 0.2, stack: 3, value: 10000,
    desc: 'Doc Reboot\'s favourite tracks, compiled from memory. Track list not found. Collectors adore it.',
    icon: 'trinket', tags: ['trinket'],
  },
  light_bulb: {
    name: 'Light Bulb', type: 'trinket', rarity: 'uncommon', weight: 0.2, stack: 3, value: 2000,
    desc: 'A working incandescent bulb. Somewhere, someone just had an idea.',
    icon: 'trinket', tags: ['trinket'],
  },
  mri_duck: {
    name: 'Second Opinion Duck', type: 'trinket', rarity: 'legendary', weight: 0.3, stack: 15, value: 10000,
    desc: 'A rubber duck printed with its own X-ray. Extremely rare. Diagnosis: still a duck.', icon: 'trinket', tags: ['trinket'],
  },
  music_album: {
    name: 'Music Album', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000,
    desc: 'A vinyl record in its sleeve. Sounds warmer than the apocalypse, which isn\'t hard.',
    icon: 'trinket', tags: ['trinket'],
  },
  music_box: {
    name: 'Music Box', type: 'trinket', rarity: 'rare', weight: 0.4, stack: 3, value: 5000,
    desc: 'A wind-up music box that still plays. Its tune will be stuck in your head for the whole raid.',
    icon: 'trinket', tags: ['trinket'],
  },
  painted_box: {
    name: 'Painted Box', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000,
    desc: 'A hand-painted wooden box. Contains a smaller box, then nothing at all. Very zen.',
    icon: 'trinket', tags: ['trinket'],
  },
  playing_cards: {
    name: 'Playing Cards', type: 'trinket', rarity: 'rare', weight: 0.2, stack: 3, value: 5000,
    desc: 'A complete deck of vintage playing cards. Every Raider claims to know a trick. None of them do.',
    icon: 'trinket', tags: ['trinket'],
  },
  poster_of_natural_wonders: {
    name: 'Poster Of Former Wonders', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000,
    desc: 'A poster of beautiful places that now belong to the ARK. Inspiring, in a sad sort of way.', icon: 'trinket', tags: ['trinket'],
  },
  pottery: {
    name: 'Pottery', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000,
    desc: 'A glazed clay pot. Handmade, slightly lopsided, priceless to exactly one person.',
    icon: 'trinket', tags: ['trinket'],
  },
  red_coral_jewelry: {
    name: 'Red Coral Jewelry', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 5000,
    desc: 'A necklace of polished red coral. Rarer now than the reef it came from, which says a lot.', icon: 'trinket', tags: ['trinket'],
  },
  rosary: {
    name: 'Rosary', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 2000,
    desc: 'A wooden rosary. Raiders hold one tight during extraction countdowns, just in case.',
    icon: 'trinket', tags: ['trinket'],
  },
  rubber_duck: {
    name: 'Rubber Duck', type: 'trinket', rarity: 'common', weight: 0.3, stack: 15, value: 1000,
    desc: 'A classic yellow rubber duck. Debugging companion. Has seen things.',
    icon: 'trinket', tags: ['trinket'],
  },
  sextant: {
    name: 'Sextant', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 5, value: 2000,
    desc: 'A navigator\'s sextant. Useless without stars, a map or the faintest idea where you are.',
    icon: 'trinket', tags: ['trinket'],
  },
  silver_teaspoon_set: {
    name: 'Silver Teaspoon Set', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000,
    desc: 'A boxed set of silver teaspoons. Somebody\'s wedding present, finally useful as currency.', icon: 'trinket', tags: ['trinket'],
  },
  statuette: {
    name: 'Statuette', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000,
    desc: 'A small porcelain statuette frozen mid-pose. One bump away from being called \'pieces\'.',
    icon: 'trinket', tags: ['trinket'],
  },
  tellurion: {
    name: 'Tellurion', type: 'trinket', rarity: 'epic', weight: 0.5, stack: 1, value: 7000,
    desc: 'A clockwork model of the sun, earth and moon. Shows the planet doing fine, which is a lie.', icon: 'trinket', tags: ['trinket'],
  },
  torn_book: {
    name: 'Torn Book', type: 'trinket', rarity: 'common', weight: 0.3, stack: 5, value: 1000,
    desc: 'A paperback missing half its pages. The half with the ending, naturally.', icon: 'trinket', tags: ['trinket'],
  },
  train_model: {
    name: 'Train Model', type: 'trinket', rarity: 'common', weight: 0.5, stack: 10, value: 1000,
    desc: 'A model locomotive. The only train in Desperanza that has ever run on time.',
    icon: 'trinket', tags: ['trinket'],
  },
  tropical_duck: {
    name: 'Staycation Duck', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 15, value: 1000,
    desc: 'A rubber duck in a tiny grass skirt. The closest anyone underground gets to a beach.', icon: 'trinket', tags: ['trinket'],
  },
  vase: {
    name: 'Vase', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000,
    desc: 'An intact decorative vase. Proof that something fragile survived all this.',
    icon: 'trinket', tags: ['trinket'],
  },
  very_comfortable_pillow: {
    name: 'Very Comfortable Pillow', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000,
    desc: 'It really is very comfortable. You will never use it. You will carry it home anyway. Nugget wants three.',
    icon: 'trinket', tags: ['trinket'],
  },
  vintage_steering_wheel: {
    name: 'Vintage Steering Wheel', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 5, value: 2000,
    desc: 'A wooden steering wheel from a classic car. Now all you need is the rest of the car.', icon: 'trinket', tags: ['trinket'],
  },

  // ======================================================================
  // Quest items
  // ======================================================================
  celestas_journal: {
    name: 'Auntie Synergy\'s Journal', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A page from Auntie Synergy\'s private journal. Mostly vision statements and passive-aggressive margin notes.',
    icon: 'quest', tags: ['quest'],
  },
  moisture_meter: {
    name: 'Moisture Meter', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Soil moisture probe for the Desperanza gardens. Reads \'dry\', which you could have told it.', icon: 'quest', tags: ['quest'],
  },
  nutrient_meter: {
    name: 'Nutrient Meter', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Soil nutrient tester for the Desperanza gardens. The soil isn\'t getting enough. Same, soil. Same.',
    icon: 'quest', tags: ['quest'],
  },
  lidar_scanner: {
    name: 'LiDAR Scanner', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A surveying LiDAR scanner. Maps rooms in 3D so you can see exactly how empty they are.',
    icon: 'quest', tags: ['quest'],
  },
  esr_analyzer: {
    name: 'ESR Analyzer', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'An electron spin resonance analyser. Spins electrons, resonates, analyses. That\'s the whole pitch.',
    icon: 'quest', tags: ['quest'],
  },
  old_world_books: {
    name: 'Old World Books', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A bundle of pre-war books for the library. Several are about investing. Hindsight is brutal.', icon: 'quest', tags: ['quest'],
  },
  possibly_toxic_plant: {
    name: 'Possibly Toxic Plant', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A plant sample that may or may not be toxic. Handle with gloves, or ideally someone else\'s hands.',
    icon: 'quest', tags: ['quest'],
  },
  espresso_machine_parts: {
    name: 'Espresso Machine Parts', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'Parts to fix the best coffee machine underground. Desperanza\'s entire morale is riding on this.',
    icon: 'quest', tags: ['quest'],
  },
  stack_of_movie_tapes: {
    name: 'Stack Of Movie Tapes', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Old movie tapes for movie night. Nobody can agree on what to watch, so nothing has changed.', icon: 'quest', tags: ['quest'],
  },
  dusty_film_reel: {
    name: 'Dusty Film Reel', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'A dusty film reel of unknown footage. Probably a training video. Probably about the ARK. Probably bad.',
    icon: 'quest', tags: ['quest'],
  },
  precision_gimbal: {
    name: 'Precision Gimbal', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'A camera gimbal with precision bearings. Keeps every shot steady, unlike your hands.', icon: 'quest', tags: ['quest'],
  },
  experimental_seed_sample: {
    name: 'Experimental Seed Sample', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A sealed vial of engineered seeds. Do not plant without a signed waiver and a long stick.', icon: 'quest', tags: ['quest'],
  },
  first_wave_compass: {
    name: 'Beta Test Compass', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A compass carried during the Beta Test. Still points north, which is more than the Beta Test ever did.',
    icon: 'quest', tags: ['quest'],
  },
  first_wave_rations: {
    name: 'Beta Test Rations', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'Ration packs from the Beta Test. Known issues include flavour, texture and the expiry date.', icon: 'quest', tags: ['quest'],
  },
  first_wave_tape: {
    name: 'Beta Test Tape', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'An audio tape recorded during the Beta Test. Mostly bug reports, delivered by shouting.', icon: 'quest', tags: ['quest'],
  },
  raider_flag: {
    name: 'Raider Flag', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A Raider flag to plant at a contested landmark. Claiming things is half of what Raiders do.', icon: 'quest', tags: ['quest'],
  },
  scout_patrol_note: {
    name: 'Scout Patrol Note', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Handwritten notes left by a scout patrol. Terrible handwriting, even worse news.', icon: 'quest', tags: ['quest'],
  },
  official_shutdown_documentation: {
    name: 'Official Shutdown Documentation', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Paperwork about an old facility shutdown. Forty pages, one signature, zero explanations.', icon: 'quest', tags: ['quest'],
  },

  // ======================================================================
  // Blueprints (bpWeight 1..10: higher = more common in loot)
  // ======================================================================
  angled_grip_ii_blueprint: {
    name: 'Angled Grip II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Diagrams drawn at a slight angle, on purpose. Bring it home to learn the Angled Grip II recipe (Gun Garage II).',
    icon: 'blueprint', tags: ['blueprint', 'mod'], blueprint: 'craft_angled_grip_ii', bpWeight: 7,
  },
  angled_grip_iii_blueprint: {
    name: 'Angled Grip III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Step 1 to 9: tilt. Step 10: profit. Bring it home to learn the Angled Grip III recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_angled_grip_iii', bpWeight: 6,
  },
  anvill_blueprint: {
    name: 'Paperweight Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Mostly instructions for holding things down. Bring it home to learn the Paperweight recipe (Gun Garage I).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_anvill', bpWeight: 7,
  },
  afelion_blueprint: {
    name: 'Solar Flair Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Smells faintly of sunscreen and ego. Bring it home to learn the Solar Flair recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_afelion', bpWeight: 3,
  },
  barricade_kit_blueprint: {
    name: 'Barricade Kit Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Flat-pack instructions, one page missing. Bring it home to learn the Barricade Kit recipe (Junk Drawer I).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_barricade_kit', bpWeight: 7,
  },
  betina_blueprint: {
    name: 'Big Betty Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Betty\'s measurements. Do not comment on them. Bring it home to learn the Big Betty recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_betina', bpWeight: 4,
  },
  blaze_grenade_blueprint: {
    name: 'Hot Mess Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'The whole recipe is \'make it worse\'. Bring it home to learn the Hot Mess recipe (Bad Idea Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_blaze_grenade', bpWeight: 6,
  },
  blue_light_stick_blueprint: {
    name: 'Blue Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'One page, mostly blue. Bring it home to learn the Blue Light Stick recipe (Junk Drawer I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_blue_light_stick', bpWeight: 8,
  },
  bobkat_blueprint: {
    name: 'Zoomies Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Sketched at 3 a.m., at high speed. Bring it home to learn the Zoomies recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_bobkat', bpWeight: 4,
  },
  burleta_blueprint: {
    name: 'Old Reliable Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Unchanged for decades, and proud of it. Bring it home to learn the Old Reliable recipe (Gun Garage I).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_burleta', bpWeight: 7,
  },
  canta_blueprint: {
    name: 'Karaoke Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Lyrics included. Nobody needs the lyrics. Bring it home to learn the Karaoke recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_canta', bpWeight: 5,
  },
  combat_mk_3_aggressive_blueprint: {
    name: 'Gym Bro Mk. 3 (Swole) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'A workout plan with a rig doodled in the margin. Bring it home to learn the Gym Bro Mk. 3 (Swole) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_combat_mk_3_aggressive', bpWeight: 4,
  },
  combat_mk_3_flanking_blueprint: {
    name: 'Gym Bro Mk. 3 (Side Hustle) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Scribbled on the back of a business card. Bring it home to learn the Gym Bro Mk. 3 (Side Hustle) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_combat_mk_3_flanking', bpWeight: 4,
  },
  compensator_ii_blueprint: {
    name: 'Compensator II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'A confident little sketch. Bring it home to learn the Compensator II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_compensator_ii', bpWeight: 7,
  },
  compensator_iii_blueprint: {
    name: 'Compensator III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Annotated \'not compensating\' three times. Bring it home to learn the Compensator III recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'mod'], blueprint: 'craft_compensator_iii', bpWeight: 6,
  },
  complex_gun_parts_blueprint: {
    name: 'Complex Gun Parts Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'It says \'complicated\' right on the cover. Bring it home to learn the Complex Gun Parts recipe (The Upcycler III).',
    icon: 'blueprint', tags: ['blueprint', 'material'], blueprint: 'craft_complex_gun_parts', bpWeight: 4,
  },
  dedline_blueprint: {
    name: 'Hard Deadline Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Due yesterday. Bring it home to learn the Hard Deadline recipe (Bad Idea Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_dedline', bpWeight: 4,
  },
  defibrillator_blueprint: {
    name: 'Defibrillator Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Step one: shout \'clear\'. Step two: mean it. Bring it home to learn the Defibrillator recipe (Medicine Cabinet II).',
    icon: 'blueprint', tags: ['blueprint', 'consumable'], blueprint: 'craft_defibrillator', bpWeight: 6,
  },
  dolabre_blueprint: {
    name: 'Hair Dryer Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Do not read near water. Bring it home to learn the Hair Dryer recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_dolabre', bpWeight: 3,
  },
  equaliser_blueprint: {
    name: 'Hostile Takeover Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Stamped \'confidential\' on every page. Bring it home to learn the Hostile Takeover recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_equaliser', bpWeight: 3,
  },
  explosive_mine_blueprint: {
    name: 'Explosive Mine Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'The last page is suspiciously scorched. Bring it home to learn the Explosive Mine recipe (Bad Idea Bench III).',
    icon: 'blueprint', tags: ['blueprint', 'trap'], blueprint: 'craft_explosive_mine', bpWeight: 6,
  },
  extended_barrel_ii_blueprint: {
    name: 'Extended Barrel II Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Needed a longer sheet of paper. Bring it home to learn the Extended Barrel II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_barrel_ii', bpWeight: 6,
  },
  extended_barrel_iii_blueprint: {
    name: 'Extended Barrel III Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Continued on the back. And the back of that. Bring it home to learn the Extended Barrel III recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'mod'], blueprint: 'craft_extended_barrel_iii', bpWeight: 4,
  },
  extended_light_mag_ii_blueprint: {
    name: 'Extended Light Mag II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'More bullets, explained simply. Bring it home to learn the Extended Light Mag II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_light_mag_ii', bpWeight: 7,
  },
  extended_light_mag_iii_blueprint: {
    name: 'Extended Light Mag III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Even more bullets, explained loudly. Bring it home to learn the Extended Light Mag III recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'mod'], blueprint: 'craft_extended_light_mag_iii', bpWeight: 6,
  },
  extended_medium_mag_ii_blueprint: {
    name: 'Extended Medium Mag II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'A medium amount of extra detail. Bring it home to learn the Extended Medium Mag II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_medium_mag_ii', bpWeight: 7,
  },
  extended_medium_mag_iii_blueprint: {
    name: 'Extended Medium Mag III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Now with an appendix. Bring it home to learn the Extended Medium Mag III recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_medium_mag_iii', bpWeight: 6,
  },
  extended_shotgun_mag_ii_blueprint: {
    name: 'Extended Shotgun Mag II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Shells drawn to scale, then some. Bring it home to learn the Extended Shotgun Mag II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_shotgun_mag_ii', bpWeight: 7,
  },
  extended_shotgun_mag_iii_blueprint: {
    name: 'Extended Shotgun Mag III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Twice the shells, twice the paperwork. Bring it home to learn the Extended Shotgun Mag III recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'mod'], blueprint: 'craft_extended_shotgun_mag_iii', bpWeight: 6,
  },
  fireworks_box_blueprint: {
    name: 'Fireworks Box Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Signed by Kaboomer with a little smiley face. Bring it home to learn the Fireworks Box recipe (Bad Idea Bench II).',
    icon: 'blueprint', tags: ['blueprint', 'gadget'], blueprint: 'craft_fireworks_box', bpWeight: 6,
  },
  gas_mine_blueprint: {
    name: 'Gas Mine Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Smells exactly like you\'d expect. Bring it home to learn the Gas Mine recipe (Bad Idea Bench I).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_gas_mine', bpWeight: 8,
  },
  green_light_stick_blueprint: {
    name: 'Green Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Folded into a little green frog. Bring it home to learn the Green Light Stick recipe (Junk Drawer I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_green_light_stick', bpWeight: 8,
  },
  heavy_gun_parts_blueprint: {
    name: 'Heavy Gun Parts Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Weighs more than paper reasonably should. Bring it home to learn the Heavy Gun Parts recipe (The Upcycler II).',
    icon: 'blueprint', tags: ['blueprint', 'material'], blueprint: 'craft_heavy_gun_parts', bpWeight: 6,
  },
  hullkracker_blueprint: {
    name: 'Can Opener Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Left-handed edition, finally. Bring it home to learn the Can Opener recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'weapon'], blueprint: 'craft_hullkracker', bpWeight: 4,
  },
  el_torro_blueprint: {
    name: 'Bull Market Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Projected returns: nine pellets per shell. Bring it home to learn the Bull Market recipe (Gun Garage I).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_el_torro', bpWeight: 7,
  },
  jolt_mine_blueprint: {
    name: 'Shock Value Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Touch the diagram and find out. Bring it home to learn the Shock Value recipe (Bad Idea Bench II).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_jolt_mine', bpWeight: 6,
  },
  jupitor_blueprint: {
    name: 'Gas Giant Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Large format. Very, very large. Bring it home to learn the Gas Giant recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_jupitor', bpWeight: 3,
  },
  light_gun_parts_blueprint: {
    name: 'Light Gun Parts Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Small print for small parts. Bring it home to learn the Light Gun Parts recipe (The Upcycler II).', icon: 'blueprint',
    tags: ['blueprint', 'material'], blueprint: 'craft_light_gun_parts', bpWeight: 6,
  },
  lightweight_stock_blueprint: {
    name: 'Lightweight Stock Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Printed on very thin paper to save weight. Bring it home to learn the Lightweight Stock recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'mod'], blueprint: 'craft_lightweight_stock', bpWeight: 4,
  },
  looting_mk_3_safekeeper_blueprint: {
    name: 'Hoarder Mk. 3 (Squirrel) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Buried in a yard for safekeeping, then forgotten. Bring it home to learn the Hoarder Mk. 3 (Squirrel) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_looting_mk_3_safekeeper', bpWeight: 4,
  },
  looting_mk_3_survivor_blueprint: {
    name: 'Hoarder Mk. 3 (Cockroach) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Survived a fire, a flood and a stash wipe. Bring it home to learn the Hoarder Mk. 3 (Cockroach) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_looting_mk_3_survivor', bpWeight: 4,
  },
  lure_grenade_blueprint: {
    name: 'Clickbait Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Number 7 will shock you. Bring it home to learn the Clickbait recipe (Junk Drawer II).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_lure_grenade', bpWeight: 7,
  },
  medium_gun_parts_blueprint: {
    name: 'Medium Gun Parts Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Not too long, not too short. Just right. Bring it home to learn the Medium Gun Parts recipe (The Upcycler II).',
    icon: 'blueprint', tags: ['blueprint', 'material'], blueprint: 'craft_medium_gun_parts', bpWeight: 6,
  },
  muzzle_brake_ii_blueprint: {
    name: 'Muzzle Brake II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'A thorough guide to slowing down. Bring it home to learn the Muzzle Brake II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_muzzle_brake_ii', bpWeight: 7,
  },
  muzzle_brake_iii_blueprint: {
    name: 'Muzzle Brake III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Footnote: brake harder. Bring it home to learn the Muzzle Brake III recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_muzzle_brake_iii', bpWeight: 6,
  },
  ospray_blueprint: {
    name: 'Birdwatcher Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Comes with a field guide to Raiders. Bring it home to learn the Birdwatcher recipe (Gun Garage II).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_ospray', bpWeight: 5,
  },
  padded_stock_blueprint: {
    name: 'Padded Stock Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Upholstery instructions included. Bring it home to learn the Padded Stock recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'mod'],
    blueprint: 'craft_padded_stock', bpWeight: 4,
  },
  powered_descender_blueprint: {
    name: 'Golden Parachute Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Reserved for executives. Until now. Bring it home to learn the Golden Parachute recipe (Junk Drawer III).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_powered_descender', bpWeight: 4,
  },
  pulse_mine_blueprint: {
    name: 'Personal Space Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Keep this blueprint at arm\'s length. Bring it home to learn the Personal Space recipe (Bad Idea Bench I).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_pulse_mine', bpWeight: 7,
  },
  raskal_blueprint: {
    name: 'Party Popper Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'No RSVP required. Bring it home to learn the Party Popper recipe (Gun Garage II).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_raskal', bpWeight: 5,
  },
  red_light_stick_blueprint: {
    name: 'Red Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Red ink, used for good for once. Bring it home to learn the Red Light Stick recipe (Junk Drawer I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_red_light_stick', bpWeight: 8,
  },
  remote_raider_flare_blueprint: {
    name: 'Cry For Help Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'How to ask nicely, from far away. Bring it home to learn the Cry For Help recipe (Junk Drawer I).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_remote_raider_flare', bpWeight: 8,
  },
  seeker_grenade_blueprint: {
    name: 'Job Seeker Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Formatted like a CV. Bring it home to learn the Job Seeker recipe (Bad Idea Bench I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_seeker_grenade', bpWeight: 7,
  },
  shotgun_choke_ii_blueprint: {
    name: 'Shotgun Choke II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'A tighter read than the first edition. Bring it home to learn the Shotgun Choke II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_shotgun_choke_ii', bpWeight: 7,
  },
  shotgun_choke_iii_blueprint: {
    name: 'Shotgun Choke III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'The tightest prose in Desperanza. Bring it home to learn the Shotgun Choke III recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_shotgun_choke_iii', bpWeight: 6,
  },
  shotgun_silencer_blueprint: {
    name: 'Shotgun Silencer Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Typed in a whisper. Bring it home to learn the Shotgun Silencer recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_shotgun_silencer', bpWeight: 4,
  },
  showstoppa_blueprint: {
    name: 'Blue Screen Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Please restart your blueprint. Bring it home to learn the Blue Screen recipe (Bad Idea Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_showstoppa', bpWeight: 6,
  },
  silencer_i_blueprint: {
    name: 'Silencer I Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Shh. Read it silently. Bring it home to learn the Silencer I recipe (Gun Garage II).',
    icon: 'blueprint', tags: ['blueprint', 'mod'],
    blueprint: 'craft_silencer_i', bpWeight: 7,
  },
  silencer_ii_blueprint: {
    name: 'Silencer II Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Even the diagrams are quiet. Bring it home to learn the Silencer II recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'mod'],
    blueprint: 'craft_silencer_ii', bpWeight: 6,
  },
  smoke_grenade_blueprint: {
    name: 'Smoke Grenade Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Hard to read through all the haze. Bring it home to learn the Smoke Grenade recipe (Junk Drawer II).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_smoke_grenade', bpWeight: 6,
  },
  snap_hook_blueprint: {
    name: 'Social Climber Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Networking tips on the back. Bring it home to learn the Social Climber recipe (Junk Drawer III).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_snap_hook', bpWeight: 3,
  },
  stable_stock_ii_blueprint: {
    name: 'Stable Stock II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Calm, measured instructions. Bring it home to learn the Stable Stock II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_stable_stock_ii', bpWeight: 7,
  },
  stable_stock_iii_blueprint: {
    name: 'Stable Stock III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Includes breathing exercises. Bring it home to learn the Stable Stock III recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_stable_stock_iii', bpWeight: 6,
  },
  surge_coil_blueprint: {
    name: 'Bug Zapper Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'The warning label is mostly lightning bolts. Bring it home to learn the Bug Zapper recipe (Bad Idea Bench III).',
    icon: 'blueprint', tags: ['blueprint', 'gadget'], blueprint: 'craft_surge_coil', bpWeight: 6,
  },
  tactical_mk_3_defensive_blueprint: {
    name: 'Overthinker Mk. 3 (Worst Case) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Includes 40 contingency plans. Bring it home to learn the Overthinker Mk. 3 (Worst Case) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_defensive', bpWeight: 4,
  },
  tactical_mk_3_healing_blueprint: {
    name: 'Overthinker Mk. 3 (Self-Care) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Best read in a warm bath. Bring it home to learn the Overthinker Mk. 3 (Self-Care) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_healing', bpWeight: 4,
  },
  tactical_mk_3_revival_blueprint: {
    name: 'Overthinker Mk. 3 (Rebrand) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Same old rig, shiny new logo. Bring it home to learn the Overthinker Mk. 3 (Rebrand) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_revival', bpWeight: 4,
  },
  tactical_mk_3_smoke_blueprint: {
    name: 'Overthinker Mk. 3 (Ghosting) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'The last page left you on read. Bring it home to learn the Overthinker Mk. 3 (Ghosting) recipe (Sewing Circle III).',
    icon: 'blueprint', tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_smoke', bpWeight: 4,
  },
  tagging_grenade_blueprint: {
    name: 'Tag, You\'re It Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'You\'re it now. Bring it home to learn the Tag, You\'re It recipe (Junk Drawer III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_tagging_grenade', bpWeight: 6,
  },
  tempesta_blueprint: {
    name: 'Light Drizzle Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Slightly damp. Bring it home to learn the Light Drizzle recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_tempesta', bpWeight: 4,
  },
  torrento_blueprint: {
    name: 'Firehose Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Mostly a diagram of a very long belt. Bring it home to learn the Firehose recipe (Gun Garage II).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_torrento', bpWeight: 5,
  },
  trailblazr_blueprint: {
    name: 'Hot Gossip Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Pass it on. Everyone does. Bring it home to learn the Hot Gossip recipe (Bad Idea Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_trailblazr', bpWeight: 6,
  },
  trigga_nade_blueprint: {
    name: 'Remote Work Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Can be read from home. Bring it home to learn the Remote Work recipe (Bad Idea Bench II).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_trigga_nade', bpWeight: 6,
  },
  venattor_blueprint: {
    name: 'BOGO Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Two-for-one on every page. Bring it home to learn the BOGO recipe (Gun Garage II).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_venattor', bpWeight: 5,
  },
  vertical_grip_ii_blueprint: {
    name: 'Vertical Grip II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Drawn top to bottom, naturally. Bring it home to learn the Vertical Grip II recipe (Gun Garage II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_vertical_grip_ii', bpWeight: 7,
  },
  vertical_grip_iii_blueprint: {
    name: 'Vertical Grip III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'The firmest handshake on paper. Bring it home to learn the Vertical Grip III recipe (Gun Garage III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_vertical_grip_iii', bpWeight: 6,
  },
  vyta_shot_blueprint: {
    name: 'Wellness Shot Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Endorsed by nobody qualified. Bring it home to learn the Wellness Shot recipe (Medicine Cabinet III).', icon: 'blueprint',
    tags: ['blueprint', 'consumable'], blueprint: 'craft_vyta_shot', bpWeight: 6,
  },
  vyta_spray_blueprint: {
    name: 'Wellness Mist Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Spritz responsibly. Bring it home to learn the Wellness Mist recipe (Medicine Cabinet III).', icon: 'blueprint',
    tags: ['blueprint', 'consumable'], blueprint: 'craft_vyta_spray', bpWeight: 4,
  },
  volcano_blueprint: {
    name: 'Lava Lamp Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'The diagrams slowly drift up and down. Bring it home to learn the Lava Lamp recipe (Gun Garage III).',
    icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_volcano', bpWeight: 4,
  },
  white_flag_blueprint: {
    name: 'White Flag Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'It\'s just a drawing of a flag. Still counts. Bring it home to learn the White Flag recipe (Medicine Cabinet I).',
    icon: 'blueprint', tags: ['blueprint', 'gadget'], blueprint: 'craft_white_flag', bpWeight: 8,
  },
  wulfpack_blueprint: {
    name: 'Reply-All Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Copied to everyone, unfortunately. Bring it home to learn the Reply-All recipe (Bad Idea Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_wulfpack', bpWeight: 4,
  },
  yellow_light_stick_blueprint: {
    name: 'Yellow Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Every line highlighted in yellow. Bring it home to learn the Yellow Light Stick recipe (Junk Drawer I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_yellow_light_stick', bpWeight: 8,
  },
};
