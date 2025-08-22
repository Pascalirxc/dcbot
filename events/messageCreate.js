const { MongoClient } = require('mongodb');
const mongoClient = new MongoClient('mongodb+srv://Pascalirxc:admin@dcdb.g5etgki.mongodb.net/');
let db;
mongoClient.connect().then(client => { db = client.db('discordTickets'); });

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;
        if (!db) return;
        const userId = message.author.id;
        let user = await db.collection('leveling').findOne({ userId });
        if (!user) {
            user = { userId, xp: 0, level: 1 };
            await db.collection('leveling').insertOne(user);
        }
        // Anti-Spam: XP nur alle 60 Sekunden pro User
        const now = Date.now();
        if (user.lastXp && now - user.lastXp < 60000) return;
        const xpGain = Math.floor(Math.random() * 10) + 5;
        let newXp = user.xp + xpGain;
        let newLevel = user.level;
        let leveledUp = false;
        if (newXp >= newLevel * 100) {
            newLevel++;
            newXp = newXp - (user.level * 100);
            leveledUp = true;
        }
        await db.collection('leveling').updateOne(
            { userId },
            { $set: { xp: newXp, level: newLevel, lastXp: now } }
        );
        if (leveledUp) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle('🎉 Level Up!')
                .setDescription(`Herzlichen Glückwunsch <@${userId}>! Du bist jetzt Level **${newLevel}**.`)
                .setFooter({ text: 'Levelsystem', iconURL: 'https://cdn-icons-png.flaticon.com/512/3523/3523887.png' });
            await message.channel.send({ embeds: [embed] });
        }
    }
};
