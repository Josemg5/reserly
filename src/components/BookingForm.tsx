"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, User, Scissors, CheckCircle, ChevronRight, ChevronLeft, Phone, ArrowLeft, Loader2, AlertCircle, Mail } from "lucide-react";
import Image from "next/image";
import { crearCita } from "@/actions/crearCita";

type Peluqueria = {
    id: string;
    nombre_negocio: string;
    color_marca?: string;
    logo_url?: string;
    activo?: boolean;
    slug?: string;
};

type Servicio = {
    id: string;
    nombre_servicio: string;
    duracion_minutos: number;
    precio: number;
};

type Empleado = {
    id: string;
    nombre: string;
};

type HorarioSemanal = {
    dia_semana: number;
    abierto: boolean;
    inicio_manana: string;
    fin_manana: string;
    inicio_tarde: string;
    fin_tarde: string;
};

type DiaCerrado = {
    fecha: string;
    descripcion: string;
};

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function BookingForm({ slug }: { slug: string }) {
    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [showSplash, setShowSplash] = useState(true);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [peluqueria, setPeluqueria] = useState<Peluqueria | null>(null);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [horarios, setHorarios] = useState<HorarioSemanal[]>([]);
    const [diasCerrados, setDiasCerrados] = useState<DiaCerrado[]>([]);

    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [lockReason, setLockReason] = useState<string | null>(null);

    const [selectedServices, setSelectedServices] = useState<Servicio[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>("");

    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        async function loadInitialData() {
            try {
                let pelDataResult = await supabase.from("Peluquerias").select("id, nombre_negocio, color_marca, logo_url, activo, slug").eq("slug", slug).single();
                if (!pelDataResult.data) {
                    pelDataResult = await supabase.from("peluquerias").select("id, nombre_negocio, color_marca, logo_url, activo, slug").eq("slug", slug).single();
                }
                console.log('DEBUG PELUQUERIA:', { data: pelDataResult.data, error: pelDataResult.error });

                if (pelDataResult.error || !pelDataResult.data) {
                    setFetchError(true);
                }

                let currentPeluqueria = null;

                if (pelDataResult.data) {
                    currentPeluqueria = pelDataResult.data;
                    setPeluqueria(currentPeluqueria as Peluqueria);
                }

                let servDataResult = await supabase.from("Servicios").select("*");
                if (!servDataResult.data || servDataResult.data.length === 0) {
                    servDataResult = await supabase.from("servicios").select("*");
                }

                if (servDataResult.data) {
                    if (currentPeluqueria) {
                        setServicios(servDataResult.data.filter(s => s.id_peluqueria === currentPeluqueria.id));
                    } else {
                        setServicios(servDataResult.data);
                    }
                }

                let empDataResult = await supabase.from("Empleados").select("*");
                if (!empDataResult.data || empDataResult.data.length === 0) {
                    empDataResult = await supabase.from("empleados").select("*");
                }

                if (empDataResult.data) {
                    if (currentPeluqueria) {
                        setEmpleados(empDataResult.data.filter(e => e.id_peluqueria === currentPeluqueria.id));
                    } else {
                        setEmpleados(empDataResult.data);
                    }
                }

                if (currentPeluqueria) {
                    const hsRes = await supabase.from("horarios_semanales").select("*").eq("id_peluqueria", currentPeluqueria.id);
                    if (hsRes.data && hsRes.data.length > 0) {
                        setHorarios(hsRes.data);
                    } else {
                        const defaultFallback = Array.from({ length: 7 }).map((_, i) => ({
                            dia_semana: i,
                            abierto: i !== 0,
                            inicio_manana: '09:00',
                            fin_manana: '14:00',
                            inicio_tarde: '16:00',
                            fin_tarde: '20:00'
                        }));
                        setHorarios(defaultFallback);
                    }

                    const dcRes = await supabase.from("dias_cerrados").select("fecha, descripcion").eq("id_peluqueria", currentPeluqueria.id);
                    if (dcRes.data) {
                        setDiasCerrados(dcRes.data as any);
                    }
                }

            } catch (err) {
                console.error(err);
                setFetchError(true);
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    const totalDuration = selectedServices.reduce((acc, curr) => acc + curr.duracion_minutos, 0);
    const totalPrice = selectedServices.reduce((acc, curr) => acc + Number(curr.precio), 0);
    const serviceNames = selectedServices.map(s => s.nombre_servicio).join(', ');

    useEffect(() => {
        if (selectedDate && selectedEmployee && selectedServices.length > 0 && peluqueria) {
            calculateSlots();
        }
    }, [selectedDate, selectedEmployee, selectedServices, peluqueria, horarios, diasCerrados, totalDuration]);

    const calculateSlots = async () => {
        if (!selectedDate || !selectedEmployee || selectedServices.length === 0 || !peluqueria) return;

        setSlotsLoading(true);
        setAvailableSlots([]);
        setLockReason(null);

        const localDateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const fechaCerrada = diasCerrados.find(dc => dc.fecha === localDateStr);
        if (fechaCerrada) {
            setLockReason(fechaCerrada.descripcion || "El centro permanece cerrado en esta fecha.");
            setSlotsLoading(false);
            return;
        }

        const numDiaSemana = selectedDate.getDay();
        const horarioDia = horarios.find(h => h.dia_semana === numDiaSemana);

        if (!horarioDia || !horarioDia.abierto) {
            setLockReason("El centro no abre los " + DIAS_SEMANA[numDiaSemana] + "s.");
            setSlotsLoading(false);
            return;
        }

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        let citasResult = await supabase
            .from("Citas")
            .select("fecha_hora_inicio, fecha_hora_fin, estado")
            .eq("id_empleado", selectedEmployee.id)
            .gte("fecha_hora_inicio", startOfDay.toISOString())
            .lte("fecha_hora_fin", endOfDay.toISOString());

        if (!citasResult.data) {
            citasResult = await supabase
                .from("citas")
                .select("fecha_hora_inicio, fecha_hora_fin, estado")
                .eq("id_empleado", selectedEmployee.id)
                .gte("fecha_hora_inicio", startOfDay.toISOString())
                .lte("fecha_hora_fin", endOfDay.toISOString());
        }

        const citas = citasResult.data?.filter(c => c.estado !== "no_asistio") || [];
        const slots: string[] = [];

        const parseTime = (timeStr: string) => timeStr ? timeStr.split(':').map(Number) : [24, 0];

        const [openH, openM] = parseTime(horarioDia.inicio_manana);
        const [closeH, closeM] = parseTime(horarioDia.fin_manana);

        const hasTarde = !!horarioDia.inicio_tarde && !!horarioDia.fin_tarde;
        const [openTardeH, openTardeM] = parseTime(horarioDia.inicio_tarde);
        const [closeTardeH, closeTardeM] = parseTime(horarioDia.fin_tarde);

        let currentSlot = new Date(selectedDate);
        currentSlot.setHours(openH, openM, 0, 0);

        const endWindow = new Date(selectedDate);
        endWindow.setHours(closeH, closeM, 0, 0);

        const startTardeWindow = new Date(selectedDate);
        startTardeWindow.setHours(openTardeH, openTardeM, 0, 0);

        const endTardeWindow = new Date(selectedDate);
        endTardeWindow.setHours(closeTardeH, closeTardeM, 0, 0);

        const now = new Date();
        const absoluteEndWindow = hasTarde ? endTardeWindow : endWindow;

        while (currentSlot < absoluteEndWindow) {
            const slotEnd = new Date(currentSlot.getTime() + totalDuration * 60000);

            const inMorningBlock = (currentSlot >= new Date(new Date(selectedDate).setHours(openH, openM, 0, 0))) && (slotEnd <= endWindow);
            const inAfternoonBlock = hasTarde && (currentSlot >= startTardeWindow) && (slotEnd <= endTardeWindow);

            if ((inMorningBlock || inAfternoonBlock) && currentSlot > now) {
                let isAvailable = true;

                for (const cita of citas) {
                    const cInicio = new Date(cita.fecha_hora_inicio);
                    const cFin = new Date(cita.fecha_hora_fin);

                    if (
                        (currentSlot >= cInicio && currentSlot < cFin) ||
                        (slotEnd > cInicio && slotEnd <= cFin) ||
                        (currentSlot <= cInicio && slotEnd >= cFin)
                    ) {
                        isAvailable = false;
                        break;
                    }
                }

                if (isAvailable) {
                    slots.push(currentSlot.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
                }
            }

            currentSlot.setMinutes(currentSlot.getMinutes() + 10);

            if (hasTarde && currentSlot >= endWindow && currentSlot < startTardeWindow) {
                currentSlot = new Date(startTardeWindow);
            }
        }

        setAvailableSlots(slots);
        setSlotsLoading(false);
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedServices.length === 0 || !selectedEmployee || !selectedDate || !selectedTime || !peluqueria) return;

        setSubmitting(true);

        const [hours, minutes] = selectedTime.split(":").map(Number);
        const fechaInicio = new Date(selectedDate);
        fechaInicio.setHours(hours, minutes, 0, 0);
        const fechaFin = new Date(fechaInicio.getTime() + totalDuration * 60000);

        const mainServiceId = selectedServices[0].id;
        const notes = selectedServices.length > 1 ? `Servicios múltiples seleccionados: ${serviceNames}` : '';

        const payload = {
            id_peluqueria: peluqueria.id,
            id_empleado: selectedEmployee.id,
            id_servicio: mainServiceId,
            nombre_cliente: clientName.trim(),
            telefono: clientPhone.trim() + (notes ? ` | ${notes}` : ''),
            cliente_email: clientEmail.trim(),
            fecha_hora_inicio: fechaInicio.toISOString(),
            fecha_hora_fin: fechaFin.toISOString(),
            estado: 'pendiente',
        };

        const result = await crearCita(payload);

        if (!result.success) {
            console.error('[BookingForm] Server Action crearCita devolvió error:', result.error);
            alert(`Error al procesar tu reserva: ${result.error}`);
            setSubmitting(false);
            return;
        }

        try {
            const diaPrint = selectedDate.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
            fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'reserva',
                    citaId: result.id,
                    clientName,
                    clientEmail,
                    clientPhone,
                    peluqueriaId: peluqueria.id,
                    empleadoNombre: selectedEmployee.nombre,
                    serviceNames,
                    totalPrice,
                    dateStr: diaPrint,
                    timeStr: selectedTime,
                }),
            }).catch(() => {});
        } catch (_) {}

        setBookingSuccess(true);
        setSubmitting(false);
    };

    const toggleService = (srv: Servicio) => {
        setSelectedServices(prev => {
            const isSelected = prev.some(s => s.id === srv.id);
            if (isSelected) {
                return prev.filter(s => s.id !== srv.id);
            } else {
                return [...prev, srv];
            }
        });
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const numericValue = value.replace(/[^0-9+\s-]/g, '');
        setClientPhone(numericValue);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 60);
    maxDate.setHours(23, 59, 59, 999);

    const canGoPrev = currentMonth.getFullYear() > today.getFullYear() || 
                      (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() > today.getMonth());

    const nextMonthFirstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const canGoNext = nextMonthFirstDay <= maxDate;

    const getStartPadding = () => {
        const day = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const handlePrevMonth = () => {
        setCurrentMonth(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() - 1);
            return next;
        });
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + 1);
            return next;
        });
    };

    if (showSplash) {
        return (
            <div style={{ '--brand-color': peluqueria?.color_marca || '#ec4899' } as React.CSSProperties} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 p-4">
                <div className="animate-pulse mb-6">
                    {peluqueria?.logo_url ? (
                        <Image
                            src={peluqueria.logo_url}
                            alt={peluqueria.nombre_negocio || "Logo"}
                            width={160}
                            height={160}
                            className="w-40 h-40 rounded-full object-cover border-4 border-white/20 shadow-2xl"
                        />
                    ) : (
                        <div className="w-40 h-40 rounded-full bg-white/10 border-4 border-white/20 text-white flex items-center justify-center shadow-2xl">
                            <Scissors className="h-16 w-16" />
                        </div>
                    )}
                </div>
                <h1 className="text-4xl font-extrabold tracking-wide text-white text-center mb-8">
                    {peluqueria?.nombre_negocio || "..."}
                </h1>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-white/80" />
                    <span className="text-sm text-white/60 tracking-wider font-light">Cargando servicios...</span>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
        );
    }

    if (fetchError || !peluqueria || peluqueria.activo === false) {
        return (
            <div className="mx-auto max-w-md rounded-3xl bg-white border border-gray-200 p-8 text-center shadow-lg">
                <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">Servicios no disponibles</h2>
                <p className="text-gray-500">
                    En este momento no hemos podido cargar la información de la peluquería. Por favor, inténtalo más tarde.
                </p>
            </div>
        );
    }

    if (bookingSuccess) {
        return (
            <div style={{ '--brand-color': peluqueria?.color_marca || '#ec4899' } as React.CSSProperties} className="mx-auto max-w-md rounded-3xl bg-white border border-gray-200 p-8 text-center shadow-lg">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 border border-green-200 text-green-600">
                    <CheckCircle className="h-10 w-10" />
                </div>
                <h2 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">¡Reserva confirmada!</h2>
                <p className="mb-8 text-gray-600 text-sm">
                    Tu cita para <span className="font-semibold text-gray-900">{serviceNames}</span> con <span className="font-semibold text-gray-900">{selectedEmployee?.nombre}</span> ha sido registrada con éxito.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full rounded-xl bg-[var(--brand-color)] px-6 py-4 font-semibold text-white transition-all hover:opacity-90 focus:ring-4 focus:ring-gray-200"
                >
                    Hacer otra reserva
                </button>
            </div>
        );
    }

    return (
        <div style={{ '--brand-color': peluqueria?.color_marca || '#ec4899' } as React.CSSProperties} className="w-full max-w-4xl mx-auto overflow-hidden rounded-3xl bg-white border border-gray-200 shadow-lg">
            <div className="flex flex-col items-center justify-center bg-[var(--brand-color)] px-8 py-8 text-center">
                <div className={`w-20 h-20 rounded-full overflow-hidden aspect-square mx-auto border border-white/20 flex items-center justify-center shadow-lg mb-4 ${peluqueria?.logo_url ? 'bg-white' : 'bg-white/15 text-white'}`}>
                    {peluqueria?.logo_url ? (
                        <Image
                            src={peluqueria.logo_url}
                            alt={peluqueria.nombre_negocio}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <Scissors className="h-10 w-10" />
                    )}
                </div>
                <h2 className="text-3xl font-bold tracking-wide text-white">
                    {peluqueria?.nombre_negocio}
                </h2>
                <div className="mt-6 w-full max-w-md">
                    <div className="flex justify-between items-center text-xs uppercase tracking-wider text-white/80 mb-2">
                        <span>Paso {step} de 4</span>
                        <span className="font-semibold text-white">
                            {step === 1 && "Servicios"}
                            {step === 2 && "Profesional"}
                            {step === 3 && "Fecha y Hora"}
                            {step === 4 && "Tus Datos"}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-white' : 'bg-white/35'}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-8 text-gray-900">
                {step > 1 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> Volver
                    </button>
                )}

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                            <Scissors className="mr-2 h-5 w-5 text-gray-500" /> Selecciona tus Servicios
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 mb-8">
                            {servicios.map((srv) => {
                                const isSelected = selectedServices.some(s => s.id === srv.id);
                                return (
                                    <button
                                        key={srv.id}
                                        onClick={() => toggleService(srv)}
                                        className={`group relative flex flex-col items-start justify-between space-y-2 rounded-2xl border p-5 text-left transition-all hover:border-[var(--brand-color)] ${isSelected ? 'border-[var(--brand-color)] bg-[var(--brand-color)] text-white shadow-lg' : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100/70'}`}
                                    >
                                        <div className="flex w-full justify-between items-start">
                                            <span className="font-medium pr-2">{srv.nombre_servicio}</span>
                                            <div className={`flex h-5 w-5 items-center justify-center rounded-full border shrink-0 transition-colors ${isSelected ? 'border-white bg-white/20 text-white' : 'border-gray-300 text-transparent'}`}>
                                                <CheckCircle className="h-3.5 w-3.5" strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div className={`mt-2 flex w-full items-center justify-between text-sm ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                                            <span>{srv.duracion_minutos} min</span>
                                            <span className="font-semibold">{srv.precio}€</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                            <div>
                                <p className="text-sm text-gray-500">Total acumulado</p>
                                <p className="text-xl font-bold text-gray-900">{totalPrice}€ <span className="text-sm font-normal text-gray-500">({totalDuration} min)</span></p>
                            </div>
                            <button
                                disabled={selectedServices.length === 0}
                                onClick={() => setStep(2)}
                                className="flex items-center justify-center rounded-xl bg-[var(--brand-color)] px-6 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuar <ChevronRight className="ml-2 h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                            <User className="mr-2 h-5 w-5 text-gray-500" /> ¿Con quién te gustaría atenderte?
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {empleados.map((emp) => (
                                <button
                                    key={emp.id}
                                    onClick={() => { setSelectedEmployee(emp); setStep(3); }}
                                    className={`flex items-center rounded-2xl border p-5 transition-all hover:border-[var(--brand-color)] ${selectedEmployee?.id === emp.id ? 'border-[var(--brand-color)] bg-[var(--brand-color)] text-white shadow-lg' : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100/70'}`}
                                >
                                    <div className={`mr-4 flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg transition-colors ${selectedEmployee?.id === emp.id ? 'bg-white text-[var(--brand-color)]' : 'bg-gray-200 text-gray-600'}`}>
                                        {emp.nombre.charAt(0)}
                                    </div>
                                    <span className="font-medium">{emp.nombre}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                            <Calendar className="mr-2 h-5 w-5 text-gray-500" /> Fecha y Hora
                        </h3>

                        <div className="mb-6 max-w-md mx-auto w-full">
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    type="button"
                                    disabled={!canGoPrev}
                                    onClick={handlePrevMonth}
                                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-700"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <span className="font-semibold text-base text-gray-800">
                                    {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </span>
                                <button
                                    type="button"
                                    disabled={!canGoNext}
                                    onClick={handleNextMonth}
                                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-700"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-2 text-center font-medium text-xs text-gray-500 mb-2">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                                    <div key={i} className="py-1 flex items-center justify-center">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: getStartPadding() }).map((_, i) => (
                                    <div key={`pad-${i}`} />
                                ))}
                                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
                                    
                                    const dateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                                    const isPast = dateObj < today;
                                    const isTooFar = dateObj > maxDate;
                                    
                                    const isClosed = diasCerrados.some(dc => dc.fecha === dateStr) ||
                                        horarios.some(h => h.dia_semana === dateObj.getDay() && !h.abierto);
                                        
                                    const isDisabled = isPast || isTooFar || isClosed;
                                    const isSelected = selectedDate?.toDateString() === dateObj.toDateString();
                                    const isToday = dateObj.toDateString() === today.toDateString();

                                    return (
                                        <button
                                            key={`day-${dayNum}`}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => { setSelectedDate(dateObj); setSelectedTime(""); }}
                                            className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center transition-colors text-sm font-semibold ${
                                                isSelected
                                                    ? 'bg-[var(--brand-color)] text-white shadow-md'
                                                    : isDisabled
                                                        ? 'text-gray-300 cursor-not-allowed bg-transparent opacity-30'
                                                        : isToday
                                                            ? 'text-[var(--brand-color)] font-bold border border-[var(--brand-color)]/30 hover:bg-gray-100'
                                                            : 'text-gray-700 hover:bg-gray-100 bg-transparent'
                                            }`}
                                        >
                                            {dayNum}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedDate && (
                            <div className="mt-8 animate-in fade-in duration-300">
                                <h4 className="mb-4 flex items-center justify-between text-sm font-medium text-gray-500">
                                    <div className="flex items-center">
                                        <Clock className="mr-1.5 h-4 w-4" /> Horarios disponibles <span className="ml-2 rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-650">Requiere {totalDuration} min</span>
                                    </div>
                                </h4>

                                {slotsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-color)]" />
                                    </div>
                                ) : lockReason ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex flex-col items-center text-center text-rose-600">
                                        <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
                                        <span className="font-semibold">Sin disponibilidad</span>
                                        <span className="text-sm mt-1 opacity-95">{lockReason}</span>
                                    </div>
                                ) : availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {availableSlots.map((time) => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`rounded-xl border py-3 text-center text-sm font-medium transition-all hover:border-[var(--brand-color)] ${selectedTime === time ? 'border-[var(--brand-color)] bg-[var(--brand-color)] text-white shadow-md' : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100/70'}`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-gray-500">
                                        No hay huecos lo suficientemente grandes disponibles para esta fecha.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-8">
                            <button
                                disabled={!selectedDate || !selectedTime || !!lockReason}
                                onClick={() => setStep(4)}
                                className="flex w-full items-center justify-center rounded-xl bg-[var(--brand-color)] px-6 py-4 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuar <ChevronRight className="ml-2 h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="mb-6 text-xl font-semibold text-gray-900">
                            Tus Datos
                        </h3>

                        <div className="mb-8 rounded-2xl bg-gray-50 border border-gray-200 p-5">
                            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-550">Resumen de tu reserva</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p className="flex justify-between"><span>Servicios:</span> <span className="font-medium text-gray-900 text-right max-w-[200px] leading-tight">{serviceNames}</span></p>
                                <p className="flex justify-between"><span>Profesional:</span> <span className="font-medium text-gray-900">{selectedEmployee?.nombre}</span></p>
                                <p className="flex justify-between"><span>Fecha:</span> <span className="font-medium text-gray-900">{selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                                <p className="flex justify-between flex-wrap gap-2 items-center"><span>Hora:</span> <span className="font-medium px-2 py-1 bg-white rounded-md border border-gray-200 text-amber-600">{selectedTime}</span></p>
                                <div className="mt-3 border-t border-gray-200 pt-3">
                                    <p className="flex justify-between text-base"><span>Total a pagar:</span> <span className="font-bold text-gray-900">{totalPrice}€</span></p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleBooking} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">Nombre completo</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        id="name"
                                        required
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 text-gray-900 outline-none ring-[var(--brand-color)]/20 transition-all focus:border-[var(--brand-color)] focus:ring-4 bg-white"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">Teléfono</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        id="phone"
                                        required
                                        value={clientPhone}
                                        onChange={handlePhoneChange}
                                        pattern="[0-9+\s-]*"
                                        className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 text-gray-900 outline-none ring-[var(--brand-color)]/20 transition-all focus:border-[var(--brand-color)] focus:ring-4 bg-white"
                                        placeholder="Ej. 600 123 456"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Correo electrónico</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        required
                                        value={clientEmail}
                                        onChange={(e) => setClientEmail(e.target.value)}
                                        className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 text-gray-900 outline-none ring-[var(--brand-color)]/20 transition-all focus:border-[var(--brand-color)] focus:ring-4 bg-white"
                                        placeholder="Ej. juan@ejemplo.com"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || !clientName || !clientPhone}
                                    className="flex w-full items-center justify-center rounded-xl bg-[var(--brand-color)] px-6 py-4 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    ) : (
                                        "Confirmar Reserva"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
