ALTER TABLE public.Peluquerias 
ADD COLUMN IF NOT EXISTS color_marca TEXT DEFAULT '#4f46e5',
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.Perfiles
ADD COLUMN IF NOT EXISTS id_peluqueria UUID REFERENCES public.Peluquerias(id) ON DELETE CASCADE;

ALTER TABLE public.Peluquerias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de peluquerias" ON public.Peluquerias;
DROP POLICY IF EXISTS "Permitir lectura publica de empleados" ON public.Empleados;
DROP POLICY IF EXISTS "Permitir lectura publica de servicios" ON public.Servicios;
DROP POLICY IF EXISTS "Permitir lectura de citas a usuarios anonimos" ON public.Citas;
DROP POLICY IF EXISTS "Permitir insercion de citas a usuarios anonimos" ON public.Citas;
DROP POLICY IF EXISTS "Admins ven todas las citas, Empleados ven sus propias citas" ON public.Citas;
DROP POLICY IF EXISTS "Admins pueden eliminar citas" ON public.Citas;
DROP POLICY IF EXISTS "Publico lee horarios" ON public.horarios_semanales;
DROP POLICY IF EXISTS "Permite actualizar configuracion a admin" ON public.horarios_semanales;
DROP POLICY IF EXISTS "LecturaLogs" ON public.email_logs;
DROP POLICY IF EXISTS "InsertLogs" ON public.email_logs;

CREATE POLICY "Publico puede ver peluquerias" ON public.Peluquerias FOR SELECT USING (true);

CREATE POLICY "Admin puede actualizar su propia peluqueria" ON public.Peluquerias FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'admin' 
        AND Perfiles.id_peluqueria = Peluquerias.id
    )
);

CREATE POLICY "Publico puede ver empleados" ON public.Empleados FOR SELECT USING (true);

CREATE POLICY "Admin puede modificar sus empleados" ON public.Empleados FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'admin' 
        AND Perfiles.id_peluqueria = Empleados.id_peluqueria
    )
);

CREATE POLICY "Publico puede ver servicios" ON public.Servicios FOR SELECT USING (true);

CREATE POLICY "Admin puede modificar sus servicios" ON public.Servicios FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'admin' 
        AND Perfiles.id_peluqueria = Servicios.id_peluqueria
    )
);

CREATE POLICY "Admins leen citas de su peluqueria" ON public.Citas FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'admin' 
        AND Perfiles.id_peluqueria = Citas.id_peluqueria
    )
);

CREATE POLICY "Empleados leen sus propias citas" ON public.Citas FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'empleado' 
        AND Perfiles.id_empleado = Citas.id_empleado
    )
);

CREATE POLICY "Publico puede reservar" ON public.Citas FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins pueden gestionar citas" ON public.Citas FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'admin' 
        AND Perfiles.id_peluqueria = Citas.id_peluqueria
    )
);

CREATE POLICY "Admins pueden eliminar citas SAAS" ON public.Citas FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'admin' 
        AND Perfiles.id_peluqueria = Citas.id_peluqueria
    )
);

CREATE POLICY "Publico lee horarios" ON public.horarios_semanales FOR SELECT USING (true);

CREATE POLICY "Admins gestionan horarios" ON public.horarios_semanales FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles 
        WHERE Perfiles.id = auth.uid() 
        AND Perfiles.rol = 'admin' 
        AND Perfiles.id_peluqueria = horarios_semanales.id_peluqueria
    )
);

CREATE POLICY "Cron y Publico leen logs" ON public.email_logs FOR SELECT USING (true);

CREATE POLICY "API inserta logs" ON public.email_logs FOR INSERT WITH CHECK (true);
