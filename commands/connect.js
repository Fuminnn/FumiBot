import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { anilistAuth } from '../services/anilistAuth.js';
import { db } from '../config/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('connect')
        .setDescription('Connect your AniList account'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Check if already connected
            const existing = await db.getAniListConnection(interaction.user.id);

            if (existing) {
                return interaction.editReply({
                    content: `✅ You're already connected to AniList as **${existing.anilist_username}**!\n\nUse \`/disconnect\` to unlink your account, or \`/sync\` to sync your watchlist.`,
                    ephemeral: true
                });
            }

            // Generate auth URL with user ID as state for security
            const authUrl = anilistAuth.getAuthUrl(interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor('#02A9FF')
                .setTitle('🔗 Connect Your AniList Account')
                .setDescription('Click the button below to connect your AniList account!\n\n**What this does:**\n• Import your "Watching" anime\n• Auto-sync when you add anime\n• Update AniList when episodes watched\n• Keep everything in sync!')
                .setFooter({ text: 'Your login is secure via AniList OAuth' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Connect AniList')
                        .setURL(authUrl)
                        .setStyle(ButtonStyle.Link)
                        .setEmoji('🔗')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            // Note: User will be redirected to a callback URL
            // For now, they'll need to manually paste the code
            await interaction.followUp({
                content: '**After authorizing:**\nCopy the code from the URL and use `/verify <code>` to complete the connection.',
                ephemeral: true
            });

        } catch (error) {
            console.error('Connect error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while setting up the connection.',
                ephemeral: true
            });
        }
    }
};