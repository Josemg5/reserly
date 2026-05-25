"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function CuentaSuspendida() {
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-neutral-50 font-sans p-4 selection:bg-rose-500/30">
            <div className="max-w-md w-full bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-8 md:p-10 backdrop-blur-md shadow-2xl text-center relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 animate-pulse">
                        <ShieldAlert className="h-8 w-8" />
                    </div>
                    
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
                        Cuenta Suspendida
                    </h1>
                    
                    <p className="text-neutral-400 text-sm md:text-base leading-relaxed mb-8">
                        Tu acceso ha sido desactivado temporalmente debido a que la suscripción de este local no está activa. Para regularizar tu situación o si consideras que es un error, por favor contacta al administrador del sistema.
                    </p>
                    
                    <button
                        onClick={handleSignOut}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 w-full bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-rose-400 hover:text-rose-300 rounded-xl font-medium transition-all shadow-lg"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
