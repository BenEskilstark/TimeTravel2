// @flow
// const rotateEntity(game, entity, nextTheta);

const {
  fadeAllPheromones, computeAllPheromoneSteadyState,
  setPheromone, fillPheromone, clearPheromone,
  refreshPheromones,
} = require('../simulation/pheromones');
const {
  lookupInGrid, getEntityPositions,
  entityInsideGrid,
} = require('../utils/gridHelpers');
const {
  makeAction, isActionTypeQueued, getDuration,
  queueAction, stackAction, cancelAction,
} = require('../simulation/actionQueue.js');
const {
  removeEntity, addEntity, changeEntityType, moveEntity,
  addSegmentToEntity, changePheromoneEmitterQuantity,
  rotateEntity,
} = require('../simulation/entityOperations');
const {render} = require('../render/render');
const {
  getPosBehind, getPositionsInFront, onScreen,
  canDoMove, isFacing,
} = require('../selectors/misc');
const {oneOf} = require('../utils/stochastic');
const {collides, collidesWith} = require('../selectors/collisions');
const {
  add, equals, subtract, magnitude, scale,
  makeVector, vectorTheta, floor, round,
  abs, dist, clampMagnitude,
} = require('../utils/vectors');
const {
  clamp, closeTo, closeToTheta, encodePosition, decodePosition,
} = require('../utils/helpers');
const {getInterpolatedIndex, getDictIndexStr} = require('../selectors/sprites');
const {
  entityStartCurrentAction,
} = require('../simulation/actionOperations');
const {getFreeNeighborPositions, areNeighbors} = require('../selectors/neighbors');
const {
  getPheromoneAtPosition, getTemperature,
} = require('../selectors/pheromones');
const globalConfig = require('../config');
const {dealDamageToEntity} = require('../simulation/miscOperations');
const {Entities} = require('../entities/registry');
const {canAffordBuilding} = require('../selectors/buildings');
const {slider} = require('../utils/slider');
const {allAgentsDone, doReverseTime} = require('../thunks/reverseTimeThunks');

import type {
  Game, Entity, Action, Ant,
} from '../types';

let totalTime = 0;
const tickReducer = (game: Game, action: Action): GameState => {
  switch (action.type) {
    case 'START_TICK': {
      if (game != null && game.tickInterval != null) {
        return game;
      }

      game.prevTickTime = new Date().getTime();

      return {
        ...game,
        tickInterval: setInterval(
          // HACK: store is only available via window
          () => store.dispatch({type: 'TICK'}),
          globalConfig.config.msPerTick,
        ),
      };
    }
    case 'STOP_TICK': {
      clearInterval(game.tickInterval);
      game.tickInterval = null;

      return game;
    }
    case 'TICK': {
      return doTick(game);
    }
  }
  return game;
};

