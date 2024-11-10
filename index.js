const {token} = require("./config.json")
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { scheduleJob } = require('node-schedule');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Array of 52 questions
const originalQuestions = [
    "What was the first video game you ever played?",
    "Which game have you spent the most hours playing?",
    // ... (remaining 50 questions)
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

// Schedule a job to select a new question every Monday at midnight
scheduleJob('0 0 * * 1', selectNewQuestion);

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

    const rest = new REST({ version: '10' }).setToken(token);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, '1299486412609163325'),
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

client.login(token);

