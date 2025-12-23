import { SlashCommandBuilder } from 'discord.js';
import { notifyUser } from '../services/notifier.js';
import { db } from '../config/database.js';
import { checkForNewEpisodes } from '../utils/episodeChecker.js';

export default {
    data: new SlashCommandBuilder()
        .setName('test-notify')
        .setDescription('Send a test notification or test the full episode check system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('direct')
                .setDescription('Send a direct test notification')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('episode-check')
                .setDescription('Test the episode checker with mock data')
        ),

    async execute(interaction) {
        await interaction.deferReply();
        
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'direct') {
            await testDirectNotification(interaction);
        } else if (subcommand === 'episode-check') {
            await testEpisodeCheck(interaction);
        }
    }
};

async function testDirectNotification(interaction) {
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

async function testEpisodeCheck(interaction) {
    try {
        const animeId = 154587; // Frieren (will use mock data)
        const testAnimeTitle = 'Frieren: Beyond Journey\'s End (Test)';
        
        console.log('🧪 Starting episode checker test...');
        
        // Add test anime to watchlist with current_episode = 0
        console.log(`📝 Adding test anime to ${interaction.user.id}'s watchlist...`);
        await db.addToWatchlist(
            interaction.user.id,
            animeId,
            testAnimeTitle,
            null,
            interaction.channel.id
        );
        
        // Ensure current_episode is 0
        await db.updateEpisode(interaction.user.id, animeId, 0);
        console.log('✅ Test anime added with current_episode = 0');
        
        // Cache test anime data with a recent episode
        const currentTime = Math.floor(Date.now() / 1000);
        const mockAnimeData = {
            id: animeId,
            title: {
                romaji: 'Frieren: Beyond Journey\'s End',
                english: 'Frieren: Beyond Journey\'s End'
            },
            episodes: 10,
            status: 'RELEASING',
            coverImage: {
                large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-gHSraOSa7vLJ.jpg'
            },
            // Set next episode to air 1 hour ago (within the 2-hour notification window)
            nextAiringEpisode: {
                episode: 1,
                airingAt: currentTime - 3600 // 1 hour ago
            },
            siteUrl: 'https://anilist.co/anime/154587'
        };
        
        // Cache the mock anime
        console.log('📦 Caching test anime data with mock episode...');
        await db.cacheAnime(mockAnimeData);
        
        // Run the episode checker
        console.log('🔍 Running episode checker with mock data...');
        await checkForNewEpisodes(interaction.client);
        
        // Clean up - remove test anime
        console.log('🧹 Cleaning up test data...');
        await db.removeFromWatchlist(interaction.user.id, animeId);
        
        await interaction.editReply(
            '✅ Episode check test completed!\n\n' +
            '📋 **What happened:**\n' +
            '1. Added test anime (Frieren) to your watchlist with current_episode = 0\n' +
            '2. Created mock data: Episode 1 aired 1 hour ago\n' +
            '3. Ran the episode checker\n' +
            '4. Removed test anime from watchlist\n\n' +
            '💡 **Check the bot console logs above for detailed debug info.**\n' +
            '✉️ If the test worked, you should have received a notification in this channel!\n' +
            '⚠️ If no notification came, check if the bot has message permissions here.'
        );
    } catch (error) {
        console.error('Episode check test error:', error);
        
        // Attempt cleanup
        try {
            await db.removeFromWatchlist(interaction.user.id, 154587);
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }
        
        await interaction.editReply(`❌ Test failed: ${error.message}\n\nCheck the bot console for more details.`);
    }
}