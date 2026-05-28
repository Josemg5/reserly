import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = getAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);

    const mananaFin = new Date(manana);
    mananaFin.setHours(23, 59, 59, 999);

    let citasRes = await supabase
        .from('Citas')
        .select(`
            id,
            nombre_cliente,
            cliente_email,
            fecha_hora_inicio,
            id_peluqueria,
            servicios ( nombre_servicio ),
            empleados ( nombre ),
            Peluquerias ( nombre_negocio )
        `)
        .eq('estado', 'pendiente')
        .gte('fecha_hora_inicio', manana.toISOString())
        .lte('fecha_hora_inicio', mananaFin.toISOString());

    let citas: any[] = citasRes.data || [];

    if (citasRes.error || citas.length === 0) {
        const fallback = await supabase
            .from('citas')
            .select(`
                id,
                nombre_cliente,
                cliente_email,
                fecha_hora_inicio,
                id_peluqueria,
                servicios ( nombre_servicio ),
                empleados ( nombre ),
                peluquerias ( nombre_negocio )
            `)
            .eq('estado', 'pendiente')
            .gte('fecha_hora_inicio', manana.toISOString())
            .lte('fecha_hora_inicio', mananaFin.toISOString());

        citas = fallback.data || [];
    }

    const { data: logs } = await supabase
        .from('email_logs')
        .select('id_cita')
        .eq('tipo_email', 'recordatorio')
        .eq('estado', 'enviado');

    const citasYaNotificadas = new Set(logs?.map((l: any) => l.id_cita) ?? []);
    const pendientes = citas.filter((c: any) => c.cliente_email && !citasYaNotificadas.has(c.id));

    let enviados = 0;
    let errores = 0;

    for (const cita of pendientes) {
        const fechaObj = new Date(cita.fecha_hora_inicio);
        const dateStr = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timeStr = fechaObj.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });

        const peluqueriaNombre =
            (cita.Peluquerias as any)?.nombre_negocio ||
            (cita.peluquerias as any)?.nombre_negocio ||
            'tu centro';
        const empleadoNombre = (cita.empleados as any)?.nombre ?? '';
        const servicioNombre = Array.isArray(cita.servicios)
            ? cita.servicios.map((s: any) => s.nombre_servicio).join(', ')
            : ((cita.servicios as any)?.nombre_servicio ?? '');

        const html = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0a0a0a; padding: 40px 20px;">
                <div style="max-width: 560px; margin: 0 auto; background: #111111; border-radius: 20px; overflow: hidden; border: 1px solid #1f1f1f;">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 36px;">
                        <p style="margin: 0 0 4px; color: rgba(255,255,255,0.6); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">Recordatorio · Mañana</p>
                        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">${peluqueriaNombre}</h1>
                    </div>
                    <div style="padding: 32px 36px;">
                        <p style="margin: 0 0 28px; color: #a1a1aa; font-size: 15px; line-height: 1.65;">
                            Hola <strong style="color: #ffffff;">${cita.nombre_cliente}</strong>, te recordamos que tienes una cita <strong style="color: #818cf8;">mañana</strong>. Aquí tienes todos los detalles:
                        </p>
                        <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; color: #71717a; font-size: 13px; width: 38%; border-bottom: 1px solid #222;">📅 Fecha</td>
                                    <td style="padding: 10px 0; color: #f4f4f5; font-size: 14px; font-weight: 600; text-transform: capitalize; border-bottom: 1px solid #222;">${dateStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #71717a; font-size: 13px; border-bottom: 1px solid #222;">⏰ Hora</td>
                                    <td style="padding: 10px 0; color: #f4f4f5; font-size: 14px; font-weight: 600; border-bottom: 1px solid #222;">${timeStr}</td>
                                </tr>
                                ${empleadoNombre ? `
                                <tr>
                                    <td style="padding: 10px 0; color: #71717a; font-size: 13px; border-bottom: 1px solid #222;">👤 Profesional</td>
                                    <td style="padding: 10px 0; color: #f4f4f5; font-size: 14px; font-weight: 600; border-bottom: 1px solid #222;">${empleadoNombre}</td>
                                </tr>` : ''}
                                ${servicioNombre ? `
                                <tr>
                                    <td style="padding: 10px 0; color: #71717a; font-size: 13px;">✂️ Servicio</td>
                                    <td style="padding: 10px 0; color: #f4f4f5; font-size: 14px; font-weight: 600;">${servicioNombre}</td>
                                </tr>` : ''}
                            </table>
                        </div>
                        <p style="margin: 0; color: #52525b; font-size: 13px; line-height: 1.6;">
                            Si necesitas cancelar o modificar tu cita, contacta con el centro con la mayor antelación posible. ¡Te esperamos!
                        </p>
                    </div>
                    <div style="padding: 18px 36px; border-top: 1px solid #1f1f1f; text-align: center;">
                        <p style="margin: 0; color: #3f3f46; font-size: 12px;">${peluqueriaNombre} · Recordatorio automático 24h</p>
                    </div>
                </div>
            </div>
        `;

        try {
            await resend.emails.send({
                from: 'Peluquerias App <onboarding@resend.dev>',
                to: [cita.cliente_email],
                subject: `Recordatorio: Tu cita mañana en ${peluqueriaNombre}`,
                html,
            });

            await supabase.from('email_logs').insert({
                id_cita: cita.id,
                tipo_email: 'recordatorio',
                email_destino: cita.cliente_email,
                estado: 'enviado',
            });

            enviados++;
        } catch (_) {
            await supabase.from('email_logs').insert({
                id_cita: cita.id,
                tipo_email: 'recordatorio',
                email_destino: cita.cliente_email,
                estado: 'error',
            });

            errores++;
        }
    }

    return NextResponse.json({
        ok: true,
        totalCitas: citas.length,
        pendientes: pendientes.length,
        enviados,
        errores,
    });
}
