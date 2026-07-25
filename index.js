const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const STREAM_KEY = process.env.STREAM_KEY;
const VIDEO_URL = process.env.VIDEO_URL;
const RTMP_URL = 'rtmp://a.rtmp.youtube.com/live2';

async function downloadVideo() {
    const videoPath = path.join('/app', 'videos', 'video.mp4');
    const dir = path.dirname(videoPath);
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(videoPath)) {
        console.log('✅ Video already exists');
        return;
    }

    console.log('📥 Downloading video...');
    const writer = fs.createWriteStream(videoPath);
    const response = await axios({
        method: 'get',
        url: VIDEO_URL,
        responseType: 'stream',
        timeout: 300000
    });

    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

function startStream() {
    const videoPath = path.join('/app', 'videos', 'video.mp4');
    
    if (!fs.existsSync(videoPath)) {
        console.error('❌ Video not found!');
        return;
    }

    // 🔥 YEH FINAL COMMAND HAI - BLACK SCREEN FIX
    const command = `ffmpeg -re -i "${videoPath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -c:v libx264 -preset ultrafast -tune zerolatency -b:v 3000k -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 60 -c:a aac -b:a 128k -ar 44100 -movflags +faststart -rtbufsize 512k -f flv "${RTMP_URL}/${STREAM_KEY}"`;
    
    console.log('🎥 Streaming started!');
    
    const stream = exec(command);
    
    stream.stdout.on('data', (data) => console.log(`[FFmpeg] ${data}`));
    stream.stderr.on('data', (data) => console.log(`[FFmpeg] ${data}`));
    
    stream.on('close', (code) => {
        console.log(`FFmpeg exited with code ${code}`);
        if (code !== 0) {
            console.log('🔄 Restarting in 5 seconds...');
            setTimeout(startStream, 5000);
        }
    });
}

app.get('/', (req, res) => {
    res.send('🎥 YouTube 24x7 Stream is running!');
});

app.get('/health', (req, res) => {
    res.send('OK');
});

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
        await downloadVideo();
        startStream();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
});
