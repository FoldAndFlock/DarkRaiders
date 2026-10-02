// Extraction point structures (cargo elevator, raider hatch, metro platform + train, airshaft lift):
//   createExtractModel(kind, x) -> { root: THREE.Object3D, update(dt, state, t, ctx) }  (visual + animation)
//   extractSolids(kind, x)      -> [[x0, z0, x1, z1, h, y0?], ...] collision boxes in the extract's local
//                                  frame (facing +z, origin = extract point), added by World.extract()
// States: 'idle' | 'called' | 'open' | 'gone' | 'offline'. x = the extract marker ({ kind, face, ... }).
// (Placeholder implementation - replaced by the detailed models.)
import * as THREE from '../../vendor/three.module.js';

export function extractSolids(kind, x) { return []; }

export function createExtractModel(kind, x) {
  return { root: new THREE.Group(), update() {} };
}
