CREATE TABLE Peluquerias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_negocio TEXT NOT NULL,
  tipo_publico TEXT NOT NULL CHECK (tipo_publico IN ('hombres', 'mujeres', 'mixta')),
  horario_apertura TIME NOT NULL,
  horario_cierre TIME NOT NULL
);

CREATE TABLE Empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_peluqueria UUID NOT NULL REFERENCES Peluquerias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL
);

CREATE TABLE Servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_peluqueria UUID NOT NULL REFERENCES Peluquerias(id) ON DELETE CASCADE,
  nombre_servicio TEXT NOT NULL,
  genero_objetivo TEXT NOT NULL CHECK (genero_objetivo IN ('hombres', 'mujeres', 'unisex')),
  duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos > 0),
  precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0)
);

CREATE TABLE Citas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_peluqueria UUID NOT NULL REFERENCES Peluquerias(id) ON DELETE CASCADE,
  id_empleado UUID NOT NULL REFERENCES Empleados(id) ON DELETE CASCADE,
  id_servicio UUID NOT NULL REFERENCES Servicios(id) ON DELETE CASCADE,
  nombre_cliente TEXT NOT NULL,
  telefono TEXT,
  fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'no_asistio')),
  CONSTRAINT chk_fechas CHECK (fecha_hora_fin > fecha_hora_inicio)
);

CREATE OR REPLACE FUNCTION check_cita_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM Citas c
    WHERE c.id_empleado = NEW.id_empleado
      AND (NEW.id IS NULL OR c.id != NEW.id)
      AND c.estado != 'no_asistio'
      AND (
        (NEW.fecha_hora_inicio >= c.fecha_hora_inicio AND NEW.fecha_hora_inicio < c.fecha_hora_fin)
        OR (NEW.fecha_hora_fin > c.fecha_hora_inicio AND NEW.fecha_hora_fin <= c.fecha_hora_fin)
        OR (NEW.fecha_hora_inicio <= c.fecha_hora_inicio AND NEW.fecha_hora_fin >= c.fecha_hora_fin)
      )
  ) THEN
    RAISE EXCEPTION 'El empleado ya tiene una cita en ese horario.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_cita_overlap
BEFORE INSERT OR UPDATE ON Citas
FOR EACH ROW
EXECUTE FUNCTION check_cita_overlap();

ALTER TABLE Peluquerias ENABLE ROW LEVEL SECURITY;
ALTER TABLE Empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE Servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE Citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de peluquerias" ON Peluquerias FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de empleados" ON Empleados FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de servicios" ON Servicios FOR SELECT USING (true);
CREATE POLICY "Permitir lectura de citas a usuarios anonimos" ON Citas FOR SELECT USING (true);
CREATE POLICY "Permitir insercion de citas a usuarios anonimos" ON Citas FOR INSERT WITH CHECK (true);
