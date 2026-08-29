/**
 * Test E2E de Flujo Completo con API Central (ubicame-api)
 * Prueba:
 * 1. Autenticación / Registro real en POST /v1/auth/login o POST /v1/auth/register
 * 2. Listar negocios mediante GET /v1/businesses (Dashboard)
 * 3. Crear negocio ficticio mediante POST /v1/businesses
 * 4. Crear sucursal mediante POST /v1/businesses/:businessId/branches
 * 5. Editar negocio mediante PUT /v1/businesses/:businessId
 * 6. Consultar negocio en GET https://api.ubicame.cc/v1/public/businesses/:slug
 * 7. Verificar /es/pigro (HTTP 200)
 */

const {
  centralLogin,
  getCentralBusinesses,
  createCentralBusiness,
  createCentralBranch,
  updateCentralBusiness,
  isCentralApiEnabled,
} = require('../lib/central-api.ts');

async function runFullFlowTest() {
  console.log('====================================================');
  console.log('🧪 EJECUTANDO TEST DE FLUJO COMPLETO CON API CENTRAL');
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

  // 1. Verificación de configuración
  assert(isCentralApiEnabled() === true, 'Modo API Central activo', 'USE_CENTRAL_API=true');

  const timestamp = Date.now();
  let email = process.env.SUPER_ADMIN_EMAIL || `admin.test.${timestamp}@ubicame.cc`;
  let password = process.env.SUPER_ADMIN_PASSWORD || 'Secret123!';

  // 2. Login o Registro en API Central
  let token = null;
  try {
    let loginRes = await centralLogin(email, password);
    if (!loginRes || !loginRes.token) {
      // Intentar registro si las credenciales por defecto no existen
      const regRes = await fetch('https://api.ubicame.cc/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Admin Test ${timestamp}`,
          email,
          password,
        }),
      });

      if (regRes.ok) {
        const regData = await regRes.json();
        token = regData.token;
      }

      if (!token) {
        loginRes = await centralLogin(email, password);
        if (loginRes?.token) token = loginRes.token;
      }
    } else {
      token = loginRes.token;
    }

    if (token) {
      assert(true, 'Autenticación real en API Central (token JWT obtenido)', `Email: ${email}`);
    } else {
      assert(false, 'Autenticación real en API Central', 'No se pudo obtener token JWT');
    }
  } catch (err) {
    assert(false, 'Autenticación real en API Central', err.message);
  }

  if (!token) {
    console.error('❌ Imposible continuar sin token JWT válido.');
    process.exit(1);
  }

  // 3. Listar negocios (Dashboard)
  try {
    const businesses = await getCentralBusinesses(token);
    assert(
      Array.isArray(businesses),
      'Listar negocios (GET /v1/businesses)',
      `Total encontrados: ${businesses.length}`
    );
  } catch (err) {
    assert(false, 'Listar negocios', err.message);
  }

  // 4. Crear negocio ficticio
  const testSlug = `negocio-ficticio-${timestamp}`;
  const testName = `Negocio Ficticio ${timestamp}`;
  let createdBusinessId = null;

  try {
    const createRes = await createCentralBusiness(
      {
        name: testName,
        slug: testSlug,
        industry: 'RESTAURANTE',
      },
      token
    );

    if (createRes.ok && createRes.business) {
      createdBusinessId = createRes.business.id;
      assert(true, 'Crear negocio (POST /v1/businesses)', `ID: ${createdBusinessId}, Slug: ${testSlug}`);
    } else {
      assert(false, 'Crear negocio (POST /v1/businesses)', createRes.error);
    }
  } catch (err) {
    assert(false, 'Crear negocio', err.message);
  }

  // 5. Crear sucursal
  if (createdBusinessId) {
    try {
      const branchRes = await createCentralBranch(
        createdBusinessId,
        {
          name: 'Sucursal Matriz Test',
          slug: 'matriz-test',
          address: 'Av. Amazonas N24-15',
          phone: '+593999999999',
        },
        token
      );

      if (branchRes.ok && branchRes.branch) {
        assert(true, 'Crear sucursal (POST /v1/businesses/:id/branches)', `ID Sucursal: ${branchRes.branch.id}`);
      } else {
        assert(false, 'Crear sucursal (POST /v1/businesses/:id/branches)', branchRes.error);
      }
    } catch (err) {
      assert(false, 'Crear sucursal', err.message);
    }

    // 6. Editar negocio
    try {
      const updateRes = await updateCentralBusiness(
        createdBusinessId,
        {
          name: `${testName} (Editado)`,
          description: 'Negocio ficticio actualizado mediante PUT /v1/businesses/:id',
        },
        token
      );

      if (updateRes.ok && updateRes.business) {
        assert(true, 'Editar negocio (PUT /v1/businesses/:id)', `Nombre actualizado: ${updateRes.business.name}`);
      } else {
        assert(false, 'Editar negocio (PUT /v1/businesses/:id)', updateRes.error);
      }
    } catch (err) {
      assert(false, 'Editar negocio', err.message);
    }
  }

  // 7. Consultar negocio ficticio creado públicamente
  try {
    const publicRes = await fetch(`https://api.ubicame.cc/v1/public/businesses/${testSlug}`);
    const publicData = await publicRes.json();

    assert(
      publicRes.status === 200 && publicData?.business?.slug === testSlug,
      'Consultar negocio creado en https://api.ubicame.cc/v1/public/businesses/:slug',
      `HTTP status: ${publicRes.status}, Nombre: ${publicData?.business?.name}`
    );
  } catch (err) {
    assert(false, 'Consultar negocio creado públicamente', err.message);
  }

  // 8. Verificar /es/pigro
  try {
    const pigroRes = await fetch('https://api.ubicame.cc/v1/public/businesses/pigro');
    const pigroData = await pigroRes.json();
    assert(
      pigroRes.status === 200 && pigroData?.business?.name === 'Pigro',
      '/es/pigro sigue funcionando',
      `HTTP ${pigroRes.status}, Nombre: ${pigroData?.business?.name}`
    );
  } catch (err) {
    assert(false, '/es/pigro', err.message);
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO FINAL DE TEST E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runFullFlowTest().catch((err) => {
  console.error('Error en script E2E:', err);
  process.exit(1);
});
