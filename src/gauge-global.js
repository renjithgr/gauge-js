var hookRegistry = require("./hook-registry"),
  customMessageRegistry = require("./custom-message-registry"),
  dataStore = require("./data-store-factory"),
  stepRegistry = require("./step-registry"),
  customScreenshotFactory = require("./custom-screenshot-registry");

var gauge = { hooks: {}, dataStore: dataStore };

var step = function (stepName, options, stepFunction) {
  if (!stepName || !stepName.length) {
    throw new Error("Step text cannot be empty");
  }
  if (typeof options === "function" && !!options.call && !!options.apply) {
    stepFunction = options;
    options = { continueOnFailure: false };
  }

  var filepath = process.env.GAUGE_STEPFILEPATH;
  if (typeof stepName === "object" && !!stepName.length) {
    stepRegistry.addAlias(stepName, stepFunction, filepath, {}, options);
  } else if (typeof stepName === "string") {
    stepRegistry.add(stepName, stepFunction, null, filepath, {}, options);
  }
};

var hooks = {};

hookRegistry.types.forEach(function (type) {
  hooks[type] = function (fn, options) {
    hookRegistry.add(type, fn, options);
  };
});

gauge.message = function (msg) {
  if (typeof msg === "string") {
    customMessageRegistry.add(msg);
  }
};

gauge.screenshotFn = null;
gauge.customScreenshotWriter = null;

gauge.screenshot = function() {
  customScreenshotFactory.add();
};

module.exports = {
  gauge: gauge,
  step: step,
  hooks: hooks,
};
