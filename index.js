const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("No se encontró el token del bot.");
}

const bot = new Telegraf(BOT_TOKEN);

function extraerTrackID(texto) {
  if (!texto) return null;
  const match = texto.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

bot.on('text', async (ctx) => {
  const trackId = extraerTrackID(ctx.message.text);
  if (!trackId) return;

  await ctx.reply("Procesando canción ⌛");

  try {
    // 1. Obtener datos oficiales del tema
    const spotifyUrl = `https://open.spotify.com/track/${trackId}`;
    const oembedRes = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`);
    
    const titulo = oembedRes.data.title || "Canción";
    const artista = oembedRes.data.author_name || "";
    const busqueda = artista ? `${artista} ${titulo}` : titulo;

    await ctx.reply(`Buscando audio para: **${busqueda}**...`, { parse_mode: 'Markdown' });

    // 2. Obtener MP3 mediante API de conversión directa
    const downloadApi = `https://api.cobalt.tools/api/json`;
    
    // Probar con API alternativa ultra rápida
    const ytdlRes = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${encodeURIComponent(busqueda)}`)}`).catch(() => null);

    let audioUrl = null;

    if (ytdlRes && ytdlRes.data && ytdlRes.data.data && ytdlRes.data.data.dl) {
      audioUrl = ytdlRes.data.data.dl;
    } else {
      // Método de respaldo universal
      const fallbackRes = await axios.get(`https://ytdownloader.nvidiot.workers.dev/api/search?q=${encodeURIComponent(busqueda)}`);
      if (fallbackRes.data && fallbackRes.data[0] && fallbackRes.data[0].url) {
        const videoUrl = fallbackRes.data[0].url;
        const mp3Res = await axios.get(`https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`);
        if (mp3Res.data && mp3Res.data.result && mp3Res.data.result.download) {
          audioUrl = mp3Res.data.result.download.url || mp3Res.data.result.download;
        }
      }
    }

    if (audioUrl) {
      await ctx.replyWithAudio(
        { url: audioUrl },
        { title: titulo, performer: artista }
      );
    } else {
      ctx.reply("No se pudo obtener el archivo de audio. Intenta enviar el nombre del tema directamente.");
    }

  } catch (error) {
    console.error("Error general:", error?.message);
    ctx.reply("Ocurrió un error al procesar la descarga. Reintenta en unos instantes.");
  }
});

// Servidor Express para Render
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.get('/', (_req, res) => res.send("Bot activo 24/7"));

app.listen(PORT, async () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    bot.launch({ dropPendingUpdates: true }).catch(err => console.log("Polling error:", err.message));
  } catch (e) {
    console.log("Error webhook:", e.message);
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
