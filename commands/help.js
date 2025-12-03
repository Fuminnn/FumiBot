import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands and how to use the bot'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎬 Anime Notifier Bot')
            .setDescription('*Never miss an episode of your favorite anime!*\n' +
                '> Track airing schedules and get instant notifications when new episodes drop.')
            .addFields(
                { 
                    name: '📺 Watchlist Commands', 
                    value: '**`/add`** · Add anime to your watchlist\n' +
                           '**`/list`** · View your tracked anime\n' +
                           '**`/remove`** · Remove anime from list\n' +
                           '**`/next`** · Check upcoming episodes',
                    inline: false 
                },
                { 
                    name: '\u200B',
                    value: '**🔗 AniList Integration**\n' +
                           '**`/connect`** · Link your AniList account\n' +
                           '**`/import`** · Import your watching list\n' +
                           '**`/sync`** · Two-way sync with AniList\n' +
                           '**`/status`** · Check connection status\n' +
                           '**`/disconnect`** · Unlink your account',
                    inline: false 
                },
                { 
                    name: '\u200B',
                    value: '**⚙️ Settings**\n' +
                           '**`/setchannel`** · Set notification channel',
                    inline: false 
                },
                {
                    name: '\u200B',
                    value: '**🧪 Testing Tools**\n' +
                           '**`/check`** · Manual episode check\n' +
                           '**`/test-notify`** · Send test notification',
                    inline: false 
                }
            )
            .addFields(
                {
                    name: '\u200B',
                    value: '**💡 Quick Tips**\n' +
                           '→ Use autocomplete when typing anime names\n' +
                           '→ Bot checks for new episodes every 5 minutes\n' +
                           '→ Notifications sent automatically to your set channel',
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Made with ❤️ for anime fans', 
                iconURL: interaction.client.user.displayAvatarURL() 
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};