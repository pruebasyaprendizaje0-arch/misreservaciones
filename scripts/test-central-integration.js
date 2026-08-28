const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ubicame.cc';

async function fetchApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

async function centralLogin(email, password) {
  const res = await fetchApi('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res.ok && res.data ? res.data : null;
}

async function getCentralBusinesses(token) {
  const res = await fetchApi('/v1/businesses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok && res.data ? res.data.businesses : [];
}

async function getCentralBusinessById(id, token) {
  const res = await fetchApi(`/v1/businesses/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok && res.data ? res.data.business : null;
}

async function resolveCentralTenantBySlug(slug, token) {
  const list = await getCentralBusinesses(token);
  const business = list.find((b) => b.slug.toLowerCase() === slug.toLowerCase());
  if (!business) return null;
  const branchRes = await fetchApi(`/v1/businesses/${business.id}/branches`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const branches = branchRes.ok && branchRes.data ? branchRes.data.branches : [];
  return { business, branch: branches[0] };
}

async function getCentralBranchReservations(branchId, token) {
  const res = await fetchApi(`/v1/branches/${branchId}/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok && res.data ? res.data.reservations : [];
}

async function createCentralReservation(branchId, payload) {
  if (!payload.customerName || !payload.startsAt || !payload.endsAt) {
    return { ok: false, error: 'Campos requeridos faltantes' };
  }
  if (new Date(payload.endsAt) <= new Date(payload.startsAt)) {
    return { ok: false, error: 'Fecha fin debe ser posterior a fecha inicio' };
  }
  const res = await fetchApi(`/v1/branches/${branchId}/reservations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, reservation: res.data ? (res.data.reservation || res.data) : null, error: res.data?.message };
}

async function updateCentralReservationStatus(reservationId, status, token) {
  const res = await fetchApi(`/v1/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  return { ok: res.ok, reservation: res.data ? (res.data.reservation || res.data) : null, error: res.data?.message };
}


async function runTests() {
  console.log('=== INICIANDO BATERÍA DE PRUEBAS PARA INTEGRACIÓN API CENTRAL ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  // 1. Health API
  try {
    const res = await fetch('https://api.ubicame.cc/health');
    const json = await res.json();
    assert(res.status === 200 && json.status === 'ok', '1. Health de API Central (/health)');
  } catch (e) {
    assert(false, `1. Health de API Central: ${e.message}`);
  }

  // 2. Health DB Central
  try {
    const res = await fetch('https://api.ubicame.cc/health/db');
    const json = await res.json();
    assert(res.status === 200 && json.database === 'connected', '2. Health de Base Central (/health/db)');
  } catch (e) {
    assert(false, `2. Health de Base Central: ${e.message}`);
  }

  // Login de prueba para autenticar peticiones administrativas
  let token = null;
  try {
    const loginRes = await centralLogin('admin@restaurante.com', 'Secret123456');
    if (loginRes && loginRes.token) {
      token = loginRes.token;
      assert(true, 'Autenticación central exitosa (POST /v1/auth/login)');
    } else {
      assert(false, 'Autenticación central fallida');
    }
  } catch (e) {
    assert(false, `Autenticación central error: ${e.message}`);
  }

  // 3. Listar Negocios
  let businesses = [];
  try {
    businesses = await getCentralBusinesses(token);
    assert(Array.isArray(businesses) && businesses.length > 0, `3. Listar negocios (${businesses.length} encontrados)`);
  } catch (e) {
    assert(false, `3. Listar negocios: ${e.message}`);
  }

  // 4. Listar Sucursales
  let targetBusiness = null;
  let targetBranch = null;
  try {
    const resolved = await resolveCentralTenantBySlug('pizzeria-bella-italia', token);
    if (resolved) {
      targetBusiness = resolved.business;
      targetBranch = resolved.branch;
      assert(targetBusiness.slug === 'pizzeria-bella-italia' && targetBranch.id, `4. Resolver sucursales para ${targetBusiness.name}`);
    } else {
      assert(false, '4. No se pudo encontrar negocio pizzeria-bella-italia');
    }
  } catch (e) {
    assert(false, `4. Resolver sucursales error: ${e.message}`);
  }

  // 5. Mostrar Perfil
  try {
    const bDetails = await getCentralBusinessById(targetBusiness.id, token);
    assert(bDetails && bDetails.id === targetBusiness.id, `5. Mostrar perfil central de negocio (${bDetails?.name})`);
  } catch (e) {
    assert(false, `5. Mostrar perfil central error: ${e.message}`);
  }

  // 6. Listar Servicios / Menú
  try {
    const res = await fetch(`https://api.ubicame.cc/v1/branches/${targetBranch.id}/menu`);
    const json = await res.json();
    assert(res.status === 200 && json.menus, `6. Listar servicios / menú desde API Central`);
  } catch (e) {
    assert(false, `6. Listar servicios / menú error: ${e.message}`);
  }

  // 7. Listar Horarios / Reservaciones
  let initialReservations = [];
  try {
    initialReservations = await getCentralBranchReservations(targetBranch.id, token);
    assert(Array.isArray(initialReservations), `7. Listar reservaciones de sucursal (${initialReservations.length} encontradas)`);
  } catch (e) {
    assert(false, `7. Listar reservaciones error: ${e.message}`);
  }

  // 9. Validar rechazo de fechas inválidas (endsAt <= startsAt)
  try {
    const invalidDates = await createCentralReservation(targetBranch.id, {
      customerName: 'Prueba Invalida',
      startsAt: '2026-09-01T15:00:00.000Z',
      endsAt: '2026-09-01T14:00:00.000Z', // Anterior a inicio
    });
    assert(!invalidDates.ok, '9. Rechazo correcto de fecha de fin anterior a la de inicio');
  } catch (e) {
    assert(false, `9. Validación de fechas error: ${e.message}`);
  }

  // FASE 11: PRUEBA CONTROLADA DE CREACIÓN Y CAMBIOS DE ESTADO
  console.log('\n--- FASE 11: PRUEBA CONTROLADA DE RESERVA EN NEGOCIO REAL ---');
  console.log(`Negocio Objetivo: ${targetBusiness.name} (ID: ${targetBusiness.id})`);
  console.log(`Sucursal Objetivo: ${targetBranch.name} (ID: ${targetBranch.id})`);

  let createdReservationId = null;

  // 8. Crear una reserva de prueba
  try {
    const startObj = new Date(Date.now() + 86400000 * 5); // En 5 días
    const endObj = new Date(startObj.getTime() + 3600000); // 1 hora después

    const createRes = await createCentralReservation(targetBranch.id, {
      customerName: 'Cliente Verificación Sistema',
      customerEmail: 'pruebacontrolada@ubicame.cc',
      customerPhone: '+593999999999',
      serviceName: 'Cena Especial Auditoria',
      startsAt: startObj.toISOString(),
      endsAt: endObj.toISOString(),
      notes: 'Reserva automatizada de verificación de ciclo',
    });

    if (createRes.ok && createRes.reservation) {
      createdReservationId = createRes.reservation.id;
      assert(true, `8. Reserva creada exitosamente en API Central (ID: ${createdReservationId})`);
    } else {
      assert(false, `8. Error creando reserva central: ${createRes.error}`);
    }
  } catch (e) {
    assert(false, `8. Crear reserva error: ${e.message}`);
  }

  if (createdReservationId) {
    // 12. Cambiar a CONFIRMED
    try {
      const confRes = await updateCentralReservationStatus(createdReservationId, 'CONFIRMED', token);
      assert(confRes.ok && confRes.reservation.status === 'CONFIRMED', `12. Actualizar estado a CONFIRMED (Status: ${confRes.reservation?.status})`);
    } catch (e) {
      assert(false, `12. Actualizar a CONFIRMED error: ${e.message}`);
    }

    // 14. Cambiar a COMPLETED
    try {
      const compRes = await updateCentralReservationStatus(createdReservationId, 'COMPLETED', token);
      assert(compRes.ok && compRes.reservation.status === 'COMPLETED', `14. Actualizar estado a COMPLETED (Status: ${compRes.reservation?.status})`);
    } catch (e) {
      assert(false, `14. Actualizar a COMPLETED error: ${e.message}`);
    }

    // 13. Cancelar reserva (CANCELLED)
    try {
      const cancRes = await updateCentralReservationStatus(createdReservationId, 'CANCELLED', token);
      assert(cancRes.ok && cancRes.reservation.status === 'CANCELLED', `13. Cancelar reserva (Status: ${cancRes.reservation?.status})`);
    } catch (e) {
      assert(false, `13. Cancelar reserva error: ${e.message}`);
    }
  }

  // 18. Verificar no duplicación de reservaciones
  try {
    const finalReservations = await getCentralBranchReservations(targetBranch.id, token);
    const countCreated = finalReservations.filter((r) => r.id === createdReservationId).length;
    assert(countCreated === 1, '18. Verificación de no duplicación (reserva existe exactamente 1 vez)');
  } catch (e) {
    assert(false, `18. Verificación duplicación error: ${e.message}`);
  }

  console.log(`\n=== RESUMEN DE PRUEBAS: ${passed} PASADAS, ${failed} FALLADAS ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal Error en suite de pruebas:', err);
  process.exit(1);
});
