import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export const createServerClient = () => {
  // Cookie-aware server client for Route Handlers / Server Components
  return createRouteHandlerClient<Database>({ cookies });
};
