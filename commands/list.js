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

        watchlist.forEach((item, index) => {
            embed.addFields({
                name: `${index + 1}. ${item.anime_title}`,
                value: `Current Episode: ${item.current_episode}${item.total_episodes ? ` / ${item.total_episodes}` : ''}`,
                inline: false
            });
        });

        await interaction.editReply({ embeds: [embed] });
    }
};