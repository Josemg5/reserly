"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, ArrowLeft, Loader2, Server, Mail, Database, CheckCircle2, XCircle, AlertCircle, Building2, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { crearPeluqueria } from '@/actions/crearPeluqueria';
import { seedDatosDemo, type SeedResult } from '@/actions/seedData';
import { getSuperAdminData } from '@/actions/getSuperAdminData';
import { togglePeluqueriaActivo } from '@/actions/togglePeluqueriaActivo';

export default function SuperAdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    
    const [metrics, setMetrics] = useState({
        citasCount: 0,
        perfilesCount: 0,
        peluqueriasCount: 0,
        emails30Days: 0,
        recentLogs: [] as any[],
        peluqueriasList: [] as any[]
    });

    const [formDatos, setFormDatos] = useState({ nombre: '', email: '', password: '', slug: '' });
    const [creando, setCreando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    const [seeding, setSeeding] = useState(false);
    const [seedResult, setSeedResult] = useState<SeedResult | null>(null);

    const handleSeed = async () => {
        if (!window.confirm('⚠️ Esto añadirá empleados, servicios y citas de PRUEBA a TODAS las peluquerías existentes. ¿Continuar?')) return;
        setSeeding(true);
        setSeedResult(null);
        try {
            const result = await seedDatosDemo();
            setSeedResult(result);
        } catch (e: any) {
            setSeedResult({ success: false, message: e.message || 'Error inesperado' });
        } finally {
            setSeeding(false);
        }
    };

    const handleCrear = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreando(true);
        setMensaje({ tipo: '', texto: '' });
        const form = new FormData();
        form.append('nombre', formDatos.nombre);
        form.append('email', formDatos.email);
        form.append('password', formDatos.password);
        form.append('slug', formDatos.slug);
        
        try {
            const res = await crearPeluqueria(form);
            if (res.success) {
                setMensaje({ tipo: 'success', texto: 'Peluquería y Admin creados exitosamente.' });
                setFormDatos({ nombre: '', email: '', password: '', slug: '' });
            } else {
                setMensaje({ tipo: 'error', texto: res.error || 'Error al crear peluquería.' });
            }
        } catch (error) {
            setMensaje({ tipo: 'error', texto: 'Error de servidor.' });
        } finally {
            setCreando(false);
        }
    };

    useEffect(() => {
        async function checkSuperAdmin() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            let profileRes = await supabase.from('Perfiles').select('*').eq('id', session.user.id).single();
            if (!profileRes.data) {
                profileRes = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
            }

            if (!profileRes.data || profileRes.data.rol !== 'superadmin') {
                router.push('/');
                return;
            }
            setAuthLoading(false);
        }
        checkSuperAdmin();
    }, [router]);

    useEffect(() => {
        async function loadMetrics() {
            if (authLoading) return;
            setLoading(true);

            try {
                const data = await getSuperAdminData();
                setMetrics(data);
            } catch (err) {
                console.error(err);
            }

            setLoading(false);
        }
        loadMetrics();
    }, [authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#050505]">
                <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const freeEmailLimit = 3000;
    const emailPercentage = Math.min((metrics.emails30Days / freeEmailLimit) * 100, 100);
    const isEmailWarning = metrics.emails30Days >= 2500;
    const isEmailDanger = metrics.emails30Days >= freeEmailLimit;

    const totalRows = metrics.citasCount + metrics.perfilesCount + metrics.peluqueriasCount;
    const estimatedDbSizeLimit = 100000; 
    const dbPercentage = Math.min((totalRows / estimatedDbSizeLimit) * 100, 100);

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-50 font-sans selection:bg-emerald-500/30 pb-20">
            <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">

                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-400 hover:text-white transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mr-3 group-hover:border-neutral-600 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        Volver al Dashboard
                    </Link>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/login');
                        }}
                        className="inline-flex items-center text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                <div className="mb-10 flex items-center gap-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                        <ShieldAlert className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">
                            Super Admin
                        </h1>
                        <p className="text-neutral-400 text-sm md:text-base">
                            Monitoreo global de infraestructura y límites del SaaS.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    
                    <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <Mail className="w-40 h-40" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                                <Mail className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-xl font-semibold text-white">Monitoreo de Correos (Resend)</h2>
                            </div>
                            
                            <div className="flex items-end justify-between mb-4">
                                <div>
                                    <p className="text-4xl font-bold text-white mb-1">{metrics.emails30Days}</p>
                                    <p className="text-sm text-neutral-400">Enviados (Últimos 30 días)</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-neutral-300">{freeEmailLimit}</p>
                                    <p className="text-xs text-neutral-500">Límite Gratuito</p>
                                </div>
                            </div>
                            
                            <div className="h-3 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${isEmailDanger ? 'bg-rose-500' : isEmailWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${emailPercentage}%` }}
                                ></div>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs font-medium">
                                <span className={isEmailDanger ? 'text-rose-400' : isEmailWarning ? 'text-amber-400' : 'text-emerald-400'}>
                                    {emailPercentage.toFixed(1)}% Consumido
                                </span>
                                {isEmailDanger ? (
                                    <span className="flex items-center gap-1 text-rose-400"><AlertCircle className="w-3 h-3" /> Requiere Upgrade</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-neutral-500">Tier: Resend Free</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <Database className="w-40 h-40" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                                <Server className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-xl font-semibold text-white">Estado de Base de Datos</h2>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-white mb-1">{metrics.peluqueriasCount}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">Peluquerías</p>
                                </div>
                                <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-white mb-1">{metrics.citasCount}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">Citas</p>
                                </div>
                                <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-white mb-1">{metrics.perfilesCount}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">Perfiles</p>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-neutral-300">Salud de Filas (Estimado SaaS)</span>
                                    <span className="font-medium text-white">{totalRows} / {estimatedDbSizeLimit}</span>
                                </div>
                                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${dbPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-6 lg:p-8 backdrop-blur-md shadow-2xl mb-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                        <Building2 className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl font-semibold text-white">Locales Activos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500 font-medium">
                                    <th className="pb-3 pl-2">Nombre del Negocio</th>
                                    <th className="pb-3">Email de Contacto</th>
                                    <th className="pb-3">Fecha de Registro</th>
                                    <th className="pb-3">Estado</th>
                                    <th className="pb-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {metrics.peluqueriasList?.map((pelu: any) => (
                                    <tr key={pelu.id} className="hover:bg-neutral-800/30 transition-colors text-sm text-neutral-300">
                                        <td className="py-4 pl-2 font-medium text-white">{pelu.nombre_negocio}</td>
                                        <td className="py-4">{pelu.email_contacto || '-'}</td>
                                        <td className="py-4 text-neutral-400">
                                            {pelu.created_at ? new Date(pelu.created_at).toLocaleDateString('es-ES') : '-'}
                                        </td>
                                        <td className="py-4">
                                            {pelu.activo !== false ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                    Suspendido
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 text-right">
                                            <button
                                                onClick={async () => {
                                                    const res = await togglePeluqueriaActivo(pelu.id, pelu.activo !== false);
                                                    if (res.success) {
                                                        const data = await getSuperAdminData();
                                                        setMetrics(data);
                                                    } else {
                                                        alert(res.error || 'Error al cambiar estado.');
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                    pelu.activo !== false
                                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                                }`}
                                            >
                                                {pelu.activo !== false ? 'Suspender' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!metrics.peluqueriasList || metrics.peluqueriasList.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-neutral-500 italic">No hay locales registrados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-6 lg:p-8 backdrop-blur-md shadow-2xl mb-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                        <Building2 className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl font-semibold text-white">Alta Rápida de Peluquería</h2>
                    </div>

                    <form onSubmit={handleCrear} className="space-y-4 max-w-2xl">
                        {mensaje.texto && (
                            <div className={`p-4 rounded-xl border ${mensaje.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} text-sm flex items-center gap-2`}>
                                {mensaje.tipo === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                {mensaje.texto}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre de la Peluquería</label>
                                <input
                                    required
                                    type="text"
                                    value={formDatos.nombre}
                                    onChange={(e) => setFormDatos({...formDatos, nombre: e.target.value})}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    placeholder="Ej: Elegance Studio"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Slug (URL)</label>
                                <input
                                    required
                                    type="text"
                                    value={formDatos.slug}
                                    onChange={(e) => setFormDatos({...formDatos, slug: e.target.value})}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    placeholder="Ej: elegance-studio (sin espacios)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Email del Dueño</label>
                                <input
                                    required
                                    type="email"
                                    value={formDatos.email}
                                    onChange={(e) => setFormDatos({...formDatos, email: e.target.value})}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    placeholder="Dueño admin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Contraseña Temporal</label>
                                <input
                                    required
                                    type="text"
                                    value={formDatos.password}
                                    onChange={(e) => setFormDatos({...formDatos, password: e.target.value})}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    placeholder="Contraseña inicial"
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={creando}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creando ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        Crear Peluquería
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-6 lg:p-8 backdrop-blur-md shadow-2xl mb-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                        <FlaskConical className="w-5 h-5 text-violet-400" />
                        <h2 className="text-xl font-semibold text-white">Inyección de Datos Demo</h2>
                        <span className="ml-auto text-xs font-mono px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">DEV TOOL</span>
                    </div>

                    <p className="text-sm text-neutral-400 mb-6 max-w-2xl">
                        Pobla <strong className="text-white">todas las peluquerías existentes</strong> con datos de prueba realistas
                        (3&nbsp;empleados, 5&nbsp;servicios y 50&nbsp;citas distribuidas en los últimos 30&nbsp;días
                        y los próximos 7&nbsp;días). Ideal para verificar gráficas y estadísticas del panel de administración.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <button
                            id="btn-seed-demo"
                            onClick={handleSeed}
                            disabled={seeding}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20"
                        >
                            {seeding ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Inyectando datos...</>
                            ) : (
                                <><FlaskConical className="w-4 h-4" /> Ejecutar Seed Demo</>
                            )}
                        </button>

                        {seedResult && (
                            <div className={`flex-1 p-4 rounded-xl border text-sm ${
                                seedResult.success
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                                <p className="font-medium mb-1 flex items-center gap-2">
                                    {seedResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {seedResult.message}
                                </p>
                                {seedResult.details && (
                                    <ul className="mt-2 space-y-0.5 text-xs opacity-80 list-disc list-inside">
                                        <li>Peluquerías procesadas: <strong>{seedResult.details.peluqueriasProcessed}</strong></li>
                                        <li>Empleados creados: <strong>{seedResult.details.empleadosCreated}</strong></li>
                                        <li>Servicios creados: <strong>{seedResult.details.serviciosCreated}</strong></li>
                                        <li>Citas creadas: <strong>{seedResult.details.citasCreated}</strong></li>
                                        {seedResult.details.errors.length > 0 && (
                                            <li className="text-rose-400 mt-1">
                                                Errores:{' '}
                                                {seedResult.details.errors.map((e, i) => (
                                                    <span key={i} className="block pl-3">{e}</span>
                                                ))}
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-6 lg:p-8 backdrop-blur-md shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                        <Database className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl font-semibold text-white">Auditoría de Logs (Últimos 20)</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500 font-medium">
                                    <th className="pb-3 pl-2">Fecha y Hora</th>
                                    <th className="pb-3">Destinatario</th>
                                    <th className="pb-3">Tipo</th>
                                    <th className="pb-3">ID Cita</th>
                                    <th className="pb-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {metrics.recentLogs.map((log) => {
                                    const d = new Date(log.fecha_envio);
                                    return (
                                        <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors text-sm text-neutral-300">
                                            <td className="py-4 pl-2 whitespace-nowrap">
                                                {d.toLocaleDateString('es-ES')} <span className="text-neutral-500">{d.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="py-4 font-medium text-white truncate max-w-[150px]">
                                                {log.email_destino || '-'}
                                            </td>
                                            <td className="py-4 capitalize">
                                                <span className="bg-neutral-800 px-2.5 py-1 rounded-md text-xs border border-neutral-700">
                                                    {log.tipo_email || 'General'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-xs font-mono text-neutral-500 max-w-[120px] truncate" title={log.id_cita}>
                                                {log.id_cita ? log.id_cita.split('-')[0] + '...' : '-'}
                                            </td>
                                            <td className="py-4">
                                                {log.estado === 'enviado' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                        <XCircle className="w-3.5 h-3.5" /> Fallo
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {metrics.recentLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-neutral-500 italic">No hay registros de envío almacenados en la base de datos.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
