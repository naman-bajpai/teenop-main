import { createClient } from "@/lib/supabase/client";
import { Database, Tables } from "@/lib/database.types";

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

    if (profile.role !== 'admin') {
      return null;
    }

    return {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      role: profile.role as "admin",
      status: profile.status,
      age: profile.age,
      city: profile.city,
      state: profile.state,
      phone: profile.phone,
      parent_email: profile.parent_email,
      parent_phone: profile.parent_phone,
      is_verified: profile.is_verified,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
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
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update user status");
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
    const update: Partial<Tables<"services">> = { status };

    const { error } = await supabase
      .from('services')
      .update(update)
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
