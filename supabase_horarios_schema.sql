CREATE TABLE public.horarios_semanales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_peluqueria UUID REFERENCES public.Peluquerias(id) ON DELETE CASCADE,
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    abierto BOOLEAN DEFAULT true,
    inicio_manana TIME NOT NULL DEFAULT '09:00:00',
    fin_manana TIME NOT NULL DEFAULT '14:00:00',
    inicio_tarde TIME,
    fin_tarde TIME,
    UNIQUE(id_peluqueria, dia_semana)
);

ALTER TABLE public.horarios_semanales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de horarios_semanales" 
ON public.horarios_semanales FOR SELECT TO public USING (true);

CREATE POLICY "Admins pueden editar horarios_semanales" 
ON public.horarios_semanales FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM Perfiles WHERE Perfiles.id = auth.uid() AND Perfiles.rol = 'admin'
    )
);

CREATE TABLE public.dias_cerrados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_peluqueria UUID REFERENCES public.Peluquerias(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    descripcion TEXT,
    UNIQUE(id_peluqueria, fecha)
);

ALTER TABLE public.dias_cerrados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de dias_cerrados" 
ON public.dias_cerrados FOR SELECT TO public USING (true);

CREATE POLICY "Admins pueden editar dias_cerrados" 
ON public.dias_cerrados FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM Perfiles WHERE Perfiles.id = auth.uid() AND Perfiles.rol = 'admin'
    )
);
