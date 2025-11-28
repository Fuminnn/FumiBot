import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands and how to use the bot'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#02A9FF')
            .setTitle('🤖 Anime Notifier Bot - Help')
            .setDescription('Track your favorite anime and get notified when new episodes air!')
            .addFields(
                { 
                    name: '📺 Main Commands', 
                    value: '`/add` - Add an anime to your watchlist\n`/list` - View all anime in your watchlist\n`/remove` - Remove an anime from your watchlist\n`/next` - Check when the next episode airs', 
                    inline: false 
                },
                { 
                    name: '⚙️ Settings', 
                    value: '`/setchannel` - Set this channel for notifications', 
                    inline: false 
                },
                { 
                    name: '🛠️ Testing Commands', 
                    value: '`/check` - Manually check for new episodes\n`/test-notify` - Send a test notification', 
                    inline: false 
                },
                {
                    name: '💡 How It Works',
                    value: 'The bot checks for new episodes every 5 minutes and sends notifications to your chosen channel when episodes air!',
                    inline: false
                },
                {
                    name: '✨ Pro Tip',
                    value: 'Use autocomplete! When typing anime names in commands, the bot will suggest matching titles.',
                    inline: false
                }
            )
            .setFooter({ text: 'Happy watching! 🍿' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};