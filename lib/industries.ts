export type MacroCategory =
  | 'ALOJAMIENTO'
  | 'SALUD_BELLEZA'
  | 'TURISMO_AVENTURA'
  | 'GASTRONOMIA_EVENTOS'
  | 'ALQUILER_ESPACIOS';

export type BookingMode =
  | 'NIGHTLY'
  | 'HOURLY_APPOINTMENT'
  | 'CAPACITY_QUOTA'
  | 'SPACE_INVENTORY';

export type IndustryType =
  | 'HOSTAL'
  | 'GLAMPING'
  | 'VACACIONAL'
  | 'MEDICO'
  | 'MASAJE'
  | 'PELUQUERIA'
  | 'TATUAJE'
  | 'VETERINARIA'
  | 'TOURS'
  | 'DEPORTES_ACUATICOS'
  | 'PARAPENTE'
  | 'RESTAURANTE'
  | 'CATA_TALLER'
  | 'EVENTOS'
  | 'ALQUILER_VEHICULOS'
  | 'CANCHAS'
  | 'COWORKING'
  | 'CAR_WASH';

export type MacroCategoryConfig = {
  key: MacroCategory;
  name: string;
  icon: string;
  description: string;
};

export type IndustryConfig = {
  key: IndustryType;
  macroCategory: MacroCategory;
  bookingMode: BookingMode;
  name: string;
  icon: string;
  description: string;
  resourceLabel: { singular: string; plural: string };
  staffLabel: { singular: string; plural: string };
  customerLabel: { singular: string; plural: string };
  serviceTitle: string;
  defaultServiceDemo: { name: string; desc: string; priceCents: number; durationMin: number };
  defaultStaffDemo: { name: string; role: string };
};

export const MACRO_CATEGORIES: MacroCategoryConfig[] = [
  {
    key: 'ALOJAMIENTO',
    name: 'Alojamiento y Estadías',
    icon: '🏨',
    description: 'Hostales, Hoteles Boutique, Glampings y Casas Vacacionales por Noche',
  },
  {
    key: 'SALUD_BELLEZA',
    name: 'Salud, Bienestar y Belleza',
    icon: '💆',
    description: 'Consultorios, Spas, Peluquerías, Tatuajes y Veterinarias por Cita',
  },
  {
    key: 'TURISMO_AVENTURA',
    name: 'Turismo, Aventura y Deportes',
    icon: '⛵',
    description: 'Tours Marítimos, Escuelas de Surf, Buceo y Parapente por Cupos',
  },
  {
    key: 'GASTRONOMIA_EVENTOS',
    name: 'Gastronomía y Eventos',
    icon: '🍽️',
    description: 'Restaurantes, Catas de Chocolate/Café, Talleres y Eventos',
  },
  {
    key: 'ALQUILER_ESPACIOS',
    name: 'Alquiler de Bienes y Espacios',
    icon: '🚜',
    description: 'Cuadrones, Canchas Sintéticas, Coworking y Car Wash',
  },
];

