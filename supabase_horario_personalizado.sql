ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS horario_personalizado JSONB DEFAULT null;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS ausencias JSONB DEFAULT '[]'::jsonb;
