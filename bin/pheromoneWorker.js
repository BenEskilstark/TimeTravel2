(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var config = {
  msPerTick: 16,

  canvasWidth: 1200,
  canvasHeight: 1200,

  viewWidth: 35,
  viewHeight: 35,
  useFullScreen: true,
  cellWidth: 30,
  cellHeight: 30,

  doorColors: ['red', 'teal', 'green', 'pink', 'orange', 'blue', 'maroon', 'tan', 'purple'],

  audioFiles: [{ path: 'audio/Song Oct. 9.wav', type: 'wav' }]
};

var pheromoneBlockingTypes = ['WALL', 'DOODAD', 'DOOR', 'GATE'];

// "dynamically" generate 100 sets of pheromones
var pheromones = {};
for (var i = 0; i < 100; i++) {
  pheromones['LIGHT_' + i] = {
    quantity: 3,
    decayAmount: 1,
    color: 'rgb(155, 227, 90)',
    tileIndex: 0,

    blockingTypes: pheromoneBlockingTypes,
    blockingPheromones: []
  };
}

module.exports = { config: config, pheromones: pheromones };
},{}],2:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('./makeEntity'),
    makeEntity = _require.makeEntity;

var _require2 = require('../utils/vectors'),
    subtract = _require2.subtract,
    add = _require2.add,
    makeVector = _require2.makeVector,
    vectorTheta = _require2.vectorTheta,
    round = _require2.round,
    rotate = _require2.rotate,
    floor = _require2.floor;

var _require3 = require('../utils/helpers'),
    thetaToDir = _require3.thetaToDir;

var _require4 = require('../selectors/sprites'),
    getAntSpriteAndOffset = _require4.getAntSpriteAndOffset,
    getInterpolatedIndex = _require4.getInterpolatedIndex;

var _require5 = require('../simulation/actionQueue'),
    getFrame = _require5.getFrame;

var _require6 = require('../render/renderAgent'),
    renderAgent = _require6.renderAgent;

var globalConfig = require('../config');

var config = {
  width: 2,
  height: 2,
  age: 0,

  // agent properties
  isAgent: true,
  blockingTypes: ['DOODAD', 'WALL', 'DOOR', 'GATE'],

  isHistorical: true,
  pheromoneEmitter: true,

  // action params
  MOVE: {
    duration: 10,
    spriteOrder: [0, 1],
    maxFrameOffset: 2,
    frameStep: 2
  },
  WAIT: {
    duration: 10,
    spriteOrder: [1, 2]
  },
  // MOVE_TURN: {
  //   duration: 12,
  //   spriteOrder: [1, 2],
  //   maxFrameOffset: 2,
  //   frameStep: 2,
  // },
  TURN: {
    duration: 6,
    spriteOrder: [0, 1, 2]
  },
  TIME_TRAVEL: {
    duration: 10,
    spriteOrder: [1, 2, 3, 4]
  },
  DIE: {
    duration: 10,
    spriteOrder: [8]
  }
};

var make = function make(game, position) {
  var agent = _extends({}, makeEntity('AGENT', position, config.width, config.height), config, {
    playerID: 1,
    holdingTimeMachine: false,
    pheromoneType: 'LIGHT_' + game.AGENT.length,
    quantity: globalConfig.pheromones['LIGHT_' + game.AGENT.length].quantity,
    actions: [],

    // this frame offset allows iterating through spritesheets across
    // multiple actions (rn only used by queen ant doing one full walk
    // cycle across two MOVE actions)
    frameOffset: 0,
    timeOnMove: 0 // for turning in place
  });

  return agent;
};

var render = function render(ctx, game, agent) {
  renderAgent(ctx, game, agent, spriteRenderFn, true /* no rotate */);
};

var spriteRenderFn = function spriteRenderFn(ctx, game, agent) {
  var img = game.sprites.CHARACTER;

  ctx.save();
  if (game.controlledEntity == null || game.controlledEntity.id != agent.id) {
    ctx.globalAlpha = 0.5;
  }

  var obj = {
    x: 0,
    y: 0,
    width: 90,
    height: 90
  };
  var dir = thetaToDir(agent.theta);
  if (dir == 'right') {
    obj.y = obj.height * 1;
  } else if (dir == 'down') {
    obj.y = obj.height * 2;
  } else if (dir == 'up') {
    obj.y = obj.height * 3;
  }

  var index = getInterpolatedIndex(game, agent);
  var frame = getFrame(game, agent, index);
  obj.x = frame * obj.width;
  // if (dir == 'left' || dir == 'right') {
  //   obj.x *= 2;
  // }

  ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height, 0, 0, agent.width, agent.height);
  ctx.restore();
};

module.exports = {
  make: make, render: render, config: config
};
},{"../config":1,"../render/renderAgent":14,"../selectors/sprites":20,"../simulation/actionQueue":21,"../utils/helpers":25,"../utils/vectors":27,"./makeEntity":8}],3:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../selectors/sprites'),
    getBackgroundSprite = _require.getBackgroundSprite;

var _require2 = require('./makeEntity'),
    makeEntity = _require2.makeEntity;

var config = {
  notOccupying: true, // when creating entities w/marquee, they can go on top of this
  // notBlockingPutdown: true, // when putting down entities, they can go on top of this
  notAnimated: true
  // onlyMakeOne: true, // when marquee-ing to create, only make one of these
  // with size = marquee
};

var make = function make(game, position, width, height, name) {
  return _extends({}, makeEntity('BACKGROUND', position, width, height), config, {
    name: name
  });
};

var render = function render(ctx, game, bg) {
  var obj = getBackgroundSprite(game, bg);
  if (obj == null || obj.img == null) return;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height, bg.position.x, bg.position.y, bg.width, bg.height);
  ctx.restore();
};

module.exports = {
  make: make, render: render, config: config
};
},{"../selectors/sprites":20,"./makeEntity":8}],4:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../selectors/sprites'),
    getButtonSprite = _require.getButtonSprite;

var _require2 = require('./makeEntity'),
    makeEntity = _require2.makeEntity;

var globalConfig = require('../config');

var config = {
  width: 2,
  height: 2,

  // isHistorical: true,

  PRESS: {
    duration: 6,
    spriteOrder: [1, 2, 3, 4]
  }
};

var make = function make(game, position, buttonID) {
  return _extends({}, makeEntity('BUTTON', position, config.width, config.height), config, {
    buttonID: buttonID,
    isPressed: false,
    isStoodOn: false,
    wasPressed: false
  });
};

var render = function render(ctx, game, button) {
  var position = button.position,
      width = button.width,
      height = button.height;


  var obj = getButtonSprite(game, button);
  if (obj == null || obj.img == null) return;
  var yOffset = 0;
  if (button.isPressed) {
    if (obj.y == 0) yOffset = 0.3;
    if (obj.y == obj.height) yOffset = 0.1;
    if (obj.y == obj.height * 2) yOffset = -0.1;
  }
  ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height, button.position.x, button.position.y + yOffset, button.width, button.height);
};

module.exports = {
  make: make, render: render, config: config
};
},{"../config":1,"../selectors/sprites":20,"./makeEntity":8}],5:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('./makeEntity'),
    makeEntity = _require.makeEntity;

var config = {
  notOccupying: true, // when creating entities w/marquee, they can go on top of this
  onlyMakeOne: true // when marquee-ing to create, only make one of these
  // with size = marquee
};

var make = function make(game, position, width, height, sprite) {
  return _extends({}, makeEntity('DOODAD', position, width, height), config, {
    sprite: sprite,
    theta: Math.PI / 2
  });
};

var render = function render(ctx, game, doodad) {
  var sprite = game.sprites[doodad.sprite];
  if (sprite != null) {
    ctx.drawImage(sprite, doodad.position.x, doodad.position.y, doodad.width, doodad.height);
  }
};

module.exports = {
  make: make, render: render, config: config
};
},{"./makeEntity":8}],6:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../selectors/sprites'),
    getTileSprite = _require.getTileSprite;

var _require2 = require('./makeEntity'),
    makeEntity = _require2.makeEntity;

var globalConfig = require('../config');

var config = {
  width: 3,
  height: 1,

  linkedToButton: true, // property of being activated by a corresponding button

  notBlocked: true, // when creating entities w/marquee it can go on top of things
  OPEN: {
    duration: 20,
    spriteOrder: [1, 2, 3, 4]
  }
};

var make = function make(game, position, buttonID, orientation) {
  var width = orientation == 'horizontal' ? config.width : config.height;
  var height = orientation == 'horizontal' ? config.height : config.width;
  return _extends({}, makeEntity('DOOR', position, width, height), config, {
    width: width, height: height,
    orientation: orientation,
    buttonID: buttonID,
    isOpen: false,
    wasOpened: false,
    passedThrough: false
  });
};

var render = function render(ctx, game, door) {
  var position = door.position,
      width = door.width,
      height = door.height,
      theta = door.theta;

  ctx.save();
  ctx.translate(position.x + 0.5, position.y + 0.5);
  ctx.rotate(theta);
  ctx.translate(-0.5, -0.5);

  ctx.strokeStyle = "black";
  ctx.fillStyle = globalConfig.config.doorColors[door.buttonID];
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
  make: make, render: render, config: config
};
},{"../config":1,"../selectors/sprites":20,"./makeEntity":8}],7:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../selectors/sprites'),
    getGateSprite = _require.getGateSprite;

var _require2 = require('./makeEntity'),
    makeEntity = _require2.makeEntity;

var globalConfig = require('../config');

var config = {
  width: 2,
  height: 2,

  linkedToButton: true, // property of being activated by a corresponding button

  OPEN: {
    duration: 20,
    spriteOrder: [1, 2, 3, 4]
  }
};

var make = function make(game, position, buttonID) {
  return _extends({}, makeEntity('GATE', position, config.width, config.height), config, {
    buttonID: buttonID,
    isOpen: false,
    wasOpened: false
  });
};

var render = function render(ctx, game, gate) {
  var position = gate.position,
      width = gate.width,
      height = gate.height;

  var obj = getGateSprite(game, gate);
  if (obj == null || obj.img == null) return;
  ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height, gate.position.x + 0.1, gate.position.y, gate.width, gate.height);
};

module.exports = {
  make: make, render: render, config: config
};
},{"../config":1,"../selectors/sprites":20,"./makeEntity":8}],8:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var makeEntity = function makeEntity(type, position, width, height) {
	return {
		id: -1, // NOTE: this is set by the reducer
		type: type,
		position: position,
		prevPosition: position,
		width: width != null ? width : 1,
		height: height != null ? height : 1,
		theta: 0,
		prevTheta: 0,

		history: [_extends({}, position)]
	};
};

module.exports = {
	makeEntity: makeEntity
};
},{}],9:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../selectors/sprites'),
    getGateSprite = _require.getGateSprite;

var _require2 = require('./makeEntity'),
    makeEntity = _require2.makeEntity;

var globalConfig = require('../config');

var config = {
  width: 2,
  height: 2,

  linkedToButton: true, // property of being activated by a corresponding button

  OPEN: {
    duration: 20,
    spriteOrder: [1, 2, 3, 4]
  }
};

var make = function make(game, position, buttonID) {
  return _extends({}, makeEntity('OPEN_GATE', position, config.width, config.height), config, {
    buttonID: buttonID,
    isOpen: true,
    wasOpened: false
  });
};

var render = function render(ctx, game, gate) {
  var position = gate.position,
      width = gate.width,
      height = gate.height;


  var obj = getGateSprite(game, gate);
  if (obj == null || obj.img == null) return;

  var yOffset = 0;
  ctx.globalAlpha = 0.7;
  yOffset = 1.6;

  ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height * 0.4, gate.position.x + 0.1, gate.position.y + yOffset, gate.width, 0.4);

  ctx.globalAlpha = 1;
};

module.exports = {
  make: make, render: render, config: config
};
},{"../config":1,"../selectors/sprites":20,"./makeEntity":8}],10:[function(require,module,exports){
'use strict';

var globalConfig = require('../config');

/**
 * Entity creation checklist:
 *  - add the entity here keyed by type (in render order)
 *  - add the entities/entityType file to this directory
 *  - add the entities options and arguments to ui/LevelEditor
 *  - if the entity has any special properties, add them to the gameState
 *    initialization and add an updating function for them in the tickReducer
 *  - if it blocks pheromones, add to the config
 */

var Entities = {
  BACKGROUND: require('./background.js'),
  DOODAD: require('./doodad.js'),

  WALL: require('./wall.js'),
  BUTTON: require('./button.js'),
  DOOR: require('./door.js'),
  GATE: require('./gate.js'),
  OPEN_GATE: require('./openGate.js'),

  AGENT: require('./agent.js'),
  TARGET: require('./target.js')
};

module.exports = {
  Entities: Entities
};
},{"../config":1,"./agent.js":2,"./background.js":3,"./button.js":4,"./doodad.js":5,"./door.js":6,"./gate.js":7,"./openGate.js":9,"./target.js":11,"./wall.js":12}],11:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../selectors/sprites'),
    getTileSprite = _require.getTileSprite;

var _require2 = require('./makeEntity'),
    makeEntity = _require2.makeEntity;

var globalConfig = require('../config');

var config = {
  width: 2,
  height: 2,

  REACHED: {
    duration: 10,
    effectIndex: 9,
    spriteOrder: [1, 2, 3, 4]
  }
};

var make = function make(game, position) {
  return _extends({}, makeEntity('TARGET', position, config.width, config.height), config, {
    numTimesReached: 0
  });
};

var render = function render(ctx, game, target) {
  var position = target.position,
      width = target.width,
      height = target.height,
      theta = target.theta;

  ctx.save();
  ctx.translate(position.x + 0.5, position.y + 0.5);
  ctx.rotate(theta);
  ctx.translate(-0.5, -0.5);

  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'gold';
  ctx.beginPath();
  var radius = target.width / 2;
  ctx.arc(target.width / 2, target.height / 2, radius, 0, Math.PI * 2);
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
  make: make, render: render, config: config
};
},{"../config":1,"../selectors/sprites":20,"./makeEntity":8}],12:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../selectors/sprites'),
    getTileSprite = _require.getTileSprite;

var _require2 = require('./makeEntity'),
    makeEntity = _require2.makeEntity;

var config = {
  isTiled: true,
  notAnimated: true
};

var make = function make(game, position, subType, width, height) {
  return _extends({}, makeEntity('WALL', position, width, height), config, {
    subType: subType == null || subType == 1 ? 'STONE' : subType,
    dictIndexStr: ''
  });
};

var render = function render(ctx, game, stone) {
  var obj = getTileSprite(game, stone);
  if (obj == null || obj.img == null) return;
  ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height, stone.position.x, stone.position.y, stone.width, stone.height);
};

module.exports = {
  make: make, render: render, config: config
};
},{"../selectors/sprites":20,"./makeEntity":8}],13:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// NOTE: requires are relative to current directory and not parent
// directory like every other file because this worker is not required by
// any other module and so does not go through the normal babel/browserify transforms.
// See the make file for how it works
var _require = require('./utils/vectors'),
    add = _require.add,
    multiply = _require.multiply,
    subtract = _require.subtract,
    equals = _require.equals,
    floor = _require.floor,
    containsVector = _require.containsVector,
    vectorTheta = _require.vectorTheta;

var _require2 = require('./utils/helpers'),
    isDiagonalMove = _require2.isDiagonalMove;

var _require3 = require('./utils/stochastic'),
    oneOf = _require3.oneOf;

