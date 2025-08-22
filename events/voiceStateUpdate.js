const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { MongoClient } = require('mongodb');
const mongoClient = new MongoClient('mongodb+srv://Pascalirxc:admin@dcdb.g5etgki.mongodb.net/');
let db;
mongoClient.connect().then(client => { db = client.db('discordTickets'); });

// Die ID des "Join to Create" Voice-Channels
const JOIN_TO_CREATE_ID = '1408071445396852738'; // Bitte anpassen!

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        // User joint "Join to Create" Channel
        if (!oldState.channelId && newState.channelId === JOIN_TO_CREATE_ID) {
            const guild = newState.guild;
            const user = newState.member.user;
            // Erstelle neuen Voice-Channel
            const channelName = `🔊 ${user.username}s Raum`;
            const voiceChannel = await guild.channels.create({
                name: channelName,
                type: 2, // GUILD_VOICE
                parent: newState.channel.parentId || null,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.Connect] },
                    { id: user.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.ViewChannel] }
                ]
            });
            // User in neuen Channel verschieben
            await newState.setChannel(voiceChannel);
            // Speichere Zuordnung in DB
            if (db) await db.collection('voiceRooms').insertOne({
                userId: user.id,
                voiceChannelId: voiceChannel.id,
                createdAt: new Date()
            });
            // Dynamische Infos
            const members = voiceChannel.members.map(m => `<@${m.id}>`).join(', ') || 'Niemand';
            // Schaltpanel posten direkt im Voice-Channel-Chat
            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🎛️ Voice Channel Steuerung')
                .setDescription('Nutze die Buttons, um deinen Voice Channel zu verwalten.\n\n**Tipp:** Du kannst hier alles steuern, ohne die Channel-Einstellungen zu öffnen.')
                .addFields(
                    { name: '🔊 Kanal', value: `<#${voiceChannel.id}>`, inline: true },
                    { name: '👤 Besitzer', value: `<@${user.id}>`, inline: true },
                    { name: '🟢 Aktive User', value: members, inline: false },
                    { name: 'Aktionen', value: [
                        '🦶 User kicken',
                        '➕ User einladen',
                        '✏️ Channel umbenennen',
                        '❌ Channel schließen'
                    ].join('\n'), inline: false }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Voice System', iconURL: user.displayAvatarURL({ dynamic: true }) });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('voice_kick').setLabel('🦶 User kicken').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('voice_invite').setLabel('➕ User einladen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('voice_rename').setLabel('✏️ Umbenennen').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('voice_close').setLabel('❌ Schließen').setStyle(ButtonStyle.Danger)
            );
            // Direkt senden, keine if-Abfrage nötig
            await voiceChannel.send({ embeds: [embed], components: [row] });
        }
        // User verlässt eigenen Voice-Channel
        if (oldState.channel && oldState.channel.name && oldState.channel.name.endsWith('s Raum') && !newState.channelId) {
            // Live-Status-Embed aktualisieren (optional: kann per Intervall oder Event gemacht werden)
            // Finde zugehörigen Text-Channel und lösche beide
            if (db && oldState.channel && oldState.channel.id) {
                const entry = await db.collection('voiceRooms').findOne({ voiceChannelId: oldState.channel.id });
                if (entry) {
                    const guild = oldState.guild;
                    const voiceChannel = entry.voiceChannelId ? guild.channels.cache.get(entry.voiceChannelId) : null;
                    const textChannel = entry.textChannelId ? guild.channels.cache.get(entry.textChannelId) : null;
                    await db.collection('voiceRooms').deleteOne({ voiceChannelId: oldState.channel.id });
                    if (voiceChannel) await voiceChannel.delete();
                    if (textChannel) await textChannel.delete();
                }
            }
        }
    }
};

