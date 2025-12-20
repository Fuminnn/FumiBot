import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('View your anime watchlist'),

    async execute(interaction) {
        await interaction.deferReply();

        const watchlist = await db.getUserWatchlist(interaction.user.id);

        if (watchlist.length === 0) {
            return interaction.editReply('📝 Your watchlist is empty. Add anime with `/add`');
        }

        const embed = new EmbedBuilder()
            .setColor('#02A9FF')
            .setTitle(`${interaction.user.username}'s Watchlist`)
            .setDescription(`You have ${watchlist.length} anime in your watchlist:`)
            .setFooter({ text: 'Use /next <anime> to check next episode' });

        for (let i = 0; i < watchlist.length; i++) {
            const item = watchlist[i];
            const cachedAnime = await db.getCachedAnime(item.anime_id);
            
            let episodeInfo = `📺 Total Episodes: ${item.total_episodes || 'Unknown'}`;
            if (cachedAnime?.next_airing_episode) {
                const currentEpisode = cachedAnime.next_airing_episode - 1;
                episodeInfo += `\n🎬 Current Airing Episode: ${currentEpisode}`;
            }
            
            embed.addFields({
                name: `${i + 1}. ${item.anime_title}`,
                value: episodeInfo,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};