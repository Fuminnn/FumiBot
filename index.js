import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { loadCommands } from './utils/commandLoader.js';
import { startEpisodeChecker, checkForNewEpisodes } from './utils/episodeChecker.js';
import { anilist } from './services/anilist.js';
import { db } from './config/database.js';

dotenv.config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Load commands
const commands = await loadCommands();
client.commands = commands;

// Register slash commands
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        
        const commandsData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsData },
        );

        console.log(`✅ Successfully reloaded ${commandsData.length} application (/) commands.`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    
    await registerCommands();
    startEpisodeChecker(client);
});

// Handle autocomplete interactions
client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'anime') {
            const searchTerm = focusedOption.value.toLowerCase();
            
            // Check which command is being used
            if (interaction.commandName === 'remove') {
                // For /remove - show only watchlist anime
                try {
                    const watchlist = await db.getUserWatchlist(interaction.user.id);
                    
                    if (!watchlist || watchlist.length === 0) {
                        return interaction.respond([
                            { name: '❌ Your watchlist is empty', value: '0' }
                        ]);
                    }

                    // Filter watchlist based on user input
                    const filtered = watchlist
                        .filter(anime => 
                            anime.anime_title.toLowerCase().includes(searchTerm)
                        )
                        .slice(0, 25)
                        .map(anime => ({
                            name: anime.anime_title.slice(0, 100),
                            value: anime.anime_id.toString()
                        }));

                    if (filtered.length === 0) {
                        return interaction.respond([
                            { name: '❌ No matching anime in your watchlist', value: '0' }
                        ]);
                    }

                    await interaction.respond(filtered);
                } catch (error) {
                    console.error('Autocomplete error for /remove:', error);
                    await interaction.respond([
                        { name: '❌ Error loading your watchlist', value: '0' }
                    ]);
                }
            } else {
                // For other commands (like /add) - search AniList
                if (searchTerm.length < 2) {
                    return interaction.respond([]);
                }

                try {
                    const results = await anilist.searchMultipleAnime(searchTerm);
                    
                    const choices = results.slice(0, 25).map(anime => ({
                        name: `${anime.title.english || anime.title.romaji} ${anime.episodes ? `(${anime.episodes} eps)` : ''}`.slice(0, 100),
                        value: anime.id.toString()
                    }));

                    await interaction.respond(choices);
                } catch (error) {
                    console.error('Autocomplete error:', error);
                    await interaction.respond([]);
                }
            }
        }
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = '❌ An error occurred while processing your command.';
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);

// Export for manual checking
export { client, checkForNewEpisodes };