var _require4 = require('./selectors/neighbors'),
    getNeighborPositions = _require4.getNeighborPositions;

var _require5 = require('./utils/gridHelpers'),
    lookupInGrid = _require5.lookupInGrid,
    getEntityPositions = _require5.getEntityPositions;

var _require6 = require('./selectors/pheromones'),
    getPheromoneAtPosition = _require6.getPheromoneAtPosition,
    getQuantityForStalePos = _require6.getQuantityForStalePos,
    getTemperature = _require6.getTemperature,
    isPositionBlockingPheromone = _require6.isPositionBlockingPheromone;

var _require7 = require('./utils/helpers'),
    encodePosition = _require7.encodePosition,
    decodePosition = _require7.decodePosition,
    clamp = _require7.clamp;

var _require8 = require('./simulation/pheromones'),
    setPheromone = _require8.setPheromone,
    getBiggestNeighborVal = _require8.getBiggestNeighborVal;

var _require9 = require('./simulation/entityOperations'),
    insertEntityInGrid = _require9.insertEntityInGrid,
    removeEntityFromGrid = _require9.removeEntityFromGrid;

var globalConfig = require('./config');

/**
 *
 * This is a web worker to allow computing pheromones in a separate thread
 * since it can often take a long time.
 * Here's how this system works:
 * - The worker is created on game start with a reference to it on the game state
 * - It maintains a copy of the grid and all its pheromones
 * - Whenever the floodFillSources or reverseFloodFillSources change,
 *   then post a message to the worker to compute the new pheromone state
 * - It uses modified versions of the simulation/pheromones floodFill and reverseFloodFill
 *   functions to make a list of positions with new pheromone values
 * - The worker then sends this list back to a pheromoneWorkerSystem that listens
 *   for messages
 * - This system dispatches an action to update all the pheromones at once
 */

var game = null;
var floodFillQueue = [];
var reverseFloodFillQueue = [];

onmessage = function onmessage(ev) {
  var action = ev.data;
  switch (action.type) {
    case 'INIT':
      {
        // console.log("worker inited");
        game = {
          grid: action.grid,
          entities: action.entities,
          PHEROMONE_EMITTER: _extends({}, action.PHEROMONE_EMITTER),

          floodFillQueue: [],
          reverseFloodFillQueue: [],
          dispersingPheromonePositions: {}
        };
        for (var pherType in globalConfig.pheromones) {
          var pheromone = globalConfig.pheromones[pherType];
          if (pheromone.isDispersing) {
            game.dispersingPheromonePositions[pherType] = {};
          }
        }
        break;
      }
    case 'FLOOD_FILL':
      {
        var _game$floodFillQueue;

        // console.log("worker received flood fill request", action.floodFillSources);
        if (!game) break;
        (_game$floodFillQueue = game.floodFillQueue).push.apply(_game$floodFillQueue, _toConsumableArray(action.floodFillSources));
        startFloodFill();
        break;
      }
    case 'REVERSE_FLOOD_FILL':
      {
        var _game$reverseFloodFil;

        // console.log("worker received reverse flood fill request");
        if (!game) break;
        (_game$reverseFloodFil = game.reverseFloodFillQueue).push.apply(_game$reverseFloodFil, _toConsumableArray(action.reverseFloodFillSources));
        startReverseFloodFill();
        break;
      }
    case 'DISPERSE_PHEROMONES':
      {
        if (!game) break;
        startDispersePheromones();
        break;
      }
    case 'SET_PHEROMONE':
      {
        var position = action.position,
            pheromoneType = action.pheromoneType,
            quantity = action.quantity,
            playerID = action.playerID;

        if (!game) break;
        setPheromone(game, position, pheromoneType, quantity, playerID);
        break;
      }
    case 'INSERT_IN_GRID':
      {
        var entity = action.entity;

        if (!game) break;
        insertEntityInGrid(game, entity);
        game.entities[entity.id] = entity; // need to re-up this in case of
        // entity type change
        break;
      }
    case 'REMOVE_FROM_GRID':
      {
        var _entity = action.entity;

        if (!game) break;
        removeEntityFromGrid(game, _entity);
        break;
      }
    case 'ADD_ENTITY':
      {
        var _entity2 = action.entity;

        if (!game) break;
        game.entities[_entity2.id] = _entity2;
        if (_entity2.pheromoneEmitter) {
          game.PHEROMONE_EMITTER[_entity2.id] = true;
        }
        if (_entity2.type == 'TURBINE') {
          game.TURBINE.push(_entity2.id);
        }
        break;
      }
    case 'REMOVE_ENTITY':
      {
        var _entity3 = action.entity;

        if (!game) break;
        delete game.entities[_entity3.id];
        if (_entity3.pheromoneEmitter) {
          delete game.PHEROMONE_EMITTER[_entity3.id];
        }
        if (_entity3.type == 'TURBINE') {
          game.TURBINE = game.TURBINE.filter(function (id) {
            return id != _entity3.id;
          });
        }
        break;
      }
    case 'SET_EMITTER_QUANTITY':
      {
        var entityID = action.entityID,
            _quantity = action.quantity;

        if (!game) break;
        var _entity4 = game.entities[entityID];
        game.entities[entityID].quantity = _quantity;
        if (_quantity == 0) {
          var revQuantity = globalConfig.pheromones[_entity4.pheromoneType].quantity;
          setPheromone(game, _entity4.position, _entity4.pheromoneType, revQuantity + 1, _entity4.playerID || 0);
          game.reverseFloodFillQueue.push({
            id: _entity4.id,
            playerID: _entity4.playerID || 0,
            pheromoneType: _entity4.pheromoneType,
            position: _entity4.position,
            quantity: revQuantity
          });
          startReverseFloodFill();
        } else {
          // game.floodFillQueue.push({
          //
          // });
          // startFloodFill();
        }
        break;
      }
    case 'CHANGE_EMITTER_TYPE':
      {
        var _entityID = action.entityID,
            _pheromoneType = action.pheromoneType;

        if (!game) break;
        game.entities[_entityID].pheromoneType = _pheromoneType;
        break;
      }
  }
};

