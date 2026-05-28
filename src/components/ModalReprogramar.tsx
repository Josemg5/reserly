"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { supabase } from '@/lib/supabase';
import { reprogramarCita } from '@/actions/reprogramarCita';
import { Loader2, Clock, User, X, CalendarIcon, ChevronDown } from 'lucide-react';

const TIME_INTERVALS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30"
];

type Cita = {
    id: string;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    id_empleado: string;
    nombre_cliente: string;
};

type Empleado = {
    id: string;
    nombre: string;
    horario_personalizado?: { dia: number; activo: boolean; apertura?: string; cierre?: string }[] | null;
    ausencias?: string[];
};

type HorarioSemanal = {
    dia_semana: number;
    abierto: boolean;
    inicio_manana: string;
    fin_manana: string;
    inicio_tarde?: string;
    fin_tarde?: string;
};

type DiaCerrado = {
    fecha: string;
};

type Props = {
    cita: Cita;
    empleados: Empleado[];
    idPeluqueria: string;
    onClose: () => void;
    onSuccess: () => void;
};

export default function ModalReprogramar({ cita, empleados, idPeluqueria, onClose, onSuccess }: Props) {
    const duracionMinutos = useMemo(() => {
        const inicio = new Date(cita.fecha_hora_inicio);
        const fin = new Date(cita.fecha_hora_fin);
        return Math.round((fin.getTime() - inicio.getTime()) / 60000);
    }, [cita]);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
        return new Date(cita.fecha_hora_inicio);
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [empleadoId, setEmpleadoId] = useState<string>(cita.id_empleado);
    const [horaSeleccionada, setHoraSeleccionada] = useState<string>('');
    const [citasOcupadas, setCitasOcupadas] = useState<any[]>([]);
    const [horarios, setHorarios] = useState<HorarioSemanal[]>([]);
    const [diasCerrados, setDiasCerrados] = useState<DiaCerrado[]>([]);
    const [loadingCitas, setLoadingCitas] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const empleadoActual = useMemo(
        () => empleados.find(e => e.id === empleadoId) ?? null,
        [empleados, empleadoId]
    );

    const fechaStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

    useEffect(() => {
        async function loadHorarios() {
            if (!idPeluqueria) return;
            const res = await supabase
                .from('horarios_semanales')
                .select('*')
                .eq('id_peluqueria', idPeluqueria);

            if (res.data && res.data.length > 0) {
                setHorarios(res.data);
            } else {
                setHorarios(
                    Array.from({ length: 7 }, (_, i) => ({
                        dia_semana: i,
                        abierto: i !== 0,
                        inicio_manana: '09:00',
                        fin_manana: '14:00',
                        inicio_tarde: '16:00',
                        fin_tarde: '20:00',
                    }))
                );
            }

            const dc = await supabase
                .from('dias_cerrados')
                .select('fecha')
                .eq('id_peluqueria', idPeluqueria);
            setDiasCerrados(dc.data ?? []);
        }
        loadHorarios();
    }, [idPeluqueria]);

    const isDateDisabled = useCallback((date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const diaSemana = date.getDay();

        if (diasCerrados.some(dc => dc.fecha === dateStr)) return true;

        if (empleadoActual?.ausencias?.includes(dateStr)) return true;

        if (empleadoActual?.horario_personalizado && Array.isArray(empleadoActual.horario_personalizado)) {
            const diaConfig = empleadoActual.horario_personalizado.find(h => h.dia === diaSemana);
            if (diaConfig && !diaConfig.activo) return true;
            if (!diaConfig) return true;
        } else {
            const horarioDia = horarios.find(h => h.dia_semana === diaSemana);
            if (!horarioDia || !horarioDia.abierto) return true;
        }

        return false;
    }, [horarios, diasCerrados, empleadoActual]);

    useEffect(() => {
        async function fetchCitas() {
            if (!empleadoId || !fechaStr) {
                setCitasOcupadas([]);
                return;
            }
            setLoadingCitas(true);
            const startOfDay = new Date(`${fechaStr}T00:00:00`);
            const endOfDay = new Date(`${fechaStr}T23:59:59.999`);

            let res = await supabase
                .from('Citas')
                .select('id, fecha_hora_inicio, fecha_hora_fin')
                .eq('id_empleado', empleadoId)
                .neq('id', cita.id)
                .gte('fecha_hora_inicio', startOfDay.toISOString())
                .lte('fecha_hora_inicio', endOfDay.toISOString());

            if (res.error || !res.data || res.data.length === 0) {
                const fallback = await supabase
                    .from('citas')
                    .select('id, fecha_hora_inicio, fecha_hora_fin')
                    .eq('id_empleado', empleadoId)
                    .neq('id', cita.id)
                    .gte('fecha_hora_inicio', startOfDay.toISOString())
                    .lte('fecha_hora_inicio', endOfDay.toISOString());
                setCitasOcupadas(fallback.data || []);
            } else {
                setCitasOcupadas(res.data);
            }
            setLoadingCitas(false);
        }
        fetchCitas();
    }, [empleadoId, fechaStr, cita.id]);

    const availableTimes = useMemo(() => {
        if (!fechaStr) return TIME_INTERVALS;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const selectedDay = new Date(`${fechaStr}T00:00:00`);
        const isToday = selectedDay.getTime() === hoy.getTime();
        const now = new Date();

        return TIME_INTERVALS.filter(time => {
            const candidateStart = new Date(`${fechaStr}T${time}:00`);
            const candidateEnd = new Date(candidateStart.getTime() + duracionMinutos * 60000);

            if (isToday && candidateStart <= now) return false;

            const hasOverlap = citasOcupadas.some(c => {
                const existStart = new Date(c.fecha_hora_inicio);
                const existEnd = new Date(c.fecha_hora_fin);
                return candidateStart < existEnd && existStart < candidateEnd;
            });
            return !hasOverlap;
        });
    }, [fechaStr, citasOcupadas, duracionMinutos]);

    useEffect(() => {
        if (availableTimes.length > 0) {
            if (!availableTimes.includes(horaSeleccionada)) {
                setHoraSeleccionada(availableTimes[0]);
            }
        } else {
            setHoraSeleccionada('');
        }
    }, [availableTimes, horaSeleccionada]);

    const handleDaySelect = (day: Date | undefined) => {
        setSelectedDate(day);
        setShowCalendar(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fechaStr || !horaSeleccionada || !empleadoId) {
            setError('Por favor, selecciona fecha, hora y empleado.');
            return;
        }
        setSaving(true);
        setError(null);

        const nuevaInicio = new Date(`${fechaStr}T${horaSeleccionada}:00`);
        const nuevaFin = new Date(nuevaInicio.getTime() + duracionMinutos * 60000);

        const result = await reprogramarCita(
            cita.id,
            nuevaInicio.toISOString(),
            nuevaFin.toISOString(),
            empleadoId
        );

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error || 'Error desconocido al reprogramar.');
            setSaving(false);
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const labelFecha = selectedDate
        ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
        : 'Selecciona una fecha';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">Mover Cita</h3>
                        <p className="text-sm text-neutral-400 mt-0.5">{cita.nombre_cliente}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-neutral-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Nueva Fecha
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowCalendar(prev => !prev)}
                            className="w-full flex items-center justify-between bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-left transition-all hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none"
                        >
                            <span className="text-sm capitalize text-white">{labelFecha}</span>
                            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${showCalendar ? 'rotate-180' : ''}`} />
                        </button>

                        {showCalendar && (
                            <div className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <style>{`
                                    .rdp {
                                        --rdp-accent-color: #6366f1;
                                        --rdp-background-color: rgba(99,102,241,0.15);
                                        margin: 0;
                                    }
                                    .rdp-months { justify-content: center; }
                                    .rdp-month { width: 100%; }
                                    .rdp-table { width: 100%; }
                                    .rdp-head_cell { color: #6b7280; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.5rem 0; }
                                    .rdp-day { width: 36px; height: 36px; border-radius: 10px; color: #d1d5db; font-size: 0.875rem; transition: background-color 0.15s; }
                                    .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_outside):not(.rdp-day_disabled) { background-color: #374151; color: #fff; }
                                    .rdp-day_selected { background-color: #6366f1 !important; color: #fff !important; font-weight: 600; }
                                    .rdp-day_today:not(.rdp-day_selected) { color: #818cf8; font-weight: 700; }
                                    .rdp-day_outside { color: #374151; opacity: 0.5; }
                                    .rdp-day_disabled { color: #4b5563 !important; opacity: 0.35; cursor: not-allowed; }
                                    .rdp-caption { color: #fff; font-weight: 600; padding: 0 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; }
                                    .rdp-caption_label { font-size: 0.9rem; text-transform: capitalize; }
                                    .rdp-nav_button { color: #9ca3af; border-radius: 8px; width: 28px; height: 28px; transition: background 0.15s, color 0.15s; }
                                    .rdp-nav_button:hover { background: #374151; color: #fff; }
                                `}</style>
                                <DayPicker
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDaySelect}
                                    locale={es}
                                    disabled={[{ before: today }, isDateDisabled]}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            <User className="w-3.5 h-3.5" />
                            Empleado
                        </label>
                        <select
                            value={empleadoId}
                            onChange={e => setEmpleadoId(e.target.value)}
                            className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all appearance-none"
                        >
                            {empleados.map(emp => (
                                <option key={emp.id} value={emp.id} className="bg-neutral-900">
                                    {emp.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            <Clock className="w-3.5 h-3.5" />
                            Hora disponible
                        </label>
                        {loadingCitas ? (
                            <div className="flex items-center gap-2 text-neutral-500 text-sm py-3">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Cargando disponibilidad...
                            </div>
                        ) : availableTimes.length === 0 ? (
                            <p className="text-rose-400 text-sm py-2 px-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                Sin huecos disponibles para esta fecha y empleado.
                            </p>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {availableTimes.map(time => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => setHoraSeleccionada(time)}
                                        className={`py-2 rounded-xl text-sm font-medium transition-all border ${
                                            horaSeleccionada === time
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                                : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-300 hover:border-indigo-500/50 hover:text-white'
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition-all text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !horaSeleccionada || availableTimes.length === 0}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
