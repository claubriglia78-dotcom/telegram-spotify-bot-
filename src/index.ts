import { Telegraf } from 'telegraf';
import express from 'express';
import ytSearch from 'yt-search';
import ytdl from '@distube/ytdl-core';
import fetch from 'node-fetch';
import spotifyUrlInfo from 'spotify-url-info';

const { getDetails } = spotifyUrlInfo(fetch);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("No se encontró el token del bot.");
}

const bot = new Telegraf(BOT_TOKEN);

function extraerURLSpotify(texto: string): string | null {
  const match = texto.match(/https?:\/\/(open\.spotify\.com\/track\/[a-zA-Z0-9]+)/);
  return match ? `https://${match[1]}` : null;
}

bot.on('text', async (ctx) => {
  const url = extraerURLSpotify(ctx.message.text);
  if (!url) return;

  await ctx.reply("Buscando y procesando la canción ⌛");

  try {
    // 1. Obtener detalles del tema desde Spotify
    const details: any = await getDetails(url);
    const titulo = details.preview?.title || "Canción";
    const artista = details.preview?.artist || "";
    const busqueda = `${titulo} ${artista} audio`;

    // 2. Buscar el video en YouTube
    const searchResult = await ytSearch(busqueda);
    const video = searchResult.videos[0];

    if (!video) {
      return ctx.reply("No se encontró el audio de esta canción.");
    }

    // 3. Obtener el enlace directo de audio de YouTube
    const info = await ytdl.getInfo(video.url);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });

    if (!format || !format.url) {
      return ctx.reply("No se pudo extraer el archivo de audio.");
    }

    // 4. Enviar el audio a Telegram
    await ctx.replyWithAudio(
      { url: format.url },
      { title: titulo, performer: artista }
    );

  } catch (error: any) {
    console.error("Error al procesar:", error);
    ctx.reply("No se pudo obtener la canción. Asegúrate de que el enlace sea válido.");
  }
});

// Servidor express para Render
const app = express();
app.get('/', (_req, res) => res.send("Bot activo 24/7"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

bot.launch();
console.log("Bot iniciado");

