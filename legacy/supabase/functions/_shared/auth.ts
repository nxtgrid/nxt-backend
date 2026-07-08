import { createClient } from 'https://esm.sh/@supabase/supabase-js';

export async function getContextForOdissey(req) {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const bearerToken = req.headers.get('Authorization');
  const token = bearerToken?.replace('Bearer ', '') || '';
    
  let mockAccount: any = null;
  if (token) {
    // Look up API key in the database
    const { data: apiKeyData, error } = await supabaseAdmin
      .from('api_keys')
      .select(`
        id,
        key,
        is_locked,
        account_id,
        accounts!inner(
          id,
          full_name,
          email,
          supabase_id,
          organization_id,
          organizations!inner(
            id,
            name,
            organization_type
          )
        )
      `)
      .eq('key', token)
      .eq('is_locked', false)
      .single();

    // We need to generate a mock user, since the supabase client does not allow 
    // to mint sessions on behalf of a user
    if (apiKeyData && !error) mockAccount = {
      id: apiKeyData.accounts.id,
      email: apiKeyData.accounts.email,
      app_metadata: {
        organization_id: apiKeyData.accounts.organization_id,
        organization_type: apiKeyData.accounts.organizations.organization_type,
      },
      // Optionally include other fields as needed
    }
  }

  return { supabase: null, user: mockAccount };
}

export async function getContext(req) {
  const bearerToken = req.headers.get('Authorization');
  const token = bearerToken.replace('Bearer ', '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: bearerToken! } } },
  );

  // Try to get user from JWT token first
  const { data: { user } } = await supabase.auth.getUser(token);

  return { supabase, user };
}

export function canAccessLenderApi(user) {
  const { app_metadata } = user;

  // If the user belongs to NXT Grid, the allow access
  if(2 === app_metadata.organization_id) return true;

  // If the user is a member of a lender organization
  if('LENDER' === app_metadata.organization_type) return true;

  return false;
}

export function canAccessDataAggregatorApi(user) {
  const { app_metadata } = user;

  // If the user belongs to NXT Grid, the allow access
  if(2 === app_metadata.organization_id) return true;

  // If the user is a member of a data aggregator organization
  if('DATA_AGGREGATOR' === app_metadata.organization_type) return true;

  return false;
}
