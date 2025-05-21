// src/utils/dataStore.js
let Humans = [];

function getHumans() {
  return Humans;
}

function setHumans(data) {
  Humans = data;
}

module.exports = { getHumans, setHumans };
