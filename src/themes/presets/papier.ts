import type { Theme } from '../types';

/** Minimalistisch hell: warmes Papier, tiefschwarze Straßen. */
export const papier: Theme = {
  id: 'papier',
  colors: {
    paper: '#fbfaf6',
    ink: '#1d1c1a',
    land: '#f4f2ec',
    water: '#d3dbe0',
    green: '#e2e6d7',
    building: '#e6e2d9',
    roadMajor: '#1d1c1a',
    roadMinor: '#5a5752',
  },
  greenOpacity: 1,
  buildingOpacity: 1,
  roadWidth: 1,
};
