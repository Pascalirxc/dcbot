const { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Benutzerinfo')
        .setType(ApplicationCommandType.User),
    async execute(interaction) {
        const user = interaction.targetUser;
        const member = interaction.guild.members.cache.get(user.id);
    const roles = member ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(' ') : 'Keine';
        const joined = member ? `<t:${Math.floor(member.joinedTimestamp/1000)}:D>` : 'Unbekannt';
        const created = `<t:${Math.floor(user.createdTimestamp/1000)}:D>`;
        const avatar = user.displayAvatarURL({ dynamic: true, size: 512 });
        // Status als Text und Emoji
        let statusText = 'Offline';
        let presence = member?.presence;
        if (presence && (presence.status || presence?.clientStatus)) {
            // Discord.js v14+: status kann fehlen, clientStatus ist ein Objekt mit device-Status
            let rawStatus = presence.status;
            if (!rawStatus && presence.clientStatus) {
                // Priorität: desktop > web > mobile
                rawStatus = presence.clientStatus.desktop || presence.clientStatus.web || presence.clientStatus.mobile;
            }
            switch (rawStatus) {
                case 'online': statusText = '🟢 Online'; break;
                case 'idle': statusText = '🌙 Abwesend'; break;
                case 'dnd': statusText = '⛔ Nicht stören'; break;
                case 'offline': statusText = '⚫️ Offline'; break;
                default: statusText = rawStatus || 'Offline';
            }
        }
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`👤 Benutzerinfo für ${user.username}`)
            .setThumbnail(avatar)
            .setDescription(`Hier findest du alle wichtigen Infos zu <@${user.id}>.`)
            .addFields(
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '📅 Account erstellt', value: created, inline: true },
                { name: '📥 Server beigetreten', value: joined, inline: true },
                { name: '🎭 Rollen', value: roles || 'Keine', inline: false },
                { name: '🤖 Bot', value: user.bot ? 'Ja' : 'Nein', inline: true },
                { name: '🏷️ Nickname', value: member?.nickname || 'Keiner', inline: true },
                { name: '🚀 Boosted', value: member?.premiumSince ? `<t:${Math.floor(member.premiumSince/1000)}:D>` : 'Nein', inline: true },
                { name: '🔝 Höchste Rolle', value: member ? `<@&${member.roles.highest.id}>` : 'Keine', inline: true },
                { name: '💡 Status', value: statusText, inline: true }
            )
            .setFooter({ text: `Userinfo für ${user.username}`, iconURL: avatar });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
