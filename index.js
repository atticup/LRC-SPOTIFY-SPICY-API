const express = require("express");
const versionHandler = require("./api/version");

const app = express();

app.get("/version", versionHandler);

module.exports = app;
