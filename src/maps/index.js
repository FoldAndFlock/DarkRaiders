// Map registry. Each map module default-exports:
// { id, name, size: [W, H], seed, base, cliff, conditions?, ambient?, build(world, rng) }
export const MAPS = {
  damn_grounds: () => import('./damn_grounds.js'),
  green_gate: () => import('./green_gate.js'),
  sandy_city: () => import('./sandy_city.js'),
  test_range: () => import('./test_range.js'),
};
export const MAP_LIST = [
  { id: 'damn_grounds', name: 'Damn Grounds', desc: 'A crumbling hydro dam above toxic swamps and research labs.' },
  { id: 'green_gate', name: 'Green Gate', desc: 'Forested mountain pass guarded by a colossal gate and its tunnels.' },
  { id: 'sandy_city', name: 'Sandy City', desc: 'An old town swallowed by desert dunes.' },
];
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev')) MAP_LIST.push({ id: 'test_range', name: 'Test Range', desc: 'Developer sandbox.' });
