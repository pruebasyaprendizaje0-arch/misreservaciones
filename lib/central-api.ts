/**
 * Cliente de integración con la API Central (ubicame-api)
 * URL Pública: https://api.ubicame.cc
 * URL Interna: process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL
 */

export type CentralBusiness = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  industry: string | null;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
  branches?: CentralBranch[];
};

export type CentralBranch = {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  provincia: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  tablesConfig?: string | null;
  schedule?: any;
  localSchedule?: any;
  deliverySchedule?: any;
  deliveryEnabled?: boolean;
  deliveryCost?: string;
  ivaPercent?: string;
  servicePercent?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CentralReservation = {
  id: string;
  branchId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string | null;
  resourceName: string | null;
  staffName: string | null;
  startsAt: string;
  endsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  source?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCentralReservationPayload = {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  resourceName?: string | null;
  staffName?: string | null;
  startsAt: string; // ISO string
  endsAt: string;   // ISO string
  notes?: string | null;
};

export type CentralLoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: string;
    createdAt?: string;
  };
};

const FETCH_TIMEOUT_MS = 3000;

export function isCentralApiEnabled(): boolean {
  return process.env.USE_CENTRAL_API === 'true';
}

export function getCentralApiBaseUrl(): string {
  const isServer = typeof window === 'undefined';
  if (isServer && process.env.API_INTERNAL_URL) {
    return process.env.API_INTERNAL_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return 'https://api.ubicame.cc';
}

/**
 * Realiza peticiones HTTP a la API Central con AbortController y timeout de 3 segundos
 */
async function fetchCentralApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const baseUrl = getCentralApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.message) errorMessage = errorJson.message;
        else if (errorJson.error) errorMessage = errorJson.error;
      } catch {}
      return { ok: false, status: response.status, error: errorMessage };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isAbort = err.name === 'AbortError';
    return {
      ok: false,
      status: isAbort ? 408 : 500,
      error: isAbort ? 'Tiempo de espera agotado (Timeout 3s)' : err.message || 'Error de red en API Central',
    };
  }
}

/**
 * Inicia sesión en la API Central y obtiene el token JWT Bearer
 */
export async function centralLogin(email: string, password: string): Promise<CentralLoginResponse | null> {
  const res = await fetchCentralApi<CentralLoginResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.ok && res.data && res.data.token) {
    return res.data;
  }
  return null;
}

/**
 * Obtiene el perfil de un usuario usando su token Bearer
 */
export async function getCentralAuthMe(token: string): Promise<any | null> {
  const res = await fetchCentralApi<{ user: any }>('/v1/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok && res.data ? res.data.user : null;
}

/**
 * Obtiene la lista de todos los negocios en la API Central
 */
export async function getCentralBusinesses(token?: string): Promise<CentralBusiness[]> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchCentralApi<{ businesses: CentralBusiness[] }>('/v1/businesses', {
    method: 'GET',
    headers,
  });

  if (res.ok && res.data && Array.isArray(res.data.businesses)) {
    return res.data.businesses;
  }
  return [];
}

/**
 * Obtiene un negocio central por su ID
 */
export async function getCentralBusinessById(businessId: string, token?: string): Promise<CentralBusiness | null> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchCentralApi<{ business: CentralBusiness }>(`/v1/businesses/${businessId}`, {
    method: 'GET',
    headers,
  });

  if (res.ok && res.data && res.data.business) {
    return res.data.business;
  }
  return null;
}

/**
 * Resuelve un slug a su negocio central y sucursal principal mediante el endpoint público
 */
export async function resolveCentralTenantBySlug(
  slug: string,
  token?: string
): Promise<{ business: CentralBusiness; branch: CentralBranch } | null> {
  const cleanSlug = slug.trim().toLowerCase();
  const res = await fetchCentralApi<{ business: CentralBusiness }>(`/v1/public/businesses/${encodeURIComponent(cleanSlug)}`, {
    method: 'GET',
  });

  if (res.ok && res.data && res.data.business) {
    const business = res.data.business;
    const branches = business.branches || [];
    const primaryBranch = branches.length > 0 ? branches[0] : null;

    if (primaryBranch) {
      return { business, branch: primaryBranch };
    }
  }

  return null;
}

/**
 * Obtiene las reservaciones de una sucursal en la API Central (requiere autenticación)
 */
export async function getCentralBranchReservations(
  branchId: string,
  token: string
): Promise<CentralReservation[]> {
  const res = await fetchCentralApi<{ reservations: CentralReservation[] }>(`/v1/branches/${branchId}/reservations`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok && res.data && Array.isArray(res.data.reservations)) {
    return res.data.reservations;
  }
  return [];
}

/**
 * Crea una nueva reservación en la API Central (Endpoint público)
 */
export async function createCentralReservation(
  branchId: string,
  payload: CreateCentralReservationPayload
): Promise<{ ok: boolean; reservation?: CentralReservation; error?: string }> {
  // Validación de campos obligatorios
  if (!payload.customerName || !payload.customerName.trim()) {
    return { ok: false, error: 'El nombre del cliente es obligatorio' };
  }
  if (!payload.startsAt || !payload.endsAt) {
    return { ok: false, error: 'La fecha y hora de inicio y fin son obligatorias' };
  }
  const startsAtDate = new Date(payload.startsAt);
  const endsAtDate = new Date(payload.endsAt);
  if (isNaN(startsAtDate.getTime()) || isNaN(endsAtDate.getTime())) {
    return { ok: false, error: 'Las fechas especificadas no son válidas' };
  }
  if (endsAtDate <= startsAtDate) {
    return { ok: false, error: 'La hora de fin debe ser posterior a la hora de inicio' };
  }

  const res = await fetchCentralApi<any>(`/v1/branches/${branchId}/reservations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data) {
    const reservation = res.data.reservation || res.data;
    return { ok: true, reservation };
  }

  return { ok: false, error: res.error || 'No se pudo crear la reservación en la API Central' };
}

/**
 * Actualiza el estado de una reservación en la API Central (requiere token Bearer)
 */
export async function updateCentralReservationStatus(
  reservationId: string,
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
  token: string
): Promise<{ ok: boolean; reservation?: CentralReservation; error?: string }> {
  const res = await fetchCentralApi<any>(`/v1/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });

  if (res.ok && res.data) {
    const reservation = res.data.reservation || res.data;
    return { ok: true, reservation };
  }

  return { ok: false, error: res.error || 'No se pudo actualizar el estado de la reservación en la API Central' };
}
