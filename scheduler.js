const CronJob = require('cron').CronJob;
const notificationsWorker = require('./workers/notificationsWorker');
const unverifiedWorker = require('./workers/unverifiedWorker');
const moment = require('moment');

const schedulerFactory = function() {
  return {
    start: function() {
      new CronJob('00 * * * * *', function() {
        console.log('Running Send Notifications Worker for ' +
          moment().format());
        notificationsWorker.run();
		unverifiedWorker.run();
      }, null, true, '');
    },
  };
};

module.exports = schedulerFactory();