// @flow

// -----------------------------------------------------------------------
// General types
// ----------------------------------------------------------------------

export type Vector = {x: number, y: number};

export type Mouse = {
  isLeftDown: boolean,
  isRightDown: boolean,
  downPos: Vector, // where the mouse down was pressed (in grid-space)
  curPos: Vector, // grid position of mouse
  prevPos: Vector, // previous grid position of the mouse
  curPixel: Vector, // pixel position of mouse
  prevPixel: Vector,
};

// uses left/right/up/down and enter/space/meta
export type HotKeys = {
  onKeyDown: {[key: string]: (store) => void},
  onKeyUp: {[key: string]: (store) => void},
  onKeyPress: {[key: string]: (store) => void},
  keysDown: {[key: string]: boolean},
};

// ----------------------------------------------------------------------------
// Game state
// ----------------------------------------------------------------------------

export type State = {
	screen: 'LOBBY' | 'GAME' | 'EDITOR',
	game: ?Game,
};

export type Time = number;

export type Game = {
	time: Time,
	tickInterval:any,
  isExperimental: boolean, // should it display additional UI for experimentation

	viewWidth: number,
	viewHeight: number,
	gridWidth: number,
	gridHeight: number,
	grid: Grid,
	entities: {[EntityID]: Entity},
	[EntityType]: Array<EntityID>,

	level: number,

  // state that should be local
  sprites: {[string]: Image},
  mouse: Mouse,
  hotKeys: HotKeys,
	viewPos: Vector, // where in the world we're looking
};

// ------------------------------------------------------------------------
// Grid
// ------------------------------------------------------------------------

export type PheromoneType = 'LIGHT';
export type Grid = Array<Array<Cell>>;
export type Cell = {
	entities: Array<EntityID>,
	[playerID]: {
		[PheromoneType]: number,
	}
};

// ------------------------------------------------------------------------
// Entities
// ------------------------------------------------------------------------

export type EntityType = 'AGENT' | 'DOOR' | 'WALL' | 'BUTTON' | 'TIME_MACHINE';
export type EntityID = number;
export type Entity = {
	id: EntityID,
	type: EntityType,
	position: ?Vector, // has no position if being held or if reversed time
  prevPosition: Vector,
	width: number,
	height: number,
	theta: number,
  prevTheta: number,
  history: {[time: Time]: EntityAction},
};

export type EntityAction = {
  type: 'MOVE' | 'TURN' | 'MOVE_TURN' | 'OPEN' | 'PRESS',
  duration: Time, // number of ticks
  // additional information for this action
  payload: mixed,
};

