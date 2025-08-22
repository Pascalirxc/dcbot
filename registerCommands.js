require('dotenv').config();
const { REST, Routes } = require('discord.js');
const config = require('./config');
const fs = require('fs');
const path = require('path');

async function registerCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN || config.token);
    try {
        console.log('Starte das Registrieren der Slash Commands...');
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );
        console.log('Slash Commands erfolgreich registriert!');
    } catch (error) {
        console.error('Fehler beim Registrieren der Commands:', error);
    }
}

module.exports = { registerCommands };
