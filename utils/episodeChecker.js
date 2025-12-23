import cron from 'node-cron';
import { db } from '../config/database.js';
import { anilist } from '../services/anilist.js';
import { notifyUser } from '../services/notifier.js';

export function startEpisodeChecker(client) {
    console.log('📡 Started episode checker (runs every 5 minutes)');
    
    cron.schedule('*/5 * * * *', async () => {
        console.log('🔍 Checking for new episodes...');
        await checkForNewEpisodes(client);
    });
}

export async function checkForNewEpisodes(client) {
    try {
        const allWatchlists = await db.getAllWatchlists();
        const animeIds = [...new Set(allWatchlists.map(w => w.anime_id))];

        console.log(`🔍 Checking for new episodes... Found ${animeIds.length} unique anime`);

        for (const animeId of animeIds) {
            try {
                // Try to get cached anime first (useful for testing and reducing API calls)
                let anime = await db.getCachedAnime(animeId);
                
                // If no cache or cache is stale (older than 1 hour), fetch from API
                if (!anime || (Date.now() - new Date(anime.last_updated).getTime()) > 3600000) {
                    console.log(`   🌐 Fetching from API...`);
                    anime = await anilist.getAnimeById(animeId);
                    await db.cacheAnime(anime);
                } else {
                    console.log(`   📦 Using cached data`);
                    // Convert cached data back to API format
                    anime = {
                        id: anime.anime_id,
                        title: {
                            romaji: anime.title_romaji,
                            english: anime.title_english
                        },
                        episodes: anime.total_episodes,
                        status: anime.status,
                        coverImage: {
                            large: anime.cover_image
                        },
                        nextAiringEpisode: anime.next_airing_episode ? {
                            episode: anime.next_airing_episode,
                            airingAt: anime.next_airing_at
                        } : null,
                        siteUrl: `https://anilist.co/anime/${anime.anime_id}`
                    };
                }
                
                console.log(`📺 Checking: ${anime.title.romaji}`);
                
                if (!anime.nextAiringEpisode) {
                    console.log(`   ⏹️ No upcoming episodes (finished airing)`);
                    continue;
                }

                const newEpisode = anime.nextAiringEpisode.episode;
                const airingTime = anime.nextAiringEpisode.airingAt;
                const currentTime = Math.floor(Date.now() / 1000);
                const timeDiffSeconds = currentTime - airingTime;

                console.log(`   📅 Next Episode: ${newEpisode} (Airs: ${new Date(airingTime * 1000).toLocaleString()})`);
                console.log(`   ⏱️ Time diff: ${timeDiffSeconds}s (${(timeDiffSeconds / 3600).toFixed(1)} hours ago)`);

                // Check if episode has aired (within last 7 days to catch missed episodes)
                if (airingTime <= currentTime && timeDiffSeconds < 604800) {
                    console.log(`   ✅ Episode has aired recently (within 7 days)`);
                    const watchers = allWatchlists.filter(w => w.anime_id === animeId);
                    console.log(`   👥 Found ${watchers.length} watcher(s)`);

                    for (const watcher of watchers) {
                        // Notify if the new episode is newer than what the user has watched
                        // AND either:
                        // 1. Episode just aired (within last 2 hours), OR
                        // 2. This is the first check (current_episode is 0 and episode is 1)
                        const recentAiring = timeDiffSeconds < 7200;
                        const firstEpisodeCheck = watcher.current_episode === 0 && newEpisode === 1;
                        
                        console.log(`      User ${watcher.discord_user_id}: current=${watcher.current_episode}, new=${newEpisode}, recent=${recentAiring}, first=${firstEpisodeCheck}`);
                        
                        if (newEpisode > watcher.current_episode && (recentAiring || firstEpisodeCheck)) {
                            await notifyUser(
                                client,
                                watcher.discord_user_id,
                                anime,
                                newEpisode,
                                watcher.notification_channel_id
                            );
                            await db.updateEpisode(watcher.discord_user_id, animeId, newEpisode);
                            console.log(`      ✅ Notified user about ${anime.title.romaji} Episode ${newEpisode}`);
                        } else {
                            console.log(`      ⏭️ Skipped (episode not newer or not in notification window)`);
                        }
                    }
                } else {
                    console.log(`   ⏳ Episode not ready yet or too old (window: 7 days)`);
                }

                if (!anime || (Date.now() - new Date(anime.last_updated || 0).getTime()) > 3600000) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ Error checking anime ${animeId}:`, error.message);
            }
        }
        console.log('✅ Episode check completed');
    } catch (error) {
        console.error('❌ Error in episode checker:', error);
    }
}