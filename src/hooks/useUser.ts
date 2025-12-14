"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  bio?: string;
  age?: number;
  city?: string;
  state?: string;
  phone?: string;
  parent_email?: string;
  parent_phone?: string;
  is_verified?: boolean;
  status?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const supabase = createClient();
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User error:', userError);
          setError('Authentication error');
          router.push('/login');
          return;
        }

        if (!authUser) {
          setError('No authenticated user');
          router.push('/login');
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          console.error('User ID:', authUser.id);
          setError('Profile not found');
          router.push('/login');
          return;
        }

        if (!profile) {
          console.error('No profile found for user:', authUser.id);
          setError('Profile not found. Please complete your profile setup.');
          router.push('/profile');
          return;
        }

        // Convert null values to undefined to match User interface
        const userData: User = {
          id: profile.id,
          first_name: profile.first_name ?? undefined,
          last_name: profile.last_name ?? undefined,
          name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.first_name ?? profile.last_name ?? undefined,
          email: profile.email ?? undefined,
          role: profile.role ?? undefined,
          avatar_url: profile.avatar_url ?? undefined,
          bio: profile.bio ?? undefined,
          age: profile.age ?? undefined,
          city: profile.city ?? undefined,
          state: profile.state ?? undefined,
          phone: profile.phone ?? undefined,
          parent_email: profile.parent_email ?? undefined,
          parent_phone: profile.parent_phone ?? undefined,
          is_verified: profile.is_verified ?? undefined,
          status: profile.status ?? undefined,
        };

        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
        setError('Failed to load user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  return { user, loading, error };
}
