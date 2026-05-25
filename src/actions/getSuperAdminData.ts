"use server";

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function getSuperAdminData() {
    const adminSupabase = getAdminClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [citasReq, perfilesReq, peluqueriasReq, emailsReq] = await Promise.all([
        adminSupabase.from('citas').select('id', { count: 'exact', head: true }),
        adminSupabase.from('perfiles').select('id', { count: 'exact', head: true }),
        adminSupabase.from('peluquerias').select('id', { count: 'exact', head: true }),
        adminSupabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('estado', 'enviado').gte('fecha_envio', thirtyDaysAgo.toISOString())
    ]);

    const totalC = citasReq.count || 0;
    const totalP = perfilesReq.count || 0;
    const totalPel = peluqueriasReq.count || 0;
    const totalEmails = emailsReq.count || 0;

    const recentL = await adminSupabase.from('email_logs').select('*').order('fecha_envio', { ascending: false }).limit(20);

    let peluqueriasListReq = await adminSupabase
        .from('peluquerias')
        .select('*')
        .order('nombre_negocio', { ascending: true });

    let peluList = peluqueriasListReq.data || [];

    return {
        citasCount: totalC,
        perfilesCount: totalP,
        peluqueriasCount: totalPel,
        emails30Days: totalEmails,
        recentLogs: recentL.data || [],
        peluqueriasList: peluList
    };
}
