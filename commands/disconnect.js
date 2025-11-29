import { SlashCommandBuilder } from 'discord.js';
import { db } from '../config/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Disconnect your AniList account'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const connection = await db.getAniListConnection(interaction.user.id);

            if (!connection) {
                return interaction.editReply({
                    content: '❌ You don\'t have an AniList account connected.\n\nUse `/connect` to link your account!',
                    ephemeral: true
                });
            }

            await db.deleteAniListConnection(interaction.user.id);

            await interaction.editReply({
                content: `✅ Successfully disconnected from AniList account **${connection.anilist_username}**.\n\nYour watchlist in the bot is still intact. Use `/connect` to reconnect anytime!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Disconnect error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while disconnecting your account.',
                ephemeral: true
            });
        }
    }
};