const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const YTDLP_PATH = process.env.YTDLP_PATH || (process.platform === 'win32' ? path.join(__dirname, 'yt-dlp.exe') : 'yt-dlp');
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

function getCookieArgs() {
  if (fs.existsSync(COOKIES_PATH)) {
    return ['--cookies', COOKIES_PATH];
  }
  return [];
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Helper sanitize URL (bersihkan parameter playlist/tracking agar tidak error)
function sanitizeUrl(inputUrl) {
  if (!inputUrl) return '';
  let str = inputUrl.trim();
  try {
    const u = new URL(str);
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      const vid = u.pathname.replace(/^\//, '').split('?')[0];
      if (vid) return `https://www.youtube.com/watch?v=${vid}`;
    }
  } catch (e) {}
  return str;
}

// Helper sanitize filename for iOS Safari / Windows
function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'donat_file';
}

// Format duration seconds to mm:ss
function formatDuration(sec) {
  if (!sec) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 1. Endpoint: Ambil Info Video / Audio
app.get('/api/info', (req, res) => {
  const targetUrl = sanitizeUrl(req.query.url);
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL harus diisi' });
  }

  // Jalankan yt-dlp untuk dump JSON metadata
  const infoArgs = ['--dump-single-json', '--no-playlist', ...getCookieArgs(), targetUrl];
  execFile(YTDLP_PATH, infoArgs, { maxBuffer: 1024 * 1024 * 15 }, (err, stdout, stderr) => {
    if (err) {
      console.error('yt-dlp info error:', stderr);
      return res.status(500).json({ error: 'Gagal mengambil informasi link. Pastikan link publik dan benar.' });
    }

    try {
      const data = JSON.parse(stdout);
      
      // Deteksi platform
      let platform = 'Web';
      let host = data.extractor_key || '';
      if (/youtube/i.test(host)) platform = 'YouTube';
      else if (/tiktok/i.test(host)) platform = 'TikTok';
      else if (/instagram/i.test(host)) platform = 'Instagram';

      res.json({
        id: data.id,
        title: data.title || 'Video Tanpa Judul',
        author: data.uploader || data.channel || platform,
        duration: formatDuration(data.duration),
        thumbnail: data.thumbnail || '',
        platform: platform
      });
    } catch (parseErr) {
      res.status(500).json({ error: 'Gagal membaca respon metadata.' });
    }
  });
});

// 2. Endpoint: Download & Stream langsung ke browser (iPhone / PC)
app.get('/api/download', (req, res) => {
  const targetUrl = sanitizeUrl(req.query.url);
  const { type, quality, title } = req.query;

  if (!targetUrl) {
    return res.status(400).send('URL diperlukan');
  }

  const cleanTitle = sanitizeFilename(title || 'donat_download');
  const tempId = Date.now() + '_' + Math.floor(Math.random() * 1000);
  const tempDir = os.tmpdir();

  let args = ['--no-playlist', ...getCookieArgs()];
  let ext = 'mp4';
  let contentType = 'video/mp4';

  if (type === 'audio') {
    ext = 'mp3';
    contentType = 'audio/mpeg';
    const bitrate = quality === '320k' ? '320K' : (quality === '256k' ? '256K' : '128K');
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', bitrate);
  } else {
    // Video
    ext = 'mp4';
    contentType = 'video/mp4';
    let maxHeight = 1080;
    if (quality === '720p') maxHeight = 720;
    else if (quality === '480p') maxHeight = 480;
    else if (quality === '360p') maxHeight = 360;

    args.push('-f', `bv*[ext=mp4][height<=${maxHeight}]+ba[ext=m4a]/b[ext=mp4][height<=${maxHeight}]/bv*+ba/b`, '--merge-output-format', 'mp4');
  }

  const outputPattern = path.join(tempDir, `donat_${tempId}.%(ext)s`);
  args.push('-o', outputPattern, targetUrl);

  console.log(`[DONAT] Processing ${type} ${quality} for: ${targetUrl}`);

  // Jalankan proses download ke temporary file di server
  const proc = spawn(YTDLP_PATH, args);

  proc.stderr.on('data', (d) => {
    // Logging progress bila perlu
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      console.error('[DONAT] Error during yt-dlp execution code:', code);
      if (!res.headersSent) {
        return res.status(500).send('Gagal mengonversi file. Silakan coba link lain.');
      }
      return;
    }

    // Temukan file output
    const expectedFile = path.join(tempDir, `donat_${tempId}.${ext}`);
    
    // Cek keberadaan file
    fs.readdir(tempDir, (err, files) => {
      const found = files.find(f => f.startsWith(`donat_${tempId}`));
      if (!found) {
        if (!res.headersSent) res.status(500).send('File hasil konversi tidak ditemukan.');
        return;
      }

      const filePath = path.join(tempDir, found);
      const actualExt = path.extname(filePath).replace('.', '') || ext;
      const downloadFilename = `[DONAT] ${cleanTitle}.${actualExt}`;

      // Set headers attachment agar iPhone Safari langsung memunculkan tombol "Download"
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`);
      res.setHeader('Content-Type', actualExt === 'mp3' ? 'audio/mpeg' : 'video/mp4');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('close', () => {
        // Hapus file sementara setelah terkirim ke iPhone/klien
        fs.unlink(filePath, () => {});
      });

      fileStream.on('error', (streamErr) => {
        console.error('Stream error:', streamErr);
        fs.unlink(filePath, () => {});
      });
    });
  });
});

// Jalankan di semua interface (0.0.0.0) agar bisa diakses iPhone dari WiFi
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 DONAT (Download and Convert) aktif!`);
  console.log(`🌐 Domain Target : donat.bangkit.io`);
  console.log(`💻 Local Akses   : http://localhost:${PORT}`);
  console.log(`📱 iPhone Akses  : http://10.15.30.93:${PORT} (1 WiFi)`);
  console.log(`=======================================================`);
});
