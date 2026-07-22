const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("No se encontró el token del bot.");
}

const bot = new Telegraf(BOT_TOKEN);

function extraerURLSpotify(texto) {
  if (!texto) return null;
  const match = texto.match(/https?:\/\/(open\.spotify\.com\/track\/[a-zA-Z0-9]+)/);
  return match ? match[0] : null;
}

bot.on('text', async (ctx) => {
  const spotifyUrl = extraerURLSpotify(ctx.message.text);
  if (!spotifyUrl) return;

  await ctx.reply("Procesando canción ⌛");

  try {
    const oembedRes = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`);
    const titulo = oembedRes.data.title || "Canción";
    const artista = oembedRes.data.author_name || "Artista";
    const busqueda = `${artista} ${titulo}`;

    await ctx.reply(`Buscando audio para: **${busqueda}**...`, { parse_mode: 'Markdown' });

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

// Configuración de Servidor Express + Webhook para Render
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint para el Webhook de Telegram
app.use(bot.webhookCallback('/secret-path'));

app.get('/', (_req, res) => res.send("Bot activo 24/7"));

app.listen(PORT, async () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
  // Usar polling de forma segura atrapando errores para que Render no muera
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    bot.launch({ dropPendingUpdates: true }).catch(err => {
      console.log("Error controlado al iniciar Polling:", err.message);
    });
    console.log("Bot iniciado exitosamente");
  } catch (e) {
    console.log("Error al limpiar webhook:", e.message);
  }
});

// Manejo seguro de apagado
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
