"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Settings, ArrowLeft, Loader2, Plus, Users, Scissors, Store, Save, Trash2, CalendarX, Clock, Palette, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { revalidateApp } from '@/actions/revalidateApp';
import { crearEmpleado, borrarEmpleado, getEmpleadosLocal } from '@/actions/gestionEmpleados';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function ConfiguracionPage() {
    const router = useRouter();
    const [authLoading, setAuthLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    const [peluqueria, setPeluqueria] = useState<any>(null);
    const [servicios, setServicios] = useState<any[]>([]);
    const [empleados, setEmpleados] = useState<any[]>([]);

    const [horariosSemanales, setHorariosSemanales] = useState<any[]>([]);
    const [diasCerrados, setDiasCerrados] = useState<any[]>([]);
    const [nuevoDiaCerrado, setNuevoDiaCerrado] = useState({ fecha: '', descripcion: '' });
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState<'general' | 'servicios' | 'empleados'>('general');

    const [nuevoServicio, setNuevoServicio] = useState({ nombre_servicio: '', precio: '', duracion_minutos: '', genero_objetivo: 'unisex' });
    const [nuevoEmpleado, setNuevoEmpleado] = useState({ nombre: '', email: '', password: '' });

    useEffect(() => {
        async function checkAdmin() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('Perfiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            let finalProfile = profile;

            if (!profile && session) {
                const fallback = await supabase
                    .from('perfiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (fallback?.data?.rol !== 'admin') {
                    router.push('/');
                    return;
                }
                finalProfile = fallback.data;
            } else if (profile?.rol !== 'admin') {
                router.push('/');
                return;
            }

            if (finalProfile?.id_peluqueria) {
                let pCheck = await supabase.from('peluquerias').select('activo').eq('id', finalProfile.id_peluqueria).single();
                if (!pCheck.data) {
                    pCheck = await supabase.from('Peluquerias').select('activo').eq('id', finalProfile.id_peluqueria).single();
                }
                if (pCheck.data && pCheck.data.activo === false) {
                    router.push('/cuenta-suspendida');
                    return;
                }
            }

            setUserProfile(finalProfile);
            setAuthLoading(false);
            if (finalProfile?.id_peluqueria) {
                loadData(finalProfile.id_peluqueria);
            }
        }
        checkAdmin();
    }, [router]);

    const loadData = async (idPeluqueria?: string) => {
        setLoadingData(true);
        const targetId = idPeluqueria || userProfile?.id_peluqueria;
        if (!targetId) {
            setLoadingData(false);
            return;
        }

        let pRes = await supabase.from('Peluquerias').select('*', { count: 'exact' }).eq('id', targetId).single();
        if (pRes.error || !pRes.data) pRes = await supabase.from('peluquerias').select('*', { count: 'exact' }).eq('id', targetId).single();

        const currentPeluqueria = pRes.data || null;
        setPeluqueria(currentPeluqueria);

        let sRes = await supabase.from('Servicios').select('*', { count: 'exact' }).eq('id_peluqueria', targetId);
        if (sRes.error || !sRes.data || sRes.data.length === 0) sRes = await supabase.from('servicios').select('*', { count: 'exact' }).eq('id_peluqueria', targetId);
        setServicios(sRes.data || []);

        const empRes = await getEmpleadosLocal(targetId);
        if (empRes.success && empRes.data) {
            setEmpleados(empRes.data);
        } else {
            setEmpleados([]);
        }

        if (currentPeluqueria) {
            let hsRes = await supabase.from('horarios_semanales').select('*').eq('id_peluqueria', currentPeluqueria.id).order('dia_semana');
            let loadedHorarios = hsRes.data || [];

            if (loadedHorarios.length === 0) {
                loadedHorarios = Array.from({ length: 7 }).map((_, i) => ({
                    id_peluqueria: currentPeluqueria.id,
                    dia_semana: i,
                    abierto: i !== 0,
                    inicio_manana: '09:00',
                    fin_manana: '14:00',
                    inicio_tarde: '16:00',
                    fin_tarde: '20:00'
                }));
            } else {
                const mapLoaded = new Map(loadedHorarios.map((h: any) => [h.dia_semana, h]));
                loadedHorarios = Array.from({ length: 7 }).map((_, i) => {
                    if (mapLoaded.has(i)) return mapLoaded.get(i);
                    return {
                        id_peluqueria: currentPeluqueria.id,
                        dia_semana: i,
                        abierto: false,
                        inicio_manana: '09:00',
                        fin_manana: '14:00',
                        inicio_tarde: '',
                        fin_tarde: ''
                    };
                });
            }

            loadedHorarios = loadedHorarios.map((h: any) => ({
                ...h,
                inicio_manana: h.inicio_manana ? h.inicio_manana.substring(0, 5) : '',
                fin_manana: h.fin_manana ? h.fin_manana.substring(0, 5) : '',
                inicio_tarde: h.inicio_tarde ? h.inicio_tarde.substring(0, 5) : '',
                fin_tarde: h.fin_tarde ? h.fin_tarde.substring(0, 5) : '',
            }));

            setHorariosSemanales(loadedHorarios);

            let dcRes = await supabase.from('dias_cerrados').select('*').eq('id_peluqueria', currentPeluqueria.id).order('fecha');
            setDiasCerrados(dcRes.data || []);
        }

        setLoadingData(false);
    };

    const handleHorarioSemanasChange = (diaIdx: number, field: string, value: any) => {
        setHorariosSemanales(prev => {
            const newHorarios = [...prev];
            newHorarios[diaIdx] = { ...newHorarios[diaIdx], [field]: value };
            return newHorarios;
        });
    };

    const handleUpdateHorariosSemanales = async () => {
        if (!peluqueria) return;
        setSaving(true);

        try {
            const peluqueriaPayload = { email_contacto: peluqueria.email_contacto || null };
            let pRes = await supabase.from('Peluquerias').update(peluqueriaPayload).eq('id', peluqueria.id);
            if (pRes.error) pRes = await supabase.from('peluquerias').update(peluqueriaPayload).eq('id', peluqueria.id);
        } catch (errP) {
             console.error(errP);
        }

        const payload = horariosSemanales.map(h => ({
            id_peluqueria: peluqueria.id,
            dia_semana: h.dia_semana,
            abierto: h.abierto,
            inicio_manana: h.inicio_manana || null,
            fin_manana: h.fin_manana || null,
            inicio_tarde: h.inicio_tarde || null,
            fin_tarde: h.fin_tarde || null
        }));

        try {
            await supabase.from('horarios_semanales').delete().eq('id_peluqueria', peluqueria.id);
            await supabase.from('horarios_semanales').insert(payload);
            await revalidateApp();
        } catch (err) {
            console.error(err);
        }

        setSaving(false);
    };

    const handleUpdateMarca = async () => {
        if (!peluqueria) return;
        setSaving(true);
        try {
            let finalLogoUrl = peluqueria.logo_url;
            
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                const filePath = `${peluqueria.id}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, logoFile);
                if (uploadError) {
                    setSaving(false);
                    return;
                }
                const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
                finalLogoUrl = data.publicUrl;
            }

            const payload = {
                color_marca: peluqueria.color_marca || null,
                logo_url: finalLogoUrl || null
            };
            let pRes = await supabase.from('Peluquerias').update(payload).eq('id', peluqueria.id);
            if (pRes.error) pRes = await supabase.from('peluquerias').update(payload).eq('id', peluqueria.id);
            
            setPeluqueria({ ...peluqueria, logo_url: finalLogoUrl });
            setLogoFile(null);
            await revalidateApp();
        } catch (err) {
            console.error(err);
        }
        setSaving(false);
    };

    const handleAddDiaCerrado = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!peluqueria || !nuevoDiaCerrado.fecha) return;

        setSaving(true);
        const { error } = await supabase.from('dias_cerrados').insert([{
            id_peluqueria: peluqueria.id,
            fecha: nuevoDiaCerrado.fecha,
            descripcion: nuevoDiaCerrado.descripcion.trim() || null
        }]);
        if (!error) {
            setNuevoDiaCerrado({ fecha: '', descripcion: '' });
            await loadData();
            await revalidateApp();
        }
        setSaving(false);
    };

    const handleDeleteDiaCerrado = async (id: string) => {
        if (!confirm('¿Eliminar este día?')) return;
        setSaving(true);
        await supabase.from('dias_cerrados').delete().eq('id', id).eq('id_peluqueria', peluqueria.id);
        await loadData();
        await revalidateApp();
        setSaving(false);
    };

    const handleAddServicio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!peluqueria || !nuevoServicio.nombre_servicio || !nuevoServicio.precio || !nuevoServicio.duracion_minutos) return;
        setSaving(true);

        const payload = {
            id_peluqueria: peluqueria.id,
            nombre_servicio: nuevoServicio.nombre_servicio,
            precio: Number(nuevoServicio.precio),
            duracion_minutos: Number(nuevoServicio.duracion_minutos),
            genero_objetivo: nuevoServicio.genero_objetivo || 'unisex'
        };

        let res = await supabase.from('Servicios').insert([payload]);
        if (res.error) res = await supabase.from('servicios').insert([payload]);

        setNuevoServicio({ nombre_servicio: '', precio: '', duracion_minutos: '', genero_objetivo: 'unisex' });
        await loadData();
        await revalidateApp();
        setSaving(false);
    };

    const handleDeleteServicio = async (id: string) => {
        if (!confirm('¿Eliminar servicio?')) return;
        setSaving(true);
        await supabase.from('Servicios').delete().eq('id', id).eq('id_peluqueria', peluqueria.id);
        await supabase.from('servicios').delete().eq('id', id).eq('id_peluqueria', peluqueria.id);
        await loadData();
        await revalidateApp();
        setSaving(false);
    };

    const handleAddEmpleado = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!peluqueria || !nuevoEmpleado.nombre || !nuevoEmpleado.email || !nuevoEmpleado.password) return;
        setSaving(true);
        const res = await crearEmpleado(nuevoEmpleado.nombre, nuevoEmpleado.email, nuevoEmpleado.password, peluqueria.id);
        if (res.success) {
            setNuevoEmpleado({ nombre: '', email: '', password: '' });
            await loadData();
            await revalidateApp();
        } else {
            alert(res.error);
        }
        setSaving(false);
    };

    const handleDeleteEmpleado = async (authId: string | null, empleadoId: string) => {
        if (!confirm('¿Eliminar empleado? Esto revocará el acceso de forma permanente.')) return;
        setSaving(true);
        const res = await borrarEmpleado(authId, empleadoId, peluqueria.id);
        if (res.success) {
            await loadData();
            await revalidateApp();
        } else {
            alert(res.error);
        }
        setSaving(false);
    };

    if (authLoading || loadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#050505]">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const orderedIndices = [1, 2, 3, 4, 5, 6, 0];

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-50 font-sans selection:bg-indigo-500/30 pb-20">
            <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">

                <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-400 hover:text-white transition-colors mb-8 group">
                    <div className="h-8 w-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mr-3 group-hover:border-neutral-600 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    Volver al Dashboard
                </Link>

                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        <Settings className="h-8 w-8 text-indigo-400" />
                        Configuración del Negocio
                    </h1>
                    {peluqueria?.nombre_negocio && (
                        <h2 className="text-xl font-medium text-indigo-400 mb-3 tracking-tight border-b border-indigo-500/20 pb-2 inline-block">
                            Local: {peluqueria.nombre_negocio}
                        </h2>
                    )}
                    <p className="text-neutral-400 text-sm md:text-base">
                        Administra servicios, personal y horarios de operación de forma aislada.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1 space-y-2">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                        >
                            <Store className="h-4 w-4" /> Horarios Flexibles
                        </button>
                        <button
                            onClick={() => setActiveTab('servicios')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'servicios' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                        >
                            <Scissors className="h-4 w-4" /> Servicios
                        </button>
                        <button
                            onClick={() => setActiveTab('empleados')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'empleados' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                        >
                            <Users className="h-4 w-4" /> Empleados
                        </button>
                    </div>

                    <div className="md:col-span-3">
                        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-6 lg:p-8 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">

                            {activeTab === 'general' && peluqueria && (
                                <div className="space-y-12">

                                    <div>
                                        <div className="flex items-center justify-between mb-6 border-b border-neutral-800 pb-4">
                                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                                <Palette className="w-5 h-5 text-indigo-400" /> Identidad de Marca
                                            </h2>
                                            <button 
                                                disabled={saving}
                                                onClick={handleUpdateMarca}
                                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Marca'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl mb-8">
                                            <div>
                                                <label className="block text-sm font-medium text-indigo-300 mb-2">Color de Marca</label>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <input 
                                                        type="color" 
                                                        value={peluqueria?.color_marca || '#171717'} 
                                                        onChange={(e) => setPeluqueria(peluqueria ? { ...peluqueria, color_marca: e.target.value } : null)}
                                                        className="h-10 w-14 rounded-lg cursor-pointer bg-neutral-900 border border-neutral-800 p-1"
                                                    />
                                                    <span className="text-neutral-400 text-sm font-mono uppercase bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800">{peluqueria?.color_marca || '#171717'}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-indigo-300 mb-2">Archivo del Logo</label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            setLogoFile(e.target.files[0]);
                                                        }
                                                    }}
                                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50/10 file:text-indigo-400 hover:file:bg-indigo-50/20"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-6 border-b border-neutral-800 pb-4">
                                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-indigo-400" /> Horario por Día de la Semana
                                            </h2>
                                            <button 
                                                disabled={saving}
                                                onClick={handleUpdateHorariosSemanales}
                                                className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Info General'}
                                            </button>
                                        </div>

                                        <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl mb-8">
                                            <label className="block text-sm font-medium text-indigo-300 mb-2">Correo Electrónico Corporativo</label>
                                            <p className="text-xs text-indigo-400/70 mb-3">Dirección donde recibirás las Alertas de nuevas Reservas.</p>
                                            <input 
                                                type="email" 
                                                value={peluqueria?.email_contacto || ''} 
                                                onChange={(e) => setPeluqueria(peluqueria ? { ...peluqueria, email_contacto: e.target.value } : null)}
                                                placeholder="ej. mi-peluqueria@empresa.com" 
                                                className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 text-sm"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            {orderedIndices.map(idx => {
                                                const h = horariosSemanales.find(hs => hs.dia_semana === idx) || {};

                                                return (
                                                    <div key={idx} className={`rounded-2xl border p-4 sm:p-5 transition-all ${h.abierto ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-950/50 border-neutral-900 shadow-inner'}`}>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                                                            <div className="flex items-center justify-between sm:w-1/4 sm:pr-4 sm:border-r border-neutral-800">
                                                                <span className={`font-semibold text-base ${h.abierto ? 'text-white' : 'text-neutral-600'}`}>
                                                                    {DIAS_SEMANA[idx]}
                                                                </span>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={!!h.abierto} onChange={e => handleHorarioSemanasChange(h.dia_semana, 'abierto', e.target.checked)} />
                                                                    <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                                                                </label>
                                                            </div>

                                                            {h.abierto ? (
                                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="flex items-center gap-2 text-sm bg-neutral-950/50 px-3 py-2 rounded-xl">
                                                                        <span className="text-amber-400/80 mr-1 text-xs font-bold uppercase tracking-wider w-8">M:</span>
                                                                        <input type="time" required={h.abierto} value={h.inicio_manana || ''} onChange={e => handleHorarioSemanasChange(h.dia_semana, 'inicio_manana', e.target.value)} className="bg-transparent text-white outline-none w-24 text-center border-b border-transparent focus:border-indigo-500 transition-colors" />
                                                                        <span className="text-neutral-500">-</span>
                                                                        <input type="time" required={h.abierto} value={h.fin_manana || ''} onChange={e => handleHorarioSemanasChange(h.dia_semana, 'fin_manana', e.target.value)} className="bg-transparent text-white outline-none w-24 text-center border-b border-transparent focus:border-indigo-500 transition-colors" />
                                                                    </div>

                                                                    <div className="flex items-center gap-2 text-sm bg-neutral-950/50 px-3 py-2 rounded-xl">
                                                                        <span className="text-indigo-400/80 mr-1 text-xs font-bold uppercase tracking-wider w-8">T:</span>
                                                                        <input type="time" value={h.inicio_tarde || ''} onChange={e => handleHorarioSemanasChange(h.dia_semana, 'inicio_tarde', e.target.value)} placeholder="Ej. 16:00" className="bg-transparent text-white outline-none w-24 text-center border-b border-transparent focus:border-indigo-500 transition-colors" />
                                                                        <span className="text-neutral-500">-</span>
                                                                        <input type="time" value={h.fin_tarde || ''} onChange={e => handleHorarioSemanasChange(h.dia_semana, 'fin_tarde', e.target.value)} placeholder="Ej. 20:00" className="bg-transparent text-white outline-none w-24 text-center border-b border-transparent focus:border-indigo-500 transition-colors" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 text-sm text-neutral-600 italic px-4">Centro cerrado este día.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
                                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                                <CalendarX className="w-5 h-5 text-rose-400" /> Fechas y Días de Cierre
                                            </h2>
                                        </div>

                                        <form onSubmit={handleAddDiaCerrado} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl mb-6">
                                            <div className="sm:col-span-1">
                                                <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Fecha Escogida</label>
                                                <input type="date" required value={nuevoDiaCerrado.fecha} onChange={e => setNuevoDiaCerrado({ ...nuevoDiaCerrado, fecha: e.target.value })} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500 text-sm ring-rose-500/20 focus:ring-4 transition-all" />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Razón / Festivo</label>
                                                <input type="text" placeholder="Ej. Cerrado por Navidad" value={nuevoDiaCerrado.descripcion} onChange={e => setNuevoDiaCerrado({ ...nuevoDiaCerrado, descripcion: e.target.value })} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500 text-sm ring-rose-500/20 focus:ring-4 transition-all" />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <button type="submit" disabled={saving || !nuevoDiaCerrado.fecha} className="w-full bg-rose-600 hover:bg-rose-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center font-medium shadow-lg shadow-rose-600/20">
                                                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Bloquear Fecha'}
                                                </button>
                                            </div>
                                        </form>

                                        {diasCerrados.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {diasCerrados.map(dc => (
                                                    <div key={dc.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-xl group">
                                                        <div>
                                                            <p className="font-semibold text-rose-300">
                                                                {new Date(dc.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </p>
                                                            <p className="text-sm text-neutral-400 mt-1">{dc.descripcion || 'Sin descripción detallada'}</p>
                                                        </div>
                                                        <button title="Quitar fecha" onClick={() => handleDeleteDiaCerrado(dc.id)} className="text-neutral-500 opacity-50 group-hover:opacity-100 hover:text-white transition-all p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-neutral-500 text-sm italic py-2">No hay ningún día especial de cierre reservado actualmente en tu calendario.</p>
                                        )}
                                    </div>

                                </div>
                            )}

                            {activeTab === 'servicios' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-4 mb-6">
                                            Añadir Nuevo Servicio
                                        </h2>
                                        <form onSubmit={handleAddServicio} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                                            <div className="sm:col-span-1">
                                                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Nombre</label>
                                                <input type="text" placeholder="Ej. Corte de Pelo" required value={nuevoServicio.nombre_servicio} onChange={e => setNuevoServicio({ ...nuevoServicio, nombre_servicio: e.target.value })} className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 text-sm" />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider text-center">Público</label>
                                                <div className="flex bg-neutral-950/50 border border-neutral-800 p-1 rounded-xl h-[42px]">
                                                    {['unisex', 'hombres', 'mujeres'].map(g => (
                                                        <button
                                                            type="button"
                                                            key={g}
                                                            onClick={() => setNuevoServicio({ ...nuevoServicio, genero_objetivo: g })}
                                                            className={`flex-1 text-xs rounded-lg transition-all capitalize font-medium ${nuevoServicio.genero_objetivo === g ? 'bg-indigo-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                                                        >
                                                            {g === 'hombres' ? 'Varón' : g === 'mujeres' ? 'Mujer' : 'Unisex'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Precio (€)</label>
                                                <input type="number" placeholder="0.00" step="0.01" required value={nuevoServicio.precio} onChange={e => setNuevoServicio({ ...nuevoServicio, precio: e.target.value })} className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 text-sm" />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Duración (min)</label>
                                                <div className="flex gap-2">
                                                    <input type="number" placeholder="30" required value={nuevoServicio.duracion_minutos} onChange={e => setNuevoServicio({ ...nuevoServicio, duracion_minutos: e.target.value })} className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 text-sm" />
                                                    <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center shrink-0">
                                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wider">Catálogo Actual</h3>
                                        <div className="space-y-3">
                                            {servicios.map(srv => (
                                                <div key={srv.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                                                    <div>
                                                        <p className="font-medium text-white">{srv.nombre_servicio}</p>
                                                        <p className="text-xs text-neutral-500 mt-0.5">{srv.duracion_minutos} minutos • {srv.genero_objetivo}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-indigo-400 font-semibold">{srv.precio}€</span>
                                                        <button onClick={() => handleDeleteServicio(srv.id)} className="text-neutral-500 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {servicios.length === 0 && (
                                                <p className="text-neutral-500 text-sm text-center py-4">No hay servicios registrados.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'empleados' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-4 mb-6">
                                            Añadir Acceso a Profesional
                                        </h2>
                                        <form onSubmit={handleAddEmpleado} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8">
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Nombre</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                                    <input type="text" placeholder="Ana Martínez" required value={nuevoEmpleado.nombre} onChange={e => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })} className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-indigo-500 text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Email (Login)</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                                    <input type="email" placeholder="ana@empresa.com" required value={nuevoEmpleado.email} onChange={e => setNuevoEmpleado({ ...nuevoEmpleado, email: e.target.value })} className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-indigo-500 text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Contraseña Temporal</label>
                                                <div className="flex gap-2 relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 z-10" />
                                                    <input type="password" required minLength={6} placeholder="Min. 6 letras" value={nuevoEmpleado.password} onChange={e => setNuevoEmpleado({ ...nuevoEmpleado, password: e.target.value })} className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-indigo-500 text-sm" />
                                                    <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0">
                                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wider">Plantilla Actual</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {empleados.map((emp: any) => (
                                                <div key={emp.empleadoId} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-xl group hover:border-neutral-700 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-neutral-300 shadow-inner">
                                                            {emp.nombre.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{emp.nombre}</p>
                                                            <p className="text-xs text-neutral-500 mt-0.5">{emp.email}</p>
                                                        </div>
                                                    </div>
                                                    <button disabled={saving} onClick={() => handleDeleteEmpleado(emp.authId, emp.empleadoId)} className="text-neutral-500 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all p-2 hover:bg-rose-500/10 rounded-lg disabled:opacity-0 disabled:cursor-not-allowed">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {empleados.length === 0 && (
                                                <p className="text-neutral-500 text-sm py-4">No hay empleados registrados en el local.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
