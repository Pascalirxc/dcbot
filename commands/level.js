const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const mongoClient = new MongoClient('mongodb+srv://Pascalirxc:admin@dcdb.g5etgki.mongodb.net/');
let db;
mongoClient.connect().then(client => { db = client.db('discordTickets'); });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Zeigt dein aktuelles Level und XP an.'),
    async execute(interaction) {
        const userId = interaction.user.id;
        if (!db) return await interaction.reply({ content: 'Leveldatenbank nicht verbunden.', flags: 64 });
        let user = await db.collection('leveling').findOne({ userId });
        if (!user) {
            user = { userId, xp: 0, level: 1 };
            await db.collection('leveling').insertOne(user);
        }
        const xpToNext = user.level * 100;
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`🏅 Level von ${interaction.user.username}`)
            .setDescription(`Du bist Level **${user.level}** mit **${user.xp} XP**.`)
            .addFields(
                { name: 'XP bis zum nächsten Level', value: `${xpToNext - user.xp} XP`, inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Levelsystem', iconURL: 'https://cdn-icons-png.flaticon.com/512/3523/3523887.png' });
        await interaction.reply({ embeds: [embed], flags: 64 });
    }
};
