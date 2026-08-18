const fs = require('fs');
const path = require('path');

const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Png, 'base64');

const targetPath = path.join(__dirname, '../public/favicon.ico');
fs.writeFileSync(targetPath, buffer);

console.log('✅ favicon.ico creado con éxito en', targetPath);
