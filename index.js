require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Discord Music Bot is running!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running on port ${port}`);
});

const { Manager } = require('erela.js');

const nodes = [{
  host: 'lava-v3.ajieblogs.eu.org',
  port: 80,
  password: 'https://dsc.gg/ajidevserver',
  secure: false,
}];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const manager = new Manager({
  nodes,
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
  defaultSearchPlatform: 'youtube',
  autoPlay: true,
  clientName: `${client.user?.username || 'Music Bot'}`,
  plugins: []
});

const commands = [
  // your SlashCommandBuilder commands here (play, pause, resume, etc)
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  manager.init(client.user.id);
  client.user.setActivity('Burn my Dread', { type: ActivityType.Listening });

  try {
    console.log('Refreshing slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
});

client.on('raw', (data) => manager.updateVoiceState(data));

// functions like createMusicEmbed, formatDuration, createControlButtons

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

  if (interaction.isButton()) {
    // your button handling code
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'filter') {
    // your filter select menu handling code
  }

  const { commandName, options } = interaction;

  if (commandName === 'play') {
    // handle play
  }

  if (commandName === 'pause') {
    // handle pause
  }

  if (commandName === 'resume') {
    // handle resume
  }

  if (commandName === 'skip') {
    // handle skip
  }

  if (commandName === 'queue') {
    // handle queue
  }

  if (commandName === 'nowplaying') {
    // handle now playing
  }

  if (commandName === 'shuffle') {
    // handle shuffle
  }

  if (commandName === 'loop') {
    // handle loop mode
  }

  if (commandName === 'remove') {
    // handle remove song
  }

  if (commandName === 'move') {
    // handle move song
  }

  if (commandName === 'clearqueue') {
    // handle clear queue
  }

  if (commandName === 'stop') {
    // handle stop
  }

  if (commandName === 'volume') {
    // handle volume
  }

  if (commandName === '247') {
    // handle 24/7 mode
  }

  if (commandName === 'help') {
    // handle help command
  }

  if (commandName === 'ping') {
    // handle ping
  }

  if (commandName === 'stats') {
    // handle stats
  }
}); // <<<<<<<<<<<<<<<<<<< correctly closes interactionCreate here

manager.on('nodeConnect', (node) => {
  console.log(`Node ${node.options.identifier} connected`);
});

manager.on('nodeError', (node, error) => {
  console.error(`Node ${node.options.identifier} error:`, error.message);
});

manager.on('trackStart', (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);
  if (channel) {
    const embed = createMusicEmbed(track);
    const buttons = createControlButtons();
    channel.send({ embeds: [embed], components: buttons }).then(msg => {
      player.set('currentMessage', msg);
    });
  }
});

manager.on('queueEnd', (player) => {
  if (player.get('manualStop')) return;

  const channel = client.channels.cache.get(player.textChannel);
  if (channel) {
    const embed = new EmbedBuilder()
      .setDescription('Queue has ended!')
      .setColor('#FF0000')
      .setTimestamp();
    channel.send({ embeds: [embed] });

    const message = player.get('currentMessage');
    if (message && message.editable) {
      const disabledButtons = message.components[0].components.map(button => {
        return ButtonBuilder.from(button).setDisabled(true);
      });
      message.edit({ components: [new ActionRowBuilder().addComponents(disabledButtons)] });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
