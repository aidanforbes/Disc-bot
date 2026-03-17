// Discord Channel Manager Bot
// Requires: discord.js v14
// Run: node channel_manager_bot.js

const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder, REST, Routes } = require("discord.js");

const TOKEN = "MTQ4MzU1MTcwMzQxOTcxOTk2Ng.GWvbSI.GK_0i_.fnc_5LMetyMQL5N4jwS6iNGvTBIfClfxVwP_TU";
const CLIENT_ID = "1483551703419719966";

const client = new Client({
intents: [GatewayIntentBits.Guilds],
});

const commands = [
new SlashCommandBuilder()
.setName("deletechannel")
.setDescription("Delete a specific channel with confirmation")
.addChannelOption((opt) =>
opt.setName("channel").setDescription("Channel to delete").setRequired(true)
)
.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

new SlashCommandBuilder()
.setName("clonechannel")
.setDescription("Clone a channel (copies name, type, permissions) with confirmation")
.addChannelOption((opt) =>
opt.setName("channel").setDescription("Channel to clone").setRequired(true)
)
.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

new SlashCommandBuilder()
.setName("replacechannel")
.setDescription("Delete a channel and recreate a fresh copy (clears messages)")
.addChannelOption((opt) =>
opt.setName("channel").setDescription("Channel to replace").setRequired(true)
)
.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
].map((cmd) => cmd.toJSON());

client.once("ready", async () => {
console.log(`✅ Logged in as ${client.user.tag}`);
const rest = new REST({ version: "10" }).setToken(TOKEN);
try {
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
console.log("✅ Slash commands registered globally.");
} catch (err) {
console.error("Failed to register commands:", err);
}
});

async function awaitConfirmation(interaction, message) {
const prompt = await interaction.reply({
content: `⚠️ **Confirmation required**\n${message}\n\nReact with ✅ to confirm or ❌ to cancel. *(30s timeout)*`,
fetchReply: true,
});

await prompt.react("✅");
await prompt.react("❌");

try {
const collected = await prompt.awaitReactions({
filter: (reaction, user) =>
["✅", "❌"].includes(reaction.emoji.name) && user.id === interaction.user.id,
max: 1,
time: 30_000,
errors: ["time"],
});

const choice = collected.first().emoji.name;
await prompt.delete().catch(() => {});
return choice === "✅";
} catch {
await prompt.delete().catch(() => {});
await interaction.followUp({ content: "⏰ Confirmation timed out. Action cancelled.", ephemeral: true });
return false;
}
}

client.on("interactionCreate", async (interaction) => {
if (!interaction.isChatInputCommand()) return;

const { commandName } = interaction;

const hasMod = interaction.member.roles.cache.some((r) => r.name === "Mod");
if (!hasMod) {
return interaction.reply({
content: "🚫 You need the **Mod** role to use this command.",
ephemeral: true,
});
}

if (commandName === "deletechannel") {
const channel = interaction.options.getChannel("channel");
const confirmed = await awaitConfirmation(
interaction,
`You are about to **permanently delete** <#${channel.id}> (**${channel.name}**). This cannot be undone.`
);
if (!confirmed) return interaction.followUp({ content: "❌ Cancelled. No changes made.", ephemeral: true });
try {
await channel.delete(`Deleted by ${interaction.user.tag} via /deletechannel`);
await interaction.followUp({ content: `🗑️ **${channel.name}** has been deleted.`, ephemeral: true });
} catch (err) {
await interaction.followUp({ content: `❌ Failed to delete channel: ${err.message}`, ephemeral: true });
}
}

else if (commandName === "clonechannel") {
const channel = interaction.options.getChannel("channel");
const confirmed = await awaitConfirmation(
interaction,
`You are about to **clone** <#${channel.id}> (**${channel.name}**). A new copy will be created with the same settings.`
);
if (!confirmed) return interaction.followUp({ content: "❌ Cancelled. No changes made.", ephemeral: true });
try {
const cloned = await channel.clone({ reason: `Cloned by ${interaction.user.tag} via /clonechannel` });
await interaction.followUp({ content: `✅ Cloned **${channel.name}** → <#${cloned.id}>`, ephemeral: true });
} catch (err) {
await interaction.followUp({ content: `❌ Failed to clone channel: ${err.message}`, ephemeral: true });
}
}

else if (commandName === "replacechannel") {
const channel = interaction.options.getChannel("channel");
const confirmed = await awaitConfirmation(
interaction,
`You are about to **delete and recreate** <#${channel.id}> (**${channel.name}**). All messages will be wiped.`
);
if (!confirmed) return interaction.followUp({ content: "❌ Cancelled. No changes made.", ephemeral: true });
try {
const name = channel.name;
const topic = channel.topic || undefined;
const nsfw = channel.nsfw || false;
const position = channel.position;
const parent = channel.parent || null;
const permissionOverwrites = [...channel.permissionOverwrites.cache.values()];
const type = channel.type;

await channel.delete(`Replaced by ${interaction.user.tag} via /replacechannel`);

const newChannel = await interaction.guild.channels.create({
name, type, topic, nsfw, position, parent, permissionOverwrites,
reason: `Recreated by ${interaction.user.tag} via /replacechannel`,
});

await interaction.followUp({ content: `✅ **${name}** replaced with a fresh copy: <#${newChannel.id}>`, ephemeral: true });
} catch (err) {
await interaction.followUp({ content: `❌ Failed to replace channel: ${err.message}`, ephemeral: true });
}
}
});

client.login(TOKEN);
