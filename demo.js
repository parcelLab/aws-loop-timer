var Timer = require('./index.js')('eu-central-1', 'AWS-KEY', 'AWS-SECRET', 'namespace');

var timer = Timer.getTimer('my-timer', 10);
var silentTimer = Timer.getTimer('i-am-silent', 0, 'silent');

timer.start();
silentTimer.start();

setTimeout(function () {

  timer.end();
  silentTimer.end();

}, 1000);
