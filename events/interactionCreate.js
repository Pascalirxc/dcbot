const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { MongoClient } = require('mongodb');
const BLACKLIST = [];
const TICKET_LIMIT = 2;
let ARCHIV_CHANNEL_ID = '1408173255856099491';
let TEAM_ROLE_ID = '1408173259710791760';
let SUPPORT_KATEGORIE_ID = '1408173257210728531';
let TECHNIK_KATEGORIE_ID = '1408173258737451158';
let WEBHOOK_URL = 'WEBHOOK_URL';
// Webhook-Integration entfernt
let ticketStats = { erstellt: 0, geschlossen: 0, geclaimed: 0 };
let userTickets = {};
let feedbackPending = {};
let reminderTimeouts = {};
const LANGUAGES = { de: { welcome: 'Willkommen', close: 'Schließen', claim: 'Claim', unclaim: 'Unclaim', feedback: 'Wie zufrieden bist du mit dem Ticket?', priority: 'Priorität', reopen: 'Wieder öffnen' }, en: { welcome: 'Welcome', close: 'Close', claim: 'Claim', unclaim: 'Unclaim', feedback: 'How satisfied are you with the ticket?', priority: 'Priority', reopen: 'Reopen' } };

// MongoDB Setup
const mongoClient = new MongoClient('mongodb+srv://Pascalirxc:admin@dcdb.g5etgki.mongodb.net/');
let db;
mongoClient.connect().then(client => { db = client.db('discordTickets'); });

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Voice-Panel Button-Interaktionen
        if (interaction.isButton() && interaction.customId.startsWith('voice_')) {
            const { member, guild, channel, user } = interaction;
            const voiceRoom = db && await db.collection('voiceRooms').findOne({ voiceChannelId: channel.id });
            if (!voiceRoom) return await interaction.reply({ content: 'Voice-Channel-Daten nicht gefunden.', flags: 64 });
            switch (interaction.customId) {
                case 'voice_kick': {
                    // User-Auswahl zum Kicken
                    const members = channel.members.filter(m => m.id !== user.id).map(m => ({ label: m.user.tag, value: m.id }));
                    if (members.length === 0) return await interaction.reply({ content: 'Keine weiteren User im Channel.', flags: 64 });
                    const select = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('voice_kick_select')
                            .setPlaceholder('Wähle einen User zum Kicken')
                            .addOptions(members)
                    );
                    await interaction.reply({ content: 'Wen möchtest du kicken?', components: [select], flags: 64 });
                    break;
                }
                case 'voice_invite': {
                    // User einladen (per Mention)
                    await interaction.reply({ content: 'Bitte erwähne den User, den du einladen möchtest.', flags: 64 });
                    break;
                }
                case 'voice_rename': {
                    // Channel umbenennen (Modal)
                    const modal = new ModalBuilder()
                        .setCustomId('voice_rename_modal')
                        .setTitle('Voice-Channel umbenennen')
                        .addComponents([
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('voice_new_name')
                                    .setLabel('Neuer Channel-Name')
                                    .setStyle(TextInputStyle.Short)
                                    .setMinLength(3)
                                    .setMaxLength(32)
                                    .setPlaceholder('z.B. Maxims Raum')
                                    .setRequired(true)
                            )
                        ]);
                    await interaction.showModal(modal);
                    break;
                }
                case 'voice_close': {
                    // Channel schließen
                    await channel.delete();
                    if (db) await db.collection('voiceRooms').deleteOne({ voiceChannelId: channel.id });
                    break;
                }
            }
        }
        // Voice-Kick Auswahl
        if (interaction.isStringSelectMenu && interaction.customId === 'voice_kick_select') {
            const memberId = interaction.values[0];
            const member = interaction.guild.members.cache.get(memberId);
            if (!member) return await interaction.reply({ content: 'User nicht gefunden.', flags: 64 });
            await member.voice.disconnect();
            await interaction.update({ content: `User <@${memberId}> wurde aus dem Channel entfernt.`, components: [] });
        }
        // Voice-Rename Modal
        if (interaction.isModalSubmit && interaction.customId === 'voice_rename_modal') {
            const newName = interaction.fields.getTextInputValue('voice_new_name');
            await interaction.channel.setName(newName);
            await interaction.reply({ content: `Channel umbenannt zu: ${newName}`, flags: 64 });
        }
        // Handler für User-ContextMenu-Befehle
        if (interaction.isUserContextMenuCommand && interaction.isUserContextMenuCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Beim Ausführen des Kontextmenü-Befehls ist ein Fehler aufgetreten!', flags: 64 });
            }
            return;
        }
    // ...existing code...
        if (interaction.isChatInputCommand()) {
            // Multi-Language Support
            let lang = 'de';
            if (interaction.commandName === 'setlang') {
                lang = interaction.options.getString('lang') || 'de';
                await interaction.reply({ content: `Sprache gesetzt auf ${lang}`, flags: 64 });
                return;
            }

            // Automatische Erstellung von Channels, Rollen und Webhook
            const guild = interaction.guild || (interaction.member && interaction.member.guild);
            if (guild) {
                // Archiv-Channel
                if (!guild.channels.cache.find(c => c.name === 'ticket-archiv')) {
                    const archiv = await guild.channels.create({ name: 'ticket-archiv', type: 0 });
                    ARCHIV_CHANNEL_ID = archiv.id;
                } else {
                    ARCHIV_CHANNEL_ID = guild.channels.cache.find(c => c.name === 'ticket-archiv').id;
                }
                // Support-Kategorie
                if (!guild.channels.cache.find(c => c.name === 'Support' && c.type === 4)) {
                    const supportCat = await guild.channels.create({ name: 'Support', type: 4 });
                    SUPPORT_KATEGORIE_ID = supportCat.id;
                } else {
                    SUPPORT_KATEGORIE_ID = guild.channels.cache.find(c => c.name === 'Support' && c.type === 4).id;
                }
                // Technik-Kategorie
                if (!guild.channels.cache.find(c => c.name === 'Technik' && c.type === 4)) {
                    const technikCat = await guild.channels.create({ name: 'Technik', type: 4 });
                    TECHNIK_KATEGORIE_ID = technikCat.id;
                } else {
                    TECHNIK_KATEGORIE_ID = guild.channels.cache.find(c => c.name === 'Technik' && c.type === 4).id;
                }
                // Team-Rolle
                if (!guild.roles.cache.find(r => r.name === 'Team')) {
                    const teamRole = await guild.roles.create({ name: 'Team', colors: 'Blue', mentionable: true });
                    TEAM_ROLE_ID = teamRole.id;
                } else {
                    TEAM_ROLE_ID = guild.roles.cache.find(r => r.name === 'Team').id;
                }
                // Webhook-Integration entfernt
            }

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Beim Ausführen des Befehls ist ein Fehler aufgetreten!', flags: 64 });
            }
        } else if (interaction.isButton() && interaction.customId === 'create_ticket') {
            // Blacklist prüfen
            if (BLACKLIST.includes(interaction.user.id)) {
                return await interaction.reply({ content: 'Du bist vom Ticketsystem ausgeschlossen.' });
            }
            // Ticket-Limit prüfen
            if (!userTickets[interaction.user.id]) userTickets[interaction.user.id] = [];
            if (userTickets[interaction.user.id].length >= TICKET_LIMIT) {
                return await interaction.reply({ content: `Du kannst maximal ${TICKET_LIMIT} Tickets gleichzeitig haben.` });
            }
            // Schritt 1: Grund abfragen
            const select = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_reason')
                    .setPlaceholder('Wähle einen Grund für dein Ticket')
                    .addOptions([
                        { label: 'Support', value: 'support' },
                        { label: 'Technik', value: 'technik' },
                        { label: 'Frage', value: 'frage' },
                        { label: 'Vorschlag', value: 'vorschlag' },
                    ])
            );
            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticket-Erstellung')
                .setDescription('Bitte wähle einen Grund für dein Ticket aus dem Menü unten. So können wir dir gezielt helfen!')
                .setColor(0x5865F2)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Dein Anliegen ist bei uns in guten Händen.' });
            await interaction.reply({ embeds: [embed], components: [select], flags: 64 });
        } else if (interaction.isStringSelectMenu() && (interaction.customId === 'ticket_reason' || interaction.customId === 'ticket_priority')) {
            // Schrittweises Abfragen: Grund -> Priorität
            if (!interaction.user._ticketData) interaction.user._ticketData = {};
            if (interaction.customId === 'ticket_reason') {
                interaction.user._ticketData.reason = interaction.values[0];
                // Jetzt Priorität abfragen
                const priorityRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('ticket_priority')
                        .setPlaceholder('Wähle die Priorität')
                        .addOptions([
                            { label: 'Niedrig', value: 'low' },
                            { label: 'Mittel', value: 'medium' },
                            { label: 'Hoch', value: 'high' },
                        ])
                );
                const embed = new EmbedBuilder()
                    .setTitle('🎫 Ticket-Erstellung')
                    .setDescription('Bitte wähle die Priorität für dein Ticket aus dem Menü unten.')
                    .setColor(0x5865F2)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'Dein Anliegen ist bei uns in guten Händen.' });
                await interaction.reply({ embeds: [embed], components: [priorityRow], flags: 64 });
            } else if (interaction.customId === 'ticket_priority') {
                interaction.user._ticketData.priority = interaction.values[0];
                // Ticket erstellen
                const guild = interaction.guild;
                const user = interaction.user;
                const reason = interaction.user._ticketData.reason;
                const priority = interaction.user._ticketData.priority;
                const channelName = `ticket-${user.username}-${Math.floor(Math.random()*10000)}`;
                let ticketChannel;
                try {
                    // Automatische Zuweisung: Nächstes Teammitglied
                    let teamMembers = guild.roles.cache.get(TEAM_ROLE_ID)?.members?.map(m => m.id) || [];
                    let assigned = teamMembers[Math.floor(Math.random()*teamMembers.length)] || TEAM_ROLE_ID;
                    ticketChannel = await guild.channels.create({
                        name: channelName,
                        type: 0, // 0 = GUILD_TEXT
                        parent: reason === 'support' ? SUPPORT_KATEGORIE_ID : reason === 'technik' ? TECHNIK_KATEGORIE_ID : null,
                        permissionOverwrites: [
                            { id: guild.id, deny: ['ViewChannel'] },
                            { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                            { id: TEAM_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                            { id: assigned, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                        ],
                    });
                    if (!userTickets[user.id]) userTickets[user.id] = [];
                    userTickets[user.id].push(ticketChannel.id);
                    ticketStats.erstellt++;
                    // MongoDB speichern
                    if (db) await db.collection('tickets').insertOne({
                        userId: user.id,
                        channelId: ticketChannel.id,
                        reason,
                        priority,
                        assigned,
                        status: 'offen',
                        createdAt: new Date(),
                    });
                    // Benachrichtigung an Team
                    const welcomeEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle('🎟️ Ticket eröffnet')
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .setDescription(`Hallo <@${user.id}>! 👋\n\n`
                            + `**Grund:** 📝 ${reason.charAt(0).toUpperCase() + reason.slice(1)}\n`
                            + `**Priorität:** 🚦 ${priority.charAt(0).toUpperCase() + priority.slice(1)}\n\n`
                            + `Ein Teammitglied wird sich gleich um dein Anliegen kümmern.`)
                        .addFields(
                            { name: 'Ticket-ID', value: `🆔 ${channelName}`, inline: true },
                            { name: 'Status', value: '🟢 Offen', inline: true }
                        )
                        .setFooter({ text: 'Support-Team', iconURL: 'https://cdn-icons-png.flaticon.com/512/3523/3523887.png' });
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('claim_ticket').setLabel('✅ Claim').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('❌ Unclaim').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Schließen').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('reopen_ticket').setLabel('🔓 Wieder öffnen').setStyle(ButtonStyle.Primary)
                    );
                    await ticketChannel.send({ content: `<@&${TEAM_ROLE_ID}>`, embeds: [welcomeEmbed], components: [row] });
                    const infoEmbed = new EmbedBuilder()
                        .setDescription(`✅ Ticket erfolgreich erstellt! Du findest es hier: <#${ticketChannel.id}>`)
                        .setColor(0x57F287)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }));
                    await interaction.reply({ embeds: [infoEmbed], flags: 64 });
                    // Panel aktualisieren
                    // ... Panel-Logik ...
                    // Automatische Erinnerung nach 1h
                    reminderTimeouts[ticketChannel.id] = setTimeout(async () => {
                        await ticketChannel.send('Erinnerung: Dieses Ticket ist noch offen!');
                    }, 3600000);
                } catch (error) {
                    console.error(error);
                    await interaction.reply({ content: 'Fehler beim Erstellen des Ticket-Channels!' });
                }
            }
        } else if (interaction.isButton() && (interaction.customId === 'claim_ticket' || interaction.customId === 'unclaim_ticket')) {
            // Claim/Unclaim Logik
            const member = interaction.member;
            let embed = interaction.message.embeds[0];
            if (!embed) return;
            const { EmbedBuilder } = require('discord.js');
            embed = EmbedBuilder.from(embed);
            if (interaction.customId === 'claim_ticket') {
                embed.setFooter({ text: `✅ Geclaimed von: ${member.user.tag}` });
                ticketStats.geclaimed++;
                if (db) await db.collection('tickets').updateOne({ channelId: interaction.channel.id }, { $set: { claimedBy: member.user.id, status: 'geclaimed' } });
                await interaction.update({ embeds: [embed] });
            } else if (interaction.customId === 'unclaim_ticket') {
                embed.setFooter({ text: `❌ Nicht geclaimed` });
                if (db) await db.collection('tickets').updateOne({ channelId: interaction.channel.id }, { $set: { claimedBy: null, status: 'offen' } });
                await interaction.update({ embeds: [embed] });
            }
        } else if (interaction.isButton() && interaction.customId === 'close_ticket') {
            // Ticket schließen
            const channel = interaction.channel;
            const user = interaction.user;
            // Transkript erstellen
            let messages = await channel.messages.fetch({ limit: 100 });
            let log = '';
            messages.reverse().forEach(m => {
                let msgText = `${m.author.tag}: ${m.content}`;
                if (m.embeds && m.embeds.length > 0) {
                    m.embeds.forEach(embed => {
                        if (embed.title) msgText += `\n[EMBED-Titel]: ${embed.title}`;
                        if (embed.description) msgText += `\n[EMBED-Text]: ${embed.description}`;
                    });
                }
                log += msgText + '\n';
            });
            // Transkript als Datei erstellen
            const fs = require('fs');
            const path = require('path');
            const transcriptFileName = `transkript-${channel.name}-${Date.now()}.txt`;
            const transcriptFilePath = path.join(__dirname, '..', transcriptFileName);
            fs.writeFileSync(transcriptFilePath, log);
            // Ticket-Infos sammeln
            let ticketInfo = await db?.collection('tickets').findOne({ channelId: channel.id });
            const infoEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('Ticket geschlossen')
                .setDescription(`Das Ticket **${channel.name}** wurde geschlossen.`)
                .addFields(
                    { name: 'Ersteller', value: `<@${ticketInfo?.userId || user.id}>`, inline: true },
                    { name: 'Ticket-ID', value: channel.id, inline: true },
                    { name: 'Grund', value: ticketInfo?.reason || 'Unbekannt', inline: true },
                    { name: 'Priorität', value: ticketInfo?.priority || 'Unbekannt', inline: true },
                    { name: 'Status', value: 'Geschlossen', inline: true },
                    { name: 'Erstellt am', value: ticketInfo?.createdAt ? new Date(ticketInfo.createdAt).toLocaleString('de-DE') : 'Unbekannt', inline: true },
                    { name: 'Geschlossen am', value: new Date().toLocaleString('de-DE'), inline: true }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Ticketsystem Archiv' });
            // Archivieren
            const archivChannel = interaction.guild.channels.cache.get(ARCHIV_CHANNEL_ID);
            if (archivChannel) {
                await archivChannel.send({
                    content: `Transkript und Ticket-Infos zu ${channel.name}:`,
                    embeds: [infoEmbed],
                    files: [transcriptFilePath]
                });
            }
            // Statistik
            ticketStats.geschlossen++;
            if (db) await db.collection('tickets').updateOne({ channelId: channel.id }, { $set: { status: 'geschlossen', closedAt: new Date() } });
            // Ticket aus User-Liste entfernen
            Object.keys(userTickets).forEach(uid => { userTickets[uid] = userTickets[uid].filter(cid => cid !== channel.id); });
            // Feedback-System
            feedbackPending[user.id] = channel.name;
            const feedbackEmbed = new EmbedBuilder()
                .setTitle('📝 Feedback')
                .setDescription('Wie zufrieden bist du mit der Bearbeitung deines Tickets?\nBitte gib eine Bewertung von 1 (schlecht) bis 5 (sehr gut) mit dem /feedback-Befehl ab.')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Dein Feedback hilft uns, besser zu werden!' });
            await channel.send({ embeds: [feedbackEmbed] });
            // Reminder entfernen
            if (reminderTimeouts[channel.id]) clearTimeout(reminderTimeouts[channel.id]);
            await channel.setName(`geschlossen-${channel.name}`);
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
            await channel.delete();
        } else if (interaction.isButton() && interaction.customId === 'reopen_ticket') {
            // Ticket wieder öffnen
            const channel = interaction.channel;
            if (db) await db.collection('tickets').updateOne({ channelId: channel.id }, { $set: { status: 'offen', reopenedAt: new Date() } });
            const reopenEmbed = new EmbedBuilder()
                .setTitle('🔓 Ticket wieder geöffnet')
                .setDescription('Das Ticket wurde erneut geöffnet und ist wieder für dich und das Team sichtbar.')
                .setColor(0x57F287);
            await channel.send({ embeds: [reopenEmbed] });
        }
        // Panel für offene Tickets (z.B. per Befehl oder Channel)
        if (interaction.isChatInputCommand() && interaction.commandName === 'tickets') {
            // Zeige alle offenen Tickets als Übersichtspanel
            if (db) {
                const tickets = await db.collection('tickets').find({ status: { $in: ['offen', 'geclaimed'] } }).toArray();
                if (tickets.length === 0) {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: 'Es sind keine offenen Tickets vorhanden.', flags: 64 });
                    } else {
                        await interaction.editReply({ content: 'Es sind keine offenen Tickets vorhanden.' });
                    }
                } else {
                    let msg = '';
                    tickets.forEach(t => {
                        msg += `**Ticket-ID:** 🆔 ${t.channelId}\n`
                            + `**User:** <@${t.userId}>\n`
                            + `**Grund:** 📝 ${t.reason.charAt(0).toUpperCase() + t.reason.slice(1)}\n`
                            + `**Priorität:** 🚦 ${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}\n`
                            + `**Status:** ${t.status === 'offen' ? '🟢 Offen' : t.status === 'geclaimed' ? '🟡 Geclaimed' : '🔴 Geschlossen'}\n\n`;
                    });
                    const panelEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle('📋 Offene Tickets')
                        .setDescription('Hier findest du alle offenen Tickets.\n\n' + msg)
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3523/3523887.png')
                        .setFooter({ text: 'Ticketsystem Übersicht', iconURL: 'https://cdn-icons-png.flaticon.com/512/3523/3523887.png' });
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ embeds: [panelEmbed], flags: 64 });
                    } else {
                        await interaction.editReply({ embeds: [panelEmbed] });
                    }
                }
            }
        }

        // Feedback-Auswertung (z.B. per Reaktion oder Nachricht)
        if (interaction.isChatInputCommand() && interaction.commandName === 'feedback') {
            // User gibt Feedback zu Ticket
            const ticketId = interaction.options.getString('ticketid');
            const rating = interaction.options.getInteger('bewertung');
            if (db && ticketId && rating) {
                await db.collection('tickets').updateOne({ channelId: ticketId }, { $set: { feedback: rating } });
                const fbEmbed = new EmbedBuilder()
                    .setTitle('🎉 Vielen Dank für dein Feedback!')
                    .setDescription(`Deine Bewertung für Ticket **${ticketId}**: **${rating}/5**\nWir freuen uns über deine Rückmeldung und arbeiten stetig daran, unseren Service zu verbessern.`)
                    .setColor(0x57F287)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
                await interaction.reply({ embeds: [fbEmbed], flags: 64 });
            } else {
                const fbErrEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Fehler beim Feedback')
                    .setDescription('Dein Feedback konnte leider nicht gespeichert werden. Bitte prüfe die Ticket-ID und die Bewertung.')
                    .setColor(0xED4245)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
                await interaction.reply({ embeds: [fbErrEmbed], flags: 64 });
            }
        }
    },
};
