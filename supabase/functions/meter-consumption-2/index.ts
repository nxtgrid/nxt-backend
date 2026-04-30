// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { canAccessDataAggregatorApi, getContextForOdissey } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';
interface TimescaleConfig {
  hostname: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

async function getTimescaleConfig(): Promise<TimescaleConfig> {
  return {
    hostname: Deno.env.get('PHOENIX_HOST') ?? '',
    port: parseInt(Deno.env.get('PHOENIX_PORT') ?? '5432'),
    database: Deno.env.get('PHOENIX_DATABASE') ?? '',
    user: Deno.env.get('PHOENIX_USERNAME') ?? '',
    password: Deno.env.get('PHOENIX_PASSWORD') ?? '',
  };
}

async function getMeterConsumption(req) {
  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const pageLimit = parseInt(url.searchParams.get('pageLimit') || '20');
  const fromDate = url.searchParams.get('FROM');
  const toDate = url.searchParams.get('TO');
  const site = url.searchParams.get('site');
  
  if (!fromDate || !toDate) {
    return new Response(JSON.stringify({
      error: 'Missing required parameters: FROM, TO'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400,
    });
  }

  let client;
  try {
    const config = await getTimescaleConfig();
    client = new Client(config);
    
    await client.connect();

    // First query: Get total count
    const params = [fromDate, toDate];
    let countQuery = `
      SELECT COUNT(*) as total_count
      FROM meter_snapshot_1_h 
      WHERE created_at >= $1 
        AND created_at <= $2
        AND is_hidden_from_reporting = false
        AND consumption_kwh IS NOT NULL
        AND NOT (consumption_kwh::text = 'NaN')
    `;

    if (site) {
      countQuery += ` AND LOWER(grid_name) = LOWER($3)`;
      params.push(site)
    }

    const countResult = await client.queryObject(countQuery, params);
    const total = parseInt(countResult.rows[0].total_count);

    // Second query: Get paginated data
    const dataParams: any[] = [fromDate, toDate];
    let i = 1;
    let dataQuery = `
      SELECT 
        created_at as timestamp,
        meter_external_reference as "meterId",
        COALESCE(consumption_kwh::numeric, 0) as "energyConsumptionKwh",
        60 as "timeIntervalMinutes",
        customer_id as "customerAccountId"
      FROM meter_snapshot_1_h 
      WHERE created_at >= $${i++} 
        AND created_at <= $${i++} 
        AND is_hidden_from_reporting = false
        AND consumption_kwh IS NOT NULL
        AND NOT (consumption_kwh::text = 'NaN')`;


    if (site) {
      dataQuery += ` AND LOWER(grid_name) = LOWER($${i++})`
      dataParams.push(site)
    }
    
    dataQuery += ` ORDER BY created_at LIMIT $${i++} OFFSET $${i++}`
    dataParams.push(pageLimit, offset)

    const result = await client.queryObject(dataQuery, dataParams);
    const readings = result.rows.map(row => ({
      ...row,
      energyConsumptionKwh: Math.round(parseFloat(row.energyConsumptionKwh) * 1000) / 1000
    }));
    
    

    return new Response(
      JSON.stringify({
        total: total,
        offset: offset,
        pageLimit: pageLimit,
        readings: readings,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error) {
    console.error('Error querying TimescaleDB:', error);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve meter consumption data',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500,
    });
  } finally { 
    await client.end();
  }
}

Deno.serve(async req => {
  const { method } = req;

  const { supabase, user } = await getContextForOdissey(req);

  if(!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
      status: 401,
    });
  }

  const isAuthorized = canAccessDataAggregatorApi(user);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
      status: 401,
    });
  }
  
  switch (true) {
    case method === 'GET':
      return getMeterConsumption(req);
    case method === 'OPTIONS':
      return new Response('ok', { headers: corsHeaders });
    default:
      return new Response(JSON.stringify({ error: 'Method not supported' }), {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400,
      });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/meter-consumption?offset=0&pageLimit=20&FROM=2025-07-11T00:00:00.000Z&TO=2025-07-11T23:59:59.999Z' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json'

*/
