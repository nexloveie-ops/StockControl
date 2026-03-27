const https = require('https');
const fs = require('fs');
const path = require('path');

const fontDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir);

// 下载 NotoSansSC TTF (Regular)
const url = 'https://cdn.jsdelivr.net/npm/noto-sans-sc@0.0.1/fonts/NotoSansSC-Regular.otf';
const outFile = path.join(fontDir, 'NotoSansSC-Regular.otf');

console.log('下载字体中...');
const file = fs.createWriteStream(outFile);

https.get(url, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    https.get(response.headers.location, (r2) => {
      r2.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(outFile).size;
        console.log('✅ 字体下载完成, 大小:', size, 'bytes');
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      const size = fs.statSync(outFile).size;
      console.log('✅ 字体下载完成, 大小:', size, 'bytes');
    });
  }
}).on('error', (err) => {
  console.error('❌ 下载失败:', err.message);
});
