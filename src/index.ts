const http = require('http');
const port = process.env.PORT || 8000;

http.createServer((req, res) => {
  res.write("Bot activo 24/7");
  res.end();
}).listen(port);
import { Telegraf } from "telegraf";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import express from "express";

const execFileAsync = promisify(execFile);
const token = process.env["TELEGRAM_BOT_TOKEN"]!;
const bot = new Telegraf(token);

function extractSpotifyUrl(text: string): string | null {
  const match = text.match(/https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/);
  return match? match[0] : null;
}

bot.on("text", async (ctx) => {
  const url = extractSpotifyUrl(ctx.message.text);
  if (!url) return ctx.reply("Envíame un link de Spotify 🎵");

  await ctx.reply("Descargando... espera 20 seg ⏳");

  const tempDir = path.join("/tmp", `spot_${Date.now()}`);
  fs.mkdirSync(tempDir);

  try {
    await execFileAsync("spotdl", ["download", url, "--output", tempDir]);
    const files = fs.readdirSync(tempDir).filter(f => f.endsWith(".mp3"));
    if (files.length === 0) return ctx.reply("No se pudo descargar");

    const filePath = path.join(tempDir, files[0]);
    await ctx.replyWithAudio({ source: filePath });
    fs.unlinkSync(filePath);
  } catch (e: any) {
    ctx.reply("Error: " + e.message);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

bot.catch((err) => console.error("Error", err));

// SERVIDOR PARA RAILWAY
const app = express();
app.get("/", (req, res) => res.send("Bot activo 24/7"));
app.listen(process.env.PORT || 3000, () => console.log("Web server ok"));

bot.launch();
console.log("Bot iniciado");
