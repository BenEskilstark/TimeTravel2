// @flow

const {
  getButtonSprite,
} = require('../selectors/sprites');
const {makeEntity} = require('./makeEntity');
const globalConfig = require('../config');

const config = {
  width: 2,
  height: 2,

  // isHistorical: true,

  PRESS: {
    duration: 6,
    spriteOrder: [1, 2, 3, 4],
  },
};

const make = (
  game: Game,
  position: Vector,
  buttonID: number,
): Button => {
	return {
    ...makeEntity('BUTTON', position, config.width, config.height),
    ...config,
    buttonID,
    isPressed: false,
    isStoodOn: false,
    wasPressed: false,
  };
};

const render = (ctx, game, button): void => {
  const {position, width, height} = button;

  const obj = getButtonSprite(game, button);
  if (obj == null || obj.img == null) return;
  let yOffset = 0;
  if (button.isPressed) {
    if (obj.y == 0) yOffset = 0.3;
    if (obj.y == obj.height) yOffset = 0.1;
    if (obj.y == obj.height * 2) yOffset = -0.1;
  }
  ctx.drawImage(
    obj.img,
    obj.x, obj.y, obj.width, obj.height,
    button.position.x, button.position.y + yOffset, button.width, button.height,
  );
};

module.exports = {
  make, render, config,
};
