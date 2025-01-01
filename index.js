//Custom discord bot to ask a random question of the week.
//To view status in terminal: pm2 status
//To view logs in terminal: pm2 logs qotw

require('dotenv').config();
const express = require("express");
const app = express();
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const mysql = require('mysql2/promise');
let currentQuestion;

(async() => {

//Create a database connection
    const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

//Connect to database, handle error, close connection when done
try {
    // Deactivate the current question
    await connection.query('UPDATE qotw_questions SET is_active = FALSE WHERE is_active = TRUE');

    // Calculate the current week
    const [[{ current_week }]] = await connection.query('SELECT WEEK(CURDATE(), 1) AS current_week');
    const next_week = (current_week % 52) + 1;

    // Reset last_asked_week if needed
    const [[{ remaining }]] = await connection.query(`
      SELECT COUNT(*) AS remaining
      FROM qotw_questions
      WHERE last_asked_week IS NULL OR last_asked_week < ?
    `, [current_week]);

    if (remaining === 0) {
      await connection.query('UPDATE qotw_questions SET last_asked_week = NULL');
    }

    // Activate the next question
    await connection.query(`
      UPDATE qotw_questions
      SET is_active = TRUE, last_asked_week = ?
      WHERE last_asked_week IS NULL OR last_asked_week < ?
      ORDER BY id ASC
      LIMIT 1
    `, [current_week, current_week]);

    // Retrieve the active question
    currentQuestion = await (async () => {
        const [rows] = await connection.query('SELECT question FROM qotw_questions WHERE is_active = TRUE');
        console.log('Row retrieved from DB:', rows[0]);
        return rows[0];
    })();

    console.log('Current Question: ', currentQuestion);
    
  } catch (error) {
    console.error('Error during question rotation:', error);
    throw error;
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'qotw') return;

    await interaction.reply(`Question of the Week: ${currentQuestion}`);
});

client.login(process.env.DISCORD_TOKEN);

//server listener
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Running Express Server...");
});

