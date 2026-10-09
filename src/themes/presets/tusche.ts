import type { Theme } from '../types';

/** Schwarz-weiß: reine Tuschezeichnung. */
export const tusche: Theme = {
  id: 'tusche',
  colors: {
    paper: '#ffffff',
    ink: '#000000',
    land: '#ffffff',
    water: '#e6e6e6',
    green: '#f2f2f2',
    building: '#ededed',
    roadMajor: '#000000',
    roadMinor: '#2b2b2b',
  },
  greenOpacity: 1,
  buildingOpacity: 1,
  roadWidth: 0.9,
};
