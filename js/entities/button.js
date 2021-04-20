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
  const {position, width, height, theta} = button;
  ctx.save();
  ctx.translate(
    position.x, position.y,
  );

  ctx.strokeStyle = "black";
  ctx.fillStyle = globalConfig.config.doorColors[button.buttonID];
  ctx.beginPath();
  const radius = button.width / 2;
  ctx.arc(
    button.width / 2,
    button.height / 2,
    radius, 0, Math.PI * 2,
  );
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
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
