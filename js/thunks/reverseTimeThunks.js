// @flow
const {Entities} = require('../entities/registry');
const {
  queueAction, makeAction, isActionTypeQueued,
} = require('../simulation/actionQueue');
const {
  addEntity, removeEntity,
} = require('../simulation/entityOperations');

const doReverseTime = (game): void => {
  game.isTimeReversed = true;
  game.numTimeReversals += 1;
  game.actionIndex -= 1;

  // create the new controlled entity
  if (game.controlledEntity != null) {
    const nextPlayerChar = Entities.AGENT.make(
      game,
      {...game.controlledEntity.position},
    );
    nextPlayerChar.theta = game.controlledEntity.theta;
    addEntity(game, nextPlayerChar);
    game.controlledEntity = nextPlayerChar;
  }

  // for each other agent, update its history reversals
  for (const id in game.HISTORICAL) {
    const entity = game.entities[id];
    if (game.controlledEntity != null && game.controlledEntity.id == id) continue;

    let didTimeTravel = false;
    for (let i = game.actionIndex; i >= 0; i--) {
      const nextPos = entity.history[i];

      if (nextPos == null) {
        queueAction(
          game, entity,
          makeAction(game, entity, 'WAIT', {}),
        );
        continue;
      }

      if (entity.position == null && !didTimeTravel) {
        didTimeTravel = true;
        queueAction(
          game, entity,
          makeAction(game, entity, 'TIME_TRAVEL', {pos: nextPos}),
        );
      }

      queueAction(
        game, entity,
        makeAction(game, entity, 'MOVE', {nextPos}),
      );
    }
  }
}

const allAgentsDone = (game): boolean => {
  for (const id in game.HISTORICAL) {
    const entity = game.entities[id];
    if (
      game.controlledEntity != null &&
      game.controlledEntity.id == id
    ) {
      continue;
    }

    if (entity.actions.length > 0) {
      return false;
    }
  }
  return true;
}

module.exports = {
  doReverseTime,
  allAgentsDone,
};
