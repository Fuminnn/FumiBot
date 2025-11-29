import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../config/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show your AniList connection status'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const connection = await db.getAniListConnection(interaction.user.id);
            const watchlist = await db.getUserWatchlist(interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor('#02A9FF')
                .setTitle('📊 Account Status')
                .setTimestamp();

            if (connection) {
                const lastSynced = connection.last_synced 
                    ? new Date(connection.last_synced).toLocaleString()
                    : 'Never';

                embed.addFields(
                    { name: '🔗 AniList Connection', value: '✅ Connected', inline: true },
                    { name: '👤 AniList Username', value: connection.anilist_username, inline: true },
                    { name: '🔄 Auto-Sync', value: connection.auto_sync ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '📅 Last Synced', value: lastSynced, inline: true },
                    { name: '📺 Anime in Watchlist', value: `${watchlist.length}`, inline: true }
                );

                embed.setFooter({ text: 'Use /sync to manually sync with AniList' });
            } else {
                embed.setDescription('❌ No AniList account connected')
                    .addFields(
                        { name: '📺 Anime in Watchlist', value: `${watchlist.length}`, inline: true }
                    )
                    .setFooter({ text: 'Use /connect to link your AniList account' });
            }

            await interaction.editReply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Status error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching your status.',
                ephemeral: true
            });
        }
    }
};