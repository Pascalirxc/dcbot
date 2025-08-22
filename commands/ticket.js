const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Erstellt ein neues Support-Ticket'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Support-Ticket')
            .setDescription('Klicke auf den Button, um ein neues Ticket zu eröffnen.')
            .setColor(0x00AE86);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Ticket eröffnen')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row]});
    },
};
