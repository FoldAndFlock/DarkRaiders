// AUTO-AUTHORED CONTENT TABLE - DarkRaiders (patterned after ARC Raiders 1.0; names lightly tweaked).
// Pure data: no imports, no DOM. See docs/ARCHITECTURE.md for the schema and docs/research/items_notes.md for sources.

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
    desc: 'Light rounds for pistols, SMGs and light rifles. Barely scratches ARK plating.', icon: 'ammoLight', tags: ['ammo'],
    ammo: { per: 1 },
  },
  ammo_medium: {
    name: 'Medium Ammo', type: 'ammo', rarity: 'common', weight: 0.025, stack: 80, value: 6,
    desc: 'Intermediate rifle rounds. The workhorse calibre of the surface.', icon: 'ammo_medium', tags: ['ammo'], ammo: { per: 1 },
  },
  ammo_heavy: {
    name: 'Heavy Ammo', type: 'ammo', rarity: 'common', weight: 0.05, stack: 60, value: 12,
    desc: 'Full-power rounds that punch through ARK armour.', icon: 'ammo_heavy', tags: ['ammo'], ammo: { per: 1 },
  },
  ammo_shotgun: {
    name: 'Shotgun Ammo', type: 'ammo', rarity: 'common', weight: 0.085, stack: 20, value: 20,
    desc: 'Buckshot shells. Devastating up close, useless at range.', icon: 'ammo_shotgun', tags: ['ammo'], ammo: { per: 1 },
  },
  ammo_energy: {
    name: 'Energy Clip', type: 'ammo', rarity: 'rare', weight: 0.3, stack: 5, value: 200,
    desc: 'Charge cell for experimental energy weapons. One clip fully recharges a weapon.', icon: 'ammo_energy', tags: ['ammo'],
    ammo: { per: 1, refillsMag: true },
  },
  ammo_launcher: {
    name: 'Launcher Ammo', type: 'ammo', rarity: 'rare', weight: 0.1, stack: 24, value: 250,
    desc: 'Anti-ARK payloads that only detonate on machines.', icon: 'ammo_launcher', tags: ['ammo'], ammo: { per: 1 },
  },

  // ======================================================================
  // Weapons
  // ======================================================================
  kettel: {
    name: 'Kettel', type: 'weapon', rarity: 'common', weight: 7, stack: 1, value: 840,
    desc: 'Cheap semi-auto rifle in light calibre. Quick follow-up shots, weak against ARK plating.', icon: 'gun_rifle',
    recycle: { metal_parts: 3, rubber_parts: 2 }, tags: ['assault_rifle', 'ammo_light'],
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
    name: 'Rattlr', type: 'weapon', rarity: 'common', weight: 6, stack: 1, value: 1750,
    desc: 'Inexpensive full-auto rifle. Solid at medium range, but it reloads two rounds at a time.', icon: 'gun_rifle',
    recycle: { metal_parts: 8 }, tags: ['assault_rifle', 'ammo_medium'],
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
    name: 'Arpeggo', type: 'weapon', rarity: 'uncommon', weight: 7, stack: 1, value: 5500,
    desc: 'Three-round-burst rifle. Rewards rhythm and accuracy at medium range.', icon: 'gun_rifle',
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
    name: 'Tempesta', type: 'weapon', rarity: 'epic', weight: 11, stack: 1, value: 13000,
    desc: 'Full-auto medium rifle with a deep magazine and steady, predictable recoil.', icon: 'gun_rifle',
    recycle: { advanced_mechanical_components: 2, medium_gun_parts: 2 }, tags: ['assault_rifle', 'ammo_medium'],
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
    name: 'Betina', type: 'weapon', rarity: 'epic', weight: 11, stack: 1, value: 8000,
    desc: 'Heavy-calibre assault rifle. Slow cadence and a long reload, but every round bites through armour.', icon: 'gun_rifle',
    recycle: { advanced_mechanical_components: 1, heavy_gun_parts: 2 }, tags: ['assault_rifle', 'ammo_heavy'],
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
    name: 'Ferrox', type: 'weapon', rarity: 'common', weight: 8, stack: 1, value: 475,
    desc: 'Break-action single-shot rifle. One heavy round, then a reload. Make it count.', icon: 'gun_rifle',
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
    name: 'Renegayde', type: 'weapon', rarity: 'rare', weight: 10, stack: 1, value: 7000,
    desc: 'Lever-action rifle loaded round by round. Pinpoint accurate when crouched and still.', icon: 'gun_rifle',
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
    name: 'Afelion', type: 'weapon', rarity: 'legendary', weight: 10, stack: 1, value: 27500,
    desc: 'Experimental two-round-burst energy rifle firing high-velocity bolts. Cannot be upgraded.', icon: 'gun_energy',
    recycle: { magnetic_accelerator: 2, complex_gun_parts: 1 }, tags: ['battle_rifle', 'ammo_energy', 'experimental'],
    weapon: {
      class: 'battle_rifle', ammo: 'ammo_energy', dmg: 30, rpm: 600, mag: 10, reload: 3.5, range: 55, spread: 2.5, adsSpread: 0.5,
      recoil: 0.6, projSpeed: 420, pellets: 1, mode: 'burst', burst: 2, burstDelay: 0.45, armorPen: 0.6, headMul: 2, noise: 49,
      moveMul: 0.908, handling: 0.39, durability: 1130, slots: ['underbarrel', 'stock'], tiers: [],
    },
  },
  stitchr: {
    name: 'Stitchr', type: 'weapon', rarity: 'common', weight: 5, stack: 1, value: 800,
    desc: 'Light-ammo SMG that stitches targets at close range. Bucks hard on long sprays.', icon: 'gun_smg',
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
    name: 'Canta', type: 'weapon', rarity: 'rare', weight: 4, stack: 1, value: 7000,
    desc: 'Medium-calibre SMG with a blistering cycle rate and real stopping power.', icon: 'gun_smg',
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
    name: 'Bobkat', type: 'weapon', rarity: 'epic', weight: 7, stack: 1, value: 13000,
    desc: 'Extremely fast-firing SMG. Wild spread, terrifying up close.', icon: 'gun_smg',
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
    name: 'El Torro', type: 'weapon', rarity: 'uncommon', weight: 8, stack: 1, value: 5000,
    desc: 'Pump-action shotgun loaded shell by shell. Two or three hits drop most Raiders.', icon: 'gun_shotgun',
    recycle: { mechanical_components: 2, simple_gun_parts: 2 }, tags: ['shotgun', 'ammo_shotgun'],
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
    name: 'Volcano', type: 'weapon', rarity: 'epic', weight: 8, stack: 1, value: 10000,
    desc: 'Semi-auto shotgun with a tighter pattern and a quick trigger. Sharp damage falloff.', icon: 'gun_shotgun',
    recycle: { advanced_mechanical_components: 2, heavy_gun_parts: 2 }, tags: ['shotgun', 'ammo_shotgun'],
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
    name: 'Dolabre', type: 'weapon', rarity: 'legendary', weight: 8, stack: 1, value: 27500,
    desc: 'Experimental energy shotgun: a wide heat blast from the hip, or hold to focus a long-range beam. Cannot be upgraded.',
    icon: 'gun_energy', recycle: { magnetic_accelerator: 2 }, tags: ['shotgun', 'ammo_energy', 'experimental'],
    weapon: {
      class: 'shotgun', ammo: 'ammo_energy', dmg: 12, rpm: 120, mag: 8, reload: 3.3, range: 14, spread: 10, adsSpread: 1, recoil: 1,
      projSpeed: 250, pellets: 5, mode: 'charge', chargeTime: 0.6, armorPen: 0.6, headMul: 1, noise: 59, moveMul: 0.925, handling: 0.5,
      durability: 500, slots: [], chargedDmg: 50, chargedRange: 60, tiers: [],
    },
  },
  hairpyn: {
    name: 'Hairpyn', type: 'weapon', rarity: 'common', weight: 3, stack: 1, value: 450,
    desc: 'Slide-action pistol with an integrated silencer. Quiet, accurate and slow.', icon: 'gun_pistol',
    recycle: { metal_parts: 2, rubber_parts: 1 }, tags: ['pistol', 'ammo_light'],
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
    name: 'Burleta', type: 'weapon', rarity: 'uncommon', weight: 4, stack: 1, value: 2900,
    desc: 'Dependable semi-auto pistol with decent damage and accuracy.', icon: 'gun_pistol',
    recycle: { mechanical_components: 1, simple_gun_parts: 2 }, tags: ['pistol', 'ammo_light'],
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
    name: 'Venattor', type: 'weapon', rarity: 'rare', weight: 5, stack: 1, value: 7000,
    desc: 'Semi-auto pistol that fires two projectiles per pull while spending a single round.', icon: 'gun_pistol',
    recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['pistol', 'ammo_medium'],
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
    name: 'Anvill', type: 'weapon', rarity: 'uncommon', weight: 5, stack: 1, value: 5000,
    desc: 'Single-action hand cannon. Huge damage and headshot multiplier, clumsy handling.', icon: 'gun_pistol',
    recycle: { mechanical_components: 2, simple_gun_parts: 2 }, tags: ['pistol', 'ammo_heavy'],
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
    name: 'Torrento', type: 'weapon', rarity: 'rare', weight: 12, stack: 1, value: 7000,
    desc: 'Belt-fed LMG with an enormous magazine. Only truly accurate while crouched.', icon: 'gun_lmg',
    recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['lmg', 'ammo_medium'],
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
    name: 'Ospray', type: 'weapon', rarity: 'rare', weight: 7, stack: 1, value: 7000,
    desc: 'Scoped bolt-action rifle with reliable damage and pinpoint accuracy.', icon: 'gun_sniper',
    recycle: { advanced_mechanical_components: 1, medium_gun_parts: 2 }, tags: ['sniper', 'ammo_medium'],
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
    name: 'Jupitor', type: 'weapon', rarity: 'legendary', weight: 9, stack: 1, value: 27500,
    desc: 'Experimental bolt-action energy sniper. Exceptional damage and accuracy, slow handling. Cannot be upgraded.',
    icon: 'gun_energy', recycle: { magnetic_accelerator: 2, complex_gun_parts: 1 }, tags: ['sniper', 'ammo_energy', 'experimental'],
    weapon: {
      class: 'sniper', ammo: 'ammo_energy', dmg: 75, rpm: 35, mag: 5, reload: 3.2, range: 90, spread: 6, adsSpread: 0.15, recoil: 1.32,
      projSpeed: 550, pellets: 1, mode: 'bolt', armorPen: 0.85, headMul: 2, noise: 56, moveMul: 0.909, handling: 0.39, durability: 222,
      slots: [], tiers: [],
    },
  },
  raskal: {
    name: 'Raskal', type: 'weapon', rarity: 'rare', weight: 4, stack: 1, value: 7000,
    desc: 'Break-action launcher. Its anti-ARK payloads only detonate on machines.', icon: 'gun_launcher',
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
    name: 'Hullkracker', type: 'weapon', rarity: 'epic', weight: 7, stack: 1, value: 10000,
    desc: 'Pump-action launcher holding five anti-ARK shells that only detonate on machines.', icon: 'gun_launcher',
    recycle: { advanced_mechanical_components: 2, heavy_gun_parts: 2 }, tags: ['launcher', 'ammo_launcher'],
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
    name: 'Equaliser', type: 'weapon', rarity: 'legendary', weight: 14, stack: 1, value: 27500,
    desc: 'Experimental high-capacity beam rifle that melts through ARK armour. Cannot be upgraded.', icon: 'gun_energy',
    recycle: { magnetic_accelerator: 2, complex_gun_parts: 1 }, tags: ['energy', 'ammo_energy', 'experimental'],
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
    desc: 'Underbarrel grip that tames side-to-side kick (tighter spread). Tier I.', icon: 'mod_grip', recycle: { plastic_parts: 6 },
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
    desc: 'Underbarrel grip that tames side-to-side kick (tighter spread). Tier II.', icon: 'mod_grip',
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
    desc: 'Underbarrel grip that tames side-to-side kick (tighter spread). Tier III.', icon: 'mod_grip',
    recycle: { mod_components: 1, duct_tape: 2 }, tags: ['mod', 'underbarrel'],
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
    name: 'Anvill Splitter', type: 'mod', rarity: 'legendary', weight: 0.5, stack: 1, value: 7000,
    desc: 'Tech mod for the Anvill: each round splits into four weaker projectiles.', icon: 'mod_tech',
    recycle: { mod_components: 1, processor: 1 }, tags: ['mod', 'tech'],
    mod: { slot: 'tech', fits: ['pistol'], weapons: ['anvill'], stats: { pellets: 4, dmg: 0.3 } },
  },
  compensator_i: {
    name: 'Compensator I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Muzzle device that tightens per-shot dispersion. Tier I.', icon: 'mod_muzzle', recycle: { metal_parts: 5 },
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
    desc: 'Muzzle device that tightens per-shot dispersion. Tier II.', icon: 'mod_muzzle',
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
    desc: 'Muzzle device that tightens per-shot dispersion. Tier III.', icon: 'mod_muzzle', recycle: { mod_components: 1, wires: 2 },
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
    desc: 'Longer barrel: faster bullets and longer range before falloff. Tier I.', icon: 'mod_muzzle', recycle: { metal_parts: 5 },
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
    desc: 'Longer barrel: faster bullets and longer range before falloff. Tier II.', icon: 'mod_muzzle',
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
    desc: 'Longer barrel: faster bullets and longer range before falloff. Tier III.', icon: 'mod_muzzle',
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
    desc: 'Larger magazine for light-ammo weapons. Tier I.', icon: 'mod_mag', recycle: { plastic_parts: 6 }, tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'pistol', 'smg'], weapons: ['kettel', 'stitchr', 'bobkat', 'hairpyn', 'burleta'],
      stats: { mag: 1.25 },
    },
  },
  extended_light_mag_ii: {
    name: 'Extended Light Mag II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Larger magazine for light-ammo weapons. Tier II.', icon: 'mod_mag', recycle: { mechanical_components: 1, steel_spring: 1 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'pistol', 'smg'], weapons: ['kettel', 'stitchr', 'bobkat', 'hairpyn', 'burleta'],
      stats: { mag: 1.5 },
    },
  },
  extended_light_mag_iii: {
    name: 'Extended Light Mag III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Larger magazine for light-ammo weapons. Tier III.', icon: 'mod_mag', recycle: { mod_components: 1, steel_spring: 2 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'pistol', 'smg'], weapons: ['kettel', 'stitchr', 'bobkat', 'hairpyn', 'burleta'],
      stats: { mag: 1.75 },
    },
  },
  extended_medium_mag_i: {
    name: 'Extended Medium Mag I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Larger magazine for medium-ammo weapons. Tier I.', icon: 'mod_mag', recycle: { plastic_parts: 6 }, tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: ['arpeggo', 'tempesta', 'renegayde', 'canta', 'venattor', 'torrento', 'ospray'], stats: { mag: 1.2 },
    },
  },
  extended_medium_mag_ii: {
    name: 'Extended Medium Mag II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Larger magazine for medium-ammo weapons. Tier II.', icon: 'mod_mag', recycle: { mechanical_components: 1, steel_spring: 1 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: ['arpeggo', 'tempesta', 'renegayde', 'canta', 'venattor', 'torrento', 'ospray'], stats: { mag: 1.4 },
    },
  },
  extended_medium_mag_iii: {
    name: 'Extended Medium Mag III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Larger magazine for medium-ammo weapons. Tier III.', icon: 'mod_mag', recycle: { mod_components: 1, steel_spring: 2 },
    tags: ['mod', 'mag'],
    mod: {
      slot: 'mag', fits: ['assault_rifle', 'battle_rifle', 'lmg', 'pistol', 'smg', 'sniper'],
      weapons: ['arpeggo', 'tempesta', 'renegayde', 'canta', 'venattor', 'torrento', 'ospray'], stats: { mag: 1.6 },
    },
  },
  extended_shotgun_mag_i: {
    name: 'Extended Shotgun Mag I', type: 'mod', rarity: 'common', weight: 0.25, stack: 1, value: 640,
    desc: 'Extra shell capacity for shotguns. Tier I.', icon: 'mod_mag', recycle: { plastic_parts: 6 }, tags: ['mod', 'mag'],
    mod: { slot: 'mag', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { mag: 1.35 } },
  },
  extended_shotgun_mag_ii: {
    name: 'Extended Shotgun Mag II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Extra shell capacity for shotguns. Tier II.', icon: 'mod_mag', recycle: { mechanical_components: 1, steel_spring: 1 },
    tags: ['mod', 'mag'], mod: { slot: 'mag', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { mag: 1.7 } },
  },
  extended_shotgun_mag_iii: {
    name: 'Extended Shotgun Mag III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Extra shell capacity for shotguns. Tier III.', icon: 'mod_mag', recycle: { mod_components: 1, steel_spring: 2 },
    tags: ['mod', 'mag'], mod: { slot: 'mag', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { mag: 2 } },
  },
  horizontal_grip: {
    name: 'Horizontal Grip', type: 'mod', rarity: 'epic', weight: 0.5, stack: 1, value: 7000,
    desc: 'Balanced grip that cuts both recoil and spread, at the cost of slower aiming.', icon: 'mod_grip',
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
    name: 'Kinetic Converter', type: 'mod', rarity: 'legendary', weight: 0.75, stack: 1, value: 7000,
    desc: 'Legendary stock that raises fire rate at the cost of control.', icon: 'mod_stock',
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
    desc: 'Skeleton stock: lightning-fast aim and draw, but much more recoil.', icon: 'mod_stock',
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
    desc: 'Muzzle device that reduces recoil in every direction. Tier I.', icon: 'mod_muzzle', recycle: { metal_parts: 5 },
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
    desc: 'Muzzle device that reduces recoil in every direction. Tier II.', icon: 'mod_muzzle',
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
    desc: 'Muzzle device that reduces recoil in every direction. Tier III.', icon: 'mod_muzzle',
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
    desc: 'Heavy stock that greatly improves stability; slower to draw and aim.', icon: 'mod_stock',
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
    desc: 'Choke that narrows a shotgun\'s pellet pattern. Tier I.', icon: 'mod_muzzle', recycle: { metal_parts: 5 },
    tags: ['mod', 'muzzle'], mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { spread: 0.9 } },
  },
  shotgun_choke_ii: {
    name: 'Shotgun Choke II', type: 'mod', rarity: 'uncommon', weight: 0.5, stack: 1, value: 2000,
    desc: 'Choke that narrows a shotgun\'s pellet pattern. Tier II.', icon: 'mod_muzzle',
    recycle: { mechanical_components: 1, wires: 1 }, tags: ['mod', 'muzzle'],
    mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { spread: 0.8 } },
  },
  shotgun_choke_iii: {
    name: 'Shotgun Choke III', type: 'mod', rarity: 'rare', weight: 0.75, stack: 1, value: 5000,
    desc: 'Choke that narrows a shotgun\'s pellet pattern. Tier III.', icon: 'mod_muzzle', recycle: { mod_components: 1, wires: 2 },
    tags: ['mod', 'muzzle'],
    mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { spread: 0.7, durabilityBurn: 1.2 } },
  },
  shotgun_silencer: {
    name: 'Shotgun Silencer', type: 'mod', rarity: 'epic', weight: 0.5, stack: 1, value: 5000,
    desc: 'Suppressor for shotguns. Halves firing noise.', icon: 'mod_muzzle', recycle: { mod_components: 1, wires: 1 },
    tags: ['mod', 'muzzle'], mod: { slot: 'muzzle', fits: ['shotgun'], weapons: ['el_torro', 'volcano'], stats: { noise: 0.5 } },
  },
  silencer_i: {
    name: 'Silencer I', type: 'mod', rarity: 'uncommon', weight: 0.25, stack: 1, value: 2000,
    desc: 'Suppressor that shrinks the radius at which shots are heard. Tier I.', icon: 'mod_muzzle',
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
    desc: 'Suppressor that shrinks the radius at which shots are heard. Tier II.', icon: 'mod_muzzle',
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
    desc: 'Suppressor that shrinks the radius at which shots are heard. Tier III.', icon: 'mod_muzzle',
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
    desc: 'Stock that speeds up recoil and dispersion recovery. Tier I.', icon: 'mod_stock', recycle: { rubber_parts: 6 },
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
    desc: 'Stock that speeds up recoil and dispersion recovery. Tier II.', icon: 'mod_stock',
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
    desc: 'Stock that speeds up recoil and dispersion recovery. Tier III.', icon: 'mod_stock',
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
    desc: 'Underbarrel grip that reduces muzzle climb (less recoil). Tier I.', icon: 'mod_grip', recycle: { plastic_parts: 6 },
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
    desc: 'Underbarrel grip that reduces muzzle climb (less recoil). Tier II.', icon: 'mod_grip',
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
    desc: 'Underbarrel grip that reduces muzzle climb (less recoil). Tier III.', icon: 'mod_grip',
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
    name: 'Free Loadout Augment', type: 'augment', rarity: 'common', weight: 1, stack: 1, value: 660,
    desc: 'Bare-bones augment issued with free loadouts. Light shields only, no safe pocket.', icon: 'augment',
    recycle: { rubber_parts: 6, plastic_parts: 6 }, tags: ['augment', 'free_loadout_augment'],
    augment: { backpack: 14, weightLimit: 35, quick: 4, safe: 0, weaponSlots: 2, shields: ['light'] },
  },
  looting_mk_1: {
    name: 'Looting Mk. 1', type: 'augment', rarity: 'uncommon', weight: 1, stack: 1, value: 640,
    desc: 'Entry-level looting rig with a roomy backpack.', icon: 'augment', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['augment', 'looting'], augment: { backpack: 18, weightLimit: 50, quick: 4, safe: 1, weaponSlots: 2, shields: ['light'] },
  },
  combat_mk_1: {
    name: 'Combat Mk. 1', type: 'augment', rarity: 'uncommon', weight: 2, stack: 1, value: 640,
    desc: 'Entry-level combat rig that supports medium shields.', icon: 'augment', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['augment', 'combat'],
    augment: { backpack: 16, weightLimit: 45, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium'] },
  },
  tactical_mk_1: {
    name: 'Tactical Mk. 1', type: 'augment', rarity: 'uncommon', weight: 2, stack: 1, value: 640,
    desc: 'Entry-level tactical rig with an extra quick-use slot.', icon: 'augment', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['augment', 'tactical'],
    augment: { backpack: 15, weightLimit: 40, quick: 5, safe: 1, weaponSlots: 2, shields: ['light', 'medium'] },
  },
  looting_mk_2: {
    name: 'Looting Mk. 2', type: 'augment', rarity: 'rare', weight: 2, stack: 1, value: 2000,
    desc: 'Improved looting rig with trinket pockets.', icon: 'augment', recycle: { magnet: 1, electrical_components: 1 },
    tags: ['augment', 'looting'],
    augment: {
      backpack: 22, weightLimit: 60, quick: 4, safe: 2, weaponSlots: 2, shields: ['light'], extra: { trinket: 3 }, perk: 'tick_shake',
      perkDesc: 'Automatically throws off latched Tikks after 1 s.',
    },
  },
  combat_mk_2: {
    name: 'Combat Mk. 2', type: 'augment', rarity: 'rare', weight: 3, stack: 1, value: 2000,
    desc: 'Improved combat rig with slow health regeneration and heavy shield support.', icon: 'augment',
    recycle: { electrical_components: 1, magnet: 1 }, tags: ['augment', 'combat'],
    augment: {
      backpack: 18, weightLimit: 55, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], extra: { grenade: 1 },
      perk: 'regen_1hp_5s', perkDesc: 'Restores 1 HP every 5 s; paused for 30 s after taking damage.',
    },
  },
  tactical_mk_2: {
    name: 'Tactical Mk. 2', type: 'augment', rarity: 'rare', weight: 2, stack: 1, value: 2000,
    desc: 'Improved tactical rig that smokes you out when your shield breaks.', icon: 'augment',
    recycle: { electrical_components: 1, magnet: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 17, weightLimit: 45, quick: 5, safe: 1, weaponSlots: 2, shields: ['light', 'medium'], extra: { trap: 1 },
      perk: 'shield_break_smoke', perkDesc: 'When your shield breaks, pops a small smoke cloud (fixed cooldown).',
    },
  },
  looting_mk_3_cautious: {
    name: 'Looting Mk. 3 (Cautious)', type: 'augment', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Advanced looting rig. When your shield breaks, injects a weak Adrenaline Shot (fixed cooldown). Integrated Binoculars.',
    icon: 'augment', recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'looting'],
    augment: {
      backpack: 24, weightLimit: 70, quick: 5, safe: 2, weaponSlots: 2, shields: ['light'], perk: 'shield_break_adrenaline',
      perkDesc: 'When your shield breaks, injects a weak Adrenaline Shot (fixed cooldown). Integrated Binoculars.',
      integrated: 'integrated_binoculars',
    },
  },
  looting_mk_3_safekeeper: {
    name: 'Looting Mk. 3 (Safekeeper)', type: 'augment', rarity: 'epic', weight: 5, stack: 1, value: 5000,
    desc: 'Advanced looting rig. Safe pocket accepts any item, not just small ones.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'looting'],
    augment: {
      backpack: 18, weightLimit: 65, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], extra: { trinket: 2 },
      perk: 'safe_any', perkDesc: 'Safe pocket accepts any item, not just small ones.',
    },
  },
  looting_mk_3_survivor: {
    name: 'Looting Mk. 3 (Survivor)', type: 'augment', rarity: 'epic', weight: 4, stack: 1, value: 5000,
    desc: 'Advanced looting rig. While downed and stationary, health regenerates up to 75% of downed health.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'looting'],
    augment: {
      backpack: 20, weightLimit: 80, quick: 5, safe: 3, weaponSlots: 2, shields: ['light', 'medium'], extra: { trap: 1 },
      perk: 'downed_regen', perkDesc: 'While downed and stationary, health regenerates up to 75% of downed health.',
    },
  },
  combat_mk_3_aggressive: {
    name: 'Combat Mk. 3 (Aggressive)', type: 'augment', rarity: 'epic', weight: 5, stack: 1, value: 5000,
    desc: 'Advanced combat rig. Restores 2 HP every 5 s; paused for 30 s after taking damage.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'combat'],
    augment: {
      backpack: 18, weightLimit: 65, quick: 4, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], extra: { grenade: 2 },
      perk: 'regen_2hp_5s', perkDesc: 'Restores 2 HP every 5 s; paused for 30 s after taking damage.',
    },
  },
  combat_mk_3_flanking: {
    name: 'Combat Mk. 3 (Flanking)', type: 'augment', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Advanced combat rig. Stowed pistols and hand cannons equip 33% faster.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'combat'],
    augment: {
      backpack: 20, weightLimit: 60, quick: 5, safe: 2, weaponSlots: 2, shields: ['light', 'medium'], extra: { trap: 3 },
      perk: 'fast_sidearm', perkDesc: 'Stowed pistols and hand cannons equip 33% faster.',
    },
  },
  tactical_mk_3_defensive: {
    name: 'Tactical Mk. 3 (Defensive)', type: 'augment', rarity: 'epic', weight: 5, stack: 1, value: 5000,
    desc: 'Advanced tactical rig. Shield Rechargers can be used while running. Integrated Shield Recharger.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 20, weightLimit: 60, quick: 5, safe: 1, weaponSlots: 2, shields: ['light', 'medium', 'heavy'], perk: 'recharge_on_move',
      perkDesc: 'Shield Rechargers can be used while running. Integrated Shield Recharger.', integrated: 'integrated_shield_recharger',
    },
  },
  tactical_mk_3_healing: {
    name: 'Tactical Mk. 3 (Healing)', type: 'augment', rarity: 'epic', weight: 4, stack: 1, value: 5000,
    desc: 'Advanced tactical rig. When revived, releases a healing cloud restoring 20 HP to nearby Raiders (30 s cooldown).',
    icon: 'augment', recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 16, weightLimit: 55, quick: 4, safe: 3, weaponSlots: 2, shields: ['light', 'medium'], extra: { healing: 3 },
      perk: 'revive_heal_cloud', perkDesc: 'When revived, releases a healing cloud restoring 20 HP to nearby Raiders (30 s cooldown).',
    },
  },
  tactical_mk_3_revival: {
    name: 'Tactical Mk. 3 (Revival)', type: 'augment', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Advanced tactical rig. Restores 1 HP every 5 s (paused 30 s after damage). Integrated Defibrillator.', icon: 'augment',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['augment', 'tactical'],
    augment: {
      backpack: 16, weightLimit: 65, quick: 5, safe: 2, weaponSlots: 2, shields: ['light'], perk: 'regen_1hp_5s',
      perkDesc: 'Restores 1 HP every 5 s (paused 30 s after damage). Integrated Defibrillator.', integrated: 'integrated_defibrillator',
    },
  },
  tactical_mk_3_smoke: {
    name: 'Tactical Mk. 3 (Smoke)', type: 'augment', rarity: 'epic', weight: 4, stack: 1, value: 5000,
    desc: 'Advanced tactical rig. When your shield breaks, deploys a smoke cloud (fixed cooldown).', icon: 'augment',
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
    desc: 'Lightweight shield pack. Absorbs 40% of incoming damage until depleted.', icon: 'shield_light',
    recycle: { plastic_parts: 4 }, tags: ['shield'], shield: { cls: 'light', capacity: 40, mitigation: 0.4, moveMul: 1 },
  },
  medium_shield: {
    name: 'Medium Shield', type: 'shield', rarity: 'rare', weight: 7, stack: 1, value: 2000,
    desc: 'Balanced shield pack with a deeper charge. Slightly slows you down.', icon: 'shield_medium', recycle: { ark_circuitry: 1 },
    tags: ['shield'], shield: { cls: 'medium', capacity: 70, mitigation: 0.425, moveMul: 0.95 },
  },
  heavy_shield: {
    name: 'Heavy Shield', type: 'shield', rarity: 'epic', weight: 9, stack: 1, value: 5500,
    desc: 'Heavy shield pack that soaks over half of incoming damage. Noticeably slows you down.', icon: 'shield_heavy',
    recycle: { ark_circuitry: 2, voltage_converter: 1 }, tags: ['shield'],
    shield: { cls: 'heavy', capacity: 80, mitigation: 0.525, moveMul: 0.85 },
  },

  // ======================================================================
  // Healing & recharge consumables
  // ======================================================================
  bandage: {
    name: 'Bandage', type: 'consumable', rarity: 'common', weight: 0.1, stack: 5, value: 250,
    desc: 'Gradually restores 20 HP over 10 s.', icon: 'bandage', recycle: { fabric: 2 }, tags: ['healing'],
    use: { time: 1.5, healOverTime: { amount: 20, dur: 10 } },
  },
  herbal_bandage: {
    name: 'Herbal Bandage', type: 'consumable', rarity: 'uncommon', weight: 0.15, stack: 5, value: 900,
    desc: 'Improvised poultice bandage. Restores 35 HP over 10 s.', icon: 'bandage', recycle: { assorted_seeds: 2, fabric: 5 },
    tags: ['healing'], use: { time: 1.5, healOverTime: { amount: 35, dur: 10 } },
  },
  sterilized_bandage: {
    name: 'Sterilized Bandage', type: 'consumable', rarity: 'rare', weight: 0.2, stack: 3, value: 2000,
    desc: 'Sterile dressing. Restores 50 HP over 10 s.', icon: 'bandage', recycle: { fabric: 1, antiseptic: 1 }, tags: ['healing'],
    use: { time: 1.5, healOverTime: { amount: 50, dur: 10 } },
  },
  adrenaline_shot: {
    name: 'Adrenaline Shot', type: 'consumable', rarity: 'common', weight: 0.2, stack: 5, value: 300,
    desc: 'Fully restores stamina and boosts stamina regeneration for 10 s.', icon: 'adrenaline',
    recycle: { chemicals: 1, plastic_parts: 1 }, tags: ['stamina'], use: { time: 1, stamina: 100, effect: 'adrenaline', dur: 10 },
  },
  agave_juice: {
    name: 'Agave Juice', type: 'consumable', rarity: 'common', weight: 0.2, stack: 5, value: 1800,
    desc: 'Bitter brew: costs 5 HP, then boosts stamina regeneration for 10 s.', icon: 'adrenaline', tags: ['stamina'],
    use: { time: 1, heal: -5, effect: 'adrenaline', dur: 10 },
  },
  fruit_mix: {
    name: 'Fruit Mix', type: 'consumable', rarity: 'uncommon', weight: 0.3, stack: 5, value: 1800,
    desc: 'A handful of foraged fruit. Restores 25 HP and 50 stamina.', icon: 'food', tags: ['healing'],
    use: { time: 2, heal: 25, stamina: 50 },
  },
  defibrillator: {
    name: 'Defibrillator', type: 'consumable', rarity: 'rare', weight: 0.75, stack: 3, value: 1000,
    desc: 'Quickly revives a downed Raider and restores 50 HP.', icon: 'defib', recycle: { plastic_parts: 1, moss: 1 },
    tags: ['healing'], use: { time: 1.5, heal: 50, effect: 'revive' },
  },
  vyta_shot: {
    name: 'Vyta Shot', type: 'consumable', rarity: 'rare', weight: 0.4, stack: 3, value: 2200,
    desc: 'Potent injection that restores 50 HP after a short use time.', icon: 'adrenaline', recycle: { chemicals: 4, syringe: 1 },
    tags: ['healing'], use: { time: 4, heal: 50 },
  },
  vyta_spray: {
    name: 'Vyta Spray', type: 'consumable', rarity: 'epic', weight: 1, stack: 1, value: 3400,
    desc: 'Continuous healing mist, 10 HP/s up to 150 HP. Works on yourself or allies.', icon: 'bandage',
    recycle: { antiseptic: 1, canister: 1 }, tags: ['healing'],
    use: { time: 0, healOverTime: { amount: 150, dur: 15 }, effect: 'spray', ally: true },
  },
  shield_recharger: {
    name: 'Shield Recharger', type: 'consumable', rarity: 'uncommon', weight: 0.15, stack: 5, value: 520,
    desc: 'Gradually recharges 40 shield over 10 s.', icon: 'shieldRecharger', recycle: { rubber_parts: 4 }, tags: ['shield_recharge'],
    use: { time: 2, shieldOverTime: { amount: 40, dur: 10 } },
  },
  surge_shield_recharger: {
    name: 'Surge Shield Recharger', type: 'consumable', rarity: 'rare', weight: 0.2, stack: 5, value: 1200,
    desc: 'Dumps 50 shield charge at once after a 5 s use.', icon: 'shieldRecharger', recycle: { electrical_components: 1 },
    tags: ['shield_recharge'], use: { time: 5, shield: 50 },
  },
  integrated_shield_recharger: {
    name: 'Integrated Shield Recharger', type: 'consumable', rarity: 'common', weight: 0, stack: 1, value: 0,
    desc: 'Augment-bound shield recharger. Restores 50 shield; 120 s cooldown. Cannot be dropped.', icon: 'shieldRecharger',
    tags: ['shield_recharge'], use: { time: 5, shield: 50, cooldown: 120, reusable: true }, bound: true,
  },
  integrated_defibrillator: {
    name: 'Integrated Defibrillator', type: 'consumable', rarity: 'rare', weight: 0, stack: 1, value: 0,
    desc: 'Augment-bound defibrillator. Revives a downed Raider; 240 s cooldown. Cannot be dropped.', icon: 'defib', tags: ['healing'],
    use: { time: 1.5, heal: 50, effect: 'revive', cooldown: 240, reusable: true }, bound: true,
  },

  // ======================================================================
  // Grenades & throwables
  // ======================================================================
  light_impact_grenade: {
    name: 'Light Impact Grenade', type: 'grenade', rarity: 'common', weight: 0.1, stack: 5, value: 270,
    desc: 'Detonates on impact for explosive damage in a small radius.', icon: 'grenade', recycle: { chemicals: 1, plastic_parts: 1 },
    tags: ['grenade'], throw: { kind: 'impact', fuse: 0, radius: 2.5, dmg: 30 },
  },
  heavy_fuze_grenade: {
    name: 'Heavy Fuze Grenade', type: 'grenade', rarity: 'rare', weight: 0.2, stack: 3, value: 1600,
    desc: 'Timed grenade with a big blast. 3 s fuse.', icon: 'grenade', recycle: { oil: 1, rubber_parts: 2 }, tags: ['grenade'],
    throw: { kind: 'frag', fuse: 3, radius: 7.5, dmg: 80 },
  },
  shrapnel_grenade: {
    name: 'Shrapnel Grenade', type: 'grenade', rarity: 'uncommon', weight: 0.15, stack: 5, value: 800,
    desc: 'Makeshift fuze grenade that bursts into razor fragments. Weak against ARK plating.', icon: 'grenade',
    recycle: { crude_explosives: 1, metal_parts: 1 }, tags: ['grenade'],
    throw: { kind: 'frag', fuse: 2.5, radius: 6, dmg: 60, armorPen: 0.1 },
  },
  snap_blast_grenade: {
    name: 'Snap Blast Grenade', type: 'grenade', rarity: 'uncommon', weight: 0.2, stack: 3, value: 800,
    desc: 'Sticks to surfaces and ARKs, then detonates after 3 s.', icon: 'grenade', recycle: { chemicals: 1, magnet: 1 },
    tags: ['grenade'], throw: { kind: 'sticky', fuse: 3, radius: 7.5, dmg: 70 },
  },
  seeker_grenade: {
    name: 'Seeker Grenade', type: 'grenade', rarity: 'uncommon', weight: 0.2, stack: 5, value: 640,
    desc: 'Homes in on a single ARK within 20 m and explodes on impact.', icon: 'grenade', recycle: { crude_explosives: 1 },
    tags: ['grenade'], throw: { kind: 'impact', fuse: 0, radius: 3, dmg: 50, homing: 20, arkOnly: true },
  },
  blaze_grenade: {
    name: 'Blaze Grenade', type: 'grenade', rarity: 'rare', weight: 0.2, stack: 5, value: 1600,
    desc: 'Bursts on impact, carpeting the area in fire (5 dmg/s for 10 s).', icon: 'grenade_fire', recycle: { metal_parts: 4, oil: 2 },
    tags: ['grenade'], throw: { kind: 'fire', fuse: 0, radius: 6, dmg: 5, dur: 10 },
  },
  gas_grenade: {
    name: 'Gas Grenade', type: 'grenade', rarity: 'common', weight: 0.2, stack: 3, value: 270,
    desc: 'Releases a toxic cloud that drains the stamina of Raiders inside it.', icon: 'grenade_gas',
    recycle: { chemicals: 1, rubber_parts: 1 }, tags: ['grenade'],
    throw: { kind: 'gas', fuse: 0, radius: 5, dmg: 0, dur: 20, staminaDrain: 25 },
  },
  smoke_grenade: {
    name: 'Smoke Grenade', type: 'grenade', rarity: 'rare', weight: 0.2, stack: 5, value: 1000,
    desc: 'Large lingering smoke cloud that blocks ARK and Raider vision.', icon: 'smoke', recycle: { chemicals: 2, canister: 1 },
    tags: ['grenade'], throw: { kind: 'smoke', fuse: 0, radius: 7.5, dmg: 0, dur: 20 },
  },
  lil_smoke_grenade: {
    name: 'Li\'l Smoke Grenade', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 300,
    desc: 'Pops a small, short-lived smoke cloud on impact.', icon: 'smoke', recycle: { chemicals: 1, plastic_parts: 1 },
    tags: ['grenade'], throw: { kind: 'smoke', fuse: 0, radius: 2.5, dmg: 0, dur: 6 },
  },
  lure_grenade: {
    name: 'Lure Grenade', type: 'grenade', rarity: 'uncommon', weight: 0.4, stack: 3, value: 1000,
    desc: 'Noisy sticky beacon that draws nearby ARKs and their fire for 15 s.', icon: 'grenade_lure',
    recycle: { speaker_component: 1 }, tags: ['grenade'], throw: { kind: 'lure', fuse: 0.5, radius: 50, dmg: 0, dur: 15, sticky: true },
  },
  showstoppa: {
    name: 'Showstoppa', type: 'grenade', rarity: 'rare', weight: 0.4, stack: 5, value: 2100,
    desc: 'Delayed EMP burst that stuns ARKs for 7 s and Raiders for 2 s.', icon: 'grenade_stun',
    recycle: { electrical_components: 1, voltage_converter: 1 }, tags: ['grenade'],
    throw: { kind: 'stun', fuse: 3.5, radius: 6, dmg: 0, stunArk: 7, stunRaider: 2 },
  },
  tagging_grenade: {
    name: 'Tagging Grenade', type: 'grenade', rarity: 'rare', weight: 0.4, stack: 3, value: 1000,
    desc: 'Marks every Raider and ARK in the blast so you can track them for 30 s.', icon: 'grenade',
    recycle: { plastic_parts: 1, sensors: 1 }, tags: ['grenade'], throw: { kind: 'tagging', fuse: 1.5, radius: 6, dmg: 0, dur: 30 },
  },
  trailblazr: {
    name: 'Trailblazr', type: 'grenade', rarity: 'rare', weight: 1, stack: 3, value: 2200,
    desc: 'Leaves a trail of flammable gas along its flight path that ignites in a chain reaction.', icon: 'grenade_fire',
    recycle: { crude_explosives: 2 }, tags: ['grenade'], throw: { kind: 'fire', fuse: 0, radius: 2, dmg: 20, dur: 6, trail: 12 },
  },
  wulfpack: {
    name: 'Wulfpack', type: 'grenade', rarity: 'epic', weight: 1, stack: 1, value: 6000,
    desc: 'Splits into twelve homing missiles that hunt down every ARK nearby.', icon: 'grenade',
    recycle: { ark_motion_core: 1, explosive_compound: 1 }, tags: ['grenade'],
    throw: { kind: 'wolfpack', fuse: 1.5, radius: 40, dmg: 166, missiles: 12, arkOnly: true },
  },
  blue_light_stick: {
    name: 'Blue Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light. Blue glow for 40 s.', icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#4aa0f0' },
  },
  green_light_stick: {
    name: 'Green Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light. Green glow for 40 s.', icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#5cc860' },
  },
  red_light_stick: {
    name: 'Red Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light. Red glow for 40 s.', icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#e84a30' },
  },
  yellow_light_stick: {
    name: 'Yellow Light Stick', type: 'grenade', rarity: 'common', weight: 0.15, stack: 5, value: 150,
    desc: 'Throwable chemical light. Yellow glow for 40 s.', icon: 'lightstick', recycle: { chemicals: 1 }, tags: ['grenade'],
    throw: { kind: 'flare', fuse: 0, radius: 7, dmg: 0, dur: 40, color: '#f0d040' },
  },
  firecracker: {
    name: 'Firecracker', type: 'grenade', rarity: 'common', weight: 0.05, stack: 5, value: 270,
    desc: 'Sparks and pops for a few seconds. A cheap distraction.', icon: 'grenade', recycle: { plastic_parts: 3 }, tags: ['grenade'],
    throw: { kind: 'noise', fuse: 0.5, radius: 20, dmg: 0, dur: 7.5 },
  },

  // ======================================================================
  // Traps & mines
  // ======================================================================
  blaze_grenade_trap: {
    name: 'Blaze Grenade Trap', type: 'trap', rarity: 'rare', weight: 0.3, stack: 3, value: 1000,
    desc: 'Laser tripwire rigged to a Blaze Grenade.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'fire', fuse: 0, radius: 6, dmg: 5, dur: 10, tripwire: 6 },
  },
  gas_grenade_trap: {
    name: 'Gas Grenade Trap', type: 'trap', rarity: 'common', weight: 0.25, stack: 3, value: 300,
    desc: 'Laser tripwire rigged to a Gas Grenade.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'gas', fuse: 0, radius: 5, dmg: 0, dur: 20, staminaDrain: 25, tripwire: 6 },
  },
  lure_grenade_trap: {
    name: 'Lure Grenade Trap', type: 'trap', rarity: 'uncommon', weight: 0.25, stack: 3, value: 1000,
    desc: 'Laser tripwire rigged to a Lure Grenade.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'lure', fuse: 0, radius: 50, dmg: 0, dur: 15, tripwire: 6 },
  },
  smoke_grenade_trap: {
    name: 'Smoke Grenade Trap', type: 'trap', rarity: 'rare', weight: 0.3, stack: 3, value: 640,
    desc: 'Laser tripwire rigged to a Smoke Grenade.', icon: 'trap', tags: ['trap'],
    throw: { kind: 'smoke', fuse: 0, radius: 7.5, dmg: 0, dur: 20, tripwire: 6 },
  },
  explosive_mine: {
    name: 'Explosive Mine', type: 'trap', rarity: 'rare', weight: 0.4, stack: 3, value: 1500,
    desc: 'Proximity mine that pops up and explodes 1 s after triggering.', icon: 'mine', recycle: { oil: 2, sensors: 1 },
    tags: ['trap'], throw: { kind: 'mine_explosive', fuse: 1, radius: 7.5, dmg: 40, trigger: 3 },
  },
  gas_mine: {
    name: 'Gas Mine', type: 'trap', rarity: 'common', weight: 0.25, stack: 3, value: 270,
    desc: 'Proximity mine that releases a stamina-draining gas cloud.', icon: 'mine', recycle: { chemicals: 1, rubber_parts: 1 },
    tags: ['trap'], throw: { kind: 'gas', fuse: 1, radius: 5, dmg: 0, dur: 20, staminaDrain: 25, trigger: 3 },
  },
  jolt_mine: {
    name: 'Jolt Mine', type: 'trap', rarity: 'rare', weight: 0.2, stack: 3, value: 850,
    desc: 'Proximity mine that stuns ARKs for 7 s and Raiders for 4 s.', icon: 'mine', recycle: { battery: 1, plastic_parts: 2 },
    tags: ['trap'], throw: { kind: 'mine_jolt', fuse: 1, radius: 5, dmg: 0, stunArk: 7, stunRaider: 4, trigger: 3 },
  },
  pulse_mine: {
    name: 'Pulse Mine', type: 'trap', rarity: 'uncommon', weight: 0.25, stack: 3, value: 470,
    desc: 'Proximity mine that knocks back everything around it.', icon: 'mine', recycle: { chemicals: 6 }, tags: ['trap'],
    throw: { kind: 'mine_explosive', fuse: 1, radius: 7.5, dmg: 0, knockback: 10, trigger: 3 },
  },
  dedline: {
    name: 'Dedline', type: 'trap', rarity: 'epic', weight: 1, stack: 1, value: 6000,
    desc: 'Timed charge: after 6 s it obliterates everything within 10 m.', icon: 'mine',
    recycle: { explosive_compound: 1, ark_circuitry: 1 }, tags: ['trap'],
    throw: { kind: 'mine_explosive', fuse: 6, radius: 10, dmg: 1000, timer: true },
  },
  trigga_nade: {
    name: 'Trigga \'Nade', type: 'trap', rarity: 'rare', weight: 0.4, stack: 3, value: 1000,
    desc: 'Sticky remote charge. Throw it, then detonate it whenever you like.', icon: 'grenade',
    recycle: { chemicals: 1, processor: 1 }, tags: ['trap'], throw: { kind: 'trigger', fuse: 1.5, radius: 7.5, dmg: 90, sticky: true },
  },

  // ======================================================================
  // Gadgets & utility
  // ======================================================================
  barricade_kit: {
    name: 'Barricade Kit', type: 'gadget', rarity: 'uncommon', weight: 0.4, stack: 3, value: 640,
    desc: 'Deployable cover that blocks incoming fire until destroyed (500 HP).', icon: 'barricade', recycle: { metal_parts: 4 },
    tags: ['gadget'], throw: { kind: 'barricade', fuse: 0, radius: 1.5, dmg: 0, hp: 500, dismantle: 5 },
  },
  door_blocker: {
    name: 'Door Blocker', type: 'gadget', rarity: 'common', weight: 0.2, stack: 3, value: 270,
    desc: 'Locks a powered door shut until someone breaches it.', icon: 'barricade', recycle: { metal_parts: 2 }, tags: ['gadget'],
    throw: { kind: 'barricade', fuse: 0, radius: 0.5, dmg: 0, target: 'door' },
  },
  remote_raider_flare: {
    name: 'Remote Raider Flare', type: 'gadget', rarity: 'common', weight: 0.2, stack: 3, value: 270,
    desc: 'Place it, then trigger it remotely to launch a distress flare.', icon: 'flare', recycle: { chemicals: 1, rubber_parts: 1 },
    tags: ['gadget'], throw: { kind: 'flare', fuse: 0, radius: 12, dmg: 0, dur: 30, remote: true },
  },
  fireworks_box: {
    name: 'Fireworks Box', type: 'gadget', rarity: 'rare', weight: 0.5, stack: 1, value: 2000,
    desc: 'Remote-triggered fireworks. Loud, bright, and very distracting.', icon: 'flare', recycle: { explosive_compound: 1 },
    tags: ['gadget'], throw: { kind: 'lure', fuse: 0, radius: 40, dmg: 0, dur: 10, remote: true },
  },
  surge_coil: {
    name: 'Surge Coil', type: 'gadget', rarity: 'rare', weight: 0.4, stack: 3, value: 2100,
    desc: 'Deployable coil that zaps everything nearby every 2 s. ARKs turn on it like a lure.', icon: 'trap',
    recycle: { electrical_components: 1, sensors: 1 }, tags: ['gadget'],
    throw: { kind: 'stun', fuse: 2, radius: 6, dmg: 6, stunArk: 1, stunRaider: 0.5, interval: 2, hp: 40, lure: true },
  },
  white_flag: {
    name: 'White Flag', type: 'gadget', rarity: 'common', weight: 0.2, stack: 5, value: 640,
    desc: 'Plant it to signal peaceful intent. No guarantees.', icon: 'flag', recycle: { fabric: 5, plastic_parts: 1 },
    tags: ['gadget'], throw: { kind: 'flare', fuse: 0, radius: 3, dmg: 0, dur: 60, flag: 'white' },
  },
  zipline: {
    name: 'Zipline', type: 'gadget', rarity: 'rare', weight: 0.4, stack: 3, value: 1000,
    desc: 'Fires a line up to 60 m between two points for fast traversal.', icon: 'zipline', recycle: { rope: 1, metal_parts: 1 },
    tags: ['gadget'], throw: { kind: 'zipline_skip', fuse: 0, radius: 0, dmg: 0, range: 60 },
  },
  noisemaker: {
    name: 'Noisemaker', type: 'gadget', rarity: 'common', weight: 0.3, stack: 3, value: 640,
    desc: 'Proximity sensor that sounds an alarm when enemy Raiders come close.', icon: 'gadget', recycle: { speaker_component: 1 },
    tags: ['gadget'], throw: { kind: 'noise', fuse: 0, radius: 8, dmg: 0, dur: 4, sensor: true },
  },
  binoculars: {
    name: 'Binoculars', type: 'gadget', rarity: 'common', weight: 0.5, stack: 1, value: 640,
    desc: 'Two-step magnification. Scout ahead without exposing yourself.', icon: 'binoculars',
    recycle: { rubber_parts: 2, plastic_parts: 4 }, tags: ['gadget'],
    use: { time: 0.3, effect: 'binoculars', range: 60, reusable: true },
  },
  integrated_binoculars: {
    name: 'Integrated Binoculars', type: 'gadget', rarity: 'common', weight: 0, stack: 1, value: 0,
    desc: 'Augment-bound binoculars. Cannot be dropped.', icon: 'binoculars', tags: ['gadget'],
    use: { time: 0.3, effect: 'binoculars', range: 60, reusable: true }, bound: true,
  },
  photoelectric_cloak: {
    name: 'Photoelectric Cloak', type: 'gadget', rarity: 'epic', weight: 3, stack: 1, value: 5000,
    desc: 'Bends light around you: ARKs lose track of you while you move slowly. Recharges between uses.', icon: 'cloak',
    recycle: { advanced_electrical_components: 1, speaker_component: 1 }, tags: ['gadget'],
    use: { time: 0.5, effect: 'cloak', dur: 12, cooldown: 25, moveMul: 0.5, reusable: true },
  },
  powered_descender: {
    name: 'Powered Descender', type: 'gadget', rarity: 'epic', weight: 5, stack: 1, value: 10000,
    desc: 'Slows your fall when used in mid-air. Needs a moment to spool up.', icon: 'gadget',
    recycle: { advanced_electrical_components: 1, ark_circuitry: 1 }, tags: ['gadget'],
    use: { time: 0.3, effect: 'descend', dur: 8, reusable: true },
  },
  snap_hook: {
    name: 'Snap Hook', type: 'gadget', rarity: 'legendary', weight: 5, stack: 1, value: 14000,
    desc: 'Grappling launcher for scaling structures and crossing gaps up to 20 m.', icon: 'grapple',
    recycle: { power_rod: 1, rope: 3 }, tags: ['gadget'], use: { time: 0.2, effect: 'grapple', range: 20, cooldown: 4, reusable: true },
  },
  recorder: {
    name: 'Recorder', type: 'gadget', rarity: 'uncommon', weight: 0.2, stack: 1, value: 1000,
    desc: 'A playable recorder. Attracts ARKs and impresses other Raiders.', icon: 'instrument', recycle: { plastic_parts: 10 },
    tags: ['gadget'], use: { time: 0, effect: 'lure', radius: 30, dur: 6, reusable: true },
  },
  shaker: {
    name: 'Shaker', type: 'gadget', rarity: 'uncommon', weight: 0.2, stack: 1, value: 1000,
    desc: 'A rhythmic shaker. Attracts ARKs and impresses other Raiders.', icon: 'instrument', recycle: { plastic_parts: 10 },
    tags: ['gadget'], use: { time: 0, effect: 'lure', radius: 30, dur: 6, reusable: true },
  },
  acoustic_guitar: {
    name: 'Acoustic Guitar', type: 'gadget', rarity: 'legendary', weight: 1, stack: 1, value: 7000,
    desc: 'A playable acoustic guitar. ARKs come running, Raiders sing along.', icon: 'instrument',
    recycle: { wires: 6, metal_parts: 4 }, tags: ['gadget'], use: { time: 0, effect: 'lure', radius: 40, dur: 8, reusable: true },
  },
  flame_spray: {
    name: 'Flame Spray', type: 'gadget', rarity: 'uncommon', weight: 1, stack: 1, value: 2000,
    desc: 'Makeshift flamethrower: 10 dmg/s in a short cone until the can runs dry.', icon: 'gadget',
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
    name: 'Raider Hatch Key', type: 'key', rarity: 'rare', weight: 0.01, stack: 1, value: 2000,
    desc: 'Opens any Raider Hatch for an emergency extraction.', icon: 'key', tags: ['key', 'any'],
    key: { map: 'any', room: 'raider_hatch' },
  },

  // ======================================================================
  // Materials
  // ======================================================================
  metal_parts: {
    name: 'Metal Parts', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 75,
    desc: 'Scrap metal. The backbone of almost every recipe.', icon: 'metalParts', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  plastic_parts: {
    name: 'Plastic Parts', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 60,
    desc: 'Assorted plastic scrap for casings and grips.', icon: 'plastic_parts', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  rubber_parts: {
    name: 'Rubber Parts', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 50,
    desc: 'Rubber offcuts used for seals, grips and gaskets.', icon: 'rubber_parts', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  fabric: {
    name: 'Fabric', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 50, desc: 'Cloth scraps for bandages and gear.',
    icon: 'fabric', tags: ['material', 'basic'], material: { tier: 'basic' },
  },
  chemicals: {
    name: 'Chemicals', type: 'material', rarity: 'common', weight: 0.1, stack: 50, value: 50,
    desc: 'Jars of reagents. Base for ammo, explosives and meds.', icon: 'chemicals', tags: ['material', 'basic'],
    material: { tier: 'basic' },
  },
  // --- refined materials ---
  mechanical_components: {
    name: 'Mechanical Components', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 10, value: 640,
    desc: 'Refined moving parts. Needed for most weapon work.', icon: 'component', recycle: { rubber_parts: 2, metal_parts: 3 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  electrical_components: {
    name: 'Electrical Components', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 10, value: 640,
    desc: 'Refined circuitry for gear and gadgets.', icon: 'component', recycle: { plastic_parts: 3, rubber_parts: 3 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  durable_cloth: {
    name: 'Durable Cloth', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 10, value: 640,
    desc: 'Tough woven cloth refined from fabric.', icon: 'fabric', recycle: { fabric: 6 }, tags: ['material', 'refined'],
    material: { tier: 'refined' },
  },
  crude_explosives: {
    name: 'Crude Explosives', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 10, value: 270,
    desc: 'Unstable homemade explosive filler.', icon: 'explosive', recycle: { chemicals: 3 }, tags: ['material', 'refined'],
    material: { tier: 'refined' },
  },
  explosive_compound: {
    name: 'Explosive Compound', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 1000,
    desc: 'Stable, potent explosive compound for advanced ordnance.', icon: 'explosive', recycle: { crude_explosives: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  antiseptic: {
    name: 'Antiseptic', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1000,
    desc: 'Medical-grade antiseptic for advanced healing items.', icon: 'chemicals', recycle: { chemicals: 10 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  mod_components: {
    name: 'Mod Components', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1750,
    desc: 'Precision parts for crafting high-tier weapon mods.', icon: 'component',
    recycle: { mechanical_components: 1, steel_spring: 1 }, tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  simple_gun_parts: {
    name: 'Simple Gun Parts', type: 'material', rarity: 'uncommon', weight: 0.3, stack: 10, value: 330,
    desc: 'Generic firearm parts used to build and upgrade basic weapons.', icon: 'gun_parts', recycle: { metal_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  light_gun_parts: {
    name: 'Light Gun Parts', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 700,
    desc: 'Parts for light-frame weapons such as SMGs.', icon: 'gun_parts', recycle: { simple_gun_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  medium_gun_parts: {
    name: 'Medium Gun Parts', type: 'material', rarity: 'rare', weight: 0.4, stack: 5, value: 700,
    desc: 'Parts for rifles and medium-frame weapons.', icon: 'gun_parts', recycle: { simple_gun_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  heavy_gun_parts: {
    name: 'Heavy Gun Parts', type: 'material', rarity: 'rare', weight: 0.5, stack: 5, value: 700,
    desc: 'Parts for heavy weapons, shotguns and launchers.', icon: 'gun_parts', recycle: { simple_gun_parts: 2 },
    tags: ['material', 'refined'], material: { tier: 'refined' },
  },
  // --- advanced materials ---
  advanced_mechanical_components: {
    name: 'Advanced Mechanical Components', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1750,
    desc: 'High-grade mechanical assemblies for top-tier weapons.', icon: 'component',
    recycle: { steel_spring: 1, mechanical_components: 1 }, tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  advanced_electrical_components: {
    name: 'Advanced Electrical Components', type: 'material', rarity: 'rare', weight: 1, stack: 5, value: 1750,
    desc: 'High-grade electronics for top-tier gear.', icon: 'component', recycle: { wires: 1, electrical_components: 1 },
    tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  complex_gun_parts: {
    name: 'Complex Gun Parts', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Rare precision parts used in experimental weapons.', icon: 'gun_parts', recycle: { simple_gun_parts: 3 },
    tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  magnetic_accelerator: {
    name: 'Magnetic Accelerator', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 5500,
    desc: 'Magnetic coil assembly that drives experimental weapons.', icon: 'component',
    recycle: { advanced_mechanical_components: 1, ark_motion_core: 1 }, tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  power_rod: {
    name: 'Power Rod', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 5000,
    desc: 'Dense energy-storage rod for heavy shields and advanced gadgets.', icon: 'battery',
    recycle: { advanced_electrical_components: 1, ark_circuitry: 1 }, tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  exodos_modules: {
    name: 'Exodos Modules', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 2750,
    desc: 'Mysterious modules of unknown origin. Prized by gunsmiths.', icon: 'component', recycle: { magnet: 2, processor: 2 },
    tags: ['material', 'advanced'], material: { tier: 'advanced' },
  },
  // --- topside materials ---
  battery: {
    name: 'Battery', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 250, desc: 'An old but serviceable battery.',
    icon: 'battery', recycle: { metal_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  wires: {
    name: 'Wires', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 200, desc: 'A bundle of copper wiring.',
    icon: 'wires', recycle: { rubber_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  sensors: {
    name: 'Sensors', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500, desc: 'Salvaged sensor modules.',
    icon: 'component', recycle: { wires: 1, metal_parts: 1 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  steel_spring: {
    name: 'Steel Spring', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300, desc: 'A sturdy coil spring.',
    icon: 'metalParts', recycle: { metal_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  oil: {
    name: 'Oil', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300, desc: 'A can of lubricant oil.',
    icon: 'canister', recycle: { chemicals: 3 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  canister: {
    name: 'Canister', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300, desc: 'An empty pressurised canister.',
    icon: 'canister', recycle: { plastic_parts: 3 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  duct_tape: {
    name: 'Duct Tape', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'Fixes everything, at least for a while.', icon: 'fabric', recycle: { fabric: 3 }, tags: ['material', 'topside'],
    material: { tier: 'topside' },
  },
  rope: {
    name: 'Rope', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500, desc: 'Strong braided rope.', icon: 'fabric',
    recycle: { fabric: 5 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  magnet: {
    name: 'Magnet', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300, desc: 'A strong permanent magnet.',
    icon: 'metalParts', recycle: { metal_parts: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  processor: {
    name: 'Processor', type: 'material', rarity: 'rare', weight: 0.2, stack: 5, value: 500, desc: 'A salvaged microprocessor.',
    icon: 'component', recycle: { wires: 1, plastic_parts: 1 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  speaker_component: {
    name: 'Speaker Component', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500, desc: 'A small speaker driver.',
    icon: 'component', recycle: { plastic_parts: 2, rubber_parts: 3 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  voltage_converter: {
    name: 'Voltage Converter', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500,
    desc: 'Steps power up or down between systems.', icon: 'component', recycle: { wires: 1, rubber_parts: 1 },
    tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  synthesized_fuel: {
    name: 'Synthesized Fuel', type: 'material', rarity: 'rare', weight: 0.5, stack: 5, value: 700, desc: 'Volatile synthetic fuel.',
    icon: 'canister', recycle: { oil: 1, plastic_parts: 1 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  syringe: {
    name: 'Syringe', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 500,
    desc: 'A sterile syringe for advanced medicine.', icon: 'adrenaline', recycle: { plastic_parts: 3, chemicals: 2 },
    tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  motor: {
    name: 'Motor', type: 'material', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'A small electric motor. Recycles into oil and mechanical components.', icon: 'component',
    recycle: { oil: 2, mechanical_components: 2 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  industrial_battery: {
    name: 'Industrial Battery', type: 'material', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'A heavy industrial battery pack.', icon: 'battery', recycle: { chemicals: 7, battery: 2 }, tags: ['material', 'topside'],
    material: { tier: 'topside' },
  },
  power_cable: {
    name: 'Power Cable', type: 'material', rarity: 'rare', weight: 2, stack: 3, value: 1000, desc: 'A thick insulated power cable.',
    icon: 'wires', recycle: { wires: 4 }, tags: ['material', 'topside'], material: { tier: 'topside' },
  },
  // --- nature materials ---
  assorted_seeds: {
    name: 'Assorted Seeds', type: 'material', rarity: 'common', weight: 0.05, stack: 100, value: 100,
    desc: 'Seeds of many kinds. Celesta accepts them as currency.', icon: 'seeds', tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  great_mullein: {
    name: 'Great Mullein', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 300,
    desc: 'Medicinal herb used in herbal bandages and antiseptic.', icon: 'plant', recycle: { assorted_seeds: 2 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  moss: {
    name: 'Moss', type: 'material', rarity: 'rare', weight: 0.3, stack: 10, value: 500,
    desc: 'Damp moss with useful antiseptic properties.', icon: 'plant', recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  mushroom: {
    name: 'Mushroom', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 1000,
    desc: 'An edible mushroom. Scrappie loves them.', icon: 'plant', tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  agave: {
    name: 'Agave', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 1000,
    desc: 'Spiky succulent that can be pressed into juice.', icon: 'plant', recycle: { assorted_seeds: 3 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  apricot: {
    name: 'Apricot', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640, desc: 'A sweet apricot.', icon: 'fruit',
    recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  lemon: {
    name: 'Lemon', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640, desc: 'A sour lemon.', icon: 'fruit',
    recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  olives: {
    name: 'Olives', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640, desc: 'A handful of olives.',
    icon: 'fruit', recycle: { assorted_seeds: 2 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  prickly_pear: {
    name: 'Prickly Pear', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640,
    desc: 'Cactus fruit. Mind the spines.', icon: 'fruit', recycle: { assorted_seeds: 3 }, tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  candleberries: {
    name: 'Candleberries', type: 'material', rarity: 'rare', weight: 0.5, stack: 10, value: 460,
    desc: 'Waxy berries that glow faintly at night.', icon: 'fruit', recycle: { assorted_seeds: 2 }, tags: ['material', 'nature'],
    material: { tier: 'nature' },
  },
  roots: {
    name: 'Roots', type: 'material', rarity: 'uncommon', weight: 0.2, stack: 10, value: 640, desc: 'Gnarled edible roots.',
    icon: 'plant', recycle: { assorted_seeds: 1 }, tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  resin: {
    name: 'Resin', type: 'material', rarity: 'common', weight: 0.4, stack: 10, value: 1000, desc: 'Sticky tree resin.', icon: 'plant',
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  fertilizer: {
    name: 'Fertilizer', type: 'material', rarity: 'uncommon', weight: 0.4, stack: 5, value: 1000,
    desc: 'A sack of fertilizer for the Speranzia gardens.', icon: 'plant', recycle: { assorted_seeds: 2 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  fossilized_lightning: {
    name: 'Fossilized Lightning', type: 'material', rarity: 'epic', weight: 0.25, stack: 1, value: 4000,
    desc: 'Glassy fulgurite left where lightning struck during an EM storm.', icon: 'valuable', recycle: { explosive_compound: 3 },
    tags: ['material', 'nature'], material: { tier: 'nature' },
  },
  // --- arc materials ---
  ark_alloy: {
    name: 'ARK Alloy', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 15, value: 200,
    desc: 'Light ARK plating alloy. Common drop from destroyed ARKs.', icon: 'arc_part', recycle: { metal_parts: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_powercell: {
    name: 'ARK Powercell', type: 'material', rarity: 'common', weight: 0.5, stack: 5, value: 270,
    desc: 'Power cell pulled from an ARK.', icon: 'arc_part', tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  advanced_ark_powercell: {
    name: 'Advanced ARK Powercell', type: 'material', rarity: 'rare', weight: 0.5, stack: 5, value: 640,
    desc: 'High-capacity ARK power cell. Used for energy clips and surge rechargers.', icon: 'arc_part', recycle: { ark_powercell: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_ark_powercell: {
    name: 'Damaged ARK Powercell', type: 'material', rarity: 'common', weight: 0.25, stack: 5, value: 293,
    desc: 'A cracked ARK power cell.', icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_circuitry: {
    name: 'ARK Circuitry', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 1000, desc: 'Intact ARK circuit board.',
    icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  burned_ark_circuitry: {
    name: 'Burned ARK Circuitry', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 5, value: 640,
    desc: 'Fire-damaged ARK circuitry.', icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  glitched_ark_circuitry: {
    name: 'Glitched ARK Circuitry', type: 'material', rarity: 'legendary', weight: 0.5, stack: 1, value: 5000,
    desc: 'ARK circuitry still twitching with strange signals.', icon: 'arc_part', recycle: { exodos_modules: 1, ark_alloy: 6 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_motion_core: {
    name: 'ARK Motion Core', type: 'material', rarity: 'rare', weight: 0.3, stack: 5, value: 1000,
    desc: 'ARK servo core. Needed for launcher ammo and magnetic accelerators.', icon: 'arc_part', recycle: { ark_alloy: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_ark_motion_core: {
    name: 'Damaged ARK Motion Core', type: 'material', rarity: 'uncommon', weight: 0.25, stack: 5, value: 640,
    desc: 'A broken ARK servo core.', icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_coolant: {
    name: 'ARK Coolant', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000, desc: 'Pressurised ARK coolant.',
    icon: 'arc_part', recycle: { chemicals: 16 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  impure_ark_coolant: {
    name: 'Impure ARK Coolant', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640,
    desc: 'Contaminated ARK coolant.', icon: 'arc_part', recycle: { chemicals: 12 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_flex_rubber: {
    name: 'ARK Flex Rubber', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000, desc: 'Flexible ARK joint rubber.',
    icon: 'arc_part', recycle: { rubber_parts: 16 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  degraded_ark_rubber: {
    name: 'Degraded ARK Rubber', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640, desc: 'Perished ARK rubber.',
    icon: 'arc_part', recycle: { rubber_parts: 11 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_performance_steel: {
    name: 'ARK Performance Steel', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000, desc: 'High-tensile ARK steel.',
    icon: 'arc_part', recycle: { metal_parts: 12 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  rusty_ark_steel: {
    name: 'Rusty ARK Steel', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640, desc: 'Corroded ARK steel plate.',
    icon: 'arc_part', recycle: { metal_parts: 8 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  ark_synthetic_resin: {
    name: 'ARK Synthetic Resin', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000, desc: 'ARK-grade synthetic resin.',
    icon: 'arc_part', recycle: { plastic_parts: 14 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  dried_out_ark_resin: {
    name: 'Dried-Out ARK Resin', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640,
    desc: 'Brittle, dried-out ARK resin.', icon: 'arc_part', recycle: { plastic_parts: 9 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  ark_thermo_lining: {
    name: 'ARK Thermo Lining', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'Heat-proof ARK lining fabric.', icon: 'arc_part', recycle: { fabric: 16 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  tattered_ark_lining: {
    name: 'Tattered ARK Lining', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 640, desc: 'Shredded ARK lining.',
    icon: 'arc_part', recycle: { fabric: 12 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  glitched_ark_light_ring: {
    name: 'Glitched ARK Light Ring', type: 'material', rarity: 'epic', weight: 0.5, stack: 1, value: 3000,
    desc: 'An ARK "eye" light ring, flickering erratically.', icon: 'arc_part',
    recycle: { advanced_electrical_components: 1, ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  glitched_ark_phased_array: {
    name: 'Glitched ARK Phased Array', type: 'material', rarity: 'rare', weight: 0.5, stack: 1, value: 2000,
    desc: 'A glitching ARK radar array.', icon: 'arc_part', recycle: { sensors: 2, ark_alloy: 3 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  glitched_ark_power_converter: {
    name: 'Glitched ARK Power Converter', type: 'material', rarity: 'common', weight: 0.5, stack: 1, value: 640,
    desc: 'A sputtering ARK power converter.', icon: 'arc_part', recycle: { ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  glitched_ark_transmitter: {
    name: 'Glitched ARK Transmitter', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 1, value: 1000,
    desc: 'An ARK transmitter broadcasting gibberish.', icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  wazp_driver: {
    name: 'Wazp Driver', type: 'material', rarity: 'rare', weight: 0.6, stack: 3, value: 640,
    desc: 'Rotor driver salvaged from a Wazp.', icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_wazp_driver: {
    name: 'Damaged Wazp Driver', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 270,
    desc: 'A mangled Wazp rotor driver.', icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  hornett_driver: {
    name: 'Hornett Driver', type: 'material', rarity: 'rare', weight: 0.75, stack: 3, value: 1000,
    desc: 'Rotor driver salvaged from a Hornett.', icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_hornett_driver: {
    name: 'Damaged Hornett Driver', type: 'material', rarity: 'common', weight: 0.3, stack: 3, value: 640,
    desc: 'A mangled Hornett rotor driver.', icon: 'arc_part', recycle: { ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  tikk_pod: {
    name: 'Tikk Pod', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 3, value: 640, desc: 'Body pod from a Tikk.',
    icon: 'arc_part', recycle: { chemicals: 2, ark_alloy: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_tikk_pod: {
    name: 'Damaged Tikk Pod', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 270, desc: 'A cracked Tikk pod.',
    icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  popp_trigger: {
    name: 'Popp Trigger', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 3, value: 640, desc: 'Detonator from a Popp.',
    icon: 'arc_part', recycle: { ark_alloy: 1, crude_explosives: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  fyreball_burner: {
    name: 'Fyreball Burner', type: 'material', rarity: 'uncommon', weight: 0.5, stack: 3, value: 640,
    desc: 'Burner unit from a Fyreball.', icon: 'arc_part', recycle: { ark_alloy: 1, crude_explosives: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_fyreball_burner: {
    name: 'Damaged Fyreball Burner', type: 'material', rarity: 'common', weight: 1, stack: 3, value: 270,
    desc: 'A broken Fyreball burner.', icon: 'arc_part', recycle: { ark_alloy: 1 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  fyrefly_burner: {
    name: 'Fyrefly Burner', type: 'material', rarity: 'rare', weight: 0.75, stack: 3, value: 1000, desc: 'Burner unit from a Fyrefly.',
    icon: 'arc_part', recycle: { ark_alloy: 2, crude_explosives: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  snytch_scanner: {
    name: 'Snytch Scanner', type: 'material', rarity: 'uncommon', weight: 0.75, stack: 3, value: 1000,
    desc: 'Scanner head from a Snytch.', icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_snytch_scanner: {
    name: 'Damaged Snytch Scanner', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 659,
    desc: 'A smashed Snytch scanner.', icon: 'arc_part', tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  spottr_relay: {
    name: 'Spottr Relay', type: 'material', rarity: 'uncommon', weight: 1, stack: 3, value: 1000,
    desc: 'Targeting relay from a Spottr.', icon: 'arc_part', recycle: { electrical_components: 1, ark_alloy: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  komet_igniter: {
    name: 'Komet Igniter', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000, desc: 'Igniter from a Komet.',
    icon: 'arc_part', recycle: { ark_alloy: 2, crude_explosives: 2 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  sentinal_firing_core: {
    name: 'Sentinal Firing Core', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 2000,
    desc: 'Laser firing core from a Sentinal.', icon: 'arc_part', recycle: { ark_alloy: 2, mechanical_components: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  surveyr_vault: {
    name: 'Surveyr Vault', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 1000,
    desc: 'Data vault from a Surveyr. Often holds valuable salvage.', icon: 'arc_part',
    recycle: { ark_alloy: 1, mechanical_components: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  shreddr_gyro: {
    name: 'Shreddr Gyro', type: 'material', rarity: 'rare', weight: 1, stack: 3, value: 2000, desc: 'Gyroscope from a Shreddr.',
    icon: 'arc_part', recycle: { ark_alloy: 2, mechanical_components: 2 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  leapr_pulse_unit: {
    name: 'Leapr Pulse Unit', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Jump-jet pulse unit from a Leapr.', icon: 'arc_part', recycle: { advanced_mechanical_components: 1, ark_alloy: 3 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_leapr_pulse_unit: {
    name: 'Damaged Leapr Pulse Unit', type: 'material', rarity: 'common', weight: 0.3, stack: 3, value: 1000,
    desc: 'A damaged Leapr pulse unit.', icon: 'arc_part', recycle: { ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  rocketier_driver: {
    name: 'Rocketier Driver', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Thruster driver from a Rocketier.', icon: 'arc_part', recycle: { ark_alloy: 3, advanced_electrical_components: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  damaged_rocketier_driver: {
    name: 'Damaged Rocketier Driver', type: 'material', rarity: 'common', weight: 0.25, stack: 3, value: 1000,
    desc: 'A damaged Rocketier driver.', icon: 'arc_part', recycle: { ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  bastian_cell: {
    name: 'Bastian Cell', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000, desc: 'Heavy power cell from a Bastian.',
    icon: 'arc_part', recycle: { advanced_mechanical_components: 1, ark_alloy: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  bombardeer_cell: {
    name: 'Bombardeer Cell', type: 'material', rarity: 'epic', weight: 1, stack: 3, value: 3000,
    desc: 'Artillery power cell from a Bombardeer.', icon: 'arc_part', recycle: { advanced_mechanical_components: 1, ark_alloy: 3 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  assessr_matrix: {
    name: 'Assessr Matrix', type: 'material', rarity: 'epic', weight: 0.5, stack: 1, value: 5000,
    desc: 'Analysis matrix from an Assessr.', icon: 'arc_part',
    recycle: { advanced_mechanical_components: 1, advanced_ark_powercell: 3 }, tags: ['arc_part', 'material', 'arc'],
    material: { tier: 'arc' },
  },
  vaporiser_regulator: {
    name: 'Vaporiser Regulator', type: 'material', rarity: 'epic', weight: 0.5, stack: 3, value: 6000,
    desc: 'Thermal regulator from a Vaporiser.', icon: 'arc_part', recycle: { advanced_electrical_components: 1, ark_circuitry: 2 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  turbyne_compressor: {
    name: 'Turbyne Compressor', type: 'material', rarity: 'epic', weight: 0.5, stack: 3, value: 5000,
    desc: 'Compressor from a Turbyne.', icon: 'arc_part', recycle: { ark_motion_core: 1, ark_circuitry: 1 },
    tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  matriark_reactor: {
    name: 'Matriark Reactor', type: 'material', rarity: 'legendary', weight: 10, stack: 1, value: 11000,
    desc: 'The reactor heart of a Matriark. Enormous and enormously valuable.', icon: 'arc_part',
    recycle: { power_rod: 1, magnetic_accelerator: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },
  queene_reactor: {
    name: 'Queene Reactor', type: 'material', rarity: 'legendary', weight: 10, stack: 1, value: 11000,
    desc: 'The reactor heart of a Queene. Enormous and enormously valuable.', icon: 'arc_part',
    recycle: { power_rod: 1, magnetic_accelerator: 1 }, tags: ['arc_part', 'material', 'arc'], material: { tier: 'arc' },
  },

  // ======================================================================
  // Valuables (recyclable salvage)
  // ======================================================================
  alarm_clock: {
    name: 'Alarm Clock', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 6 Plastic Parts, 1 Processor.', icon: 'salvage', recycle: { plastic_parts: 6, processor: 1 },
    tags: ['recyclable'],
  },
  bicycle_pump: {
    name: 'Bicycle Pump', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 4 Canister, 10 Metal Parts.', icon: 'salvage', recycle: { canister: 4, metal_parts: 10 },
    tags: ['recyclable'],
  },
  broken_flashlight: {
    name: 'Broken Flashlight', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 2 Battery, 6 Metal Parts.', icon: 'salvage', recycle: { battery: 2, metal_parts: 6 },
    tags: ['recyclable'],
  },
  broken_guidance_system: {
    name: 'Broken Guidance System', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 4 Processor.', icon: 'salvage', recycle: { processor: 4 }, tags: ['recyclable'],
  },
  broken_handheld_radio: {
    name: 'Broken Handheld Radio', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 3 Sensors, 2 Wires.', icon: 'salvage', recycle: { sensors: 3, wires: 2 }, tags: ['recyclable'],
  },
  broken_taser: {
    name: 'Broken Taser', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 2 Battery, 2 Wires.', icon: 'salvage', recycle: { battery: 2, wires: 2 }, tags: ['recyclable'],
  },
  camera_lens: {
    name: 'Camera Lens', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 5, value: 640,
    desc: 'Salvage. Recycles into 8 Plastic Parts.', icon: 'salvage', recycle: { plastic_parts: 8 }, tags: ['recyclable'],
  },
  candle_holder: {
    name: 'Candle Holder', type: 'valuable', rarity: 'uncommon', weight: 2, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 8 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  coolant: {
    name: 'Coolant', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 5 Chemicals, 2 Oil.', icon: 'salvage', recycle: { chemicals: 5, oil: 2 }, tags: ['recyclable'],
  },
  cooling_coil: {
    name: 'Cooling Coil', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 6 Chemicals, 2 Steel Spring.', icon: 'salvage', recycle: { chemicals: 6, steel_spring: 2 },
    tags: ['recyclable'],
  },
  cooling_fan: {
    name: 'Cooling Fan', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 14 Plastic Parts, 4 Wires.', icon: 'salvage', recycle: { plastic_parts: 14, wires: 4 },
    tags: ['recyclable'],
  },
  cracked_bioscanner: {
    name: 'Cracked Bioscanner', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 3 Rubber Parts, 3 Battery.', icon: 'salvage', recycle: { rubber_parts: 3, battery: 3 },
    tags: ['recyclable'],
  },
  crumpled_plastic_bottle: {
    name: 'Crumpled Plastic Bottle', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 270,
    desc: 'Salvage. Recycles into 4 Plastic Parts.', icon: 'salvage', recycle: { plastic_parts: 4 }, tags: ['recyclable'],
  },
  damaged_heat_sink: {
    name: 'Damaged Heat Sink', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 6 Metal Parts, 2 Wires.', icon: 'salvage', recycle: { metal_parts: 6, wires: 2 },
    tags: ['recyclable'],
  },
  deflated_football: {
    name: 'Deflated Football', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 9 Rubber Parts, 9 Fabric.', icon: 'salvage', recycle: { rubber_parts: 9, fabric: 9 },
    tags: ['recyclable'],
  },
  diving_goggles: {
    name: 'Diving Goggles', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 12 Rubber Parts.', icon: 'salvage', recycle: { rubber_parts: 12 }, tags: ['recyclable'],
  },
  dog_collar: {
    name: 'Dog Collar', type: 'valuable', rarity: 'rare', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 8 Fabric, 1 Metal Parts.', icon: 'salvage', recycle: { fabric: 8, metal_parts: 1 },
    tags: ['recyclable'],
  },
  expired_respirator: {
    name: 'Expired Respirator', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 8 Rubber Parts, 4 Fabric.', icon: 'salvage', recycle: { rubber_parts: 8, fabric: 4 },
    tags: ['recyclable'],
  },
  flow_controller: {
    name: 'Flow Controller', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 1 Advanced Mechanical Components, 1 Sensors.', icon: 'salvage',
    recycle: { advanced_mechanical_components: 1, sensors: 1 }, tags: ['recyclable'],
  },
  frequency_modulation_box: {
    name: 'Frequency Modulation Box', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 1 Advanced Electrical Components, 1 Speaker Component.', icon: 'salvage',
    recycle: { advanced_electrical_components: 1, speaker_component: 1 }, tags: ['recyclable'],
  },
  fried_motherboard: {
    name: 'Fried Motherboard', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 5 Plastic Parts, 2 Electrical Components.', icon: 'salvage',
    recycle: { plastic_parts: 5, electrical_components: 2 }, tags: ['recyclable'],
  },
  frying_pan: {
    name: 'Frying Pan', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 8 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  garlic_press: {
    name: 'Garlic Press', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 12 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 12 }, tags: ['recyclable'],
  },
  geiger_counter: {
    name: 'Geiger Counter', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 3500,
    desc: 'Salvage. Recycles into 3 Battery, 1 Exodos Modules.', icon: 'salvage', recycle: { battery: 3, exodos_modules: 1 },
    tags: ['recyclable'],
  },
  headphones: {
    name: 'Headphones', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 7 Rubber Parts, 1 Speaker Component.', icon: 'salvage',
    recycle: { rubber_parts: 7, speaker_component: 1 }, tags: ['recyclable'],
  },
  household_cleaner: {
    name: 'Household Cleaner', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 11 Chemicals.', icon: 'salvage', recycle: { chemicals: 11 }, tags: ['recyclable'],
  },
  humidifier: {
    name: 'Humidifier', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 2 Canister, 2 Wires.', icon: 'salvage', recycle: { canister: 2, wires: 2 }, tags: ['recyclable'],
  },
  ice_cream_scooper: {
    name: 'Ice Cream Scooper', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 7 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 7 }, tags: ['recyclable'],
  },
  industrial_charger: {
    name: 'Industrial Charger', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 5 Metal Parts, 1 Voltage Converter.', icon: 'salvage',
    recycle: { metal_parts: 5, voltage_converter: 1 }, tags: ['recyclable'],
  },
  industrial_magnet: {
    name: 'Industrial Magnet', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 4 Metal Parts, 2 Magnet.', icon: 'salvage', recycle: { metal_parts: 4, magnet: 2 },
    tags: ['recyclable'],
  },
  ion_sputter: {
    name: 'Ion Sputter', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 6000,
    desc: 'Salvage. Recycles into 4 Voltage Converter, 1 Exodos Modules.', icon: 'salvage',
    recycle: { voltage_converter: 4, exodos_modules: 1 }, tags: ['recyclable'],
  },
  laboratory_reagents: {
    name: 'Laboratory Reagents', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 16 Chemicals, 3 Crude Explosives.', icon: 'salvage', recycle: { chemicals: 16, crude_explosives: 3 },
    tags: ['recyclable'],
  },
  magnetron: {
    name: 'Magnetron', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 6000,
    desc: 'Salvage. Recycles into 1 Magnetic Accelerator, 1 Steel Spring.', icon: 'salvage',
    recycle: { magnetic_accelerator: 1, steel_spring: 1 }, tags: ['recyclable'],
  },
  metal_brackets: {
    name: 'Metal Brackets', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 8 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  microscope: {
    name: 'Microscope', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 1 Advanced Mechanical Components, 3 Magnet.', icon: 'salvage',
    recycle: { advanced_mechanical_components: 1, magnet: 3 }, tags: ['recyclable'],
  },
  mini_centrifuge: {
    name: 'Mini Centrifuge', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 1 Advanced Mechanical Components, 2 Canister.', icon: 'salvage',
    recycle: { advanced_mechanical_components: 1, canister: 2 }, tags: ['recyclable'],
  },
  number_plate: {
    name: 'Number Plate', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 270,
    desc: 'Salvage. Recycles into 3 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 3 }, tags: ['recyclable'],
  },
  polluted_air_filter: {
    name: 'Polluted Air Filter', type: 'valuable', rarity: 'rare', weight: 0.8, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 6 Fabric, 2 Oil.', icon: 'salvage', recycle: { fabric: 6, oil: 2 }, tags: ['recyclable'],
  },
  portable_tv: {
    name: 'Portable TV', type: 'valuable', rarity: 'rare', weight: 3, stack: 1, value: 2000,
    desc: 'Salvage. Recycles into 2 Battery, 6 Wires.', icon: 'salvage', recycle: { battery: 2, wires: 6 }, tags: ['recyclable'],
  },
  power_bank: {
    name: 'Power Bank', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 2 Battery, 2 Wires.', icon: 'salvage', recycle: { battery: 2, wires: 2 }, tags: ['recyclable'],
  },
  projector: {
    name: 'Projector', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 2 Wires, 1 Processor.', icon: 'salvage', recycle: { wires: 2, processor: 1 }, tags: ['recyclable'],
  },
  radio: {
    name: 'Radio', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 1 Speaker Component, 1 Sensors.', icon: 'salvage', recycle: { speaker_component: 1, sensors: 1 },
    tags: ['recyclable'],
  },
  radio_relay: {
    name: 'Radio Relay', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 2 Speaker Component, 2 Sensors.', icon: 'salvage', recycle: { speaker_component: 2, sensors: 2 },
    tags: ['recyclable'],
  },
  remote_control: {
    name: 'Remote Control', type: 'valuable', rarity: 'rare', weight: 0.8, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 7 Plastic Parts, 1 Sensors.', icon: 'salvage', recycle: { plastic_parts: 7, sensors: 1 },
    tags: ['recyclable'],
  },
  ripped_safety_vest: {
    name: 'Ripped Safety Vest', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 1 Durable Cloth, 1 Magnet.', icon: 'salvage', recycle: { durable_cloth: 1, magnet: 1 },
    tags: ['recyclable'],
  },
  rocket_thruster: {
    name: 'Rocket Thruster', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 2 Synthesized Fuel, 6 Metal Parts.', icon: 'salvage',
    recycle: { synthesized_fuel: 2, metal_parts: 6 }, tags: ['recyclable'],
  },
  rotary_encoder: {
    name: 'Rotary Encoder', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 2 Electrical Components, 2 Processor.', icon: 'salvage',
    recycle: { electrical_components: 2, processor: 2 }, tags: ['recyclable'],
  },
  rubber_pad: {
    name: 'Rubber Pad', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 18 Rubber Parts.', icon: 'salvage', recycle: { rubber_parts: 18 }, tags: ['recyclable'],
  },
  ruined_accordion: {
    name: 'Ruined Accordion', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 18 Rubber Parts, 3 Steel Spring.', icon: 'salvage', recycle: { rubber_parts: 18, steel_spring: 3 },
    tags: ['recyclable'],
  },
  ruined_augment: {
    name: 'Ruined Augment', type: 'valuable', rarity: 'common', weight: 3, stack: 1, value: 270,
    desc: 'Salvage. Recycles into 2 Plastic Parts, 2 Rubber Parts.', icon: 'salvage', recycle: { plastic_parts: 2, rubber_parts: 2 },
    tags: ['recyclable'],
  },
  ruined_baton: {
    name: 'Ruined Baton', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 6 Metal Parts, 3 Rubber Parts.', icon: 'salvage', recycle: { metal_parts: 6, rubber_parts: 3 },
    tags: ['recyclable'],
  },
  ruined_handcuffs: {
    name: 'Ruined Handcuffs', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 8 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  ruined_parachute: {
    name: 'Ruined Parachute', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 10 Fabric.', icon: 'salvage', recycle: { fabric: 10 }, tags: ['recyclable'],
  },
  ruined_riot_shield: {
    name: 'Ruined Riot Shield', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 10 Plastic Parts, 6 Rubber Parts.', icon: 'salvage', recycle: { plastic_parts: 10, rubber_parts: 6 },
    tags: ['recyclable'],
  },
  ruined_tactical_vest: {
    name: 'Ruined Tactical Vest', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 5 Fabric, 1 Magnet.', icon: 'salvage', recycle: { fabric: 5, magnet: 1 }, tags: ['recyclable'],
  },
  rusted_bolts: {
    name: 'Rusted Bolts', type: 'valuable', rarity: 'uncommon', weight: 0.8, stack: 3, value: 640,
    desc: 'Salvage. Recycles into 8 Metal Parts.', icon: 'salvage', recycle: { metal_parts: 8 }, tags: ['recyclable'],
  },
  rusted_gear: {
    name: 'Rusted Gear', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 4 Metal Parts, 2 Mechanical Components.', icon: 'salvage',
    recycle: { metal_parts: 4, mechanical_components: 2 }, tags: ['recyclable'],
  },
  rusted_shut_medical_kit: {
    name: 'Rusted Shut Medical Kit', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 2 Syringe, 1 Antiseptic.', icon: 'salvage', recycle: { syringe: 2, antiseptic: 1 },
    tags: ['recyclable'],
  },
  rusted_tools: {
    name: 'Rusted Tools', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 8 Metal Parts, 1 Steel Spring.', icon: 'salvage', recycle: { metal_parts: 8, steel_spring: 1 },
    tags: ['recyclable'],
  },
  sample_cleaner: {
    name: 'Sample Cleaner', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 2 Electrical Components, 14 Assorted Seeds.', icon: 'salvage',
    recycle: { electrical_components: 2, assorted_seeds: 14 }, tags: ['recyclable'],
  },
  signal_amplifier: {
    name: 'Signal Amplifier', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 2 Electrical Components, 2 Voltage Converter.', icon: 'salvage',
    recycle: { electrical_components: 2, voltage_converter: 2 }, tags: ['recyclable'],
  },
  spectrometer: {
    name: 'Spectrometer', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 1 Advanced Electrical Components, 1 Sensors.', icon: 'salvage',
    recycle: { advanced_electrical_components: 1, sensors: 1 }, tags: ['recyclable'],
  },
  spectrum_analyzer: {
    name: 'Spectrum Analyzer', type: 'valuable', rarity: 'epic', weight: 1.5, stack: 3, value: 3500,
    desc: 'Salvage. Recycles into 1 Sensors, 1 Exodos Modules.', icon: 'salvage', recycle: { sensors: 1, exodos_modules: 1 },
    tags: ['recyclable'],
  },
  spring_cushion: {
    name: 'Spring Cushion', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 2 Durable Cloth, 2 Steel Spring.', icon: 'salvage', recycle: { durable_cloth: 2, steel_spring: 2 },
    tags: ['recyclable'],
  },
  telemetry_transceiver: {
    name: 'Telemetry Transceiver', type: 'valuable', rarity: 'rare', weight: 1.5, stack: 3, value: 3000,
    desc: 'Salvage. Recycles into 1 Advanced Electrical Components, 1 Processor.', icon: 'salvage',
    recycle: { advanced_electrical_components: 1, processor: 1 }, tags: ['recyclable'],
  },
  thermostat: {
    name: 'Thermostat', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 7 Rubber Parts, 1 Sensors.', icon: 'salvage', recycle: { rubber_parts: 7, sensors: 1 },
    tags: ['recyclable'],
  },
  toaster: {
    name: 'Toaster', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 5 Plastic Parts, 3 Wires.', icon: 'salvage', recycle: { plastic_parts: 5, wires: 3 },
    tags: ['recyclable'],
  },
  torn_blanket: {
    name: 'Torn Blanket', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 640, desc: 'Salvage. Recycles into 12 Fabric.',
    icon: 'salvage', recycle: { fabric: 12 }, tags: ['recyclable'],
  },
  turbo_pump: {
    name: 'Turbo Pump', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 1 Mechanical Components, 3 Oil.', icon: 'salvage', recycle: { mechanical_components: 1, oil: 3 },
    tags: ['recyclable'],
  },
  unusable_weapon: {
    name: 'Unusable Weapon', type: 'valuable', rarity: 'rare', weight: 3, stack: 3, value: 2000,
    desc: 'Salvage. Recycles into 4 Metal Parts, 5 Simple Gun Parts.', icon: 'salvage',
    recycle: { metal_parts: 4, simple_gun_parts: 5 }, tags: ['recyclable'],
  },
  water_filter: {
    name: 'Water Filter', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 2 Rubber Parts, 3 Canister.', icon: 'salvage', recycle: { rubber_parts: 2, canister: 3 },
    tags: ['recyclable'],
  },
  water_pump: {
    name: 'Water Pump', type: 'valuable', rarity: 'rare', weight: 2, stack: 3, value: 1000,
    desc: 'Salvage. Recycles into 4 Metal Parts, 2 Oil.', icon: 'salvage', recycle: { metal_parts: 4, oil: 2 }, tags: ['recyclable'],
  },

  // ======================================================================
  // Trinkets
  // ======================================================================
  leviathons_crown_ship_model: {
    name: '"Leviathon\'s Crown" Ship Model', type: 'trinket', rarity: 'legendary', weight: 0.5, stack: 1, value: 10000,
    desc: 'A majestic model merchant ship. Collectors pay a fortune.', icon: 'trinket', tags: ['trinket'],
  },
  sirena_dorada_ship_model: {
    name: '"Sirena Dorada" Ship Model', type: 'trinket', rarity: 'epic', weight: 0.5, stack: 3, value: 7000,
    desc: 'A gleaming model yacht from sunnier days.', icon: 'trinket', tags: ['trinket'],
  },
  twilite_compass_ship_model: {
    name: '"Twilite Compass" Ship Model', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 5, value: 1000,
    desc: 'A spirited two-master model ship.', icon: 'trinket', tags: ['trinket'],
  },
  velossity_ship_model: {
    name: '"Velossity" Ship Model', type: 'trinket', rarity: 'rare', weight: 0.5, stack: 3, value: 3000,
    desc: 'A sleek racing-hull model.', icon: 'trinket', tags: ['trinket'],
  },
  wynd_sprite_ship_model: {
    name: '"Wynd Sprite" Ship Model', type: 'trinket', rarity: 'common', weight: 0.5, stack: 10, value: 1000,
    desc: 'A cheap but cheerful model sailboat.', icon: 'trinket', tags: ['trinket'],
  },
  air_freshener: {
    name: 'Air Freshener', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 5, value: 2000,
    desc: 'Still smells faintly of pine.', icon: 'trinket', tags: ['trinket'],
  },
  alien_duck: {
    name: 'Alien Duck', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 15, value: 1000, desc: 'A rubber duck with antennae.',
    icon: 'trinket', tags: ['trinket'],
  },
  arcade_duck: {
    name: 'Arcade Duck', type: 'trinket', rarity: 'epic', weight: 0.3, stack: 15, value: 7000, desc: 'A pixel-art rubber duck prize.',
    icon: 'trinket', tags: ['trinket'],
  },
  bloated_tuna_can: {
    name: 'Bloated Tuna Can', type: 'trinket', rarity: 'common', weight: 0.2, stack: 15, value: 1000,
    desc: 'Do not open. Somebody will still buy it.', icon: 'trinket', tags: ['trinket'],
  },
  breathtaking_snow_globe: {
    name: 'Breathtaking Snow Globe', type: 'trinket', rarity: 'epic', weight: 0.2, stack: 1, value: 7000,
    desc: 'A pristine snow globe of a city that no longer exists.', icon: 'trinket', tags: ['trinket'],
  },
  bronze_statuette: {
    name: 'Bronze Statuette', type: 'trinket', rarity: 'legendary', weight: 0.5, stack: 25, value: 10000,
    desc: 'A heavy bronze figure of considerable age.', icon: 'trinket', tags: ['trinket'],
  },
  burnt_out_candles: {
    name: 'Burnt-Out Candles', type: 'trinket', rarity: 'common', weight: 0.2, stack: 15, value: 640, desc: 'Stubs of old candles.',
    icon: 'trinket', tags: ['trinket'],
  },
  cat_bed: {
    name: 'Cat Bed', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 3, value: 1000,
    desc: 'A cosy cat bed. Scrappie has opinions about it.', icon: 'trinket', tags: ['trinket'],
  },
  coffee_pot: {
    name: 'Coffee Pot', type: 'trinket', rarity: 'common', weight: 0.3, stack: 3, value: 1000, desc: 'An old stovetop coffee pot.',
    icon: 'trinket', tags: ['trinket'],
  },
  colorful_shoes: {
    name: 'Colorful Shoes', type: 'trinket', rarity: 'rare', weight: 0.5, stack: 3, value: 3000,
    desc: 'A pair of loud, colourful sneakers.', icon: 'trinket', tags: ['trinket'],
  },
  dart_board: {
    name: 'Dart Board', type: 'trinket', rarity: 'uncommon', weight: 1, stack: 3, value: 2000, desc: 'A well-used dart board.',
    icon: 'trinket', tags: ['trinket'],
  },
  doodly_duck: {
    name: 'Doodly Duck', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 15, value: 3000,
    desc: 'A rubber duck covered in doodles.', icon: 'trinket', tags: ['trinket'],
  },
  elephant_obelisk: {
    name: 'Elephant Obelisk', type: 'trinket', rarity: 'legendary', weight: 0.5, stack: 1, value: 10000,
    desc: 'An ornate carved elephant obelisk.', icon: 'trinket', tags: ['trinket'],
  },
  empty_wine_bottle: {
    name: 'Empty Wine Bottle', type: 'trinket', rarity: 'common', weight: 0.2, stack: 5, value: 1000,
    desc: 'An empty bottle. Useful for juicing agave.', icon: 'trinket', tags: ['trinket'],
  },
  equatorial_sundial: {
    name: 'Equatorial Sundial', type: 'trinket', rarity: 'rare', weight: 0.5, stack: 3, value: 3000,
    desc: 'A brass equatorial sundial.', icon: 'trinket', tags: ['trinket'],
  },
  expired_pasta: {
    name: 'Expired Pasta', type: 'trinket', rarity: 'common', weight: 0.1, stack: 15, value: 1000,
    desc: 'A sealed packet of very old pasta.', icon: 'trinket', tags: ['trinket'],
  },
  faded_photograph: {
    name: 'Faded Photograph', type: 'trinket', rarity: 'common', weight: 0.3, stack: 15, value: 640,
    desc: 'Strangers smiling at a beach.', icon: 'trinket', tags: ['trinket'],
  },
  familiar_duck: {
    name: 'Familiar Duck', type: 'trinket', rarity: 'epic', weight: 0.3, stack: 15, value: 7000,
    desc: 'A rubber duck that looks oddly familiar.', icon: 'trinket', tags: ['trinket'],
  },
  film_reel: {
    name: 'Film Reel', type: 'trinket', rarity: 'rare', weight: 0.2, stack: 3, value: 2000, desc: 'A reel of pre-war film.',
    icon: 'trinket', tags: ['trinket'],
  },
  fine_wristwatch: {
    name: 'Fine Wristwatch', type: 'trinket', rarity: 'rare', weight: 0.2, stack: 3, value: 3000,
    desc: 'A luxury wristwatch, still ticking.', icon: 'trinket', tags: ['trinket'],
  },
  flashy_duck: {
    name: 'Flashy Duck', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 15, value: 3000, desc: 'A sequined rubber duck.',
    icon: 'trinket', tags: ['trinket'],
  },
  frosty_duck: {
    name: 'Frosty Duck', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 15, value: 3000, desc: 'A frosted-blue rubber duck.',
    icon: 'trinket', tags: ['trinket'],
  },
  gentle_duck: {
    name: 'Gentle Duck', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 15, value: 1000, desc: 'A soft, smiling rubber duck.',
    icon: 'trinket', tags: ['trinket'],
  },
  lantzs_mixtape_5th_edition: {
    name: 'Lantz\'s Mixtape (5th Edition)', type: 'trinket', rarity: 'epic', weight: 0.2, stack: 3, value: 10000,
    desc: 'A cassette of Lantz\'s favourite tracks. Fifth edition.', icon: 'trinket', tags: ['trinket'],
  },
  light_bulb: {
    name: 'Light Bulb', type: 'trinket', rarity: 'uncommon', weight: 0.2, stack: 3, value: 2000, desc: 'A working incandescent bulb.',
    icon: 'trinket', tags: ['trinket'],
  },
  mri_duck: {
    name: 'MRI Duck', type: 'trinket', rarity: 'legendary', weight: 0.3, stack: 15, value: 10000,
    desc: 'A rubber duck with an X-ray print. Extremely rare.', icon: 'trinket', tags: ['trinket'],
  },
  music_album: {
    name: 'Music Album', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000, desc: 'A vinyl record in its sleeve.',
    icon: 'trinket', tags: ['trinket'],
  },
  music_box: {
    name: 'Music Box', type: 'trinket', rarity: 'rare', weight: 0.4, stack: 3, value: 5000,
    desc: 'A wind-up music box that still plays.', icon: 'trinket', tags: ['trinket'],
  },
  painted_box: {
    name: 'Painted Box', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000, desc: 'A hand-painted wooden box.',
    icon: 'trinket', tags: ['trinket'],
  },
  playing_cards: {
    name: 'Playing Cards', type: 'trinket', rarity: 'rare', weight: 0.2, stack: 3, value: 5000,
    desc: 'A complete deck of vintage playing cards.', icon: 'trinket', tags: ['trinket'],
  },
  poster_of_natural_wonders: {
    name: 'Poster Of Natural Wonders', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000,
    desc: 'A poster of places nobody can visit any more.', icon: 'trinket', tags: ['trinket'],
  },
  pottery: {
    name: 'Pottery', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000, desc: 'A glazed clay pot.',
    icon: 'trinket', tags: ['trinket'],
  },
  red_coral_jewelry: {
    name: 'Red Coral Jewelry', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 5000,
    desc: 'A necklace of polished red coral.', icon: 'trinket', tags: ['trinket'],
  },
  rosary: {
    name: 'Rosary', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 2000, desc: 'A wooden rosary.', icon: 'trinket',
    tags: ['trinket'],
  },
  rubber_duck: {
    name: 'Rubber Duck', type: 'trinket', rarity: 'common', weight: 0.3, stack: 15, value: 1000, desc: 'A classic yellow rubber duck.',
    icon: 'trinket', tags: ['trinket'],
  },
  sextant: {
    name: 'Sextant', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 5, value: 2000, desc: 'A navigator\'s sextant.',
    icon: 'trinket', tags: ['trinket'],
  },
  silver_teaspoon_set: {
    name: 'Silver Teaspoon Set', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000,
    desc: 'A boxed set of silver teaspoons.', icon: 'trinket', tags: ['trinket'],
  },
  statuette: {
    name: 'Statuette', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000, desc: 'A small porcelain statuette.',
    icon: 'trinket', tags: ['trinket'],
  },
  tellurion: {
    name: 'Tellurion', type: 'trinket', rarity: 'epic', weight: 0.5, stack: 1, value: 7000,
    desc: 'A clockwork model of the sun, earth and moon.', icon: 'trinket', tags: ['trinket'],
  },
  torn_book: {
    name: 'Torn Book', type: 'trinket', rarity: 'common', weight: 0.3, stack: 5, value: 1000,
    desc: 'A paperback missing half its pages.', icon: 'trinket', tags: ['trinket'],
  },
  train_model: {
    name: 'Train Model', type: 'trinket', rarity: 'common', weight: 0.5, stack: 10, value: 1000, desc: 'A model locomotive.',
    icon: 'trinket', tags: ['trinket'],
  },
  tropical_duck: {
    name: 'Tropical Duck', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 15, value: 1000,
    desc: 'A rubber duck in a tiny grass skirt.', icon: 'trinket', tags: ['trinket'],
  },
  vase: {
    name: 'Vase', type: 'trinket', rarity: 'rare', weight: 0.3, stack: 3, value: 3000, desc: 'An intact decorative vase.',
    icon: 'trinket', tags: ['trinket'],
  },
  very_comfortable_pillow: {
    name: 'Very Comfortable Pillow', type: 'trinket', rarity: 'uncommon', weight: 0.3, stack: 3, value: 2000,
    desc: 'It really is very comfortable.', icon: 'trinket', tags: ['trinket'],
  },
  vintage_steering_wheel: {
    name: 'Vintage Steering Wheel', type: 'trinket', rarity: 'uncommon', weight: 0.5, stack: 5, value: 2000,
    desc: 'A wooden steering wheel from a classic car.', icon: 'trinket', tags: ['trinket'],
  },

  // ======================================================================
  // Quest items
  // ======================================================================
  celestas_journal: {
    name: 'Celesta\'s Journal', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A page from Celesta\'s personal journal.', icon: 'quest', tags: ['quest'],
  },
  moisture_meter: {
    name: 'Moisture Meter', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Soil moisture probe needed for the Speranzia gardens.', icon: 'quest', tags: ['quest'],
  },
  nutrient_meter: {
    name: 'Nutrient Meter', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Soil nutrient tester for the Speranzia gardens.', icon: 'quest', tags: ['quest'],
  },
  lidar_scanner: {
    name: 'LiDAR Scanner', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0, desc: 'A surveying LiDAR scanner.',
    icon: 'quest', tags: ['quest'],
  },
  esr_analyzer: {
    name: 'ESR Analyzer', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'An electron spin resonance analyser.', icon: 'quest', tags: ['quest'],
  },
  old_world_books: {
    name: 'Old World Books', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A bundle of pre-war books for the library.', icon: 'quest', tags: ['quest'],
  },
  possibly_toxic_plant: {
    name: 'Possibly Toxic Plant', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A plant sample that should be handled with gloves.', icon: 'quest', tags: ['quest'],
  },
  espresso_machine_parts: {
    name: 'Espresso Machine Parts', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'Parts to fix the best coffee machine underground.', icon: 'quest', tags: ['quest'],
  },
  stack_of_movie_tapes: {
    name: 'Stack Of Movie Tapes', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Old movie tapes for movie night.', icon: 'quest', tags: ['quest'],
  },
  dusty_film_reel: {
    name: 'Dusty Film Reel', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'A dusty film reel with unknown footage.', icon: 'quest', tags: ['quest'],
  },
  precision_gimbal: {
    name: 'Precision Gimbal', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'A camera gimbal with precision bearings.', icon: 'quest', tags: ['quest'],
  },
  experimental_seed_sample: {
    name: 'Experimental Seed Sample', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'Sealed vial of engineered seeds.', icon: 'quest', tags: ['quest'],
  },
  first_wave_compass: {
    name: 'First Wave Compass', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A compass carried during the First Wave.', icon: 'quest', tags: ['quest'],
  },
  first_wave_rations: {
    name: 'First Wave Rations', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'Ration packs from the First Wave.', icon: 'quest', tags: ['quest'],
  },
  first_wave_tape: {
    name: 'First Wave Tape', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'An audio tape recorded during the First Wave.', icon: 'quest', tags: ['quest'],
  },
  raider_flag: {
    name: 'Raider Flag', type: 'quest', rarity: 'common', weight: 0.25, stack: 1, value: 0,
    desc: 'A Raider flag to plant at a contested landmark.', icon: 'quest', tags: ['quest'],
  },
  scout_patrol_note: {
    name: 'Scout Patrol Note', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Hand-written notes left by a scout patrol.', icon: 'quest', tags: ['quest'],
  },
  official_shutdown_documentation: {
    name: 'Official Shutdown Documentation', type: 'quest', rarity: 'common', weight: 0.5, stack: 1, value: 0,
    desc: 'Paperwork describing an old facility shutdown.', icon: 'quest', tags: ['quest'],
  },

  // ======================================================================
  // Blueprints (bpWeight 1..10: higher = more common in loot)
  // ======================================================================
  angled_grip_ii_blueprint: {
    name: 'Angled Grip II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Angled Grip II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_angled_grip_ii', bpWeight: 7,
  },
  angled_grip_iii_blueprint: {
    name: 'Angled Grip III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Angled Grip III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_angled_grip_iii', bpWeight: 6,
  },
  anvill_blueprint: {
    name: 'Anvill Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Anvill recipe (Gunsmith I).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_anvill', bpWeight: 7,
  },
  afelion_blueprint: {
    name: 'Afelion Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Afelion recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_afelion', bpWeight: 3,
  },
  barricade_kit_blueprint: {
    name: 'Barricade Kit Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Barricade Kit recipe (Utility Station I).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_barricade_kit', bpWeight: 7,
  },
  betina_blueprint: {
    name: 'Betina Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Betina recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_betina', bpWeight: 4,
  },
  blaze_grenade_blueprint: {
    name: 'Blaze Grenade Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Blaze Grenade recipe (Explosives Station III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_blaze_grenade', bpWeight: 6,
  },
  blue_light_stick_blueprint: {
    name: 'Blue Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Blue Light Stick recipe (Utility Station I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_blue_light_stick', bpWeight: 8,
  },
  bobkat_blueprint: {
    name: 'Bobkat Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Bobkat recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_bobkat', bpWeight: 4,
  },
  burleta_blueprint: {
    name: 'Burleta Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Burleta recipe (Gunsmith I).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_burleta', bpWeight: 7,
  },
  canta_blueprint: {
    name: 'Canta Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Canta recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_canta', bpWeight: 5,
  },
  combat_mk_3_aggressive_blueprint: {
    name: 'Combat Mk. 3 (Aggressive) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Combat Mk. 3 (Aggressive) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_combat_mk_3_aggressive', bpWeight: 4,
  },
  combat_mk_3_flanking_blueprint: {
    name: 'Combat Mk. 3 (Flanking) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Combat Mk. 3 (Flanking) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_combat_mk_3_flanking', bpWeight: 4,
  },
  compensator_ii_blueprint: {
    name: 'Compensator II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Compensator II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_compensator_ii', bpWeight: 7,
  },
  compensator_iii_blueprint: {
    name: 'Compensator III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Compensator III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_compensator_iii', bpWeight: 6,
  },
  complex_gun_parts_blueprint: {
    name: 'Complex Gun Parts Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Complex Gun Parts recipe (Refiner III).', icon: 'blueprint',
    tags: ['blueprint', 'material'], blueprint: 'craft_complex_gun_parts', bpWeight: 4,
  },
  dedline_blueprint: {
    name: 'Dedline Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Dedline recipe (Explosives Station III).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_dedline', bpWeight: 4,
  },
  defibrillator_blueprint: {
    name: 'Defibrillator Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Defibrillator recipe (Medical Lab II).', icon: 'blueprint',
    tags: ['blueprint', 'consumable'], blueprint: 'craft_defibrillator', bpWeight: 6,
  },
  dolabre_blueprint: {
    name: 'Dolabre Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Dolabre recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_dolabre', bpWeight: 3,
  },
  equaliser_blueprint: {
    name: 'Equaliser Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Equaliser recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_equaliser', bpWeight: 3,
  },
  explosive_mine_blueprint: {
    name: 'Explosive Mine Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Explosive Mine recipe (Explosives Station III).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_explosive_mine', bpWeight: 6,
  },
  extended_barrel_ii_blueprint: {
    name: 'Extended Barrel II Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Barrel II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_barrel_ii', bpWeight: 6,
  },
  extended_barrel_iii_blueprint: {
    name: 'Extended Barrel III Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Barrel III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_barrel_iii', bpWeight: 4,
  },
  extended_light_mag_ii_blueprint: {
    name: 'Extended Light Mag II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Light Mag II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_light_mag_ii', bpWeight: 7,
  },
  extended_light_mag_iii_blueprint: {
    name: 'Extended Light Mag III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Light Mag III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_light_mag_iii', bpWeight: 6,
  },
  extended_medium_mag_ii_blueprint: {
    name: 'Extended Medium Mag II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Medium Mag II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_medium_mag_ii', bpWeight: 7,
  },
  extended_medium_mag_iii_blueprint: {
    name: 'Extended Medium Mag III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Medium Mag III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_medium_mag_iii', bpWeight: 6,
  },
  extended_shotgun_mag_ii_blueprint: {
    name: 'Extended Shotgun Mag II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Shotgun Mag II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_shotgun_mag_ii', bpWeight: 7,
  },
  extended_shotgun_mag_iii_blueprint: {
    name: 'Extended Shotgun Mag III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Extended Shotgun Mag III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_extended_shotgun_mag_iii', bpWeight: 6,
  },
  fireworks_box_blueprint: {
    name: 'Fireworks Box Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Fireworks Box recipe (Explosives Station II).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_fireworks_box', bpWeight: 6,
  },
  gas_mine_blueprint: {
    name: 'Gas Mine Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Gas Mine recipe (Explosives Station I).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_gas_mine', bpWeight: 8,
  },
  green_light_stick_blueprint: {
    name: 'Green Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Green Light Stick recipe (Utility Station I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_green_light_stick', bpWeight: 8,
  },
  heavy_gun_parts_blueprint: {
    name: 'Heavy Gun Parts Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Heavy Gun Parts recipe (Refiner II).', icon: 'blueprint',
    tags: ['blueprint', 'material'], blueprint: 'craft_heavy_gun_parts', bpWeight: 6,
  },
  hullkracker_blueprint: {
    name: 'Hullkracker Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Hullkracker recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'weapon'], blueprint: 'craft_hullkracker', bpWeight: 4,
  },
  el_torro_blueprint: {
    name: 'El Torro Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the El Torro recipe (Gunsmith I).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_el_torro', bpWeight: 7,
  },
  jolt_mine_blueprint: {
    name: 'Jolt Mine Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Jolt Mine recipe (Explosives Station II).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_jolt_mine', bpWeight: 6,
  },
  jupitor_blueprint: {
    name: 'Jupitor Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Jupitor recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_jupitor', bpWeight: 3,
  },
  light_gun_parts_blueprint: {
    name: 'Light Gun Parts Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Light Gun Parts recipe (Refiner II).', icon: 'blueprint',
    tags: ['blueprint', 'material'], blueprint: 'craft_light_gun_parts', bpWeight: 6,
  },
  lightweight_stock_blueprint: {
    name: 'Lightweight Stock Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Lightweight Stock recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_lightweight_stock', bpWeight: 4,
  },
  looting_mk_3_safekeeper_blueprint: {
    name: 'Looting Mk. 3 (Safekeeper) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Looting Mk. 3 (Safekeeper) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_looting_mk_3_safekeeper', bpWeight: 4,
  },
  looting_mk_3_survivor_blueprint: {
    name: 'Looting Mk. 3 (Survivor) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Looting Mk. 3 (Survivor) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_looting_mk_3_survivor', bpWeight: 4,
  },
  lure_grenade_blueprint: {
    name: 'Lure Grenade Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Lure Grenade recipe (Utility Station II).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_lure_grenade', bpWeight: 7,
  },
  medium_gun_parts_blueprint: {
    name: 'Medium Gun Parts Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Medium Gun Parts recipe (Refiner II).', icon: 'blueprint',
    tags: ['blueprint', 'material'], blueprint: 'craft_medium_gun_parts', bpWeight: 6,
  },
  muzzle_brake_ii_blueprint: {
    name: 'Muzzle Brake II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Muzzle Brake II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_muzzle_brake_ii', bpWeight: 7,
  },
  muzzle_brake_iii_blueprint: {
    name: 'Muzzle Brake III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Muzzle Brake III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_muzzle_brake_iii', bpWeight: 6,
  },
  ospray_blueprint: {
    name: 'Ospray Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Ospray recipe (Gunsmith II).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_ospray', bpWeight: 5,
  },
  padded_stock_blueprint: {
    name: 'Padded Stock Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Padded Stock recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'mod'],
    blueprint: 'craft_padded_stock', bpWeight: 4,
  },
  powered_descender_blueprint: {
    name: 'Powered Descender Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Powered Descender recipe (Utility Station III).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_powered_descender', bpWeight: 4,
  },
  pulse_mine_blueprint: {
    name: 'Pulse Mine Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Pulse Mine recipe (Explosives Station I).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_pulse_mine', bpWeight: 7,
  },
  raskal_blueprint: {
    name: 'Raskal Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Raskal recipe (Gunsmith II).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_raskal', bpWeight: 5,
  },
  red_light_stick_blueprint: {
    name: 'Red Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Red Light Stick recipe (Utility Station I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_red_light_stick', bpWeight: 8,
  },
  remote_raider_flare_blueprint: {
    name: 'Remote Raider Flare Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Remote Raider Flare recipe (Utility Station I).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_remote_raider_flare', bpWeight: 8,
  },
  seeker_grenade_blueprint: {
    name: 'Seeker Grenade Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Seeker Grenade recipe (Explosives Station I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_seeker_grenade', bpWeight: 7,
  },
  shotgun_choke_ii_blueprint: {
    name: 'Shotgun Choke II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Shotgun Choke II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_shotgun_choke_ii', bpWeight: 7,
  },
  shotgun_choke_iii_blueprint: {
    name: 'Shotgun Choke III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Shotgun Choke III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_shotgun_choke_iii', bpWeight: 6,
  },
  shotgun_silencer_blueprint: {
    name: 'Shotgun Silencer Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Shotgun Silencer recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_shotgun_silencer', bpWeight: 4,
  },
  showstoppa_blueprint: {
    name: 'Showstoppa Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Showstoppa recipe (Explosives Station III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_showstoppa', bpWeight: 6,
  },
  silencer_i_blueprint: {
    name: 'Silencer I Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Silencer I recipe (Gunsmith II).', icon: 'blueprint', tags: ['blueprint', 'mod'],
    blueprint: 'craft_silencer_i', bpWeight: 7,
  },
  silencer_ii_blueprint: {
    name: 'Silencer II Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Silencer II recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'mod'],
    blueprint: 'craft_silencer_ii', bpWeight: 6,
  },
  smoke_grenade_blueprint: {
    name: 'Smoke Grenade Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Smoke Grenade recipe (Utility Station II).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_smoke_grenade', bpWeight: 6,
  },
  snap_hook_blueprint: {
    name: 'Snap Hook Blueprint', type: 'blueprint', rarity: 'legendary', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Snap Hook recipe (Utility Station III).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_snap_hook', bpWeight: 3,
  },
  stable_stock_ii_blueprint: {
    name: 'Stable Stock II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Stable Stock II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_stable_stock_ii', bpWeight: 7,
  },
  stable_stock_iii_blueprint: {
    name: 'Stable Stock III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Stable Stock III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_stable_stock_iii', bpWeight: 6,
  },
  surge_coil_blueprint: {
    name: 'Surge Coil Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Surge Coil recipe (Explosives Station III).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_surge_coil', bpWeight: 6,
  },
  tactical_mk_3_defensive_blueprint: {
    name: 'Tactical Mk. 3 (Defensive) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Tactical Mk. 3 (Defensive) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_defensive', bpWeight: 4,
  },
  tactical_mk_3_healing_blueprint: {
    name: 'Tactical Mk. 3 (Healing) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Tactical Mk. 3 (Healing) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_healing', bpWeight: 4,
  },
  tactical_mk_3_revival_blueprint: {
    name: 'Tactical Mk. 3 (Revival) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Tactical Mk. 3 (Revival) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_revival', bpWeight: 4,
  },
  tactical_mk_3_smoke_blueprint: {
    name: 'Tactical Mk. 3 (Smoke) Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Tactical Mk. 3 (Smoke) recipe (Gear Bench III).', icon: 'blueprint',
    tags: ['blueprint', 'augment'], blueprint: 'craft_tactical_mk_3_smoke', bpWeight: 4,
  },
  tagging_grenade_blueprint: {
    name: 'Tagging Grenade Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Tagging Grenade recipe (Utility Station III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_tagging_grenade', bpWeight: 6,
  },
  tempesta_blueprint: {
    name: 'Tempesta Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Tempesta recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_tempesta', bpWeight: 4,
  },
  torrento_blueprint: {
    name: 'Torrento Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Torrento recipe (Gunsmith II).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_torrento', bpWeight: 5,
  },
  trailblazr_blueprint: {
    name: 'Trailblazr Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Trailblazr recipe (Explosives Station III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_trailblazr', bpWeight: 6,
  },
  trigga_nade_blueprint: {
    name: 'Trigga \'Nade Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Trigga \'Nade recipe (Explosives Station II).', icon: 'blueprint',
    tags: ['blueprint', 'trap'], blueprint: 'craft_trigga_nade', bpWeight: 6,
  },
  venattor_blueprint: {
    name: 'Venattor Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Venattor recipe (Gunsmith II).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_venattor', bpWeight: 5,
  },
  vertical_grip_ii_blueprint: {
    name: 'Vertical Grip II Blueprint', type: 'blueprint', rarity: 'uncommon', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Vertical Grip II recipe (Gunsmith II).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_vertical_grip_ii', bpWeight: 7,
  },
  vertical_grip_iii_blueprint: {
    name: 'Vertical Grip III Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Vertical Grip III recipe (Gunsmith III).', icon: 'blueprint',
    tags: ['blueprint', 'mod'], blueprint: 'craft_vertical_grip_iii', bpWeight: 6,
  },
  vyta_shot_blueprint: {
    name: 'Vyta Shot Blueprint', type: 'blueprint', rarity: 'rare', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Vyta Shot recipe (Medical Lab III).', icon: 'blueprint',
    tags: ['blueprint', 'consumable'], blueprint: 'craft_vyta_shot', bpWeight: 6,
  },
  vyta_spray_blueprint: {
    name: 'Vyta Spray Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Vyta Spray recipe (Medical Lab III).', icon: 'blueprint',
    tags: ['blueprint', 'consumable'], blueprint: 'craft_vyta_spray', bpWeight: 4,
  },
  volcano_blueprint: {
    name: 'Volcano Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Volcano recipe (Gunsmith III).', icon: 'blueprint', tags: ['blueprint', 'weapon'],
    blueprint: 'craft_volcano', bpWeight: 4,
  },
  white_flag_blueprint: {
    name: 'White Flag Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the White Flag recipe (Medical Lab I).', icon: 'blueprint',
    tags: ['blueprint', 'gadget'], blueprint: 'craft_white_flag', bpWeight: 8,
  },
  wulfpack_blueprint: {
    name: 'Wulfpack Blueprint', type: 'blueprint', rarity: 'epic', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Wulfpack recipe (Explosives Station III).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_wulfpack', bpWeight: 4,
  },
  yellow_light_stick_blueprint: {
    name: 'Yellow Light Stick Blueprint', type: 'blueprint', rarity: 'common', weight: 0, stack: 1, value: 5000,
    desc: 'Extract with it to permanently learn the Yellow Light Stick recipe (Utility Station I).', icon: 'blueprint',
    tags: ['blueprint', 'grenade'], blueprint: 'craft_yellow_light_stick', bpWeight: 8,
  },
};