//////////////////////////////////////////////////////////////////////////
// Do Tick
//////////////////////////////////////////////////////////////////////////
const doTick = (game: Game): Game => {
  const curTickTime = new Date().getTime();

  if (!game.isTimeReversed) {
	  game.time += 1;
  } else {
    game.time -= 1;
    game.actionIndex = game.prevControlledEntity.actions.length;
  }

  if (game.isTimeReversed && (game.time == 1 || allAgentsDone(game))) {
    game.isTimeReversed = false;
    game.actionIndex = 0;
    game.time = 1;

    // close all doors and press all buttons that have already been passed through
    // BUT only if they haven't had their button pressed, as that in-game pressing
    // will deal with closing the door from now on
    // for (const id of game.DOOR) {
    //   const door = game.entities[id];
    //   if (door.passedThrough) {
    //     for (const id of game.BUTTON) {
    //       const button = game.entities[id];
    //       if (button.doorID == door.doorID) {
    //         if (!button.wasPressed) {
    //           queueAction(
    //             game, button,
    //             makeAction(game, button, 'PRESS', {pressed: false}),
    //           );
    //         }
    //       }
    //     }
    //   }
    // }

    // close all doors and unpress all buttons
    if (game.numTimeReversals == 1) {
      for (const id of game.BUTTON) {
        const button = game.entities[id];
          queueAction(
            game, button,
            makeAction(game, button, 'PRESS', {pressed: false}),
          );
      }
    }

  }

  // initializations:
  if (game.time == 1 && game.numTimeReversals == 0) {
    game.prevTickTime = new Date().getTime();
    game.viewImage.allStale = true;
    computeAllPheromoneSteadyState(game);
    game.pheromoneWorker.postMessage({
      type: 'INIT',
      grid: game.grid,
      entities: game.entities,
      PHEROMONE_EMITTER: game.PHEROMONE_EMITTER || {},
    });

    // open all doors and press all buttons
    for (const id of game.BUTTON) {
      const button = game.entities[id];
        queueAction(
          game, button,
          makeAction(game, button, 'PRESS', {pressed: true, firstTime: true}),
        );
    }

    // set first agent to be the controlled entity
    if (game.controlledEntity == null) {
      for (const id of game.AGENT) {
        const agent = game.entities[id];
        game.controlledEntity = agent;
      }
    }
  }

  // game/frame timing
  // game.timeSinceLastTick = curTickTime - game.prevTickTime;
  game.timeSinceLastTick = 1;

  // these are the ECS "systems"
  const doingMove = keepControlledMoving(game);
  updateButtons(game);
  updateDoors(game);
  updateHistoricals(game, doingMove);

  updateTargets(game);

  updateActors(game);
  updateAgents(game);
  updateTiledSprites(game);
  updateViewPos(game, false /*don't clamp to world*/);
  updateTicker(game);
  updatePheromoneEmitters(game);
  updatePheromones(game);

  render(game);

  // update timing frames
  game.totalGameTime += curTickTime - game.prevTickTime;
  game.prevTickTime = curTickTime;

  return game;
};

//////////////////////////////////////////////////////////////////////////
// Update Buttons/Historicals
//////////////////////////////////////////////////////////////////////////

const updateTargets = (game): void => {
  for (const id of game.TARGET) {
    const target = game.entities[id];
    const collisions = collidesWith(game, target, ['AGENT']);
    if (collisions.length > 0) {
      queueAction(game, target, makeAction(game, target, 'REACHED', {}));
    }
  }
};

const updateButtons = (game): void => {
  for (const id of game.BUTTON) {
    const button = game.entities[id];
    const collisions = collidesWith(game, button, ['AGENT']);
    if (collisions.length > 0) {
      if (!game.isTimeReversed) {
        if (!isActionTypeQueued(game, button, 'PRESS') && !button.isPressed) {
          queueAction(
            game, button,
            makeAction(game, button, 'PRESS', {pressed: true}),
          );
        }
      } else {
        button.isStoodOn = true;
      }
    } else {
      // unpress the button as the agent leaves it in reverse time
      if (game.isTimeReversed && button.isStoodOn) {
        queueAction(
          game, button,
          makeAction(game, button, 'PRESS', {pressed: false}),
        );
      }
      button.isStoodOn = false;
    }

  }
};

const updateDoors = (game): void => {
  for (const id of game.DOOR) {
    const door = game.entities[id];
    // if the door has not been opened before, then check if an agent is passing through
    // it now.
    // Do this by closing the door and seeing if it collides with any agents, then
    // re-opening the door
    if (door.isOpen && !door.wasOpened) {
      let mult = -1;
      rotateEntity(game, door, door.theta + mult * Math.PI / 2, true /* no pheromone */);

      const collisions = collidesWith(game, door, ['AGENT']);
      if (collisions.length > 0) {
        door.passedThrough = true;
      }

      mult = 1;
      rotateEntity(game, door, door.theta + mult * Math.PI / 2, true /* no pheromone */);
    }
  }
}

