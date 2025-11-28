import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilist } from '../services/anilist.js';

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

            await db.addToWatchlist(
                interaction.user.id,
                anime.id,
                anime.title.romaji || anime.title.english,
                anime.episodes,
                interaction.channel.id
            );

            await db.cacheAnime(anime);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Added to Watchlist')
                .setDescription(`**${anime.title.romaji || anime.title.english}**`)
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