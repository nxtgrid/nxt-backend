import { supabase } from '@core/modules/supabase.module';
import { QueryData } from '@supabase/supabase-js';

export const ussdSessionForHopQuery = `
  id,
  phone,
  amount,
  is_using_other_option,
  ussd_session_hops!ussd_session_id(
    id
  ),
  account:accounts(
    id,
    agent:agents(
      id,
      wallet:wallets(
        id
      )
    ),
    customer:customers(
      id
    )
  ),
  meter:meters(
    id,
    external_reference,
    connection:connections(
      customer:customers(
        account:accounts(
          full_name
        ),
        grid:grids(
          name,
          organization:organizations(
            name
          )
        )
      )
    ),
    wallet:wallets(
      id
    )
  )
`;

const _ussdSessionQuery = supabase.from('ussd_sessions').select(ussdSessionForHopQuery).single();
export type UssdSessionForHop = QueryData<typeof _ussdSessionQuery>;
