var fileUtil = require("./file-util");
var stepParser = require("./step-parser");

var StepRegistry = function () {
  this.registry = {};
};

/**
 * Add a step to the registry
 *
 * @param stepText Name of the step.
 * @param stepFunction Function to be executed for this step.
 * @param filePath Filepath where the function is defined.
 * @param span Location in file where the function is defined.
 * @param options Optional parameters defined with the step.
 * @returns The step added.
 */
StepRegistry.prototype.add = function (stepText, stepFunction, stepFuncParams, filePath, span, options) {
  if (!stepText.length) {
    throw new Error("Step text cannot be empty.");
  }
  var generalisedText = stepParser.generalise(stepText);
  if (this.exists(generalisedText)) {
    this.registry[generalisedText].fileLocations.push({ filePath: filePath, span: span });
    return this.registry[generalisedText];
  }

  this.registry[generalisedText] = {
    fn: stepFunction,
    fnParamsCount: stepFuncParams,
    stepText: stepText,
    generalisedText: generalisedText,
    fileLocations: [
      {
        filePath: filePath,
        span: span
      }
    ],
    count: function () {
      return this.fileLocations.length;
    },
    hasAlias: false,
    aliases: [stepText],
    options: options
  };
  return this.registry[generalisedText];
};

/**
 * Add a step to the registry
 *
 * @param stepTexts Step Names with all alias.
 * @param stepFunction Function to be executed for this step.
 * @param filePath Filepath where the function is defined.
 * @param span Location in file where the function is defined.
 * @param options Optional parameters defined with the step.
 */
StepRegistry.prototype.addAlias = function (stepTexts, stepFunction, filePath, span, options) {
  stepTexts.forEach((stepText) => {
    var step = this.add(stepText, stepFunction, filePath, span, options);
    step.hasAlias = true;
    step.aliases = stepTexts;
  }, this);
};

/**
 * Get the function associated with a step.
 *
 * @param stepName Name of the step.
 * @returns The step corresponding to the StepName.
 */
StepRegistry.prototype.get = function (stepName) {
  return this.registry[stepName];
};

StepRegistry.prototype.getStepTexts = function () {
  var reg = this.registry;
  return Object.keys(reg).map(function (key) {
    return reg[key].stepText;
  });
};

StepRegistry.prototype.getStepPositions = function (filePath) {
  var stepPositions = [];
  for (var step in this.registry) {
    for (var i = 0; i < this.registry[step].fileLocations.length; i++) {
      if (fileUtil.isSameFilePath(this.registry[step].fileLocations[i].filePath, filePath)) {
        stepPositions.push({ stepValue: step, span: this.registry[step].fileLocations[i].span });
      }
    }
  }
  return stepPositions;
};

StepRegistry.prototype.isRecoverable = function (stepName) {
  var step = this.registry[stepName];
  if (!step) {
    return false;
  }
  return step.options.continueOnFailure;
};

/**
 * Checks if a given step exists.
 *
 * @param stepName Name of the step.
 * @return boolean true if the step exists. false if it is not.
 */
StepRegistry.prototype.exists = function (stepName) {
  return stepName in this.registry;
};

/**
 * Checks if a given step is valid
 */
StepRegistry.prototype.validate = function (stepName) {
  var step = this.get(stepName);
  if (!step) {
    return { valid: false, reason: "notfound", file: null };
  }
  if (step.fnParamsCount !== stepParser.getParams(step.stepText).length) {
    return { valid: false, reason: "parameter mismatch", file: step.fileLocations[0].filePath };
  }
  if (step.fileLocations.length > 1) {
    return { valid: false, reason: "duplicate", file: step.fileLocations[0].filePath };
  }
  return { valid: true, reason: null, file: null };
};

StepRegistry.prototype.clear = function () {
  this.registry = {};
};

StepRegistry.prototype.deleteSteps = function (filePath) {
  var filterFunc = function (location) {
    return !fileUtil.isSameFilePath(location.filePath, filePath);
  };
  for (var stepText in this.registry) {
    this.registry[stepText].fileLocations = this.registry[stepText].fileLocations.filter(filterFunc);
    if (this.registry[stepText].count() === 0) {
      delete this.registry[stepText];
    }
  }
};

StepRegistry.prototype.isFileCached = function (filePath) {
  var filterFunc = function (location) {
    return fileUtil.isSameFilePath(location.filePath, filePath);
  };
  for (var stepText in this.registry) {
    if(this.registry[stepText].fileLocations.find(filterFunc)) {
      return true;
    }
  }
  return false;
};

module.exports = new StepRegistry();
