import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { anilist } from '../services/anilist.js';

export default {
    data: new SlashCommandBuilder()
        .setName('next')
        .setDescription('Check when the next episode of an anime airs')
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

            const schedule = await anilist.getAiringSchedule(anime.id);

            const embed = new EmbedBuilder()
                .setColor('#02A9FF')
                .setTitle(schedule.title.romaji || schedule.title.english)
                .setThumbnail(anime.coverImage?.large);

            if (schedule.nextAiringEpisode) {
                const timeUntil = anilist.getTimeUntilAiring(schedule.nextAiringEpisode.timeUntilAiring);
                embed.addFields(
                    { name: '📺 Next Episode', value: `Episode ${schedule.nextAiringEpisode.episode}`, inline: true },
                    { name: '⏰ Airing In', value: timeUntil, inline: true },
                    { name: '📅 Air Date', value: anilist.formatAiringTime(schedule.nextAiringEpisode.airingAt) }
                );
            } else {
                embed.setDescription('ℹ️ No upcoming episodes scheduled. This anime may have finished airing.');
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            throw error;
        }
    }
};