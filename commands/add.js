import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilist } from '../services/anilist.js';
import { anilistAuth } from '../services/anilistAuth.js';

export default {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add an anime to your watchlist')
        .addStringOption(option =>
            option.setName('anime')
                .setDescription('Search for an anime')
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

            // Add to bot watchlist
            await db.addToWatchlist(
                interaction.user.id,
                anime.id,
                anime.title.romaji || anime.title.english,
                anime.episodes,
                interaction.channel.id
            );

            // Cache anime data
            await db.cacheAnime(anime);

            // Check if user has AniList connected
            const connection = await db.getAniListConnection(interaction.user.id);
            let anilistStatus = '';

            if (connection) {
                try {
                    // Auto-add to AniList
                    await anilistAuth.addAnimeToList(
                        connection.anilist_access_token,
                        anime.id
                    );
                    anilistStatus = '\n✅ Also added to your AniList!';
                } catch (anilistError) {
                    console.error('Failed to add to AniList:', anilistError);
                    anilistStatus = '\n⚠️ Added to bot, but failed to sync to AniList';
                }
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Added to Watchlist')
                .setDescription(`**${anime.title.romaji || anime.title.english}**${anilistStatus}`)
                .addFields(
                    { name: 'Episodes', value: anime.episodes ? `${anime.episodes}` : 'Unknown', inline: true },
                    { name: 'Status', value: anime.status || 'Unknown', inline: true },
                    { name: '📢 Notifications', value: `Will be sent in <#${interaction.channel.id}>`, inline: false }
                )
                .setThumbnail(anime.coverImage?.large);

            if (anime.nextAiringEpisode) {
                embed.addFields({
                    name: '📅 Next Episode',
                    value: `Episode ${anime.nextAiringEpisode.episode} - ${anilist.formatAiringTime(anime.nextAiringEpisode.airingAt)}`
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            if (error.message.includes('already in your watchlist')) {
                await interaction.editReply('ℹ️ This anime is already in your watchlist!');
            } else {
                throw error;
            }
        }
    }
};