module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        // Logging-System Setup
        const { MongoClient, ObjectId } = require('mongodb');
        const mongoClient = new MongoClient('mongodb+srv://Pascalirxc:admin@dcdb.g5etgki.mongodb.net/');
        let db;
        mongoClient.connect().then(async clientDb => {
            db = clientDb.db('discordTickets');
            const guild = client.guilds.cache.first();
            if (!guild) return;
            // Forum-Channel prüfen/erstellen
            let logChannelId;
            let logChannelDb = await db.collection('config').findOne({ key: 'logForumChannel' });
            if (logChannelDb && guild.channels.cache.has(logChannelDb.value)) {
                logChannelId = logChannelDb.value;
            } else {
                let forum = guild.channels.cache.find(c => c.type === 15 && c.name === 'bot-logs');
                if (!forum) {
                    forum = await guild.channels.create({ name: 'bot-logs', type: 15 });
                }
                logChannelId = forum.id;
                await db.collection('config').updateOne(
                    { key: 'logForumChannel' },
                    { $set: { value: logChannelId } },
                    { upsert: true }
                );
            }
            // Info-Post prüfen/erstellen
            let infoPostDb = await db.collection('config').findOne({ key: 'logForumInfoPost' });
            let forum = guild.channels.cache.get(logChannelId);
            let infoPostId;
            if (infoPostDb && forum.threads.cache.has(infoPostDb.value)) {
                infoPostId = infoPostDb.value;
            } else {
                const infoEmbed = {
                    embeds: [
                        {
                            title: 'Bot Logging Übersicht',
                            description: 'Hier werden alle relevanten Aktionen des Bots dokumentiert.\n\n**Was wird geloggt?**\n- Ticketaktionen\n- Level-Ups\n- Moderation\n- Fehler\n- uvm.',
                            color: 0x5865F2,
                            footer: { text: 'Bot Logging', icon_url: client.user.displayAvatarURL() }
                        }
                    ]
                };
                const thread = await forum.threads.create({
                    name: 'Bot-Log Übersicht',
                    autoArchiveDuration: 1440,
                    message: infoEmbed
                });
                await thread.messages.fetch();
                const firstMsg = thread.messages.cache.first();
                if (firstMsg) await firstMsg.pin();
                infoPostId = thread.id;
                await db.collection('config').updateOne(
                    { key: 'logForumInfoPost' },
                    { $set: { value: infoPostId } },
                    { upsert: true }
                );
            }
        });
    console.log(`Bot ist bereit! Eingeloggt als ${client.user.tag}`);
    client.user.setActivity('Tickets & Leveling', { type: 0 }); // type: 0 = Playing

    },
};
