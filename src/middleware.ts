import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login');
    const isSuperAdminRoute = request.nextUrl.pathname.startsWith('/superadmin') && !request.nextUrl.pathname.startsWith('/superadmin/login');

    if (isApiRoute) {
        return response;
    }

    if (isAdminRoute && !user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isSuperAdminRoute && !user) {
        return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }

    if (user && (isAdminRoute || isSuperAdminRoute)) {
        const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
        if (isAdminRoute && profile?.rol !== 'admin' && profile?.rol !== 'empleado' && profile?.rol !== 'superadmin') {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (isSuperAdminRoute && profile?.rol !== 'superadmin') {
            return NextResponse.redirect(new URL('/superadmin/login', request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