// When going forward in time, have agents follow their histories whenever
// the controlledEntity is doing a move
const updateHistoricals = (game, doingMove): void => {
  if (game.isTimeReversed) return;

  // face next direction you'll move
  if (!doingMove) {
    for (const id in game.HISTORICAL) {
      const entity = game.entities[id];
      if (game.controlledEntity != null && game.controlledEntity.id == id) continue;
      if (isActionTypeQueued(game, entity, 'MOVE')) continue;
      const nextPos = entity.history[game.actionIndex + 1];
      if (nextPos != null) {
        if (!isFacing(game, entity, nextPos)) {
          const nextTheta = vectorTheta(subtract(entity.position, nextPos));
          rotateEntity(game, entity, nextTheta);
        }
      } else {
        // TODO show preview of going back in time
      }
    }
    return;
  }

  game.actionIndex++;

  for (const id in game.HISTORICAL) {
    const entity = game.entities[id];
    if (game.controlledEntity != null && game.controlledEntity.id == id) continue;

    let nextPos = entity.history[game.actionIndex];
    if (nextPos == null) {
      // Time travel here
      if (entity.position != null) {
        queueAction(
          game, entity,
          makeAction(game, entity, 'TIME_TRAVEL', {pos: nextPos}),
        );
      }
    } else {
      queueAction(
        game, entity,
        makeAction(game, entity, 'MOVE', {nextPos}),
      );
    }
  }
}

//////////////////////////////////////////////////////////////////////////
// Updating Agents
//////////////////////////////////////////////////////////////////////////

const updateActors = (game): void => {
  let fn = () => {}

  // see comment below
  const notNextActors = {};

  for (const id in game.ACTOR) {
    const actor = game.entities[id];
    if (
      actor == null ||
      actor.actions == null ||
      actor.actions.length == 0
    ) {
      continue;
    }

    if (actor.isAgent) {
      fn = () => {};
    }
    stepAction(game, actor, fn);

    if (actor.actions.length == 0) {
      notNextActors[id] = true;
    }
  }

  // the reason for deleting them like this instead of just
  // tracking which ones should make it to the next tick, is that
  // new entities can be added to the ACTOR queue inside of stepAction
  // (e.g. an explosive killing another explosive) and they need
  // to make it to the next time this function is called
  for (const id in notNextActors) {
    delete game.ACTOR[id];
  }
}

const updateAgents = (game): void => {
	for (const id of game.AGENT) {
    const agent = game.entities[id];
    if (agent == null) {
      console.log("no agent with id", id);
      continue;
    }
    agent.age += game.timeSinceLastTick;
    agent.prevHPAge += game.timeSinceLastTick;

    if (agent.actions.length == 0) {
      // agentDecideAction(game, agent);
    }
	}
}

//////////////////////////////////////////////////////////////////////////
// Move controlledEntity/View
//////////////////////////////////////////////////////////////////////////

/**
 * If the queen isn't moving but you're still holding the key down,
 * then just put a move action back on the action queue
 */
