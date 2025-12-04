import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilistAuth } from '../services/anilistAuth.js';

export default {
    data: new SlashCommandBuilder()
        .setName('export')
        .setDescription('Export your bot watchlist to AniList'),

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

            // Get bot watchlist
            const botWatchlist = await db.getUserWatchlist(interaction.user.id);

            if (botWatchlist.length === 0) {
                return interaction.editReply({
                    content: '📝 Your bot watchlist is empty!\n\nAdd some anime with `/add` first.',
                    ephemeral: true
                });
            }

            let exported = 0;
            let skipped = 0;
            const errors = [];

            // Export each anime to AniList
            for (const entry of botWatchlist) {
                try {
                    await anilistAuth.addAnimeToList(
                        connection.anilist_access_token,
                        entry.anime_id
                    );

                    // Also sync progress if available
                    if (entry.current_episode > 0) {
                        await anilistAuth.updateProgress(
                            connection.anilist_access_token,
                            entry.anime_id,
                            entry.current_episode
                        );
                    }

                    exported++;
                } catch (error) {
                    // If anime already exists on AniList, that's fine
                    if (error.message && error.message.includes('already')) {
                        skipped++;
                    } else {
                        console.error(`Failed to export ${entry.anime_title}:`, error);
                        errors.push(entry.anime_title);
                    }
                }

                // Rate limiting: wait 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Update last sync
            await db.updateLastSync(interaction.user.id);

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Export Complete!')
                .setDescription('Your bot watchlist has been synced to AniList!')
                .addFields(
                    { name: '📤 Exported', value: `${exported} anime`, inline: true },
                    { name: '⏭️ Skipped', value: `${skipped} (already on AniList)`, inline: true },
                    { name: '❌ Errors', value: `${errors.length}`, inline: true }
                )
                .setFooter({ text: 'Check your AniList to see the updates!' })
                .setTimestamp();

            if (errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Failed to Export',
                    value: errors.slice(0, 5).join(', ') + (errors.length > 5 ? '...' : '')
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Export error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while exporting. Please try again later.',
                ephemeral: true
            });
        }
    }
};
