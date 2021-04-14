// @flow

const levels = {
  justFindTargetLevel: require('./justFindTargetLevel'),
  extraDistanceLevel: require('./extraDistanceLevel'),
  firstDoorLevel: require('./firstDoorLevel'),
  complicatedLevel: require('./complicatedLevel1'),
  testLevel: require('./testLevel'),
  adaptedLevel: require('./adaptedLevel'),
}

window.levels = levels;
module.exports = levels;
