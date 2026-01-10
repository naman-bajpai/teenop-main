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

        const { id: serviceId } = await params;

        // Use service role client to delete the service to bypass RLS policies
        const supabaseAdmin = createServiceRoleClient();

        const { error: deleteError } = await supabaseAdmin
            .from('services')
            .delete()
            .eq('id', serviceId);

        if (deleteError) {
            console.error('Error deleting service:', deleteError);
            return NextResponse.json(
                { success: false, error: deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Service deleted successfully"
        });

    } catch (error) {
        console.error('Unexpected error in delete service:', error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
