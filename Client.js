require("dotenv").config();

const Discord = require("discord.js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const Keyv = require("keyv");

const keyv = new Keyv(process.env.DATABASE);

const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES"]});

const Config = require("./files/Config");
require("./files/NecromancerScript");
require("./files/ErrorHandler");

/**\
 //   Inteval
 //   SOURCE: Tesla and Gordon, and Oliver - from .gov
 */
const DIS_CONSTANT = 6.12 * (120 * 25 * 20);

const API_URL = "https://www.ncvvo.hr";
const ALL_NEWS_URL = API_URL + "/vrsta-korisnika/pristupnici-mature/";

const SELECTOR_ALL_NEWS = "#content > main > div.post-archive";
const SELECTOR_PARTIAL_TIME = " > div > div.col-lg-4.col-lg-boxed > div > div > time";
const SELECTOR_PARTIAL_TITLE = " > div > div.col-lg-6.offset-lg-2 > h2 > a";
const SELECTOR_PARTIAL_TEXT = " > div > div.col-lg-6.offset-lg-2 > div > p";

keyv.on("error", err => {
    console.error("Keyv connection error:\n", err);
});

client.login().catch(console.error);

client.setInterval(checkWebpage, DIS_CONSTANT);

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

    // noinspection JSUnresolvedFunction
    let $ = cheerio.load(body);
    const allNews = $(SELECTOR_ALL_NEWS);
    // noinspection JSValidateTypes
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
        .setColor(Config.color.base)
        .setDescription(description)
        .setTimestamp(Date.now());

    for (let channelID of Config.channels) {
        const channel = client.channels.resolve(channelID);
        if (channel) channel.send(embed);
        else console.log("Invalid channel in config: " + channel);
    }
}
