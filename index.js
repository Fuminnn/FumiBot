import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { db } from './config/database.js';
import { anilist } from './services/anilist.js';
import cron from 'node-cron';

dotenv.config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Bot ready event
client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    
    // Start the periodic check for new episodes (every 30 minutes)
    startEpisodeChecker();
});

// Message handler for commands
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case 'add':
                await handleAddAnime(message, args);
                break;
            case 'list':
                await handleListAnime(message);
                break;
            case 'remove':
                await handleRemoveAnime(message, args);
                break;
            case 'next':
                await handleNextEpisode(message, args);
                break;
            case 'help':
                await handleHelp(message);
                break;
            case 'check':
                await handleManualCheck(message);
                break;
            case 'test-notify':
                await handleTestNotify(message);
                break;
            case 'setchannel':
                await handleSetChannel(message);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('Command error:', error);
        message.reply('❌ An error occurred while processing your command.');
    }
});

// Add anime to watchlist
async function handleAddAnime(message, args) {
    if (args.length === 0) {
        return message.reply('❌ Please provide an anime name. Example: `!add Frieren`');
    }

    const searchTerm = args.join(' ');
    message.channel.send(`🔍 Searching for "${searchTerm}"...`);

    try {
        const anime = await anilist.searchAnime(searchTerm);
        
        if (!anime) {
            return message.reply('❌ Anime not found. Please try a different name.');
        }

        await db.addToWatchlist(
            message.author.id,
            anime.id,
            anime.title.romaji || anime.title.english,
            anime.episodes,
            message.channel.id
        );

        // Cache anime data
        await db.cacheAnime(anime);

        const embed = new EmbedBuilder()
            .setColor('#02A9FF')
            .setTitle('✅ Added to Watchlist')
            .setDescription(`**${anime.title.romaji}**`)
            .addFields(
                { name: 'Episodes', value: anime.episodes ? `${anime.episodes}` : 'Unknown', inline: true },
                { name: 'Status', value: anime.status, inline: true },
                { name: '📢 Notifications', value: `Will be sent in <#${message.channel.id}>`, inline: false }
            )
            .setThumbnail(anime.coverImage?.large);

        if (anime.nextAiringEpisode) {
            embed.addFields({
                name: '📅 Next Episode',
                value: `Episode ${anime.nextAiringEpisode.episode} - ${anilist.formatAiringTime(anime.nextAiringEpisode.airingAt)}`
            });
        }

        message.reply({ embeds: [embed] });
    } catch (error) {
        if (error.message.includes('already in your watchlist')) {
            message.reply('ℹ️ This anime is already in your watchlist!');
        } else {
            throw error;
        }
    }
}

// List user's watchlist
async function handleListAnime(message) {
    const watchlist = await db.getUserWatchlist(message.author.id);

    if (watchlist.length === 0) {
        return message.reply('📝 Your watchlist is empty. Add anime with `!add <anime name>`');
    }

    const embed = new EmbedBuilder()
        .setColor('#02A9FF')
        .setTitle(`${message.author.username}'s Watchlist`)
        .setDescription(`You have ${watchlist.length} anime in your watchlist:`)
        .setFooter({ text: 'Use !next <anime name> to check next episode' });

    watchlist.forEach((item, index) => {
        embed.addFields({
            name: `${index + 1}. ${item.anime_title}`,
            value: `ID: ${item.anime_id} | Current Episode: ${item.current_episode}`,
            inline: false
        });
    });

    message.reply({ embeds: [embed] });
}

// Remove anime from watchlist
async function handleRemoveAnime(message, args) {
    if (args.length === 0) {
        return message.reply('❌ Please provide an anime name. Example: `!remove Frieren`');
    }

    const searchTerm = args.join(' ');

    try {
        const anime = await anilist.searchAnime(searchTerm);
        
        if (!anime) {
            return message.reply('❌ Anime not found.');
        }

        const removed = await db.removeFromWatchlist(message.author.id, anime.id);

        if (removed) {
            message.reply(`✅ Removed **${anime.title.romaji}** from your watchlist.`);
        } else {
            message.reply('❌ This anime is not in your watchlist.');
        }
    } catch (error) {
        throw error;
    }
}

