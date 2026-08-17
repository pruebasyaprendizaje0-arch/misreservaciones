const { PrismaClient: ControlClient } = require('../node_modules/.prisma/control');
const { PrismaClient: TenantClient } = require('../node_modules/.prisma/tenant');

async function checkTenants() {
  const controlDb = new ControlClient();
  
  try {
    const tenants = await controlDb.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n===============================================================');
    console.log('       INFORME DE ESTADO Y CONFIGURACIÓN DE NEGOCIOS');
    console.log('===============================================================\n');
    
    if (tenants.length === 0) {
      console.log('No se encontraron negocios registrados en el sistema.');
      return;
    }
    
    for (const tenant of tenants) {
      console.log(`🏢 Negocio: ${tenant.name} (${tenant.slug})`);
      console.log(`   Rubro: ${tenant.industry}`);
      console.log(`   Ubicación: ${tenant.address || 'Sin dirección'}, ${tenant.canton || ''} (${tenant.provincia || 'Sin provincia'})`);
      
      const tenantDb = new TenantClient({
        datasources: { db: { url: tenant.dbUrl } }
      });
      
      try {
        const [servicesCount, staffCount, resourcesCount, reservationsCount, customersCount, settings] = await Promise.all([
          tenantDb.service.count(),
          tenantDb.staff.count(),
          tenantDb.resource.count(),
          tenantDb.reservation.count(),
          tenantDb.customer.count(),
          tenantDb.setting.findMany()
        ]);
        
        console.log(`   📊 Estadísticas en DB:`);
        console.log(`      🛎️ Servicios: ${servicesCount}`);
        console.log(`      👥 Personal:  ${staffCount}`);
        console.log(`      🏷️ Recursos:  ${resourcesCount}`);
        console.log(`      📅 Reservas:  ${reservationsCount}`);
        console.log(`      👤 Clientes:  ${customersCount}`);
        
        const hasTimezone = settings.some(s => s.key === 'timezone');
        const hasHours = settings.some(s => s.key === 'business_hours');
        console.log(`      ⚙️ Configs:   ${hasTimezone ? '✅ Timezone' : '❌ Timezone'} | ${hasHours ? '✅ Horarios' : '❌ Horarios'}`);
        
        // Checklist/Recommendations
        const warnings = [];
        if (servicesCount === 0) {
          warnings.push('❌ Faltan Servicios: Debes registrar al menos un servicio activo para que los clientes reserven.');
        }
        if (staffCount === 0) {
          warnings.push('❌ Falta Personal: Se requiere registrar personal para asignar turnos y atender.');
        }
        if (resourcesCount === 0 && (tenant.industry === 'HOSTAL' || tenant.industry === 'MASAJE')) {
          const resName = tenant.industry === 'HOSTAL' ? 'habitaciones' : 'cabinas/camillas';
          warnings.push(`⚠️ Falta Recursos: Tu rubro (${tenant.industry}) requiere registrar ${resName}.`);
        }
        if (!hasHours) {
          warnings.push('⚠️ Horarios laborales no configurados.');
        }
        
        if (warnings.length === 0) {
          console.log('   🟢 Estado: ¡Listo y 100% operativo!');
        } else {
          console.log('   🟡 Estado: Requiere atención:');
          warnings.forEach(w => console.log(`      ${w}`));
        }
        
      } catch (err) {
        console.log(`   🔴 ERROR DE CONEXIÓN A BASE DE DATOS DEL INQUILINO:`);
        console.log(`      ${err.message}`);
      } finally {
        await tenantDb.$disconnect();
      }
      
      console.log('---------------------------------------------------------------\n');
    }
    
  } catch (error) {
    console.error('Error al consultar el control plane:', error.message);
  } finally {
    await controlDb.$disconnect();
  }
}

checkTenants();
