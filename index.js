const express = require("express");
const versionHandler = require("./api/version");
const lyricsHandler = require("./api/lyrics");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/version", versionHandler);
app.get("/", lyricsHandler.page);
app.post("/lyrics", lyricsHandler.search);

module.exports = app;
