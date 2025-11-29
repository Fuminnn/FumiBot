import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilistAuth } from '../services/anilistAuth.js';

export default {
    data: new SlashCommandBuilder()
        .setName('import')
        .setDescription('Import your watching list from AniList'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const connection = await db.getAniListConnection(interaction.user.id);

            if (!connection) {
                return interaction.editReply({
                    content: '❌ You need to connect your AniList account first!\n\nUse `/connect` to link your account.',
                    ephemeral: true
                });
            }

            const watchingList = await anilistAuth.getUserWatchingList(
                connection.anilist_access_token,
                connection.anilist_user_id
            );

            if (watchingList.length === 0) {
                return interaction.editReply({
                    content: '📝 Your AniList "Watching" list is empty!\n\nAdd some anime to your list on AniList first.',
                    ephemeral: true
                });
            }

            let imported = 0;
            let skipped = 0;
            const errors = [];

            for (const entry of watchingList) {
                try {
                    const anime = entry.media;
                    
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
                } catch (error) {
                    if (error.message.includes('already in your watchlist')) {
                        skipped++;
                    } else {
                        errors.push(entry.media.title.romaji);
                    }
                }
            }

            await db.updateLastSync(interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Import Complete!')
                .addFields(
                    { name: '📥 Imported', value: `${imported} anime`, inline: true },
                    { name: '⏭️ Skipped', value: `${skipped} (already in list)`, inline: true },
                    { name: '❌ Errors', value: `${errors.length}`, inline: true }
                )
                .setFooter({ text: 'Use /list to see your watchlist' })
                .setTimestamp();

            if (errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Failed to Import',
                    value: errors.slice(0, 5).join(', ') + (errors.length > 5 ? '...' : '')
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Import error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while importing your list. Please try again later.',
                ephemeral: true
            });
        }
    }
};