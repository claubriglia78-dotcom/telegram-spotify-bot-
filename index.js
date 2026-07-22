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
    // 1. Obtener detalles de la canción
    const spotifyUrl = `https://open.spotify.com/track/${trackId}`;
    const oembedRes = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`);
    
    const titulo = oembedRes.data.title || "Canción";
    const artista = oembedRes.data.author_name || "";
    const busqueda = artista ? `${artista} - ${titulo}` : titulo;

    await ctx.reply(`Buscando: **${busqueda}**...`, { parse_mode: 'Markdown' });

    let audioUrl = null;

    // Intento 1: API SpotifyDownload
    try {
      const res1 = await axios.get(`https://api.spotifydown.com/download/${trackId}`, {
        headers: {
          'Origin': 'https://spotifydown.com',
          'Referer': 'https://spotifydown.com/'
        },
        timeout: 8000
      });
      if (res1.data && res1.data.success && res1.data.link) {
        audioUrl = res1.data.link;
      }
    } catch (e) {
      console.log("Servidor 1 no disponible, intentando servidor secundario...");
    }

    // Intento 2: API alternativa de respaldo si falló la primera
    if (!audioUrl) {
      try {
        const res2 = await axios.get(`https://api.fabdl.com/spotify/get?url=${encodeURIComponent(spotifyUrl)}`, {
          timeout: 8000
        });
        if (res2.data && res2.data.result) {
          const { gid, id } = res2.data.result;
          const convertRes = await axios.get(`https://api.fabdl.com/spotify/mp3-convert-task/${gid}/${id}`);
          if (convertRes.data && convertRes.data.result && convertRes.data.result.download_url) {
            audioUrl = `https://api.fabdl.com/${convertRes.data.result.download_url}`;
          }
        }
      } catch (e) {
        console.log("Servidor 2 falló.");
      }
    }

    // Enviar el archivo si alguno de los intentos funcionó
    if (audioUrl) {
      await ctx.replyWithAudio(
        { url: audioUrl },
        { title: titulo, performer: artista }
      );
    } else {
      ctx.reply("Los servidores de descarga están saturados en este momento. Intenta nuevamente en unos minutos.");
    }

  } catch (error) {
    console.error("Error general:", error?.message);
    ctx.reply("No se pudo obtener la información de esta canción. Revisa el enlace.");
  }
});

// Servidor Express
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
