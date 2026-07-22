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
  const spotifyUrl = extraerURLSpotify(ctx.message.text);
  if (!spotifyUrl) return;

  await ctx.reply("Procesando canción ⌛");

  try {
    // 1. Obtener datos de Spotify mediante oEmbed
    const oembedRes = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`);
    const titulo = oembedRes.data.title || "Canción";
    const artista = oembedRes.data.author_name || "Artista";
    const busqueda = `${artista} ${titulo}`;

    await ctx.reply(`Buscando audio para: **${busqueda}**...`, { parse_mode: 'Markdown' });

    // 2. Buscar y obtener MP3 a través de una API de YouTube alternativa y estable
    const searchApi = `https://api.vreden.web.id/api/ytmp3?query=${encodeURIComponent(busqueda)}`;
    const downloadRes = await axios.get(searchApi);

    if (downloadRes.data && downloadRes.data.result && downloadRes.data.result.download) {
      const audioUrl = downloadRes.data.result.download.url || downloadRes.data.result.download;
      
      await ctx.replyWithAudio(
        { url: audioUrl },
        { title: titulo, performer: artista }
      );
    } else {
      ctx.reply("No se pudo obtener el audio. Intenta con otra canción.");
    }

  } catch (error) {
    console.error("Error en proceso:", error?.response?.data || error.message);
    ctx.reply("Hubo un error al descargar. Intenta nuevamente en unos instantes.");
  }
});

// Servidor Web para Render
const app = express();
app.get('/', (_req, res) => res.send("Bot activo 24/7"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));

bot.launch();
console.log("Bot iniciado correctamente");

