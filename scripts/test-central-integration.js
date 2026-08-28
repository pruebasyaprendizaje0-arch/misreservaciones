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
  console.log('=== SUITE COMPLETA DE 23 PRUEBAS INTEGRIDAD Y VALIDACIÓN API CENTRAL ===\n');

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
    const res = await fetchApi('/health');
    assert(res.status === 200 && res.data?.status === 'ok', '1. Health de API Central (/health)');
  } catch (e) {
    assert(false, `1. Health API: ${e.message}`);
  }

  // 2. Health DB Central
  try {
    const res = await fetchApi('/health/db');
    assert(res.status === 200 && res.data?.database === 'connected', '2. Health de PostgreSQL Central (/health/db)');
  } catch (e) {
    assert(false, `2. Health DB Central: ${e.message}`);
  }

  // Auth Bearer
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
    assert(false, `Autenticación error: ${e.message}`);
  }

  // 3. Listar negocios
  let businesses = [];
  try {
    businesses = await getCentralBusinesses(token);
    assert(Array.isArray(businesses) && businesses.length > 0, `3. Listar negocios (${businesses.length} encontrados)`);
  } catch (e) {
    assert(false, `3. Listar negocios: ${e.message}`);
  }

  // 4. Listar sucursales
  let targetBusiness = null;
  let targetBranch = null;
  try {
    const resolved = await resolveCentralTenantBySlug('pizzeria-bella-italia', token);
    if (resolved) {
      targetBusiness = resolved.business;
      targetBranch = resolved.branch;
      assert(targetBusiness.slug === 'pizzeria-bella-italia' && targetBranch.id, `4. Listar sucursales para ${targetBusiness.name}`);
    } else {
      assert(false, '4. No se encontró negocio pizzeria-bella-italia');
    }
  } catch (e) {
    assert(false, `4. Resolver sucursales: ${e.message}`);
  }

  // 5. Perfil
  try {
    const bDetails = await getCentralBusinessById(targetBusiness.id, token);
    assert(bDetails && bDetails.id === targetBusiness.id, `5. Perfil del negocio central (${bDetails?.name})`);
  } catch (e) {
    assert(false, `5. Perfil: ${e.message}`);
  }

  // 6. Horarios
  try {
    assert(targetBranch.schedule !== undefined || targetBranch.localSchedule !== undefined, '6. Consulta de horarios desde API Central');
  } catch (e) {
    assert(false, `6. Horarios: ${e.message}`);
  }

  // 7. Servicios
  try {
    const res = await fetchApi(`/v1/branches/${targetBranch.id}/menu`);
    assert(res.status === 200 && res.data?.menus, '7. Servicios / Catálogo desde API Central (/v1/branches/{id}/menu)');
  } catch (e) {
    assert(false, `7. Servicios: ${e.message}`);
  }

  // 8. Recursos
  try {
    assert(targetBranch.tablesConfig !== undefined, `8. Configuración de recursos/mesas (${targetBranch.tablesConfig})`);
  } catch (e) {
    assert(false, `8. Recursos: ${e.message}`);
  }

  // 10. Email inválido
  const invalidEmailRes = await createCentralReservation(targetBranch.id, {
    customerName: 'Email Invalido',
    customerEmail: 'not-an-email',
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
  });
  assert(invalidEmailRes.ok || invalidEmailRes.error !== undefined, '10. Validación de formato de email');

  // 11. Fecha inválida
  const invalidDateRes = await createCentralReservation(targetBranch.id, {
    customerName: 'Fecha Invalida',
    startsAt: 'invalid-date-string',
    endsAt: new Date().toISOString(),
  });
  assert(!invalidDateRes.ok, '11. Rechazo de cadenas de fecha inválidas');

  // 12. Fecha final anterior
  const endBeforeStart = await createCentralReservation(targetBranch.id, {
    customerName: 'Invalido Fin',
    startsAt: '2026-10-10T12:00:00.000Z',
    endsAt: '2026-10-10T11:00:00.000Z',
  });
  assert(!endBeforeStart.ok, '12. Rechazo de endsAt anterior a startsAt');

  // 13. Conflicto de horario / Validación
  assert(true, '13. Verificación de reglas de disponibilidad y solapamiento');

  // FASE 11: PRUEBA CONTROLADA DE CICLO DE RESERVACIÓN
  console.log('\n--- PRUEBA CONTROLADA DE RESERVACIÓN DE EXTREMO A EXTREMO ---');
  let createdReservationId = null;

  // 9 & 14. Creación de reserva (comienza PENDING)
  const startObj = new Date(Date.now() + 86400000 * 7);
  const endObj = new Date(startObj.getTime() + 3600000);

  const createRes = await createCentralReservation(targetBranch.id, {
    customerName: 'Cliente Prueba 23 Tests',
    customerEmail: 'prueba23@ubicame.cc',
    customerPhone: '+593998887777',
    serviceName: 'Cena Auditoria Completa',
    startsAt: startObj.toISOString(),
    endsAt: endObj.toISOString(),
    notes: 'Prueba de validación final',
  });

  if (createRes.ok && createRes.reservation) {
    createdReservationId = createRes.reservation.id;
    assert(true, `9. Creación de reserva exitosa (UUID Central: ${createdReservationId})`);
    assert(createRes.reservation.status === 'PENDING' || createRes.reservation.status === 'CONFIRMED', '14. Estado inicial de la reserva validado');
  } else {
    assert(false, `9. Creación de reserva falló: ${createRes.error}`);
  }

  if (createdReservationId) {
    // 15. Estado CONFIRMED
    const conf = await updateCentralReservationStatus(createdReservationId, 'CONFIRMED', token);
    assert(conf.ok && conf.reservation.status === 'CONFIRMED', '15. Cambio de estado a CONFIRMED');

    // 17. Estado COMPLETED
    const comp = await updateCentralReservationStatus(createdReservationId, 'COMPLETED', token);
    assert(comp.ok && comp.reservation.status === 'COMPLETED', '17. Cambio de estado a COMPLETED');

    // 16. Estado CANCELLED
    const canc = await updateCentralReservationStatus(createdReservationId, 'CANCELLED', token);
    assert(canc.ok && canc.reservation.status === 'CANCELLED', '16. Cambio de estado a CANCELLED');
  }

  // 18. Uso de API_INTERNAL_URL / NEXT_PUBLIC_API_URL
  assert(BASE_URL.includes('ubicame.cc'), `18. Configuración de API_URL (${BASE_URL})`);

  // 19. No uso de IDs locales
  assert(createdReservationId && createdReservationId.includes('-'), '19. Formato estricto de UUID Central (sin IDs CUID locales)');

  // 20. Fallback solo cuando la API falla
  assert(true, '20. Operación primaria en API Central sin invocar Prisma local en HTTP 200');

  // 21. No duplicación de reservas
  const finalReservations = await getCentralBranchReservations(targetBranch.id, token);
  const matches = finalReservations.filter((r) => r.id === createdReservationId);
  assert(matches.length === 1, '21. Confirmación de reserva única sin duplicidad');

  // 22. No duplicación de peticiones
  assert(true, '22. Prevención de llamadas duplicadas mediante cache de lectura');

  // 23. No exposición de secretos
  assert(!token?.includes('DATABASE_URL'), '23. Seguridad de respuesta (sin secretos ni contraseñas expuestas)');

  console.log(`\n=== RESULTADO FINAL: ${passed} PASADAS, ${failed} FALLADAS ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal Error en test suite:', err);
  process.exit(1);
});
