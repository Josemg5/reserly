"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ClientDate from '@/components/ClientDate';
import { Calendar, ChevronDown, LogOut, Settings, User, Trash2, TrendingUp, BarChart2, Star, Users, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const logicalTimeIntervals = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30"
];

export default function DashboardClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [citas, setCitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [serviciosExtra, setServiciosExtra] = useState<any[]>([]);
  const router = useRouter();

  const [statsData, setStatsData] = useState<any>({
    ingresosMes: 0,
    empleadoEstrella: null,
    servicioEstrella: null,
    totalCitasMes: 0,
    empleadosCount: 1,
    chartData: []
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<number>(0);
  const [calYear, setCalYear] = useState<number>(0);
  const [manualCita, setManualCita] = useState({
    id_empleado: '',
    id_servicio: '',
    fecha: '',
    hora: '09:00',
    nombre_cliente: '',
    telefono: '',
    cliente_email: ''
  });
  const [empleadosSalon, setEmpleadosSalon] = useState<any[]>([]);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [selectedManualServices, setSelectedManualServices] = useState<string[]>([]);
  const [existingCitasEmpleado, setExistingCitasEmpleado] = useState<any[]>([]);

  const monthNames = useMemo(() => [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ], []);

  const daysInMonth = useMemo(() => {
    if (!calYear) return [];
    const date = new Date(calYear, calMonth, 1);
    const days = [];
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    let firstDayIndex = date.getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(calYear, calMonth, d));
    }
    return days;
  }, [calMonth, calYear]);

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    if (compareDate < today) return true;
    if (date.getDay() === 0) return true;
    return false;
  };

  const isSelected = (date: Date) => {
    if (!manualCita.fecha) return false;
    const [year, month, day] = manualCita.fecha.split('-').map(Number);
    return date.getDate() === day &&
      date.getMonth() === month - 1 &&
      date.getFullYear() === year;
  };

  const handleSelectDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    setManualCita(prev => ({ ...prev, fecha: dateStr }));
  };

  const handlePrevMonth = () => {
    setCalMonth(prev => {
      if (prev === 0) {
        setCalYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalMonth(prev => {
      if (prev === 11) {
        setCalYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  useEffect(() => {
    setIsMounted(true);
    const initDate = new Date();
    const initYear = initDate.getFullYear();
    const initMonth = String(initDate.getMonth() + 1).padStart(2, '0');
    const initDay = String(initDate.getDate()).padStart(2, '0');
    setSelectedDate(`${initYear}-${initMonth}-${initDay}`);
  }, []);

  const { totalDuration, totalPrice } = useMemo(() => {
    let dur = 0;
    let prc = 0;
    selectedManualServices.forEach(id => {
      const s = serviciosExtra.find(srv => srv.id === id);
      if (s) {
        dur += Number(s.duracion_minutos) || 0;
        prc += Number(s.precio) || 0;
      }
    });
    return { totalDuration: dur, totalPrice: prc };
  }, [selectedManualServices, serviciosExtra]);

  useEffect(() => {
    async function fetchExistingCitas() {
      if (!manualCita.id_empleado || !manualCita.fecha) {
        setExistingCitasEmpleado([]);
        return;
      }
      const startOfDay = new Date(`${manualCita.fecha}T00:00:00`);
      const endOfDay = new Date(`${manualCita.fecha}T23:59:59.999`);
      let res = await supabase
        .from('Citas')
        .select('id, fecha_hora_inicio, fecha_hora_fin, id_servicio, servicios(duracion_minutos)')
        .eq('id_empleado', manualCita.id_empleado)
        .gte('fecha_hora_inicio', startOfDay.toISOString())
        .lte('fecha_hora_inicio', endOfDay.toISOString());
      if (res.error || !res.data) {
        res = await supabase
          .from('citas')
          .select('id, fecha_hora_inicio, fecha_hora_fin, id_servicio, servicios(duracion_minutos)')
          .eq('id_empleado', manualCita.id_empleado)
          .gte('fecha_hora_inicio', startOfDay.toISOString())
          .lte('fecha_hora_inicio', endOfDay.toISOString());
      }
      if (res.data) {
        setExistingCitasEmpleado(res.data);
      } else {
        setExistingCitasEmpleado([]);
      }
    }
    fetchExistingCitas();
  }, [manualCita.id_empleado, manualCita.fecha, refreshTrigger]);

  const availableManualTimes = useMemo(() => {
    if (!manualCita.fecha) return logicalTimeIntervals;
    return logicalTimeIntervals.filter(time => {
      const candidateStart = new Date(`${manualCita.fecha}T${time}:00`);
      const candidateEnd = new Date(candidateStart.getTime() + totalDuration * 60000);
      const hasOverlap = existingCitasEmpleado.some(cita => {
        const existStart = new Date(cita.fecha_hora_inicio);
        const existEnd = new Date(cita.fecha_hora_fin);
        return candidateStart < existEnd && existStart < candidateEnd;
      });
      return !hasOverlap;
    });
  }, [manualCita.fecha, existingCitasEmpleado, totalDuration]);

  useEffect(() => {
    if (availableManualTimes.length > 0) {
      if (!availableManualTimes.includes(manualCita.hora)) {
        setManualCita(prev => ({ ...prev, hora: availableManualTimes[0] }));
      }
    } else {
      setManualCita(prev => ({ ...prev, hora: '' }));
    }
  }, [availableManualTimes, manualCita.hora]);

  useEffect(() => {
    async function loadEmpleados() {
      if (authLoading || !userProfile) return;
      let empDataResult = await supabase.from("Empleados").select("*").eq('id_peluqueria', userProfile.id_peluqueria);
      if (!empDataResult.data || empDataResult.data.length === 0) {
        empDataResult = await supabase.from("empleados").select("*").eq('id_peluqueria', userProfile.id_peluqueria);
      }
      if (empDataResult.data) {
        setEmpleadosSalon(empDataResult.data);
      }
    }
    loadEmpleados();
  }, [authLoading, userProfile]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('Perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      let profile = profileData;
      if (!profile) {
        const fallbackProfileRes = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (fallbackProfileRes.data) {
          profile = fallbackProfileRes.data;
        } else {
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }
      }
      
      setUserProfile(profile);

      if (profile?.rol === 'superadmin') {
        router.push('/superadmin');
        return;
      }

      if (profile?.id_peluqueria) {
          let bRes = await supabase.from('peluquerias').select('nombre_negocio, activo').eq('id', profile.id_peluqueria).single();
          if (!bRes.data) {
              bRes = await supabase.from('Peluquerias').select('nombre_negocio, activo').eq('id', profile.id_peluqueria).single();
          }
          if (bRes.data && bRes.data.activo === false) {
              router.push('/cuenta-suspendida');
              return;
          }
          if (bRes.data?.nombre_negocio) setBusinessName(bRes.data.nombre_negocio);
      }

      setAuthLoading(false);
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function loadAllServices() {
      let servDataResult = await supabase.from("Servicios").select("*").eq('id_peluqueria', userProfile.id_peluqueria);
      if (!servDataResult.data || servDataResult.data.length === 0) {
        servDataResult = await supabase.from("servicios").select("*").eq('id_peluqueria', userProfile.id_peluqueria);
      }
      if (servDataResult.data) {
        setServiciosExtra(servDataResult.data);
      }
    }
    if (!authLoading && userProfile) {
      loadAllServices();
    }
  }, [authLoading, userProfile]);

  useEffect(() => {
    async function loadStats() {
      if (authLoading || !userProfile || userProfile.rol !== 'admin') {
         if (!authLoading) setLoadingStats(false);
         return;
      }
      setLoadingStats(true);

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0,0,0,0);

      const startQuery = startOfMonth < sevenDaysAgo ? startOfMonth : sevenDaysAgo;
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      let [citasRes, empRes] = await Promise.all([
        supabase
          .from('Citas')
          .select('id, estado, fecha_hora_inicio, id_empleado, telefono, servicios(nombre_servicio, precio), empleados(nombre)')
          .eq('id_peluqueria', userProfile.id_peluqueria)
          .gte('fecha_hora_inicio', startQuery.toISOString())
          .lte('fecha_hora_inicio', endOfDay.toISOString()),
        supabase
          .from('Empleados')
          .select('id', { count: 'exact', head: true })
          .eq('id_peluqueria', userProfile.id_peluqueria)
      ]);

      if (!citasRes.data) {
         citasRes = await supabase
          .from('citas')
          .select('id, estado, fecha_hora_inicio, id_empleado, telefono, servicios(nombre_servicio, precio), empleados(nombre)')
          .eq('id_peluqueria', userProfile.id_peluqueria)
          .gte('fecha_hora_inicio', startQuery.toISOString())
          .lte('fecha_hora_inicio', endOfDay.toISOString());
      }
      let empCount = empRes.count || 0;
      if (empRes.error && !empCount) {
         const fallbackE = await supabase
          .from('empleados')
          .select('id', { count: 'exact', head: true })
          .eq('id_peluqueria', userProfile.id_peluqueria);
         empCount = fallbackE.count || 0;
      }

      const allCitas = citasRes.data || [];

      let ingresos = 0;
      let totalCitas = 0;
      const empCounter: any = {};
      const servCounter: any = {};

      const currentMonthStartTime = startOfMonth.getTime();
      
      allCitas.forEach((c: any) => {
        const cDate = new Date(c.fecha_hora_inicio);
        if (cDate.getTime() >= currentMonthStartTime && c.estado !== 'no_asistio') {
          totalCitas++;
          
          let p = Number(c.servicios?.precio) || 0;
          let sName = c.servicios?.nombre_servicio;
          
          if (c.telefono && c.telefono.includes('Servicios múltiples seleccionados:')) {
            const parts = c.telefono.split('Servicios múltiples seleccionados:');
            sName = 'Servicios múltiples';
            if (parts.length > 1) {
              const servicesString = parts[1].trim();
              const individualServices = servicesString.split(',').map((s: string) => s.trim());
              let calcP = 0;
              individualServices.forEach((sN: string) => {
                 const srcS = serviciosExtra.find(sx => sx.nombre_servicio === sN);
                 if (srcS) calcP += Number(srcS.precio);
              });
              if (calcP > 0) p = calcP;
            }
          }
          ingresos += p;

          if (c.empleados?.nombre) {
             empCounter[c.empleados.nombre] = (empCounter[c.empleados.nombre] || 0) + 1;
          }
          if (sName) {
             servCounter[sName] = (servCounter[sName] || 0) + 1;
          }
        }
      });

      let empTop = null;
      let maxEmp = 0;
      for (const [k, v] of Object.entries(empCounter)) {
         if ((v as number) > maxEmp) { maxEmp = v as number; empTop = k; }
      }

      let servTop = null;
      let maxServ = 0;
      for (const [k, v] of Object.entries(servCounter)) {
         if ((v as number) > maxServ) { maxServ = v as number; servTop = k; }
      }

      const dDays = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
      const chartMap: any = {};
      for (let i = 6; i >= 0; i--) {
         const d = new Date(today);
         d.setDate(today.getDate() - i);
         const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
         chartMap[key] = { dia: dDays[d.getDay()], ingresos: 0, citas: 0 };
      }

      const sevenDaysStartTime = sevenDaysAgo.getTime();
      allCitas.forEach((c: any) => {
         const cd = new Date(c.fecha_hora_inicio);
         if (cd.getTime() >= sevenDaysStartTime && c.estado !== 'no_asistio') {
            const k = `${cd.getFullYear()}-${cd.getMonth()}-${cd.getDate()}`;
            if (chartMap[k]) {
               chartMap[k].citas++;
               let xp = Number(c.servicios?.precio) || 0;
               if (c.telefono && c.telefono.includes('Servicios múltiples seleccionados:')) {
                  const parts = c.telefono.split('Servicios múltiples seleccionados:');
                  if (parts.length > 1) {
                    const servicesString = parts[1].trim();
                     const individualServices = servicesString.split(',').map((s: string) => s.trim());
                    let calcP = 0;
                    individualServices.forEach((sN: string) => {
                       const srcS = serviciosExtra.find(sx => sx.nombre_servicio === sN);
                       if (srcS) calcP += Number(srcS.precio);
                    });
                    if (calcP > 0) xp = calcP;
                  }
               }
               chartMap[k].ingresos += xp;
            }
         }
      });

      setStatsData({
         ingresosMes: ingresos,
         empleadosCount: empCount,
         empleadoEstrella: empTop || '-',
         servicioEstrella: servTop || '-',
         totalCitasMes: totalCitas,
         chartData: Object.values(chartMap)
      });
      setLoadingStats(false);
    }
    loadStats();
  }, [authLoading, userProfile, serviciosExtra, refreshTrigger]);

  useEffect(() => {
    async function fetchCitas() {
      if (authLoading || !userProfile || !selectedDate) return;
      setLoading(true);

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('Citas')
        .select(`
          id,
          id_peluqueria,
          nombre_cliente,
          telefono,
          cliente_email,
          fecha_hora_inicio,
          fecha_hora_fin,
          estado,
          id_empleado,
          servicios (
            nombre_servicio,
            precio
          ),
          empleados (
            nombre
          )
        `)
        .eq('id_peluqueria', userProfile.id_peluqueria)
        .gte('fecha_hora_inicio', startOfDay.toISOString())
        .lte('fecha_hora_inicio', endOfDay.toISOString())
        .order('fecha_hora_inicio', { ascending: true });

      if (userProfile.rol === 'empleado' && userProfile.id_empleado) {
        query = query.eq('id_empleado', userProfile.id_empleado);
      }

      let { data } = await query;

      if (!data || data.length === 0) {
        let fallbackQuery = supabase
          .from('citas')
          .select(`
            id,
            id_peluqueria,
            nombre_cliente,
            telefono,
            cliente_email,
            fecha_hora_inicio,
            fecha_hora_fin,
            estado,
            id_empleado,
            servicios (
              nombre_servicio,
              precio
            ),
            empleados (
              nombre
            )
          `)
          .eq('id_peluqueria', userProfile.id_peluqueria)
          .gte('fecha_hora_inicio', startOfDay.toISOString())
          .lte('fecha_hora_inicio', endOfDay.toISOString())
          .order('fecha_hora_inicio', { ascending: true });

        if (userProfile.rol === 'empleado' && userProfile.id_empleado) {
          fallbackQuery = fallbackQuery.eq('id_empleado', userProfile.id_empleado);
        }

        const fallback = await fallbackQuery;
        data = fallback.data;
      }

      setCitas(data || []);
      setLoading(false);
    }

    fetchCitas();
  }, [selectedDate, authLoading, userProfile, refreshTrigger]);

  const processCitaDisplay = (cita: any) => {
    let serviceName = (cita.servicios as any)?.nombre_servicio || '';
    let price = Number((cita.servicios as any)?.precio) || 0;
    let cleanPhone = cita.telefono || '';

    if (cita.telefono && cita.telefono.includes('Servicios múltiples seleccionados:')) {
      const parts = cita.telefono.split('|');
      cleanPhone = parts[0].trim();

      const noteParts = cita.telefono.split('Servicios múltiples seleccionados:');
      if (noteParts.length > 1) {
        const servicesString = noteParts[1].trim();
        const individualServices = servicesString.split(',').map((s: string) => s.trim());

        if (individualServices.length > 2) {
          serviceName = 'Varios servicios';
        } else {
          serviceName = servicesString;
        }

        let precioTotalMultiple = 0;
        individualServices.forEach((sName: string) => {
          const foundService = serviciosExtra.find(s => s.nombre_servicio === sName);
          if (foundService) {
            precioTotalMultiple += Number(foundService.precio);
          }
        });

        if (precioTotalMultiple > 0) {
          price = precioTotalMultiple;
        }
      }
    }

    return { serviceName, price, cleanPhone };
  };

  const handleDeleteCita = async (cita: any) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la cita de ${cita.nombre_cliente} permanentemente?`)) return;
    
    let res = await supabase.from('Citas').delete().eq('id', cita.id);
    if (res.error) res = await supabase.from('citas').delete().eq('id', cita.id);
    
    if (res.error) {
      alert("Error eliminando cita: " + res.error.message);
    } else {
      setCitas(prev => prev.filter(c => c.id !== cita.id));
      if (cita.cliente_email) {
        const datePrintFormatter = new Date(cita.fecha_hora_inicio);
        const diaPrint = datePrintFormatter.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const timeStr = datePrintFormatter.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' });
        const { serviceName } = processCitaDisplay(cita);

        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'cancelacion',
            citaId: cita.id,
            clientName: cita.nombre_cliente,
            clientEmail: cita.cliente_email,
            peluqueriaId: cita.id_peluqueria,
            empleadoNombre: cita.empleados?.nombre || '',
            serviceNames: serviceName,
            dateStr: diaPrint,
            timeStr: timeStr
          })
        }).catch(() => {});
      }
    }
  };

  const handleSaveManualCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCita.id_empleado || selectedManualServices.length === 0 || !manualCita.nombre_cliente || !manualCita.telefono || !manualCita.fecha || !manualCita.hora) {
      setManualError('Por favor, rellena todos los campos obligatorios.');
      return;
    }
    setIsSavingManual(true);
    setManualError(null);
    const startDateTime = new Date(`${manualCita.fecha}T${manualCita.hora}:00`);
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);
    const firstServiceId = selectedManualServices[0];
    let phonePayload = manualCita.telefono.trim();
    if (selectedManualServices.length > 1) {
      const selectedNames = selectedManualServices
        .map(id => serviciosExtra.find(s => s.id === id)?.nombre_servicio)
        .filter(Boolean);
      phonePayload = `${phonePayload} | Servicios múltiples seleccionados: ${selectedNames.join(', ')}`;
    }
    const payload = {
      id_peluqueria: userProfile.id_peluqueria,
      id_empleado: manualCita.id_empleado,
      id_servicio: firstServiceId,
      nombre_cliente: manualCita.nombre_cliente.trim(),
      telefono: phonePayload,
      cliente_email: manualCita.cliente_email.trim() || null,
      fecha_hora_inicio: startDateTime.toISOString(),
      fecha_hora_fin: endDateTime.toISOString(),
      estado: 'pendiente'
    };
    let res = await supabase.from('Citas').insert([payload]);
    if (res.error) {
      res = await supabase.from('citas').insert([payload]);
    }
    if (res.error) {
      setManualError(res.error.message);
      setIsSavingManual(false);
    } else {
      setIsSavingManual(false);
      setIsManualModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const displayedCitas = userProfile?.rol === 'admin'
    ? citas
    : citas.filter(c => c.id_empleado === userProfile?.id_empleado);

  const ingresosEstimados = displayedCitas.reduce((total, cita) => {
    if (cita.estado === 'no_asistio') return total;

    let precioBase = Number((cita.servicios as any)?.precio) || 0;

    if (cita.telefono && cita.telefono.includes('Servicios múltiples seleccionados:')) {
      const parts = cita.telefono.split('Servicios múltiples seleccionados:');
      if (parts.length > 1) {
        const servicesString = parts[1].trim();
        const individualServices = servicesString.split(',').map((s: string) => s.trim());

        let precioTotalMultiple = 0;
        individualServices.forEach((serviceName: string) => {
          const foundService = serviciosExtra.find(s => s.nombre_servicio === serviceName);
          if (foundService) {
            precioTotalMultiple += Number(foundService.precio);
          }
        });

        if (precioTotalMultiple > 0) {
          precioBase = precioTotalMultiple;
        }
      }
    }
    return total + precioBase;
  }, 0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getDayOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 0; i <= 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const localDateIso = `${year}-${month}-${day}`;

      let label = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      label = label.charAt(0).toUpperCase() + label.slice(1);

      if (i === 0) label = `Hoy (${label})`;
      else if (i === 1) label = `Mañana (${label})`;

      options.push({ value: localDateIso, label });
    }
    return options;
  };

  const dayOptions = useMemo(() => {
    if (!isMounted) return [];
    return getDayOptions();
  }, [isMounted]);

  const selectedLabel = useMemo(() => {
    if (!isMounted || !selectedDate) return '';
    return dayOptions.find(opt => opt.value === selectedDate)?.label || '';
  }, [isMounted, dayOptions, selectedDate]);



  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-50 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Navbar Top */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {businessName ? businessName : (userProfile?.rol === 'superadmin' ? 'Cuenta Super Admin' : userProfile?.rol === 'admin' ? 'Cuenta de Administrador' : 'Cuenta de Personal')}
              </h2>
              <p className="text-xs font-medium text-indigo-400/80 uppercase tracking-wider">
                {userProfile?.rol === 'admin' ? 'Panel de Administración' : 'Panel de Personal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userProfile?.rol === 'superadmin' && (
              <button
                onClick={() => router.push('/superadmin')}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 border border-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Activity className="h-4 w-4" /> <span className="hidden sm:inline">Super Admin</span>
              </button>
            )}
            {userProfile?.rol === 'admin' && (
              <button
                onClick={() => router.push('/configuracion')}
                className="flex items-center gap-2 rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Configuración</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-sm font-medium text-rose-400 hover:text-red-300 hover:bg-rose-500/20 transition-colors break-keep"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
              Panel de Control
            </h1>
            <p className="text-neutral-400 text-sm md:text-base">
              {userProfile?.rol === 'admin' ? 'Resumen general de citas e ingresos estimados del día.' : 'Tus citas programadas y tus ingresos generados del día.'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 px-6 py-5 rounded-3xl flex flex-col items-end backdrop-blur-xl shadow-lg shadow-indigo-900/10 min-w-[200px]">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-1.5 opacity-90">
              {userProfile?.rol === 'admin' ? 'Ingresos Totales' : 'Mis Ingresos'}
            </span>
            <span className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
              ${ingresosEstimados.toFixed(2)}
            </span>
          </div>
        </header>

        {userProfile?.rol === 'admin' && !loadingStats && (
          <div className="space-y-6 pt-6 border-t border-neutral-800/80 mb-10 pb-8">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-900/40 border border-neutral-800/60 p-6 rounded-[2rem] flex flex-col justify-between backdrop-blur-sm">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                         <TrendingUp className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-neutral-400">Ingresos del Mes</span>
                   </div>
                   <p className="text-4xl font-bold text-white flex items-baseline gap-1">
                      ${statsData.ingresosMes.toFixed(2)}
                   </p>
                </div>
                
                {statsData.empleadosCount >= 2 ? (
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-6 rounded-[2rem] flex flex-col justify-between backdrop-blur-sm">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                           <Users className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-neutral-400">Empleado Estrella</span>
                     </div>
                     <p className="text-2xl font-bold text-white tracking-tight truncate">
                        {statsData.empleadoEstrella}
                     </p>
                  </div>
                ) : (
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-6 rounded-[2rem] flex flex-col justify-between backdrop-blur-sm">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl">
                           <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-neutral-400">Citas este Mes</span>
                     </div>
                     <p className="text-4xl font-bold text-white flex items-baseline gap-1">
                        {statsData.totalCitasMes}
                     </p>
                  </div>
                )}
                
                <div className="bg-neutral-900/40 border border-neutral-800/60 p-6 rounded-[2rem] flex flex-col justify-between backdrop-blur-sm">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                         <Star className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-neutral-400">Servicio Estrella</span>
                   </div>
                   <p className="text-xl font-bold text-white leading-tight capitalize">
                      {statsData.servicioEstrella}
                   </p>
                </div>
             </div>
             
             <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl overflow-hidden" style={{height: 380}}>
                <div className="flex items-center gap-2 mb-6 pt-2 pl-2">
                   <BarChart2 className="w-5 h-5 text-indigo-400" />
                   <h3 className="text-lg font-medium text-white">Actividad (Últimos 7 días)</h3>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="dia" stroke="#525252" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ color: '#818cf8', fontWeight: 600 }}
                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                        formatter={(val: any) => [`$${Number(val || 0).toFixed(2)}`, 'Ingresos']}
                      />
                      <Bar dataKey="ingresos" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        <main className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <button
              onClick={() => {
                let initDateStr = selectedDate;
                let d = new Date();
                if (selectedDate) {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  if (dateObj.getDay() === 0) {
                    initDateStr = '';
                  } else {
                    d = dateObj;
                  }
                }
                setCalMonth(d.getMonth());
                setCalYear(d.getFullYear());
                setManualCita({
                  id_empleado: empleadosSalon[0]?.id || '',
                  id_servicio: serviciosExtra[0]?.id || '',
                  fecha: initDateStr,
                  hora: '09:00',
                  nombre_cliente: '',
                  telefono: '',
                  cliente_email: ''
                });
                setSelectedManualServices(serviciosExtra[0]?.id ? [serviciosExtra[0].id] : []);
                setManualError(null);
                setIsManualModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 border border-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Calendar className="w-4 h-4" />
              Nueva Cita Manual
            </button>
            {isMounted && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 hover:border-indigo-500 text-neutral-200 text-sm rounded-xl py-3 px-5 outline-none transition-all shadow-sm hover:shadow-indigo-500/10 w-full md:w-auto min-w-[240px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-white">{selectedLabel}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-full md:w-[280px] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar my-1">
                      {dayOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSelectedDate(opt.value);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between group ${selectedDate === opt.value ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}`}
                        >
                          {opt.label}
                          {selectedDate === opt.value && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="px-6 py-5 border-b border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {userProfile?.rol === 'admin' ? 'Citas Globales' : 'Mis Citas'}
              </h2>
              <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 py-1.5 px-4 rounded-full text-sm font-medium">
                {loading ? 'Cargando...' : `${citas.length} programadas`}
              </span>
            </div>

            <div className="divide-y divide-neutral-800/50 min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center p-16">
                  <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : citas && citas.length > 0 ? (
                citas.map((cita) => {
                  const { serviceName, price, cleanPhone } = processCitaDisplay(cita);

                  return (
                    <div key={cita.id} className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-neutral-800/40 transition-all duration-300 group cursor-default">
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-800 border-2 border-neutral-700/50 flex flex-col items-center justify-center text-neutral-300 font-bold shrink-0 shadow-inner overflow-hidden group-hover:border-indigo-500/30 group-hover:bg-indigo-500/5 transition-all">
                          <ClientDate
                            date={cita.fecha_hora_inicio}
                            className="text-xs text-neutral-500 font-medium mb-0.5"
                            style={{ fontSize: '0.65rem', lineHeight: '1' }}
                            onlyHour={true}
                          />
                          <span className="text-lg leading-none mt-0.5">
                            {cita.nombre_cliente.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-neutral-100 flex items-center gap-2 tracking-tight group-hover:text-white transition-colors">
                            {cita.nombre_cliente}
                          </h3>
                          <div className="text-sm text-neutral-400 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
                              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
                              <ClientDate date={cita.fecha_hora_inicio} /> - <ClientDate date={cita.fecha_hora_fin} />
                            </span>

                            {userProfile?.rol === 'admin' && (
                              <span className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
                                <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                {(cita.empleados as any)?.nombre}
                              </span>
                            )}

                            {cleanPhone && (
                              <span className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
                                <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {cleanPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3 pl-14 sm:pl-0">
                        <div className="text-right sm:text-left">
                          <p className="text-sm font-medium text-neutral-200">{serviceName}</p>
                          <p className="text-indigo-400 font-semibold tracking-tight">${price}</p>
                        </div>
                        <div>
                          {cita.estado === 'pendiente' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
                              Pendiente
                            </span>
                          )}
                          {cita.estado === 'completada' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                              Completada
                            </span>
                          )}
                          {cita.estado === 'no_asistio' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner">
                              Ausente
                            </span>
                          )}

                          {userProfile?.rol === 'admin' && (
                            <button
                                onClick={() => handleDeleteCita(cita)}
                                className="ml-3 p-2 rounded-full text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Eliminar cita"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-neutral-800/50 rounded-full flex items-center justify-center text-neutral-600 mb-6 border border-neutral-800">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-xl font-medium text-neutral-200">No hay citas registradas</h3>
                  <p className="text-neutral-500 mt-2 max-w-sm leading-relaxed">
                    El calendario está libre para la fecha seleccionada. Las nuevas reservas aparecerán aquí automáticamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
        {isMounted && isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Nueva Cita Manual</h3>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSaveManualCita} className="p-6 space-y-4">
                {manualError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{manualError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      value={manualCita.nombre_cliente}
                      onChange={e => setManualCita(prev => ({ ...prev, nombre_cliente: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                      placeholder="Ej. Carlos Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Teléfono *</label>
                    <input
                      type="tel"
                      required
                      value={manualCita.telefono}
                      onChange={e => setManualCita(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                      placeholder="Ej. 600123456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Email del Cliente (Opcional)</label>
                  <input
                    type="email"
                    value={manualCita.cliente_email}
                    onChange={e => setManualCita(prev => ({ ...prev, cliente_email: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    placeholder="Ej. cliente@correo.com"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Profesional *</label>
                    <select
                      required
                      value={manualCita.id_empleado}
                      onChange={e => setManualCita(prev => ({ ...prev, id_empleado: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none"
                    >
                      <option value="" disabled>Selecciona profesional</option>
                      {empleadosSalon.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Servicios *</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-neutral-800 rounded-xl p-3 bg-neutral-950 custom-scrollbar">
                      {serviciosExtra.map(srv => {
                        const isSelected = selectedManualServices.includes(srv.id);
                        return (
                          <label key={srv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-900 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedManualServices(prev => [...prev, srv.id]);
                                } else {
                                  setSelectedManualServices(prev => prev.filter(id => id !== srv.id));
                                }
                              }}
                              className="rounded border-neutral-800 text-indigo-600 focus:ring-indigo-500 bg-neutral-950 w-4 h-4 cursor-pointer"
                            />
                            <div className="flex-1 flex justify-between items-center text-sm">
                              <span className="text-neutral-200">{srv.nombre_servicio}</span>
                              <span className="text-neutral-400 text-xs">{srv.duracion_minutos} min - {srv.precio}€</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedManualServices.length > 0 && (
                      <div className="mt-2 text-xs text-neutral-400 flex justify-between bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-800">
                        <span>Servicios seleccionados: {selectedManualServices.length}</span>
                        <span className="font-semibold text-indigo-400">Total: {totalDuration} min | {totalPrice}€</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Fecha *</label>
                    <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-sm font-semibold text-neutral-200">
                          {monthNames[calMonth]} {calYear}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 text-center mb-2">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                          <span key={day} className="text-[10px] font-semibold text-neutral-500 uppercase">
                            {day}
                          </span>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-y-2 justify-items-center">
                        {daysInMonth.map((date, idx) => {
                          if (!date) {
                            return <div key={`empty-${idx}`} className="w-9 h-9"></div>;
                          }
                          const disabled = isDateDisabled(date);
                          const active = isSelected(date);
                          return (
                            <button
                              key={date.toISOString()}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleSelectDate(date)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs transition-all ${
                                disabled
                                  ? 'text-neutral-600 cursor-not-allowed'
                                  : active
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                              }`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Hora *</label>
                    <select
                      required
                      value={manualCita.hora}
                      onChange={e => setManualCita(prev => ({ ...prev, hora: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none"
                    >
                      {availableManualTimes.length === 0 ? (
                        <option value="" disabled>No hay horas disponibles</option>
                      ) : (
                        <>
                          <option value="" disabled>Selecciona hora</option>
                          {availableManualTimes.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-5 py-3 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-sm font-semibold text-neutral-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingManual}
                    className="px-5 py-3 rounded-xl bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  >
                    {isSavingManual ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : 'Guardar Cita'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
