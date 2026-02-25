import { supabase } from '@/lib/supabase';
import ClientDate from '@/components/ClientDate';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data: citas } = await supabase
    .from('citas')
    .select(`
      id,
      nombre_cliente,
      telefono,
      fecha_hora_inicio,
      fecha_hora_fin,
      estado,
      servicios (
        nombre_servicio,
        precio
      ),
      empleados (
        nombre
      )
    `)
    .gte('fecha_hora_inicio', startOfDay.toISOString())
    .lte('fecha_hora_inicio', endOfDay.toISOString())
    .order('fecha_hora_inicio', { ascending: true });

  const ingresosEstimados = citas?.reduce((acc, cita) => {
    if (cita.estado !== 'no_asistio') {
      return acc + (Number((cita.servicios as any)?.precio) || 0);
    }
    return acc;
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-50 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-800/80 pb-6 pt-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
              Dashboard de Administrador
            </h1>
            <p className="text-neutral-400 text-sm md:text-base">
              Resumen de citas e ingresos estimados para el día de hoy.
            </p>
          </div>
          <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 px-6 py-5 rounded-3xl flex flex-col items-end backdrop-blur-xl shadow-lg shadow-indigo-900/10">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-1.5 opacity-90">
              Ingresos Estimados
            </span>
            <span className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
              ${ingresosEstimados.toFixed(2)}
            </span>
          </div>
        </header>

        <main>
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="px-6 py-5 border-b border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Citas de Hoy
              </h2>
              <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 py-1.5 px-4 rounded-full text-sm font-medium">
                {citas?.length || 0} programadas
              </span>
            </div>
            <div className="divide-y divide-neutral-800/50">
              {citas && citas.length > 0 ? (
                citas.map((cita) => (
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
                          <span className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
                            <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {(cita.empleados as any)?.nombre}
                          </span>
                          {cita.telefono && (
                            <span className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
                              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              {cita.telefono}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3 pl-14 sm:pl-0">
                      <div className="text-right sm:text-left">
                        <p className="text-sm font-medium text-neutral-200">{(cita.servicios as any)?.nombre_servicio}</p>
                        <p className="text-indigo-400 font-semibold tracking-tight">${(cita.servicios as any)?.precio}</p>
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
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-neutral-800/50 rounded-full flex items-center justify-center text-neutral-600 mb-6 border border-neutral-800">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-xl font-medium text-neutral-200">No hay citas registradas para hoy</h3>
                  <p className="text-neutral-500 mt-2 max-w-sm leading-relaxed">
                    El calendario está libre por el momento. Las nuevas reservas aparecerán aquí automáticamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
