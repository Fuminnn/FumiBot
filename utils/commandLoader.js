import { Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands() {
    const commands = new Collection();
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const command = await import(`file://${filePath}`);
        
        if (command.default && 'data' in command.default && 'execute' in command.default) {
            commands.set(command.default.data.name, command.default);
        } else {
            console.log(`⚠️  The command at ${filePath} is missing required "data" or "execute" property.`);
        }
    }

    return commands;
}