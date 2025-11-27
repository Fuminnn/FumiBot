import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database helper functions
export const db = {
    // Add anime to user's watchlist
    async addToWatchlist(discordUserId, animeId, animeTitle, totalEpisodes = null) {
        const { data, error } = await supabase
            .from('user_watchlists')
            .insert([
                {
                    discord_user_id: discordUserId,
                    anime_id: animeId,
                    anime_title: animeTitle,
                    total_episodes: totalEpisodes,
                    current_episode: 0
                }
            ])
            .select();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('This anime is already in your watchlist!');
            }
            throw error;
        }

        return data[0];
    },

    // Get user's watchlist
    async getUserWatchlist(discordUserId) {
        const { data, error } = await supabase
            .from('user_watchlists')
            .select('*')
            .eq('discord_user_id', discordUserId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Remove anime from watchlist
    async removeFromWatchlist(discordUserId, animeId) {
        const { data, error } = await supabase
            .from('user_watchlists')
            .delete()
            .eq('discord_user_id', discordUserId)
            .eq('anime_id', animeId)
            .select();

        if (error) throw error;
        return data.length > 0;
    },

    // Update current episode for an anime
    async updateEpisode(discordUserId, animeId, episode) {
        const { data, error } = await supabase
            .from('user_watchlists')
            .update({ current_episode: episode, last_checked: new Date().toISOString() })
            .eq('discord_user_id', discordUserId)
            .eq('anime_id', animeId)
            .select();

        if (error) throw error;
        return data[0];
    },

    // Get all watchlist entries (for checking updates)
    async getAllWatchlists() {
        const { data, error } = await supabase
            .from('user_watchlists')
            .select('*');

        if (error) throw error;
        return data;
    },

    // Cache anime data
    async cacheAnime(animeData) {
        const { data, error } = await supabase
            .from('anime_cache')
            .upsert([
                {
                    anime_id: animeData.id,
                    title_romaji: animeData.title?.romaji,
                    title_english: animeData.title?.english,
                    total_episodes: animeData.episodes,
                    status: animeData.status,
                    next_airing_episode: animeData.nextAiringEpisode?.episode,
                    next_airing_at: animeData.nextAiringEpisode?.airingAt,
                    cover_image: animeData.coverImage?.large,
                    last_updated: new Date().toISOString()
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    },

    // Get cached anime data
    async getCachedAnime(animeId) {
        const { data, error } = await supabase
            .from('anime_cache')
            .select('*')
            .eq('anime_id', animeId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data;
    }
};