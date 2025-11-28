import { SlashCommandBuilder } from 'discord.js';
import { db } from '../config/database.js';
import { anilist } from '../services/anilist.js';

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

            const removed = await db.removeFromWatchlist(interaction.user.id, anime.id);

            if (removed) {
                await interaction.editReply(`✅ Removed **${anime.title.romaji || anime.title.english}** from your watchlist.`);
            } else {
                await interaction.editReply('❌ This anime is not in your watchlist.');
            }
        } catch (error) {
            throw error;
        }
    }
};