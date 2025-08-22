const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');
const mongoClient = new MongoClient('mongodb+srv://Pascalirxc:admin@dcdb.g5etgki.mongodb.net/');
let db;
mongoClient.connect().then(client => { db = client.db('discordTickets'); });

module.exports = {
    name: 'logMessageEvent',
    async execute(client, eventType, data) {
        const config = await db.collection('config').findOne({ key: 'logForumChannel' });
        if (!config) return;
        const forum = client.channels.cache.get(config.value);
        if (!forum) return;
        // Thread für Event-Typ prüfen/erstellen
        const threadKey = `logThread_${eventType}`;
        let threadDb = await db.collection('config').findOne({ key: threadKey });
        let thread;
        if (threadDb && forum.threads.cache.has(threadDb.value)) {
            thread = forum.threads.cache.get(threadDb.value);
        } else {
            thread = await forum.threads.create({
                name: `${eventType}`,
                autoArchiveDuration: 1440,
                message: {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`Thread für ${eventType}`)
                            .setDescription(`Hier werden alle ${eventType}-Events geloggt.`)
                            .setColor(0x7289da)
                            .setFooter({ text: 'Bot Logging', iconURL: client.user.displayAvatarURL() })
                    ]
                }
            });
            await db.collection('config').updateOne(
                { key: threadKey },
                { $set: { value: thread.id } },
                { upsert: true }
            );
        }
        // Log-Embed posten
        await thread.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Nachrichten-Event: ${eventType}`)
                    .setDescription(data?.description || 'Keine Beschreibung')
                    .setColor(0x7289da)
                    .addFields(
                        { name: 'User', value: data?.userTag ? `<@${data.userId}> (${data.userTag})` : 'Unbekannt', inline: true },
                        { name: 'Kanal', value: data?.channelName || 'Unbekannt', inline: true },
                        { name: 'Nachricht', value: data?.messageContent || 'Nicht verfügbar', inline: false },
                        { name: 'Zeit', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: 'Bot Logging', iconURL: client.user.displayAvatarURL() })
            ]
        });
    }
};
