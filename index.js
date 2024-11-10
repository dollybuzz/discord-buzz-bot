//Custom discord bot to ask a random question of the week.
//To view status in terminal: pm2 status
//To view logs in terminal: pm2 logs qotw

require('dotenv').config();
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
  "If you could live in the world of any video game, which one would it be?",
  "What's your favorite gaming genre?",
  "Do you prefer single-player or multiplayer games?",
  "Who is your favorite video game character of all time?",
  "What's a game you think everyone should play at least once?",
  "Which game has the best story or plot twist?",
  "If you could have any gaming superpower in real life, what would it be?",
  "What's the most difficult game you've ever beaten?",
  "What's the most underrated game you’ve played?",
  "Do you have a favorite gaming soundtrack?",
  "What's a game that you never finished but wish you had?",
  "What was the first gaming console you owned?",
  "Have you ever made a friend through online gaming?",
  "What's the most memorable gaming moment you’ve experienced?",
  "Do you prefer console, PC, or mobile gaming?",
  "What's your opinion on VR gaming?",
  "What's the longest gaming session you've ever had?",
  "Which game has the best graphics you've seen?",
  "What's the most surprising game you've ever enjoyed?",
  "Have you ever played an indie game that blew your mind?",
  "What’s the worst game you’ve ever played?",
  "If you could erase your memory of one game to play it again fresh, which game would it be?",
  "What's your favorite weapon or ability in a game?",
  "Do you prefer playing as a hero or a villain in games?",
  "What's your go-to snack while gaming?",
  "If you could cosplay any game character, who would it be?",
  "Have you ever cried or gotten emotional over a video game?",
  "What’s a gaming sequel you’re dying to see made?",
  "What game would you recommend to someone new to gaming?",
  "What's the scariest horror game you've played?",
  "What's a game you love but most people seem to hate?",
  "What's a gaming trend that you wish would go away?",
  "Do you have a favorite game developer or studio?",
  "What's the most expensive game you've ever bought?",
  "What's a feature in a game that you wish every game had?",
  "Do you prefer games with voice acting or silent protagonists?",
  "What's a game you've replayed multiple times?",
  "What video game has had the biggest impact on you?",
  "What’s your favorite game that came out this year?",
  "Do you prefer open-world games or more linear experiences?",
  "What's a game that you could play forever without getting bored?",
  "Do you follow any gaming YouTubers or streamers? Who?",
  "What’s a game you love but never expected to enjoy?",
  "If you could only play one game genre for the rest of your life, what would it be?",
  "Do you like to 100% complete games, or are you more of a casual player?",
  "Have you ever been part of an online gaming community?",
  "What's your favorite co-op game to play with friends?",
  "What's a game that you think is worth every penny?",
  "What’s the best gaming Easter egg you've ever found?",
  "What's a classic game that you think everyone should experience?",
  "Which upcoming game are you most excited about?",
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

