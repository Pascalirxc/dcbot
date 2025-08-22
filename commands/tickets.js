const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Zeigt alle offenen Tickets als Übersichtspanel'),
    async execute(interaction) {
        // Die Logik ist im Event-Handler
        await interaction.reply({ content: 'Panel wird geladen...', ephemeral: true });
    },
};
