/**
 * Prueba HTTP Real contra el servidor Next.js compilado
 * Verifica:
 * 1. GET /es/pigro -> HTTP 200 + HTML de Pigro
 * 2. GET /es/negocio-que-no-existe -> HTTP 404
 * 3. GET /v1/public/businesses/pigro (API Central) -> HTTP 200
 */

const { spawn } = require('child_process');
const http = require('http');

async function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status) return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

async function main() {
  console.log('====================================================');
  console.log('🚀 INICIANDO SERVIDOR NEXT.JS COMPILADO EN PUERTO 3000...');
  console.log('====================================================\n');

  // Iniciar servidor local
  const serverProcess = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3000', USE_CENTRAL_API: 'true', NEXT_PUBLIC_API_URL: 'https://api.ubicame.cc' },
    stdio: 'inherit',
    shell: true,
  });

  const ready = await waitForServer('http://localhost:3000/es', 25000);
  if (!ready) {
    console.error('❌ El servidor Next.js no inició a tiempo.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🧪 EJECUTANDO PRUEBAS HTTP REALES');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. GET https://api.ubicame.cc/v1/public/businesses/pigro
  try {
    const apiRes = await fetch('https://api.ubicame.cc/v1/public/businesses/pigro');
    const apiData = await apiRes.json();
    if (apiRes.status === 200 && apiData?.business?.name === 'Pigro') {
      console.log(`✅ [1/3] GET https://api.ubicame.cc/v1/public/businesses/pigro -> HTTP ${apiRes.status} (Nombre: ${apiData.business.name})`);
      passed++;
    } else {
      console.error(`❌ [1/3] GET API Central falló -> HTTP ${apiRes.status}`);
      failed++;
    }
  } catch (e) {
    console.error(`❌ [1/3] Error en API Central: ${e.message}`);
    failed++;
  }

  // 2. GET http://localhost:3000/es/pigro (Página completa renderizada)
  try {
    const pageRes = await fetch('http://localhost:3000/es/pigro');
    const htmlText = await pageRes.text();
    const hasPigroTitle = htmlText.includes('Pigro') || htmlText.includes('comida Italiana') || htmlText.includes('pigro');

    if (pageRes.status === 200 && hasPigroTitle) {
      console.log(`✅ [2/3] GET http://localhost:3000/es/pigro -> HTTP ${pageRes.status} (HTML de Pigro confirmado, ${htmlText.length} bytes)`);
      passed++;
    } else {
      console.error(`❌ [2/3] GET /es/pigro devolvió HTTP ${pageRes.status}`);
      failed++;
    }
  } catch (e) {
    console.error(`❌ [2/3] Error en /es/pigro: ${e.message}`);
    failed++;
  }

  // 3. GET http://localhost:3000/es/negocio-que-no-existe (Debe dar 404)
  try {
    const notFoundRes = await fetch('http://localhost:3000/es/negocio-que-no-existe-xyz-123');
    if (notFoundRes.status === 404) {
      console.log(`✅ [3/3] GET http://localhost:3000/es/negocio-que-no-existe-xyz-123 -> HTTP ${notFoundRes.status} (404 confirmado)`);
      passed++;
    } else {
      console.error(`❌ [3/3] Se esperaba 404 para negocio inexistente pero devolvió HTTP ${notFoundRes.status}`);
      failed++;
    }
  } catch (e) {
    console.error(`❌ [3/3] Error en negocio inexistente: ${e.message}`);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO FINAL DE PRUEBAS HTTP: ${passed} PASARON, ${failed} FALLARON`);
  console.log('====================================================\n');

  // Detener el servidor
  serverProcess.kill();
  try {
    process.kill(-serverProcess.pid);
  } catch {}

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Error fatal en test runner:', err);
  process.exit(1);
});
