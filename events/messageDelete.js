const logMessageEvent = require('./logMessageEvent');

module.exports = {
    name: 'messageDelete',
    async execute(message, client) {
        await logMessageEvent.execute(client, 'Nachricht gelöscht', {
            userId: message.author?.id,
            userTag: message.author?.tag,
            channelName: message.channel.toString(),
            messageContent: message.content,
            description: `Eine Nachricht wurde gelöscht.`
        });
    }
};
