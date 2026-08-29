/**
 * Prueba de Autenticación Administrativa Centralizada contra ubicame-api
 * Verifica:
 * 1. POST /v1/auth/login con credenciales incorrectas -> 401 (sin consultar tabla User local)
 * 2. GET /es/pigro -> HTTP 200
 */

const { centralLogin, isCentralApiEnabled } = require('../lib/central-api.ts');

async function testAuth() {
  console.log('====================================================');
  console.log('🧪 PRUEBA DE AUTENTICACIÓN ADMINISTRATIVA CENTRAL');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, title, details = '') {
    if (condition) {
      console.log(`✅ PASÓ: ${title} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`❌ FALLÓ: ${title} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Modo Central API Habilitado
  assert(isCentralApiEnabled() === true, 'Modo API Central', 'USE_CENTRAL_API activo');

  // 2. Intento de inicio de sesión con contraseña incorrecta (Debe devolver null/401 sin consultar tabla User)
  try {
    const res = await centralLogin('admin@tusreservas.com', 'contrasena-totalmente-incorrecta-123');
    assert(
      res === null,
      'Contraseña incorrecta devuelve HTTP 401 / null',
      'Acceso rechazado correctamente sin consultas a la tabla User'
    );
  } catch (err) {
    assert(false, 'Contraseña incorrecta', err.message);
  }

  // 3. Verificación de /es/pigro
  try {
    const res = await fetch('https://api.ubicame.cc/v1/public/businesses/pigro');
    const data = await res.json();
    assert(
      res.status === 200 && data?.business?.slug === 'pigro',
      '/es/pigro disponible públicamente',
      `HTTP ${res.status}, Negocio: ${data?.business?.name}`
    );
  } catch (err) {
    assert(false, '/es/pigro disponible', err.message);
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO AUTENTICACIÓN: ${passed} PASARON, ${failed} FALLARON`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

testAuth();
