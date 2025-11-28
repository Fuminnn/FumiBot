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

        for (const animeId of animeIds) {
            try {
                const anime = await anilist.getAnimeById(animeId);
                
                if (!anime.nextAiringEpisode) continue;

                const newEpisode = anime.nextAiringEpisode.episode;
                const airingTime = anime.nextAiringEpisode.airingAt;
                const currentTime = Math.floor(Date.now() / 1000);

                // Check if episode aired within last 2 hours
                if (airingTime <= currentTime && (currentTime - airingTime) < 7200) {
                    const watchers = allWatchlists.filter(w => w.anime_id === animeId);

                    for (const watcher of watchers) {
                        if (newEpisode > watcher.current_episode) {
                            await notifyUser(
                                client,
                                watcher.discord_user_id,
                                anime,
                                newEpisode,
                                watcher.notification_channel_id
                            );
                            await db.updateEpisode(watcher.discord_user_id, animeId, newEpisode);
                            console.log(`✅ Notified user about ${anime.title.romaji} Episode ${newEpisode}`);
                        }
                    }
                }

                await db.cacheAnime(anime);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error checking anime ${animeId}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in episode checker:', error);
    }
}