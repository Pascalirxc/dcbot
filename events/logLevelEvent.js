const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');
const mongoClient = new MongoClient('mongodb+srv://Pascalirxc:admin@dcdb.g5etgki.mongodb.net/');
let db;
mongoClient.connect().then(client => { db = client.db('discordTickets'); });

module.exports = {
    name: 'logLevelEvent',
    async execute(client, eventType, data) {
        const config = await db.collection('config').findOne({ key: 'logForumChannel' });
        if (!config) return;
        const forum = client.channels.cache.get(config.value);
        if (!forum) return;
        const thread = await forum.threads.create({
            name: `${eventType} | ${data?.userTag || data?.userId || 'Unbekannt'}`,
            autoArchiveDuration: 1440,
            message: {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`Level-Event: ${eventType}`)
                        .setDescription(data?.description || 'Keine Beschreibung')
                        .setColor(0xf1c40f)
                        .addFields(
                            { name: 'User', value: data?.userTag ? `<@${data.userId}> (${data.userTag})` : 'Unbekannt', inline: true },
                            { name: 'Level', value: data?.level?.toString() || 'Unbekannt', inline: true },
                            { name: 'XP', value: data?.xp?.toString() || 'Unbekannt', inline: true },
                            { name: 'Zeit', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: 'Bot Logging', iconURL: client.user.displayAvatarURL() })
                ]
            }
        });
    }
};
