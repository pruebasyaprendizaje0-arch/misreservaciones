/**
 * Script de seeding de Superadministrador (Desactivado en modo API Central)
 * En modo API Central, la autenticación de administradores se realiza mediante POST /v1/auth/login
 * en ubicame-api usando las credenciales globales SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD.
 */

async function main() {
  console.log('[seed-superadmin] Modo API Central activo: La autenticación de administradores se delega a ubicame-api (POST /v1/auth/login).');
  console.log('[seed-superadmin] Se omite la creación/upsert local en la tabla User.');
}

main().catch((e) => {
  console.error('[seed-superadmin] Error:', e.message || 'Error general');
});