export const INDUSTRIES_REGISTRY: Record<IndustryType, IndustryConfig> = {
  HOSTAL: {
    key: 'HOSTAL',
    macroCategory: 'ALOJAMIENTO',
    bookingMode: 'NIGHTLY',
    name: 'Hostales y Hoteles Boutique',
    icon: '🏨',
    description: 'Optimización y gestión de habitaciones por noches y temporadas.',
    resourceLabel: { singular: 'Habitación', plural: 'Habitaciones' },
    staffLabel: { singular: 'Recepción / Personal', plural: 'Empleados' },
    customerLabel: { singular: 'Huésped', plural: 'Huéspedes' },
    serviceTitle: '🛌 Habitaciones y Tarifas',
    defaultServiceDemo: {
      name: 'Habitación Matrimonial / Suite (Demo)',
      desc: 'Cama matrimonial, aire acondicionado, baño privado, WiFi y vista al mar/jardín.',
      priceCents: 3500,
      durationMin: 1440,
    },
    defaultStaffDemo: { name: 'Recepción & Atención (Demo)', role: 'Encargado de Reservas' },
  },
  GLAMPING: {
    key: 'GLAMPING',
    macroCategory: 'ALOJAMIENTO',
    bookingMode: 'NIGHTLY',
    name: 'Glampings y Zonas de Camping',
    icon: '⛺',
    description: 'Alquiler de domos geodésicos, cabañas rústicas y parcelas de camping.',
    resourceLabel: { singular: 'Domo / Cabaña', plural: 'Domos y Cabañas' },
    staffLabel: { singular: 'Encargado de Campamento', plural: 'Personal del Glamping' },
    customerLabel: { singular: 'Huésped', plural: 'Huéspedes' },
    serviceTitle: '⛺ Cabañas, Domos y Dominios',
    defaultServiceDemo: {
      name: 'Domo Geodésico Vista Estelar (Demo)',
      desc: 'Domo de lujo con cama king, jacuzzi exterior y desayuno incluido.',
      priceCents: 6500,
      durationMin: 1440,
    },
    defaultStaffDemo: { name: 'Anfitrión Glamping (Demo)', role: 'Coordinador de Estadías' },
  },
  VACACIONAL: {
    key: 'VACACIONAL',
    macroCategory: 'ALOJAMIENTO',
    bookingMode: 'NIGHTLY',
    name: 'Casas y Departamentos Vacacionales',
    icon: '🏡',
    description: 'Gestión de propiedades y condominios turísticos por días (Estilo Airbnb).',
    resourceLabel: { singular: 'Propiedad / Depa', plural: 'Propiedades y Departamentos' },
    staffLabel: { singular: 'Host / Anfitrión', plural: 'Administradores' },
    customerLabel: { singular: 'Huésped', plural: 'Huéspedes' },
    serviceTitle: '🏡 Propiedades y Estancias',
    defaultServiceDemo: {
      name: 'Casa Vacacional Frente al Mar (Demo)',
      desc: 'Casa amoblada de 3 dormitorios, piscina privada y acceso directo a la playa.',
      priceCents: 12000,
      durationMin: 1440,
    },
    defaultStaffDemo: { name: 'Property Manager (Demo)', role: 'Administrador de la Propiedad' },
  },

  MEDICO: {
    key: 'MEDICO',
    macroCategory: 'SALUD_BELLEZA',
    bookingMode: 'HOURLY_APPOINTMENT',
    name: 'Médicos y Consultorios',
    icon: '🩺',
    description: 'Agenda de turnos médicos, odontólogos, psicólogos y especialistas.',
    resourceLabel: { singular: 'Consultorio', plural: 'Consultorios' },
    staffLabel: { singular: 'Médico / Doctor', plural: 'Médicos' },
    customerLabel: { singular: 'Paciente', plural: 'Pacientes' },
    serviceTitle: '🩺 Consultas y Tratamientos',
    defaultServiceDemo: {
      name: 'Consulta Médica / Evaluación (Demo)',
      desc: 'Evaluación clínica completa, diagnóstico y receta de tratamiento.',
      priceCents: 4000,
      durationMin: 45,
    },
    defaultStaffDemo: { name: 'Dr. Carlos Mendoza (Demo)', role: 'Especialista Odontólogo / Médico' },
  },
  MASAJE: {
    key: 'MASAJE',
    macroCategory: 'SALUD_BELLEZA',
    bookingMode: 'HOURLY_APPOINTMENT',
    name: 'Masajes y Spas',
    icon: '💆',
    description: 'Centros de relajación, masajes terapéuticos y tratamientos corporales.',
    resourceLabel: { singular: 'Cabina / Camilla', plural: 'Cabinas y Camillas' },
    staffLabel: { singular: 'Terapeuta / Masajista', plural: 'Terapeutas' },
    customerLabel: { singular: 'Cliente', plural: 'Clientes' },
    serviceTitle: '💆 Servicios y Masajes',
    defaultServiceDemo: {
      name: 'Masaje Relajante Corporal 60 min (Demo)',
      desc: 'Masaje relajante con aceites esenciales orgánicos y aromaterapia.',
      priceCents: 2500,
      durationMin: 60,
    },
    defaultStaffDemo: { name: 'Dra. Elena Ramos (Demo)', role: 'Terapeuta Principal' },
  },
  PELUQUERIA: {
    key: 'PELUQUERIA',
    macroCategory: 'SALUD_BELLEZA',
    bookingMode: 'HOURLY_APPOINTMENT',
    name: 'Peluquerías y Barberías',
    icon: '💈',
    description: 'Estética capilar, barbería tradicional, manicura y cuidado personal.',
    resourceLabel: { singular: 'Silla / Puesto', plural: 'Sillas y Puestos' },
    staffLabel: { singular: 'Estilista / Barbero', plural: 'Estilistas' },
    customerLabel: { singular: 'Cliente', plural: 'Clientes' },
    serviceTitle: '💈 Servicios y Cortes',
    defaultServiceDemo: {
      name: 'Corte Barbería & Estilo (Demo)',
      desc: 'Corte de cabello moderno, lavado, perfilado de barba y toalla caliente.',
      priceCents: 1500,
      durationMin: 45,
    },
    defaultStaffDemo: { name: 'Estilista Marco (Demo)', role: 'Barbero & Estilista' },
  },
  TATUAJE: {
    key: 'TATUAJE',
    macroCategory: 'SALUD_BELLEZA',
    bookingMode: 'HOURLY_APPOINTMENT',
    name: 'Estudios de Tatuajes y Piercings',
    icon: '🎨',
    description: 'Citas programadas con artistas locales por sesión o diseño personalizado.',
    resourceLabel: { singular: 'Estación / Sillón', plural: 'Estaciones de Arte' },
    staffLabel: { singular: 'Tatuador / Piercer', plural: 'Artistas' },
    customerLabel: { singular: 'Cliente', plural: 'Clientes' },
    serviceTitle: '🎨 Sesiones y Diseños de Tatuaje',
    defaultServiceDemo: {
      name: 'Sesión de Tatuaje Personalizado (Demo)',
      desc: 'Sesión de 2 horas para diseño y aplicación con agujas estériles y tintas veganas.',
      priceCents: 8000,
      durationMin: 120,
    },
    defaultStaffDemo: { name: 'Gabriel Tattoos (Demo)', role: 'Tatuador Residente' },
  },
  VETERINARIA: {
    key: 'VETERINARIA',
    macroCategory: 'SALUD_BELLEZA',
    bookingMode: 'HOURLY_APPOINTMENT',
    name: 'Veterinarias y Peluquería Canina',
    icon: '🐾',
    description: 'Turnos para consultas de mascotas, vacunación, cirugías y grooming.',
    resourceLabel: { singular: 'Consultorio / Mesa', plural: 'Consultorios de Mascotas' },
    staffLabel: { singular: 'Veterinario / Peluquero', plural: 'Veterinarios & Groomers' },
    customerLabel: { singular: 'Tutor / Dueño', plural: 'Tutores de Mascotas' },
    serviceTitle: '🐾 Consultas y Peluquería Canina',
    defaultServiceDemo: {
      name: 'Consulta Veterinaria & Chequeo (Demo)',
      desc: 'Revisión médica completa de la mascota, control de peso y desparasitación.',
      priceCents: 2000,
      durationMin: 30,
    },
    defaultStaffDemo: { name: 'Dra. Sofía Valdivieso (Demo)', role: 'Veterinaria Principal' },
  },

  TOURS: {
    key: 'TOURS',
    macroCategory: 'TURISMO_AVENTURA',
    bookingMode: 'CAPACITY_QUOTA',
    name: 'Operadores de Tours y Excursiones',
    icon: '⛵',
    description: 'Navegación marítima, avistamiento de ballenas, Isla de la Plata y senderismo.',
    resourceLabel: { singular: 'Embarcación / Bus', plural: 'Embarcaciones y Buses' },
    staffLabel: { singular: 'Guía Turístico / Capitán', plural: 'Guías y Capitanes' },
    customerLabel: { singular: 'Pasajero / Turista', plural: 'Pasajeros' },
    serviceTitle: '⛵ Tours y Salidas Guiadas',
    defaultServiceDemo: {
      name: 'Tour Avistamiento de Ballenas (Demo)',
      desc: 'Excursión marítima guiada con avistamiento de ballenas jorobadas y chalecos.',
      priceCents: 4500,
      durationMin: 180,
    },
    defaultStaffDemo: { name: 'Capitán Ramírez (Demo)', role: 'Guía Naturalista Certificado' },
  },
  DEPORTES_ACUATICOS: {
    key: 'DEPORTES_ACUATICOS',
    macroCategory: 'TURISMO_AVENTURA',
    bookingMode: 'CAPACITY_QUOTA',
    name: 'Escuelas de Surf, Kitesurf y Buceo',
    icon: '🏄',
    description: 'Clases grupales o privadas con instructores certificados y equipos.',
    resourceLabel: { singular: 'Equipo / Tabla / Kit', plural: 'Kits y Equipos' },
    staffLabel: { singular: 'Instructor Certificado', plural: 'Instructores' },
    customerLabel: { singular: 'Alumno / Deporte', plural: 'Alumnos' },
    serviceTitle: '🏄 Clases de Surf y Buceo',
    defaultServiceDemo: {
      name: 'Clase de Surf Personalizada 90 min (Demo)',
      desc: 'Clase teórica en arena y práctica en olas con tabla y lycra incluida.',
      priceCents: 3000,
      durationMin: 90,
    },
    defaultStaffDemo: { name: 'Mateo Surf (Demo)', role: 'Instructor Surf ISA Nivel 2' },
  },
  PARAPENTE: {
    key: 'PARAPENTE',
    macroCategory: 'TURISMO_AVENTURA',
    bookingMode: 'CAPACITY_QUOTA',
    name: 'Agencias de Parapente y Vuelos',
    icon: '🪂',
    description: 'Vuelos biplaza con pilotos experimentados y fotografía/video GoPro.',
    resourceLabel: { singular: 'Equipo Parapente', plural: 'Equipos de Vuelo' },
    staffLabel: { singular: 'Piloto Biplaza', plural: 'Pilotos' },
    customerLabel: { singular: 'Pasajero', plural: 'Pasajeros' },
    serviceTitle: '🪂 Vuelos en Parapente',
    defaultServiceDemo: {
      name: 'Vuelo Biplaza de Acantilado (Demo)',
      desc: 'Vuelo en parapente sobre el acantilado con fotos y videos GoPro HD.',
      priceCents: 5000,
      durationMin: 30,
    },
    defaultStaffDemo: { name: 'Piloto Andrés (Demo)', role: 'Piloto Parapente Tándem Licenciado' },
  },

  RESTAURANTE: {
    key: 'RESTAURANTE',
    macroCategory: 'GASTRONOMIA_EVENTOS',
    bookingMode: 'SPACE_INVENTORY',
    name: 'Restaurantes, Gastrobares y Terrazas',
    icon: '🍽️',
    description: 'Reserva de mesas en terrazas frente al mar, áreas VIP y salones principales.',
    resourceLabel: { singular: 'Mesa / Zonas VIP', plural: 'Mesas y Áreas' },
    staffLabel: { singular: 'Maitre / Hostess', plural: 'Meseros & Sommelier' },
    customerLabel: { singular: 'Comensal', plural: 'Comensales' },
    serviceTitle: '🍽️ Reservas de Mesa y Zonas',
    defaultServiceDemo: {
      name: 'Reserva Mesa Terraza Vista al Mar (Demo)',
      desc: 'Mesa reservada en terraza frente al mar con cóctel de bienvenida incluido.',
      priceCents: 1000,
      durationMin: 90,
    },
    defaultStaffDemo: { name: 'Hostess Valeria (Demo)', role: 'Maitre de Salón' },
  },
  CATA_TALLER: {
    key: 'CATA_TALLER',
    macroCategory: 'GASTRONOMIA_EVENTOS',
    bookingMode: 'CAPACITY_QUOTA',
    name: 'Talleres Gastronómicos y Catas',
    icon: '🍫',
    description: 'Experiencias culinarias: talleres de chocolate fino de aroma, catas de café o vino.',
    resourceLabel: { singular: 'Estación de Taller', plural: 'Estaciones de Cata' },
    staffLabel: { singular: 'Chef / Sommelier / Barista', plural: 'Facilitadores' },
    customerLabel: { singular: 'Participante', plural: 'Participantes' },
    serviceTitle: '🍫 Talleres y Catas Culinarias',
    defaultServiceDemo: {
      name: 'Cata & Taller de Chocolate Fino de Aroma (Demo)',
      desc: 'Experiencia inmersiva con degustación de 5 varietales de cacao ecuatoriano.',
      priceCents: 3500,
      durationMin: 120,
    },
    defaultStaffDemo: { name: 'Master Chocolatier Lucas (Demo)', role: 'Sommelier de Cacao' },
  },
  EVENTOS: {
    key: 'EVENTOS',
    macroCategory: 'GASTRONOMIA_EVENTOS',
    bookingMode: 'CAPACITY_QUOTA',
    name: 'Eventos, Conciertos y Discotecas',
    icon: '🎟️',
    description: 'Pases y entradas a peñas culturales, conciertos en la playa y discotecas.',
    resourceLabel: { singular: 'Zona / Puesta VIP', plural: 'Zonas y Asientos' },
    staffLabel: { singular: 'Organizador / RRPP', plural: 'Equipo de Staff' },
    customerLabel: { singular: 'Asistente', plural: 'Asistentes' },
    serviceTitle: '🎟️ Entradas y Pases a Eventos',
    defaultServiceDemo: {
      name: 'Pase General Concierto Playero (Demo)',
      desc: 'Acceso a fiesta playera con música en vivo y bebida de cortesía.',
      priceCents: 2000,
      durationMin: 240,
    },
    defaultStaffDemo: { name: 'Eventos Producción (Demo)', role: 'Coordinador de Logística' },
  },

  ALQUILER_VEHICULOS: {
    key: 'ALQUILER_VEHICULOS',
    macroCategory: 'ALQUILER_ESPACIOS',
    bookingMode: 'SPACE_INVENTORY',
    name: 'Alquiler de Cuadrones, Buggies y Vehículos',
    icon: '🚜',
    description: 'Alquiler por horas o días de cuadrones, buggies, bicicletas y vehículos turísticos.',
    resourceLabel: { singular: 'Cuadrón / Vehículo', plural: 'Vehículos e Inventario' },
    staffLabel: { singular: 'Agente de Alquiler', plural: 'Encargados' },
    customerLabel: { singular: 'Cliente / Arrendatario', plural: 'Clientes' },
    serviceTitle: '🚜 Cuadrones, Buggies y Bicis',
    defaultServiceDemo: {
      name: 'Alquiler Cuadrón 4x4 por 2 Horas (Demo)',
      desc: 'Cuadrón de 250cc para recorridos de aventura con cascos y gasolina full.',
      priceCents: 3500,
      durationMin: 120,
    },
    defaultStaffDemo: { name: 'Rent-A-Quad Manager (Demo)', role: 'Jefe de Operaciones' },
  },
  CANCHAS: {
    key: 'CANCHAS',
    macroCategory: 'ALQUILER_ESPACIOS',
    bookingMode: 'SPACE_INVENTORY',
    name: 'Canchas Deportivas (Fútbol, Pádel, Tenis)',
    icon: '⚽',
    description: 'Alquiler por horas de canchas sintéticas, pistas de pádel y tenis con iluminación.',
    resourceLabel: { singular: 'Cancha / Pista', plural: 'Canchas Deportivas' },
    staffLabel: { singular: 'Administrador de Canchas', plural: 'Coordinadores' },
    customerLabel: { singular: 'Jugador', plural: 'Jugadores' },
    serviceTitle: '⚽ Reserva de Canchas y Pádel',
    defaultServiceDemo: {
      name: 'Alquiler Cancha Pádel 60 min (Demo)',
      desc: 'Pista de pádel profesional con césped azul e iluminación LED nocturna.',
      priceCents: 2000,
      durationMin: 60,
    },
    defaultStaffDemo: { name: 'Coordinador Deportivo (Demo)', role: 'Encargado de Canchas' },
  },
  COWORKING: {
    key: 'COWORKING',
    macroCategory: 'ALQUILER_ESPACIOS',
    bookingMode: 'SPACE_INVENTORY',
    name: 'Espacios de Coworking y Salas',
    icon: '💻',
    description: 'Escritorios individuales, oficinas privadas y salas de reuniones por horas.',
    resourceLabel: { singular: 'Escritorio / Sala', plural: 'Escritorios y Salas' },
    staffLabel: { singular: 'Host de Coworking', plural: 'Comunidad' },
    customerLabel: { singular: 'Miembro / Co-worker', plural: 'Miembros' },
    serviceTitle: '💻 Escritorios y Salas de Reunión',
    defaultServiceDemo: {
      name: 'Pase Diario Escritorio Hot Desk (Demo)',
      desc: 'Acceso todo el día a escritorio compartido, fibra óptica 500MB y café ilimitado.',
      priceCents: 1200,
      durationMin: 480,
    },
    defaultStaffDemo: { name: 'Community Manager (Demo)', role: 'Host de Espacios' },
  },
  CAR_WASH: {
    key: 'CAR_WASH',
    macroCategory: 'ALQUILER_ESPACIOS',
    bookingMode: 'HOURLY_APPOINTMENT',
    name: 'Centros de Lavado Automotriz (Car Wash)',
    icon: '🚗',
    description: 'Turnos para limpieza profunda de vehículos, chasis, aspirado y detallado.',
    resourceLabel: { singular: 'Bahía de Lavado', plural: 'Bahías de Lavado' },
    staffLabel: { singular: 'Lavador / Detallador', plural: 'Detalladores' },
    customerLabel: { singular: 'Cliente', plural: 'Clientes' },
    serviceTitle: '🚗 Serviteca y Lavado Automotriz',
    defaultServiceDemo: {
      name: 'Lavado Completo & Cera Express (Demo)',
      desc: 'Lavado exterior a presión, aspirado de interiores, gel de llantas y cera líquida.',
      priceCents: 1200,
      durationMin: 45,
    },
    defaultStaffDemo: { name: 'Jefe de Lavadero (Demo)', role: 'Encargado de Calidad' },
  },
};

