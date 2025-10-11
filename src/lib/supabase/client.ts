"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export const createClient = () => {
  // Cookie-safe client for Client Components
  return createClientComponentClient<Database>();
};