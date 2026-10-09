import type { Theme } from '../types';

/** Vintage: vergilbtes Kartenpapier und sepiabraune Tinte. */
export const sepia: Theme = {
  id: 'sepia',
  colors: {
    paper: '#f2e6cc',
    ink: '#4b3621',
    land: '#ecdfc1',
    water: '#a9bcb4',
    green: '#d6cfa4',
    building: '#e0cfa9',
    roadMajor: '#5b4129',
    roadMinor: '#8a6a49',
  },
  greenOpacity: 0.9,
  buildingOpacity: 0.9,
  roadWidth: 1,
};
