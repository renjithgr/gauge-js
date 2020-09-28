var fs = require("fs");
var esprima = require("esprima");
var estraverse = require("estraverse");

var fileUtil = require("./file-util");
var stepRegistry = require("./step-registry");
var stepParser = require("./step-parser");
var logger = require("./logger");

function hasAliases(node) {
  return node.type === "ArrayExpression" && !!node.elements.length;
}

function addStep(step, info, params) {
  stepRegistry.add(step.value, null, params, info.filePath, info.span, null);
}

function addAliases(aliases, info) {
  stepRegistry.addAlias(aliases.map(function (alias) {
    return alias.value;
  }), null, info.filePath, info.span, null);
}

function processNode(node, filePath) {
  var stepNode = node.arguments[0];
  var stepFunc = node.arguments[1] ? node.arguments[1]: null;
  var span = {
    start: node.loc.start.line,
    end: node.loc.end.line,
    startChar: node.loc.start.column,
    endChar: node.loc.end.column
  };
  try {
    if (hasAliases(stepNode)) {
      addAliases(stepNode.elements, { filePath: filePath, span: span });
    } else if (stepNode.type === "Literal") {
      addStep(stepNode, { filePath: filePath, span: span }, stepFunc ? stepFunc.params.length : null);
    }
  } catch (e) {
    logger.info(e);
  }
}

function traverser(filePath) {
  return function (node) {
    if (stepParser.isStepNode(node)) {
      processNode(node, filePath);
    }
  };
}

var loadFile = function (filePath, ast) {
  estraverse.traverse(ast, { enter: traverser(filePath) });
};

function createAst(content) {
  try {
    return esprima.parse(content, { loc: true });
  } catch (e) {
    logger.error(e.message);
    return "";
  }
}

function loadFiles(projectRoot) {
  fileUtil.getListOfFiles(projectRoot).forEach(function (filePath) {
    var ast = createAst(fs.readFileSync(filePath, "UTF-8"));
    if (ast) {
      loadFile(filePath, ast);
    }
  });
}

function unloadFile(filePath) {
  stepRegistry.deleteSteps(filePath);
}

function reloadFile(filePath, content) {
  var ast = createAst(content);
  if (ast) {
    unloadFile(filePath);
    loadFile(filePath, ast);
  }
}

module.exports = {
  load: loadFiles,
  reloadFile: reloadFile,
  unloadFile: unloadFile
};
