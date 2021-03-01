const express = require("express");
const fetch = require("node-fetch");
const app = express();

const PORT = process.env.PORT || 3000;

const Config = require("./Config");
const {necromancer} = Config;

app.listen(PORT, () => console.log("Webserver running on port: " + PORT));

app.get("/", ((_, response) => response.send("OK")));

setInterval(() => fetch(necromancer.url), necromancer.interval);
