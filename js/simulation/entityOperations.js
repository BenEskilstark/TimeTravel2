// @flow

const {
  add, subtract, vectorTheta, equals,
} = require('../utils/vectors');
const globalConfig = require('../config');
const {thetaToDir, closeToTheta, encodePosition} = require('../utils/helpers');
const {
  insideGrid, insertInCell, deleteFromCell,
  getEntityPositions,
} = require('../utils/gridHelpers');
const {
  getNeighborEntities, getNeighborPositions,
} = require('../selectors/neighbors');
const {makeEntity} = require('../entities/makeEntity');
const {
  getEntityPheromoneSources, getQuantityForStalePos,
  getPheromoneAtPosition,
} = require('../selectors/pheromones');
const {setPheromone} = require('../simulation/pheromones');
const {Entities} = require('../entities/registry');

import type {Game, Entity} from '../types';


const insertEntityInGrid = (game: Game, entity: Entity, noPheromone: boolean): void => {
  const dir = thetaToDir(entity.theta);
  for (let x = 0; x < entity.width; x++) {
    for (let y = 0; y < entity.height; y++) {
      let pos = {x, y};
      if ((dir == 'up' || dir == 'down') && entity.type != "BACKGROUND") {
        pos = {x: y, y: x};
        if (entity.type == 'DOOR') {
          pos.x *= -1;
        }
      }
      const gridPos = add(entity.position, pos);
      insertInCell(game.grid, gridPos, entity.id);
    }
  }

  // for the worker
  if (!game.pheromoneWorker || noPheromone) return;
  if (game.time > 1) {
    game.pheromoneWorker.postMessage({type: 'INSERT_IN_GRID', entity});
  }

  if (game.time > 1 && entity.notAnimated) {
    markEntityAsStale(game, entity);
  }

  // tiled sprites updating:
  if (entity.isTiled) {
    game.staleTiles.push(entity.id);
    const neighbors = getNeighborEntities(game, entity, true /*external*/)
      .filter(e => e.type == entity.type)
      .map(e => e.id);
    game.staleTiles.push(...neighbors);
  }

  if (game.time < 1) return;

  // pheromone updating:
  const pherSources = getEntityPheromoneSources(game, entity);
  if (pherSources.length > 0) {
    // TODO: do I need to do this filter? NOTE that having it breaks critter pheromone
    // game.reverseFloodFillSources = game.reverseFloodFillSources
    //   .filter(s => s.id != entity.id);
    game.floodFillSources.push(...pherSources);
  }

  for (const pheromoneType in globalConfig.pheromones) {
    if (!globalConfig.pheromones[pheromoneType].blockingTypes.includes(entity.type)) continue;
    game.floodFillSources = game.floodFillSources
      .filter(s => s.id != entity.id || s.pheromoneType != pheromoneType);
    const neighborPositions = getNeighborPositions(game, entity, true /* external */);

    for (const playerID in game.players) {
      // NOTE: dispersing pheromones never reverseFloodFill
      if (globalConfig.pheromones[pheromoneType].isDispersing) {
        setPheromone(game, entity.position, pheromoneType, 0, playerID);
        continue;
      }

      for (const pos of getEntityPositions(game, entity)) {
        setPheromone(game, pos, pheromoneType, 0, playerID);
      }

      const maxAmount = globalConfig.pheromones[pheromoneType].quantity;
      for (const neighbor of neighborPositions) {
        const quantity = getPheromoneAtPosition(game, neighbor, pheromoneType, playerID);
        if (quantity < maxAmount) {
          game.reverseFloodFillSources.push({
            id: entity.id,
            position: neighbor,
            pheromoneType,
            playerID,
          });
        }
      }
    }
  }

}


