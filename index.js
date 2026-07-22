const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("No se encontró el token del bot.");
}

const bot = new Telegraf(BOT_TOKEN);

// Extrae el ID único del tema de Spotify
function extraerIDSpotify(texto) {
  const match = texto.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

bot.on('text', async (ctx) => {
  const trackId = extraerIDSpotify(ctx.message.text);
  if (!trackId) return;

  await ctx.reply("Procesando descarga ⌛");

  try {
    // Petición a la API de SpotifyDown
    const response = await axios.get(`https://api.spotifydown.com/download/${trackId}`, {
      headers: {
        'Origin': 'https://spotifydown.com',
        'Referer': 'https://spotifydown.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;

    if (data && data.success && data.link) {
      await ctx.replyWithAudio(
        { url: data.link },
        { 
          title: data.title || "Canción", 
          performer: data.artists || "Artista" 
        }
      );
    } else {
      ctx.reply("No se pudo obtener el audio de esta canción. Intenta con otra.");
    }

  } catch (error) {
    console.error("Error en SpotifyDown:", error?.response?.data || error.message);
    ctx.reply("Hubo un problema al procesar la canción. Reintenta en unos instantes.");
  }
});

// Servidor express para mantener activo el bot en Render
const app = express();
app.get('/', (_req, res) => res.send("Bot activo 24/7"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

bot.launch();
console.log("Bot iniciado correctamente");
