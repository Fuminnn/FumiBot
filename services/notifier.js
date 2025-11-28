import { EmbedBuilder } from 'discord.js';

export async function notifyUser(client, userId, anime, episode, channelId = null) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 New Episode Released!')
            .setDescription(`**${anime.title.romaji}** - Episode ${episode} is now available!`)
            .setThumbnail(anime.coverImage?.large)
            .addFields({ name: '🔗 Watch on AniList', value: anime.siteUrl })
            .setTimestamp();

        if (channelId) {
            try {
                const channel = await client.channels.fetch(channelId);
                const user = await client.users.fetch(userId);
                
                await channel.send({ 
                    content: `<@${userId}> New episode alert!`,
                    embeds: [embed] 
                });
                console.log(`✅ Notified ${user.tag} in channel ${channel.name} about ${anime.title.romaji} Episode ${episode}`);
            } catch (channelError) {
                console.error(`Failed to send to channel ${channelId}, falling back to DM:`, channelError);
                const user = await client.users.fetch(userId);
                await user.send({ embeds: [embed] });
                console.log(`✅ Notified ${user.tag} via DM about ${anime.title.romaji} Episode ${episode}`);
            }
        } else {
            const user = await client.users.fetch(userId);
            await user.send({ embeds: [embed] });
            console.log(`✅ Notified ${user.tag} via DM about ${anime.title.romaji} Episode ${episode}`);
        }
    } catch (error) {
        console.error(`Failed to notify user ${userId}:`, error);
    }
}