const removeEntityFromGrid = (game: Game, entity: Entity, noPheromone: boolean): void => {
  const position = entity.position;
  const dir = thetaToDir(entity.theta);
  if (entity.segmented) {
    for (const segment of entity.segments) {
      deleteFromCell(game.grid, segment.position, entity.id);
    }
    deleteFromCell(game.grid, entity.position, entity.id);
  } else {
    for (let x = 0; x < entity.width; x++) {
      for (let y = 0; y < entity.height; y++) {
        let pos = {x, y};
        if ((dir == 'up' || dir == 'down') && entity.type != "BACKGROUND") {
          pos = {x: y, y: x};
          if (entity.type == 'DOOR') {
            pos.x *= -1;
          }
        }
        const gridPos = add(entity.position, pos);
        deleteFromCell(game.grid, gridPos, entity.id);
      }
    }
  }

  // for the worker
  if (!game.pheromoneWorker || noPheromone) return;
  if (game.time > 1) {
    game.pheromoneWorker.postMessage({type: 'REMOVE_FROM_GRID', entity});
  }

  if (game.time > 1 && entity.notAnimated) {
    markEntityAsStale(game, entity);
  }

  // tiled sprites updating:
  if (entity.isTiled) {
    game.staleTiles = game.staleTiles.filter(id => id != entity.id);
    const neighbors = getNeighborEntities(game, entity, true /*external*/)
      .filter(e => e.type == entity.type)
      .map(e => e.id);
    game.staleTiles.push(...neighbors);
  }

  if (game.time < 1) return;
  // pheromone updating:
  const pherSources = getEntityPheromoneSources(game, entity);
  if (pherSources.length > 0) {
    const pheromoneType = pherSources[0].pheromoneType;
    // NOTE: dispersing pheromones never reverseFloodFill
    if (!globalConfig.pheromones[pheromoneType].isDispersing) {
      const playerID = pherSources[0].playerID;
      // If you are added as a fill source AND removed from the grid on the same tick,
      // then the pheromone will stay behind because reverse fills are done before flood fills
      // So check if you are in the floodFill queue and just remove it:
      for (const source of pherSources) {
        game.floodFillSources = game.floodFillSources.filter(s => {
          return !(
            s.pheromoneType == source.pheromoneType
            && s.playerID == source.playerID
            && equals(s.position, source.position)
          );
        });
      }

      // by adding 1, we force this position to be bigger than all its neighbors, which is how the
      // reverse flooding checks if a position is stale and should be set to 0
      for (const source of pherSources) {
        setPheromone(game, source.position, pheromoneType, source.quantity + 1, playerID);
      }
      game.reverseFloodFillSources.push(...pherSources);
    }
  }

  for (const pheromoneType in globalConfig.pheromones) {
    if (!globalConfig.pheromones[pheromoneType].blockingTypes.includes(entity.type)) continue;
    for (const playerID in game.players) {
      if (pherSources.length > 0 && pherSources[0].pheromoneType == pheromoneType) {
        continue; // don't flood fill this type, we just removed it
      }
      const quantity = getQuantityForStalePos(
        game, position, pheromoneType, playerID,
      ).quantity;
      setPheromone(game, entity.position, pheromoneType, 0, playerID);
      game.floodFillSources.push({
        id: entity.id,
        position,
        quantity,
        pheromoneType,
        playerID,
        stale: true, // if stale, then you override the quantity value when
                     // it comes time to compute
      });
    }
  }

}


const addEntity = (game: Game, entity: Entity): Game => {
  entity.id = game.nextID++;

  game.entities[entity.id] = entity;

  // add to type and property-based memos
  game[entity.type].push(entity.id);
  if (entity.isAgent && entity.type != 'AGENT') {
    game.AGENT.push(entity.id);
  }
  if (entity.notAnimated) {
    game.NOT_ANIMATED[entity.id] = true;
  }
  if (entity.pheromoneEmitter) {
    game.PHEROMONE_EMITTER[entity.id] = true;
  }
  if (entity.isHistorical) {
    game.HISTORICAL[entity.id] = true;
  }
  if (entity.linkedToButton) {
    game.LINKED_TO_BUTTON[entity.id] = true;
  }

  // NOTE: special case for missiles
  if (entity.warhead) {
    if (entity.warhead.id == -1 || !game.entities[entity.warhead.id]) {
      addEntity(game, entity.warhead);
    }
    entity.holding = entity.warhead;
    entity.holdingIDs.push(entity.warhead.id);
    entity.warhead.position = null;
    entity.warhead.timer = Entities[entity.warhead.type].config.timer;
    entity.warhead.age = 0;
    entity.warhead.actions = [];
  }

  // update the pheromone worker that this entity exists
  if (game.pheromoneWorker && game.time > 1) {
    game.pheromoneWorker.postMessage({type: 'ADD_ENTITY', entity});
  }

  if (entity.position != null) {
    insertEntityInGrid(game, entity);
  }

  return game;
};


const removeEntity = (game: Game, entity: Entity): Game => {

  // remove from type and property-based memos
  game[entity.type] = game[entity.type].filter(id => id != entity.id);
  if (entity.isAgent && entity.type != 'AGENT') {
    game.AGENT = game.AGENT.filter(id => id != entity.id);
  }
  if (entity.isAnimated) {
    delete game.NOT_ANIMATED[entity.id];
  }
  if (entity.pheromoneEmitter) {
    delete game.PHEROMONE_EMITTER[entity.id];
  }
  if (game.ACTOR[entity.id]) {
    delete game.ACTOR[entity.id];
  }
  if (game.HISTORICAL[entity.id]) {
    delete game.HISTORICAL[entity.id];
  }
  if (game.LINKED_TO_BUTTON[entity.id]) {
    delete game.LINKED_TO_BUTTON[entity.id];
  }

  delete game.entities[entity.id];

  // update the pheromone worker that this is removed
  if (game.pheromoneWorker && game.time > 1) {
    game.pheromoneWorker.postMessage({type: 'REMOVE_ENTITY', entity});
  }

  if (entity.position != null) {
    removeEntityFromGrid(game, entity);
  }
  return game;
}

