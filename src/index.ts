import { Telegraf } from 'telegraf';
import express from 'express';
import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("No se encontró el token del bot en las variables de entorno.");
}

const bot = new Telegraf(BOT_TOKEN);

// Expresión regular para extraer links de Spotify
function extraerURLSpotify(texto: string): string | null {
  const match = texto.match(/https?:\/\/(open\.spotify\.com\/track\/[a-zA-Z0-9]+)/);
  return match ? `https://${match[1]}` : null;
}

bot.on('text', async (ctx) => {
  const url = extraerURLSpotify(ctx.message.text);
  if (!url) return;

  await ctx.reply("Descargando... espera unos segundos ⌛");

  try {
    // Llamada a API de descarga directa de Spotify
    const apiUrl = `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl);

    if (!response.data || !response.data.result) {
      return ctx.reply("No se pudo obtener la información de la canción.");
    }

    const result = response.data.result;
    const downloadConvertUrl = `https://api.fabdl.com/spotify/mp3-convert-task/${result.gid}/${result.id}`;
    const convertResponse = await axios.get(downloadConvertUrl);

    if (!convertResponse.data || !convertResponse.data.result || !convertResponse.data.result.download_url) {
      return ctx.reply("No se pudo procesar la descarga de la canción.");
    }

    const downloadUrl = `https://api.fabdl.com/${convertResponse.data.result.download_url}`;

    // Enviar el audio directamente por Telegram a través del link
    await ctx.replyWithAudio(
      { url: downloadUrl },
      { title: result.name, performer: result.artists }
    );

  } catch (error: any) {
    console.error("Error en descarga:", error);
    ctx.reply("No se pudo descargar la canción. Intenta nuevamente.");
  }
});

// Servidor web express para Render
const app = express();
app.get('/', (_req, res) => res.send("Bot activo 24/7"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

bot.launch();
console.log("Bot iniciado");