/**
 * Returns true if the industry operates on nightly (check-in / check-out) basis.
 */
export function isNightlyIndustry(industry?: string | null): boolean {
  if (!industry) return false;
  const config = INDUSTRIES_REGISTRY[industry as IndustryType];
  return config ? config.bookingMode === 'NIGHTLY' : industry === 'HOSTAL';
}

/**
 * Retrieves configuration for a given industry. Falls back to HOSTAL if unknown.
 */
export function getIndustryConfig(industry?: string | null): IndustryConfig {
  if (industry && (industry in INDUSTRIES_REGISTRY)) {
    return INDUSTRIES_REGISTRY[industry as IndustryType];
  }
  return INDUSTRIES_REGISTRY.HOSTAL;
}

/**
 * Groups all 17 industries under their respective 5 macro categories.
 */
export function getIndustriesByCategory(): Record<MacroCategory, IndustryConfig[]> {
  const result: Record<MacroCategory, IndustryConfig[]> = {
    ALOJAMIENTO: [],
    SALUD_BELLEZA: [],
    TURISMO_AVENTURA: [],
    GASTRONOMIA_EVENTOS: [],
    ALQUILER_ESPACIOS: [],
  };

  for (const config of Object.values(INDUSTRIES_REGISTRY)) {
    result[config.macroCategory].push(config);
  }

  return result;
}
