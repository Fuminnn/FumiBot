import { SlashCommandBuilder } from 'discord.js';
import { db } from '../config/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set this channel for all your notifications'),

    async execute(interaction) {
        await interaction.deferReply();

        const watchlist = await db.getUserWatchlist(interaction.user.id);
        
        if (watchlist.length === 0) {
            return interaction.editReply('❌ You don\'t have any anime in your watchlist yet. Add some with `/add` first!');
        }

        try {
            for (const item of watchlist) {
                await db.updateEpisode(interaction.user.id, item.anime_id, item.current_episode);
            }

            await interaction.editReply(`✅ Notification channel set to <#${interaction.channel.id}>! All your anime notifications will appear here.`);
        } catch (error) {
            console.error('Set channel error:', error);
            await interaction.editReply('❌ Failed to set notification channel.');
        }
    }
};