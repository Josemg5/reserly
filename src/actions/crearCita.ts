"use server";

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export type CrearCitaPayload = {
    id_peluqueria: string;
    id_empleado: string;
    id_servicio: string;
    nombre_cliente: string;
    telefono: string;
    cliente_email: string;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    estado: string;
};

export type CrearCitaResult = {
    success: boolean;
    id?: string;
    error?: string;
};

export async function crearCita(payload: CrearCitaPayload): Promise<CrearCitaResult> {
    if (
        !payload.id_peluqueria ||
        !payload.id_empleado ||
        !payload.id_servicio ||
        !payload.nombre_cliente ||
        !payload.telefono ||
        !payload.fecha_hora_inicio ||
        !payload.fecha_hora_fin
    ) {
        return { success: false, error: 'Faltan campos obligatorios en el payload.' };
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
        .from('citas')
        .insert([payload])
        .select('id')
        .single();

    if (error) {
        console.error('[crearCita] Error al insertar cita:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            payload,
        });
        return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
}
