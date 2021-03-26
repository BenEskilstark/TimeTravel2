// @flow

const {
  getTileSprite,
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
  doorID: number,
): Button => {
	return {
    ...makeEntity('BUTTON', position, config.width, config.height),
    ...config,
    doorID,
    isPressed: false,
    isStoodOn: false,
  };
};

const render = (ctx, game, button): void => {
  const {position, width, height, theta} = button;
  ctx.save();
  ctx.translate(
    position.x, position.y,
  );

  ctx.strokeStyle = "black";
  ctx.fillStyle = globalConfig.config.doorColors[button.doorID];
  ctx.fillRect(0, 0, width, height);
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();

  // const obj = getTileSprite(game, button);
  // if (obj == null || obj.img == null) return;
  // ctx.drawImage(
  //   obj.img,
  //   obj.x, obj.y, obj.width, obj.height,
  //   button.position.x, button.position.y, button.width, button.height,
  // );
};

module.exports = {
  make, render, config,
};
