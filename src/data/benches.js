// DarkRaiders workshop: the crafting benches in Desperanza (upgrade costs per level) and Nugget, the workshop rooster.
// Pure data: no imports, no DOM. See docs/ARCHITECTURE.md for the schema. Names and flavour text are our own (parody tone).

export const BENCHES = {
  workbench: {
    name: 'Wobbly Table',
    desc: 'Free basic bench for starter weapons, ammo, bandages and light shields. One leg is shorter; we made peace with it.',
    levels: [{ level: 1, cost: {} }],
  },
  gunsmith: {
    name: 'Gun Garage',
    desc: 'Builds and upgrades weapons and weapon mods. Half the guns in here are "projects" that will be finished any day now.',
    levels: [
      { level: 1, cost: { metal_parts: 20, rubber_parts: 30 } },
      { level: 2, cost: { rusted_tools: 3, mechanical_components: 5, wazp_driver: 8 } },
      { level: 3, cost: { rusted_gear: 3, advanced_mechanical_components: 5, sentinal_firing_core: 4 } },
    ],
  },
  gear_bench: {
    name: 'Sewing Circle', desc: 'Crafts augments and shields. Gossip is the main output; the gear is a happy by-product.',
    levels: [
      { level: 1, cost: { plastic_parts: 25, fabric: 30 } },
      { level: 2, cost: { power_cable: 3, electrical_components: 5, hornett_driver: 5 } },
      { level: 3, cost: { industrial_battery: 3, advanced_electrical_components: 5, bastian_cell: 6 } },
    ],
  },
  medical_lab: {
    name: 'Medicine Cabinet',
    desc: 'Crafts bandages, shots, shield rechargers and defibrillators. Everything is expired, but beautifully organised.',
    levels: [
      { level: 1, cost: { fabric: 50, ark_alloy: 6 } },
      { level: 2, cost: { cracked_bioscanner: 2, durable_cloth: 5, tikk_pod: 8 } },
      { level: 3, cost: { rusted_shut_medical_kit: 3, antiseptic: 8, surveyr_vault: 5 } },
    ],
  },
  explosives_station: {
    name: 'Bad Idea Bench',
    desc: 'Crafts grenades, mines and other ordnance. Most great stories in Desperanza start here. Some of them end here too.',
    levels: [
      { level: 1, cost: { chemicals: 50, ark_alloy: 6 } },
      { level: 2, cost: { synthesized_fuel: 3, crude_explosives: 5, popp_trigger: 5 } },
      { level: 3, cost: { laboratory_reagents: 3, explosive_compound: 5, rocketier_driver: 3 } },
    ],
  },
  utility_station: {
    name: 'Junk Drawer',
    desc: 'Crafts gadgets, utility throwables and traversal tools. Nobody knows what half of it does, the bench included.',
    levels: [
      { level: 1, cost: { plastic_parts: 50, ark_alloy: 6 } },
      { level: 2, cost: { damaged_heat_sink: 2, electrical_components: 5, snytch_scanner: 6 } },
      { level: 3, cost: { fried_motherboard: 3, advanced_electrical_components: 5, leapr_pulse_unit: 4 } },
    ],
  },
  refiner: {
    name: 'The Upcycler',
    desc: 'Refines basic materials into components, gun parts and advanced parts. Turns trash into slightly fancier trash.',
    levels: [
      { level: 1, cost: { metal_parts: 60, ark_powercell: 5 } },
      { level: 2, cost: { toaster: 3, ark_motion_core: 5, fyreball_burner: 8 } },
      { level: 3, cost: { motor: 3, ark_circuitry: 10, bombardeer_cell: 6 } },
    ],
  },
};

// Nugget, the workshop rooster (export keeps its old SCRAPPY id for saves and code).
// yields = [itemId, min, max] per collection (min = short raid, max = 15+ min raid).
export const SCRAPPY = {
  name: 'Nugget',
  desc: 'Brings back dubiously sourced materials after every raid. Yields grow with your time topside (max at 15 min), and he '
    + 'downs tools after 5 uncollected raids: union rules. Nugget does not accept feedback.',
  capacityRaids: 5,
  levels: [
    {
      level: 1, cost: {},
      yields: [
        ['metal_parts', 3, 12],
        ['fabric', 3, 12],
        ['plastic_parts', 3, 12],
        ['chemicals', 3, 12],
        ['rubber_parts', 3, 12],
        ['assorted_seeds', 3, 5],
      ],
    },
    {
      level: 2, cost: { dog_collar: 1 },
      yields: [
        ['metal_parts', 3, 13],
        ['fabric', 3, 13],
        ['plastic_parts', 3, 13],
        ['chemicals', 3, 13],
        ['rubber_parts', 3, 13],
        ['assorted_seeds', 3, 7],
      ],
    },
    {
      level: 3, cost: { apricot: 3, lemon: 3 },
      yields: [
        ['metal_parts', 3, 14],
        ['fabric', 3, 14],
        ['plastic_parts', 3, 14],
        ['chemicals', 3, 14],
        ['rubber_parts', 3, 14],
        ['assorted_seeds', 3, 9],
      ],
    },
    {
      level: 4, cost: { olives: 6, prickly_pear: 6, cat_bed: 1 },
      yields: [
        ['metal_parts', 3, 15],
        ['fabric', 3, 15],
        ['plastic_parts', 3, 15],
        ['chemicals', 3, 15],
        ['rubber_parts', 3, 15],
        ['assorted_seeds', 3, 11],
      ],
    },
    {
      level: 5, cost: { apricot: 12, mushroom: 12, very_comfortable_pillow: 3 },
      yields: [
        ['metal_parts', 3, 16],
        ['fabric', 3, 16],
        ['plastic_parts', 3, 16],
        ['chemicals', 3, 16],
        ['rubber_parts', 3, 16],
        ['assorted_seeds', 3, 13],
      ],
    },
  ],
};
