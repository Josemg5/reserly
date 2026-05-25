-- ==========================================
-- SCRIPT DE CORRECIÓN PARA PERMISOS DE ADMIN
-- ==========================================
-- Soluciona el error donde los administradores no podían guardar 
-- nuevos Servicios o Empleados porque el RLS interno los bloqueaba.

-- 1. Aseguramos que el RLS esté encendido
ALTER TABLE public.Servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Empleados ENABLE ROW LEVEL SECURITY;

-- 2. Limpieza de posibles políticas ALL previas que fuesen defectuosas
DROP POLICY IF EXISTS "Admins pueden gestionar servicios" ON public.Servicios;
DROP POLICY IF EXISTS "Admins pueden gestionar empleados" ON public.Empleados;

-- 3. Crear política para que Administradores puedan Insertar, Mapear y Borrar SERVICIOS
CREATE POLICY "Admins pueden gestionar servicios" 
ON public.Servicios FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles WHERE Perfiles.id = auth.uid() AND Perfiles.rol = 'admin'
    )
);

-- 4. Crear política para que Administradores puedan Insertar, Mapear y Borrar EMPLEADOS
CREATE POLICY "Admins pueden gestionar empleados" 
ON public.Empleados FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.Perfiles WHERE Perfiles.id = auth.uid() AND Perfiles.rol = 'admin'
    )
);

-- Nota: Las políticas publicas SELECT (ver) que hay en supabase_schema.sql se mantienen porque son "FOR SELECT" separadas.
