#! /usr/bin/env node

var version = process.versions.node.split(".");
if (parseInt(version[0]) === 0 && parseInt(version[1]) < 12) {
  throw new Error("gauge-js requires Node.js version 0.12+. Current version: " + process.versions.node);
}

var fs = require("fs"),
  path = require("path"),
  child_process = require("child_process");

var skeldir = path.join(__dirname, "skel"),
  srcdir = path.join(process.env.GAUGE_PROJECT_ROOT, "tests"),
  envdir = path.join(process.env.GAUGE_PROJECT_ROOT, "env", "default"),
  testCode = "step_implementation.js",
  jsPropertyFile = "js.properties";

if (process.argv[2] === "--init") {

  console.log("Initialising Gauge JavaScript project");
  fs.mkdir(srcdir, 484, function (err) {
    if (err && err.code !== "EEXIST") {
      console.error(err);
    } else {
      fs.createReadStream(path.join(skeldir, testCode))
        .pipe(fs.createWriteStream(path.join(srcdir, testCode)));
    }
  });

  fs.mkdir(path.dirname(envdir), 484, function (err) {
    if (err && err.code !== "EEXIST") {
      console.error(err);
    } else {
      fs.mkdir(envdir, 484, function (err) {
        if (err && err.code !== "EEXIST") {
          console.error(err);
        } else {
          fs.createReadStream(path.join(skeldir, jsPropertyFile))
            .pipe(fs.createWriteStream(path.join(envdir, jsPropertyFile)));
        }
      });
    }
  });
}

else if (process.argv[2] === "--start") {
  var args = ["./src/gauge.js", "--run"];
  if (process.env.gauge_nodejs_args) {
    args = process.env.gauge_nodejs_args.split(" ").concat(args);
  }
  var cmd = process.env.gauge_nodejs_bin || "node";
  var runner = child_process.spawn(cmd, args, { env: process.env, silent: false, stdio: "inherit" });
  process.on('beforeExit', (code) => {
    try {
      if (!runner.killed) { runner.kill('SIGINT'); }
    } finally {
      process.exit(code);
    }
  })
  runner.on("error", function (err) {
    console.trace(err.stack);
  });
}
