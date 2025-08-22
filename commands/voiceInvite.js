const { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Voice einladen')
        .setType(ApplicationCommandType.User),
    async execute(interaction) {
        // Prüfe, ob der ausführende User in einem privaten Voice-Channel ist
        const member = interaction.member;
        const guild = interaction.guild;
        const targetUser = interaction.targetMember;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return await interaction.reply({ content: 'Du bist in keinem Voice-Channel.', flags: 64 });
        }
        // Prüfe, ob der Channel dem User gehört (Name-Check oder DB-Check)
        if (!voiceChannel.name.endsWith('s Raum') || !voiceChannel.permissionsFor(member).has('ManageChannels')) {
            return await interaction.reply({ content: 'Du kannst nur in deinem eigenen privaten Channel einladen.', flags: 64 });
        }
        // Erstelle einen Invite-Link
        const invite = await voiceChannel.createInvite({ maxUses: 1, unique: true, reason: `Einladung für ${targetUser.user.tag}` });
        // Sende den Link an den einzuladenden User per DM
        const dmEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('Voice-Einladung')
            .setDescription(`Der User <@${interaction.user.id}> lädt dich zu seinem Voice Channel ein!`)
            .addFields({ name: 'Channel', value: `<#${voiceChannel.id}>` }, { name: 'Link', value: invite.url })
            .setFooter({ text: 'Voice System' });
        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {
            return await interaction.reply({ content: 'Konnte dem User keine DM senden.', flags: 64 });
        }
        // Bestätigungs-Embed an den Ersteller
        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('Voice-Einladung verschickt')
            .setDescription(`Der User <@${targetUser.id}> wurde erfolgreich eingeladen!`)
            .addFields({ name: 'Channel', value: `<#${voiceChannel.id}>` }, { name: 'Link', value: invite.url })
            .setFooter({ text: 'Voice System' });
        await interaction.reply({ embeds: [embed], flags: 64 });
    }
};
