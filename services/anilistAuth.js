import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

export const anilistAuth = {
    // Generate OAuth URL for user to connect
    getAuthUrl(state) {
        const params = new URLSearchParams({
            client_id: process.env.ANILIST_CLIENT_ID,
            redirect_uri: process.env.ANILIST_REDIRECT_URI,
            response_type: 'code',
            state: state 
        });

        return `https://anilist.co/api/v2/oauth/authorize?${params.toString()}`;
    },

    // Exchange authorization code for access token
    async getAccessToken(code) {
        const response = await fetch('https://anilist.co/api/v2/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: process.env.ANILIST_CLIENT_ID,
                client_secret: process.env.ANILIST_CLIENT_SECRET,
                redirect_uri: process.env.ANILIST_REDIRECT_URI,
                code: code,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get access token');
        }

        return await response.json();
    },

    // Get authenticated user info
    async getAuthenticatedUser(accessToken) {
        const client = new GraphQLClient('https://graphql.anilist.co', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const query = gql`
            query {
                Viewer {
                    id
                    name
                    avatar {
                        large
                    }
                }
            }
        `;

        try {
            const data = await client.request(query);
            return data.Viewer;
        } catch (error) {
            console.error('Error getting authenticated user:', error);
            throw error;
        }
    },

    // Get user's watching list
    async getUserWatchingList(accessToken, userId) {
        const client = new GraphQLClient('https://graphql.anilist.co', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const query = gql`
            query ($userId: Int, $status: MediaListStatus) {
                MediaListCollection(userId: $userId, type: ANIME, status: $status) {
                    lists {
                        entries {
                            media {
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
                                siteUrl
                            }
                            progress
                            status
                        }
                    }
                }
            }
        `;

        try {
            const data = await client.request(query, {
                userId: userId,
                status: 'CURRENT' // Only get "Currently Watching" anime
            });

            // Flatten the lists
            const entries = data.MediaListCollection.lists.flatMap(list => list.entries);
            return entries;
        } catch (error) {
            console.error('Error getting watching list:', error);
            throw error;
        }
    },

    // Update progress on AniList (mark episode as watched)
    async updateProgress(accessToken, mediaId, progress) {
        const client = new GraphQLClient('https://graphql.anilist.co', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const mutation = gql`
            mutation ($mediaId: Int, $progress: Int) {
                SaveMediaListEntry(mediaId: $mediaId, progress: $progress) {
                    id
                    progress
                }
            }
        `;

        try {
            const data = await client.request(mutation, {
                mediaId: mediaId,
                progress: progress
            });
            return data.SaveMediaListEntry;
        } catch (error) {
            console.error('Error updating progress:', error);
            throw error;
        }
    },

    // Add anime to AniList (set status to CURRENT = Watching)
    async addAnimeToList(accessToken, mediaId) {
        const client = new GraphQLClient('https://graphql.anilist.co', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const mutation = gql`
            mutation ($mediaId: Int, $status: MediaListStatus) {
                SaveMediaListEntry(mediaId: $mediaId, status: $status) {
                    id
                    status
                    progress
                    media {
                        title {
                            romaji
                        }
                    }
                }
            }
        `;

        try {
            const data = await client.request(mutation, {
                mediaId: mediaId,
                status: 'CURRENT' // CURRENT = Currently Watching
            });
            return data.SaveMediaListEntry;
        } catch (error) {
            console.error('Error adding to AniList:', error);
            throw error;
        }
    },  
};