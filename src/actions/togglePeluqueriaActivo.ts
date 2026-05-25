"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function togglePeluqueriaActivo(id: string, currentStatus: boolean) {
    const adminSupabase = getAdminClient();
    const { error } = await adminSupabase
        .from('peluquerias')
        .update({ activo: !currentStatus })
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }
    revalidatePath('/superadmin');
    return { success: true };
}
