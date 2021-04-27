// @flow

const {makeEntity} = require('./makeEntity');
const {
  subtract, add, makeVector, vectorTheta, round, rotate, floor,
} = require('../utils/vectors');
const {
  thetaToDir,
} = require('../utils/helpers');
const {
  getAntSpriteAndOffset, getInterpolatedIndex,
} = require('../selectors/sprites');
const {getFrame} = require('../simulation/actionQueue');
const {renderAgent} = require('../render/renderAgent');
const globalConfig = require('../config');

const config = {
  width: 2,
  height: 2,
  age: 0,

  // agent properties
  isAgent: true,
  blockingTypes: [
    'DOODAD', 'WALL', 'DOOR', 'GATE',
  ],

  isHistorical: true,
  pheromoneEmitter: true,


  // action params
  MOVE: {
    duration: 10,
    spriteOrder: [0, 1],
    maxFrameOffset: 2,
    frameStep: 2,
  },
  WAIT: {
    duration: 10,
    spriteOrder: [1, 2],
  },
  // MOVE_TURN: {
  //   duration: 12,
  //   spriteOrder: [1, 2],
  //   maxFrameOffset: 2,
  //   frameStep: 2,
  // },
  TURN: {
    duration: 6,
    spriteOrder: [0, 1, 2],
  },
  TIME_TRAVEL: {
    duration: 10,
    spriteOrder: [1, 2, 3, 4],
  },
  DIE: {
    duration: 10,
    spriteOrder: [8],
  },
};

const make = (
  game: Game,
	position: Vector,
): Agent => {
	const agent = {
		...makeEntity(
      'AGENT', position,
      config.width, config.height,
    ),
    ...config,
		playerID: 1,
    holdingTimeMachine: false,
    pheromoneType: 'LIGHT_' + game.AGENT.length,
    quantity: globalConfig.pheromones['LIGHT_' + game.AGENT.length].quantity,
    actions: [],

    // this frame offset allows iterating through spritesheets across
    // multiple actions (rn only used by queen ant doing one full walk
    // cycle across two MOVE actions)
    frameOffset: 0,
    timeOnMove: 0, // for turning in place
	};

  return agent;
};

const render = (ctx, game: Game, agent: Agent): void => {
  renderAgent(ctx, game, agent, spriteRenderFn, true /* no rotate */);
}

const spriteRenderFn = (ctx, game, agent) => {
  const img = game.sprites.CHARACTER;

  ctx.save();
  if (game.controlledEntity == null || game.controlledEntity.id != agent.id) {
    ctx.globalAlpha = 0.5;
  }

  const obj = {
    x: 0,
    y: 0,
    width: 90,
    height: 90,
  };
  const dir = thetaToDir(agent.theta);
  if (dir == 'right') {
    obj.y = obj.height * 1;
  } else if (dir == 'down') {
    obj.y = obj.height * 2;
  } else if (dir == 'up') {
    obj.y = obj.height * 3;
  }

  const index = getInterpolatedIndex(game, agent);
  const frame = getFrame(game, agent, index);
  obj.x = frame * obj.width;
  // if (dir == 'left' || dir == 'right') {
  //   obj.x *= 2;
  // }

  ctx.drawImage(
    img,
    obj.x, obj.y, obj.width, obj.height,
    0, 0, agent.width, agent.height,
  );
  ctx.restore();
}

module.exports = {
  make, render, config,
};
