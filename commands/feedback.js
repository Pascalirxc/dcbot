const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Gib eine Bewertung für ein Ticket ab')
        .addStringOption(option =>
            option.setName('ticketid')
                .setDescription('Die Ticket-ID (Channel-ID)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('bewertung')
                .setDescription('Bewertung von 1 bis 5')
                .setRequired(true)),
    async execute(interaction) {
        // Die Logik ist im Event-Handler
        await interaction.reply({ content: 'Feedback wird verarbeitet...', ephemeral: true });
    },
};
