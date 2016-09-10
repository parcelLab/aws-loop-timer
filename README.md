> Logging Node.js loop times to CloudWatch.

Table of Contents: [What does this package do?](#what-does-this-package-do), [How to use?](#how-to-use), [Debugging](#debugging), [Notes on AWS CloudWatch](#notes-on-aws-cloudwatch), [Contribution](#contribution)


# What does this package do?

The *aws-loop-timer* measures loop times (or cycle times) within your [Node.js](https://nodejs.org) applications and logs them using [AWS CloudWatch](https://aws.amazon.com/cloudwatch). With CloudWatch, you can easily monitor those metrics with alarms, dashboards etc.

# How to use?

## Install

Like always:

```
npm i aws-loop-timer --save
```

## Require

When requiring you need to provide your AWS credentials and region, and you also define the `namespace`:

```
var namespace = 'my-namespace'; // this can be any string and probably should be unique per project

var Timer = require('aws-loop-timer')('eu-central-1', 'AWS-KEY', 'AWS-SECRET', namespace);
```

Just to be clear: `my-namespace` can be any string you deem okay, and your AWS credentials need be authorized to access the CloudWatch region your trying to write to.

## Init

First, you need to spin up a timer. When doing so, you can assign the timer a `name`, and a `pulse`.

**name**: Okay, so the `name` will also be the name of the metric on CloudWatch. This means, this should be unique for every loop you want to measure. Whereas the `namespace` when requiring the module could be the same throughout the project.

**pulse** (optional): The `pulse` is the number of seconds how often your timer pushed data to CloudWatch. E.g. if you set it to `5`, loop times will be averaged over five seconds and this average will be uploaded only. If you don't set a pulse, i.e. set it to `0`, each loop time will be uploaded immediately.

**You probably should set a pulse, because CloudWatch only allows 150 uploads per second!** For more info on that topic, read below.

**silent** (optional): As per default, the timer writes its results also to the default output. If you want to override this behavior, you can set it to `silent` using any truthy value, e.g. `true` or `'silent'`, latter being a bit more explicit.

```
var name = 'name-of-the-timer'; // this will be your metric's name
var pulse = 5; // this means data will be pushed to CloudWatch every five seconds

var timer = Timer.getTimer(name, pulse); // this will write results to the console
var silentTimer = Timer.getTimer('i-am-silent', 0, 'silent'); // this one will not
```

## Measure

Finally we can measure loop times! This is now fairly simple with the object `timer` we created above.

1. Start the timer: `timer.start();`
1. End it: `timer.end();`

That's it.

# Debugging

Note that this package never throws an error, it only logs error to the console. This is because this logger should not break your application logic.

# Notes on AWS CloudWatch

Some additional notes on the `pulse` setting. You have to know that [AWS CloudWatch only allows to upload 150 times per second](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/cloudwatch_limits.html). There are two ways to mitigate this if you're in danger of exceeding this limit:

1. Upload several metrics at once. This package currently does not do that (would be a good [contribution](#contribution)), it only uploads one loop time per request to CloudWatch. One could theoretically piggy-ride on the existing pulse to store all loop times in memory and upload an array of all measurements with a single request. Then it's only important to respect the 40 KB POST data limit on uploads.
1. Alternatively, and this is done here, you can already calculate an average of the loop times and only push this one.

# Contribution

Please do.
