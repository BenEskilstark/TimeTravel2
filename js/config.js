// @flow

const config = {
  msPerTick: 16,

  canvasWidth: 1200,
  canvasHeight: 1200,

  viewWidth: 35,
  viewHeight: 35,
  useFullScreen: true,
  cellWidth: 35,
  cellHeight: 35,

  doorColors: [
    'steelblue',
    'purple',
    'red',
    'brown',
  ],

  audioFiles: [
    {path: 'audio/Song Oct. 9.wav', type: 'wav'},
  ],
};

const pheromoneBlockingTypes = [
  'WALL', 'DOODAD', 'DOOR',
];

const pheromones = {
  LIGHT: {
    quantity: 3,
    decayAmount: 1,
    color: 'rgb(155, 227, 90)',
    tileIndex: 0,

    blockingTypes: pheromoneBlockingTypes,
    blockingPheromones: [],
  },
};

module.exports = {config, pheromones};
