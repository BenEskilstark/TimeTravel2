// @flow

const levels = {
  justFindTargetLevel: require('./justFindTargetLevel'),
  extraDistanceLevel: require('./extraDistanceLevel'),
  testLevel: require('./testLevel'),
  adaptedLevel: require('./adaptedLevel'),
}

window.levels = levels;
module.exports = levels;
