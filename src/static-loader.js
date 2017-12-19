var path = require("path");
var fs = require("fs");
var esprima = require("esprima");
var estraverse = require("estraverse");

var fileUtil = require("./file-util");
var stepRegistry = require("./step-registry");
var stepParser = require("./step-parser");

function hasAliases(node) {
  return node.type === "ArrayExpression" && !!node.elements.length;
}

function addStep(step, info) {
  if (!step.value.length) {
    console.log("[Error] : Step text cannot be empty.");
    return;
  }
  stepRegistry.add(stepParser.generalise(step.value), step.value, null, info.filePath, info.span, null);
}

function addAliases(aliases, info) {
  for (var i = 0; i < aliases.length; i++) {
    addStep(aliases[i], info);
  }
}

function processNode(node, filePath) {
  var stepNode = node.arguments[0];
  var span = {
    start: node.loc.start.line,
    end: node.loc.end.line,
    startChar: node.loc.start.column,
    endChar: node.loc.end.column
  };
  if (hasAliases(stepNode)) {
    addAliases(stepNode.elements, { filePath: filePath, span: span });
  } else if (stepNode.type === "Literal") {
    addStep(stepNode, { filePath: filePath, span: span });
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
    console.error(e.message);
    return "";
  }
}

function loadFiles(projectRoot) {
  fileUtil.getListOfFilesFromPath(path.join(projectRoot, "tests")).forEach(function (filePath) {
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
  loadFile: loadFile,
  reloadFile: reloadFile,
  unloadFile: unloadFile
};
