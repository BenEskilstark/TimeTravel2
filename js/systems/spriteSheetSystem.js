// @flow

const initSpriteSheetSystem = (store) => {
  // TODO: don't load sprites if they're already loaded
  const {dispatch} = store;
  const state = store.getState();

  loadSprite(dispatch, state, 'ANT', './img/Ant2.png');
  loadSprite(dispatch, state, 'WALL', './img/Wall1.png');

  loadSprite(dispatch, state, 'PHEROMONE', './img/Pheromones.png');

};

const loadSprite = (dispatch, state, name, src): void => {
  // if (
  //   state.game != null && state.game.sprites != null &&
  //   state.game.sprites[name] != null
  // ) return;
  const img = new Image();
  img.addEventListener('load', () => {
  //  console.log("loaded " + src + " spritesheet");
    dispatch({
      type: 'SET_SPRITE_SHEET',
      name,
      img,
    });
  }, false);
  img.src = src;
}

module.exports = {initSpriteSheetSystem};
