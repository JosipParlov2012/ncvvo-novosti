require("dotenv").config();
const express = require("express");
const Discord = require("discord.js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const Keyv = require("keyv");

const app = express();
const client = new Discord.Client();
const keyv = new Keyv(process.env.DATABASE);

const config = require("./config.json");

/**\
 //   Inteval
 //   SOURCE: Tesla and Gordon, and Oliver - from .gov
 */
const DIS_CONSTANT = 6.12 * (120 * 25 * 20);

const COLOR = "#367fff";

const API_URL = "https://www.ncvvo.hr";
const ALL_NEWS_URL = API_URL + "/vrsta-korisnika/pristupnici-mature/";

const SELECTOR_ALL_NEWS = "#content > main > div.post-archive";
const SELECTOR_PARTIAL_TIME = " > div > div.col-lg-4.col-lg-boxed > div > div > time";
const SELECTOR_PARTIAL_TITLE = " > div > div.col-lg-6.offset-lg-2 > h2 > a";
const SELECTOR_PARTIAL_TEXT = " > div > div.col-lg-6.offset-lg-2 > div > p";

keyv.on("error", err => console.error("Keyv connection error:\n", err));

client.login(process.env.TOKEN).catch(console.error);

client.setInterval(checkWebpage, DIS_CONSTANT);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Webserver running on port: " + PORT);
});

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

    const saved = await keyv.get("saved") || [];
    if (saved.includes(time)) {
        console.log("already saved " + time);
        return;
    }

    saved.push(time);
    await keyv.set("saved", saved);

    const description = "> " + text.replace(/\n/g, "\n> ") + "\n\n[Saznaj više...](" + redirect + ")";

    const embed = new Discord.MessageEmbed()
        .setTitle(title)
        .setURL(redirect)
        .setColor(COLOR)
        .setDescription(description)
        .setTimestamp(Date.now());

    for (let guildID of Object.keys(config)) {
        const guild = client.guilds.resolve(guildID);
        if (!guild) {
            console.error("Invalid guild in config: " + guildID);
            continue;
        }

        const channelID = config[guildID];
        const channel = client.channels.resolve(channelID);
        if (!channel) {
            console.error("Invalid guild in config: " + channel);
            continue;
        }

        channel.send(embed);
    }
}
