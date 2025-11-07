// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const protectedRoutes = [
    "/dashboard",
    "/profile",
    "/messages",
    "/my-requests",
    "/my-teen-hustle",
    "/neighborhood",
    "/provider",
    "/booking/",
    "/services/",
    "/onboarding"
  ];

  const isProtected = protectedRoutes.some((r) => req.nextUrl.pathname.startsWith(r));

  if (isProtected && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if ((req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup") && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Check if teen users need to complete onboarding
  if (session && !req.nextUrl.pathname.startsWith('/onboarding') && !req.nextUrl.pathname.startsWith('/api')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // If user is a teen, allow access (onboarding check removed)
    if (profile && (profile as any).role === 'teen') {
      // Onboarding is no longer required
    }
  }

  // Protect admin routes (except admin login page)
  if (req.nextUrl.pathname.startsWith('/admin') && req.nextUrl.pathname !== '/admin/login') {
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  // If user is already logged in and tries to access admin login, redirect to admin dashboard
  if (req.nextUrl.pathname === '/admin/login' && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile && (profile as any).role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};