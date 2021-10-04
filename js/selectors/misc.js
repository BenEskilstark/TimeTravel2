// @flow

const {
  lookupInGrid, getEntityPositions, entityInsideGrid,
} = require('../utils/gridHelpers');
const {thetaToDir, isDiagonalMove} = require('../utils/helpers');
const {collidesWith} = require('../selectors/collisions');
const {
  getFreeNeighborPositions, getNeighborPositions,
} = require('../selectors/neighbors');
const {
  add, makeVector, subtract, vectorTheta, round, ceil,
  containsVector, equals,
} = require('../utils/vectors');
const {makeAction} = require('../simulation/actionQueue');
const {getPheromoneAtPosition} = require('../selectors/pheromones');

import type {Game, PlayerID, Hill, Vector} from '../types';

const onScreen = (game: Game, entity: Entity): boolean => {
  let {viewPos, viewWidth, viewHeight} = game;
  const {position, width, height} = entity;
  const {x, y} = position;

  if (!game.maxMinimap) {
    return (x + width) >= viewPos.x - 1 &&
      (y + height) >= viewPos.y - 1 &&
      x <= viewWidth + viewPos.x + 1 &&
      y <= viewHeight + viewPos.y + 1;
  } else {
    return x >= viewPos.x &&
      y >= viewPos.y &&
      (x + width) <= viewWidth + viewPos.x &&
      (y + height) <= viewHeight + viewPos.y;
  }
};

// NOTE: outside of entity
const getPositionsInFront = (game: Game, entity: Entity): Array<Vector> => {
  let dimension = entity.width;
  if (entity.height > entity.width) {
    dimension = entity.height;
  }
  const magnitude = entity.theta < Math.PI * 0.9
    ? -1
    : -1 * dimension;
  const positions = [];
  for (let x = 0; x < entity.width; x++) {
    let neighborVec = {x, y: 0};
    if (
      thetaToDir(entity.theta) == 'left' || thetaToDir(entity.theta) == 'right'
    ) {
      neighborVec = {x: 0, y: x};
    }
    // HACK: facing up-left or up-right diagonally causes the positions-in-front to be inside
    // BUT only the y-axis is off
    let roundingFn = Math.round;
    if (entity.theta > Math.PI) {
      roundingFn = Math.ceil;
    }

    const posSum = add(
      add(neighborVec, entity.position),
      makeVector(entity.theta, magnitude),
    );
    positions.push({x: Math.round(posSum.x), y: roundingFn(posSum.y)});
  }
  return positions;
};

// NOTE: outside of entity
const getPositionsBehind = (game: Game, entity: Entity): Vector => {
  if (entity.segmented) {
    const tailPos = entity.segments[entity.segments.length - 1].position;
    const segBeforeTailPos = entity.segments.length > 1
      ? entity.segments[entity.segments.length - 2].position
      : entity.position;
    const theta = vectorTheta(subtract(segBeforeTailPos, tailPos));
    const behindPos = add(tailPos, makeVector(theta, -1));
    return [behindPos];
  }
  const dir = thetaToDir(entity.theta);
  let x = 0;
  let y = entity.height + 1;
  if (dir == 'left' || dir == 'leftdown' || dir == 'leftup') {
    x = -entity.height - 1;
  }
  if (dir == 'right' || dir == 'rightdown' || dir == 'rightup') {
    x = entity.height + 1;
  }
  if (dir == 'up' || dir == 'rightup' || dir == 'leftup') {
    y = -entity.height - 1;
  }
  if (dir == 'leftup' || dir == 'leftdown') {
    x += 1;
  }
  if (dir == 'left' || dir == 'right') {
    y = 0;
  }
  const offset = {x, y};
  return getPositionsInFront(game, entity)
    .map(p => subtract(p, offset));
}

const isFacing = (game: Game, entity: Entity, position: Vector): boolean => {
  const nextDir = thetaToDir(vectorTheta(subtract(entity.position, position)));
  const theta = !game.isTimeReversed ? entity.theta : entity.theta + Math.PI;
  return nextDir == thetaToDir(theta);
}

const canDoMove = (game: Game, entity: Entity, nextPos: Vector): boolean => {
  if (!entityInsideGrid(game, {...entity, position: nextPos})) {
    return {result: false, reason: 'OUTSIDE_GRID'};
  }

  if (entity.segmented && isDiagonalMove(entity.position, nextPos)) {
    return {result: false, reason: 'SEGMENTED_DIAGONAL'};
  }

  if (!containsVector(getNeighborPositions(game, entity), nextPos)) {
    console.log(nextPos, entity.position, [...entity.history]);
    return {result: false, reason: 'TOO_FAR'};
  }

  const blockers = entity.blockingTypes;
  const freeInternalNeighbors = getFreeNeighborPositions(game, entity, blockers);
  const blockedBy = collidesWith(game, {...entity, position: nextPos}, blockers);
  if (
    (!containsVector(freeInternalNeighbors, nextPos) && !equals(nextPos, entity.position)) ||
    blockedBy.length > 0
  ) {
    return {result: false, reason: 'BLOCKED'};
  }

  // CAN do the move even if not facing
  // if (!isFacing(game, entity, nextPos)) {
  //   return false;
  // }

  return {result: true};
}

/**
 *  Returns the entityAction the controlled Entity would do if
 *  you pressed E right now
 */
const getControlledEntityInteraction = (game: Game, agent: Agent): EntityAction => {
  // PUTDOWN if holding
  if (agent.holding != null) {
    return makeAction(game, agent, 'PUTDOWN', null);
  }
  const positionsInFront = getPositionsInFront(game, agent);
  // PICKUP if there's something to pick up
  for (const pickupPos of positionsInFront) {
    const pickup = lookupInGrid(game.grid, pickupPos)
      .map(id => game.entities[id])
      .filter(e => agent.pickupTypes.includes(e.type))
      [0];
    if (pickup != null) {
      return makeAction(game, agent, 'PICKUP', {pickup, position: pickupPos});
    }
  }

  // else return PICKUP by default
  return makeAction(game, agent, 'PICKUP', {pickup: null, position: positionsInFront[0]});
};

// a position is lit if it or any of its neighbors contain any of the LIGHT_ pheromones
const isLit = (game: Game, position: Vector): boolean => {
  for (let i = 0; i < game.AGENT.length; i++) {
    const isInLight = getPheromoneAtPosition(game, position, 'LIGHT_' + i, 1) > 0;
    if (isInLight) return true;
    for (const neighbor of getNeighborPositions(game, {position})) {
      if (getPheromoneAtPosition(game, neighbor, 'LIGHT_' + i, 1)) {
        return true;
      }
    }
  }

  return false;
};

// returns true if an agent is in the light of another agent
const inOtherLight = (game: Game, agent: Agent): boolean => {
  for (const pos of getEntityPositions(game, agent)) {
    for (let i = 0; i < game.AGENT.length; i++) {
      if ('LIGHT_' + i == agent.pheromoneType) continue;
      const isInLight = getPheromoneAtPosition(game, pos, 'LIGHT_' + i, 1) > 0;
      if (isInLight) return true;
    }
  }
  return false;
}

module.exports = {
  onScreen,
  getPositionsInFront,
  getPositionsBehind,
  isFacing,
  canDoMove,
  getControlledEntityInteraction,
  isLit,
  inOtherLight,
};