const moveEntity = (game: Game, entity: Entity, nextPos: Vector): Game => {
  entity.prevPosition = {...entity.position};
  if (entity.contPos != null) {
    entity.prevPosition = {...entity.contPos};
  }

  if (entity.position != null) {
    removeEntityFromGrid(game, entity);
  }

  if (nextPos == null) {
    entity.position = null;
    return game;
  }
  entity.position = {...nextPos};

  insertEntityInGrid(game, entity);

  // only rotate if you have to, so as not to blow away prevTheta
  // const nextTheta = vectorTheta(subtract(entity.prevPosition, entity.position));
  // if (!closeToTheta(nextTheta, entity.theta) && !entity.type == 'BULLET') {
  //   rotateEntity(
  //     game, entity, nextTheta,
  //   );
  // }
  return game;
}


const rotateEntity = (
  game: Game, entity: Entity, nextTheta: number,
  noPheromone: boolean,
): Game => {
  if (entity.width != entity.height) {
    removeEntityFromGrid(game, entity, noPheromone);
  }
  entity.prevTheta = entity.theta;
  entity.theta = nextTheta;
  if (entity.width != entity.height) {
    insertEntityInGrid(game, entity, noPheromone);
  }
  return game;
};

const changeEntityType = (
  game: Game, entity: Entity,
  oldType: EntityType, nextType: EntityType,
): void => {
  // NOTE: remove then re-add to grid in order to get pheromones working right
  removeEntityFromGrid(game, entity);
  game[oldType] = game[oldType].filter(id => id != entity.id);
  game[nextType].push(entity.id);
  entity.type = nextType;
  insertEntityInGrid(game, entity);
};

const changePheromoneEmitterQuantity = (
  game, entity, nextQuantity,
): void => {
  entity.quantity = nextQuantity;
  // NOTE: remove then re-add to grid in order to get pheromones working right
  removeEntityFromGrid(game, entity);
  game.pheromoneWorker.postMessage({
    type: 'SET_EMITTER_QUANTITY',
    entityID: entity.id,
    quantity: nextQuantity,
  });
  insertEntityInGrid(game, entity);
};

const changeEntitySize = (
  game: Game, entity: Entity,
  width: number, height: number,
): void => {
  removeEntityFromGrid(game, entity);
  entity.prevWidth = entity.width;
  entity.prevHeight = entity.height;
  entity.width = width;
  entity.height = height;
  insertEntityInGrid(game, entity);
}

const addSegmentToEntity = (
  game: Game, entity: Entity,
  segmentPosition: Vector,
): void => {
  removeEntityFromGrid(game, entity);
  entity.segments.push({position: segmentPosition});
  insertEntityInGrid(game, entity);
}

///////////////////////////////////////////////////////////////////////////
// Pickup/Putdown
///////////////////////////////////////////////////////////////////////////

const pickupEntity = (game: Game, entity: Entity, pickupPos: Vector): Entity => {
  let toPickup = entity;
  removeEntityFromGrid(game, entity);

  entity.prevPosition = entity.position;
  entity.position = null;

  return toPickup
};


const putdownEntity = (game: Game, entity: Entity, pos: Vector): Game => {
  entity.position = {...pos};
  entity.prevPosition = {...pos};

  // NOTE: need to do this before inserting in the grid so it doesn't do
  // a flood fill unnecessarily
  if (entity.type == 'DIRT' && entity.marked) {
    entity.marked = null;
    game.markedDirtIDs = game.markedDirtIDs.filter(id => id != entity.id);
  }

  insertEntityInGrid(game, entity);

  return game;
}


// Helper function for insert/remove to mark as stale all entity positions
// plus all neighbor positions when computing the image-based rendering background
const markEntityAsStale = (game: Game, entity: Entity): void => {
  getEntityPositions(game, entity)
    .forEach(pos => {
      const key = encodePosition(pos);
      if (!game.viewImage.stalePositions[key]) {
        game.viewImage.stalePositions[key] = pos;
      }
    });
  getNeighborPositions(game, entity)
    .forEach(pos => {
      const key = encodePosition(pos);
      if (!game.viewImage.stalePositions[key]) {
        game.viewImage.stalePositions[key] = pos;
      }
    });
  game.viewImage.isStale = true;
}

module.exports = {
  addEntity,
  removeEntity,
  moveEntity,
  rotateEntity,
  pickupEntity,
  putdownEntity,
  changeEntityType,
  changeEntitySize,
  markEntityAsStale,
  addSegmentToEntity,
  changePheromoneEmitterQuantity,

  // NOTE: only used by the worker!
  insertEntityInGrid,
  removeEntityFromGrid,
};
