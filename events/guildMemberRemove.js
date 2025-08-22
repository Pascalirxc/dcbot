const logModerationEvent = require('./logModerationEvent');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        await logModerationEvent.execute(client, 'User verlassen', {
            userId: member.id,
            userTag: member.user.tag,
            action: 'Verlassen',
            description: `Ein User hat den Server verlassen.`
        });
    }
};
