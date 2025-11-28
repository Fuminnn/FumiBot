import { SlashCommandBuilder } from 'discord.js';
import { checkForNewEpisodes } from '../utils/episodeChecker.js';

export default {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Manually check for new episodes (for testing)'),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            await checkForNewEpisodes(interaction.client);
            await interaction.editReply('✅ Check complete! If any new episodes aired recently, notifications were sent.');
        } catch (error) {
            console.error('Manual check error:', error);
            await interaction.editReply('❌ An error occurred during the check.');
        }
    }
};