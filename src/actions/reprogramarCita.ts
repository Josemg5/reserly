"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export type ReprogramarCitaResult = {
    success: boolean;
    error?: string;
};

export async function reprogramarCita(
    citaId: string,
    nuevaFechaHoraInicio: string,
    nuevaFechaHoraFin: string,
    nuevoEmpleadoId: string
): Promise<ReprogramarCitaResult> {
    if (!citaId || !nuevaFechaHoraInicio || !nuevaFechaHoraFin || !nuevoEmpleadoId) {
        return { success: false, error: 'Faltan campos obligatorios para reprogramar.' };
    }

    const supabase = getAdminClient();

    let { error } = await supabase
        .from('Citas')
        .update({
            fecha_hora_inicio: nuevaFechaHoraInicio,
            fecha_hora_fin: nuevaFechaHoraFin,
            id_empleado: nuevoEmpleadoId,
        })
        .eq('id', citaId);

    if (error) {
        const fallback = await supabase
            .from('citas')
            .update({
                fecha_hora_inicio: nuevaFechaHoraInicio,
                fecha_hora_fin: nuevaFechaHoraFin,
                id_empleado: nuevoEmpleadoId,
            })
            .eq('id', citaId);
        error = fallback.error;
    }

    if (error) {
        return { success: false, error: error.message };
    }

    let citaData: any = null;

    const citaResUpper = await supabase
        .from('Citas')
        .select('nombre_cliente, cliente_email, id_peluqueria, empleados(nombre), servicios(nombre_servicio)')
        .eq('id', citaId)
        .single();

    if (citaResUpper.data) {
        citaData = citaResUpper.data;
    } else {
        const citaResLower = await supabase
            .from('citas')
            .select('nombre_cliente, cliente_email, id_peluqueria, empleados(nombre), servicios(nombre_servicio)')
            .eq('id', citaId)
            .single();
        citaData = citaResLower.data;
    }

    if (citaData?.cliente_email) {
        let peluqueriaData: any = null;

        const pelResUpper = await supabase
            .from('Peluquerias')
            .select('nombre_negocio')
            .eq('id', citaData.id_peluqueria)
            .single();

        if (pelResUpper.data) {
            peluqueriaData = pelResUpper.data;
        } else {
            const pelResLower = await supabase
                .from('peluquerias')
                .select('nombre_negocio')
                .eq('id', citaData.id_peluqueria)
                .single();
            peluqueriaData = pelResLower.data;
        }

        const nuevaFecha = new Date(nuevaFechaHoraInicio);
        const dateStr = nuevaFecha.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timeStr = nuevaFecha.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });

        const peluqueriaNombre = peluqueriaData?.nombre_negocio ?? 'tu centro';
        const empleadoNombre = (citaData.empleados as any)?.nombre ?? '';
        const servicioNombre = (citaData.servicios as any)?.nombre_servicio ?? '';

        const html = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
                <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07);">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 40px;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">Cita Reprogramada</h1>
                        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.75); font-size: 14px;">${peluqueriaNombre}</p>
                    </div>
                    <div style="padding: 36px 40px;">
                        <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                            Hola <strong>${citaData.nombre_cliente}</strong>, te informamos de que tu cita ha sido <strong>reprogramada</strong> con éxito. Aquí tienes los nuevos detalles:
                        </p>
                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 40%;">📅 Nueva fecha</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-transform: capitalize;">${dateStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">⏰ Nueva hora</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${timeStr}</td>
                                </tr>
                                ${empleadoNombre ? `<tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">👤 Profesional</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${empleadoNombre}</td>
                                </tr>` : ''}
                                ${servicioNombre ? `<tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">✂️ Servicio</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${servicioNombre}</td>
                                </tr>` : ''}
                            </table>
                        </div>
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.6;">
                            Si tienes alguna duda o necesitas hacer algún cambio, no dudes en contactarnos.
                        </p>
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">¡Te esperamos!</p>
                    </div>
                    <div style="padding: 20px 40px; border-top: 1px solid #f3f4f6; text-align: center;">
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">${peluqueriaNombre} · Correo generado automáticamente</p>
                    </div>
                </div>
            </div>
        `;

        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'Peluquerias App <onboarding@resend.dev>',
                to: [citaData.cliente_email],
                subject: `Actualización de tu reserva en ${peluqueriaNombre}`,
                html,
            });
        } catch (_) {
        }
    }

    revalidatePath('/');
    return { success: true };
}
