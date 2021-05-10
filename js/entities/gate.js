// @flow

const {
  getGateSprite,
} = require('../selectors/sprites');
const {makeEntity} = require('./makeEntity');
const globalConfig = require('../config');

const config = {
  width: 2,
  height: 2,

  linkedToButton: true, // property of being activated by a corresponding button

  OPEN: {
    duration: 20,
    spriteOrder: [1, 2, 3, 4],
  },
};

const make = (
  game: Game,
  position: Vector,
  buttonID: number,
): Gate => {
	return {
    ...makeEntity('GATE', position, config.width, config.height),
    ...config,
    buttonID,
    isOpen: false,
    wasOpened: false,
  };
};

const render = (ctx, game, gate): void => {
  const {position, width, height} = gate;
  const obj = getGateSprite(game, gate);
  if (obj == null || obj.img == null) return;
  ctx.drawImage(
    obj.img,
    obj.x, obj.y, obj.width, obj.height,
    gate.position.x + 0.1, gate.position.y, gate.width, gate.height,
  );
};

module.exports = {
  make, render, config,
};