var startFloodFill = function startFloodFill() {
  var result = [];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = game.floodFillQueue[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var source = _step.value;

      if (source.stale) {
        source.quantity = getQuantityForStalePos(game, source.position, source.pheromoneType, source.playerID).quantity;
      }
      if (globalConfig.pheromones[source.pheromoneType] == null) {
        console.log("no pheromone config", source.pheromoneType, source);
      }
      if (source.quantity > globalConfig.pheromones[source.pheromoneType].quantity) {
        // console.log("big quantity", source.quantity, source.pheromoneType, source);
        source.quantity = globalConfig.pheromones[source.pheromoneType].quantity;
      }
      if (source.pheromoneType == 'COLONY' && source.playerID == 0 && source.quantity > 0) {
        // console.log("got zero colony", source);
        source.playerID = 1;
      }
      var positions = floodFillPheromone(game, source.pheromoneType, source.playerID, [source], {});
      if (Object.keys(positions).length > 0) {
        result.push(positions);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  game.floodFillQueue = [];
  postMessage({ type: 'PHEROMONES', result: result });
};

var startReverseFloodFill = function startReverseFloodFill() {
  var result = [];
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = game.reverseFloodFillQueue[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var source = _step2.value;

      var positions = reverseFloodFillPheromone(game, source.pheromoneType, source.playerID, [source.position]);
      if (Object.keys(positions).length > 0) {
        result.push(positions);
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  game.reverseFloodFillQueue = [];
  postMessage({ type: 'PHEROMONES', result: result });
};

var startDispersePheromones = function startDispersePheromones() {
  var result = [];
  var nextDispersingPheromones = updateDispersingPheromones(game);
  for (var pherType in nextDispersingPheromones) {
    if (Object.keys(nextDispersingPheromones[pherType]).length > 0) {
      result.push(nextDispersingPheromones[pherType]);
    }
  }
  // console.log(result);
  if (result.length > 0) {
    postMessage({ type: 'PHEROMONES', result: result });
  }
};

/**
 * use queue to continuously find neighbors and set their pheromone
 * value to decayAmount less, if that is greater than its current value
 */
var floodFillPheromone = function floodFillPheromone(game, pheromoneType, playerID, posQueue, partialResults) {
  var resultPositions = _extends({}, partialResults);
  var config = globalConfig.pheromones[pheromoneType];

  while (posQueue.length > 0) {
    var _posQueue$shift = posQueue.shift(),
        position = _posQueue$shift.position,
        quantity = _posQueue$shift.quantity;

    var isOccupied = isPositionBlockingPheromone(game, pheromoneType, position);
    if ((!isOccupied || config.canInhabitBlocker) && getPheromoneAtPosition(game, position, pheromoneType, playerID) < quantity) {
      setPheromone(game, position, pheromoneType, quantity, playerID);
      resultPositions[encodePosition(position)] = { pheromoneType: pheromoneType, quantity: quantity, playerID: playerID };

      var neighborPositions = getNeighborPositions(game, { position: position }, false /* internal */);
      var decayAmount = config.decayAmount;
      var amount = Math.max(0, quantity - decayAmount);

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = neighborPositions[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var neighbor = _step3.value;

          if (isDiagonalMove(position, neighbor)) continue;
          var neighborAmount = getPheromoneAtPosition(game, neighbor, pheromoneType, playerID);
          var occupied = isPositionBlockingPheromone(game, pheromoneType, neighbor);
          if (amount > 0 && amount > neighborAmount && !occupied) {
            posQueue.push({ position: neighbor, quantity: amount });
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }

    // dispersing pheromones decay separately
    if (config.isDispersing) {
      var encodedPos = encodePosition(position);
      var _quantity2 = getPheromoneAtPosition(game, position, pheromoneType, playerID);
      if (_quantity2 > 0 && game.dispersingPheromonePositions[pheromoneType][encodedPos] == null) {
        game.dispersingPheromonePositions[pheromoneType][encodedPos] = {
          position: position, playerID: playerID, pheromoneType: pheromoneType, quantity: _quantity2
        };
      }
    }
  }
  return resultPositions;
};

/**
 * When a pheromoneBlocking entity is added into the grid, then it could close off
 * a path, requiring recalculation. So do:
 * Reverse flood fill where you start at the neighbors of the newly occupied position,
 * then 0 those positions out if they are bigger than all their neighbors,
 * then add THEIR non-zero neighbors to the queue and continue,
 * finally, re-do the flood fill on all the 0-ed out spaces in reverse order
 */
var reverseFloodFillPheromone = function reverseFloodFillPheromone(game, pheromoneType, playerID, posQueue) {
  var config = globalConfig.pheromones[pheromoneType];

  var resultPositions = [];
  var floodFillQueue = [];
  while (posQueue.length > 0) {
    var position = posQueue.shift();
    var amount = getPheromoneAtPosition(game, position, pheromoneType, playerID);
    var neighborAmount = getBiggestNeighborVal(game, position, pheromoneType, playerID);
    var maxAmount = config.quantity;
    var decayAmount = config.decayAmount;
    var shouldFloodFill = true;
    if (neighborAmount <= amount) {
      shouldFloodFill = false;
      setPheromone(game, position, pheromoneType, 0, playerID);
      resultPositions[encodePosition(position)] = { pheromoneType: pheromoneType, quantity: 0, playerID: playerID };
      var neighborPositions = getNeighborPositions(game, { position: position }, false /* internal */);
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = neighborPositions[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var neighbor = _step4.value;

          if (isDiagonalMove(position, neighbor)) continue;
          var _neighborAmount = getPheromoneAtPosition(game, neighbor, pheromoneType, playerID);
          if (_neighborAmount > 0 && _neighborAmount < maxAmount) {
            posQueue.push(neighbor);
          } else if (_neighborAmount == maxAmount) {
            // neighboring a pheromone source, so flood fill from here,
            // simpler than the block below this that computes neighbor positions for flood fill
            floodFillQueue.push({ position: position, quantity: maxAmount - decayAmount });
          }
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    }
    if (shouldFloodFill) {
      // if you aren't bigger than your biggest neighbor, then your value
      // is actually fine. So then add this position to the floodFillQueue
      // since it's right on the edge of the area that needs to be re-filled in
      var _neighborPositions = getNeighborPositions(game, { position: position }, false /* internal */);
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = _neighborPositions[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var _neighbor = _step5.value;

          if (isDiagonalMove(position, _neighbor)) continue;
          var occupied = isPositionBlockingPheromone(game, pheromoneType, _neighbor);
          var quantity = Math.max(0, amount - decayAmount);
          if (quantity > 0 && !occupied) {
            floodFillQueue.push({ position: _neighbor, quantity: quantity });
          }
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }
    }
  }
  return floodFillPheromone(game, pheromoneType, playerID, floodFillQueue, resultPositions);
};

// fade pheromones that disperse
var updateDispersingPheromones = function updateDispersingPheromones(game) {
  var nextDispersingPheromones = {};
  for (var pherType in globalConfig.pheromones) {
    var pheromone = globalConfig.pheromones[pherType];
    if (pheromone.isDispersing) {
      nextDispersingPheromones[pherType] = {};
    }
  }

  var rate = globalConfig.config.dispersingPheromoneUpdateRate;
  var nextTurbines = {}; // as fluid pheromones move, update turbines here
  // map of entityID --> thetaSpeed
  var nextEntities = {}; // if fluids freeze into entities, record them here
  // map of encoded position --> {type, quantity}
  for (var _pherType in game.dispersingPheromonePositions) {
    var nextFluid = {}; // the algorithm for gravity with fluids will try to push
    // the same source position multiple times, so don't let it
    for (var encodedPosition in game.dispersingPheromonePositions[_pherType]) {
      var source = game.dispersingPheromonePositions[_pherType][encodedPosition];
      var position = source.position,
          playerID = source.playerID,
          pheromoneType = source.pheromoneType;

      var config = globalConfig.pheromones[pheromoneType];

      var pheromoneQuantity = getPheromoneAtPosition(game, position, pheromoneType, playerID);

      //////////////////////////////////////////////////////////////////////////////
      // check for phase change
      var heat = getTemperature(game, position);
      var sendToOtherPhase = 0;
      var phaseChangeTo = null;
      var changedPhase = false;
      var cooled = false;
      var originalPosition = _extends({}, source.position);
      if (config.combustionPoint && heat >= config.combustionPoint && pheromoneQuantity > 0) {
        phaseChangeTo = config.combustsTo;
        if (pheromoneQuantity < 1) {
          sendToOtherPhase = pheromoneQuantity;
        } else {
          sendToOtherPhase = config.combustionRate * pheromoneQuantity;
        }
        changedPhase = true;

        // add heat:
        var heatQuantity = globalConfig.pheromones['HEAT'].quantity;
        setPheromone(game, position, 'HEAT', heatQuantity, playerID);
        game.floodFillQueue.push({
          playerID: 0,
          pheromoneType: 'HEAT',
          position: position,
          quantity: heatQuantity
        });
        // nextDispersingPheromones['HEAT'][encodePosition(position)] = {
        //   ...source,
        //   pheromoneType: 'HEAT',
        //   position: {...position},
        //   quantity: heatQuantity,
        // };
      } else if (config.heatPoint && heat >= config.heatPoint && pheromoneQuantity > 0) {
        phaseChangeTo = config.heatsTo;
        if (pheromoneQuantity < 1) {
          sendToOtherPhase = pheromoneQuantity;
        } else {
          sendToOtherPhase = config.heatRate * pheromoneQuantity;
        }
        if (phaseChangeTo == "STEAM") {
          sendToOtherPhase *= 2;
        }
        changedPhase = true;
      } else if (config.coolPoint && heat <= config.coolPoint && pheromoneQuantity > 0) {
        if (config.coolConcentration == null || pheromoneQuantity >= config.coolConcentration) {
          // console.log("cooling phase change at position", {...source.position});
          phaseChangeTo = config.coolsTo;
          if (pheromoneQuantity < 1) {
            sendToOtherPhase = pheromoneQuantity;
          } else {
            sendToOtherPhase = config.coolRate * pheromoneQuantity;
          }
          changedPhase = true;
          cooled = true;
        }
      }
      // set the value of this square to the amount sent to the other phase
      // OR if it's an entity, create it
      if (changedPhase) {
        if (config.coolsToEntity && cooled) {
          if (sendToOtherPhase > 0) {
            nextEntities[encodePosition(source.position)] = {
              type: phaseChangeTo,
              quantity: Math.round(sendToOtherPhase)
            };
          }
        } else {
          setPheromone(game, source.position, phaseChangeTo, sendToOtherPhase, playerID);
          nextDispersingPheromones[phaseChangeTo][encodePosition(source.position)] = _extends({}, source, { pheromoneType: phaseChangeTo, quantity: sendToOtherPhase });
        }

        // NOTE: I'm thinking of not doing it this way since it's complicated to send
        // the message for stuff to remove back and forth
        // // check if the ingredients are there for combinesTo and create that
        // // new thing
        // if (config.combinesTo != null) {
        //   const missingIngredients = true;
        //   for (const ingredient of config.combinesTo.ingredients) {
        //     if (ingredient.substance == 'ENTITY') {
        //       const entityType = ingredient.substance.type;
        //       for (const id of game[type]) {
        //         const ingEntity = game.entities[id];
        //         if (encodePosition(ingEntity.position) == encodePosition(source.position)) {
        //           missingIngredients = false;
        //           // TODO remove the coal
        //         }
        //       }
        //     } else if (ingredient.substance == 'PHEROMONE') {

        //     }
        //   }
        // }

        // then subtract the amount sent to the other phase from the amount we deal
        // with from now on
        pheromoneQuantity -= sendToOtherPhase;
      }
      //////////////////////////////////////////////////////////////////////////////


      // need to track if it became 0 on the last update and remove it now
      // (Can't remove it as soon as it becomes 0 or else we won't tell the client
      //  to also set itself to 0)
      if (!config.isFluid && pheromoneQuantity <= 0) {
        continue;
      }
      var decayRate = config.decayRate;
      if (decayRate == null) {
        decayRate = config.decayAmount;
      }
      // since we're only computed once every rate ticks, multiply here as if we had been
      // computing on every tick
      decayRate *= rate;

      //////////////////////////////////////////////////////////////////////////////
      // Update fluids
      if (config.isFluid && (pheromoneQuantity > 0 || !changedPhase)) {
        var y = 1;
        if (config.isRising) {
          y = -1;
        }
        var positionBelow = add(position, { x: 0, y: y });
        var occupied = isPositionBlockingPheromone(game, pheromoneType, positionBelow);
        var diagonal = false;
        var leftOrRight = false;
        var pherBotLeft = 0;
        var pherBotRight = 0;
        if (occupied || getPheromoneAtPosition(game, positionBelow, pheromoneType, playerID) > config.quantity - 1) {
          var botLeft = add(position, { x: -1, y: y });
          var botRight = add(position, { x: 1, y: y });
          var botLeftOccupied = isPositionBlockingPheromone(game, pheromoneType, botLeft);
          var botRightOccupied = isPositionBlockingPheromone(game, pheromoneType, botRight);
          if (!botLeftOccupied && !botRightOccupied) {
            var leftPher = getPheromoneAtPosition(game, botLeft, pheromoneType, playerID);
            var rightPher = getPheromoneAtPosition(game, botRight, pheromoneType, playerID);
            positionBelow = leftPher > rightPher ? botRight : botLeft;
            positionBelow = leftPher == rightPher ? oneOf([botLeft, botRight]) : positionBelow;
            // positionBelow = oneOf([botLeft, botRight]);
            occupied = false;
            diagonal = true;
          } else if (!botLeftOccupied) {
            positionBelow = botLeft;
            occupied = false;
            diagonal = true;
          } else if (!botRightOccupied) {
            positionBelow = botRight;
            occupied = false;
            diagonal = true;
          }
          // else check the pheromone values at the diagonal
          pherBotLeft = getPheromoneAtPosition(game, botLeft, pheromoneType, playerID);
          pherBotRight = getPheromoneAtPosition(game, botRight, pheromoneType, playerID);
          if (pherBotLeft > config.quantity - 1 && pherBotRight > config.quantity - 1) {
            occupied = true;
          }
        }
        var pheromoneDiag = getPheromoneAtPosition(game, positionBelow, pheromoneType, playerID);
        if (occupied && (!diagonal || pherBotLeft > config.quantity - 1 || pherBotRight > config.quantity - 1)) {
          var left = add(position, { x: -1, y: 0 });
          var right = add(position, { x: 1, y: 0 });
          var leftOccupied = isPositionBlockingPheromone(game, pheromoneType, left);
          var rightOccupied = isPositionBlockingPheromone(game, pheromoneType, right);
          if (!leftOccupied && !rightOccupied) {
            var _leftPher = getPheromoneAtPosition(game, left, pheromoneType, playerID);
            var _rightPher = getPheromoneAtPosition(game, right, pheromoneType, playerID);
            positionBelow = _leftPher > _rightPher ? right : left;
            positionBelow = _leftPher == _rightPher ? oneOf([left, right]) : positionBelow;
            // positionBelow = oneOf([left, right]);
            occupied = false;
            leftOrRight = true;
          } else if (!leftOccupied) {
            positionBelow = left;
            occupied = false;
            leftOrRight = true;
          } else if (!rightOccupied) {
            positionBelow = right;
            occupied = false;
            leftOrRight = true;
          }
          // don't spread left/right to a higher concentration
          // if (leftOrRight) {
          //   const leftRightQuantity =
          //     getPheromoneAtPosition(game, positionBelow, pheromoneType, playerID);
          //   if (leftRightQuantity + 1 >= pheromoneQuantity) {
          //     occupied = true;
          //     leftOrRight = false;
          //   }
          // }
        }
        if (!occupied) {
          var pheromoneBelow = getPheromoneAtPosition(game, positionBelow, pheromoneType, playerID);
          var maxQuantity = config.quantity;

          var targetPercentLeft = config.viscosity.verticalLeftOver;
          if (diagonal) {
            targetPercentLeft = config.viscosity.diagonalLeftOver;
          }
          if (leftOrRight) {
            targetPercentLeft = config.viscosity.horizontalLeftOver;
          }

          var pherToGive = pheromoneQuantity * (1 - targetPercentLeft);
          if (pheromoneBelow + pherToGive > maxQuantity) {
            pherToGive = maxQuantity - pheromoneBelow;
          }

          // check for turbines that should be spun
          if (!diagonal) {
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
              for (var _iterator6 = game.TURBINE[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                var turbineID = _step6.value;

                var turbine = game.entities[turbineID];
                // if source.position and positionBelow are both inside the turbine
                // then set its speed to be pherToGive / maxQuantity * maxThetaSpeed
                var turbinePositions = getEntityPositions(game, turbine);
                var positionBelowInside = false;
                var positionInside = false;
                var _iteratorNormalCompletion7 = true;
                var _didIteratorError7 = false;
                var _iteratorError7 = undefined;

                try {
                  for (var _iterator7 = turbinePositions[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var pos = _step7.value;

                    if (equals(pos, positionBelow)) positionBelowInside = true;
                    if (equals(pos, source.position)) positionInside = true;
                  }
                } catch (err) {
                  _didIteratorError7 = true;
                  _iteratorError7 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                      _iterator7.return();
                    }
                  } finally {
                    if (_didIteratorError7) {
                      throw _iteratorError7;
                    }
                  }
                }

                if (!positionBelowInside || !positionInside) continue;

                if (!nextTurbines[turbineID]) nextTurbines[turbineID] = 0;
                var dirTheta = vectorTheta(subtract(source.position, positionBelow));
                var dir = dirTheta > 0 ? 1 : -1;
                dir = 1;

                // decrease amount of pheromone travelling in this direction
                if (pherToGive > 1) {
                  // pherToGive = pherToGive - (pherToGive * 0.2);
                } else {
                  dir = 0;
                }
                nextTurbines[turbineID] += dir * pherToGive / maxQuantity * turbine.maxThetaSpeed;
              }
            } catch (err) {
              _didIteratorError6 = true;
              _iteratorError6 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion6 && _iterator6.return) {
                  _iterator6.return();
                }
              } finally {
                if (_didIteratorError6) {
                  throw _iteratorError6;
                }
              }
            }
          }

          var leftOverPheromone = pheromoneQuantity - pherToGive;
          // fluids only decay in very small concentrations
          if (leftOverPheromone > 1) {
            decayRate = 0;
          }

          // set pheromone at this position to the left over that couldn't fall down
          setPheromone(game, position, pheromoneType, leftOverPheromone - decayRate, playerID);

          // if (!nextFluid[encodePosition(position)]) {
          var nextQuantity = Math.max(0, leftOverPheromone - decayRate);
          if (nextQuantity != 0 || source.quantity != 0) {
            nextDispersingPheromones[pheromoneType][encodePosition(position)] = _extends({}, source, {
              position: _extends({}, position),
              quantity: nextQuantity
            });
            nextFluid[encodePosition(position)] = true;
          }
          // }

          pheromoneQuantity = pheromoneQuantity - leftOverPheromone + pheromoneBelow;
          // update the source to be the next position
          source.position = positionBelow;
        }
      }
      //////////////////////////////////////////////////////////////////////////////


      // fluids only decay in very small concentrations
      if (config.isFluid && pheromoneQuantity > 0.5 && pheromoneType != 'HOT_OIL') {
        decayRate = 0;
      }

      var finalPherQuantity = Math.max(0, pheromoneQuantity - decayRate);
      setPheromone(game, source.position, pheromoneType, finalPherQuantity, playerID);

      if (config.isFluid && !changedPhase) {
        if (finalPherQuantity - decayRate > 0) {
          nextFluid[encodePosition(source.position)] = true;
          nextDispersingPheromones[pheromoneType][encodePosition(source.position)] = _extends({}, source, { quantity: finalPherQuantity });
        }
      } else {
        nextDispersingPheromones[pheromoneType][encodePosition(source.position)] = _extends({}, source, { quantity: finalPherQuantity });
      }
    }
  }
  // console.log(nextDispersingPheromones);
  game.dispersingPheromonePositions = nextDispersingPheromones;

  // send turbines messages
  var _iteratorNormalCompletion8 = true;
  var _didIteratorError8 = false;
  var _iteratorError8 = undefined;

  try {
    for (var _iterator8 = game.TURBINE[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
      var _turbineID = _step8.value;

      if (nextTurbines[_turbineID] != null) {
        postMessage({
          type: 'TURBINES',
          entityID: _turbineID,
          thetaSpeed: nextTurbines[_turbineID]
        });
      }
    }

    // send entity messages
  } catch (err) {
    _didIteratorError8 = true;
    _iteratorError8 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion8 && _iterator8.return) {
        _iterator8.return();
      }
    } finally {
      if (_didIteratorError8) {
        throw _iteratorError8;
      }
    }
  }

  if (Object.keys(nextEntities).length > 0) {
    postMessage({
      type: 'ENTITIES',
      entities: nextEntities
    });
  }

  return nextDispersingPheromones;
};

},{"./config":1,"./selectors/neighbors":18,"./selectors/pheromones":19,"./simulation/entityOperations":22,"./simulation/pheromones":23,"./utils/gridHelpers":24,"./utils/helpers":25,"./utils/stochastic":26,"./utils/vectors":27}],14:[function(require,module,exports){
'use strict';

var _require = require('../utils/vectors'),
    subtract = _require.subtract,
    add = _require.add,
    makeVector = _require.makeVector,
    vectorTheta = _require.vectorTheta,
    round = _require.round,
    rotate = _require.rotate,
    floor = _require.floor;

var _require2 = require('../utils/gridHelpers'),
    lookupInGrid = _require2.lookupInGrid,
    getEntityPositions = _require2.getEntityPositions;

var _require3 = require('./renderHealthBar'),
    renderHealthBar = _require3.renderHealthBar;

var _require4 = require('../utils/helpers'),
    thetaToDir = _require4.thetaToDir;

var renderAgent = function renderAgent(ctx, game, agent, spriteRenderFn, noRotate) {
  ctx.save();

  // render relative to top left of grid square,
  // but first translate for rotation around the center
  // NOTE: to support NxM entities, width/height assumes an up-down orientation,
  // so when the agent is left-right, flip width and height
  var dir = thetaToDir(agent.theta);
  var width = dir == 'left' || dir == 'right' ? agent.height : agent.width;
  var height = dir == 'left' || dir == 'right' ? agent.width : agent.height;
  var position = agent.position;
  // if (agent.contPos != null) {
  //   position = agent.contPos;
  // }
  ctx.translate(position.x + width / 2, position.y + height / 2);
  if (!noRotate) {
    ctx.rotate(agent.theta);
  }
  ctx.translate(-agent.width / 2, -agent.height / 2);

  // render the specific agent here:
  spriteRenderFn(ctx, game, agent);

  if (!noRotate) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-width / 2, -height / 2);
  }

  // render hp bar
  // if (Math.ceil(agent.hp) < config[agent.playerID][agent.caste].hp) {
  //   renderHealthBar(ctx, agent, config[agent.playerID][agent.caste].hp);
  // }

  ctx.restore();

  if (game.showAgentDecision && agent.decisions != null) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = agent.decisions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var decision = _step.value;
        var _position = decision.position,
            score = decision.score,
            chosen = decision.chosen;
        var x = _position.x,
            y = _position.y;

        if (chosen) {
          ctx.strokeStyle = 'red';
          ctx.strokeRect(x, y, 1, 1);
        }
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.font = '1px sans serif';
        ctx.fillText(parseInt(score), x, y + 1, 1);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }
};

