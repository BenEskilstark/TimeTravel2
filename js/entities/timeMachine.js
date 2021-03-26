// @flow

const {
  getTileSprite,
} = require('../selectors/sprites');
const {makeEntity} = require('./makeEntity');

const config = {
  width: 2,
  height: 2,
};

const make = (
  game: Game,
  position: Vector,
): Stone => {
	return {
    ...makeEntity('TIME_MACHINE', position, config.width, config.height),
    ...config,
    subType: subType == null || subType == 1 ? 'STONE' : subType,
    dictIndexStr: '',
  };
};

const render = (ctx, game, timeMachine): void => {
  const {position, width, height, theta} = timeMachine;
  ctx.save();
  ctx.translate(
    position.x, position.y,
  );

  ctx.strokeStyle = "black";
  ctx.fillStyle = "orange";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();

  // const obj = getTileSprite(game, timeMachine);
  // if (obj == null || obj.img == null) return;
  // ctx.drawImage(
  //   obj.img,
  //   obj.x, obj.y, obj.width, obj.height,
  //   timeMachine.position.x, timeMachine.position.y,
  //   timeMachine.width, timeMachine.height,
  // );
};

module.exports = {
  make, render, config,
};
