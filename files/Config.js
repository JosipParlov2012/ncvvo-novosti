module.exports = {
    necromancer: {
        url: "https://ncvvo-novosti.herokuapp.com/",
        interval: 20 * 60 * 1000
    },
    errorBlacklist: [
        "This socket has been ended by the other party",
        "Can't add new command when connection is in closed state"
    ],
    color: {
        base: "#367fff",
        error: "#ff0000"
    },
    channels: ["692147746198519820"]
};
