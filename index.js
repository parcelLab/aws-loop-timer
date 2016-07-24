// dependencies

var os = require('os');
var _ = require('underscore');
var AWS = require('aws-sdk');
var CloudWatch;

var namespace = 'empty';

///////////////
// Prototype //
///////////////

function Timer(name, pulse) {

  // validate
  if (!(this instanceof Timer)) return new Timer('unnamed', 0);
  if (!_.isString(name)) return console.error('Name must be a string');
  if (_.isUndefined(pulse)) pulse = 0;
  if (!_.isNumber(pulse) || _.isNaN(pulse) || pulse < 0)
    return console.error('Pulse must be positive integer');

  // set
  this.name = name;
  this.pulse = pulse;

  // init
  this.startDate = null;
  this.timerAverageCounter = 0;
  this.timerAverageSum = 0;

  return this;
}

////////////////
// CloudWatch //
////////////////

/**
 * pretty-prints the result of the timer
 * @param  {String}  name           name of the timer
 * @param  {Number}  cycletime      Cycletime (or average cycletime) in seconds
 * @param  {Boolean} isAverageValue defines whether this is an average value
 */
function print(name, cycletime, isAverageValue) {
  var log = '⏱  ' + name + ' on ' + os.hostname() + ': ';
  log += isAverageValue ? 'Taking' : 'Took';
  log += ' ' + cycletime + ' s';
  log += isAverageValue ? ' on average' : '';

  console.log(log);
}

/**
 * uploads a measurement to AWS CloudWatch
 * @param  {String} metric name of the metric
 * @param  {Number} value  value of the metric
 */
function uploadMetricToCloudWatch(metric, value) {

  var params = {
    MetricData: [
      {
        MetricName: metric,
        Timestamp: new Date(),
        Unit: 'Seconds',
        Value: value,
      },
    ],
    Namespace: 'Cycletime/' + namespace,
  };

  CloudWatch.putMetricData(params, function (err) {
    if (err) console.error('Could not upload to CloudWatch: ', JSON.stringify(err));
  });

}

/////////////////////
// Pulse Functions //
/////////////////////

/**
 * update temp variables to calculate pulse
 * @param  {Number} cycletime the cycletime of a single loop
 */
Timer.prototype.updatePulse = function (cycletime) {

  this.timerAverageCounter++;
  this.timerAverageSum += cycletime;

};

/**
 * regular functions which calculates overage over pulse interval
 * calls itself with defined pulse timeout
 */
Timer.prototype.pushPulseToCloudWatch = function () {
  var _this = this;
  setTimeout(function () {

    // calc
    var averageCycletime = _this.timerAverageSum / _this.timerAverageCounter;

    // inform
    if (!_.isNaN(averageCycletime)) {
      print(_this.name, averageCycletime, true);
      uploadMetricToCloudWatch(_this.name, averageCycletime);
    }

    // reset
    _this.timerAverageCounter = 0;
    _this.timerAverageSum = 0;

    // do it again
    _this.pushPulseToCloudWatch();
  }, this.pulse * 1000);
};

//////////////////////
// Public Functions //
//////////////////////

/**
 * returns a timer object
 * @param  {String} name  the name of the timer
 * @param  {Number} pulse the pulse in seconds, is optional
 * @return {[type]}       [description]
 */
function getTimer(name, pulse) {

  if (_.isUndefined(pulse)) pulse = 0;

  var timer = new Timer(name, pulse);
  if (timer.pulse > 0) timer.pushPulseToCloudWatch();
  return timer;

}

/**
 * starts timer and return timer object, is the only function exposed on require
 */
Timer.prototype.start = function () {

  this.startDate = Date.now();

};

/**
 * ends the timer
 * @return {Number} cycletime of timer in seconds
 */
Timer.prototype.end = function () {
  if (_.isNull(this.startDate)) return;

  // calc
  var cycletime = (Date.now() - this.startDate) / 1000;
  this.startDate = null;

  // propagate cycletime via pulse
  if (!_.isNaN(cycletime)) {
    if (this.pulse > 0) this.updatePulse(cycletime);
    if (this.pulse === 0) uploadMetricToCloudWatch(this.name, cycletime);
  }

  // inform
  print(this.name, cycletime, false);
  return cycletime;
};

////////////
// Export //
////////////

/**
 * on require AWS credentials are stored and the constructor method is returned
 * @param  {String} region AWS Credentials: Region of CloudWatch, defaults to 'eu-central-1'
 * @param  {String} key    AWS Credentials: Key
 * @param  {String} secret AWS Credentials: Token
 * @param  {String} ns     Namespace for all Metrics
 * @return {Object}        object with the constructor method startTimer()
 */
module.exports = function (region, key, secret, ns) {

  if (_.isNull(region)) region = 'eu-central-1';

  AWS.config.region = region;
  AWS.config.accessKeyId = key;
  AWS.config.secretAccessKey = secret;

  CloudWatch = new AWS.CloudWatch();

  namespace = ns;

  return {
    getTimer: getTimer,
  };

};
