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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
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

// 🟡 Aigis quote list
const aigisQuotes = [
  "Hello Everyone. <a:Aigis_Dance:1369907501675581510>",
  "All members are advised to adhere to the rules <:Cat:1369866557617995818>",
  "that evil twink will pay",
  "<:aigisling:1370453026434711563> I quite enjoy this emoticon, I find this depiction of me quite comical.",
  "I have scanned your actions. They require... adjustment...",
  "This behavior is not... appropriate. Please reconsider....",
  "<:Cat:1369866557617995818> I present vast fondness for this kitten emoticon...",
  "<a:aigisdance:1372678211401678938>",
  "Everyone here expresses hatred towards Ryoji correct? Running a check for accuracy.. and if any elimination is necessary.."
];

// 🟡 Function to randomly send Aigis quotes
function startAigisSpeech(channelId) {
  const sendQuote = () => {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.error("Aigis quote channel not found.");
      return;
    }
    const quote = aigisQuotes[Math.floor(Math.random() * aigisQuotes.length)];
    channel.send(`${quote}`);
  };
  sendQuote(); // Send immediately on startup
  setInterval(sendQuote, 1000 * 60 * 50); // Every idk minutes
}

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Shows bot ping'),
  // ... [rest of your commands remain unchanged]
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  manager.init(client.user.id);
  client.user.setActivity('Memories of You', { type: ActivityType.Listening });

  try {
    console.log('Refreshing slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }

  // 🟡 Start Aigis quote messages
  startAigisSpeech('1369677117431742525');
});

// 🟢 Everything else (handlers, events, interactions, etc.) remains unchanged below this point
client.on('raw', (data) => manager.updateVoiceState(data));

client.on('messageCreate', (message) => {
  if (message.author.bot) return; // Ignore other bots
  if (!message.guild) return;     // Ignore DMs

  const content = message.content.toLowerCase();

  if (content.includes('aigis')) {
    message.channel.send('Hi There. <:Cat:1369866557617995818>');
  }
});

function createMusicEmbed(track) {
  return new EmbedBuilder()
    .setTitle('🎵 Now Playing')
    .setDescription(`[${track.title}](${track.uri})`)
    .addFields(
      { name: '👤 Artist', value: track.author, inline: true },
      { name: '⏱️ Duration', value: formatDuration(track.duration), inline: true }
    )
    .setThumbnail(track.thumbnail)
    .setColor('#FF0000');
}

