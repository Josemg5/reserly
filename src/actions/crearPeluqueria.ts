"use server";

import { createClient } from '@supabase/supabase-js';

export async function crearPeluqueria(formData: FormData) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Falta añadir SUPABASE_SERVICE_ROLE_KEY en el archivo .env.local' };
    }

    const supabaseSettings = {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    };

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseSettings
    );

    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const slug = formData.get('slug') as string;

    if (!nombre || !email || !password || !slug) {
        return { success: false, error: 'Faltan campos' };
    }

    try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError || !authData?.user) {
            return { success: false, error: authError?.message || 'Error en Auth' };
        }

        const userId = authData.user.id;

        const { data: peluqueriaData, error: peluError } = await supabaseAdmin
            .from('peluquerias')
            .insert({
                nombre_negocio: nombre,
                email_contacto: email,
                tipo_publico: 'mixta',
                horario_apertura: '09:00:00',
                horario_cierre: '20:00:00',
                slug: slug
            })
            .select()
            .single();

        if (peluError || !peluqueriaData) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return { success: false, error: peluError?.message || 'Error al guardar empresa' };
        }

        const peluqueriaId = peluqueriaData.id;

        const { error: perError } = await supabaseAdmin
            .from('perfiles')
            .update({
                rol: 'admin',
                id_peluqueria: peluqueriaId,
                id_empleado: null
            })
            .eq('id', userId);

        if (perError) {
            await supabaseAdmin.from('peluquerias').delete().eq('id', peluqueriaId);
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return { success: false, error: perError.message };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error general' };
    }
}
