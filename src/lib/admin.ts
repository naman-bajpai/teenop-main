import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase";

export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin";
  status: "active" | "inactive" | "suspended" | "pending_verification";
  age: number | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function checkAdminAccess(): Promise<AdminUser | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) {
      return null;
    }

    // Check if user is admin
    if ((profile as any).role !== 'admin') {
      return null;
    }

    return {
      id: (profile as any).id,
      first_name: (profile as any).first_name,
      last_name: (profile as any).last_name,
      email: (profile as any).email,
      role: (profile as any).role as "admin",
      status: (profile as any).status,
      age: (profile as any).age,
      city: (profile as any).city,
      state: (profile as any).state,
      phone: (profile as any).phone,
      parent_email: (profile as any).parent_email,
      parent_phone: (profile as any).parent_phone,
      is_verified: (profile as any).is_verified,
      created_at: (profile as any).created_at,
      updated_at: (profile as any).updated_at,
    };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function updateUserStatus(userId: string, status: "active" | "inactive" | "suspended" | "pending_verification") {
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update user status: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

export async function getUserStats() {
  try {
    const supabase = createAdminClient();
    
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active users
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get teen users
    const { count: teenUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teen');

    // Get pending verification
    const { count: pendingUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_verification');

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      teenUsers: teenUsers || 0,
      pendingUsers: pendingUsers || 0,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
}
