const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("No se encontró el token del bot.");
}

const bot = new Telegraf(BOT_TOKEN);

function extraerURLSpotify(texto) {
  const match = texto.match(/https?:\/\/(open\.spotify\.com\/track\/[a-zA-Z0-9]+)/);
  return match ? match[0] : null;
}

bot.on('text', async (ctx) => {
  const url = extraerURLSpotify(ctx.message.text);
  if (!url) return;

  await ctx.reply("Procesando descarga ⌛");

  try {
    const response = await axios.post('https://api.cobalt.tools/api/json', {
      url: url,
      downloadMode: 'audio',
      audioFormat: 'mp3'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = response.data;

    if (data && data.url) {
      await ctx.replyWithAudio(
        { url: data.url },
        { title: data.filename || "Canción" }
      );
    } else if (data && data.status === 'picker' && data.picker && data.picker.length > 0) {
      await ctx.replyWithAudio({ url: data.picker[0].url });
    } else {
      ctx.reply("No se pudo procesar este enlace. Intenta con otra canción.");
    }

  } catch (error) {
    console.error("Error en Cobalt:", error?.response?.data || error.message);
    ctx.reply("Error al descargar. Asegúrate de que la canción esté disponible.");
  }
});

// Servidor express para Render
const app = express();
app.get('/', (_req, res) => res.send("Bot activo 24/7"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

bot.launch();
console.log("Bot iniciado correctamente");

