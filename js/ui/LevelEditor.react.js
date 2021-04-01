// @flow

const React = require('react');
const globalConfig = require('../config');
const Button = require('./components/Button.react');
const Checkbox = require('./components/Checkbox.react');
const Divider = require('./components/Divider.react');
const Dropdown = require('./components/Dropdown.react');
const Slider = require('./components/Slider.react');
const NumberField = require('./components/NumberField.react');
const {render} = require('../render/render');
const {initMouseControlsSystem} = require('../systems/mouseControlsSystem');
const {
  add, subtract, equals, makeVector, floor, round, ceil, toRect,
} = require('../utils/vectors');
const {useEffect, useState, useMemo} = React;
const {Entities} = require('../entities/registry');

import type {Action, State} from '../types';

type Props = {
  dispatch: (action: Action) => Action,
  state: State,
  store:  Object,
};

function LevelEditor(props: Props): React.Node {
  const {dispatch, state, store} = props;
  const {game} = state;

  // position level editor to the right of the canvas
  const canvasDiv = document.getElementById('canvasWrapper');
  let left = 0;
  if (canvasDiv != null) {
    const rect = canvasDiv.getBoundingClientRect();
    left = rect.left + rect.width + 4;
  }

  // editor state:
  const [editor, setEditor] = useState({
    version: 0, // just a way to force the effect to redo
    started: false,
    importedLevel: {},
    importedGameState: {},

    numPlayers: 3,
    gridWidth: game.gridHeight,
    gridHeight: game.gridWidth,
    playerID: 0,
    maxSteps: 20,
    paletteMode: 'CREATE ENTITIES',

    // entity creation mode
    deleteMode: false,
    entityType: 'WALL',
    doorID: 1,
    doorDir: 'horizontal',
    subdividing: false,
    pheromoneType: 'LIGHT',
    background: 'SKYLINE',
    numSegments: 8,
    doodad: 'QUESTION',
    stoneSubType: 'STONE',

    // copy-paste mode
    clipboardMode: 'COPY',

    // pheromone mode
    selectedPheromone: 'LIGHT_0',
    pheromoneQuantity: globalConfig.pheromones['LIGHT_0'].quantity,
  });

  useEffect(() => {
    const handlers = {
      scroll: (state, dispatch, zoom) => {
        dispatch({type: 'INCREMENT_ZOOM', zoom});
      },
    };
    let shouldInit = true;
    if (editor.paletteMode == 'CREATE ENTITIES') {
      dispatch({type: 'SET_MOUSE_MODE', mouseMode: 'NONE'});
      handlers.mouseMove = () => {}; // placeholder
      handlers.leftUp = (state, dispatch, gridPos) =>  {
        const rect = toRect(state.game.mouse.downPos, gridPos);
        if (editor.deleteMode == false) {
          createEntities(state.game, dispatch, editor, rect);
        } else {
          dispatch({type: 'DELETE_ENTITIES', rect});
        }
        setEditor({...editor, version: editor.version + 1});
      };
    } else if (editor.paletteMode == 'PHEROMONES') {
      dispatch({type: 'SET_MOUSE_MODE', mouseMode: 'NONE'});
      handlers.mouseMove = () => {}; // placeholder
      handlers.leftUp = (state, dispatch, gridPos) => {
        const rect = toRect(state.game.mouse.downPos, gridPos);
        dispatch({
          type: 'FILL_PHEROMONE',
          gridPos,
          rect,
          pheromoneType: editor.selectedPheromone,
          playerID: editor.playerID,
          quantity: editor.pheromoneQuantity,
        });
      };
    } else if (editor.paletteMode == 'COPY-PASTE') {
      dispatch({type: 'SET_MOUSE_MODE', mouseMode: 'NONE'});
      handlers.mouseMove = () => {}; // placeholder
      handlers.leftUp = (state, dispatch, gridPos) =>  {
        const rect = toRect(state.game.mouse.downPos, gridPos);
        if (editor.clipboardMode == 'COPY') {
          dispatch({type: 'COPY_ENTITIES', rect});
        } else if (editor.clipboardMode == 'PASTE') {
          dispatch({type: 'PASTE_ENTITIES', pastePos: gridPos});
        }
        setEditor({...editor, version: editor.version + 1});
      };
    } else if (editor.paletteMode == 'MARQUEE') {
      shouldInit = false;
      dispatch({type: 'SET_MOUSE_MODE', mouseMode: 'COLLECT'});
    }
    if (shouldInit) {
      initMouseControlsSystem(store, handlers);
    }
    registerHotkeys(dispatch, editor, setEditor);
    render(game);
  }, [editor, editor.paletteMode]);

  // re-render when mouse is down and moving to draw marquee
  useEffect(() => {
    if (game.mouse.isLeftDown) {
      render(game);
    }
  }, [game.mouse.curPos])

  // do this one time to re-render on load
  useEffect(() => {
    setTimeout(
      () => {
        console.log("re-rendering");
        const nextState = {};
        let anyChanged = false;
        if (state.game.numPlayers != editor.numPlayers) {
          nextState.numPlayers = state.game.numPlayers;
        }
        if (state.game.gridWidth != editor.gridWidth) {
          nextState.gridWidth = state.game.gridWidth;
        }
        if (state.game.gridHeight != editor.gridHeight) {
          nextState.gridHeight = state.game.gridHeight;
        }
        setEditor({...editor, version: editor.version + 1, ...nextState});
      },
      500,
    );
  }, []);

  let palette = null;
  switch (editor.paletteMode) {
    case 'CREATE ENTITIES':
      palette = createEntitiesPalette(dispatch, state, editor, setEditor);
      break;
    case 'PHEROMONES':
      palette = pheromonePalette(dispatch, state, editor, setEditor);
      break;
    case 'COPY-PASTE':
      palette = copyPastePalette(dispatch, state, editor, setEditor);
      break;
    case 'MARQUEE':
      palette = marqueePalette(dispatch, state, editor, setEditor);
      break;
  }

  return (
    <div
      id="levelEditor"
      style={{
        position: 'absolute',
        height: '100%',
        width: 500,
        left,
        top: 0,
      }}
    >
    <b>Global Parameters:</b>
    <div>
      Number of Players:
      <NumberField
        value={editor.numPlayers}
        onChange={(numPlayers) => setEditor({...editor, numPlayers})}
      />
    </div>
    <div>
      Grid Width:
      <NumberField
        value={editor.gridWidth}
        onChange={(gridWidth) => setEditor({...editor, gridWidth})}
      />
    </div>
    <div>
      Grid Height:
      <NumberField
        value={editor.gridHeight}
        onChange={(gridHeight) => setEditor({...editor, gridHeight})}
      />
    </div>
    <div>
      Max Steps:
      <NumberField
        value={editor.maxSteps}
        onChange={(maxSteps) => setEditor({...editor, maxSteps})}
      />
    </div>
    <div>
      <Button
        label="Submit Changes"
        onClick={() => {
          dispatch({
            type: 'SET_PLAYERS_AND_SIZE',
            numPlayers: editor.numPlayers,
            gridWidth: editor.gridWidth,
            gridHeight: editor.gridHeight,
          });
          dispatch({type: 'SET_MAX_STEPS', maxSteps: editor.maxSteps});
          setEditor({
            ...editor,
            playerID: editor.playerID > editor.numPlayers
              ? editor.numPlayers
              : editor.playerID,
            version: editor.version + 1,
          });
        }}
      />
    </div>
    <Divider />
    <div>
      <Dropdown
        options={['CREATE ENTITIES', 'PHEROMONES', 'COPY-PASTE', 'MARQUEE']}
        selected={editor.paletteMode}
        onChange={(paletteMode) => {
          setEditor({...editor, paletteMode});
          if (paletteMode == 'COPY-PASTE') {
            dispatch({type: 'SET_KEEP_MARQUEE', keepMarquee: true});
          } else {
            dispatch({type: 'SET_KEEP_MARQUEE', keepMarquee: false});
          }
        }}
      />
    </div>
    {palette}
    <Divider />
    <Divider />
    <b>Simulation Controls:</b>
    <div>
      <Button
        label={editor.started || game.time > 0 ? "Reset" : "Start"}
        disabled={false}
        onClick={() => {
          if (editor.started || game.time > 0) {
            setEditor({...editor, started: false});
            dispatch({type: 'STOP_TICK'});
            dispatch({type: 'SET_PLAYERS_AND_SIZE', reset: true});
          } else {
            setEditor({...editor, started: true});
            dispatch({type: 'START_TICK'});
          }
        }}
      />
      <Button
        label={
          state.game.tickInterval == null && state.game.time > 1
            ? 'Play' : 'Pause'
        }
        disabled={state.game.time <= 1}
        onClick={() => {
          if (state.game.tickInterval == null) {
            dispatch({type: 'START_TICK'});
          } else {
            dispatch({type: 'STOP_TICK'});
            setEditor({...editor, version: editor.version + 1});
          }
        }}
      />
      <Button
        label='Step (M)'
        disabled={state.game.time <= 1}
        onClick={() => {
          dispatch({type: 'TICK'});
        }}
      />
      <Button
        label='Step x10 (J)'
        disabled={state.game.time <= 1}
        onClick={() => {
          for (let i = 0; i < 10; i++) {
            dispatch({type: 'TICK'});
          }
        }}
      />
      <div>
        <Checkbox
          label="Show True Positions"
          checked={!!state.game.showTruePositions}
          onChange={value => dispatch({
            type: 'SET', value, property: 'showTruePositions'
          })}
        />
      </div>
      <div>
        <Checkbox
          label="Show Ant Decision Weights"
          checked={!!state.game.showAgentDecision}
          onChange={value => dispatch({
            type: 'SET', value, property: 'showAgentDecision'
          })}
        />
      </div>
      <div>
        <Checkbox
          label="Show Hitboxes"
          checked={!!state.game.showHitboxes}
          onChange={value => dispatch({
            type: 'SET', value, property: 'showHitboxes'
          })}
        />
      </div>
      <div>
        <Checkbox
          label="Show True Hitboxes (slow)"
          checked={!!state.game.showTrueHitboxes}
          onChange={value => dispatch({
            type: 'SET', value, property: 'showTrueHitboxes'
          })}
        />
      </div>
      <div>
        <Checkbox
          label="Show Positions In Front"
          checked={!!state.game.showPositionsInFront}
          onChange={value => dispatch({
            type: 'SET', value, property: 'showPositionsInFront'
          })}
        />
      </div>
      <div>
        <Checkbox
          label="Show Entity IDs"
          checked={!!state.game.showEntityIDs}
          onChange={value => dispatch({
            type: 'SET', value, property: 'showEntityIDs'
          })}
        />
      </div>
      <div>
        <Checkbox
          label="Show Fog"
          checked={!!state.game.showFog}
          onChange={value => dispatch({
            type: 'SET', value, property: 'showFog'
          })}
        />
      </div>
      <div>
        <Button
          label='Reset View'
          onClick={() => {
            const focusedEntity = state.game.focusedEntity;
            if (focusedEntity != null) {
              const viewWidth = globalConfig.config.viewWidth;
              const viewHeight = globalConfig.config.viewHeight;
              const viewPos = {
                x: focusedEntity.position.x - viewWidth / 2,
                y: focusedEntity.position.y - viewHeight /2,
              };
              dispatch({type: 'SET_VIEW_POS', viewPos, viewWidth, viewHeight});
              setEditor({...editor, version: editor.version + 1});
            }
          }}
        />
        <Button
          label="Re-render"
          onClick={() => {
            game.viewImage.allStale = true;
            render(game);
          }}
        />
      </div>
    </div>
    <Divider />
    <b>Export:</b>
    <div>
      <Button
        label="Export as JSON"
        onClick={() => {
          const json = {
            numPlayers: state.game.numPlayers,
            gridWidth: state.game.gridWidth,
            gridHeight: state.game.gridHeight,
            // only export named upgrades
            upgrades: [],
            actions: state.editor.actions.slice(0, state.editor.index),
          };
          console.log(JSON.stringify(json));
        }}
      />
    </div>
    <div>
      <Button
        label="Import from JSON"
        onClick={() => {
          dispatch({type: 'SET_LEVEL', level: editor.importedLevel});
          dispatch({type: 'SET_PLAYERS_AND_SIZE'});
          setEditor({
            ...editor,
            numPlayers: editor.importedLevel.numPlayers,
            gridWidth: editor.importedLevel.gridWidth,
            gridHeight: editor.importedLevel.gridHeight,
          });
          setTimeout(
            () => {
              setEditor({
                ...editor,
                numPlayers: editor.importedLevel.numPlayers,
                gridWidth: editor.importedLevel.gridWidth,
                gridHeight: editor.importedLevel.gridHeight,
                maxSteps: store.getState().game.maxSteps,
                version: editor.version + 1,
              });
            },
            1000,
          );
        }}
      />
      <input type="text"
        value={JSON.stringify(editor.importedLevel)}
        onChange={(ev) => {
          const json = JSON.parse(ev.target.value);
          setEditor({...editor, importedLevel: json});
        }}
      />
    </div>
    <Divider />
    <div>
      <Button
        label="Export Game State"
        onClick={() => {
          console.log(JSON.stringify(state.game));
        }}
      />
    </div>
    <div>
      <Button
        label="Import Game State"
        onClick={() => {
          dispatch({type: 'SET_GAME', game: editor.importedGameState});
          // dispatch({type: 'SET_PLAYERS_AND_SIZE'});
          setEditor({
            ...editor,
            numPlayers: editor.importedGameState.numPlayers,
            gridWidth: editor.importedGameState.gridWidth,
            gridHeight: editor.importedGameState.gridHeight,
          });
          setTimeout(
            () => setEditor({
              ...editor,
              numPlayers: editor.importedGameState.numPlayers,
              gridWidth: editor.importedGameState.gridWidth,
              gridHeight: editor.importedGameState.gridHeight,
              maxSteps: editor.importedLevel.maxSteps,
              version: editor.version + 1,
            }),
            1000,
          );
        }}
      />
      <input type="text"
        value={JSON.stringify(editor.importedGameState)}
        onChange={(ev) => {
          const json = JSON.parse(ev.target.value);
          setEditor({...editor, importedGameState: json});
        }}
      />
    </div>

    </div>
  );
}

