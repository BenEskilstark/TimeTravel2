
const React = require('react');
const AudioWidget = require('./Components/AudioWidget.react');
const Button = require('./Components/Button.react');
const Divider = require('./Components/Divider.react');
const Modal = require('./Components/Modal.react');
const QuitButton = require('../ui/components/QuitButton.react');
const globalConfig = require('../config');
const {getDisplayTime, isElectron} = require('../utils/helpers');
const {memo} = React;
const {Entities} = require('../entities/registry');

function TopBar(props) {
  const {
    dispatch,
    isExperimental,
    modal,
    tickInterval,
    canvasWidth,
    isMuted,
  } = props;

  if (isExperimental && tickInterval == null) {
    return null
  }

  const height = 100;
  const topPadding = 8;
  const leftPadding = canvasWidth / 2 - 100;

  return (
    <div
      id="topBar"
      style={{
        position: 'absolute',
        top: topPadding,
        height,
        width: '100%',
        zIndex: 2,
        textShadow: '-1px -1px 0 #FFF, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff',
      }}
    >
      <ButtonStack {...props} />
      <InfoStack {...props} />
    </div>
  );
}

function InfoStack(props) {
  const {
    dispatch,
    isExperimental,
    modal,
    tickInterval,
    canvasWidth,
    isMuted,
    steps,
    maxSteps,
  } = props;

  return (
    <div
      style={{
        display: 'inline-block',
        verticalAlign: 'top',
      }}
    >
      Steps Remaining: {maxSteps - steps}
    </div>
  );
}

function ButtonStack(props) {
  const {
    dispatch,
    isExperimental,
    modal,
    tickInterval,
    canvasWidth,
    isMuted,
  } = props;

  return (
    <div
      style={{
        // float: 'left',
        paddingLeft: 8,
        display: 'inline-block',
        color: 'black',
      }}
    >
      <QuitButton isInGame={true} dispatch={dispatch} />
      <div>
        <Button
          label="Instructions"
          onClick={() => {
            instructionsModal(dispatch);
          }}
        />
      </div>
      <div>
        <Button
          label={tickInterval ? 'Pause' : 'Play'}
          disabled={modal != null}
          onClick={() => {
            if (tickInterval != null) {
              dispatch({type: 'STOP_TICK'});
            } else {
              dispatch({type: 'START_TICK'});
            }
          }}
        />
      </div>
    </div>
  );
}

function instructionsModal(dispatch) {
  dispatch({type: 'STOP_TICK'});
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyUp',
    key: 'enter',
    fn: (s) => dismissModal(s.dispatch),
  });
  dispatch({
    type: 'SET_MODAL',
    modal: (<Modal
      title="Instructions"
      body={(<span style={{textAlign: 'initial'}}>
        <div>
          <div style={{textAlign: 'center'}}><b>Controls:</b></div>
          <div>Arrow Keys: move character</div>
          <div>Space bar: go back in time</div>
        </div>
        <Divider style={{
          marginTop: 6,
          marginBottom: 6,
        }} />
        <div>
          <div style={{textAlign: 'center'}}><b>Goal:</b></div>
          <div>TBD</div>
        </div>
      </span>)}
      buttons={[{label: 'Dismiss (Enter)', onClick: () => {
        dismissModal(dispatch);
      }}]}
    />),
  });
}

function dismissModal(dispatch) {
  dispatch({type: 'DISMISS_MODAL'});
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyUp',
    key: 'enter',
    fn: (s) => {},
  });
  dispatch({type: 'START_TICK'});
}


module.exports = TopBar;
