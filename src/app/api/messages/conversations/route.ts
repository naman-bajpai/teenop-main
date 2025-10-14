import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET conversations for the current user
export async function GET(request: NextRequest) {
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

    console.log("Fetching conversations for user:", user.id);
    
    // Get bookings where the user is the customer
    const { data: customerBookings, error: customerError } = await supabase
      .from("bookings")
      .select(`
        id,
        service_id,
        user_id,
        status,
        requested_date,
        requested_time,
        services (
          id,
          title,
          category,
          user_id
        )
      `)
      .eq("user_id", user.id);

    console.log("Customer bookings:", customerBookings, "Error:", customerError);

    // Get bookings where the user is the service provider
    const { data: providerBookings, error: providerError } = await supabase
      .from("bookings")
      .select(`
        id,
        service_id,
        user_id,
        status,
        requested_date,
        requested_time,
        services (
          id,
          title,
          category,
          user_id
        )
      `)
      .eq("services.user_id", user.id);

    console.log("Provider bookings:", providerBookings, "Error:", providerError);

    if (customerError || providerError) {
      console.error("Error fetching bookings:", customerError || providerError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Combine both arrays and remove duplicates
    const allBookings = [...(customerBookings || []), ...(providerBookings || [])];
    const uniqueBookings = allBookings.filter((booking: any, index: number, self: any[]) => 
      index === self.findIndex(b => b.id === booking.id) 
    );

    // Get the latest message for each booking
    const conversations = await Promise.all(
      (uniqueBookings || []).map(async (booking: any) => {
        // Get the other person's information
        const otherPersonId = booking.user_id === user.id 
          ? booking.services.user_id 
          : booking.user_id;

        // Get other person's profile
        const { data: otherPerson, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .eq("id", otherPersonId)
          .single();

        if (profileError || !otherPerson) {
          console.error("Error fetching profile:", profileError);
          return null;
        }

        // Get the latest message for this booking
        let lastMessage = null;
        let unreadCount = 0;
        
        try {
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .select("*")
            .eq("booking_id", booking.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (messageData) {
            // Get sender profile separately
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", (messageData as any).sender_id)
              .single();

            lastMessage = {
              ...(messageData as any),
              sender_name: senderProfile ? 
                [(senderProfile as any).first_name, (senderProfile as any).last_name].filter(Boolean).join(" ").trim() || "User" : 
                "User"
            };
          }

          // Count unread messages (messages sent to current user that they haven't read)
          const { count: unreadCountData, error: unreadError } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("booking_id", booking.id)
            .eq("receiver_id", user.id)
            .is("read_at", null);

          unreadCount = unreadCountData || 0;
        } catch (error) {
          // Messages table might not exist yet, that's okay
          console.log("Messages table not available yet, continuing without messages");
        }

        return {
          id: booking.id,
          booking_id: booking.id,
          other_person: {
            id: (otherPerson as any).id,
            first_name: (otherPerson as any).first_name,
            last_name: (otherPerson as any).last_name,
            avatar_url: (otherPerson as any).avatar_url
          },
          last_message: lastMessage ? {
            content: (lastMessage as any).content,
            created_at: (lastMessage as any).created_at,
            sender_id: (lastMessage as any).sender_id,
            sender_name: (lastMessage as any).sender ? 
              [(lastMessage as any).sender.first_name, (lastMessage as any).sender.last_name].filter(Boolean).join(" ").trim() || "User" : 
              "User"
          } : null,
          unread_count: unreadCount,
          booking: {
            id: booking.id,
            service: {
              title: booking.services.title,
              category: booking.services.category
            },
            status: booking.status,
            requested_date: booking.requested_date,
            requested_time: booking.requested_time
          }
        };
      })
    );

    // Filter out null results and sort by last message time
    const validConversations = conversations
      .filter(conv => conv !== null)
      .sort((a, b) => {
        if (!a?.last_message && !b?.last_message) return 0;
        if (!a?.last_message) return 1;
        if (!b?.last_message) return -1;
        return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
      });

    return NextResponse.json({
      success: true,
      conversations: validConversations
    });

  } catch (error) {
    console.error("Unexpected error in fetching conversations:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
