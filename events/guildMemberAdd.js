const logModerationEvent = require('./logModerationEvent');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        await logModerationEvent.execute(client, 'User beigetreten', {
            userId: member.id,
            userTag: member.user.tag,
            action: 'Beitritt',
            description: `Ein User ist dem Server beigetreten.`
        });
    }
};
