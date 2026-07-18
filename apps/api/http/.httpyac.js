/**
 * httpYac environments — switch with the httpYac env picker in the status bar.
 * Secrets come from parent `.env` files (`apps/api/.env` / repo root), same as `nx serve api`.
 */
module.exports = {
  environments: {
    $shared: {
      baseUrl: 'http://localhost:3000',
      supabaseUrl: 'http://127.0.0.1:54321',
      platformEmail: 'superadmin@nxt-platform.com',
      platformPassword: 'superadmin',
      solarEmail: 'admin@nxt-solar.com',
      solarPassword: 'admin',
      devApiKey: 'dev-api-key-platform-superadmin',
    },
    local: {},
  },
};