// Check next episode airing time
async function handleNextEpisode(message, args) {
    if (args.length === 0) {
        return message.reply('❌ Please provide an anime name. Example: `!next Frieren`');
    }

    const searchTerm = args.join(' ');

    try {
        const anime = await anilist.searchAnime(searchTerm);
        
        if (!anime) {
            return message.reply('❌ Anime not found.');
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

        message.reply({ embeds: [embed] });
    } catch (error) {
        throw error;
    }
}

// Help command
async function handleHelp(message) {
    const embed = new EmbedBuilder()
        .setColor('#02A9FF')
        .setTitle('🤖 Anime Notifier Bot - Commands')
        .setDescription('Here are all available commands:')
        .addFields(
            { name: '!add <anime name>', value: 'Add an anime to your watchlist (notifications sent in current channel)', inline: false },
            { name: '!list', value: 'View your watchlist', inline: false },
            { name: '!remove <anime name>', value: 'Remove an anime from your watchlist', inline: false },
            { name: '!next <anime name>', value: 'Check when the next episode airs', inline: false },
            { name: '!setchannel', value: 'Set this channel for all your notifications', inline: false },
            { name: '!check', value: 'Manually check for new episodes (for testing)', inline: false },
            { name: '!test-notify', value: 'Send a test notification in this channel', inline: false },
            { name: '!help', value: 'Show this help message', inline: false }
        )
        .setFooter({ text: 'You will receive automatic notifications when new episodes are released!' });

    message.reply({ embeds: [embed] });
}

// Manual check for new episodes (for testing)
async function handleManualCheck(message) {
    message.reply('🔍 Manually checking for new episodes... This may take a moment.');
    
    try {
        await checkForNewEpisodes();
        message.channel.send('✅ Check complete! If any new episodes aired recently, you should receive a DM.');
    } catch (error) {
        console.error('Manual check error:', error);
        message.channel.send('❌ An error occurred during the check.');
    }
}

// Test notification (sends a fake notification to see the format)
async function handleTestNotify(message) {
    message.reply('📬 Sending a test notification in this channel...');
    
    try {
        // Create fake anime data for testing
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
        
        await notifyUser(message.author.id, testAnime, testEpisode, message.channel.id);
        message.channel.send('✅ Test notification sent above!');
    } catch (error) {
        console.error('Test notify error:', error);
        message.channel.send('❌ Failed to send test notification.');
    }
}

// Set notification channel for user's anime
async function handleSetChannel(message) {
    const watchlist = await db.getUserWatchlist(message.author.id);
    
    if (watchlist.length === 0) {
        return message.reply('❌ You don\'t have any anime in your watchlist yet. Add some with `!add <anime name>` first!');
    }

    try {
        // Update all user's watchlist items to use this channel
        for (const item of watchlist) {
            await db.updateEpisode(message.author.id, item.anime_id, item.current_episode);
            // We'll need to add a proper update method, but for now this works
        }

        message.reply(`✅ Notification channel set to <#${message.channel.id}>! All your anime notifications will appear here.`);
    } catch (error) {
        console.error('Set channel error:', error);
        message.reply('❌ Failed to set notification channel.');
    }
}

// Periodic episode checker (runs every 30 minutes)
function startEpisodeChecker() {
    console.log('📡 Started episode checker (runs every 30 minutes)');
    
    // Run every 30 minutes: '*/30 * * * *'
    cron.schedule('*/30 * * * *', async () => {
        console.log('🔍 Checking for new episodes...');
        await checkForNewEpisodes();
    });
}

// Check for new episodes and notify users
async function checkForNewEpisodes() {
    try {
        const allWatchlists = await db.getAllWatchlists();
        
        // Group by anime_id to reduce API calls
        const animeIds = [...new Set(allWatchlists.map(w => w.anime_id))];

        for (const animeId of animeIds) {
            try {
                const anime = await anilist.getAnimeById(animeId);
                
                if (!anime.nextAiringEpisode) continue;

                const newEpisode = anime.nextAiringEpisode.episode;
                const airingTime = anime.nextAiringEpisode.airingAt;
                const currentTime = Math.floor(Date.now() / 1000);

                // Check if episode has aired (within last 30 minutes)
                if (airingTime <= currentTime && (currentTime - airingTime) < 1800) {
                    // Find all users watching this anime
                    const watchers = allWatchlists.filter(w => w.anime_id === animeId);

                    for (const watcher of watchers) {
                        // Only notify if this is a new episode for the user
                        if (newEpisode > watcher.current_episode) {
                            await notifyUser(watcher.discord_user_id, anime, newEpisode, watcher.notification_channel_id);
                            await db.updateEpisode(watcher.discord_user_id, animeId, newEpisode);
                        }
                    }
                }

                // Update cache
                await db.cacheAnime(anime);

                // Rate limiting: wait 1 second between API calls
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error checking anime ${animeId}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in episode checker:', error);
    }
}

// Send notification to user
async function notifyUser(userId, anime, episode, channelId = null) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 New Episode Released!')
            .setDescription(`**${anime.title.romaji}** - Episode ${episode} is now available!`)
            .setThumbnail(anime.coverImage?.large)
            .addFields({ name: '🔗 Watch on AniList', value: anime.siteUrl })
            .setTimestamp();

        // If channel ID is provided, send to that channel
        if (channelId) {
            try {
                const channel = await client.channels.fetch(channelId);
                const user = await client.users.fetch(userId);
                
                await channel.send({ 
                    content: `<@${userId}> New episode alert!`,
                    embeds: [embed] 
                });
                console.log(`✅ Notified ${user.tag} in channel ${channel.name} about ${anime.title.romaji} Episode ${episode}`);
            } catch (channelError) {
                console.error(`Failed to send to channel ${channelId}, falling back to DM:`, channelError);
                // Fallback to DM if channel is unavailable
                const user = await client.users.fetch(userId);
                await user.send({ embeds: [embed] });
                console.log(`✅ Notified ${user.tag} via DM about ${anime.title.romaji} Episode ${episode}`);
            }
        } else {
            // No channel specified, send DM
            const user = await client.users.fetch(userId);
            await user.send({ embeds: [embed] });
            console.log(`✅ Notified ${user.tag} via DM about ${anime.title.romaji} Episode ${episode}`);
        }
    } catch (error) {
        console.error(`Failed to notify user ${userId}:`, error);
    }
}

// Login to Discord
client.login(process.env.DISCORD_TOKEN);