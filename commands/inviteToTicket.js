const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Zu Ticket einladen')
        .setType(ApplicationCommandType.User),
    async execute(interaction) {
        // Nur in Ticket-Channels erlaubt
        const channel = interaction.channel;
        if (!channel || !channel.name.startsWith('ticket-')) {
            return await interaction.reply({ content: 'Du kannst nur in Ticket-Channels jemanden einladen.', ephemeral: true });
        }
        // Prüfe, ob der User schon Zugriff hat
        const targetUser = interaction.targetUser;
        const perms = channel.permissionOverwrites.cache.get(targetUser.id);
        if (perms && perms.allow.has(PermissionFlagsBits.ViewChannel)) {
            return await interaction.reply({ content: `${targetUser} ist bereits im Ticket!`, ephemeral: true });
        }
        // Füge den User hinzu
        await channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('👥 Ticket-Einladung')
            .setDescription(`${targetUser} wurde erfolgreich zu diesem Ticket eingeladen!`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Ticketsystem', iconURL: targetUser.displayAvatarURL({ dynamic: true }) });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        // Optional: Nachricht im Channel
        await channel.send({ content: `${targetUser} wurde zum Ticket eingeladen.` });
    }
};
