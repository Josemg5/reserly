import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

// Inicializar Resend utilizando la clave de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tipo = 'reserva', citaId, clientName, clientEmail, clientPhone, peluqueriaId, empleadoNombre, serviceNames, totalPrice, dateStr, timeStr } = body;

        let { data: peluqueria, error: pErr } = await supabase
            .from('Peluquerias')
            .select('nombre_negocio, email_contacto')
            .eq('id', peluqueriaId)
            .single();

        if (pErr && pErr.code === 'PGRST205') {
            const fallback = await supabase
                .from('peluquerias')
                .select('nombre_negocio, email_contacto')
                .eq('id', peluqueriaId)
                .single();
            peluqueria = fallback.data;
            pErr = fallback.error;
        }

        if (pErr || !peluqueria) {
            return NextResponse.json({ error: 'Peluquería no encontrada' }, { status: 404 });
        }

        const peluqueriaNombre = peluqueria.nombre_negocio;
        const duenoEmail = peluqueria.email_contacto;

        const promises = [];

        if (tipo === 'reserva') {
            if (clientEmail) {
                const clientHtml = `
                    <div style="font-family: sans-serif; padding: 30px; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #4f46e5; margin: 0;">¡Tu cita está confirmada!</h1>
                            <p style="color: #666; font-size: 16px;">Gracias por reservar en ${peluqueriaNombre}</p>
                        </div>
                        
                        <p>Hola <strong>${clientName}</strong>,</p>
                        <p>Hemos guardado tu plaza correctamente en nuestro sistema. Aquí tienes los detalles de tu cita:</p>
                        
                        <div style="background: #f4f4f5; padding: 20px; border-radius: 12px; margin: 25px 0;">
                            <p style="margin: 8px 0;">📅 <strong>Día:</strong> ${dateStr}</p>
                            <p style="margin: 8px 0;">⏰ <strong>Hora:</strong> ${timeStr}</p>
                            <p style="margin: 8px 0;">👩‍🎤 <strong>Profesional:</strong> ${empleadoNombre}</p>
                            <p style="margin: 8px 0;">✂️ <strong>Servicios:</strong> ${serviceNames}</p>
                            <hr style="border: 0; border-top: 1px solid #d4d4d8; margin: 15px 0;" />
                            <p style="margin: 0; font-size: 18px;">💶 <strong>Precio Estimado:</strong> <span style="color: #4f46e5; font-weight: bold;">${totalPrice}€</span></p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">Si necesitas cancelar o modificar tu cita, por favor ponte en contacto directamente con nosotros.</p>
                        <p>¡Te esperamos!</p>
                    </div>
                `;

                promises.push(
                    resend.emails.send({
                        from: 'Peluquerias App <onboarding@resend.dev>',
                        to: [clientEmail],
                        subject: `Tu cita en ${peluqueriaNombre} - ${dateStr}`,
                        html: clientHtml,
                    })
                );
            }

            if (duenoEmail) {
                const adminHtml = `
                    <div style="font-family: sans-serif; padding: 20px; color: #333; border-top: 5px solid #e11d48;">
                        <h2 style="color: #e11d48; margin-top: 0;">¡Nueva reserva recibida!</h2>
                        <p>El portal web ha registrado una nueva cita en tu centro <strong>${peluqueriaNombre}</strong>.</p>
                        
                        <div style="background: #fef2f2; border: 1px solid #fecdd3; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;">👤 <strong>Cliente:</strong> ${clientName}</p>
                            <p style="margin: 5px 0;">📞 <strong>Teléfono:</strong> ${clientPhone || 'No proporcionado'}</p>
                            <p style="margin: 5px 0;">📧 <strong>Email:</strong> ${clientEmail || 'No proporcionado'}</p>
                            <hr style="border: 0; border-top: 1px dashed #fecdd3; margin: 15px 0;" />
                            <p style="margin: 5px 0;">📅 <strong>Fecha:</strong> ${dateStr} a las ${timeStr}</p>
                            <p style="margin: 5px 0;">👩‍🎤 <strong>A cargo de:</strong> ${empleadoNombre}</p>
                            <p style="margin: 5px 0;">✂️ <strong>Ficha:</strong> ${serviceNames}</p>
                        </div>
                    </div>
                `;

                promises.push(
                    resend.emails.send({
                        from: 'Avisos Peluquerias <onboarding@resend.dev>',
                        to: [duenoEmail],
                        subject: `NUEVA CITA: ${clientName} - ${dateStr}`,
                        html: adminHtml,
                    })
                );
            }
        } else if (tipo === 'cancelacion') {
            if (clientEmail) {
                const clientHtml = `
                    <div style="font-family: sans-serif; padding: 30px; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #fecdd3; border-radius: 12px; background-color: #fff9fa;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #e11d48; margin: 0;">Cita Cancelada</h1>
                            <p style="color: #666; font-size: 16px;">Notificación de ${peluqueriaNombre}</p>
                        </div>
                        
                        <p>Hola <strong>${clientName}</strong>,</p>
                        <p>Te confirmamos que tu cita ha sido cancelada correctamente desde nuestro sistema.</p>
                        
                        <div style="background: #ffffff; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #fecaca; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <p style="margin: 8px 0; color: #9f1239;">📅 <strong>Día:</strong> <del>${dateStr}</del></p>
                            <p style="margin: 8px 0; color: #9f1239;">⏰ <strong>Hora:</strong> <del>${timeStr}</del></p>
                            <p style="margin: 8px 0; color: #9f1239;">👩‍🎤 <strong>Profesional:</strong> <del>${empleadoNombre}</del></p>
                            <p style="margin: 8px 0; color: #9f1239;">✂️ <strong>Servicios:</strong> <del>${serviceNames}</del></p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">Esperamos volver a verte pronto. Puedes realizar una nueva reserva desde nuestra web cuando lo desees.</p>
                        <p>Un saludo.</p>
                    </div>
                `;

                promises.push(
                    resend.emails.send({
                        from: 'Peluquerias App <onboarding@resend.dev>',
                        to: [clientEmail],
                        subject: `Cita Cancelada en ${peluqueriaNombre} - ${dateStr}`,
                        html: clientHtml,
                    })
                );
            }
        }

        const results = await Promise.allSettled(promises);
        
        let envioExitoso = results.some(r => r.status === 'fulfilled');

        if (citaId) {
            const logPayload = {
                id_cita: citaId,
                tipo_email: tipo,
                email_destino: clientEmail || duenoEmail || '',
                estado: envioExitoso ? 'enviado' : 'error'
            };
            let logRes = await supabase.from('email_logs').insert(logPayload);
            if (logRes.error) {
                await supabase.from('email_logs').insert(logPayload);
            }
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        return NextResponse.json({ error: 'Error interno de servidor procesando correos.' }, { status: 500 });
    }
}
