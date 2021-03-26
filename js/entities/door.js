// @flow

const {
  getTileSprite,
} = require('../selectors/sprites');
const {makeEntity} = require('./makeEntity');
const globalConfig = require('../config');

const config = {
  width: 3,
  height: 1,

  notBlocked: true, // when creating entities w/marquee it can go on top of things
  OPEN: {
    duration: 20,
    spriteOrder: [1, 2, 3, 4],
  },
};

const make = (
  game: Game,
  position: Vector,
  doorID: number,
  orientation: string,
): Stone => {
  let width = orientation == 'horizontal' ? config.width : config.height;
  let height = orientation == 'horizontal' ? config.height : config.width;
	return {
    ...makeEntity('DOOR', position, width, height),
    ...config,
    width, height,
    orientation,
    doorID,
    isOpen: false,
  };
};

const render = (ctx, game, door): void => {
  const {position, width, height, theta} = door;
  ctx.save();
  ctx.translate(
    position.x + 0.5,
    position.y + 0.5,
  );
  ctx.rotate(theta);
  ctx.translate(-0.5, -0.5);

  ctx.strokeStyle = "black";
  ctx.fillStyle = globalConfig.config.doorColors[door.doorID];
  ctx.fillRect(0, 0, width, height);
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();

  // const obj = getTileSprite(game, door);
  // if (obj == null || obj.img == null) return;
  // ctx.drawImage(
  //   obj.img,
  //   obj.x, obj.y, obj.width, obj.height,
  //   door.position.x, door.position.y, door.width, door.height,
  // );
};

module.exports = {
  make, render, config,
};
