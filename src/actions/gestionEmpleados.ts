"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

export async function crearEmpleado(nombre: string, email: string | null | undefined, password: string | null | undefined, idPeluqueria: string) {
    if (!nombre || !idPeluqueria) {
        return { success: false, error: 'Faltan campos obligatorios' };
    }

    try {
        const supabaseAdmin = getAdminClient();

        if (email && password) {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (authError || !authData?.user) {
                return { success: false, error: authError?.message || 'Error al crear usuario en Auth' };
            }

            const userId = authData.user.id;

            let empRes = await supabaseAdmin.from('empleados').insert({ nombre: nombre, id_peluqueria: idPeluqueria }).select().single();

            if (empRes.error || !empRes.data) {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                return { success: false, error: empRes.error?.message || 'Error al registrar en empleados' };
            }

            const empleadoId = empRes.data.id;

            let perRes = await supabaseAdmin.from('perfiles').update({ rol: 'empleado', id_peluqueria: idPeluqueria, id_empleado: empleadoId }).eq('id', userId);

            if (perRes.error) {
                await supabaseAdmin.from('empleados').delete().eq('id', empleadoId);
                await supabaseAdmin.auth.admin.deleteUser(userId);
                return { success: false, error: perRes.error.message };
            }
        } else {
            let empRes = await supabaseAdmin.from('empleados').insert({ nombre: nombre, id_peluqueria: idPeluqueria }).select().single();
            if (empRes.error || !empRes.data) {
                return { success: false, error: empRes.error?.message || 'Error al registrar en empleados' };
            }
        }

        revalidatePath('/admin/empleados');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error general al crear empleado' };
    }
}

export async function borrarEmpleado(authId: string | null, empleadoId: string, idPeluqueria: string) {
    if (!empleadoId || !idPeluqueria) {
        return { success: false, error: 'Datos incompletos para borrar' };
    }

    try {
        const supabaseAdmin = getAdminClient();

        if (authId) {
            let checkRes = await supabaseAdmin.from('perfiles').select('*').eq('id', authId).eq('id_peluqueria', idPeluqueria).single();

            if (checkRes.error || !checkRes.data) {
                return { success: false, error: 'Operación denegada. Brecha de aislamiento detectada.' };
            }

            const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(authId);
            if (delError) {
                return { success: false, error: delError.message };
            }

            await supabaseAdmin.from('perfiles').delete().eq('id', authId);
        }

        await supabaseAdmin.from('empleados').delete().eq('id', empleadoId).eq('id_peluqueria', idPeluqueria);

        revalidatePath('/admin/empleados');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error al eliminar empleado' };
    }
}

export async function getEmpleadosLocal(idPeluqueria: string) {
    if (!idPeluqueria) return { success: false, error: 'No ID', data: [] };
    
    try {
        const supabaseAdmin = getAdminClient();
        
        // Carga directa de la tabla empleados primarios
        let eRes = await supabaseAdmin.from('empleados').select('*').eq('id_peluqueria', idPeluqueria);
        
        if (eRes.error || !eRes.data) {
            return { success: true, data: [] };
        }

        // Obtener perfiles que pertenezcan a estos id_empleado
        const { data: perfilesData } = await supabaseAdmin.from('perfiles').select('id, id_empleado').eq('id_peluqueria', idPeluqueria);
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        
        // Mapeo seguro cross-table Outer Join lógico
        const mapped = eRes.data.map(emp => {
            const perfil = perfilesData?.find(p => p.id_empleado === emp.id);
            const authUser = perfil ? authUsers?.users.find(u => u.id === perfil.id) : null;
            
            return {
                authId: perfil?.id || null,     // null si es un empleado antiguo/manual sin login
                empleadoId: emp.id,             // Siempre presente
                nombre: emp.nombre,             // Siempre presente
                email: authUser?.email || 'Login deshabilitado'
            };
        });

        return { success: true, data: mapped };
    } catch (e: any) {
        return { success: false, error: e.message, data: [] };
    }
}
