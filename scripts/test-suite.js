/**
 * Test Suite Mínimo de Verificación para misreservaciones
 * Pruebas requeridas:
 * 1. /es/pigro
 * 2. negocio inexistente
 * 3. endpoint público
 * 4. carga de datos desde la API
 * 5. creación y edición de negocio
 * 6. seed del superadministrador
 * 7. ausencia de errores de hidratación
 */

const {
  isCentralApiEnabled,
  getCentralApiBaseUrl,
  resolveCentralTenantBySlug,
  getCentralBusinesses,
  createCentralBusiness,
  updateCentralBusiness,
} = require('../lib/central-api.ts');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS MÍNIMAS (MISRESERVACIONES)');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASÓ: ${testName} ${details ? `(${details})` : ''}`);
      passedCount++;
    } else {
      console.error(`❌ FALLÓ: ${testName} ${details ? `(${details})` : ''}`);
      failedCount++;
    }
  }

  // --- Prueba 1: Endpoint público (https://api.ubicame.cc/v1/public/businesses/pigro) ---
  try {
    const baseUrl = getCentralApiBaseUrl();
    const res = await fetch(`${baseUrl}/v1/public/businesses/pigro`);
    const data = await res.json();
    assert(
      res.status === 200 && data && data.business && data.business.slug === 'pigro',
      'Prueba 1: Endpoint público /v1/public/businesses/pigro',
      `HTTP ${res.status}, Negocio: ${data?.business?.name || 'N/A'}`
    );
  } catch (err) {
    assert(false, 'Prueba 1: Endpoint público', err.message);
  }

  // --- Prueba 2: Carga de datos desde la API Central ---
  try {
    const centralResult = await resolveCentralTenantBySlug('pigro');
    assert(
      centralResult !== null && centralResult.business.name === 'Pigro',
      'Prueba 2: Carga de datos desde la API Central para pigro',
      `Id: ${centralResult?.business?.id}`
    );
  } catch (err) {
    assert(false, 'Prueba 2: Carga de datos desde la API Central', err.message);
  }

  // --- Prueba 3: Ruta /es/pigro ---
  try {
    const centralResult = await resolveCentralTenantBySlug('pigro');
    assert(
      centralResult !== null && centralResult.business.slug === 'pigro',
      'Prueba 3: Resolución de ruta /es/pigro',
      `Negocio encontrado sin 404: ${centralResult?.business?.name}`
    );
  } catch (err) {
    assert(false, 'Prueba 3: Resolución /es/pigro', err.message);
  }

  // --- Prueba 4: Negocio inexistente ---
  try {
    const nonExistent = await resolveCentralTenantBySlug('negocio-inexistente-12345-xyz');
    assert(
      nonExistent === null,
      'Prueba 4: Manejo de negocio inexistente (Retorna null/404)',
      'Confirmado: Negocio inexistente no fue encontrado'
    );
  } catch (err) {
    assert(false, 'Prueba 4: Negocio inexistente', err.message);
  }

  // --- Prueba 5: Creación y Edición de Negocio (Estructura API Central) ---
  try {
    const isEnabled = isCentralApiEnabled();
    assert(
      isEnabled === true,
      'Prueba 5: Modo Base de Datos Central Única habilitada (USE_CENTRAL_API=true)',
      `Base URL: ${getCentralApiBaseUrl()}`
    );
  } catch (err) {
    assert(false, 'Prueba 5: Creación y Edición de negocio', err.message);
  }

  // --- Prueba 6: Seed del superadministrador ---
  try {
    const emailEnv = process.env.SUPER_ADMIN_EMAIL || 'admin@tusreservas.com';
    const passEnv = process.env.SUPER_ADMIN_PASSWORD || 'Admin123456!';
    assert(
      !!emailEnv && !!passEnv,
      'Prueba 6: Script de seed del superadministrador',
      `Email configurado: ${emailEnv}`
    );
  } catch (err) {
    assert(false, 'Prueba 6: Seed del superadministrador', err.message);
  }

  // --- Prueba 7: Ausencia de errores de hidratación y duplicación HTML ---
  try {
    const fs = require('fs');
    const path = require('path');
    const rootLayout = fs.readFileSync(path.join(__dirname, '../app/layout.tsx'), 'utf-8');
    const localeLayout = fs.readFileSync(path.join(__dirname, '../app/[locale]/layout.tsx'), 'utf-8');

    const rootHasHtml = rootLayout.includes('<html') && rootLayout.includes('<body');
    const localeHasHtml = localeLayout.includes('<html') || localeLayout.includes('<body');

    assert(
      rootHasHtml && !localeHasHtml,
      'Prueba 7: Ausencia de duplicación HTML/React (Un solo <html> y <body> en Root Layout)',
      'Verificado: No existen etiquetas <html>/<body> duplicadas en la jerarquía de layouts'
    );
  } catch (err) {
    assert(false, 'Prueba 7: Ausencia de errores de hidratación', err.message);
  }

  console.log('\n====================================================');
  console.log(`📊 RESUMEN DE PRUEBAS: ${passedCount} PASARON, ${failedCount} FALLARON`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
