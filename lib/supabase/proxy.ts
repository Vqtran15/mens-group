import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() instead of getUser(): getUser() revalidates against
  // Supabase's Auth server on every single request, which was blocking the
  // entire HTML response (nothing paints, including the splash screen)
  // behind a real network round trip on every navigation. getSession()
  // reads the session from cookies with no network call in the common case
  // (it still refreshes and rewrites the cookies via the callback above
  // when a token is actually near expiry, same as before) - Supabase's own
  // docs warn against trusting it server-side for authorization decisions
  // since it doesn't cryptographically re-verify the token, but this
  // middleware only ever makes a redirect/UX decision here - the actual
  // data layer stays fully protected by RLS regardless of what a forged
  // cookie could get past this check.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/calendar";
    return NextResponse.redirect(url);
  }

  return response;
}
