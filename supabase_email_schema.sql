-- 1. Añadimos campo de email para el cliente que realiza la reserva
ALTER TABLE public.Citas ADD COLUMN cliente_email TEXT;

-- 2. Añadimos campo de email de contacto del negocio (multi-tenant)
-- NOTA: Como la web puede tener múltiples peluquerías en el futuro, cada local 
-- podrá definir en base de datos a qué correo enviar el aviso del dueño.
ALTER TABLE public.Peluquerias ADD COLUMN email_contacto TEXT;