// ---------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------

function createEntitiesPalette(dispatch, state, editor, setEditor) {
  const game = state.game;
  return (<div>
    <div>
      <Checkbox
        label="Delete"
        checked={editor.deleteMode}
        onChange={deleteMode => setEditor({...editor, deleteMode})}
      />
    </div>
    <div>
      Editing Player:
      <Dropdown
        options={Object.keys(state.game.players).map(p => parseInt(p))}
        selected={editor.playerID}
        onChange={(playerID) => setEditor({...editor, playerID})}
      />
    </div>
    Create Entity: <Dropdown
      options={Object.keys(Entities)}
      selected={editor.entityType}
      onChange={(entityType) => setEditor({...editor, entityType})}
    />
    {createEntityOptions(game, editor, setEditor)}
    <Button
      label="Undo (U)"
      disabled={game.tickInterval != null || editor.started}
      onClick={() => {
        dispatch({type: 'UNDO', reset: true});
        setEditor({...editor, version: editor.version + 1});
      }}
    />
    <Button
      label="Redo (O)"
      disabled={game.tickInterval != null || editor.started}
      onClick={() => {
        dispatch({type: 'REDO', reset: true});
        setEditor({...editor, version: editor.version + 1});
      }}
    />
  </div>);
}


function pheromonePalette(dispatch, state, editor, setEditor) {
  const config = globalConfig.pheromones;
  const game = state.game;
  return (
    <div>
      Selected Pheromone:
      <Dropdown
        options={Object.keys(config)}
        selected={editor.selectedPheromone}
        onChange={selectedPheromone => setEditor({
          ...editor, selectedPheromone,
          pheromoneQuantity: config[selectedPheromone].quantity,
        })}
      />
      <Slider
        key={'pheromoneSlider_' + editor.selectedPheromone}
        min={0} max={config[editor.selectedPheromone].quantity}
        value={editor.pheromoneQuantity}
        label={'Quantity'}
        onChange={(pheromoneQuantity) => setEditor({...editor, pheromoneQuantity})}
      />
      <div />
      <Checkbox
        label="Render Pheromone"
        checked={!!game.pheromoneDisplay[editor.selectedPheromone]}
        onChange={(isVisible) => dispatch({
          type: 'SET_PHEROMONE_VISIBILITY',
          pheromoneType: editor.selectedPheromone,
          isVisible,
        })}
      />
      <div />
      <Checkbox
        label="Render Pheromones As Values"
        checked={!!state.game.showPheromoneValues}
        onChange={(value) => dispatch({
          type: 'SET', value, property: 'showPheromoneValues',
        })}
      />
    </div>
  );
}

