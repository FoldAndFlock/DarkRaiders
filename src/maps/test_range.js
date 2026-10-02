// Small sandbox map for development / smoke tests.
export default {
  id: 'test_range', name: 'Test Range', size: [256, 256], seed: 7, base: 'grass', cliff: 'rock',
  conditions: ['night_raid'],
  build(w, rng) {
    w.noiseHills(3, 60, 3, (x, z) => (x > 60 && x < 200 && z > 60 && z < 200) ? 0 : 1);
    w.raisePoly([[180, 20], [240, 20], [245, 90], [190, 80]], 6, 0, 'max');           // plateau w/ cliff edge
    w.ramp(182, 80, 192, 96, 6, 0.3, 'z');
    w.paintPoly('rock', [[180, 20], [240, 20], [245, 90], [190, 80]]);
    w.raiseCircle(70, 190, 26, -2.2, 0.4, 'add');                                     // pond basin
    w.water(40, 160, 100, 220, { level: -0.6 });
    w.road([[0, 130], [80, 128], [140, 132], [256, 126]], 7, 'asphalt');
    w.road([[128, 0], [130, 60], [128, 128]], 6, 'asphalt');
    w.paint('concrete', 90, 70, 170, 120);
    w.building({ x: 96, z: 74, w: 18, d: 12, storeys: 2, wall: 'brick', floor: 'tiles', roof: 'roofTar', name: 'Depot',
      doors: [{ side: 's', at: 3, w: 1.8 }, { side: 's', at: 10, w: 2.4, sill: 1 }, { side: 'e', at: 4, w: 1.6, door: true }],
      inner: [[9, 0, 9, 7, [{ at: 4, w: 1.4 }]]] });
    w.building({ x: 124, z: 76, w: 12, d: 10, wall: 'concrete', floor: 'wood', roof: 'corrugated', name: 'Shed',
      doors: [{ side: 'w', at: 3, w: 1.6 }, { side: 's', at: 2, w: 3, sill: 1 }] });
    w.building({ x: 142, z: 96, w: 14, d: 10, wall: 'plaster', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', name: 'House',
      doors: [{ side: 'n', at: 5, w: 1.6 }] });
    // rotated footprint (engine test): doors, inner wall and local-frame container rotate with it
    w.building({ x: 166, z: 70, w: 14, d: 10, rot: 0.55, storeys: 2, wall: 'plaster', tint: 0xf0d8b0, floor: 'tiles', roof: 'roofTile', roofShape: 'gable', name: 'Leaning House',
      doors: [{ side: 's', at: 2, w: 1.6, door: true }, { side: 'n', at: 9, w: 2.4, sill: 1 }], inner: [[7, 0, 7, 10, [{ at: 5, w: 1.4 }]]],
      containers: [['cabinet', 2, 1.2, 0, { tier: 2 }], ['desk', 11, 7, 0]] });
    // multi-level test area: 2 storeys + stairs + roof ladder, an underground tunnel with a stairwell and
    // a metro platform, and a bridge you can walk on and under
    w.building({ x: 186, z: 96, w: 14, d: 10, storeys: 2, wall: 'brick', floor: 'wood', roof: 'roofTar', name: 'Two-Storey House',
      doors: [{ side: 's', at: 2, w: 1.6, door: true }, { side: 'w', at: 4, w: 2, sill: 1 }, { side: 's', at: 7, w: 2, sill: 1, storey: 1 }, { side: 'n', at: 3, w: 2, sill: 1, storey: 1 }],
      inner: [[7, 0, 7, 6, [{ at: 2, w: 1.4 }], 1]],
      stairs: [{ x: 11.6, z: 1.6, w: 1.6, dir: 's', from: 0, to: 1 }],
      ladders: [{ side: 'e', at: 7.5 }],
      containers: [['cabinet', 3, 2, 0, { storey: 1, tier: 2 }], ['desk', 5, 8, 0, { storey: 1 }], ['locker', 2, 8, 0]] });
    w.building({ x: 204, z: 36, w: 36, d: 13, under: 5, wall: 'concrete', floor: 'concrete', roof: 'grass', name: 'Test Tunnel',
      stairs: [{ x: 1.2, z: 9.6, w: 2.2, dir: 'w', from: 0, to: 'top' }],
      containers: [['crate', 33, 11], ['ammo_box', 30, 11.5]] });   // clear of the metro platform (world x 214-230)
    // metro platform: face PI puts the track along the far (north) wall, train doors toward the camera
    w.extract('test_metro', 'Test Metro', 222, 44.5, { kind: 'metro', face: Math.PI });
    w.bridge([[150, 150], [190, 150]], 4, 5);
    w.ladder(150.6, 152.6, null, 150.6, 150.5, 5, 0);
    w.keyRoom('depot_office', 105, 74, 114, 81, null);
    w.container('locker', 98, 76, 0, { tier: 1 }); w.container('weapon_case', 112, 76, 0, { tier: 2 });
    w.container('toolbox', 126, 78, 0); w.container('medical_bag', 150, 100, 0); w.container('trash', 120, 110, 0);
    w.container('arc_crate', 200, 40, 0, { tier: 2 }); w.container('car_trunk', 60, 126, 0);
    w.prop('car', 60, 128, 1.5, { solid: true }); w.prop('car', 150, 131, 1.6, { solid: true });
    w.prop('sandbag', 128, 112, 0, { solid: true }); w.prop('sandbag', 132, 114, 0.3, { solid: true });
    w.prop('husk', 160, 160, 0.4, { solid: true });
    w.forest([[10, 10], [80, 10], [90, 60], [20, 90]], 2.2, ['pine', 'tree']);
    w.forest([[170, 150], [250, 150], [250, 250], [170, 240]], 1.6, ['tree', 'pine', 'deadTree']);
    w.scatter('rock', [0, 0, 256, 256], 60, { solid: true, avoid: (x, z) => x > 85 && x < 175 && z > 65 && z < 140 });
    w.scatter('debris', [90, 70, 170, 120], 20, {});
    w.lamp(92, 120, {}); w.lamp(170, 120, {}); w.lamp(128, 60, { color: 0xb0d0ff });
    w.poi('depot', 'Depot', 105, 80, 18); w.poi('plateau', 'Plateau', 212, 50, 25); w.poi('pond', 'Pond', 70, 190, 25);
    w.extract('north_lift', 'North Lift', 128, 12, { kind: 'elevator' });
    w.extract('pond_hatch', 'Pond Hatch', 110, 200, { kind: 'hatch' });
    w.extract('test_airshaft', 'Test Airshaft', 60, 104, { kind: 'airshaft' });   // sandbox: dropship extract
    w.spawnPoint(30, 128); w.spawnPoint(230, 128); w.spawnPoint(128, 240);
    w.arkSpawn('wasp', 150, 150, { count: 2, patrol: [[150, 150], [190, 120], [140, 100]] });
    w.arkSpawn('tick', 110, 90, { count: 2 });
    w.arkSpawn('hornet', 210, 50, {});
    w.arkSpawn('pop', 60, 60, { count: 3 });
    w.arkSpawn('turret', 214, 30, {});
    w.zone('Depot', [[90, 70], [170, 70], [170, 120], [90, 120]], { tier: 2 });
  },
};
