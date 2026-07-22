FROM node:20

# Instalar Python, ffmpeg y spotdl
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg
RUN pip3 install --upgrade pip --break-system-packages
RUN pip3 install spotdl yt-dlp --break-system-packages


WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .


CMD ["npm", "start"]