module.exports = { renderAgent: renderAgent };
},{"../utils/gridHelpers":24,"../utils/helpers":25,"../utils/vectors":27,"./renderHealthBar":15}],15:[function(require,module,exports){
'use strict';

var _require = require('../utils/vectors'),
    subtract = _require.subtract,
    add = _require.add,
    makeVector = _require.makeVector,
    vectorTheta = _require.vectorTheta;

var _require2 = require('../utils/gridHelpers'),
    lookupInGrid = _require2.lookupInGrid;

var renderHealthBar = function renderHealthBar(ctx, entity, maxHealth) {

  var renderHP = Math.ceil(entity.hp);
  if (renderHP == maxHealth) return;

  ctx.save();
  // always render healthbar above entity no matter its theta
  ctx.translate(entity.width / 2, entity.height / 2);
  ctx.rotate(-entity.theta);
  ctx.translate(-entity.width / 2, -entity.height / 2);

  var barWidth = 1.5;
  var barHeight = 0.20;
  if (entity.prevHP >= renderHP + 1 && entity.prevHPAge < 6) {
    var redWidth = entity.prevHP / maxHealth * barWidth;
    ctx.fillStyle = 'red';
    ctx.fillRect(-0.25, -0.2, redWidth, barHeight);
  }

  ctx.fillStyle = 'green';
  var healthWidth = Math.max(renderHP / maxHealth * barWidth, 0);
  ctx.fillRect(-0.25, -0.2, healthWidth, barHeight);

  ctx.strokeStyle = 'black';
  ctx.strokeRect(-0.25, -0.2, barWidth, barHeight);

  ctx.restore();
};

module.exports = { renderHealthBar: renderHealthBar };
},{"../utils/gridHelpers":24,"../utils/vectors":27}],16:[function(require,module,exports){
'use strict';

var _require = require('../utils/gridHelpers'),
    lookupInGrid = _require.lookupInGrid,
    getEntityPositions = _require.getEntityPositions;

var collides = function collides(game, entityA, entityB) {
  return collidesWith(game, entityA).filter(function (e) {
    return e.id === entityB.id;
  }).length > 0;
};

var collidesWith = function collidesWith(game, entity, blockingTypes) {
  var positions = getEntityPositions(game, entity);

  var collisions = [];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = positions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var pos = _step.value;

      var thisCell = collisionsAtSpace(game, entity, blockingTypes, pos);
      collisions.push.apply(collisions, thisCell);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return collisions;
};

// use special logic to see what is considered a collision at a given space
var collisionsAtSpace = function collisionsAtSpace(game, entity, blockingTypes, pos, neighbor) {
  if (entity == null) return [];
  var collisions = lookupInGrid(game.grid, pos).map(function (id) {
    return game.entities[id];
  }).filter(function (e) {
    return e != null && e.id != entity.id;
  }).filter(function (e) {
    return blockingTypes.includes(e.type);
  });
  return collisions;
};

module.exports = {
  collides: collides,
  collidesWith: collidesWith,
  collisionsAtSpace: collisionsAtSpace
};
},{"../utils/gridHelpers":24}],17:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _require = require('../utils/gridHelpers'),
    lookupInGrid = _require.lookupInGrid,
    getEntityPositions = _require.getEntityPositions,
    entityInsideGrid = _require.entityInsideGrid;

var _require2 = require('../utils/helpers'),
    thetaToDir = _require2.thetaToDir,
    isDiagonalMove = _require2.isDiagonalMove;

var _require3 = require('../selectors/collisions'),
    collidesWith = _require3.collidesWith;

var _require4 = require('../selectors/neighbors'),
    getFreeNeighborPositions = _require4.getFreeNeighborPositions,
    getNeighborPositions = _require4.getNeighborPositions;

var _require5 = require('../utils/vectors'),
    add = _require5.add,
    makeVector = _require5.makeVector,
    subtract = _require5.subtract,
    vectorTheta = _require5.vectorTheta,
    round = _require5.round,
    ceil = _require5.ceil,
    containsVector = _require5.containsVector,
    equals = _require5.equals;

var _require6 = require('../simulation/actionQueue'),
    makeAction = _require6.makeAction;

var _require7 = require('../selectors/pheromones'),
    getPheromoneAtPosition = _require7.getPheromoneAtPosition;

var onScreen = function onScreen(game, entity) {
  var viewPos = game.viewPos,
      viewWidth = game.viewWidth,
      viewHeight = game.viewHeight;
  var position = entity.position,
      width = entity.width,
      height = entity.height;
  var x = position.x,
      y = position.y;


  if (!game.maxMinimap) {
    return x + width >= viewPos.x - 1 && y + height >= viewPos.y - 1 && x <= viewWidth + viewPos.x + 1 && y <= viewHeight + viewPos.y + 1;
  } else {
    return x >= viewPos.x && y >= viewPos.y && x + width <= viewWidth + viewPos.x && y + height <= viewHeight + viewPos.y;
  }
};

// NOTE: outside of entity
var getPositionsInFront = function getPositionsInFront(game, entity) {
  var dimension = entity.width;
  if (entity.height > entity.width) {
    dimension = entity.height;
  }
  var magnitude = entity.theta < Math.PI * 0.9 ? -1 : -1 * dimension;
  var positions = [];
  for (var x = 0; x < entity.width; x++) {
    var neighborVec = { x: x, y: 0 };
    if (thetaToDir(entity.theta) == 'left' || thetaToDir(entity.theta) == 'right') {
      neighborVec = { x: 0, y: x };
    }
    // HACK: facing up-left or up-right diagonally causes the positions-in-front to be inside
    // BUT only the y-axis is off
    var roundingFn = Math.round;
    if (entity.theta > Math.PI) {
      roundingFn = Math.ceil;
    }

    var posSum = add(add(neighborVec, entity.position), makeVector(entity.theta, magnitude));
    positions.push({ x: Math.round(posSum.x), y: roundingFn(posSum.y) });
  }
  return positions;
};

// NOTE: outside of entity
var getPositionsBehind = function getPositionsBehind(game, entity) {
  if (entity.segmented) {
    var tailPos = entity.segments[entity.segments.length - 1].position;
    var segBeforeTailPos = entity.segments.length > 1 ? entity.segments[entity.segments.length - 2].position : entity.position;
    var theta = vectorTheta(subtract(segBeforeTailPos, tailPos));
    var behindPos = add(tailPos, makeVector(theta, -1));
    return [behindPos];
  }
  var dir = thetaToDir(entity.theta);
  var x = 0;
  var y = entity.height + 1;
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
  var offset = { x: x, y: y };
  return getPositionsInFront(game, entity).map(function (p) {
    return subtract(p, offset);
  });
};

var isFacing = function isFacing(game, entity, position) {
  var nextDir = thetaToDir(vectorTheta(subtract(entity.position, position)));
  var theta = !game.isTimeReversed ? entity.theta : entity.theta + Math.PI;
  return nextDir == thetaToDir(theta);
};

var canDoMove = function canDoMove(game, entity, nextPos) {
  if (!entityInsideGrid(game, _extends({}, entity, { position: nextPos }))) {
    return { result: false, reason: 'OUTSIDE_GRID' };
  }

  if (entity.segmented && isDiagonalMove(entity.position, nextPos)) {
    return { result: false, reason: 'SEGMENTED_DIAGONAL' };
  }

  if (!containsVector(getNeighborPositions(game, entity), nextPos)) {
    console.log(nextPos, entity.position, [].concat(_toConsumableArray(entity.history)));
    return { result: false, reason: 'TOO_FAR' };
  }

  var blockers = entity.blockingTypes;
  var freeInternalNeighbors = getFreeNeighborPositions(game, entity, blockers);
  var blockedBy = collidesWith(game, _extends({}, entity, { position: nextPos }), blockers);
  if (!containsVector(freeInternalNeighbors, nextPos) && !equals(nextPos, entity.position) || blockedBy.length > 0) {
    return { result: false, reason: 'BLOCKED' };
  }

  // CAN do the move even if not facing
  // if (!isFacing(game, entity, nextPos)) {
  //   return false;
  // }

  return { result: true };
};

/**
 *  Returns the entityAction the controlled Entity would do if
 *  you pressed E right now
 */
var getControlledEntityInteraction = function getControlledEntityInteraction(game, agent) {
  // PUTDOWN if holding
  if (agent.holding != null) {
    return makeAction(game, agent, 'PUTDOWN', null);
  }
  var positionsInFront = getPositionsInFront(game, agent);
  // PICKUP if there's something to pick up
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = positionsInFront[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var pickupPos = _step.value;

      var pickup = lookupInGrid(game.grid, pickupPos).map(function (id) {
        return game.entities[id];
      }).filter(function (e) {
        return agent.pickupTypes.includes(e.type);
      })[0];
      if (pickup != null) {
        return makeAction(game, agent, 'PICKUP', { pickup: pickup, position: pickupPos });
      }
    }

    // else return PICKUP by default
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return makeAction(game, agent, 'PICKUP', { pickup: null, position: positionsInFront[0] });
};

