import { Telegraf } from 'telegraf';
import express from 'express';
import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("No se encontró el token del bot en las variables de entorno.");
}

const bot = new Telegraf(BOT_TOKEN);

function extraerURLSpotify(texto: string): string | null {
  const match = texto.match(/https?:\/\/(open\.spotify\.com\/track\/[a-zA-Z0-9]+)/);
  return match ? `https://${match[1]}` : null;
}

bot.on('text', async (ctx) => {
  const url = extraerURLSpotify(ctx.message.text);
  if (!url) return;

  await ctx.reply("Descargando... espera unos segundos ⌛");

  try {
    // Usamos la API pública de Spotidown
    const res = await axios.post(
      'https://spotidown.com/api/download-track',
      { url: url },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://spotidown.com/'
        }
      }
    );

    if (res.data && res.data.file_url) {
      await ctx.replyWithAudio(
        { url: res.data.file_url },
        { 
          title: res.data.title || "Canción", 
          performer: res.data.artist || "Artista" 
        }
      );
    } else {
      // Intento con API alternativa si la primera falla
      const altRes = await axios.get(`https://api.spotifydown.com/download/${url.split('/track/')[1]}`, {
        headers: { 'Origin': 'https://spotifydown.com', 'Referer': 'https://spotifydown.com/' }
      });

      if (altRes.data && altRes.data.link) {
        await ctx.replyWithAudio({ url: altRes.data.link });
      } else {
        ctx.reply("No se pudo procesar el enlace. Intenta con otro tema.");
      }
    }

  } catch (error: any) {
    console.error("Error en descarga:", error?.response?.data || error.message);
    ctx.reply("Hubo un error al obtener la canción. Reintenta en unos instantes.");
  }
});

// Servidor express para Render
const app = express();
app.get('/', (_req, res) => res.send("Bot activo 24/7"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

bot.launch();
console.log("Bot iniciado");
