/**
 * Datos geográficos de Ecuador: 24 provincias con sus cantones y parroquias.
 * Fuente: División político-administrativa oficial del Ecuador (INEC).
 */

export type Parroquia = {
  nombre: string;
};

export type Canton = {
  nombre: string;
  parroquias: Parroquia[];
};

export type Provincia = {
  nombre: string;
  cantones: Canton[];
};

export const ECUADOR_GEO: Provincia[] = [
  {
    nombre: 'Azuay',
    cantones: [
      { nombre: 'Cuenca', parroquias: [{ nombre: 'Bellavista' }, { nombre: 'Cañaribamba' }, { nombre: 'El Batán' }, { nombre: 'El Sagrario' }, { nombre: 'El Vecino' }, { nombre: 'Gil Ramírez Dávalos' }, { nombre: 'Hermano Miguel' }, { nombre: 'Huayna Cápac' }, { nombre: 'Machángara' }, { nombre: 'Monay' }, { nombre: 'San Blas' }, { nombre: 'San Sebastián' }, { nombre: 'Sucre' }, { nombre: 'Totoracocha' }, { nombre: 'Yanuncay' }, { nombre: 'Baños' }, { nombre: 'Checa' }, { nombre: 'Chiquintad' }, { nombre: 'Cumbe' }, { nombre: 'El Valle' }, { nombre: 'Llacao' }, { nombre: 'Molleturo' }, { nombre: 'Nulti' }, { nombre: 'Octavio Cordero Palacios' }, { nombre: 'Paccha' }, { nombre: 'Quingeo' }, { nombre: 'Ricaurte' }, { nombre: 'San Joaquín' }, { nombre: 'Santa Ana' }, { nombre: 'Sayausí' }, { nombre: 'Sidcay' }, { nombre: 'Sinincay' }, { nombre: 'Tarqui' }, { nombre: 'Turi' }, { nombre: 'Victoria del Portete' }] },
      { nombre: 'Girón', parroquias: [{ nombre: 'Girón' }, { nombre: 'Asunción' }, { nombre: 'San Gerardo' }] },
      { nombre: 'Gualaceo', parroquias: [{ nombre: 'Gualaceo' }, { nombre: 'Daniel Córdova Toral' }, { nombre: 'Jadán' }, { nombre: 'Jersusalén' }, { nombre: 'Luis Cordero Vega' }, { nombre: 'Mariano Moreno' }, { nombre: 'Remigio Crespo Toral' }, { nombre: 'San Juan' }, { nombre: 'Simón Bolívar' }] },
      { nombre: 'Nabón', parroquias: [{ nombre: 'Nabón' }, { nombre: 'El Progreso' }, { nombre: 'Las Nieves' }, { nombre: 'Cochapata' }] },
      { nombre: 'Paute', parroquias: [{ nombre: 'Paute' }, { nombre: 'Chicán' }, { nombre: 'El Cabo' }, { nombre: 'Guarainag' }, { nombre: 'San Cristóbal' }] },
      { nombre: 'Pucará', parroquias: [{ nombre: 'Pucará' }, { nombre: 'El Carmen de Pijilí' }, { nombre: 'San Rafael de Sharug' }] },
      { nombre: 'San Fernando', parroquias: [{ nombre: 'San Fernando' }, { nombre: 'Chumblín' }] },
      { nombre: 'Santa Isabel', parroquias: [{ nombre: 'Santa Isabel' }, { nombre: 'Cañaribamba' }, { nombre: 'El Carmen de Pijilí' }, { nombre: 'Shaglli' }] },
      { nombre: 'Sigsig', parroquias: [{ nombre: 'Sigsig' }, { nombre: 'Cuchil' }, { nombre: 'Güel' }, { nombre: 'Ludo' }, { nombre: 'San Bartolomé' }, { nombre: 'San José de Raranga' }] },
    ],
  },
  {
    nombre: 'Bolívar',
    cantones: [
      { nombre: 'Guaranda', parroquias: [{ nombre: 'Guaranda' }, { nombre: 'Ángel Polibio Chaves' }, { nombre: 'Gabriel Ignacio Veintimilla' }, { nombre: 'Guanujo' }, { nombre: 'Simiatug' }] },
      { nombre: 'Caluma', parroquias: [{ nombre: 'Caluma' }] },
      { nombre: 'Chillanes', parroquias: [{ nombre: 'Chillanes' }, { nombre: 'San José del Tambo' }] },
      { nombre: 'Chimbo', parroquias: [{ nombre: 'Chimbo' }, { nombre: 'Asunción' }, { nombre: 'La Magdalena' }, { nombre: 'San José de Chimbo' }, { nombre: 'San Sebastián' }, { nombre: 'Telimbela' }] },
      { nombre: 'Echeandía', parroquias: [{ nombre: 'Echeandía' }] },
      { nombre: 'Las Naves', parroquias: [{ nombre: 'Las Naves' }] },
      { nombre: 'San Miguel', parroquias: [{ nombre: 'San Miguel' }, { nombre: 'Bilován' }, { nombre: 'La Unión' }, { nombre: 'Régulo de Mora' }, { nombre: 'San Pablo' }, { nombre: 'San Vicente' }] },
    ],
  },
  {
    nombre: 'Cañar',
    cantones: [
      { nombre: 'Azogues', parroquias: [{ nombre: 'Azogues' }, { nombre: 'Bayas' }, { nombre: 'Borrero' }, { nombre: 'Cojitambo' }, { nombre: 'Guapán' }, { nombre: 'Javier Loyola' }, { nombre: 'Luis Cordero' }, { nombre: 'Pindilig' }, { nombre: 'Rivera' }, { nombre: 'San Miguel' }, { nombre: 'Taday' }] },
      { nombre: 'Biblián', parroquias: [{ nombre: 'Biblián' }, { nombre: 'Curídamba' }, { nombre: 'Jerusalén' }, { nombre: 'Nazón' }, { nombre: 'San Francisco de Sageo' }] },
      { nombre: 'Cañar', parroquias: [{ nombre: 'Cañar' }, { nombre: 'Chontamarca' }, { nombre: 'Chorocopte' }, { nombre: 'Ducur' }, { nombre: 'General Morales' }, { nombre: 'Gualleturo' }, { nombre: 'Honorato Vásquez' }, { nombre: 'Ingapirca' }, { nombre: 'Juncal' }, { nombre: 'San Antonio de Paguancay' }, { nombre: 'Suscal' }, { nombre: 'Ventura' }, { nombre: 'Zhud' }] },
      { nombre: 'El Tambo', parroquias: [{ nombre: 'El Tambo' }] },
      { nombre: 'La Troncal', parroquias: [{ nombre: 'La Troncal' }, { nombre: 'Manuel de J. Calle' }, { nombre: 'Pancho Negro' }] },
      { nombre: 'Suscal', parroquias: [{ nombre: 'Suscal' }] },
    ],
  },
  {
    nombre: 'Carchi',
    cantones: [
      { nombre: 'Tulcán', parroquias: [{ nombre: 'Tulcán' }, { nombre: 'El Carmelo' }, { nombre: 'Julio Andrade' }, { nombre: 'Maldonado' }, { nombre: 'Pioter' }, { nombre: 'Tobar Donoso' }, { nombre: 'Tufiño' }, { nombre: 'Urbina' }] },
      { nombre: 'Bolívar', parroquias: [{ nombre: 'Bolívar' }, { nombre: 'García Moreno' }, { nombre: 'Los Andes' }, { nombre: 'Monte Olivo' }, { nombre: 'San Rafael' }, { nombre: 'San Vicente de Pusir' }] },
      { nombre: 'Espejo', parroquias: [{ nombre: 'El Ángel' }, { nombre: 'El Goaltal' }, { nombre: 'La Libertad' }, { nombre: 'San Isidro' }] },
      { nombre: 'Mira', parroquias: [{ nombre: 'Mira' }, { nombre: 'Concepción' }, { nombre: 'Juan Montalvo' }, { nombre: 'La Portada' }] },
      { nombre: 'Montúfar', parroquias: [{ nombre: 'San Gabriel' }, { nombre: 'Chitán de Navarretes' }, { nombre: 'Cristóbal Colón' }, { nombre: 'Fernández Salvador' }, { nombre: 'La Paz' }, { nombre: 'Piartal' }] },
    ],
  },
  {
    nombre: 'Chimborazo',
    cantones: [
      { nombre: 'Riobamba', parroquias: [{ nombre: 'Riobamba' }, { nombre: 'Cacha' }, { nombre: 'Calpi' }, { nombre: 'Cubijíes' }, { nombre: 'Flores' }, { nombre: 'Lican' }, { nombre: 'Licto' }, { nombre: 'Pungalá' }, { nombre: 'Punín' }, { nombre: 'Quimiag' }, { nombre: 'San Juan' }, { nombre: 'San Luis' }] },
      { nombre: 'Alausí', parroquias: [{ nombre: 'Alausí' }, { nombre: 'Achupallas' }, { nombre: 'Chunchi' }, { nombre: 'Huigra' }, { nombre: 'Multitud' }, { nombre: 'Pistishí' }, { nombre: 'Pumallacta' }, { nombre: 'Sevilla' }, { nombre: 'Sibambe' }, { nombre: 'Tixán' }] },
      { nombre: 'Chambo', parroquias: [{ nombre: 'Chambo' }] },
      { nombre: 'Chunchi', parroquias: [{ nombre: 'Chunchi' }, { nombre: 'Capsol' }, { nombre: 'Compud' }, { nombre: 'Gonzol' }, { nombre: 'Llagos' }] },
      { nombre: 'Guamote', parroquias: [{ nombre: 'Guamote' }, { nombre: 'Cebadas' }, { nombre: 'Palmira' }] },
      { nombre: 'Guano', parroquias: [{ nombre: 'Guano' }, { nombre: 'El Rosario' }, { nombre: 'Ilapo' }, { nombre: 'La Providencia' }, { nombre: 'San Andrés' }, { nombre: 'San Gerardo' }, { nombre: 'Santa Fe de Galán' }, { nombre: 'Valparaíso' }] },
      { nombre: 'Pallatanga', parroquias: [{ nombre: 'Pallatanga' }] },
      { nombre: 'Penipe', parroquias: [{ nombre: 'Penipe' }, { nombre: 'La Candelaria' }, { nombre: 'Matus' }, { nombre: 'Puela' }, { nombre: 'San Antonio de Bayushig' }] },
    ],
  },
  {
    nombre: 'Cotopaxi',
    cantones: [
      { nombre: 'Latacunga', parroquias: [{ nombre: 'Latacunga' }, { nombre: 'Aláquez' }, { nombre: 'Belisario Quevedo' }, { nombre: 'Guaytacama' }, { nombre: 'Joseguango Bajo' }, { nombre: 'Mulaló' }, { nombre: 'Poaló' }, { nombre: 'San Juan de Pastocalle' }, { nombre: 'Tanicuchí' }, { nombre: 'Toacaso' }] },
      { nombre: 'La Maná', parroquias: [{ nombre: 'La Maná' }, { nombre: 'El Carmen' }, { nombre: 'El Triunfo' }, { nombre: 'Guasaganda' }, { nombre: 'Pucayacu' }] },
      { nombre: 'Pangua', parroquias: [{ nombre: 'El Corazón' }, { nombre: 'Moraspungo' }, { nombre: 'Pinllopata' }, { nombre: 'Ramón Campaña' }] },
      { nombre: 'Pujilí', parroquias: [{ nombre: 'Pujilí' }, { nombre: 'Angamarca' }, { nombre: 'Guangaje' }, { nombre: 'La Victoria' }, { nombre: 'Pilaló' }, { nombre: 'Tingo' }, { nombre: 'Zumbahua' }] },
      { nombre: 'Salcedo', parroquias: [{ nombre: 'San Miguel de Salcedo' }, { nombre: 'Antonio José Holguín' }, { nombre: 'Cusubamba' }, { nombre: 'Mulalillo' }, { nombre: 'Mulliquindil' }, { nombre: 'Panzaleo' }] },
      { nombre: 'Saquisilí', parroquias: [{ nombre: 'Saquisilí' }, { nombre: 'Canchaló' }, { nombre: 'Chantilín' }, { nombre: 'Cochapamba' }] },
      { nombre: 'Sigchos', parroquias: [{ nombre: 'Sigchos' }, { nombre: 'Chugchilán' }, { nombre: 'Isinliví' }, { nombre: 'Las Pampas' }, { nombre: 'Palo Quemado' }] },
    ],
  },
  {
    nombre: 'El Oro',
    cantones: [
      { nombre: 'Machala', parroquias: [{ nombre: 'Machala' }, { nombre: 'El Cambio' }, { nombre: 'El Retiro' }, { nombre: 'La Providencia' }, { nombre: 'Nueve de Mayo' }] },
      { nombre: 'Arenillas', parroquias: [{ nombre: 'Arenillas' }, { nombre: 'Carcabón' }, { nombre: 'La Victoria' }, { nombre: 'Palmales' }] },
      { nombre: 'Atahualpa', parroquias: [{ nombre: 'Paccha' }, { nombre: 'Ayapamba' }, { nombre: 'Cordoncillo' }, { nombre: 'Milagro' }, { nombre: 'San José' }] },
      { nombre: 'Balsas', parroquias: [{ nombre: 'Balsas' }, { nombre: 'Bellamaria' }] },
      { nombre: 'Chilla', parroquias: [{ nombre: 'Chilla' }] },
      { nombre: 'El Guabo', parroquias: [{ nombre: 'El Guabo' }, { nombre: 'La Iberia' }, { nombre: 'Río Bonito' }] },
      { nombre: 'Huaquillas', parroquias: [{ nombre: 'Huaquillas' }, { nombre: 'El Paraíso' }, { nombre: 'Hualtaco' }, { nombre: 'Milton Reyes' }] },
      { nombre: 'Las Lajas', parroquias: [{ nombre: 'Las Lajas' }] },
      { nombre: 'Marcabelí', parroquias: [{ nombre: 'Marcabelí' }, { nombre: 'El Ingenio' }] },
      { nombre: 'Pasaje', parroquias: [{ nombre: 'Pasaje' }, { nombre: 'Buenavista' }, { nombre: 'Cañaquemada' }, { nombre: 'El Progreso' }, { nombre: 'La Peaña' }, { nombre: 'Lomas de Sargentillo' }, { nombre: 'Progreso' }, { nombre: 'Santa Rosa' }, { nombre: 'Uzhcurrumi' }] },
      { nombre: 'Piñas', parroquias: [{ nombre: 'Piñas' }, { nombre: 'Capiro' }, { nombre: 'La Bocana' }, { nombre: 'Moromoro' }, { nombre: 'Piedras' }, { nombre: 'San Roque' }, { nombre: 'Saracay' }] },
      { nombre: 'Portovelo', parroquias: [{ nombre: 'Portovelo' }, { nombre: 'Curtincápac' }, { nombre: 'Morales' }, { nombre: 'Salati' }] },
      { nombre: 'Santa Rosa', parroquias: [{ nombre: 'Santa Rosa' }, { nombre: 'Bellavista' }, { nombre: 'Jambelí' }, { nombre: 'La Avanzada' }, { nombre: 'Machala' }, { nombre: 'San Antonio' }, { nombre: 'Victoria' }] },
      { nombre: 'Zaruma', parroquias: [{ nombre: 'Zaruma' }, { nombre: 'Abañín' }, { nombre: 'Arcapamba' }, { nombre: 'Guanazán' }, { nombre: 'Güizhaguiña' }, { nombre: 'Huertas' }, { nombre: 'Malvas' }, { nombre: 'Muluncay San Cristóbal' }, { nombre: 'Sinsao' }] },
    ],
  },
  {
    nombre: 'Esmeraldas',
    cantones: [
      { nombre: 'Esmeraldas', parroquias: [{ nombre: 'Esmeraldas' }, { nombre: 'Atacames' }, { nombre: 'Camarones' }, { nombre: 'Las Palmas' }, { nombre: 'Luis Tello' }, { nombre: 'Simón Plata Torres' }, { nombre: 'Vuelta Larga' }] },
      { nombre: 'Atacames', parroquias: [{ nombre: 'Atacames' }, { nombre: 'La Unión' }, { nombre: 'Sua' }, { nombre: 'Tonsupa' }, { nombre: 'Tonchigüe' }] },
      { nombre: 'Eloy Alfaro', parroquias: [{ nombre: 'Valdez' }, { nombre: 'Anchayacu' }, { nombre: 'Atahualpa' }, { nombre: 'Borbón' }, { nombre: 'La Tola' }, { nombre: 'Limones' }, { nombre: 'Luis Vargas Torres' }, { nombre: 'Malimpia' }, { nombre: 'Pampanal de Bolívar' }, { nombre: 'Santo Domingo de Onzole' }, { nombre: 'San Francisco de Onzole' }, { nombre: 'Selva Alegre' }, { nombre: 'Timbiré' }, { nombre: 'Timbiquí' }, { nombre: 'Telembí' }, { nombre: 'Colón Eloy del María' }, { nombre: 'Colon' }] },
      { nombre: 'Muisne', parroquias: [{ nombre: 'Muisne' }, { nombre: 'Bolívar' }, { nombre: 'Daule' }, { nombre: 'Galera' }, { nombre: 'La Unión' }, { nombre: 'Quingue' }, { nombre: 'Salima' }, { nombre: 'San Francisco' }, { nombre: 'San José de Chamanga' }] },
      { nombre: 'Quinindé', parroquias: [{ nombre: 'Rosa Zárate' }, { nombre: 'Cube' }, { nombre: 'La Unión' }, { nombre: 'Malimpia' }, { nombre: 'Viche' }] },
      { nombre: 'Río Verde', parroquias: [{ nombre: 'Río Verde' }, { nombre: 'Chumundé' }, { nombre: 'Lagarto' }, { nombre: 'Montalvo' }] },
      { nombre: 'San Lorenzo', parroquias: [{ nombre: 'San Lorenzo' }, { nombre: 'Alto Tambo' }, { nombre: 'Ancón' }, { nombre: 'Calderón' }, { nombre: 'Carondelet' }, { nombre: 'Concepción' }, { nombre: 'Mataje' }, { nombre: 'Santa Rita' }, { nombre: 'Tambillo' }, { nombre: 'Tobar Donoso' }] },
    ],
  },
  {
    nombre: 'Galápagos',
    cantones: [
      { nombre: 'Puerto Ayora', parroquias: [{ nombre: 'Santa Cruz' }, { nombre: 'Baltra' }] },
      { nombre: 'San Cristóbal', parroquias: [{ nombre: 'Puerto Baquerizo Moreno' }, { nombre: 'El Progreso' }] },
      { nombre: 'Isabela', parroquias: [{ nombre: 'Puerto Villamil' }, { nombre: 'Tomás de Berlanga' }] },
    ],
  },
  {
    nombre: 'Guayas',
    cantones: [
      { nombre: 'Guayaquil', parroquias: [{ nombre: 'Guayaquil' }, { nombre: 'Tarqui' }, { nombre: 'Ximena' }, { nombre: 'Letamendi' }, { nombre: 'Febres-Cordero' }, { nombre: 'Sucre' }, { nombre: 'García Moreno' }, { nombre: 'Rocafuerte' }, { nombre: 'Olmedo' }, { nombre: 'Ayacucho' }, { nombre: 'Carbo' }, { nombre: 'Bolívar' }, { nombre: 'Roca' }, { nombre: 'Urdaneta' }, { nombre: 'Pascuales' }, { nombre: 'Chongón' }] },
      { nombre: 'Alfredo Baquerizo Moreno', parroquias: [{ nombre: 'Jujan' }] },
      { nombre: 'Balao', parroquias: [{ nombre: 'Balao' }] },
      { nombre: 'Balzar', parroquias: [{ nombre: 'Balzar' }] },
      { nombre: 'Colimes', parroquias: [{ nombre: 'Colimes' }, { nombre: 'Buen Retiro' }] },
      { nombre: 'Daule', parroquias: [{ nombre: 'Daule' }, { nombre: 'Juan Bautista Aguirre' }, { nombre: 'La Aurora' }, { nombre: 'Los Lojas' }] },
      { nombre: 'Durán', parroquias: [{ nombre: 'Eloy Alfaro' }] },
      { nombre: 'El Empalme', parroquias: [{ nombre: 'El Empalme' }, { nombre: 'El Rosario' }] },
      { nombre: 'El Triunfo', parroquias: [{ nombre: 'El Triunfo' }] },
      { nombre: 'General Antonio Elizalde', parroquias: [{ nombre: 'Bucay' }] },
      { nombre: 'Isidro Ayora', parroquias: [{ nombre: 'Isidro Ayora' }] },
      { nombre: 'Lomas de Sargentillo', parroquias: [{ nombre: 'Lomas de Sargentillo' }] },
      { nombre: 'Marcelino Maridueña', parroquias: [{ nombre: 'Marcelino Maridueña' }] },
      { nombre: 'Milagro', parroquias: [{ nombre: 'Milagro' }, { nombre: 'Chobo' }, { nombre: 'Cinco de Junio' }, { nombre: 'Ernesto Seminario' }, { nombre: 'Mariscal Sucre' }] },
      { nombre: 'Naranjal', parroquias: [{ nombre: 'Naranjal' }, { nombre: 'Chiran' }, { nombre: 'Jesús María' }, { nombre: 'Santa Rosa de Flandes' }, { nombre: 'Taura' }] },
      { nombre: 'Naranjito', parroquias: [{ nombre: 'Naranjito' }] },
      { nombre: 'Nobol', parroquias: [{ nombre: 'Narcisa de Jesús' }] },
      { nombre: 'Palestina', parroquias: [{ nombre: 'Palestina' }] },
      { nombre: 'Pedro Carbo', parroquias: [{ nombre: 'Pedro Carbo' }, { nombre: 'Colonche' }, { nombre: 'Sabanilla' }] },
      { nombre: 'Playas', parroquias: [{ nombre: 'General Villamil' }] },
      { nombre: 'Salitre', parroquias: [{ nombre: 'Urbina Jado' }, { nombre: 'Gral. Lorenzo Certero' }, { nombre: 'La Victoria' }] },
      { nombre: 'Samborondón', parroquias: [{ nombre: 'Samborondón' }, { nombre: 'La Puntilla' }] },
      { nombre: 'Santa Lucía', parroquias: [{ nombre: 'Santa Lucía' }] },
      { nombre: 'Simón Bolívar', parroquias: [{ nombre: 'Simón Bolívar' }, { nombre: 'Lorenzo de Garaicoa' }] },
      { nombre: 'Yaguachi', parroquias: [{ nombre: 'Yaguachi Nuevo' }, { nombre: 'Gral. Pedro J. Montero' }, { nombre: 'Virgen de Fátima' }, { nombre: 'Yaguachi Viejo' }] },
    ],
  },
  {
    nombre: 'Imbabura',
    cantones: [
      { nombre: 'Ibarra', parroquias: [{ nombre: 'Ibarra' }, { nombre: 'Ambuquí' }, { nombre: 'Angochagua' }, { nombre: 'Carolina' }, { nombre: 'La Esperanza' }, { nombre: 'Lita' }, { nombre: 'Salinas' }, { nombre: 'San Antonio' }] },
      { nombre: 'Antonio Ante', parroquias: [{ nombre: 'Atuntaqui' }, { nombre: 'Andrade Marín' }, { nombre: 'Imbaya' }, { nombre: 'Natabuela' }, { nombre: 'Pilahúin' }, { nombre: 'San Roque' }] },
      { nombre: 'Cotacachi', parroquias: [{ nombre: 'Santa Ana de Cotacachi' }, { nombre: 'Apuela' }, { nombre: 'García Moreno' }, { nombre: 'Imantag' }, { nombre: 'Peñaherrera' }, { nombre: 'Plaza Gutiérrez' }, { nombre: 'Quiroga' }, { nombre: 'Vacas Galindo' }] },
      { nombre: 'Otavalo', parroquias: [{ nombre: 'Otavalo' }, { nombre: 'Dr. Miguel Egas Cabezas' }, { nombre: 'Eugenio Espejo' }, { nombre: 'González Suárez' }, { nombre: 'Ilumán' }, { nombre: 'Pataquí' }, { nombre: 'San José de Quichinche' }, { nombre: 'San Juan de Ilumán' }, { nombre: 'San Pablo' }, { nombre: 'San Rafael' }, { nombre: 'Selva Alegre' }] },
      { nombre: 'Pimampiro', parroquias: [{ nombre: 'Pimampiro' }, { nombre: 'Chuga' }, { nombre: 'Mariano Acosta' }, { nombre: 'San Francisco de Sigsipamba' }] },
      { nombre: 'Urcuquí', parroquias: [{ nombre: 'Urcuquí' }, { nombre: 'Cahuasquí' }, { nombre: 'La Merced de Buenos Aires' }, { nombre: 'Pablo Arenas' }, { nombre: 'San Blas' }, { nombre: 'Tumbabiro' }] },
    ],
  },
  {
    nombre: 'Loja',
    cantones: [
      { nombre: 'Loja', parroquias: [{ nombre: 'Loja' }, { nombre: 'Chantaco' }, { nombre: 'Chuquiribamba' }, { nombre: 'El Sagrario' }, { nombre: 'Gualel' }, { nombre: 'Jimbilla' }, { nombre: 'Malacatos' }, { nombre: 'San Lucas' }, { nombre: 'San Pedro de Vilcabamba' }, { nombre: 'Santiago' }, { nombre: 'Sucre' }, { nombre: 'Taquil' }, { nombre: 'Vilcabamba' }, { nombre: 'Yangana' }] },
      { nombre: 'Calvas', parroquias: [{ nombre: 'Cariamanga' }, { nombre: 'Chile' }, { nombre: 'Colaisaca' }, { nombre: 'El Lucero' }, { nombre: 'Sanguillín' }, { nombre: 'San Vicente' }, { nombre: 'Utuana' }] },
      { nombre: 'Catamayo', parroquias: [{ nombre: 'Catamayo' }, { nombre: 'El Tambo' }, { nombre: 'Guanábana' }, { nombre: 'La Toma' }, { nombre: 'San Pedro de la Bendita' }] },
      { nombre: 'Celica', parroquias: [{ nombre: 'Celica' }, { nombre: 'Cruzpamba' }, { nombre: 'El Porvenir del Carmen' }, { nombre: 'Lucero' }, { nombre: 'Pindal' }, { nombre: 'Pozul' }, { nombre: 'Sabanilla' }, { nombre: 'Teniente Maximiliano Rodríguez Loaiza' }] },
      { nombre: 'Chaguarpamba', parroquias: [{ nombre: 'Chaguarpamba' }, { nombre: 'Buenavista' }, { nombre: 'El Rosario' }, { nombre: 'Orianga' }, { nombre: 'Santa Rufina' }] },
      { nombre: 'Espíndola', parroquias: [{ nombre: 'Amaluza' }, { nombre: 'Bellavista' }, { nombre: 'Jimbura' }, { nombre: 'Santa Teresita' }, { nombre: 'El Airo' }, { nombre: 'El Ingenio' }, { nombre: 'Quinara' }] },
      { nombre: 'Gonzanamá', parroquias: [{ nombre: 'Gonzanamá' }, { nombre: 'Changaimina' }, { nombre: 'Nambacola' }, { nombre: 'Purunuma' }, { nombre: 'Sacapalca' }] },
      { nombre: 'Macará', parroquias: [{ nombre: 'Macará' }, { nombre: 'Larama' }, { nombre: 'La Victoria' }, { nombre: 'Sabiango' }] },
      { nombre: 'Paltas', parroquias: [{ nombre: 'Catacocha' }, { nombre: 'Cangonamá' }, { nombre: 'Guachanamá' }, { nombre: 'La Tingue' }, { nombre: 'Lauro Guerrero' }, { nombre: 'Orianga' }, { nombre: 'San Antonio' }, { nombre: 'Yamana' }] },
      { nombre: 'Puyango', parroquias: [{ nombre: 'Alamor' }, { nombre: 'Ciano' }, { nombre: 'El Arenal' }, { nombre: 'El Limo' }, { nombre: 'Mercadillo' }, { nombre: 'Vicentino' }] },
      { nombre: 'Quilanga', parroquias: [{ nombre: 'Quilanga' }, { nombre: 'Fundochamba' }, { nombre: 'San Antonio de las Aradas' }] },
      { nombre: 'Saraguro', parroquias: [{ nombre: 'Saraguro' }, { nombre: 'El Tablón' }, { nombre: 'Lluzhapa' }, { nombre: 'Manu' }, { nombre: 'San Antonio de Cumbe' }, { nombre: 'San Pablo de Tenta' }, { nombre: 'San Sebastián de Yúluc' }, { nombre: 'Selva Alegre' }, { nombre: 'Urdaneta' }, { nombre: 'Yayguaje' }] },
      { nombre: 'Sozoranga', parroquias: [{ nombre: 'Sozoranga' }, { nombre: 'Nueva Fátima' }, { nombre: 'Tacamoros' }] },
      { nombre: 'Zapotillo', parroquias: [{ nombre: 'Zapotillo' }, { nombre: 'Bolaspamba' }, { nombre: 'Cazaderos' }, { nombre: 'Garzareal' }, { nombre: 'Limones' }, { nombre: 'Mangahurco' }, { nombre: 'Paletillas' }] },
    ],
  },
  {
    nombre: 'Los Ríos',
    cantones: [
      { nombre: 'Babahoyo', parroquias: [{ nombre: 'Babahoyo' }, { nombre: 'Camilo Ponce Enríquez' }, { nombre: 'Clemente Baquerizo' }, { nombre: 'El Salto' }, { nombre: 'Febres Cordero' }, { nombre: 'La Unión' }, { nombre: 'Pimocha' }, { nombre: 'Ricaurte' }] },
      { nombre: 'Baba', parroquias: [{ nombre: 'Baba' }, { nombre: 'Guare' }, { nombre: 'Isla de Bejucal' }] },
      { nombre: 'Buena Fé', parroquias: [{ nombre: 'Buena Fe' }, { nombre: 'Patricia Pilar' }] },
      { nombre: 'Mocache', parroquias: [{ nombre: 'Mocache' }, { nombre: 'La Unión' }] },
      { nombre: 'Montalvo', parroquias: [{ nombre: 'Montalvo' }] },
      { nombre: 'Palenque', parroquias: [{ nombre: 'Palenque' }] },
      { nombre: 'Puebloviejo', parroquias: [{ nombre: 'Puebloviejo' }, { nombre: 'Puerto Pechiche' }, { nombre: 'San Juan' }] },
      { nombre: 'Quevedo', parroquias: [{ nombre: 'Quevedo' }, { nombre: 'Nicolás Infante Díaz' }, { nombre: 'San Carlos' }, { nombre: 'San Cristóbal' }, { nombre: 'Venus del Río Quevedo' }, { nombre: 'Viva Alfaro' }] },
      { nombre: 'Quinsaloma', parroquias: [{ nombre: 'Quinsaloma' }] },
      { nombre: 'Urdaneta', parroquias: [{ nombre: 'Catarama' }, { nombre: 'Ricaurte' }, { nombre: 'Ventanas' }, { nombre: 'Zapotal' }] },
      { nombre: 'Valencia', parroquias: [{ nombre: 'Valencia' }, { nombre: 'La Unión' }] },
      { nombre: 'Ventanas', parroquias: [{ nombre: 'Ventanas' }, { nombre: 'Zapotal' }] },
      { nombre: 'Vinces', parroquias: [{ nombre: 'Vinces' }, { nombre: 'Antonio Sotomayor' }, { nombre: 'Isla de Bejucal' }] },
    ],
  },
  {
    nombre: 'Manabí',
    cantones: [
      { nombre: 'Portoviejo', parroquias: [{ nombre: 'Portoviejo' }, { nombre: 'Andrés de Vera' }, { nombre: 'Colón' }, { nombre: 'Crucita' }, { nombre: 'Francisco Pacheco' }, { nombre: 'La Unión' }, { nombre: 'Picoazá' }, { nombre: 'Pueblo Nuevo' }, { nombre: 'Riochico' }, { nombre: 'San Plácido' }] },
      { nombre: 'Chone', parroquias: [{ nombre: 'Chone' }, { nombre: 'Boyacá' }, { nombre: 'Convento' }, { nombre: 'Eloy Alfaro' }, { nombre: 'Estancilla' }, { nombre: 'Santa Rita' }] },
      { nombre: 'El Carmen', parroquias: [{ nombre: 'El Carmen' }, { nombre: '14 de Marzo' }, { nombre: 'Wilfrido Loor Moreira' }] },
      { nombre: 'Flavio Alfaro', parroquias: [{ nombre: 'Flavio Alfaro' }, { nombre: 'Zapallo' }] },
      { nombre: 'Jipijapa', parroquias: [{ nombre: 'Jipijapa' }, { nombre: 'El Anegado' }, { nombre: 'Julcuy' }, { nombre: 'La Unión' }, { nombre: 'Membrillal' }, { nombre: 'Pedro Pablo Gómez' }, { nombre: 'Puerto Cayo' }] },
      { nombre: 'La Concordia', parroquias: [{ nombre: 'La Concordia' }, { nombre: 'La Villegas' }] },
      { nombre: 'Manta', parroquias: [{ nombre: 'Manta' }, { nombre: 'Los Esteros' }, { nombre: 'San Mateo' }, { nombre: 'Santa Marianita de Jesús' }, { nombre: 'Tarqui' }] },
      { nombre: 'Montecristi', parroquias: [{ nombre: 'Montecristi' }, { nombre: 'Abdón Calderón' }, { nombre: 'Chirijos' }, { nombre: 'La Pila' }] },
      { nombre: 'Paján', parroquias: [{ nombre: 'Paján' }, { nombre: 'Cascol' }, { nombre: 'Guale' }, { nombre: 'Lascano' }, { nombre: 'Membrillo' }] },
      { nombre: 'Pedernales', parroquias: [{ nombre: 'Pedernales' }, { nombre: 'Cojimíes' }, { nombre: 'Olmedo' }] },
      { nombre: 'Pichincha', parroquias: [{ nombre: 'Pichincha' }, { nombre: 'Barraganete' }, { nombre: 'El Palmar' }, { nombre: 'Ríochico' }, { nombre: 'San Sebastián' }] },
      { nombre: 'Rocafuerte', parroquias: [{ nombre: 'Rocafuerte' }] },
      { nombre: 'Santa Ana', parroquias: [{ nombre: 'Santa Ana' }, { nombre: 'Ayacucho' }, { nombre: 'La Unión' }, { nombre: 'Lodana' }, { nombre: 'Olmedo' }, { nombre: 'San Pablo' }] },
      { nombre: 'Sucre', parroquias: [{ nombre: 'Bahía de Caráquez' }, { nombre: 'Canoa' }, { nombre: 'Charapotó' }, { nombre: 'Leonidas Plaza' }, { nombre: 'San Isidro' }] },
      { nombre: 'Tosagua', parroquias: [{ nombre: 'Tosagua' }, { nombre: 'Bachillero' }, { nombre: 'Angel Pedro Giler' }] },
    ],
  },
  {
    nombre: 'Morona Santiago',
    cantones: [
      { nombre: 'Morona', parroquias: [{ nombre: 'Macas' }, { nombre: 'Alshi' }, { nombre: 'General Proaño' }, { nombre: 'Huambi' }, { nombre: 'Río Blanco' }, { nombre: 'San Isidro' }, { nombre: 'Sevilla Don Bosco' }, { nombre: 'Sinaí' }, { nombre: 'Zuña' }] },
      { nombre: 'Gualaquiza', parroquias: [{ nombre: 'Gualaquiza' }, { nombre: 'Bermejos' }, { nombre: 'Bomboíza' }, { nombre: 'Chigüinda' }, { nombre: 'El Ideal' }, { nombre: 'Mercedes Molina' }, { nombre: 'Nueva Tarqui' }] },
      { nombre: 'Limón Indanza', parroquias: [{ nombre: 'General Leonidas Plaza Gutiérrez' }, { nombre: 'Indanza' }, { nombre: 'Limon' }, { nombre: 'Nueva Tarqui' }, { nombre: 'San Miguel de Conchay' }, { nombre: 'Santa Susana de Chiviaza' }] },
      { nombre: 'Palora', parroquias: [{ nombre: 'Palora' }, { nombre: '16 de Agosto' }, { nombre: 'Arapicos' }, { nombre: 'Sangay' }] },
      { nombre: 'Santiago', parroquias: [{ nombre: 'Santiago de Méndez' }, { nombre: 'Copal' }, { nombre: 'Cuchanza' }, { nombre: 'La Paz' }, { nombre: 'San Francisco de Chinimbimi' }, { nombre: 'San Luis del Acho' }] },
      { nombre: 'Sucúa', parroquias: [{ nombre: 'Sucúa' }, { nombre: 'Asunción' }, { nombre: 'Huambi' }, { nombre: 'Santa Marianita de Jesús' }] },
      { nombre: 'Taisha', parroquias: [{ nombre: 'Taisha' }, { nombre: 'Huasaga' }, { nombre: 'Macuma' }, { nombre: 'Tuutinentza' }] },
      { nombre: 'Tiwintza', parroquias: [{ nombre: 'Santiago' }, { nombre: 'San José de Morona' }] },
    ],
  },
  {
    nombre: 'Napo',
    cantones: [
      { nombre: 'Tena', parroquias: [{ nombre: 'Tena' }, { nombre: 'Ahuano' }, { nombre: 'Chontapunta' }, { nombre: 'Muyuna' }, { nombre: 'Pano' }, { nombre: 'Puerto Misahuallí' }, { nombre: 'Puerto Napo' }, { nombre: 'Tálag' }] },
      { nombre: 'Archidona', parroquias: [{ nombre: 'Archidona' }, { nombre: 'Cotundo' }, { nombre: 'San Pablo de Ushpayacu' }] },
      { nombre: 'Carlos Julio Arosemena Tola', parroquias: [{ nombre: 'Carlos Julio Arosemena Tola' }] },
      { nombre: 'El Chaco', parroquias: [{ nombre: 'El Chaco' }, { nombre: 'Gonzalo Díaz de Pineda' }, { nombre: 'Oyacachi' }, { nombre: 'Santa Rosa' }] },
      { nombre: 'Quijos', parroquias: [{ nombre: 'Baeza' }, { nombre: 'Cosanga' }, { nombre: 'Cuyuja' }, { nombre: 'Papallacta' }, { nombre: 'San Francisco de Borja' }] },
    ],
  },
  {
    nombre: 'Orellana',
    cantones: [
      { nombre: 'Francisco de Orellana', parroquias: [{ nombre: 'Puerto Francisco de Orellana' }, { nombre: 'Alejandro Labaka' }, { nombre: 'El Dorado' }, { nombre: 'El Edén' }, { nombre: 'García Moreno' }, { nombre: 'Guiquita' }, { nombre: 'Inés Arango' }, { nombre: 'La Belleza' }, { nombre: 'Nuevo Paraíso' }, { nombre: 'San José de Guayusa' }, { nombre: 'San Luis de Armenia' }] },
      { nombre: 'Aguarico', parroquias: [{ nombre: 'Cononaco' }, { nombre: 'Nuevo Rocafuerte' }, { nombre: 'Tiputini' }, { nombre: 'Yasuní' }] },
      { nombre: 'La Joya de los Sachas', parroquias: [{ nombre: 'La Joya de los Sachas' }, { nombre: 'Enokanqui' }, { nombre: 'Lago San Pedro' }, { nombre: 'Rumipamba' }, { nombre: 'San Carlos' }, { nombre: 'San Sebastián del Coca' }, { nombre: 'Tres de Noviembre' }, { nombre: 'Unión Milagreña' }] },
      { nombre: 'Loreto', parroquias: [{ nombre: 'Loreto' }, { nombre: 'Ávila Huiruno' }, { nombre: 'Puerto Murialdo' }, { nombre: 'San José de Dahuano' }, { nombre: 'San Vicente de Huaticocha' }] },
    ],
  },
  {
    nombre: 'Pastaza',
    cantones: [
      { nombre: 'Pastaza', parroquias: [{ nombre: 'Puyo' }, { nombre: 'Canelos' }, { nombre: 'Diez de Agosto' }, { nombre: 'El Triunfo' }, { nombre: 'Fátima' }, { nombre: 'Mera' }, { nombre: 'Montalvo' }, { nombre: 'Pomona' }, { nombre: 'Río Corrientes' }, { nombre: 'Río Tigre' }, { nombre: 'Sarayacu' }, { nombre: 'Simón Bolívar' }, { nombre: 'Tarqui' }, { nombre: 'Teniente Hugo Ortiz' }, { nombre: 'Veracruz' }] },
      { nombre: 'Arajuno', parroquias: [{ nombre: 'Arajuno' }, { nombre: 'Curaray' }] },
      { nombre: 'Mera', parroquias: [{ nombre: 'Mera' }, { nombre: 'Madre Tierra' }, { nombre: 'Shell' }] },
      { nombre: 'Santa Clara', parroquias: [{ nombre: 'Santa Clara' }, { nombre: 'San José' }] },
    ],
  },
  {
    nombre: 'Pichincha',
    cantones: [
      { nombre: 'Quito', parroquias: [{ nombre: 'Belisario Quevedo' }, { nombre: 'Carcelén' }, { nombre: 'Centro Histórico' }, { nombre: 'Chilibulo' }, { nombre: 'Chillogallo' }, { nombre: 'Chimbacalle' }, { nombre: 'Cochapamba' }, { nombre: 'Comité del Pueblo' }, { nombre: 'El Condado' }, { nombre: 'Guamaní' }, { nombre: 'Iñaquito' }, { nombre: 'Itchimbía' }, { nombre: 'Jipijapa' }, { nombre: 'Kennedy' }, { nombre: 'La Concepción' }, { nombre: 'La Ecuatoriana' }, { nombre: 'La Ferroviaria' }, { nombre: 'La Libertad' }, { nombre: 'La Magdalena' }, { nombre: 'La Mariscal' }, { nombre: 'La Mena' }, { nombre: 'Magdalena' }, { nombre: 'Mariscal Sucre' }, { nombre: 'Puengasí' }, { nombre: 'Quitumbe' }, { nombre: 'Rumipamba' }, { nombre: 'San Bartolo' }, { nombre: 'San Juan' }, { nombre: 'Solanda' }, { nombre: 'Sucre' }, { nombre: 'Tumbaco' }, { nombre: 'Calderón' }, { nombre: 'Cumbayá' }, { nombre: 'Zambiza' }] },
      { nombre: 'Cayambe', parroquias: [{ nombre: 'Cayambe' }, { nombre: 'Ascázubi' }, { nombre: 'Cangahua' }, { nombre: 'Olmedo' }, { nombre: 'Otón' }, { nombre: 'Juan Montalvo' }, { nombre: 'Sta. Rosa de Cusubamba' }] },
      { nombre: 'Mejía', parroquias: [{ nombre: 'Machachi' }, { nombre: 'Alóag' }, { nombre: 'Aloasí' }, { nombre: 'Cutuglahua' }, { nombre: 'El Chaupi' }, { nombre: 'Manuel Cornejo Astorga' }, { nombre: 'Tambillo' }, { nombre: 'Uyumbicho' }] },
      { nombre: 'Pedro Moncayo', parroquias: [{ nombre: 'Tabacundo' }, { nombre: 'La Esperanza' }, { nombre: 'Malchinguí' }, { nombre: 'Tocachi' }, { nombre: 'Tupigachi' }] },
      { nombre: 'Rumiñahui', parroquias: [{ nombre: 'Sangolquí' }, { nombre: 'Cotogchoa' }, { nombre: 'Rumipamba' }] },
      { nombre: 'San Miguel de los Bancos', parroquias: [{ nombre: 'San Miguel de los Bancos' }, { nombre: 'Mindo' }, { nombre: 'Nanegal' }, { nombre: 'Nanegalito' }, { nombre: 'Pacto' }] },
      { nombre: 'Pedro Vicente Maldonado', parroquias: [{ nombre: 'Pedro Vicente Maldonado' }] },
      { nombre: 'Puerto Quito', parroquias: [{ nombre: 'Puerto Quito' }] },
    ],
  },
  {
    nombre: 'Santa Elena',
    cantones: [
      { nombre: 'Santa Elena', parroquias: [{ nombre: 'Santa Elena' }, { nombre: 'Atahualpa' }, { nombre: 'Ballenita' }, { nombre: 'Colonche' }, { nombre: 'Chanduy' }, { nombre: 'Manglaralto' }, { nombre: 'Simón Bolívar' }] },
      { nombre: 'La Libertad', parroquias: [{ nombre: 'La Libertad' }] },
      { nombre: 'Salinas', parroquias: [{ nombre: 'Salinas' }, { nombre: 'Anconcito' }, { nombre: 'José Luis Tamayo' }] },
    ],
  },
  {
    nombre: 'Santo Domingo de los Tsáchilas',
    cantones: [
      { nombre: 'Santo Domingo', parroquias: [{ nombre: 'Santo Domingo' }, { nombre: 'Abraham Calazacón' }, { nombre: 'Alluriquín' }, { nombre: 'El Esfuerzo' }, { nombre: 'Luz de América' }, { nombre: 'Puerto Limón' }, { nombre: 'San Jacinto del Búa' }, { nombre: 'Santa María del Toachi' }, { nombre: 'Valle Hermoso' }] },
      { nombre: 'La Concordia', parroquias: [{ nombre: 'La Concordia' }, { nombre: 'La Villegas' }] },
    ],
  },
  {
    nombre: 'Sucumbíos',
    cantones: [
      { nombre: 'Nueva Loja', parroquias: [{ nombre: 'Nueva Loja' }, { nombre: 'El Eno' }, { nombre: 'General Farfán' }, { nombre: 'Jambelí' }, { nombre: 'Pacayacu' }, { nombre: 'Santa Cecilia' }] },
      { nombre: 'Cascales', parroquias: [{ nombre: 'El Dorado de Cascales' }, { nombre: 'Sevilla' }, { nombre: 'Santa Rosa de Sucumbíos' }] },
      { nombre: 'Cuyabeno', parroquias: [{ nombre: 'Tarapoa' }, { nombre: 'Aguas Negras' }, { nombre: 'Cuyabeno' }] },
      { nombre: 'Gonzalo Pizarro', parroquias: [{ nombre: 'Lumbaquí' }, { nombre: 'El Reventador' }, { nombre: 'Gonzalo Pizarro' }, { nombre: 'Puerto Libre' }] },
      { nombre: 'Lago Agrio', parroquias: [{ nombre: 'Nueva Loja' }, { nombre: 'El Eno' }, { nombre: 'General Farfán' }] },
      { nombre: 'Putumayo', parroquias: [{ nombre: 'Puerto del Carmen' }, { nombre: 'Palma Roja' }, { nombre: 'Rosa Florida' }] },
      { nombre: 'Shushufindi', parroquias: [{ nombre: 'Shushufindi' }, { nombre: 'Limoncocha' }, { nombre: 'Pañacocha' }, { nombre: 'San Roque' }, { nombre: 'San Pedro de los Cofanes' }, { nombre: 'Siete de Julio' }] },
      { nombre: 'Sucumbíos', parroquias: [{ nombre: 'La Bonita' }, { nombre: 'El Playón de San Francisco' }, { nombre: 'La Sofía' }, { nombre: 'Rosa Florida' }] },
    ],
  },
  {
    nombre: 'Tungurahua',
    cantones: [
      { nombre: 'Ambato', parroquias: [{ nombre: 'Ambato' }, { nombre: 'Atocha-Ficoa' }, { nombre: 'Celiano Monge' }, { nombre: 'Huachi Chico' }, { nombre: 'Huachi Grande' }, { nombre: 'Inchilaqui' }, { nombre: 'La Merced' }, { nombre: 'La Peniel' }, { nombre: 'Picaihua' }, { nombre: 'Pishilata' }, { nombre: 'San Francisco' }, { nombre: 'Santa Rosa' }, { nombre: 'Totoras' }] },
      { nombre: 'Baños de Agua Santa', parroquias: [{ nombre: 'Baños' }, { nombre: 'Lligua' }, { nombre: 'Río Negro' }, { nombre: 'Río Verde' }, { nombre: 'Ulba' }] },
      { nombre: 'Cevallos', parroquias: [{ nombre: 'Cevallos' }] },
      { nombre: 'Mocha', parroquias: [{ nombre: 'Mocha' }, { nombre: 'Pinguilí' }] },
      { nombre: 'Patate', parroquias: [{ nombre: 'Patate' }, { nombre: 'El Triunfo' }, { nombre: 'Los Andes' }, { nombre: 'Sucre' }] },
      { nombre: 'Pelileo', parroquias: [{ nombre: 'Pelileo' }, { nombre: 'Benítez' }, { nombre: 'Bolívar' }, { nombre: 'Chiquicha' }, { nombre: 'Cotaló' }, { nombre: 'García Moreno' }, { nombre: 'Guambaló' }, { nombre: 'Salasaca' }] },
      { nombre: 'Píllaro', parroquias: [{ nombre: 'Ciudad Nueva' }, { nombre: 'Marcos Espinel' }, { nombre: 'Baquerizo Moreno' }, { nombre: 'Emilio María Terán' }, { nombre: 'Presidente Urbina' }, { nombre: 'San Andrés' }, { nombre: 'San José de Poaló' }, { nombre: 'San Miguelito' }] },
      { nombre: 'Quero', parroquias: [{ nombre: 'Quero' }, { nombre: 'Rumipamba' }] },
      { nombre: 'Tisaleo', parroquias: [{ nombre: 'Tisaleo' }, { nombre: 'Quinchicoto' }] },
    ],
  },
  {
    nombre: 'Zamora Chinchipe',
    cantones: [
      { nombre: 'Zamora', parroquias: [{ nombre: 'Zamora' }, { nombre: 'Cumbaratza' }, { nombre: 'El Limón' }, { nombre: 'Guadalupe' }, { nombre: 'Imbana' }, { nombre: 'La Paz' }, { nombre: 'Nambija' }, { nombre: 'Sabanilla' }, { nombre: 'Timbara' }, { nombre: 'San Carlos de las Minas' }] },
      { nombre: 'Chinchipe', parroquias: [{ nombre: 'Zumba' }, { nombre: 'Chito' }, { nombre: 'El Chorro' }, { nombre: 'La Chonta' }, { nombre: 'Pucapamba' }, { nombre: 'San Andrés' }] },
      { nombre: 'El Pangui', parroquias: [{ nombre: 'El Pangui' }, { nombre: 'El Guismi' }, { nombre: 'Pachicutza' }, { nombre: 'Tundayme' }] },
      { nombre: 'Nangaritza', parroquias: [{ nombre: 'Guayzimi' }, { nombre: 'Las Orquídeas' }, { nombre: 'Nuevo Paraíso' }] },
      { nombre: 'Palanda', parroquias: [{ nombre: 'Palanda' }, { nombre: 'El Porvenir del Carmen' }, { nombre: 'La Canela' }, { nombre: 'San Francisco de Vergel' }, { nombre: 'Valladolid' }] },
      { nombre: 'Paquisha', parroquias: [{ nombre: 'Paquisha' }, { nombre: 'Bellavista' }, { nombre: 'Nuevo Quito' }] },
      { nombre: 'Yacuambi', parroquias: [{ nombre: 'Yacuambi' }, { nombre: '28 de Mayo' }, { nombre: 'La Paz' }] },
      { nombre: 'Yantzaza', parroquias: [{ nombre: 'Yantzaza' }, { nombre: 'Los Encuentros' }] },
    ],
  },
];

/** Returns all province names sorted alphabetically */
export function getProvincias(): string[] {
  return ECUADOR_GEO.map((p) => p.nombre).sort();
}

/** Returns all canton names for a given province */
export function getCantonesForProvincia(provincia: string): string[] {
  const prov = ECUADOR_GEO.find((p) => p.nombre === provincia);
  return prov ? prov.cantones.map((c) => c.nombre).sort() : [];
}

/** Returns all parish names for a given province + canton */
export function getParroquiasForCanton(provincia: string, canton: string): string[] {
  const prov = ECUADOR_GEO.find((p) => p.nombre === provincia);
  if (!prov) return [];
  const cant = prov.cantones.find((c) => c.nombre === canton);
  return cant ? cant.parroquias.map((p) => p.nombre).sort() : [];
}
