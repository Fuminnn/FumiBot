import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilist } from '../services/anilist.js';

export default {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Manually check for new episodes (for testing)'),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            // Get detailed check results
            const results = await getCheckResults(interaction.client);
            
            // Create embed with results
            const embed = new EmbedBuilder()
                .setColor('#02A9FF')
                .setTitle('🔍 Episode Check Report')
                .setDescription(`Checked ${results.totalAnime} anime from your watchlist`)
                .setTimestamp();

            if (results.details.length === 0) {
                embed.addFields({ name: '📝 Status', value: 'No anime in watchlist' });
            } else {
                results.details.forEach(detail => {
                    let status = '';
                    
                    if (detail.noEpisode) {
                        status = '✅ Finished airing';
                    } else if (detail.notYetAired) {
                        status = `⏳ Airs in ${formatTime(detail.timeUntil)}`;
                    } else if (detail.tooOld) {
                        status = `⏰ Aired ${formatTime(Math.abs(detail.timeDiff))} ago (missed window)`;
                    } else if (detail.alreadyNotified) {
                        status = `✅ Already watched (Ep ${detail.currentEpisode})`;
                    } else if (detail.notified) {
                        status = `🎉 Notification sent! (Ep ${detail.episode})`;
                    }

                    embed.addFields({
                        name: `${detail.title}`,
                        value: detail.noEpisode ? status : `Episode ${detail.episode} • ${status}`,
                        inline: false
                    });
                });
            }

            // Add summary
            if (results.notificationsSent > 0) {
                embed.setFooter({ text: `📬 ${results.notificationsSent} notification(s) sent` });
            } else {
                embed.setFooter({ text: 'No new episodes to notify about' });
            }

            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Manual check error:', error);
            await interaction.editReply('❌ An error occurred during the check.');
        }
    }
};

async function getCheckResults(client) {
    const results = {
        totalAnime: 0,
        notificationsSent: 0,
        details: []
    };

    try {
        const allWatchlists = await db.getAllWatchlists();
        const animeIds = [...new Set(allWatchlists.map(w => w.anime_id))];
        results.totalAnime = animeIds.length;

        for (const animeId of animeIds) {
            try {
                const anime = await anilist.getAnimeById(animeId);
                
                if (!anime.nextAiringEpisode) {
                    results.details.push({
                        title: anime.title.romaji || anime.title.english,
                        noEpisode: true
                    });
                    continue;
                }

                const newEpisode = anime.nextAiringEpisode.episode;
                const airingTime = anime.nextAiringEpisode.airingAt;
                const currentTime = Math.floor(Date.now() / 1000);
                const timeDiff = currentTime - airingTime;
                const timeUntil = airingTime - currentTime;

                const detail = {
                    title: anime.title.romaji || anime.title.english,
                    episode: newEpisode,
                    timeDiff: timeDiff,
                    timeUntil: timeUntil
                };

                if (airingTime > currentTime) {
                    detail.notYetAired = true;
                } else if (timeDiff >= 7200) {
                    detail.tooOld = true;
                } else {
                    // Within notification window
                    const watchers = allWatchlists.filter(w => w.anime_id === animeId);
                    const watcher = watchers[0]; // Get first watcher (usually the user who ran the command)
                    
                    if (watcher && newEpisode > watcher.current_episode) {
                        detail.notified = true;
                        detail.currentEpisode = watcher.current_episode;
                        results.notificationsSent++;
                    } else if (watcher) {
                        detail.alreadyNotified = true;
                        detail.currentEpisode = watcher.current_episode;
                    }
                }

                results.details.push(detail);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error checking anime ${animeId}:`, error);
            }
        }
    } catch (error) {
        console.error('Error getting check results:', error);
    }

    return results;
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
}