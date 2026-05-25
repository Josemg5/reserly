-- 1. Crear tabla Perfiles vinculada a auth.users
CREATE TABLE Perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'empleado')),
    id_empleado UUID REFERENCES Empleados(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Habilitar seguridad a nivel de filas (RLS)
ALTER TABLE Perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS para Perfiles
-- (Cualquiera autenticado puede leer su propio perfil)
CREATE POLICY "Usuarios pueden leer su propio perfil" 
ON Perfiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- 4. Actualizar políticas de Citas para que los empleados solo puedan ver sus citas y los admins todo.
-- (Eliminamos políticas viejas si existen)
DROP POLICY IF EXISTS "Permitir lectura publica" ON Citas;

-- Nueva política: Admins ven todo, Empleados ven sus propias citas y las pendientes
CREATE POLICY "Admins ven todas las citas, Empleados ven sus propias citas" 
ON Citas FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM Perfiles 
        WHERE Perfiles.id = auth.uid() 
          AND (Perfiles.rol = 'admin' OR (Perfiles.rol = 'empleado' AND Perfiles.id_empleado = Citas.id_empleado))
    )
);

-- Mantener la política de inserción anónima para que los clientes sigan pudiendo reservar desde /reservar
CREATE POLICY "Permitir insercion anonima" ON Citas FOR INSERT WITH CHECK (true);

-- (Opcional) Trigger para auto-crear perfil (por defecto empleado) cuando alguien se registra en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.Perfiles (id, rol)
  VALUES (new.id, 'empleado');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- IMPORTANTE: Para habilitar los turnos de tarde del Panel de Configuración, es necesario añadir estas columnas
-- a la tabla Peluquerias directamente en la interfaz de Supabase (SQL Editor):
-- ALTER TABLE Peluquerias ADD COLUMN horario_apertura_tarde TIME;
-- ALTER TABLE Peluquerias ADD COLUMN horario_cierre_tarde TIME;
