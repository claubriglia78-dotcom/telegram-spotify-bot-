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
    // 1. Obtener información oficial del tema vía Spotify oEmbed
    const oembedResponse = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`);
    const titulo = oembedResponse.data.title || "Canción";
    const artista = oembedResponse.data.author_name || "Artista";
    const busqueda = `${artista} - ${titulo}`;

    await ctx.reply(`Buscando audio para: **${busqueda}**...`, { parse_mode: 'Markdown' });

    // 2. Descargar el audio usando API de búsqueda y descarga directa
    const downloadApiUrl = `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(spotifyUrl)}`;
    const res = await axios.get(downloadApiUrl);

    if (res.data && res.data.result) {
      const gid = res.data.result.gid;
      const id = res.data.result.id;
      const convertUrl = `https://api.fabdl.com/spotify/mp3-convert-task/${gid}/${id}`;
      
      const convertRes = await axios.get(convertUrl);
      if (convertRes.data && convertRes.data.result && convertRes.data.result.download_url) {
        const fileUrl = `https://api.fabdl.com/${convertRes.data.result.download_url}`;
        
        return await ctx.replyWithAudio(
          { url: fileUrl },
          { title: titulo, performer: artista }
        );
      }
    }

    // Método de respaldo si el servidor principal requiere espera
    ctx.reply("No se pudo obtener el archivo de audio directo. Intenta con otro enlace.");

  } catch (error) {
    console.error("Error al procesar:", error?.response?.data || error.message);
    ctx.reply("Ocurrió un error al procesar el enlace. Verifica que la canción exista.");
  }
});

// Servidor Web para mantener el servicio activo en Render
const app = express();
app.get('/', (_req, res) => res.send("Bot activo 24/7"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));

bot.launch();
console.log("Bot iniciado correctamente");
