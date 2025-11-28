import { SlashCommandBuilder } from 'discord.js';
import { notifyUser } from '../services/notifier.js';

export default {
    data: new SlashCommandBuilder()
        .setName('test-notify')
        .setDescription('Send a test notification'),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const testAnime = {
                id: 12345,
                title: {
                    romaji: 'Frieren: Beyond Journey\'s End',
                    english: 'Frieren: Beyond Journey\'s End'
                },
                coverImage: {
                    large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-gHSraOSa7vLJ.jpg'
                },
                siteUrl: 'https://anilist.co/anime/154587'
            };
            
            const testEpisode = 12;
            
            await notifyUser(interaction.client, interaction.user.id, testAnime, testEpisode, interaction.channel.id);
            await interaction.editReply('✅ Test notification sent in this channel!');
        } catch (error) {
            console.error('Test notify error:', error);
            await interaction.editReply('❌ Failed to send test notification.');
        }
    }
};