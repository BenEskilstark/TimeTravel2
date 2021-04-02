// @flow

const {
  add, subtract, vectorTheta, makeVector, containsVector,
  dist, equals, magnitude, round,
} = require('../utils/vectors');
const {
  closeToTheta, thetaToDir, isDiagonalMove,
  deepCopy,
} = require('../utils/helpers');
const {
  makeAction, isActionTypeQueued,
  queueAction, stackAction, cancelAction,
  getCurrentHistoryEntry,
} = require('../simulation/actionQueue');
const {getMaxFrameOffset} = require('../selectors/sprites');
const {
  getPositionsInFront, getPositionsBehind, isFacing,
  canDoMove,
} = require('../selectors/misc');
const {
  addEntity, removeEntity, moveEntity, pickupEntity, putdownEntity,
  rotateEntity, changeEntityType,
  addSegmentToEntity,
} = require('../simulation/entityOperations');
const {Entities} = require('../entities/registry');


const entityStartCurrentAction = (
  game: Game, entity: Entity,
): void => {
  if (entity.actions.length == 0) return;
  const curAction = entity.actions[0];
  curAction.effectDone = true;

  switch (curAction.type) {
    case 'MOVE_TURN':
      // MOVE_TURN is turned off
      console.log("move turn");
      return;

      if (!game.isTimeReversed) {
        if (!closeToTheta(entity.theta, curAction.payload.nextTheta)) {
          rotateEntity(game, entity, curAction.payload.nextTheta);
        }
        agentDoMove(game, entity, curAction.payload.nextPos);
        const {maxFrameOffset, frameStep} = getMaxFrameOffset(entity);
        if (maxFrameOffset != 0) {
          entity.frameOffset = (entity.frameOffset + maxFrameOffset)
            % (maxFrameOffset + frameStep);
        }
      } else {
        agentDoMove(game, entity, curAction.payload.nextPos);
        const {maxFrameOffset, frameStep} = getMaxFrameOffset(entity);
        if (maxFrameOffset != 0) {
          entity.frameOffset = (entity.frameOffset + maxFrameOffset)
            % (maxFrameOffset + frameStep);
        }
        if (!closeToTheta(entity.theta, curAction.payload.nextTheta)) {
          rotateEntity(game, entity, curAction.payload.nextTheta);
        }
      }

      break;
    case 'WAIT': {
      break;
    }
    case 'MOVE': {
      if (equals(entity.position, curAction.payload.nextPos)) {
        break;
      }

      const wasSuccessful = agentDoMove(game, entity, curAction.payload.nextPos);
      if (
        wasSuccessful && entity.history.length <= game.actionIndex &&
        !game.isTimeReversed
      ) {
        entity.history.push({...curAction.payload.nextPos});
      }
      const {maxFrameOffset, frameStep} = getMaxFrameOffset(entity);
      if (maxFrameOffset != 0) {
        entity.frameOffset = (entity.frameOffset + maxFrameOffset)
          % (maxFrameOffset + frameStep);
      }

      break;
    }
    case 'TURN':
      rotateEntity(game, entity, curAction.payload);
      break;
    case 'TIME_TRAVEL': {
      if (curAction.payload.pos != null) {
        entity.position = curAction.payload.pos;
      }
      moveEntity(game, entity, curAction.payload.pos);
      break;
    }
    case 'DIE':
      entityDie(game, entity);
      break;
    case 'PRESS':
      entity.isPressed = curAction.payload.pressed;
      if (!curAction.payload.firstTime) entity.wasPressed = true;
      // open corresponding doors
      for (const id of game.DOOR) {
        const door = game.entities[id];
        if (door.doorID == entity.doorID) {
          queueAction(
            game, door,
            makeAction(game, door, 'OPEN', curAction.payload),
          );
        }
      }
      break;
    case 'OPEN':
      entity.isOpen = curAction.payload.pressed;
      const mult = entity.isOpen ? 1 : -1;
      rotateEntity(game, entity, entity.theta + mult * Math.PI / 2);
      if (entity.isOpen && !curAction.payload.firstTime) entity.wasOpened = true;
      break;
    case 'REACHED':
      game.levelWon = true;
      break;
  }
};

/**
 * returns true if it was able to do the move
 */
const agentDoMove = (game: Game, entity: Entity, nextPos: Vector): boolean => {
  const isMoveLegal = canDoMove(game, entity, nextPos);

  if (isMoveLegal.result == false && isMoveLegal.reason == 'OUTSIDE_GRID') {
    cancelAction(game, entity);
    return false;
  }

  if (isMoveLegal.result == false && isMoveLegal.reason == 'SEGMENTED_DIAGONAL') {
    cancelAction(game, entity);
    return false;
  }

  if (isMoveLegal.result == false && isMoveLegal.reason == 'TOO_FAR') {
    console.log("move is more than 1 space", entity.id);
    entity.hitParadox = true;
  }

  if (isMoveLegal.result == false && isMoveLegal.reason == 'BLOCKED') {
    if (
      (game.controlledEntity == null || game.controlledEntity.id != entity.id)
    ) {
      console.log("TIME PARADOX FROM BLOCKED", entity.id );
      entity.hitParadox = true;
    }
    cancelAction(game, entity);
    if (!isFacing(game, entity, nextPos)) {
      stackAction(game, entity, makeAction(game, entity, 'TURN', nextTheta));
      entityStartCurrentAction(game, entity);
    }
    return false;
  }

  // Don't do move if not facing position you want to go to
  const nextTheta = vectorTheta(subtract(entity.position, nextPos));
  const thetaDiff = Math.abs(nextTheta - entity.theta) % (2 * Math.PI);
  if (!isFacing(game, entity, nextPos)) {
    // Rotating instantly now:
    if (!game.isTimeReversed) {
      rotateEntity(game, entity, nextTheta);
    } else {
      rotateEntity(game, entity, nextTheta + Math.PI);
    }
    // if (game.controlledEntity && game.controlledEntity.id == entity.id) {
    //   // enables turning in place off a single button press
    //   cancelAction(game, entity);
    // }
    // if (thetaDiff <= Math.PI / 2 + 0.1 && entity.isAgent) {
    //   cancelAction(game, entity);
    //   stackAction(game, entity, makeAction(game, entity, 'MOVE_TURN', {nextTheta, nextPos}));
    // } else {
    //   stackAction(game, entity, makeAction(game, entity, 'TURN', nextTheta));
    // }
    // entityStartCurrentAction(game, entity);
    // return false;
  }

  moveEntity(game, entity, nextPos);

  return true;
}

const entityDie = (game: Game, entity: Entity): void => {

  if (entity.holding != null) {
    putdownEntity(game, entity.holding, entity.position);
  }

  removeEntity(game, entity);
};


module.exports = {
  entityStartCurrentAction,
}
