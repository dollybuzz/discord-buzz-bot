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

let currentQuestion = null;

(async() => {

//Create a database connection
    const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  //Get the active question
  async function getActiveQuestion(connection) {
    try {
      const [current] = await connection.query('SELECT question FROM qotw_questions WHERE is_active = TRUE');
      if (current.length > 0) {
        return current[0].question;
      } else {
        console.log('No active question found.');
        return null; 
    } 
    } catch (error) 
    {
      console.error('Error retrieving active question: ', error);
      throw error;
    }
  }

//Connect to database, handle error, close connection when done
try {
    currentQuestion = await getActiveQuestion(connection);
    //Check if today is Monday
    const today = new Date();
    if (today.getDay() !== 1 && currentQuestion !== null) {
      console.log('Today is not Monday. No rotation performed. Current question: ', currentQuestion);
      return currentQuestion;
    }
    else {
    // Calculate the current week
    const [[{ current_week }]] = await connection.query('SELECT WEEK(CURDATE(), 1) AS current_week');

    // Deactivate the current question if not the current week
    await connection.query(`UPDATE qotw_questions SET is_active = FALSE WHERE is_active = TRUE AND last_asked_week < ?
    ORDER BY id ASC
    LIMIT 1
    `, [current_week]);

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
      WHERE (last_asked_week IS NULL AND last_asked_week < ?) AND is_active = FALSE
      ORDER BY id ASC
      LIMIT 1
    `, [current_week, current_week]);

    //Return the current question
    console.log('Current question: ', currentQuestion);
    return currentQuestion;
  }
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

