import QRCode from 'qrcode'
import path from 'node:path'

const [, , url, outPath = 'welcome-qr.png'] = process.argv

if (!url) {
  console.error('Usage: node scripts/generate-qr.mjs <url> [outputPath]')
  console.error('Example: node scripts/generate-qr.mjs https://intake.hospital.example/welcome welcome-qr.png')
  process.exit(1)
}

await QRCode.toFile(outPath, url, { width: 800, margin: 2 })
console.log(`QR code for ${url} written to ${path.resolve(outPath)}`)
