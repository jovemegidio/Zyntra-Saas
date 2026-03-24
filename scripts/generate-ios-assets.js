/**
 * Script para gerar ícones e splash screens para iOS
 * Usa o ícone existente como base para gerar todos os tamanhos necessários
 * 
 * Requisitos: npm install sharp
 * Uso: node scripts/generate-ios-assets.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_ICON = path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.png');
const IOS_ASSETS_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets');

// Tamanhos de ícone necessários para iOS
const ICON_SIZES = [
  { size: 20, scales: [1, 2, 3], idiom: 'iphone' },
  { size: 29, scales: [1, 2, 3], idiom: 'iphone' },
  { size: 40, scales: [2, 3], idiom: 'iphone' },
  { size: 60, scales: [2, 3], idiom: 'iphone' },
  { size: 20, scales: [1, 2], idiom: 'ipad' },
  { size: 29, scales: [1, 2], idiom: 'ipad' },
  { size: 40, scales: [1, 2], idiom: 'ipad' },
  { size: 76, scales: [1, 2], idiom: 'ipad' },
  { size: 83.5, scales: [2], idiom: 'ipad' },
  { size: 1024, scales: [1], idiom: 'ios-marketing' },
];

// Tamanhos de splash screen (Launch Screen / Storyboard)
const SPLASH_SIZES = [
  { width: 1170, height: 2532, name: 'splash-1170x2532' },  // iPhone 13/14
  { width: 1284, height: 2778, name: 'splash-1284x2778' },  // iPhone 13/14 Pro Max
  { width: 1179, height: 2556, name: 'splash-1179x2556' },  // iPhone 14 Pro
  { width: 1290, height: 2796, name: 'splash-1290x2796' },  // iPhone 14 Pro Max  
  { width: 1206, height: 2622, name: 'splash-1206x2622' },  // iPhone 15
  { width: 1320, height: 2868, name: 'splash-1320x2868' },  // iPhone 15 Pro Max
  { width: 750, height: 1334, name: 'splash-750x1334' },    // iPhone 8
  { width: 1242, height: 2208, name: 'splash-1242x2208' },  // iPhone 8 Plus
  { width: 2048, height: 2732, name: 'splash-2048x2732' },  // iPad Pro 12.9"
  { width: 1668, height: 2388, name: 'splash-1668x2388' },  // iPad Pro 11"
];

async function generateIcons() {
  const iconDir = path.join(IOS_ASSETS_DIR, 'AppIcon.appiconset');
  fs.mkdirSync(iconDir, { recursive: true });

  console.log('🎨 Gerando ícones iOS...');
  
  const images = [];

  for (const entry of ICON_SIZES) {
    for (const scale of entry.scales) {
      const pixelSize = Math.round(entry.size * scale);
      const filename = `icon-${entry.size}x${entry.size}@${scale}x.png`;
      const outputPath = path.join(iconDir, filename);

      await sharp(SOURCE_ICON)
        .resize(pixelSize, pixelSize, {
          fit: 'cover',
          background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
        })
        .png()
        .toFile(outputPath);

      images.push({
        size: `${entry.size}x${entry.size}`,
        idiom: entry.idiom,
        filename: filename,
        scale: `${scale}x`
      });

      console.log(`  ✅ ${filename} (${pixelSize}x${pixelSize}px)`);
    }
  }

  // Contents.json do AppIcon
  const contents = {
    images: images,
    info: {
      version: 1,
      author: 'Zyntra iOS Asset Generator'
    }
  };

  fs.writeFileSync(
    path.join(iconDir, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log('  📄 Contents.json gerado\n');
}

async function generateSplashScreens() {
  const splashDir = path.join(IOS_ASSETS_DIR, 'Splash.imageset');
  fs.mkdirSync(splashDir, { recursive: true });

  // Também salvar em public para uso web
  const publicSplashDir = path.join(__dirname, '..', 'public', 'splash');
  fs.mkdirSync(publicSplashDir, { recursive: true });

  console.log('🖼️  Gerando splash screens...');

  const logoSize = 200; // tamanho do logo no centro do splash

  for (const splash of SPLASH_SIZES) {
    const { width, height, name } = splash;
    const filename = `${name}.png`;

    // Criar fundo gradiente com logo centralizado
    const svgBackground = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a"/>
            <stop offset="50%" style="stop-color:#1e1b4b"/>
            <stop offset="100%" style="stop-color:#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bg)"/>
        <circle cx="${width * 0.2}" cy="${height * 0.3}" r="${width * 0.4}" fill="rgba(99, 102, 241, 0.05)"/>
        <circle cx="${width * 0.8}" cy="${height * 0.7}" r="${width * 0.3}" fill="rgba(99, 102, 241, 0.03)"/>
      </svg>
    `;

    const base = await sharp(Buffer.from(svgBackground))
      .resize(width, height)
      .png()
      .toBuffer();

    // Redimensionar logo
    const logo = await sharp(SOURCE_ICON)
      .resize(logoSize, logoSize)
      .png()
      .toBuffer();

    // Compor logo no centro
    const finalImage = await sharp(base)
      .composite([{
        input: logo,
        left: Math.round((width - logoSize) / 2),
        top: Math.round((height - logoSize) / 2 - height * 0.05) // um pouco acima do centro
      }])
      .png()
      .toFile(path.join(splashDir, filename));

    // Copiar para public
    await sharp(base)
      .composite([{
        input: logo,
        left: Math.round((width - logoSize) / 2),
        top: Math.round((height - logoSize) / 2 - height * 0.05)
      }])
      .png()
      .toFile(path.join(publicSplashDir, filename));

    console.log(`  ✅ ${filename} (${width}x${height})`);
  }

  // Contents.json do splash
  const contents = {
    images: SPLASH_SIZES.map(s => ({
      filename: `${s.name}.png`,
      idiom: 'universal',
      scale: '1x'
    })),
    info: {
      version: 1,
      author: 'Zyntra iOS Asset Generator'
    }
  };

  fs.writeFileSync(
    path.join(splashDir, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log('  📄 Contents.json gerado\n');
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║    Zyntra iOS Asset Generator        ║');
  console.log('╚══════════════════════════════════════╝\n');

  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ Ícone fonte não encontrado: ${SOURCE_ICON}`);
    console.error('   Certifique-se de que public/icons/icon-512x512.png existe');
    process.exit(1);
  }

  // Verificar se pasta iOS existe
  const iosDir = path.join(__dirname, '..', 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('📱 Pasta ios/ não encontrada. Execute primeiro:');
    console.log('   npx cap add ios\n');
    console.log('   Gerando assets na pasta public/ por enquanto...\n');
  }

  fs.mkdirSync(IOS_ASSETS_DIR, { recursive: true });

  await generateIcons();
  await generateSplashScreens();

  console.log('🎉 Assets iOS gerados com sucesso!');
  console.log('\nPróximos passos:');
  console.log('  1. npx cap add ios');
  console.log('  2. npx cap sync');
  console.log('  3. npx cap open ios');
}

main().catch(console.error);
