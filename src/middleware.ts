// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  if (isProtected && !user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && !req.nextUrl.pathname.startsWith('/onboarding') && !req.nextUrl.pathname.startsWith('/api')) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && (profile as any).role === 'teen' && (profile as any).status === 'pending_verification') {
      const pendingAllowedPaths = ['/pending-approval', '/parent/verify'];
      const isPendingAllowed = pendingAllowedPaths.some((path) => req.nextUrl.pathname.startsWith(path));
      if (!isPendingAllowed) {
        return NextResponse.redirect(new URL('/pending-approval', req.url));
      }
    }

    if ((req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup") && profile) {
      if ((profile as any).role === 'teen' && (profile as any).status === 'pending_verification') {
        return NextResponse.redirect(new URL('/pending-approval', req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Protect admin routes (except admin login page)
  if (req.nextUrl.pathname.startsWith('/admin') && req.nextUrl.pathname !== '/admin/login') {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  // If user is already logged in and tries to access admin login, redirect to admin dashboard
  if (req.nextUrl.pathname === '/admin/login' && user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && (profile as any).role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
