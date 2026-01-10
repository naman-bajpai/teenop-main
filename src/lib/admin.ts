import { createClient } from "@/lib/supabase/client";
import { Database, TablesUpdate } from "@/lib/database.types";

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
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
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
    const supabase = createClient();

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

export async function updateUserStatus(userId: string, status: Database["public"]["Enums"]["user_status"]) {
  try {
    const supabase = createClient();

    const { error } = await (supabase as any)
      .from('profiles')
      .update({ status } as any)
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
    const supabase = createClient();

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

// Service Management Functions
export async function getAllServices() {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch services: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}

export async function updateServiceStatus(serviceId: string, status: string) {
  try {
    const supabase = createClient();

    const { error } = await (supabase as any)
      .from('services')
      .update({ status } as any)
      .eq('id', serviceId);

    if (error) {
      throw new Error(`Failed to update service status: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating service status:', error);
    throw error;
  }
}

export async function deleteService(serviceId: string) {
  try {
    const response = await fetch(`/api/admin/services/${serviceId}/delete`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete service");
    }

    return true;
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
}

export async function deleteUser(userId: string) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/delete`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete user");
    }

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export async function getServiceStats() {
  try {
    const supabase = createClient();

    // Get total services
    const { count: totalServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });

    // Get active services
    const { count: activeServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get paused services
    const { count: pausedServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'paused');

    return {
      totalServices: totalServices || 0,
      activeServices: activeServices || 0,
      pausedServices: pausedServices || 0,
    };
  } catch (error) {
    console.error('Error fetching service stats:', error);
    throw error;
  }
}
