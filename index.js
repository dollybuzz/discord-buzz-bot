//Custom discord bot to ask a random question of the week. Intended to use with Heroku's eco dyno. Database managed on MYSQLWorkbench.

//To view logs: heroku logs --tail --app discord-buzz-bot

import 'dotenv/config';
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import mysql from 'mysql2/promise';

const isLocal = process.env.LOCAL_TESTING === 'true';

if (isLocal) {
    console.log("Running bot locally...");
} else {
    console.log("Running bot on Heroku...");
}
/* Note: Remember to stop the Heroku bot before local testing (node index.js) to prevent two active sessions and respect Discord rate limits.
Use:
  heroku ps:scale worker=0 --app discord-buzz-bot
Restart the bot when done testing locally.
Use:
  heroku ps:scale worker=1 --app discord-buzz-bot
*/

//Create the client for bot to interact with discord API
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

//Create a database connection
let connection;
async function createDbConnection() {
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log("Database connected successfully.");
  } catch (err) {
    console.error("Error connecting to database: ", err);
    process.exit(1);
  }
}

// Register the slash command
client.once('ready', async () => {
    console.log('Bot is ready!');

    const commands = [
        new SlashCommandBuilder()
            .setName('qotw')
            .setDescription('Get the question of the week'),
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }

    //Connect to database after bot is ready
    await createDbConnection();
});

//Create the interaction
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() || interaction.commandName !== 'qotw') return;

  try {
    if (connection) {
      const [result] = await connection.query('SELECT question FROM qotw_questions WHERE is_active = TRUE LIMIT 1');

      const activeQuestion = result.length > 0 ? result[0].question : null;

      if(!activeQuestion) {
        await interaction.reply({content: "Error: No question is available right now.", ephemeral: true });
      return;
      }

      await interaction.reply(`Question of the Week: ${activeQuestion}`);
      console.log(`User interacted with bot. QOTW: ${activeQuestion}`);
    
    } else {
      console.log("Error in database connection.");
      await interaction.reply({ content: "Error: Database connection is unavailable.", ephemeral: true });
    }
  } catch (error) {
    console.error("Error handling interaction: ", error);

    if (error.code === 10062) {
      console.log("Interaction expired before it could be processed.");
      return;
    }
    
    //Ensure we only reply once if failed interaction
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "An error occurred while processing your request.", ephemeral: true });
    } else {
      await interaction.followUp({ content: "An error occurred while processing your request.", ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

/*// Gracefully shut down and close the database connection
process.on('SIGINT', async () => {
  if (connection) {
    console.log('Closing database connection...');
    await connection.end();
  }
  process.exit();
});*/