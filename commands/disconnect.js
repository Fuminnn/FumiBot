import { SlashCommandBuilder } from 'discord.js';
import { db } from '../config/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Disconnect your AniList account'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Check if connected
            const connection = await db.getAniListConnection(interaction.user.id);

            if (!connection) {
                return interaction.editReply({
                    content: '❌ You don\'t have an AniList account connected.\n\nUse `/connect` to link your account!',
                    ephemeral: true
                });
            }

            // Store username before deleting
            const username = connection.anilist_username;

            // Delete connection
            const deleted = await db.deleteAniListConnection(interaction.user.id);

            if (deleted) {
                return interaction.editReply({
                    content: `✅ Successfully disconnected from AniList account **${username}**.\n\nYour watchlist in the bot is still intact. Use \`/connect\` to reconnect anytime!`,
                    ephemeral: true
                });
            } else {
                return interaction.editReply({
                    content: '❌ Failed to disconnect. Please try again.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Disconnect error:', error);
            
            // Check if it's a "not found" error (already disconnected)
            if (error.code === 'PGRST116') {
                return interaction.editReply({
                    content: '❌ You don\'t have an AniList account connected.\n\nUse `/connect` to link your account!',
                    ephemeral: true
                });
            }
            
            return interaction.editReply({
                content: '❌ An error occurred while disconnecting your account. Please try again.',
                ephemeral: true
            });
        }
    }
};