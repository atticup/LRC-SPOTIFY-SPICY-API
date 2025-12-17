const express = require("express");
const rateLimit = require('express-rate-limit');
const lyricsH = require("./api/lyrics");
const path = require("path");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'stop spamming little squeaker no one likes u + we want to keep this api free for everyone so shut the fuck up' },
    skip: (req) => req.adminunlimiteduse === true
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "site", "index.html"));
});

app.use('/api/lyrics', limiter);
app.post("/api/lyrics", lyricsH.search);

app.use('/api/lrclib', limiter);
app.post("/api/lrclib", lyricsH.lrclib);

module.exports = app;
