// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { canAccessLenderApi, getContext } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

async function getTask(req, supabase, user) {
  const isAuthorized = canAccessLenderApi(user);

  if(!isAuthorized) return new Response(JSON.stringify({ error: 'Not authorized' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 401,
  });

  const url = new URL(req.url);

  const page = Number(url.searchParams.get('page') || 1);
  const size = Number(url.searchParams.get('size') || 100);
  const order = url.searchParams.get('order') || 'id';
  const ascending = url.searchParams.get('ascending') || 'true';

  const from = (page - 1) * size;
  const to = from + size - 1;

  const { data, count: total, error } = await supabase
    .from('customers')
    .select('*, accounts!inner(full_name, deleted_at), grids!inner(name, is_hidden_from_reporting)', { count: 'exact' })
    .eq('is_hidden_from_reporting', false)
    .is('grids.deleted_at', null)
    .is('grids.is_hidden_from_reporting', false)
    .order(order, { ascending: ascending === 'true' })
    .range(from, to);

  console.info(data);
  if(error) throw Error('An error occurred while trying to read the data');

  const entries = data.map(entry => ({
    id: entry.id,
    full_name: '*******',
    grid: entry.grids.name,
  }));

  return new Response(
    JSON.stringify({
      total,
      page,
      size,
      total_pages: Math.ceil(total / size),
      entries,
    }),
    { headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    } },
  );
}

Deno.serve(async req => {
  const { method } = req;

  // TODO: I do not like the idea of returning responses from functions
  // being called here. Rather, a result should be called, and a response
  // built in this very function with that result
  switch (true) {
    case method === 'GET':
      // eslint-disable-next-line no-case-declarations
      const { supabase, user } = await getContext(req);
      return getTask(req, supabase, user);
    case method === 'OPTIONS':
      return new Response('ok', { headers: corsHeaders });
    default:
      return new Response(JSON.stringify({ error: 'Method not supported' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/customers' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
