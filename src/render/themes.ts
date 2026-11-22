export interface Theme {
  name: string;
  bg: string;
  wall: number;
  wallJoint: number;
  plat: number;
  platTop: number;
  label: string;
}

/** One theme per 100 floors, cycling. All original palettes. */
export const THEMES: Theme[] = [
  {
    name: 'Pine Base',
    bg: '#16242f',
    wall: 0x3d5a4c,
    wallJoint: 0x2b4237,
    plat: 0x8c6a43,
    platTop: 0xc49a6c,
    label: '#2a1d10',
  },
  {
    name: 'Granite',
    bg: '#1f1f2b',
    wall: 0x5c5f6e,
    wallJoint: 0x45475a,
    plat: 0x8f939e,
    platTop: 0xc7cad1,
    label: '#1f1f2b',
  },
  {
    name: 'Glacier',
    bg: '#0f2740',
    wall: 0x5f8fb3,
    wallJoint: 0x46708f,
    plat: 0x9fd3f0,
    platTop: 0xe6f6ff,
    label: '#0f2740',
  },
  {
    name: 'Ember',
    bg: '#2a1212',
    wall: 0x7a3b2e,
    wallJoint: 0x5a2a20,
    plat: 0xd9792b,
    platTop: 0xffc15e,
    label: '#2a1212',
  },
  {
    name: 'Aurora',
    bg: '#120f2e',
    wall: 0x3b3486,
    wallJoint: 0x2b2566,
    plat: 0x5ee0b0,
    platTop: 0xb8ffe4,
    label: '#120f2e',
  },
  {
    name: 'Summit',
    bg: '#0a0d1a',
    wall: 0xbfc8d6,
    wallJoint: 0x939caf,
    plat: 0xf2f2f2,
    platTop: 0xffffff,
    label: '#0a0d1a',
  },
];

export const themeFor = (index: number): Theme => THEMES[index % THEMES.length];
