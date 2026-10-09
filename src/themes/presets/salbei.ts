import type { Theme } from '../types';

/** Ruhiges Salbeigrün mit cremefarbenen Straßen. */
export const salbei: Theme = {
  id: 'salbei',
  colors: {
    paper: '#eef0e8',
    ink: '#2f3b30',
    land: '#c9d1bf',
    water: '#9eb3ad',
    green: '#b4c1a6',
    building: '#bdc6b2',
    roadMajor: '#fbfaf3',
    roadMinor: '#eceadf',
  },
  greenOpacity: 1,
  buildingOpacity: 1,
  roadWidth: 1.05,
};
