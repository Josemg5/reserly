import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const citasResult = await supabase
        .from('Citas')
        .select(`
            id,
            id_peluqueria,
            nombre_cliente,
            cliente_email,
            fecha_hora_inicio,
            estado,
            servicios (nombre_servicio),
            empleados (nombre),
            Peluquerias (nombre_negocio)
        `)
        .eq('estado', 'pendiente')
        .gte('fecha_hora_inicio', tomorrowStart.toISOString())
        .lte('fecha_hora_inicio', tomorrowEnd.toISOString());

    let citas: any[] = citasResult.data || [];

    if (citasResult.error || !citasResult.data || citas.length === 0) {
        const fallback = await supabase
            .from('citas')
            .select(`
                id,
                id_peluqueria,
                nombre_cliente,
                cliente_email,
                fecha_hora_inicio,
                estado,
                servicios (nombre_servicio),
                empleados (nombre),
                peluquerias (nombre_negocio)
            `)
            .eq('estado', 'pendiente')
            .gte('fecha_hora_inicio', tomorrowStart.toISOString())
            .lte('fecha_hora_inicio', tomorrowEnd.toISOString());
        
        if (fallback.data && fallback.data.length > 0) {
            citas = fallback.data;
        }
    }

    const { data: logs } = await supabase
        .from('email_logs')
        .select('id_cita')
        .eq('tipo_email', 'recordatorio')
        .eq('estado', 'enviado');

    const loggedCitaIds = new Set(logs?.map((l: any) => l.id_cita) || []);
    const pendingCitas = citas.filter((c: any) => !loggedCitaIds.has(c.id) && c.cliente_email);

    const results = [];

    for (const cita of pendingCitas) {
        const nombreNegocio = cita.Peluquerias?.nombre_negocio || cita.peluquerias?.nombre_negocio || '';
        const empleadoNombre = cita.empleados?.nombre || '';
        let serviceNames = '';

        if (Array.isArray(cita.servicios)) {
            serviceNames = cita.servicios.map((s: any) => s.nombre_servicio).join(', ');
        } else {
            serviceNames = cita.servicios?.nombre_servicio || '';
        }

        const dFormat = new Date(cita.fecha_hora_inicio);
        const dateStr = dFormat.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const timeStr = dFormat.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' });

        const clientHtml = `
            <div style="font-family: sans-serif; padding: 30px; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5; margin: 0;">Recordatorio de Cita</h1>
                    <p style="color: #666; font-size: 16px;">${nombreNegocio}</p>
                </div>
                
                <p>Hola <strong>${cita.nombre_cliente}</strong>,</p>
                <p>Te recordamos que tienes una cita programada para mañana.</p>
                
                <div style="background: #f4f4f5; padding: 20px; border-radius: 12px; margin: 25px 0;">
                    <p style="margin: 8px 0;">📅 <strong>Día:</strong> ${dateStr}</p>
                    <p style="margin: 8px 0;">⏰ <strong>Hora:</strong> ${timeStr}</p>
                    <p style="margin: 8px 0;">👩‍🎤 <strong>Profesional:</strong> ${empleadoNombre}</p>
                    <p style="margin: 8px 0;">✂️ <strong>Servicios:</strong> ${serviceNames}</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">Si necesitas cancelar o modificar tu cita, ponte en contacto con nosotros lo antes posible.</p>
                <p>¡Te esperamos!</p>
            </div>
        `;

        try {
            const res = await resend.emails.send({
                from: 'Peluquerias App <onboarding@resend.dev>',
                to: [cita.cliente_email],
                subject: `Recordatorio: Tu cita en ${nombreNegocio} mañana a las ${timeStr}`,
                html: clientHtml,
            });

            const envioExitoso = res.data ? true : false;
            const logPayload = {
                id_cita: cita.id,
                tipo_email: 'recordatorio',
                email_destino: cita.cliente_email,
                estado: envioExitoso ? 'enviado' : 'error'
            };
            
            await supabase.from('email_logs').insert(logPayload);
            results.push({ id: cita.id, status: envioExitoso ? 'enviado' : 'error' });
        } catch (e) {
            const logPayload = {
                id_cita: cita.id,
                tipo_email: 'recordatorio',
                email_destino: cita.cliente_email,
                estado: 'error'
            };
            await supabase.from('email_logs').insert(logPayload);
            results.push({ id: cita.id, status: 'error' });
        }
    }

    return NextResponse.json({ processed: pendingCitas.length, results });
}
