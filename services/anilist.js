import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

const client = new GraphQLClient(process.env.ANILIST_API_URL);

export const anilist = {
    // Search for anime by name
    async searchAnime(searchTerm) {
        const query = gql`
            query ($search: String) {
                Media(search: $search, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                    }
                    episodes
                    status
                    coverImage {
                        large
                    }
                    nextAiringEpisode {
                        episode
                        airingAt
                    }
                }
            }
        `;

        try {
            const data = await client.request(query, { search: searchTerm });
            return data.Media;
        } catch (error) {
            console.error('AniList API Error:', error);
            throw error;
        }
    },

    // Search for multiple anime matches (returns array)
    async searchMultipleAnime(searchTerm) {
        const query = gql`
            query ($search: String) {
                Page(page: 1, perPage: 10) {
                    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                        id
                        title {
                            romaji
                        }
                        episodes
                        status
                        coverImage {
                            large
                        }
                        nextAiringEpisode {
                            episode
                            airingAt
                        }
                    }
                }
            }
        `;

        try {
            const data = await client.request(query, { search: searchTerm });
            return data.Page.media;
        } catch (error) {
            console.error('AniList API Error:', error);
            throw error;
        }
    },

    // Get anime by ID
    async getAnimeById(animeId) {
        const query = gql`
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                    }
                    episodes
                    status
                    description
                    source
                    coverImage {
                        large
                        extraLarge
                    }
                    bannerImage
                    nextAiringEpisode {
                        episode
                        airingAt
                    }
                    siteUrl
                }
            }
        `;

        try {
            const data = await client.request(query, { id: animeId });
            return data.Media;
        } catch (error) {
            console.error('AniList API Error:', error);
            throw error;
        }
    },

    // Get airing schedule for an anime
    async getAiringSchedule(animeId) {
        const query = gql`
            query ($mediaId: Int) {
                Media(id: $mediaId, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                    }
                    coverImage {
                        large
                    }
                    nextAiringEpisode {
                        episode
                        airingAt
                        timeUntilAiring
                    }
                }
            }
        `;

        try {
            const data = await client.request(query, { mediaId: animeId });
            return data.Media;
        } catch (error) {
            console.error('AniList API Error:', error);
            throw error;
        }
    },

    // Format airing time
    formatAiringTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    },

    // Get time until airing in human-readable format
    getTimeUntilAiring(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        const parts = [];
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);

        return parts.join(', ') || 'Less than a minute';
    }
};