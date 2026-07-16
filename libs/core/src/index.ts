export { getPackageInfo } from './modules/platform/package-info.js';

export { getConfig, loadConfig, setConfig } from './config/index.js';
export type { LoadConfigOptions, NxtConfig } from './config/index.js';
export { requireEnv } from './config/require-env.js';

export { SUPABASE_QUERY_LIMIT } from './constants.js';
export {
  GlobalSupabaseModule,
  SupabaseService,
  throwSupabaseError,
} from './modules/supabase/supabase.module.js';

export { demoModules } from './modules/demo/demo-modules.js';
