"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError("Correo o contraseña incorrectos.");
            setLoading(false);
            return;
        }

        router.push("/");
        router.refresh();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl">
                        <Lock className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
                        Acceso de Personal
                    </h2>
                    <p className="mt-2 text-sm text-neutral-400">
                        Inicia sesión con tu cuenta corporativa
                    </p>
                </div>

                <div className="mt-8 rounded-[2rem] bg-neutral-900/60 p-8 border border-neutral-800/80 shadow-2xl backdrop-blur-md">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 animate-in fade-in duration-300">
                                {error}
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

                        <div>
                            <label className="mb-2 block text-sm font-medium text-neutral-300">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <Lock className="h-5 w-5 text-neutral-500" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-neutral-800 bg-neutral-950/50 py-3.5 pl-12 pr-12 text-white outline-none ring-indigo-500/50 transition-all focus:border-indigo-500 focus:ring-4 placeholder:text-neutral-600 shadow-inner"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                                            <line x1="2" y1="2" x2="22" y2="22"></line>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-neutral-500 hover:text-indigo-400 transition-colors"
                            >
                                ¿Has olvidado tu contraseña?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="group flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Ingresar <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
