// @flow

const {makeEntity} = require('./makeEntity');
const {
  subtract, add, makeVector, vectorTheta, round, rotate, floor,
} = require('../utils/vectors');
const {
  getAntSpriteAndOffset
} = require('../selectors/sprites');
const {renderAgent} = require('../render/renderAgent');
const globalConfig = require('../config');

const config = {
  width: 2,
  height: 2,
  age: 0,

  // agent properties
  isAgent: true,
  blockingTypes: [
    'DOODAD', 'WALL', 'DOOR',
  ],

  isHistorical: true,
  pheromoneEmitter: true,


  // action params
  MOVE: {
    duration: 10,
    spriteOrder: [1, 2],
    maxFrameOffset: 2,
    frameStep: 2,
  },
  WAIT: {
    duration: 10,
    spriteOrder: [1, 2],
  },
  MOVE_TURN: {
    duration: 12,
    spriteOrder: [1, 2],
    maxFrameOffset: 2,
    frameStep: 2,
  },
  TURN: {
    duration: 6,
    spriteOrder: [1, 2, 3, 4],
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
  renderAgent(ctx, game, agent, spriteRenderFn);
}

const spriteRenderFn = (ctx, game, agent) => {
  // const sprite = getAntSpriteAndOffset(game, agent);
  // if (sprite.img != null) {
  //   ctx.save();
  //   ctx.translate(
  //     agent.width / 2, agent.height / 2,
  //   );
  //   ctx.rotate(-1 * Math.PI / 2);
  //   ctx.translate(-agent.width / 2, -agent.height / 2);

  //   if (game.controlledEntity == null || game.controlledEntity.id != agent.id) {
  //     ctx.globalAlpha = 0.5;
  //   }

  //   ctx.drawImage(
  //     sprite.img, sprite.x, sprite.y, sprite.width, sprite.height,
  //     0, 0, agent.width, agent.height,
  //   );
  //   ctx.restore();
  // }

  const img = game.sprites.CHARACTER;
  ctx.save();
  if (game.controlledEntity == null || game.controlledEntity.id != agent.id) {
    ctx.globalAlpha = 0.5;
  }
  ctx.drawImage(
    img, 0, 0, agent.width, agent.height,
  );
  ctx.restore();
}

module.exports = {
  make, render, config,
};
