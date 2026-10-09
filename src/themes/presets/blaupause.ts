import type { Theme } from '../types';

/** Monochrom blau: Blaupause mit hellen Linien. */
export const blaupause: Theme = {
  id: 'blaupause',
  colors: {
    paper: '#16365c',
    ink: '#e4edf7',
    land: '#1b3d66',
    water: '#122d4d',
    green: '#1e4570',
    building: '#22497a',
    roadMajor: '#eef4fb',
    roadMinor: '#9fb7d4',
  },
  greenOpacity: 1,
  buildingOpacity: 0.8,
  roadWidth: 0.95,
};