const keepControlledMoving = (game: Game): boolean => {
  const controlledEntity = game.controlledEntity;
  if (!controlledEntity) return;
  const moveDir = {x: 0, y: 0};
  if (!game.isTimeReversed) {
    if (game.hotKeys.keysDown.up) {
      moveDir.y += 1;
    }
    if (game.hotKeys.keysDown.down) {
      moveDir.y -= 1;
    }
    if (game.hotKeys.keysDown.left) {
      moveDir.x -= 1;
    }
    if (game.hotKeys.keysDown.right) {
      moveDir.x += 1;
    }
  }
  if (!equals(moveDir, {x: 0, y: 0})) {
    controlledEntity.timeOnMove += 1;
  } else {
    controlledEntity.timeOnMove = 0;
  }

  let doingMove = false;
  if (
    !equals(moveDir, {x: 0, y: 0}) && !isActionTypeQueued(game, controlledEntity, 'MOVE', true)
    && !isActionTypeQueued(game, controlledEntity, 'MOVE_TURN', true)
    && !isActionTypeQueued(game, controlledEntity, 'TURN') // enables turning in place
  ) {
    const nextPos = add(controlledEntity.position, moveDir);
    const nextTheta = vectorTheta(subtract(controlledEntity.position, nextPos));
    let entityAction = makeAction(
      game, controlledEntity, 'MOVE',
      {
        nextPos,
        frameOffset: controlledEntity.frameOffset,
        isControlledEntity: true,
      },
    );
    if (!closeTo(nextTheta, controlledEntity.theta)) {
      // TODO: MOVE_TURN is broken when reversing time
      if (false && controlledEntity.timeOnMove > 1) {
        entityAction = makeAction(
          game, controlledEntity, 'MOVE_TURN',
          {
            nextPos,
            nextTheta,
            frameOffset: controlledEntity.frameOffset,
          },
        );
        controlledEntity.prevTheta = controlledEntity.theta;
      } else {
        entityAction = makeAction(
          game, controlledEntity, 'TURN', nextTheta,
        );
      }
    }
    controlledEntity.timeOnMove = 0;
    queueAction(game, controlledEntity, entityAction);
    if (
      entityAction.type == 'MOVE'
      && canDoMove(game, controlledEntity, nextPos).result
      && !isActionTypeQueued(game, controlledEntity, 'TURN')
    ) {
      doingMove = true;

      // HACK: have character always move 2 spaces at a time
      queueAction(
        game, controlledEntity,
        makeAction(
          game, controlledEntity, 'MOVE',
          {nextPos: add(nextPos, moveDir),
            frameOffset: controlledEntity.frameOffset + 2,
            isControlledEntity: true,
          },
        ),
      );
    }
  }

  // HACK: needs to count as doingMove if you just finished the previous move action
  // in a pair
  if (
    !doingMove && controlledEntity.actions.length == 1 &&
    controlledEntity.actions[0].type == 'MOVE' &&
    controlledEntity.actions[0].duration == controlledEntity.MOVE.duration - 1
  ) {
    doingMove = true;
  }
  return doingMove;
}

const updateViewPos = (
  game: Game,clampToGrid: boolean,
): void => {
  let nextViewPos = {...game.viewPos};
  const focusedEntity = game.focusedEntity;
  if (focusedEntity) {
    const moveDir = subtract(focusedEntity.position, focusedEntity.prevPosition);
    const action = focusedEntity.actions[0];
    if (
      action != null &&
      (action.type == 'MOVE' || action.type == 'MOVE_TURN')
    ) {
      const index = getInterpolatedIndex(game, focusedEntity);
      const duration = getDuration(game, focusedEntity, action.type);
      nextViewPos = add(
        nextViewPos,
        scale(moveDir, game.timeSinceLastTick/duration),
      );
    } else if (action == null) {
      const idealPos = {
        x: focusedEntity.position.x - game.viewWidth / 2,
        y: focusedEntity.position.y - game.viewHeight /2,
      };
      const diff = subtract(idealPos, nextViewPos);
      // NOTE: this allows smooth panning to correct view position
      const duration = getDuration(game, focusedEntity, 'MOVE');
      nextViewPos = add(nextViewPos, scale(diff, 16/duration));
    }
  }

  // rumble screen from foot
  // const foot = game.entities[game.FOOT[0]];
  // if (foot != null && foot.actions[0] != null && foot.actions[0].type == 'STOMP') {
  //   const duration = getDuration(game, foot, 'STOMP');
  //   const actionIndex = duration - foot.actions[0].duration;
  //   if (gme.config.FOOT.rumbleTicks > actionIndex) {
  //     const magnitude = 4 * actionIndex / duration - 3;
  //     nextViewPos = {
  //       x: magnitude * Math.random() + queen.position.x - game.viewWidth / 2,
  //       y: magnitude * Math.random() + queen.position.y - game.viewHeight / 2,
  //     };
  //   } else if (!onScreen(game, foot) && actionIndex == gme.config.FOOT.rumbleTicks) {
  //     // if the foot doesn't stomp on screen, reset the view immediately after rumbling
  //     // else it looks jarring to shift the screen without the foot also moving
  //     if (focusedEntity != null) {
  //       nextViewPos = {
  //         x: focusedEntity.position.x - game.viewWidth / 2,
  //         y: focusedEntity.position.y - game.viewHeight /2,
  //       };
  //     }
  //   }
  // }

  nextViewPos = {
    x: Math.round(nextViewPos.x * 100) / 100,
    y: Math.round(nextViewPos.y * 100) / 100,
  };

  if (!clampToGrid) {
    if (!equals(game.viewPos, nextViewPos)) {
      game.viewPos = nextViewPos;
    }
  } else {
    game.viewPos = {
      x: clamp(nextViewPos.x, 0, game.gridWidth - game.viewWidth),
      y: clamp(nextViewPos.y, 0, game.gridHeight - game.viewHeight),
    };
  }
}

