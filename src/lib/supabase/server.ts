import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const createServerClient = async () => {
  // Cookie-aware server client for Route Handlers / Server Components
  const cookieStore = await cookies();
  return createRouteHandlerClient<Database>({ cookies: () => cookieStore as any }); 
};

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use this only for server-side operations that need to bypass RLS
 * WARNING: Never expose the service role key to the client
 */
export const createServiceRoleClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be set for service role operations");
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
