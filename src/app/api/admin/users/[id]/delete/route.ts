import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerClient();

        // Get the current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        // Check if requesting user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || (profile as any).role !== 'admin') {
            return NextResponse.json(
                { success: false, error: "Admin access required" },
                { status: 403 }
            );
        }

        const { id: userIdToDelete } = await params;

        // Use service role client to delete the user (auth + profile)
        // Note: Deleting from auth.users usually cascades to profiles if set up, 
        // but the library function deleteUser() does both if needed or we use supabaseAdmin.auth.admin.deleteUser()

        const supabaseAdmin = createServiceRoleClient();

        // Delete from auth.users (this requires service role)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

        if (deleteError) {
            console.error('Error deleting user:', deleteError);
            return NextResponse.json(
                { success: false, error: deleteError.message },
                { status: 500 }
            );
        }

        // Depending on cascade settings, this might be enough. 
        // If profiles are not ON DELETE CASCADE from auth.users, we might need to manually delete the profile too.
        // Based on profiles_table.sql: "id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE"
        // So deleting auth user is sufficient.

        return NextResponse.json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        console.error('Unexpected error in delete user:', error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
