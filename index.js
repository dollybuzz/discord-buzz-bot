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
        // Step 1: Retrieve the currently active question
        const [currentQuestionRows] = await connection.query(
          'SELECT id, question FROM qotw_questions WHERE is_active = TRUE LIMIT 1;'
        );
      
        let currentQuestion = null;
      
        if (currentQuestionRows.length > 0) {
          currentQuestion = currentQuestionRows[0]; // Store the active question's details in a variable
          console.log('Current active question:', currentQuestion);
        } else {
          console.log('No active question found.');
        }
      
        // Step 2: Deactivate the current question
        await connection.query(
          'UPDATE questions SET is_active = FALSE WHERE is_active = TRUE;'
        );
      
        // Step 3: Calculate the current week of the year
        const currentWeekQuery = `
          SET @current_week = WEEK(CURDATE(), 1);
          SET @next_week = (@current_week % 52) + 1;
        `;
        await connection.query(currentWeekQuery);
      
        // Step 4: Reset questions if all have been asked
        const resetQuery = `
          IF NOT EXISTS (
            SELECT 1
            FROM qotw_questions
            WHERE last_asked_week IS NULL OR last_asked_week < @current_week
          ) THEN
            UPDATE qotw_questions SET last_asked_week = NULL;
          END IF;
        `;
        await connection.query(resetQuery);
      
        // Step 5: Activate the next available question
        await connection.query(`
          UPDATE qotw_questions
          SET is_active = TRUE, last_asked_week = @current_week
          WHERE last_asked_week IS NULL OR last_asked_week < @current_week
          ORDER BY id ASC
          LIMIT 1;
        `);
      
        // Step 6: Retrieve the new active question
        const [newActiveQuestionRows] = await connection.query(
          'SELECT id, question FROM qotw_questions WHERE is_active = TRUE LIMIT 1;'
        );
      
        if (newActiveQuestionRows.length > 0) {
          const newActiveQuestion = newActiveQuestionRows[0];
          console.log('New active question:', newActiveQuestion);
        } else {
          console.log('No new question activated.');
        }
      } catch (error) {
        console.error('Error during question rotation:', error);
      } finally {
        connection.end();
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

    await interaction.reply(`Question of the Week: ${questionData.currentQuestion}`);
});

client.login(process.env.DISCORD_TOKEN);

//server listener
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Running Express Server...");
});