function copyPastePalette(dispatch, state, editor, setEditor) {
  return (
    <div>
      Clipboard Mode:
      <Dropdown
        options={['COPY', 'PASTE']}
        selected={editor.clipboardMode}
        onChange={clipboardMode=> setEditor({
          ...editor, clipboardMode,
        })}
      />
    </div>
  );
}

function marqueePalette(dispatch, state, editor, setEditor) {
  return (
    <div>

    </div>
  );
}

// ---------------------------------------------------------------
// Hotkeys
// ---------------------------------------------------------------

function registerHotkeys(dispatch, editor, setEditor) {
  // dispatch({
  //   type: 'SET_HOTKEY', press: 'onKeyDown',
  //   key: 'O',
  //   fn: (s) => {
  //     const game = s.getState().game;
  //     dispatch({type: 'INCREMENT_ZOOM', zoom: 1});
  //     setEditor({...editor, version: editor.version + 1});
  //   }
  // });
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyDown',
    key: 'M',
    fn: (s) => {
      dispatch({type: 'TICK'});
    }
  });
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyDown',
    key: 'J',
    fn: (s) => {
      for (let i = 0; i < 8; i++) {
        dispatch({type: 'TICK'});
      }
    }
  });
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyDown',
    key: 'I',
    fn: (s) => {
      const game = s.getState().game;
      dispatch({type: 'INCREMENT_ZOOM', zoom: -1});
      setEditor({...editor, version: editor.version + 1});
    }
  });
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyDown',
    key: 'U',
    fn: (s) => {
      if (editor.started) return;
      const game = s.getState().game;
      dispatch({type: 'UNDO'});
      setEditor({...editor, version: editor.version + 1});
    }
  });
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyUp',
    key: 'O',
    fn: (s) => {
      setTimeout(() => {
        if (editor.started) return;
        const game = s.getState().game;
        dispatch({type: 'REDO'});
        setEditor({...editor, version: editor.version + 1});
      }, 10);
    }
  });
}

