const personalEvents = require('./personalEvents');
const benefitEvents = require('./benefitEvents');

function registerEvents(socket) {
    personalEvents(socket);
    benefitEvents(socket);
}

module.exports = {
    registerEvents
};