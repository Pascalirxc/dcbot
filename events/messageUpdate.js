const logMessageEvent = require('./logMessageEvent');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage, client) {
        await logMessageEvent.execute(client, 'Nachricht bearbeitet', {
            userId: newMessage.author?.id,
            userTag: newMessage.author?.tag,
            channelName: newMessage.channel.toString(),
            messageContent: `Vorher: ${oldMessage.content}\nNachher: ${newMessage.content}`,
            description: `Eine Nachricht wurde bearbeitet.`
        });
    }
};
