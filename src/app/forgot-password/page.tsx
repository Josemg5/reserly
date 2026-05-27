"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Mail, Loader2, ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        if (authError) {
            setError("No hemos podido procesar tu solicitud. Verifica el correo e inténtalo de nuevo.");
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl">
                        <KeyRound className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
                        Recuperar Contraseña
                    </h2>
                    <p className="mt-2 text-sm text-neutral-400">
                        Introduce tu correo y te enviaremos un enlace de acceso
                    </p>
                </div>

                <div className="mt-8 rounded-[2rem] bg-neutral-900/60 p-8 border border-neutral-800/80 shadow-2xl backdrop-blur-md">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 animate-in fade-in duration-300">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 animate-in fade-in duration-300">
                                ¡Revisa tu bandeja de entrada! Si el correo está registrado, recibirás el enlace en breve.
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-neutral-300">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <Mail className="h-5 w-5 text-neutral-500" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-xl border border-neutral-800 bg-neutral-950/50 py-3.5 pl-12 pr-4 text-white outline-none ring-indigo-500/50 transition-all focus:border-indigo-500 focus:ring-4 placeholder:text-neutral-600 shadow-inner"
                                    placeholder="empleado@ejemplo.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || success}
                            className="group flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Enviar enlace de recuperación"
                            )}
                        </button>

                        <div className="flex justify-center pt-1">
                            <Link
                                href="/login"
                                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-indigo-400 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver al Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
