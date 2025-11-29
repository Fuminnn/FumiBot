import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilistAuth } from '../services/anilistAuth.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Manually sync with AniList (two-way sync)'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Check if connected
            const connection = await db.getAniListConnection(interaction.user.id);

            if (!connection) {
                return interaction.editReply({
                    content: '❌ You need to connect your AniList account first!\n\nUse `/connect` to link your account.',
                    ephemeral: true
                });
            }

            // Get watching list from AniList
            const anilistEntries = await anilistAuth.getUserWatchingList(
                connection.anilist_access_token,
                connection.anilist_user_id
            );

            // Get bot watchlist
            const botWatchlist = await db.getUserWatchlist(interaction.user.id);

            let imported = 0;
            let updated = 0;
            let skipped = 0;

            // Sync FROM AniList TO Bot (import new anime)
            for (const entry of anilistEntries) {
                try {
                    const anime = entry.media;
                    const existing = botWatchlist.find(w => w.anime_id === anime.id);

                    if (!existing) {
                        // New anime not in bot, add it
                        await db.addToWatchlist(
                            interaction.user.id,
                            anime.id,
                            anime.title.romaji || anime.title.english,
                            anime.episodes,
                            interaction.channel.id
                        );

                        if (entry.progress > 0) {
                            await db.updateEpisode(interaction.user.id, anime.id, entry.progress);
                        }

                        await db.cacheAnime(anime);
                        imported++;
                    } else if (entry.progress > existing.current_episode) {
                        // Update progress if AniList has more episodes watched
                        await db.updateEpisode(interaction.user.id, anime.id, entry.progress);
                        updated++;
                    } else {
                        skipped++;
                    }
                } catch (error) {
                    console.error(`Error syncing ${entry.media.title.romaji}:`, error);
                }
            }

            // Sync FROM Bot TO AniList (update progress)
            let pushedToAnilist = 0;
            for (const botEntry of botWatchlist) {
                try {
                    const anilistEntry = anilistEntries.find(e => e.media.id === botEntry.anime_id);
                    
                    // If bot has more progress, update AniList
                    if (anilistEntry && botEntry.current_episode > anilistEntry.progress) {
                        await anilistAuth.updateProgress(
                            connection.anilist_access_token,
                            botEntry.anime_id,
                            botEntry.current_episode
                        );
                        pushedToAnilist++;
                    }
                } catch (error) {
                    console.error(`Error updating AniList for ${botEntry.anime_title}:`, error);
                }
            }

            // Update last sync
            await db.updateLastSync(interaction.user.id);

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔄 Sync Complete!')
                .setDescription('Two-way sync with AniList finished!')
                .addFields(
                    { name: '📥 From AniList', value: `${imported} new\n${updated} updated\n${skipped} skipped`, inline: true },
                    { name: '📤 To AniList', value: `${pushedToAnilist} updated`, inline: true }
                )
                .setFooter({ text: 'Your watchlist is now in sync!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Sync error:', error);
            await interaction.editReply({
                content: '❌ An error occurred during sync. Please try again later.',
                ephemeral: true
            });
        }
    }
};