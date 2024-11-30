const Unverified = require('../models/unverified');

const unverifiedWorkerFactory = function() {
  return {
    run: function() {
      Unverified.sendNotifications();
    },
  };
};

module.exports = unverifiedWorkerFactory();