function formatDuration(duration) {
  const minutes = Math.floor(duration / 60000);
  const seconds = ((duration % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}

function createControlButtons() {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('pause')
          .setLabel('Pause/Resume')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('skip')
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('loop')
          .setLabel('Loop')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('queue')
          .setLabel('Queue')
          .setStyle(ButtonStyle.Secondary)
      )
  ];
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

  if (interaction.isButton()) {
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: 'You need to join a voice channel to use my bluetooth function <:AigisStare:1369904639679529021>', ephemeral: true });
    }
    const player = manager.players.get(interaction.guild.id);
    if (!player) return;

    const currentTrack = player.queue.current;
    if (!currentTrack) return;

    if (currentTrack.requester.id !== interaction.user.id) {
      return interaction.reply({ content: 'Only the person who requested this song can use these buttons! <:AigisStare:1369904639679529021>', ephemeral: true });
    }

    switch (interaction.customId) {
      case 'pause':
        player.pause(!player.paused);
        await interaction.reply({ content: player.paused ? 'Paused' : 'Resumed', ephemeral: true });
        break;
      case 'skip':
        const skipMessage = player.get('currentMessage');
        if (skipMessage && skipMessage.editable) {
          const disabledButtons = skipMessage.components[0].components.map(button => {
            return ButtonBuilder.from(button).setDisabled(true);
          });
          skipMessage.edit({ components: [new ActionRowBuilder().addComponents(disabledButtons)] });
        }
        if (player.queue.length === 0) {
          const queueEndEmbed = new EmbedBuilder()
            .setDescription('Queue has ended!')
            .setColor('#FF0000')
            .setTimestamp();
          await interaction.channel.send({ embeds: [queueEndEmbed] });
          player.set('manualStop', true);
        }
        player.stop();
        await interaction.reply({ content: 'Skipped', ephemeral: true });
        break;
      case 'stop':
        const stopMessage = player.get('currentMessage');
        if (stopMessage && stopMessage.editable) {
          const disabledButtons = stopMessage.components[0].components.map(button => {
            return ButtonBuilder.from(button).setDisabled(true);
          });
          stopMessage.edit({ components: [new ActionRowBuilder().addComponents(disabledButtons)] });
        }
        player.set('manualStop', true);
        const stopEmbed = new EmbedBuilder()
          .setDescription('Queue has ended!! I Hope that was optimal for you <:Cat:1369866557617995818>')
          .setColor('#FF0000')
          .setTimestamp();
        await interaction.channel.send({ embeds: [stopEmbed] });
        player.destroy();
        await interaction.reply({ content: 'Stopped', ephemeral: true });
        break;
      case 'loop':
        player.setQueueRepeat(!player.queueRepeat);
        await interaction.reply({ content: `Loop: ${player.queueRepeat ? 'Enabled' : 'Disabled'}`, ephemeral: true });
        break;
      case 'queue':
        const queue = player.queue;
        const currentTrack = player.queue.current;
        let description = queue.length > 0 ? queue.map((track, i) => 
          `${i + 1}. [${track.title}](${track.uri})`).join('\n') : 'There are No songs in queue... as they say?';

        if (currentTrack) description = `**Now Playing:**\n[${currentTrack.title}](${currentTrack.uri})\n\n**Queue:**\n${description}`;

        const embed = new EmbedBuilder()
          .setTitle('Queue')
          .setDescription(description)
          .setColor('#FF0000')
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
    }
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'filter') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return;

    const filter = interaction.values[0];
    player.node.send({
      op: 'filters',
      guildId: interaction.guild.id,
      [filter]: true
    });

    const embed = new EmbedBuilder()
      .setDescription(`🎵 Applied filter: ${filters[filter]}`)
      .setColor('#FF0000')
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  const { commandName, options } = interaction;

  if (commandName === 'play') {
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: 'Join a voice channel first! <:AigisStare:1369904639679529021>', ephemeral: true });
    }

    const player = manager.create({
      guild: interaction.guild.id,
      voiceChannel: interaction.member.voice.channel.id,
      textChannel: interaction.channel.id,
      selfDeafen: true
    });

    if (!player.twentyFourSeven) player.twentyFourSeven = false;

    player.connect();

    const query = options.getString('query');
    const res = await manager.search(query, interaction.user);

    switch (res.loadType) {
      case 'TRACK_LOADED':
      case 'SEARCH_RESULT':
        if (!res.tracks || res.tracks.length === 0) {
          await interaction.reply({ content: 'No results found! Please try a different search term..', ephemeral: true });
          return;
        }
        const track = res.tracks[0];
        player.queue.add(track);
        const embed = new EmbedBuilder()
          .setDescription(`Added [${track.title}](${track.uri}) to the queue <a:Aigis_Dance:1369907501675581510>`)
          .setColor('#FF0000')
          .setFooter({ 
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        if (!player.playing && !player.paused) player.play();
        break;
      case 'NO_MATCHES':
        await interaction.reply({ content: 'No results found! Please try a different search term..', ephemeral: true });
        break;
      case 'LOAD_FAILED':
        await interaction.reply({ content: 'My Bluetooth doesnt appear to be working for that link.. Please try again or use a different link.', ephemeral: true });
        break;
    }
  }

  if (commandName === 'pause') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    player.pause(true);
    const embed = new EmbedBuilder()
      .setDescription('⏸️ Paused')
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'resume') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    player.pause(false);
    const embed = new EmbedBuilder()
      .setDescription('▶️ Resumed')
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'skip') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    player.stop();
    const embed = new EmbedBuilder()
      .setDescription('⏭️ Skipped')
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'queue') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    const queue = player.queue;
    const currentTrack = player.queue.current;
    let description = queue.length > 0 ? queue.map((track, i) => 
      `${i + 1}. [${track.title}](${track.uri})`).join('\n') : 'No songs in queue';

    if (currentTrack) description = `**Now Playing:**\n[${currentTrack.title}](${currentTrack.uri})\n\n**Queue:**\n${description} <a:aigisvibe:1369905323199959111>`;

    const embed = new EmbedBuilder()
      .setTitle('🎵 Queue')
      .setDescription(description)
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'nowplaying') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    const track = player.queue.current;
    if (!track) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    const embed = createMusicEmbed(track);
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'shuffle') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    player.queue.shuffle();
    const embed = new EmbedBuilder()
      .setDescription('🔀 Shuffled the queue.. as they say <:Cat:1369866557617995818>')
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'loop') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    const mode = options.getString('mode');
    switch (mode) {
      case 'off':
        player.setQueueRepeat(false);
        player.setTrackRepeat(false);
        break;
      case 'track':
        player.setQueueRepeat(false);
        player.setTrackRepeat(true);
        break;
      case 'queue':
        player.setQueueRepeat(true);
        player.setTrackRepeat(false);
        break;
    }

    const embed = new EmbedBuilder()
      .setDescription(`🔄 Loop mode set to: ${mode}`)
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'remove') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    const pos = options.getInteger('position') - 1;
    if (pos < 0 || pos >= player.queue.length) {
      return interaction.reply({ content: 'Invalid position!', ephemeral: true });
    }

    const removed = player.queue.remove(pos);
    const embed = new EmbedBuilder()
      .setDescription(`❌ Removed [${removed.title}](${removed.uri})`)
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'move') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    const from = options.getInteger('from') - 1;
    const to = options.getInteger('to') - 1;

    if (from < 0 || from >= player.queue.length || to < 0 || to >= player.queue.length) {
      return interaction.reply({ content: 'Invalid position!', ephemeral: true });
    }

    const track = player.queue[from];
    player.queue.remove(from);
    player.queue.add(track, to);

    const embed = new EmbedBuilder()
      .setDescription(`📦 Moved [${track.title}](${track.uri}) to position ${to + 1}`)
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'clearqueue') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    player.queue.clear();
    const embed = new EmbedBuilder()
      .setDescription('🗑️ Cleared the queue')
      .setColor('#FF0000')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'stop') {
    const player = manager.players.get(interaction.guild.id);
    if (player) {
      player.set('manualStop', true);
      const stopMessage = player.get('currentMessage');
      if (stopMessage && stopMessage.editable) {
        const disabledButtons = stopMessage.components[0].components.map(button => {
          return ButtonBuilder.from(button).setDisabled(true);
        });
        stopMessage.edit({ components: [new ActionRowBuilder().addComponents(disabledButtons)] });
      }
      const stopEmbed = new EmbedBuilder()
        .setDescription('Queue has ended!')
        .setColor('#FF0000')
        .setTimestamp();
      await interaction.channel.send({ embeds: [stopEmbed] });
      player.destroy();
      await interaction.reply({ content: 'I comprehend..', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Not playing anything!', ephemeral: true });
    }
  }

  if (commandName === 'volume') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'Not playing anything!', ephemeral: true });

    const volume = options.getInteger('level');
    if (volume < 0 || volume > 100) {
      return interaction.reply({ content: 'Volume must be between 0 and 100!! It is not optimal to exceed these values <:AigisStare:1369904639679529021>', ephemeral: true });
    }

    player.setVolume(volume);
    await interaction.reply(`🔊 Volume set to ${volume}%`);
  }

  if (commandName === '247') {
    const player = manager.players.get(interaction.guild.id);
    if (!player) return interaction.reply({ content: 'No music is playing!', ephemeral: true });

    player.twentyFourSeven = !player.twentyFourSeven;
    const embed = new EmbedBuilder()
      .setDescription(`🎵 24/7 mode is now ${player.twentyFourSeven ? 'enabled' : 'disabled'}`)
      .setColor('#FF0000')
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle(`🎵 ${client.user.username} Commands`)
      .setDescription('Aigis Awesome Bluetooth Mode <:Cat:1369866557617995818>')
      .addFields(
        { name: '🎵 Music Controls', value: 
          '`/play` - Play a song from name/URL\n' +
          '`/pause` - ⏸️ Pause current playback\n' +
          '`/resume` - ▶️ Resume playback\n' +
          '`/stop` - ⏹️ Stop and disconnect\n' +
          '`/skip` - ⏭️ Skip to next song\n' +
          '`/volume` - 🔊 Adjust volume (0-100)'
        },
        { name: '📑 Queue Management', value: 
          '`/queue` - 📜 View current queue\n' +
          '`/nowplaying` - 🎵 Show current track\n' +
          '`/shuffle` - 🔀 Shuffle the queue\n' +
          '`/loop` - 🔁 Set loop mode\n' +
          '`/remove` - ❌ Remove a song\n' +
          '`/move` - ↕️ Move track position'
        },
        { name: '⚙️ Utility', value: 
          '`/247` - 🔄 Toggle 24/7 mode\n' +
          '`/ping` - 📡 Check latency\n' +
          '`/stats` - 📊 View statistics\n' +
          '`/invite` - 📨 Invite bot to server\n' +
          '`/sees` - 💬 Join the server im from <:Cat:1369866557617995818> !!'
        }
      )
      .setColor('#FF0000')
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ 
        text: `Made By p3femc • Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    return await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'sees') {
    const embed = new EmbedBuilder()
      .setTitle('📨 Invite Me')
      .setDescription(`[Click here to invite me to your server](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)`)
      .setColor('#FF0000')
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'ping') {
    const ping = Math.round(client.ws.ping);
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong! as they say.')
      .setDescription(`WebSocket Ping: ${ping}ms`)
      .setColor('#FF0000')
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }



  if (commandName === 'stats') {
    const uptime = Math.round(client.uptime / 1000);
    const seconds = uptime % 60;
    const minutes = Math.floor((uptime % 3600) / 60);
    const hours = Math.floor((uptime % 86400) / 3600);
    const days = Math.floor(uptime / 86400);

    const embed = new EmbedBuilder()
      .setTitle('📊 Bot Statistics')
      .addFields(
        { name: '⌚ Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: '🎵 Active Players', value: `${manager.players.size}`, inline: true },
        { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
        { name: '📡 Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true }
      )
      .setColor('#FF0000')
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'sees') {
    const embed = new EmbedBuilder()
      .setTitle('💬 Original Server')
      .setDescription(`[Click here to join SEES](${process.env.SUPPORT_SERVER})`)
      .setColor('#FF0000')
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
});

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
