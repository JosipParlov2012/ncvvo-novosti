const Discord = require("discord.js");

const Config = require("./Config");

async function handleError(error, code = 0) {
    setTimeout(() => process.exit(code), 1000);

    // Send msg to webhook log.
    if (!(error instanceof Error)) return;
    if (Config.errorBlacklist.includes(error.message)) return;
    const embed = new Discord.MessageEmbed()
        .setTitle(error.message)
        .setDescription(">>> " + error.stack)
        .setColor(Config.color.error)
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
