require("dotenv").config();

const express = require("express");
const Discord = require("discord.js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const Keyv = require("keyv");

const keyv = new Keyv(process.env.DATABASE);

const app = express();
const client = new Discord.Client();

const channels = ["692147746198519820"];

/**\
 //   Inteval
 //   SOURCE: Tesla and Gordon, and Oliver - from .gov
 */
const DIS_CONSTANT = 6.12 * (120 * 25 * 20);

const ERROR_BLACKLIST = [
    "This socket has been ended by the other party",
    "Can't add new command when connection is in closed state"
];

const COLOR_NORMAL = "#367fff";
const COLOR_WARN = "#ff0000";
const REFRESH_INTERVAL = 20 * 60 * 1000;

const API_URL = "https://www.ncvvo.hr";
const ALL_NEWS_URL = API_URL + "/vrsta-korisnika/pristupnici-mature/";

const SELECTOR_ALL_NEWS = "#content > main > div.post-archive";
const SELECTOR_PARTIAL_TIME = " > div > div.col-lg-4.col-lg-boxed > div > div > time";
const SELECTOR_PARTIAL_TITLE = " > div > div.col-lg-6.offset-lg-2 > h2 > a";
const SELECTOR_PARTIAL_TEXT = " > div > div.col-lg-6.offset-lg-2 > div > p";

const REFRESH_URL = "https://ncvvo-novosti.herokuapp.com/";

keyv.on("error", err => {
    console.error("Keyv connection error:\n", err);
});

client.login().catch(console.error);

client.setInterval(checkWebpage, DIS_CONSTANT);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Webserver running on port: " + PORT);
});

app.get("/", ((request, response) => {
    response.send("OK");
}));

setInterval(() => fetch(REFRESH_URL), REFRESH_INTERVAL);

function getPartialElement($, latestPath, partial) {
    return $(SELECTOR_ALL_NEWS + " > div." + latestPath + partial);
}

function getTitleElement($, latestPath) {
    return getPartialElement($, latestPath, SELECTOR_PARTIAL_TITLE);
}

function getTime($, latestPath) {
    return getPartialElement($, latestPath, SELECTOR_PARTIAL_TIME).attr("datetime");
}

function getTitle($, latestPath) {
    return getTitleElement($, latestPath).text();
}

function getRedirect($, latestPath) {
    const path = getTitleElement($, latestPath).attr("href");
    return API_URL + path;
}

function getText($, latestPath) {
    return getPartialElement($, latestPath, SELECTOR_PARTIAL_TEXT).text();
}

async function checkWebpage() {
    const body = await fetch(ALL_NEWS_URL).then(y => y.text());

    let $ = cheerio.load(body);
    const allNews = $(SELECTOR_ALL_NEWS);
    const latestPath = allNews.children().first().attr("class").replace(/\s/g, ".");

    const time = getTime($, latestPath);
    const title = getTitle($, latestPath);
    const redirect = getRedirect($, latestPath);
    const text = getText($, latestPath);

    const saved = await keyv.get("saved") || null;
    if (!saved) {
        console.log("Table is empty.");
        return;
    }
    if (saved.includes(time)) return;

    saved.push(time);
    await keyv.set("saved", saved);

    const description = (text ? "> " + text.replace(/\n/g, "\n> ") : "") + "\n\n[Saznaj više...](" + redirect + ")";

    const embed = new Discord.MessageEmbed()
        .setTitle(title)
        .setURL(redirect)
        .setColor(COLOR_NORMAL)
        .setDescription(description)
        .setTimestamp(Date.now());

    for (let channelID of channels) {
        const channel = client.channels.resolve(channelID);
        if (channel) channel.send(embed);
        else console.log("Invalid channel in config: " + channel);
    }
}

async function handleError(error, code = 0) {
    setTimeout(() => process.exit(code), 1000);

    // Send msg to webhook log.
    if (!(error instanceof Error)) return;
    if (ERROR_BLACKLIST.includes(error.message)) return;
    const embed = new Discord.MessageEmbed()
        .setTitle(error.message)
        .setDescription(">>> " + error.stack)
        .setColor(COLOR_WARN)
        .toJSON();
    await fetch(process.env.WEBHOOK_ERROR, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({embeds: [embed]})
    });
}

process.on("uncaughtException", async error => await handleError(error, 1));
process.on("unhandledRejection", async error => await handleError(error,1));
process.on("SIGTERM", async () => await handleError());
process.on("SIGINT", async () => await handleError());
