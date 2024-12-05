//Custom discord bot to ask a random question of the week.
//To view status in terminal: pm2 status
//To view logs in terminal: pm2 logs qotw

require('dotenv').config();
const express = require("express");
const app = express();
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { scheduleJob } = require('node-schedule');
const fs = require('fs');
const path = require('path');

// Path to questionData.json
const filePath = path.join(__dirname, './data/questionData.json');

// Log the content when the bot starts
fs.readFile(filePath, 'utf-8', (err, data) => {
  if (err) {
    console.error('Error reading questionData.json:', err);
  } else {
    console.log('Question Data:', JSON.parse(data));
  }
});


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Array of 52 questions
const originalQuestions = [
    "If you could live in any video game universe for a week, where would you go and why?",
    "What’s a game that surprised you the most — either way better or worse than expected?",
    "If you could only play one genre of games for the rest of your life, what would it be?",
    "Who is the most memorable boss you’ve ever defeated, and what made them so unforgettable?",
    "What’s one game you think everyone in the server should try at least once?",
    "Which game do you think has the most beautiful graphics or scenery?",
    "What was the first game that made you fall in love with gaming?",
    "If you could change one thing about any game, what would it be?",
    "Do you have a favorite video game soundtrack? What’s your go-to track?",
    "What character would you bring to life as your roommate — and why?",
    "What's a classic or older game you’d love to see remade or rebooted?",
    "What’s the most underrated game you've ever played?",
    "Which game world would be the most fun to explore in VR?",
    "If you could mash up two games to create a new one, what games would you choose?",
    "Which game character would you trust the least in a real-life situation?",
    "You can only keep three items from any game’s inventory for your real life – what do you choose?",
    "What’s your favorite game to play with friends, and what makes it the best for you?",
    "What’s the most annoying enemy or obstacle you’ve ever faced in a game?",
    "If you could have a power-up from any game, what would it be, and why?",
    "What’s the strangest or funniest glitch you’ve encountered in a game?",
    "What’s a gaming achievement you’re most proud of?",
    "If you could voice any game character, who would it be?",
    "What’s your most memorable multiplayer gaming moment?",
    "Which game has the best plot twist you’ve ever experienced?",
    "If a game could instantly make you fluent in another language, which one would it be?",
    "What’s your favorite gaming snack combo?",
    "If you were to start a game streaming channel, what would your theme or specialty be?",
    "Which game would you love to see turned into a movie or TV series?",
    "What’s a game that you never get tired of playing, no matter how many times you’ve played it?",
    "What’s the hardest decision you’ve had to make in a game?",
    "If you could take any item from a game into the real world, what would it be?",
    "What game do you think everyone should play at least once?",
    "What’s the funniest NPC (non-player character) interaction you’ve had?",
    "What gaming console holds the best memories for you?",
    "If you could add yourself as a character in any game, which game would it be?",
    "What’s a game you play to relax or unwind after a long day?",
    "What’s the weirdest or most interesting game you’ve ever tried?",
    "What gaming-related skill would you most like to master?",
    "If you were to organize a gaming tournament, which game would it feature?",
    "Which game character would you want as a teammate in a real-life survival situation?",
    "What’s the most impressive feat you've witnessed or done in a game?",
    "What’s a game that’s made you cry or hit you in the feels?",
    "Which game has the best community in your opinion?",
    "What’s your guilty pleasure game?",
    "What video game food would you love to try in real life?",
    "If you could change one game ending, which would it be and how would you change it?",
    "What’s the strangest video game character you’ve ever come across?",
    "What’s the best or funniest in-game nickname you’ve seen someone use?",
    "If you could learn any skill instantly from a game, what would it be?",
    "What game would you choose if you could compete professionally?",
    "What’s the scariest game you’ve ever played?",
    "Which game would you recommend to someone brand new to gaming?",
    "If you could bring one aspect of gaming into the real world, what would it be?",
    "What was the most confusing or challenging puzzle you’ve solved in a game?",
    "What’s your favorite in-game weapon and why?",
    "What game character would you want to go on an adventure with?",
    "What’s your favorite Easter egg or secret in a game?",
    "What’s a game that surprised you with how much you ended up loving it?",
    "If you could bring back a discontinued gaming series, which would it be?",
    "What game has the best replay value for you?",
    "If you could play only one game for the next year, what would it be?",
    "What’s the most iconic gaming quote you remember?",
    "Which game has the best character customization options?",
    "What’s one game you wish you could experience again for the first time?",
    "If you could build your dream gaming setup, what would it look like?",
    "What’s a game you’ve recommended to others the most?",
    "What’s the most unique game mechanic you’ve seen?",
    "Which game had the best character development or story arc?",
    "What’s a game you think is deserving of more hype?",
    "If you could host a game night with any game character, who would you invite?",
    "What’s the longest time you’ve spent playing a game in one sitting?",
    "What’s your favorite collectible item from any game?"
  ];

let questionData = {
    shuffledQuestions: [],
    currentQuestion: null,
};
const questionDataPath = './questionData.json';

// Function to shuffle an array
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

// Load or initialize question data
const loadQuestionData = () => {
    if (fs.existsSync(questionDataPath)) {
        questionData = JSON.parse(fs.readFileSync(questionDataPath, 'utf8'));
    } else {
        resetQuestions();
    }
};

// Function to reset questions (reshuffle the list)
const resetQuestions = () => {
    questionData.shuffledQuestions = [...originalQuestions];
    shuffleArray(questionData.shuffledQuestions);
    selectNewQuestion();
};

// Function to select a new question each week
const selectNewQuestion = () => {
    if (questionData.shuffledQuestions.length === 0) {
        resetQuestions();  // Reshuffle if out of questions
    }
    questionData.currentQuestion = questionData.shuffledQuestions.pop();  // Get the next question
    fs.writeFileSync(questionDataPath, JSON.stringify(questionData));
};

const cron = require('node-cron');

// Schedule the job to run every Monday at midnight in UTC
cron.schedule('0 0 * * 1', selectNewQuestion, {
  timezone: 'UTC' 
});


// Load the initial question for the week
loadQuestionData();
if (!questionData.currentQuestion) {
    selectNewQuestion();
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