//////////////////////////////////////////////////////////////////////////
// Pheromones
//////////////////////////////////////////////////////////////////////////

const updatePheromoneEmitters = (game: Game): void => {
  for (const id in game.PHEROMONE_EMITTER) {
    const emitter = game.entities[id];
    if (emitter.quantity == 0) continue;
    if (emitter.refreshRate == null) continue;

    if ((game.time + emitter.id) % emitter.refreshRate == 0) {
      changePheromoneEmitterQuantity(game, emitter, emitter.quantity);
    }
  }
};

const updatePheromones = (game: Game): void => {

  if (game.time % globalConfig.config.dispersingPheromoneUpdateRate == 0) {
    game.pheromoneWorker.postMessage({
      type: 'DISPERSE_PHEROMONES',
    });
  }

  // recompute steady-state-based pheromones using the worker
  if (game.reverseFloodFillSources.length > 0) {
    game.pheromoneWorker.postMessage({
      type: 'REVERSE_FLOOD_FILL',
      reverseFloodFillSources: game.reverseFloodFillSources,
    });
    game.reverseFloodFillSources = [];
  }
  if (game.floodFillSources.length > 0) {
    game.pheromoneWorker.postMessage({
      type: 'FLOOD_FILL',
      floodFillSources: game.floodFillSources,
    });
    game.floodFillSources = [];
  }
};

//////////////////////////////////////////////////////////////////////////
// Doing Actions
//////////////////////////////////////////////////////////////////////////

const stepAction = (
  game: Game, entity: Entity, decisionFunction: mixed,
): void => {
  if (entity.actions == null || entity.actions.length == 0) return;

  let curAction = entity.actions[0];
  const totalDuration = getDuration(game, entity, curAction.type);
  if (
    totalDuration - curAction.duration >= curAction.effectIndex &&
    !curAction.effectDone
  ) {
    entityStartCurrentAction(game, entity);
    curAction = entity.actions[0];
  } else if (curAction.duration <= 0) {
    const prevAction = entity.actions.shift();
    entity.prevActionType = prevAction.type;
    curAction = entity.actions[0];
    if (curAction == null) {
      decisionFunction(game, entity);
      curAction = entity.actions[0];
    }
    if (curAction != null && curAction.effectIndex == 0) {
      entityStartCurrentAction(game, entity);
    }
  }
  if (curAction != null) {
    curAction.duration = Math.max(0, curAction.duration - game.timeSinceLastTick);
  }
}

//////////////////////////////////////////////////////////////////////////
// Misc.
//////////////////////////////////////////////////////////////////////////

const updateTiledSprites = (game): void => {
  for (const id of game.staleTiles) {
    const entity = game.entities[id];
    if (entity == null) {
      // console.log(id);
      continue;
    }
    entity.dictIndexStr = getDictIndexStr(game, entity);
  }
  game.staleTiles = [];
}

const updateTicker = (game): void => {
  if (game.ticker != null) {
    game.ticker.time -= game.timeSinceLastTick;
    if (game.ticker.time <= 0) {
      game.ticker = null;
    }
  }

  if (game.miniTicker != null) {
    game.miniTicker.time -= game.timeSinceLastTick;
    if (game.miniTicker.time <= 0) {
      game.miniTicker = null;
    }
  }
};

module.exports = {tickReducer};
