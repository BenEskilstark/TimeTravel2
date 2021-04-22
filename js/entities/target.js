// @flow

const {
  getTileSprite,
} = require('../selectors/sprites');
const {makeEntity} = require('./makeEntity');
const globalConfig = require('../config');

const config = {
  width: 2,
  height: 2,

  REACHED: {
    duration: 10,
    effectIndex: 9,
    spriteOrder: [1, 2, 3, 4],
  },
};

const make = (
  game: Game,
  position: Vector,
): Target => {
	return {
    ...makeEntity('TARGET', position, config.width, config.height),
    ...config,
    numTimesReached: 0,
  };
};

const render = (ctx, game, target): void => {
  const {position, width, height, theta} = target;
  ctx.save();
  ctx.translate(
    position.x + 0.5,
    position.y + 0.5,
  );
  ctx.rotate(theta);
  ctx.translate(-0.5, -0.5);

  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'gold';
  ctx.beginPath();
  const radius = target.width / 2;
  ctx.arc(
    target.width / 2,
    target.height / 2,
    radius, 0, Math.PI * 2,
  );
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  ctx.restore();

  // const obj = getTileSprite(game, target);
  // if (obj == null || obj.img == null) return;
  // ctx.drawImage(
  //   obj.img,
  //   obj.x, obj.y, obj.width, obj.height,
  //   target.position.x, target.position.y, target.width, target.height,
  // );
};

module.exports = {
  make, render, config,
};