// a position is lit if it or any of its neighbors contain any of the LIGHT_ pheromones
var isLit = function isLit(game, position) {
  for (var i = 0; i < game.AGENT.length; i++) {
    var isInLight = getPheromoneAtPosition(game, position, 'LIGHT_' + i, 1) > 0;
    if (isInLight) return true;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = getNeighborPositions(game, { position: position })[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var neighbor = _step2.value;

        if (getPheromoneAtPosition(game, neighbor, 'LIGHT_' + i, 1)) {
          return true;
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  }

  return false;
};

// returns true if an agent is in the light of another agent
var inOtherLight = function inOtherLight(game, agent) {
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = getEntityPositions(game, agent)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var pos = _step3.value;

      for (var i = 0; i < game.AGENT.length; i++) {
        if ('LIGHT_' + i == agent.pheromoneType) continue;
        var isInLight = getPheromoneAtPosition(game, pos, 'LIGHT_' + i, 1) > 0;
        if (isInLight) return true;
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  return false;
};

module.exports = {
  onScreen: onScreen,
  getPositionsInFront: getPositionsInFront,
  getPositionsBehind: getPositionsBehind,
  isFacing: isFacing,
  canDoMove: canDoMove,
  getControlledEntityInteraction: getControlledEntityInteraction,
  isLit: isLit,
  inOtherLight: inOtherLight
};
},{"../selectors/collisions":16,"../selectors/neighbors":18,"../selectors/pheromones":19,"../simulation/actionQueue":21,"../utils/gridHelpers":24,"../utils/helpers":25,"../utils/vectors":27}],18:[function(require,module,exports){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _require = require('../utils/vectors'),
    equals = _require.equals,
    add = _require.add,
    subtract = _require.subtract,
    containsVector = _require.containsVector;

var _require2 = require('../utils/gridHelpers'),
    lookupInGrid = _require2.lookupInGrid,
    insideGrid = _require2.insideGrid,
    getEntityPositions = _require2.getEntityPositions;

var _require3 = require('../selectors/collisions'),
    collidesWith = _require3.collidesWith,
    collisionsAtSpace = _require3.collisionsAtSpace;

var getNeighborEntities = function getNeighborEntities(game, entity, external) {
  if (entity.position == null) return [];

  var neighborIDs = [];
  var neighborPositions = getNeighborPositions(game, entity, external);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = neighborPositions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var pos = _step.value;

      var entitiesInCell = lookupInGrid(game.grid, pos).filter(function (id) {
        return !neighborIDs.includes(id) && id != entity.id;
      });
      neighborIDs.push.apply(neighborIDs, _toConsumableArray(entitiesInCell));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return neighborIDs.map(function (id) {
    return game.entities[id];
  });
};

var getNeighborEntitiesAndPosition = function getNeighborEntitiesAndPosition(game, entity) {
  if (entity.position == null) return [];

  var neighborObjs = [];
  var neighborPositions = getNeighborPositions(game, entity, true /* external */);
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = neighborPositions[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var pos = _step2.value;

      var entitiesInCell = lookupInGrid(game.grid, pos).filter(function (id) {
        return !neighborObjs.includes(id) && id != entity.id;
      });
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = entitiesInCell[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var id = _step3.value;

          neighborObjs.push({ entity: game.entities[id], position: pos });
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return neighborObjs;
};

var areNeighbors = function areNeighbors(game, entityA, entityB) {
  if (entityA == null || entityB == null) return false;
  var aNeighbors = getNeighborEntities(game, entityA, true);
  return aNeighbors.filter(function (e) {
    return e.id === entityB.id;
  }).length > 0;
};

var getFreeNeighborPositions = function getFreeNeighborPositions(game, entity, blockingTypes, external) {
  var neighborPositions = getNeighborPositions(game, entity, external /* internal by default */);
  var freePositions = [];
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = neighborPositions[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var pos = _step4.value;

      var isOccupied = collisionsAtSpace(game, entity, blockingTypes, pos, true /*neighbor*/).length > 0;

      // const alreadyCollidesWith = collidesWith(game, entity, blockingTypes)
      //   .map(e => e.id);
      // const alreadyColliding = entitiesAtPos
      //   .filter(e => !alreadyCollidesWith.includes(e.id))
      //   .length > 0;
      if (!isOccupied) {
        freePositions.push(pos);
      }
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  return freePositions;
};

/**
 * external means the neighbor positions should all be outside the entity,
 * regardless its size,
 * whereas !external means the directly-neighboring positions to the entity's
 * position value
 */
var getNeighborPositions = function getNeighborPositions(game, entity, external) {
  var positions = [];
  var neighbors = [
  // {x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1},
  { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }];
  if (external) {
    var entityPositions = getEntityPositions(game, entity);
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
      for (var _iterator5 = entityPositions[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
        var pos = _step5.value;
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
          for (var _iterator6 = neighbors[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var n = _step6.value;

            var potentialNeighbor = add(n, pos);
            if (!containsVector(entityPositions, potentialNeighbor) && !containsVector(positions, potentialNeighbor) && insideGrid(game.grid, potentialNeighbor)) {
              positions.push(potentialNeighbor);
            }
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
              _iterator6.return();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }
      }
    } catch (err) {
      _didIteratorError5 = true;
      _iteratorError5 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion5 && _iterator5.return) {
          _iterator5.return();
        }
      } finally {
        if (_didIteratorError5) {
          throw _iteratorError5;
        }
      }
    }
  } else {
    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
      for (var _iterator7 = neighbors[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
        var _n = _step7.value;

        var _potentialNeighbor = add(entity.position, _n);
        if (insideGrid(game.grid, _potentialNeighbor)) {
          positions.push(_potentialNeighbor);
        }
      }
    } catch (err) {
      _didIteratorError7 = true;
      _iteratorError7 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion7 && _iterator7.return) {
          _iterator7.return();
        }
      } finally {
        if (_didIteratorError7) {
          throw _iteratorError7;
        }
      }
    }
  }

  return positions;
};

module.exports = {
  getNeighborPositions: getNeighborPositions,
  getNeighborEntities: getNeighborEntities,
  getNeighborEntitiesAndPosition: getNeighborEntitiesAndPosition,
  getFreeNeighborPositions: getFreeNeighborPositions,
  areNeighbors: areNeighbors
};
},{"../selectors/collisions":16,"../utils/gridHelpers":24,"../utils/vectors":27}],19:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../utils/vectors'),
    add = _require.add,
    multiply = _require.multiply,
    subtract = _require.subtract,
    equals = _require.equals,
    floor = _require.floor,
    containsVector = _require.containsVector;

var _require2 = require('../utils/helpers'),
    isDiagonalMove = _require2.isDiagonalMove;

var _require3 = require('../selectors/neighbors'),
    getNeighborPositions = _require3.getNeighborPositions;

var _require4 = require('../utils/gridHelpers'),
    lookupInGrid = _require4.lookupInGrid,
    getEntityPositions = _require4.getEntityPositions,
    insideGrid = _require4.insideGrid;

var globalConfig = require('../config');

var getPheromoneAtPosition = function getPheromoneAtPosition(game, position, type, playerID) {
  var grid = game.grid;

  if (!insideGrid(grid, position)) return 0;
  var x = position.x,
      y = position.y;

  if (!grid[x][y][playerID]) return 0;
  return grid[x][y][playerID][type] || 0;
};

var getAllPheromonesAtPosition = function getAllPheromonesAtPosition(game, position, playerID) {
  var grid = game.grid;
  if (!insideGrid(grid, position)) return [];

  var pheromones = _extends({}, grid[position.x][position.y][playerID]);
  if (pheromones == null) {
    pheromones = {};
  }
  for (var pheromoneType in globalConfig.pheromones) {
    if (!pheromones[pheromoneType]) {
      pheromones[pheromoneType] = 0;
    }
  }

  return pheromones;
};

var getTemperature = function getTemperature(game, position) {
  return getPheromoneAtPosition(game, position, 'HEAT', 0) - getPheromoneAtPosition(game, position, 'COLD', 0);
};

/**
 * When a position is opened up, get candidate {pos, quantity} based on the
 * pheromone value of the greatest neighbor OR
 * if this position is itself generating pheromones (because it's in a
 * token radius) then just return that value
 */
var getQuantityForStalePos = function getQuantityForStalePos(game, position, pheromoneType, playerID) {
  var relevantEmitters = lookupInGrid(game.grid, position).map(function (id) {
    return game.entities[id];
  }).filter(function (e) {
    return e.pheromoneType == pheromoneType;
  });
  if (relevantEmitters.length > 0) {
    var entity = relevantEmitters[0];
    if (entity.quantity > 0) {
      return {
        position: position,
        quantity: entity.quantity
      };
    }
  }

  var neighborPositions = getNeighborPositions(game, { position: position }, false /* internal */);
  var decayAmount = globalConfig.pheromones[pheromoneType].decayAmount;
  var quantity = 0;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = neighborPositions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var pos = _step.value;

      if (isDiagonalMove(position, pos)) continue;
      var candidateAmount = getPheromoneAtPosition(game, pos, pheromoneType, playerID) - decayAmount;
      if (candidateAmount > quantity) {
        quantity = candidateAmount;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return { position: position, quantity: quantity };
};

/**
 * If the given entity is a pheromone source, return it/any positions associated with
 * it that are also pheromone sources
 */
var getEntityPheromoneSources = function getEntityPheromoneSources(game, entity) {

  var pheromoneType = null;
  var playerID = null;
  var quantity = 0;

  var sources = [];
  if (entity.pheromoneEmitter) {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = getEntityPositions(game, entity)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var pos = _step2.value;

        sources.push({
          id: entity.id,
          playerID: entity.playerID || 0,
          pheromoneType: entity.pheromoneType,
          position: pos,
          quantity: entity.quantity
        });
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  }
  return sources;
};

/**
 *  Function used at the game start to populate the initial set of pheromones
 *  across all entities emitting pheromones of the given type and playerID
 */
var getSourcesOfPheromoneType = function getSourcesOfPheromoneType(game, pheromoneType, playerID) {
  var sources = [];
  for (var entityID in game.PHEROMONE_EMITTER) {
    var entity = game.entities[entityID];
    if (entity.pheromoneType != pheromoneType) continue;
    if (entity.playerID != playerID) continue;
    if (entity.quantity <= 0) continue;
    sources.push(entity);
  }
  return sources;
};

var isPositionBlockingPheromone = function isPositionBlockingPheromone(game, pheromoneType, position) {
  var config = globalConfig.pheromones[pheromoneType];
  var occupied = lookupInGrid(game.grid, position).map(function (id) {
    return game.entities[id];
  }).filter(function (e) {
    return e != null && config.blockingTypes.includes(e.type);
  }).length > 0;

  if (occupied) return true;
  if (config.blockingPheromones.length == 0) return false;

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = config.blockingPheromones[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var blockingPher = _step3.value;

      if (getPheromoneAtPosition(game, position, blockingPher, 0) > 0) {
        return true;
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  return false;
};

module.exports = {
  getPheromoneAtPosition: getPheromoneAtPosition,
  getTemperature: getTemperature,
  getSourcesOfPheromoneType: getSourcesOfPheromoneType,
  getEntityPheromoneSources: getEntityPheromoneSources,
  getQuantityForStalePos: getQuantityForStalePos,
  isPositionBlockingPheromone: isPositionBlockingPheromone,
  getAllPheromonesAtPosition: getAllPheromonesAtPosition
};
},{"../config":1,"../selectors/neighbors":18,"../utils/gridHelpers":24,"../utils/helpers":25,"../utils/vectors":27}],20:[function(require,module,exports){
'use strict';

var _require = require('../utils/vectors'),
    equals = _require.equals,
    add = _require.add,
    subtract = _require.subtract,
    magnitude = _require.magnitude,
    scale = _require.scale,
    vectorTheta = _require.vectorTheta,
    abs = _require.abs;

var _require2 = require('../simulation/actionQueue'),
    getDuration = _require2.getDuration,
    getFrame = _require2.getFrame;

var _require3 = require('../utils/gridHelpers'),
    lookupInGrid = _require3.lookupInGrid;

var _require4 = require('../selectors/neighbors'),
    getNeighborPositions = _require4.getNeighborPositions;

var _require5 = require('../selectors/misc'),
    getPositionsInFront = _require5.getPositionsInFront;

var _require6 = require('../selectors/pheromones'),
    getPheromoneAtPosition = _require6.getPheromoneAtPosition;

var _require7 = require('../utils/helpers'),
    thetaToDir = _require7.thetaToDir,
    closeToTheta = _require7.closeToTheta;

var globalConfig = require('../config');

var getInterpolatedPos = function getInterpolatedPos(game, entity) {
  var action = entity.actions[0];
  var entityPosition = entity.position;
  var pos = entity.position;
  if (entity.contPos != null) {
    pos = entity.contPos;
    entityPosition = entity.contPos;
  }
  if (action != null && !entity.stuck) {
    switch (action.type) {
      case 'MOVE_TURN':
      case 'MOVE':
        {
          var diff = subtract(entityPosition, entity.prevPosition);
          var duration = getDuration(game, entity, action.type);
          var actionDuration = Math.min(duration, action.duration);
          var progress = (duration - actionDuration) / duration;
          pos = add(entity.prevPosition, scale(diff, progress));
          break;
        }
      case 'PUTDOWN':
      case 'PICKUP':
        {
          var posInFront = getPositionsInFront(game, entity)[0];
          var _diff = subtract(posInFront, entityPosition);
          var _duration = getDuration(game, entity, action.type);
          var _progress = (_duration - Math.abs(_duration / 2 - action.duration)) / _duration;
          if (magnitude(_diff) > 1) {
            _progress *= 0.5;
          }
          pos = add(entityPosition, scale(_diff, _progress));
          break;
        }
    }
  }
  return pos;
};

var getInterpolatedTheta = function getInterpolatedTheta(game, entity) {
  var action = entity.actions[0];
  var theta = entity.theta;
  if (action == null) return theta;
  switch (action.type) {
    case 'MOVE_TURN':
      {
        var diff = entity.theta - entity.prevTheta;
        if (Math.abs(diff) < 0.01) break;
        if (Math.abs(diff) > Math.PI) {
          var mult = diff < 0 ? 1 : -1;
          diff = mult * (2 * Math.PI - Math.abs(diff));
        }
        var duration = getDuration(game, entity, action.type);
        var progress = Math.max(0, (duration - action.duration / 3) / duration);
        theta = progress * diff + entity.prevTheta;
        break;
      }
    case 'OPEN':
    case 'TURN':
      {
        var _diff2 = entity.theta - entity.prevTheta;
        if (Math.abs(_diff2) > Math.PI) {
          var _mult = _diff2 < 0 ? 1 : -1;
          _diff2 = _mult * (2 * Math.PI - Math.abs(_diff2));
        }
        var _duration2 = getDuration(game, entity, action.type);
        var _progress2 = (_duration2 - (action.duration + 0)) / _duration2;
        theta = _progress2 * _diff2 + entity.prevTheta;
        break;
      }
  }
  return theta;
};

var getInterpolatedIndex = function getInterpolatedIndex(game, entity) {
  var action = entity.actions[0];
  if (action == null) return 0;

  var duration = getDuration(game, entity, action.type);
  return Math.max(duration - action.duration - 1, 0);
};

var getMaxFrameOffset = function getMaxFrameOffset(entity) {
  if (!entity.actions) return { maxFrameOffset: 0, frameStep: 0 };
  if (entity.actions.length == 0) return { maxFrameOffset: 0, frameStep: 0 };
  if (!entity.isAgent) return { maxFrameOffset: 0, frameStep: 0 };

  var actionType = entity.actions[0].type;
  return {
    maxFrameOffset: entity[actionType].maxFrameOffset || 0,
    frameStep: entity[actionType].frameStep || 0
  };
};

//////////////////////////////////////////////////////////////////////
// Buttons, Gates
/////////////////////////////////////////////////////////////////////

var getButtonSprite = function getButtonSprite(game, button) {
  var width = 94.5;
  var height = button.isPressed ? 88 : 94.3;
  var img = button.isPressed ? game.sprites.PRESSED_BUTTON : game.sprites.BUTTON;

  var obj = {
    img: img,
    x: button.buttonID % 3 * width,
    y: Math.floor(button.buttonID / 3) * height,
    width: width,
    height: height
  };

  return obj;
};

var getGateSprite = function getGateSprite(game, gate) {
  var width = 97.5;
  var height = 97.5;
  var img = game.sprites.GATE;
  var obj = {
    img: img,
    x: 0,
    y: height,
    width: width,
    height: height
  };

  return obj;
};

var getFloorSprite = function getFloorSprite(game) {
  var width = 180;
  var height = 172;
  var img = game.sprites.FLOOR;
  var obj = {
    img: img,
    x: 0,
    y: 0,
    width: width,
    height: height
  };

  return obj;
};

//////////////////////////////////////////////////////////////////////
// Ant-specific
//////////////////////////////////////////////////////////////////////

var getAntSpriteAndOffset = function getAntSpriteAndOffset(game, ant) {
  var width = 32;
  var height = 32;
  var img = game.sprites.ANT;
  if (ant.playerID != game.playerID) {
    if (ant.playerID == 2) {
      img = game.sprites.RED_ANT;
    } else {
      img = game.sprites.YELLOW_ANT;
    }
  } else if (ant.caste == 'YOUNG_QUEEN') {
    img = game.sprites.YOUNG_QUEEN;
    height = 64;
  }

  var obj = {
    img: img,
    x: 0,
    y: 0,
    width: width,
    height: height
  };

  var index = getInterpolatedIndex(game, ant);
  if (ant.type == "DEAD_ANT") {
    index = ant.caste == 'YOUNG_QUEEN' ? 3 : 8;
    obj.x = index * width;
  } else if (ant.actions.length == 0) {
    return obj;
  } else {
    var frame = getFrame(game, ant, index);
    obj.x = frame * width;
  }

  return obj;
};

//////////////////////////////////////////////////////////////////////
// Pheromones
/////////////////////////////////////////////////////////////////////

var getPheromoneSprite = function getPheromoneSprite(game, position, playerID, pheromoneType) {
  var width = 16;
  var height = 16;
  var numFrames = 8;
  var img = game.sprites.PHEROMONE;
  var config = globalConfig.pheromones[pheromoneType];
  var quantity = getPheromoneAtPosition(game, position, pheromoneType, playerID);
  var progress = numFrames - Math.round(quantity / config.quantity * numFrames);
  var obj = {
    img: img,
    x: progress * width,
    y: config.tileIndex * height,
    width: width,
    height: height,
    theta: 0
  };

  if (quantity > config.quantity - config.decayAmount || pheromoneType == 'WATER') {
    obj.x = 5;
    obj.y += 4;
    obj.width = 4;
    obj.height = 4;
    return obj;
  }

  var neighborPositions = getNeighborPositions(game, { position: position }, false /* internal */
  );
  var neighborAmount = 0;
  var neighborPosition = null;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = neighborPositions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var pos = _step.value;

      var candidateAmount = getPheromoneAtPosition(game, pos, pheromoneType, playerID);
      if (candidateAmount > neighborAmount) {
        neighborAmount = candidateAmount;
        neighborPosition = pos;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  if (neighborPosition != null) {
    obj.theta = vectorTheta(subtract(position, neighborPosition)) + Math.PI / 2;
    // flip around if you are bigger than your biggest neighbor
    if (neighborAmount < quantity) {
      obj.theta += Math.PI;
    }
  }

  return obj;
};

//////////////////////////////////////////////////////////////////////
// Tile-specific
/////////////////////////////////////////////////////////////////////

// indicies into the spritesheet
var tileDict = {
  'ltb': { x: 0, y: 1 },
  'rtb': { x: 2, y: 1 },
  'lrt': { x: 1, y: 0 },
  'lrb': { x: 1, y: 2 },
  't': { x: 3, y: 0 },
  'b': { x: 3, y: 2 },
  'tb': { x: 3, y: 1 },
  'lt': { x: 0, y: 0 },
  'lb': { x: 0, y: 2 },
  'rt': { x: 2, y: 0 },
  'rb': { x: 2, y: 2 },
  'l': { x: 0, y: 3 },
  'lr': { x: 1, y: 3 },
  'r': { x: 2, y: 3 },
  'lrtb': { x: 1, y: 1 },
  '': { x: 3, y: 3 }
};

var getTileSprite = function getTileSprite(game, entity) {
  var entityType = entity.type;
  var width = 47.25;
  var height = 47.25;
  var spriteType = entityType.subtType != null ? entity.subType : entityType;
  spriteType = spriteType == null ? entityType : spriteType;
  var img = game.sprites[spriteType];
  var obj = {
    img: img,
    x: 0,
    y: 0,
    width: width,
    height: height
  };
  var dictIndexStr = entity.dictIndexStr;

  if (dictIndexStr == null) dictIndexStr = '';

  if (tileDict[dictIndexStr] == null) {
    console.error("nothing in config for", dictIndexStr);
    return obj;
  }
  var _tileDict$dictIndexSt = tileDict[dictIndexStr],
      x = _tileDict$dictIndexSt.x,
      y = _tileDict$dictIndexSt.y;

  obj.x = x * width;
  obj.y = y * height;

  return obj;
};

var hasNeighbor = function hasNeighbor(game, pos, type) {
  return lookupInGrid(game.grid, pos).map(function (id) {
    return game.entities[id];
  }).filter(function (e) {
    return e != null && e.type == type;
  }).length > 0;
};

var getDictIndexStr = function getDictIndexStr(game, entity) {
  var dictIndexStr = '';
  if (entity.position == null) return dictIndexStr;
  if (hasNeighbor(game, add(entity.position, { x: 1, y: 0 }), entity.type)) {
    dictIndexStr += 'l';
  }
  if (hasNeighbor(game, add(entity.position, { x: -1, y: 0 }), entity.type)) {
    dictIndexStr += 'r';
  }
  if (hasNeighbor(game, add(entity.position, { x: 0, y: 1 }), entity.type)) {
    dictIndexStr += 't';
  }
  if (hasNeighbor(game, add(entity.position, { x: 0, y: -1 }), entity.type)) {
    dictIndexStr += 'b';
  }
  return dictIndexStr;
};

//////////////////////////////////////////////////////////////////////
// Background
/////////////////////////////////////////////////////////////////////

var getBackgroundSprite = function getBackgroundSprite(game, entity) {
  var width = 100;
  var height = 50;
  var img = game.sprites[entity.name];
  var obj = {
    img: img,
    x: 0,
    y: 0,
    width: 1,
    height: 1
  };

  obj.x = entity.position.x;
  obj.y = entity.position.y;

  return obj;
};

module.exports = {
  getInterpolatedPos: getInterpolatedPos,
  getInterpolatedTheta: getInterpolatedTheta,
  getInterpolatedIndex: getInterpolatedIndex,
  getAntSpriteAndOffset: getAntSpriteAndOffset,
  getTileSprite: getTileSprite,
  getButtonSprite: getButtonSprite,
  getGateSprite: getGateSprite,
  getFloorSprite: getFloorSprite,
  getPheromoneSprite: getPheromoneSprite,
  getDictIndexStr: getDictIndexStr,
  getBackgroundSprite: getBackgroundSprite,
  getMaxFrameOffset: getMaxFrameOffset
};
},{"../config":1,"../selectors/misc":17,"../selectors/neighbors":18,"../selectors/pheromones":19,"../simulation/actionQueue":21,"../utils/gridHelpers":24,"../utils/helpers":25,"../utils/vectors":27}],21:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('../utils/helpers'),
    closeToTheta = _require.closeToTheta,
    isDiagonalTheta = _require.isDiagonalTheta,
    thetaToDir = _require.thetaToDir,
    deepCopy = _require.deepCopy;

var _require2 = require('../selectors/pheromones'),
    getPheromoneAtPosition = _require2.getPheromoneAtPosition;

var _require3 = require('../utils/vectors'),
    floor = _require3.floor,
    ceil = _require3.ceil;

// -----------------------------------------------------------------------
// Queueing Actions
// -----------------------------------------------------------------------

var cancelAction = function cancelAction(game, entity) {
  if (entity.actions.length == 0) return;

  var curAction = entity.actions[0];
  switch (curAction.type) {
    case 'MOVE':
      entity.prevPosition = _extends({}, entity.position);
      break;
    case 'TURN':
      entity.prevTheta = entity.theta;
      break;
    case 'MOVE_TURN':
      entity.prevPosition = _extends({}, entity.position);
      entity.prevTheta = entity.theta;
      break;
  }

  // if (!game.isTimeReversed) {
  //   delete entity.history[game.time];
  //   delete entity.reverseHistory[game.time + curAction.duration];
  // }

  entity.actions.shift();
};

// stacked actions come before other queued actions
var stackAction = function stackAction(game, entity, action) {
  if (!entity.actions) {
    entity.actions = [];
  }
  if (!game.ACTOR[entity.id]) {
    game.ACTOR[entity.id] = true;
    entity.isActor = true;
  }
  if (entity.actions.length == 0) {
    entity.actions.push(action);
    return;
  }

  var curAction = entity.actions[0];
  // HACK: this nonsense is because if the ant was previously pointing diagonally,
  // and then points at a 90degree angle, the duration needs to change from 1.4x
  // to just 1x, but the entity's action won't ever update unless we pre-send
  // that theta and update the action here as soon as we stack it
  var theta = action.type == 'TURN' ? action.payload : entity.theta;
  theta = action.type == 'MOVE_TURN' ? action.payload.nextTheta : theta;
  curAction.duration = getDuration(game, _extends({}, entity, { theta: theta }), curAction.type);
  curAction.effectDone = false;

  entity.actions.unshift(action);
};

var queueAction = function queueAction(game, entity, action) {
  // const curAction = entity.actions[0];
  // if (curAction != null) {
  //   // HACK: this nonsense is because if the ant was previously pointing diagonally,
  //   // and then points at a 90degree angle, the duration needs to change from 1.4x
  //   // to just 1x, but the entity's action won't ever update unless we pre-send
  //   // that theta and update the action here as soon as we stack it
  //   let theta = action.type == 'TURN'
  //     ? action.payload : entity.theta;
  //   theta = action.type == 'MOVE_TURN' ? action.payload.nextTheta : theta;
  //   action.duration = getDuration(game, {...entity, theta}, curAction.type);
  // }

  if (!entity.actions) {
    entity.actions = [];
  }
  if (!game.ACTOR[entity.id]) {
    game.ACTOR[entity.id] = true;
    entity.isActor = true;
  }
  entity.actions.push(action);
};

// -----------------------------------------------------------------------
// Making Actions
// -----------------------------------------------------------------------

var makeAction = function makeAction(game, entity, actionType, payload) {
  var duration = getDuration(game, entity, actionType);
  // HACK: for making entities take twice as long to turn
  // NOTE: also requires change in getDuration below
  // if (actionType == 'TURN') {
  //   const thetaDiff = Math.abs(entity.theta - payload) % (2*Math.PI);
  //   if (closeToTheta(thetaDiff, Math.PI)) {
  //     duration *= 2;
  //   }
  // }

  var config = entity;
  var effectIndex = 0;
  if (config[actionType] != null) {
    effectIndex = config[actionType].effectIndex || 0;
  }

  var action = {
    type: actionType,
    duration: duration,
    payload: payload,
    effectIndex: effectIndex,
    effectDone: false
  };
  return action;
};

// -----------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------

var isActionTypeQueued = function isActionTypeQueued(game, entity, actionType, almostDone) {
  if (entity.actions == null) {
    return false;
  }
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = entity.actions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var action = _step.value;

      if (action.type == actionType) {
        if (almostDone && action.duration <= game.timeSinceLastTick) {
          continue;
        }
        return true;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return false;
};

var getDuration = function getDuration(game, entity, actionType) {
  var config = entity;
  if (!config[actionType]) return 1;
  var duration = config[actionType].duration;

  if (
  // (actionType == 'MOVE' || actionType == 'MOVE_TURN') &&
  actionType == 'MOVE' && isDiagonalTheta(entity.theta)) {
    duration = Math.round(duration * 1.4); // sqrt(2)
  }
  if (!entity || !entity.position) return duration;

  // slowed down by water
  var inWater = getPheromoneAtPosition(game, floor(entity.position), 'WATER', game.playerID) > 0 || getPheromoneAtPosition(game, floor(entity.prevPosition), 'WATER', game.playerID) > 0;
  if ((actionType == 'MOVE' || actionType == 'MOVE_TURN') && inWater) {
    duration *= 2.5;
  }

  // HACK: for making critters take twice as long to turn
  // NOTE: also requires change in makeAction above
  // if (actionType == 'TURN') {
  //   let curAction = entity.actions[0];
  //   if (curAction == null) return duration;
  //   // if this is true, then we're in the current turn action already
  //   if (curAction.payload == entity.theta) {
  //     const thetaDiff = Math.abs(entity.prevTheta - entity.theta) % (2*Math.PI);
  //     if (closeToTheta(thetaDiff, Math.PI)) {
  //       duration *= 2;
  //     }
  //   }
  // }

  return duration;
};

var getFrame = function getFrame(game, entity, index) {
  var config = entity;
  if (entity.actions.length == 0) {
    // HACK: set standing-still frame for agent
    if (entity.type == 'AGENT') {
      var dir = thetaToDir(entity.theta);
      return dir == 'left' || dir == 'right' ? 4 : 2;
    } else {
      return 0;
    }
  }
  var actionType = entity.actions[0].type;

  // compute hacky frameOffset
  var frameOffset = 0;
  if (entity.actions[0].payload != null && entity.actions[0].payload.frameOffset > 0 && (actionType == 'MOVE' || actionType == 'MOVE_TURN')
  // HACK: when bite target is queen, frameOffset can be > 0
  ) {
      frameOffset = entity.actions[0].payload.frameOffset;
    }

  // compute caste-specific overrides
  var spriteOrder = [0];
  if (config[actionType] != null) {
    spriteOrder = config[actionType].spriteOrder;
  } else {
    console.error("no config for action", entity, actionType);
  }
  var duration = getDuration(game, entity, actionType);

  var progress = index / duration;
  var spriteIndex = Math.floor(progress * spriteOrder.length);
  return spriteOrder[spriteIndex] + frameOffset;
};

// returns true if an entity is doing its curAction
// HACK: only works when effectIndex == 0
var isDoingAction = function isDoingAction(game, entity) {
  var curAction = entity.actions[0];
  if (curAction == null) return false;
  return curAction.effectDone;
  // return curAction.duration < getDuration(game, entity, curAction.type)
};

module.exports = {
  cancelAction: cancelAction,
  stackAction: stackAction,
  queueAction: queueAction,
  isActionTypeQueued: isActionTypeQueued,
  getDuration: getDuration,
  makeAction: makeAction,
  getFrame: getFrame,
  isDoingAction: isDoingAction
};
},{"../selectors/pheromones":19,"../utils/helpers":25,"../utils/vectors":27}],22:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _require = require('../utils/vectors'),
    add = _require.add,
    subtract = _require.subtract,
    vectorTheta = _require.vectorTheta,
    equals = _require.equals;

var globalConfig = require('../config');

var _require2 = require('../utils/helpers'),
    thetaToDir = _require2.thetaToDir,
    closeToTheta = _require2.closeToTheta,
    encodePosition = _require2.encodePosition;

var _require3 = require('../utils/gridHelpers'),
    insideGrid = _require3.insideGrid,
    insertInCell = _require3.insertInCell,
    deleteFromCell = _require3.deleteFromCell,
    getEntityPositions = _require3.getEntityPositions;

var _require4 = require('../selectors/neighbors'),
    getNeighborEntities = _require4.getNeighborEntities,
    getNeighborPositions = _require4.getNeighborPositions;

var _require5 = require('../entities/makeEntity'),
    makeEntity = _require5.makeEntity;

var _require6 = require('../selectors/pheromones'),
    getEntityPheromoneSources = _require6.getEntityPheromoneSources,
    getQuantityForStalePos = _require6.getQuantityForStalePos,
    getPheromoneAtPosition = _require6.getPheromoneAtPosition;

var _require7 = require('../simulation/pheromones'),
    setPheromone = _require7.setPheromone;

var _require8 = require('../entities/registry'),
    Entities = _require8.Entities;

var insertEntityInGrid = function insertEntityInGrid(game, entity, noPheromone) {
  var dir = thetaToDir(entity.theta);
  for (var x = 0; x < entity.width; x++) {
    for (var y = 0; y < entity.height; y++) {
      var pos = { x: x, y: y };
      if ((dir == 'up' || dir == 'down') && entity.type != "BACKGROUND") {
        pos = { x: y, y: x };
        if (entity.type == 'DOOR') {
          pos.x *= -1;
        }
      }
      var gridPos = add(entity.position, pos);
      insertInCell(game.grid, gridPos, entity.id);
    }
  }

  // for the worker
  if (!game.pheromoneWorker || noPheromone) return;
  if (game.time > 1) {
    game.pheromoneWorker.postMessage({ type: 'INSERT_IN_GRID', entity: entity });
  }

  if (game.time > 1 && entity.notAnimated) {
    markEntityAsStale(game, entity);
  }

  // tiled sprites updating:
  if (entity.isTiled) {
    var _game$staleTiles;

    game.staleTiles.push(entity.id);
    var neighbors = getNeighborEntities(game, entity, true /*external*/).filter(function (e) {
      return e.type == entity.type;
    }).map(function (e) {
      return e.id;
    });
    (_game$staleTiles = game.staleTiles).push.apply(_game$staleTiles, _toConsumableArray(neighbors));
  }

  if (game.time < 1) return;

  // pheromone updating:
  var pherSources = getEntityPheromoneSources(game, entity);
  if (pherSources.length > 0) {
    var _game$floodFillSource;

    // TODO: do I need to do this filter? NOTE that having it breaks critter pheromone
    // game.reverseFloodFillSources = game.reverseFloodFillSources
    //   .filter(s => s.id != entity.id);
    (_game$floodFillSource = game.floodFillSources).push.apply(_game$floodFillSource, _toConsumableArray(pherSources));
  }

  var _loop = function _loop(pheromoneType) {
    if (!globalConfig.pheromones[pheromoneType].blockingTypes.includes(entity.type)) return 'continue';
    game.floodFillSources = game.floodFillSources.filter(function (s) {
      return s.id != entity.id || s.pheromoneType != pheromoneType;
    });
    var neighborPositions = getNeighborPositions(game, entity, true /* external */);

    for (var playerID in game.players) {
      // NOTE: dispersing pheromones never reverseFloodFill
      if (globalConfig.pheromones[pheromoneType].isDispersing) {
        setPheromone(game, entity.position, pheromoneType, 0, playerID);
        continue;
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = getEntityPositions(game, entity)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _pos = _step.value;

          setPheromone(game, _pos, pheromoneType, 0, playerID);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var maxAmount = globalConfig.pheromones[pheromoneType].quantity;
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = neighborPositions[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var neighbor = _step2.value;

          var quantity = getPheromoneAtPosition(game, neighbor, pheromoneType, playerID);
          if (quantity < maxAmount) {
            game.reverseFloodFillSources.push({
              id: entity.id,
              position: neighbor,
              pheromoneType: pheromoneType,
              playerID: playerID
            });
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  };

  for (var pheromoneType in globalConfig.pheromones) {
    var _ret = _loop(pheromoneType);

    if (_ret === 'continue') continue;
  }
};

var removeEntityFromGrid = function removeEntityFromGrid(game, entity, noPheromone) {
  var position = entity.position;
  var dir = thetaToDir(entity.theta);
  if (entity.segmented) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = entity.segments[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var segment = _step3.value;

        deleteFromCell(game.grid, segment.position, entity.id);
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    deleteFromCell(game.grid, entity.position, entity.id);
  } else {
    for (var x = 0; x < entity.width; x++) {
      for (var y = 0; y < entity.height; y++) {
        var pos = { x: x, y: y };
        if ((dir == 'up' || dir == 'down') && entity.type != "BACKGROUND") {
          pos = { x: y, y: x };
          if (entity.type == 'DOOR') {
            pos.x *= -1;
          }
        }
        var gridPos = add(entity.position, pos);
        deleteFromCell(game.grid, gridPos, entity.id);
      }
    }
  }

  // for the worker
  if (!game.pheromoneWorker || noPheromone) return;
  if (game.time > 1) {
    game.pheromoneWorker.postMessage({ type: 'REMOVE_FROM_GRID', entity: entity });
  }

  if (game.time > 1 && entity.notAnimated) {
    markEntityAsStale(game, entity);
  }

  // tiled sprites updating:
  if (entity.isTiled) {
    var _game$staleTiles2;

    game.staleTiles = game.staleTiles.filter(function (id) {
      return id != entity.id;
    });
    var neighbors = getNeighborEntities(game, entity, true /*external*/).filter(function (e) {
      return e.type == entity.type;
    }).map(function (e) {
      return e.id;
    });
    (_game$staleTiles2 = game.staleTiles).push.apply(_game$staleTiles2, _toConsumableArray(neighbors));
  }

  if (game.time < 1) return;
  // pheromone updating:
  var pherSources = getEntityPheromoneSources(game, entity);
  if (pherSources.length > 0) {
    var pheromoneType = pherSources[0].pheromoneType;
    // NOTE: dispersing pheromones never reverseFloodFill
    if (!globalConfig.pheromones[pheromoneType].isDispersing) {
      var _game$reverseFloodFil;

      var playerID = pherSources[0].playerID;
      // If you are added as a fill source AND removed from the grid on the same tick,
      // then the pheromone will stay behind because reverse fills are done before flood fills
      // So check if you are in the floodFill queue and just remove it:
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        var _loop2 = function _loop2() {
          var source = _step4.value;

          game.floodFillSources = game.floodFillSources.filter(function (s) {
            return !(s.pheromoneType == source.pheromoneType && s.playerID == source.playerID && equals(s.position, source.position));
          });
        };

        for (var _iterator4 = pherSources[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          _loop2();
        }

        // by adding 1, we force this position to be bigger than all its neighbors, which is how the
        // reverse flooding checks if a position is stale and should be set to 0
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = pherSources[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var _source = _step5.value;

          setPheromone(game, _source.position, pheromoneType, _source.quantity + 1, playerID);
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      (_game$reverseFloodFil = game.reverseFloodFillSources).push.apply(_game$reverseFloodFil, _toConsumableArray(pherSources));
    }
  }

  for (var _pheromoneType in globalConfig.pheromones) {
    if (!globalConfig.pheromones[_pheromoneType].blockingTypes.includes(entity.type)) continue;
    for (var _playerID in game.players) {
      if (pherSources.length > 0 && pherSources[0].pheromoneType == _pheromoneType) {
        continue; // don't flood fill this type, we just removed it
      }
      var quantity = getQuantityForStalePos(game, position, _pheromoneType, _playerID).quantity;
      setPheromone(game, entity.position, _pheromoneType, 0, _playerID);
      game.floodFillSources.push({
        id: entity.id,
        position: position,
        quantity: quantity,
        pheromoneType: _pheromoneType,
        playerID: _playerID,
        stale: true // if stale, then you override the quantity value when
        // it comes time to compute
      });
    }
  }
};

var addEntity = function addEntity(game, entity) {
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
    game.pheromoneWorker.postMessage({ type: 'ADD_ENTITY', entity: entity });
  }

  if (entity.position != null) {
    insertEntityInGrid(game, entity);
  }

  return game;
};

var removeEntity = function removeEntity(game, entity) {

  // remove from type and property-based memos
  game[entity.type] = game[entity.type].filter(function (id) {
    return id != entity.id;
  });
  if (entity.isAgent && entity.type != 'AGENT') {
    game.AGENT = game.AGENT.filter(function (id) {
      return id != entity.id;
    });
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
    game.pheromoneWorker.postMessage({ type: 'REMOVE_ENTITY', entity: entity });
  }

  if (entity.position != null) {
    removeEntityFromGrid(game, entity);
  }
  return game;
};

var moveEntity = function moveEntity(game, entity, nextPos) {
  entity.prevPosition = _extends({}, entity.position);
  if (entity.contPos != null) {
    entity.prevPosition = _extends({}, entity.contPos);
  }

  if (entity.position != null) {
    removeEntityFromGrid(game, entity);
  }

  if (nextPos == null) {
    entity.position = null;
    return game;
  }
  entity.position = _extends({}, nextPos);

  insertEntityInGrid(game, entity);

  // only rotate if you have to, so as not to blow away prevTheta
  // const nextTheta = vectorTheta(subtract(entity.prevPosition, entity.position));
  // if (!closeToTheta(nextTheta, entity.theta) && !entity.type == 'BULLET') {
  //   rotateEntity(
  //     game, entity, nextTheta,
  //   );
  // }
  return game;
};

var rotateEntity = function rotateEntity(game, entity, nextTheta, noPheromone) {
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

var changeEntityType = function changeEntityType(game, entity, oldType, nextType) {
  // NOTE: remove then re-add to grid in order to get pheromones working right
  removeEntityFromGrid(game, entity);
  game[oldType] = game[oldType].filter(function (id) {
    return id != entity.id;
  });
  game[nextType].push(entity.id);
  entity.type = nextType;
  insertEntityInGrid(game, entity);
};

var changePheromoneEmitterQuantity = function changePheromoneEmitterQuantity(game, entity, nextQuantity) {
  entity.quantity = nextQuantity;
  // NOTE: remove then re-add to grid in order to get pheromones working right
  removeEntityFromGrid(game, entity);
  game.pheromoneWorker.postMessage({
    type: 'SET_EMITTER_QUANTITY',
    entityID: entity.id,
    quantity: nextQuantity
  });
  insertEntityInGrid(game, entity);
};

var changeEntitySize = function changeEntitySize(game, entity, width, height) {
  removeEntityFromGrid(game, entity);
  entity.prevWidth = entity.width;
  entity.prevHeight = entity.height;
  entity.width = width;
  entity.height = height;
  insertEntityInGrid(game, entity);
};

var addSegmentToEntity = function addSegmentToEntity(game, entity, segmentPosition) {
  removeEntityFromGrid(game, entity);
  entity.segments.push({ position: segmentPosition });
  insertEntityInGrid(game, entity);
};

///////////////////////////////////////////////////////////////////////////
// Pickup/Putdown
///////////////////////////////////////////////////////////////////////////

var pickupEntity = function pickupEntity(game, entity, pickupPos) {
  var toPickup = entity;
  removeEntityFromGrid(game, entity);

  entity.prevPosition = entity.position;
  entity.position = null;

  return toPickup;
};

var putdownEntity = function putdownEntity(game, entity, pos) {
  entity.position = _extends({}, pos);
  entity.prevPosition = _extends({}, pos);

  // NOTE: need to do this before inserting in the grid so it doesn't do
  // a flood fill unnecessarily
  if (entity.type == 'DIRT' && entity.marked) {
    entity.marked = null;
    game.markedDirtIDs = game.markedDirtIDs.filter(function (id) {
      return id != entity.id;
    });
  }

  insertEntityInGrid(game, entity);

  return game;
};

// Helper function for insert/remove to mark as stale all entity positions
// plus all neighbor positions when computing the image-based rendering background
var markEntityAsStale = function markEntityAsStale(game, entity) {
  getEntityPositions(game, entity).forEach(function (pos) {
    var key = encodePosition(pos);
    if (!game.viewImage.stalePositions[key]) {
      game.viewImage.stalePositions[key] = pos;
    }
  });
  getNeighborPositions(game, entity).forEach(function (pos) {
    var key = encodePosition(pos);
    if (!game.viewImage.stalePositions[key]) {
      game.viewImage.stalePositions[key] = pos;
    }
  });
  game.viewImage.isStale = true;
};

module.exports = {
  addEntity: addEntity,
  removeEntity: removeEntity,
  moveEntity: moveEntity,
  rotateEntity: rotateEntity,
  pickupEntity: pickupEntity,
  putdownEntity: putdownEntity,
  changeEntityType: changeEntityType,
  changeEntitySize: changeEntitySize,
  markEntityAsStale: markEntityAsStale,
  addSegmentToEntity: addSegmentToEntity,
  changePheromoneEmitterQuantity: changePheromoneEmitterQuantity,

  // NOTE: only used by the worker!
  insertEntityInGrid: insertEntityInGrid,
  removeEntityFromGrid: removeEntityFromGrid
};
},{"../config":1,"../entities/makeEntity":8,"../entities/registry":10,"../selectors/neighbors":18,"../selectors/pheromones":19,"../simulation/pheromones":23,"../utils/gridHelpers":24,"../utils/helpers":25,"../utils/vectors":27}],23:[function(require,module,exports){
'use strict';

var _require = require('../utils/vectors'),
    add = _require.add,
    multiply = _require.multiply,
    subtract = _require.subtract,
    equals = _require.equals,
    floor = _require.floor,
    containsVector = _require.containsVector;

var _require2 = require('../utils/helpers'),
    isDiagonalMove = _require2.isDiagonalMove;

var _require3 = require('../selectors/neighbors'),
    getNeighborPositions = _require3.getNeighborPositions;

var _require4 = require('../utils/gridHelpers'),
    lookupInGrid = _require4.lookupInGrid,
    getEntityPositions = _require4.getEntityPositions,
    insideGrid = _require4.insideGrid;

var _require5 = require('../selectors/pheromones'),
    getPheromoneAtPosition = _require5.getPheromoneAtPosition,
    getSourcesOfPheromoneType = _require5.getSourcesOfPheromoneType,
    getQuantityForStalePos = _require5.getQuantityForStalePos;

var globalConfig = require('../config');

/**
 * use queue to continuously find neighbors and set their pheromone
 * value to decayAmount less, if that is greater than its current value
 */
var floodFillPheromone = function floodFillPheromone(game, pheromoneType, playerID, posQueue) {
  var config = globalConfig.pheromones[pheromoneType];

  var _loop = function _loop() {
    var _posQueue$shift = posQueue.shift(),
        position = _posQueue$shift.position,
        quantity = _posQueue$shift.quantity;

    var isOccupied = lookupInGrid(game.grid, position).map(function (id) {
      return game.entities[id];
    }).filter(function (e) {
      return config.blockingTypes.includes(e.type);
    }).length > 0;

    if ((!isOccupied || config.canInhabitBlocker) && getPheromoneAtPosition(game, position, pheromoneType, playerID) < quantity) {
      setPheromone(game, position, pheromoneType, quantity, playerID);
      var neighborPositions = getNeighborPositions(game, { position: position }, false /* internal */);
      var decayAmount = config.decayAmount;
      var amount = Math.max(0, quantity - decayAmount);

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = neighborPositions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var neighbor = _step.value;

          if (isDiagonalMove(position, neighbor)) continue;
          var neighborAmount = getPheromoneAtPosition(game, neighbor, pheromoneType, playerID);
          var occupied = lookupInGrid(game.grid, neighbor).map(function (id) {
            return game.entities[id];
          }).filter(function (e) {
            return config.blockingTypes.includes(e.type);
          }).length > 0;
          if (amount > 0 && amount > neighborAmount && !occupied) {
            posQueue.push({ position: neighbor, quantity: amount });
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }

    // dispersing pheromones decay separately
    if (config.isDispersing) {
      if (getPheromoneAtPosition(game, position, pheromoneType, playerID) > 0 && game.dispersingPheromonePositions.find(function (s) {
        return equals(s.position, position) && playerID == s.playerID && s.pheromoneType == pheromoneType;
      }) == null) {
        game.dispersingPheromonePositions.push({
          position: position, playerID: playerID, pheromoneType: pheromoneType
        });
      }
    }
  };

  while (posQueue.length > 0) {
    _loop();
  }
};

/**
 * When a pheromoneBlocking entity is added into the grid, then it could close off
 * a path, requiring recalculation. So do:
 * Reverse flood fill where you start at the neighbors of the newly occupied position,
 * then 0 those positions out if they are bigger than all their neighbors,
 * then add THEIR non-zero neighbors to the queue and continue,
 * finally, re-do the flood fill on all the 0-ed out spaces in reverse order
 */
var reverseFloodFillPheromone = function reverseFloodFillPheromone(game, pheromoneType, playerID, posQueue) {
  var config = globalConfig.pheromones[pheromoneType];

  var floodFillQueue = [];
  if (pheromoneType == 'FOOD') {
    console.trace("hrmm");
  }
  while (posQueue.length > 0) {
    var _position = posQueue.shift();
    var amount = getPheromoneAtPosition(game, _position, pheromoneType, playerID);
    var neighborAmount = getBiggestNeighborVal(game, _position, pheromoneType, playerID);
    var maxAmount = config.quantity;
    var decayAmount = config.decayAmount;
    var shouldFloodFill = true;
    if (neighborAmount <= amount) {
      shouldFloodFill = false;
      setPheromone(game, _position, pheromoneType, 0, playerID);
      var neighborPositions = getNeighborPositions(game, { position: _position }, false /* internal */);
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = neighborPositions[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var neighbor = _step2.value;

          if (isDiagonalMove(_position, neighbor)) continue;
          var _neighborAmount = getPheromoneAtPosition(game, neighbor, pheromoneType, playerID);
          if (_neighborAmount > 0 && _neighborAmount < maxAmount) {
            posQueue.push(neighbor);
          } else if (_neighborAmount == maxAmount) {
            // neighboring a pheromone source, so flood fill from here,
            // simpler than the block below this that computes neighbor positions for flood fill
            floodFillQueue.push({ position: _position, quantity: maxAmount - decayAmount });
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
    if (shouldFloodFill) {
      // if you aren't bigger than your biggest neighbor, then your value
      // is actually fine. So then add this position to the floodFillQueue
      // since it's right on the edge of the area that needs to be re-filled in
      var _neighborPositions = getNeighborPositions(game, { position: _position }, false /* internal */);
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = _neighborPositions[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _neighbor = _step3.value;

          if (isDiagonalMove(_position, _neighbor)) continue;
          var occupied = lookupInGrid(game.grid, _neighbor).map(function (id) {
            return game.entities[id];
          }).filter(function (e) {
            return config.blockingTypes.includes(e.type);
          }).length > 0;
          var _quantity = Math.max(0, amount - decayAmount);
          if (_quantity > 0 && !occupied) {
            floodFillQueue.push({ position: _neighbor, quantity: _quantity });
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  }
  floodFillPheromone(game, pheromoneType, playerID, floodFillQueue);
};

var computeAllPheromoneSteadyState = function computeAllPheromoneSteadyState(game) {
  for (var playerID in game.players) {
    var _loop2 = function _loop2(pheromoneType) {
      var config = globalConfig.pheromones[pheromoneType];
      // elements in this queue will be of type:
      // {position: Vector, quantity: number}
      var posQueue = [];
      // find sources of the pheromoneType and add their positions to the queue
      getSourcesOfPheromoneType(game, pheromoneType, playerID).forEach(function (entity) {
        if (entity.pheromoneEmitter) {
          posQueue.push({
            position: entity.position,
            quantity: entity.quantity
          });
        }
        getEntityPositions(game, entity).forEach(function (position) {
          posQueue.push({
            position: position,
            quantity: entity.quantity
          });
        });
      });

      floodFillPheromone(game, pheromoneType, playerID, posQueue);
    };

    for (var pheromoneType in globalConfig.pheromones) {
      _loop2(pheromoneType);
    }
  }
};

// ------------------------------------------------------------------
// Setters
// ------------------------------------------------------------------

/**
 *  Set the pheromone value of one specific position
 */
var setPheromone = function setPheromone(game, position, type, quantity, playerID, alreadyUpdatedWorker) {
  var grid = game.grid;

  if (!insideGrid(grid, position)) return;
  var config = globalConfig.pheromones[type];
  var x = position.x,
      y = position.y;


  if (!grid[x][y][playerID]) {
    grid[x][y][playerID] = {};
  }

  if (type != 'FOOD') {
    grid[x][y][playerID][type] = Math.min(quantity, config.quantity);
  } else {
    grid[x][y][playerID][type] = quantity;
  }
  if (game.pheromoneWorker && !alreadyUpdatedWorker) {
    game.pheromoneWorker.postMessage({
      type: 'SET_PHEROMONE',
      position: position,
      pheromoneType: type, quantity: quantity, playerID: playerID
    });
  }

  if (quantity == 0) {
    delete grid[x][y][playerID][type];
  }
  if (Object.keys(grid[x][y][playerID]).length == 0) {
    delete grid[x][y][playerID];
  }
};

/**
 *  Add the pheromone source to the flood fill queue
 */
var fillPheromone = function fillPheromone(game, position, pheromoneType, playerID, quantityOverride) {
  var config = globalConfig.pheromones[pheromoneType];
  var quantity = quantityOverride != null ? quantityOverride : config.quantity;
  if (quantity == 0) {
    return;
  }
  game.floodFillSources.push({
    position: position, pheromoneType: pheromoneType, playerID: playerID, quantity: quantity
  });
};

/**
 *  Add the pheromone source to the reverse flood fill queue
 */
var clearPheromone = function clearPheromone(game, position, pheromoneType, playerID) {
  var quantity = getPheromoneAtPosition(game, position, pheromoneType, playerID);
  setPheromone(game, position, pheromoneType, quantity + 1, playerID);
  game.reverseFloodFillSources.push({
    position: position, pheromoneType: pheromoneType, playerID: playerID, quantity: quantity
  });
};

/**
 *  Recompute the pheromone values at this position across every
 *  pheromone type. Used for when e.g. a pupa hatches into an
 *  ant, need to re-fill in the space left behind by the pupa
 */
var refreshPheromones = function refreshPheromones(game, position) {
  for (var playerID in game.players) {
    for (var pheromoneType in globalConfig.pheromones) {
      var _quantity2 = getQuantityForStalePos(game, position, pheromoneType, playerID).quantity;
      if (_quantity2 > 0) {
        game.floodFillSources.push({
          position: position, pheromoneType: pheromoneType, playerID: parseInt(playerID), quantity: _quantity2, stale: true
        });
      }
    }
  }
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

var getBiggestNeighborVal = function getBiggestNeighborVal(game, position, pheromoneType, playerID) {
  var neighborPositions = getNeighborPositions(game, { position: position }, false /* internal */);
  var quantity = 0;
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = neighborPositions[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var pos = _step4.value;

      if (isDiagonalMove(position, pos)) continue;
      var candidateAmount = getPheromoneAtPosition(game, pos, pheromoneType, playerID);
      if (candidateAmount > quantity) {
        quantity = candidateAmount;
      }
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  return quantity;
};

module.exports = {
  computeAllPheromoneSteadyState: computeAllPheromoneSteadyState,
  floodFillPheromone: floodFillPheromone,
  reverseFloodFillPheromone: reverseFloodFillPheromone,
  setPheromone: setPheromone,
  fillPheromone: fillPheromone,
  clearPheromone: clearPheromone,
  refreshPheromones: refreshPheromones,
  getBiggestNeighborVal: getBiggestNeighborVal
};
},{"../config":1,"../selectors/neighbors":18,"../selectors/pheromones":19,"../utils/gridHelpers":24,"../utils/helpers":25,"../utils/vectors":27}],24:[function(require,module,exports){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var globalConfig = require('../config');

var _require = require('../utils/helpers'),
    thetaToDir = _require.thetaToDir;

var _require2 = require('../utils/vectors'),
    add = _require2.add,
    multiply = _require2.multiply,
    subtract = _require2.subtract,
    equals = _require2.equals,
    floor = _require2.floor,
    containsVector = _require2.containsVector;

var initGrid = function initGrid(gridWidth, gridHeight, numPlayers) {
  var grid = [];
  for (var x = 0; x < gridWidth; x++) {
    var col = [];
    for (var y = 0; y < gridHeight; y++) {
      var cell = {
        entities: [],
        seenBefore: false
      };
      col.push(cell);
    }
    grid.push(col);
  }
  return grid;
};

var insideGrid = function insideGrid(grid, position) {
  if (position == null) return false;
  var x = position.x,
      y = position.y;

  return grid[x] != null && x >= 0 && y >= 0 && x < grid.length && y < grid[x].length;
};
var entityInsideGrid = function entityInsideGrid(game, entity) {
  var gridWidth = game.gridWidth,
      gridHeight = game.gridHeight;
  var position = entity.position,
      width = entity.width,
      height = entity.height;

  if (position == null) return false;
  var x = position.x,
      y = position.y;


  return x >= 0 && y >= 0 && x + width <= gridWidth && y + height <= gridHeight;
};

var lookupInGrid = function lookupInGrid(grid, position) {
  if (!insideGrid(grid, position)) return [];
  return grid[position.x][position.y].entities;
};

var insertInCell = function insertInCell(grid, position, entityID) {
  if (!insideGrid(grid, position)) return false;

  grid[position.x][position.y].entities.push(entityID);
  return true;
};

var deleteFromCell = function deleteFromCell(grid, position, entityID) {
  if (!insideGrid(grid, position)) return true;

  var x = position.x,
      y = position.y;

  var oldLength = grid[x][y].entities.length;
  grid[x][y].entities = grid[x][y].entities.filter(function (id) {
    return id != entityID;
  });

  return oldLength != grid[x][y].entities.length;
};

var canvasToGrid = function canvasToGrid(game, canvasPos) {
  var config = globalConfig.config;
  var scaleVec = {
    x: game.viewWidth / config.canvasWidth,
    y: game.viewHeight / config.canvasHeight
  };

  var gridCoord = floor(add({ x: game.viewPos.x, y: game.viewPos.y }, multiply(canvasPos, scaleVec)));
  return floor(gridCoord);
};

var getEntityPositions = function getEntityPositions(game, entity) {
  if (entity.segmented) {
    return [entity.position].concat(_toConsumableArray(entity.segments.map(function (s) {
      return s.position;
    })));
  }
  var width = entity.width != null ? entity.width : 1;
  var height = entity.height != null ? entity.height : 1;
  var dir = thetaToDir(entity.theta);
  var positions = [];
  for (var x = 0; x < entity.width; x++) {
    for (var y = 0; y < entity.height; y++) {
      var pos = { x: x, y: y };
      if ((dir == 'up' || dir == 'down') && entity.type != "BACKGROUND") {
        pos = { x: y, y: x };
        if (entity.type == 'DOOR') {
          pos.x *= -1;
        }
      }
      positions.push(add(entity.position, pos));
    }
  }
  return positions;
};

module.exports = {
  initGrid: initGrid, // TODO: move gridHelpers out of utils/
  insideGrid: insideGrid,
  lookupInGrid: lookupInGrid,
  insertInCell: insertInCell,
  deleteFromCell: deleteFromCell,
  canvasToGrid: canvasToGrid,
  getEntityPositions: getEntityPositions,
  entityInsideGrid: entityInsideGrid
};
},{"../config":1,"../utils/helpers":25,"../utils/vectors":27}],25:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _require = require('./vectors'),
    subtract = _require.subtract,
    vectorTheta = _require.vectorTheta;

var clamp = function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
};

// NOTE: for angles in radians being close to each other!
var closeToTheta = function closeToTheta(a, b, e) {
  var normalizedA = a % (2 * Math.PI);
  var epsilon = e != null ? e : 0.00001;
  return Math.abs(normalizedA - b) < epsilon;
};

var closeTo = function closeTo(a, b, e) {
  var epsilon = e != null ? e : 0.00001;
  return Math.abs(a - b) < epsilon;
};

var sameArray = function sameArray(arrayA, arrayB) {
  if (arrayA.length != arrayB.length) return false;
  for (var i = 0; i < arrayA.length; i++) {
    if (arrayA[i] != arrayB[i]) {
      return false;
    }
  }
  return true;
};

var thetaToDir = function thetaToDir(theta, noDiagonal) {
  // 90 degree only:
  if (noDiagonal) {
    var _directions = ['left', 'down', 'right', 'up'];
    var _deg = Math.round(theta * 180 / Math.PI);
    if (Math.round(_deg / 45) % 2 != 0) return null;
    return _directions[Math.round(_deg / 90) % 4];
  }

  // including 45 degree:
  var directions = ['left', 'leftup', 'up', 'rightup', 'right', 'rightdown', 'down', 'leftdown'];
  var deg = Math.round(theta * 180 / Math.PI);
  if (Math.round(deg / 45) != deg / 45) return null;
  return directions[Math.round(deg / 45) % 8];
};

var isDiagonalTheta = function isDiagonalTheta(theta) {
  var dir = thetaToDir(theta);
  return dir == 'leftdown' || dir == 'rightdown' || dir == 'rightup' || dir == 'leftup';
};

var isDiagonalMove = function isDiagonalMove(vecA, vecB) {
  return isDiagonalTheta(vectorTheta(subtract(vecA, vecB)));
};

var encodePosition = function encodePosition(pos) {
  return "" + pos.x + "," + pos.y;
};

var decodePosition = function decodePosition(pos) {
  var _pos$split = pos.split(','),
      _pos$split2 = _slicedToArray(_pos$split, 2),
      x = _pos$split2[0],
      y = _pos$split2[1];

  return { x: parseInt(x), y: parseInt(y) };
};

var getDisplayTime = function getDisplayTime(millis) {
  var seconds = Math.floor(millis / 1000);
  var minutes = Math.floor(seconds / 60);
  var leftOverSeconds = seconds - minutes * 60;
  var leftOverSecondsStr = leftOverSeconds == 0 ? '00' : '' + leftOverSeconds;
  if (leftOverSeconds < 10 && leftOverSeconds != 0) {
    leftOverSecondsStr = '0' + leftOverSecondsStr;
  }

  return minutes + ':' + leftOverSecondsStr;
};

var throttle = function throttle(func, args, wait) {
  var inThrottle = false;
  return function (ev) {
    if (inThrottle) {
      return;
    }
    func.apply(undefined, _toConsumableArray(args).concat([ev]));
    inThrottle = true;
    setTimeout(function () {
      inThrottle = false;
    }, wait);
  };
};

function isMobile() {
  var toMatch = [/Android/i, /webOS/i, /iPhone/i, /iPad/i, /iPod/i, /BlackBerry/i, /Windows Phone/i];

  return toMatch.some(function (toMatchItem) {
    return navigator.userAgent.match(toMatchItem);
  });
}

// HACK: when we're in electron window.require is a function
function isElectron() {
  return window.require != null;
}

function deepCopy(obj) {
  if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object' || obj == null) {
    return obj;
  }

  var copy = {};
  for (var key in obj) {
    if (_typeof(obj[key]) === 'object' && obj[key] != null) {
      if (Array.isArray(obj[key])) {
        copy[key] = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = obj[key][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var elem = _step.value;

            copy[key].push(deepCopy(elem));
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      } else {
        copy[key] = deepCopy(obj[key]);
      }
    } else {
      copy[key] = obj[key];
    }
  }
  return copy;
}

module.exports = {
  clamp: clamp, closeToTheta: closeToTheta, sameArray: sameArray, thetaToDir: thetaToDir,
  closeTo: closeTo,
  isDiagonalTheta: isDiagonalTheta, isDiagonalMove: isDiagonalMove,
  encodePosition: encodePosition, decodePosition: decodePosition,
  getDisplayTime: getDisplayTime, isMobile: isMobile,
  throttle: throttle,
  isElectron: isElectron,
  deepCopy: deepCopy
};
},{"./vectors":27}],26:[function(require,module,exports){
"use strict";

var floor = Math.floor,
    sqrt = Math.sqrt,
    random = Math.random,
    round = Math.round;


var rand = function rand() {
  return random();
};

// return an integer between min and max, inclusive
var randomIn = function randomIn(min, max) {
  return floor(min + rand() * (max - min + 1));
};

var shamefulGaussian = function shamefulGaussian() {
  return (rand() + rand() + rand() + rand() + rand() + rand() - 3) / 3;
};
var normalIn = function normalIn(min, max) {
  var gaussian = (shamefulGaussian() + 1) / 2;
  return floor(min + gaussian * (max - min + 1));
};

var oneOf = function oneOf(options) {
  if (options.length === 0) return null;
  return options[floor(rand() * options.length)];
};

// weights must be positive
var weightedOneOf = function weightedOneOf(options, weights) {
  var cumulativeWeights = [];
  var sum = 0;

  for (var i = 0; i < options.length; i++) {
    sum += weights[i];
    cumulativeWeights.push(sum);
  }

  var randomVal = randomIn(0, sum - 1) + 1;

  var index = 0;
  for (; randomVal > cumulativeWeights[index]; index++) {}

  return options[index];
};

module.exports = {
  randomIn: randomIn,
  normalIn: normalIn,
  oneOf: oneOf,
  weightedOneOf: weightedOneOf
};
},{}],27:[function(require,module,exports){
"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var cos = Math.cos,
    sin = Math.sin;


var add = function add() {
  for (var _len = arguments.length, vectors = Array(_len), _key = 0; _key < _len; _key++) {
    vectors[_key] = arguments[_key];
  }

  var resultVec = { x: 0, y: 0 };
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = vectors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var v = _step.value;

      resultVec.x += v.x;
      resultVec.y += v.y;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return resultVec;
};

var equals = function equals(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.x == b.x && a.y == b.y;
};

// NOTE: see vectorTheta note if subtracting vectors to find the angle between them
var subtract = function subtract() {
  for (var _len2 = arguments.length, vectors = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    vectors[_key2] = arguments[_key2];
  }

  var resultVec = _extends({}, vectors[0]);
  for (var i = 1; i < vectors.length; i++) {
    resultVec.x -= vectors[i].x;
    resultVec.y -= vectors[i].y;
  }
  return resultVec;
};

var makeVector = function makeVector(theta, magnitude) {
  var x = magnitude * cos(theta);
  var y = magnitude * sin(theta);
  return { x: x, y: y };
};

var dist = function dist(vecA, vecB) {
  return magnitude(subtract(vecA, vecB));
};

var scale = function scale(vec, scalar) {
  return { x: vec.x * scalar, y: vec.y * scalar };
};

var clampMagnitude = function clampMagnitude(vec, min, max) {
  var mag = magnitude(vec);
  var theta = vectorTheta(vec);
  var newMagnitude = Math.min(Math.max(mag, min), max);
  return makeVector(theta, newMagnitude);
};

var magnitude = function magnitude(vector) {
  var x = vector.x,
      y = vector.y;

  return Math.sqrt(x * x + y * y);
};

// what is the angle of this vector
// NOTE: that when subtracting two vectors in order to compute the theta
// between them, the target should be the first argument
var vectorTheta = function vectorTheta(vector) {
  // shift domain from [-Math.PI, Math.PI] to [0, 2 * Math.PI]
  return (2 * Math.PI + Math.atan2(vector.y, vector.x)) % (2 * Math.PI);
};

var multiply = function multiply() {
  for (var _len3 = arguments.length, vectors = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    vectors[_key3] = arguments[_key3];
  }

  var resultVec = { x: 1, y: 1 };
  for (var i = 0; i < vectors.length; i++) {
    resultVec.x *= vectors[i].x;
    resultVec.y *= vectors[i].y;
  }
  return resultVec;
};

var floor = function floor(vector) {
  return {
    x: Math.floor(vector.x),
    y: Math.floor(vector.y)
  };
};

var round = function round(vector) {
  return {
    x: Math.round(vector.x),
    y: Math.round(vector.y)
  };
};

var ceil = function ceil(vector) {
  return {
    x: Math.ceil(vector.x),
    y: Math.ceil(vector.y)
  };
};

var containsVector = function containsVector(array, vec) {
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = array[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var vector = _step2.value;

      if (equals(vector, vec)) return true;
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return false;
};

var abs = function abs(vector) {
  return {
    x: Math.abs(vector.x),
    y: Math.abs(vector.y)
  };
};

// given two positions, return a rectangle with the positions at opposite corners
var toRect = function toRect(posA, posB) {
  var rect = {
    position: { x: Math.min(posA.x, posB.x), y: Math.min(posA.y, posB.y) },
    width: Math.abs(posA.x - posB.x) + 1,
    height: Math.abs(posA.y - posB.y) + 1
  };
  return rect;
};

var rotate = function rotate(vector, theta) {
  var x = vector.x,
      y = vector.y;

  return {
    x: cos(theta) * x - sin(theta) * y,
    y: sin(theta) * x + cos(theta) * y
  };
};

module.exports = {
  add: add,
  subtract: subtract,
  equals: equals,
  makeVector: makeVector,
  scale: scale,
  dist: dist,
  magnitude: magnitude,
  vectorTheta: vectorTheta,
  multiply: multiply,
  floor: floor,
  round: round,
  ceil: ceil,
  containsVector: containsVector,
  toRect: toRect,
  rotate: rotate,
  abs: abs,
  clampMagnitude: clampMagnitude
};
},{}]},{},[13]);
