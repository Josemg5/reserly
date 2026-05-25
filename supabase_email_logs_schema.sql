CREATE TABLE email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_cita UUID NOT NULL,
    tipo_email TEXT NOT NULL CHECK (tipo_email IN ('reserva', 'cancelacion', 'recordatorio')),
    email_destino TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('enviado', 'error')),
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LecturaLogs" ON email_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM Perfiles WHERE Perfiles.id = auth.uid() AND Perfiles.rol = 'admin'));
CREATE POLICY "InsertLogs" ON email_logs FOR INSERT WITH CHECK (true);