// ---------------------------------------------------------------
// Entity Creation
// ---------------------------------------------------------------

function createEntities(game, dispatch, editor, rect): void {
  let args = [];
  switch (editor.entityType) {
    case 'WALL':
      args = [editor.stoneSubType, 1, 1]; // width and height
      break;
    case 'DOODAD':
      args = [rect.width, rect.height, editor.doodad];
      break;
    case 'BACKGROUND':
      args = [rect.width, rect.height, editor.background]; // width and height
      break;
    case 'AGENT':
      args = [editor.playerID];
      break;
    case 'BUTTON':
      args = [editor.doorID];
      break;
    case 'DOOR':
      args = [editor.doorID, editor.doorDir];
      break;
    case 'TIME_MACHINE':
    case 'AGENT':
      break;
    default:
      console.error("no entity palette for ", editor.entityType);
  }
  dispatch({
    type: 'CREATE_ENTITIES',
    entityType: editor.entityType,
    rect, args,
  });
}


function createEntityOptions(game, editor, setEditor): React.Node {
  const options = [];
  switch (editor.entityType) {
    case 'STONE':
      options.push(<span>
        SubType:
        <Dropdown
          options={['STONE', 'BRICK', 'KITCHEN']}
          selected={editor.stoneSubType}
          onChange={(stoneSubType) => setEditor({...editor, stoneSubType})}
        />
      </span>);
      break;
    case 'BACKGROUND':
      options.push(<span>
        Background:
        <Dropdown
          options={['FLOOR_TILE', 'SKYLINE']}
          selected={editor.background}
          onChange={(background) => setEditor({...editor, background})}
        />
      </span>);
      break;
    case 'DOODAD':
      options.push(<span>
        Doodad Type:
        <Dropdown
          options={['QUESTION']}
          selected={editor.doodad}
          onChange={(doodad) => setEditor({...editor, doodad})}
        />
      </span>);
      break;
    case 'BUTTON':
      options.push(<span>
        Door ID:
        <Dropdown
          options={globalConfig.config.doorColors}
          selected={globalConfig.config.doorColors[editor.doorID]}
          onChange={(doorColor) => {
            const doorID = globalConfig.config.doorColors.indexOf(doorColor);
            setEditor({...editor, doorID})
          }}
        />
      </span>);
      break;
    case 'DOOR':
      options.push(<span>
        Door Direction:
        <Dropdown
          options={['horizontal', 'vertical']}
          selected={editor.doorDir}
          onChange={(doorDir) => setEditor({...editor, doorDir})}
        />
        Door Color:
        <Dropdown
          options={globalConfig.config.doorColors}
          selected={globalConfig.config.doorColors[editor.doorID]}
          onChange={(doorColor) => {
            const doorID = globalConfig.config.doorColors.indexOf(doorColor);
            setEditor({...editor, doorID})
          }}
        />
      </span>);
      break;
  }

  return (
    <div>
      {options}
    </div>
  );
}

module.exports = LevelEditor;
