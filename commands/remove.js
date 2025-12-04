import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilist } from '../services/anilist.js';
import { anilistAuth } from '../services/anilistAuth.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove an anime from your watchlist')
        .addStringOption(option =>
            option.setName('anime')
                .setDescription('Search for an anime to remove')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const animeId = interaction.options.getString('anime');

        try {
            const anime = await anilist.getAnimeById(parseInt(animeId));
            
            if (!anime) {
                return interaction.editReply('❌ Anime not found.');
            }

            // Remove from bot watchlist
            const removed = await db.removeFromWatchlist(interaction.user.id, anime.id);

            if (!removed) {
                return interaction.editReply('❌ This anime is not in your watchlist.');
            }

            // Check if user has AniList connected
            const connection = await db.getAniListConnection(interaction.user.id);
            let anilistStatus = '';

            if (connection) {
                try {
                    // Auto-remove from AniList
                    const result = await anilistAuth.removeAnimeFromList(
                        connection.anilist_access_token,
                        anime.id
                    );

                    if (result.deleted) {
                        anilistStatus = '\n✅ Also removed from your AniList!';
                    } else if (result.notFound) {
                        anilistStatus = '\n⚠️ Removed from bot (was not in your AniList)';
                    }
                } catch (anilistError) {
                    console.error('Failed to remove from AniList:', anilistError);
                    anilistStatus = '\n⚠️ Removed from bot, but failed to sync to AniList';
                }
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('✅ Removed from Watchlist')
                .setDescription(`**${anime.title.romaji || anime.title.english}**${anilistStatus}`)
                .setThumbnail(anime.coverImage?.large);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            throw error;
        }
    }
};