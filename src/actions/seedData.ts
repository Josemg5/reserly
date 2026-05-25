"use server";

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

const NOMBRES_EMPLEADOS = [
    'Lucía Martínez', 'Carlos Ruiz', 'Ana García', 'Javier López', 'Elena Sánchez',
    'Miguel Torres', 'Sofía Ramírez', 'David Hernández', 'Laura Jiménez', 'Andrés Morales',
    'Valentina Castro', 'Sergio Flores', 'Marta Díaz', 'Rubén Molina', 'Patricia Romero',
];

const SERVICIOS_CATALOGO = [
    { nombre_servicio: 'Corte de Cabello',       duracion_minutos: 30,  precio_base: 18,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Tinte Completo',         duracion_minutos: 90,  precio_base: 60,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Peinado y Styling',      duracion_minutos: 45,  precio_base: 25,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Mechas y Highlights',    duracion_minutos: 120, precio_base: 80,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Tratamiento Hidratante', duracion_minutos: 60,  precio_base: 35,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Alisado Brasileño',      duracion_minutos: 150, precio_base: 110, genero_objetivo: 'unisex' },
    { nombre_servicio: 'Manicura Express',       duracion_minutos: 30,  precio_base: 20,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Pedicura Completa',      duracion_minutos: 60,  precio_base: 30,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Corte y Barba',          duracion_minutos: 45,  precio_base: 22,  genero_objetivo: 'unisex' },
    { nombre_servicio: 'Ondas Permanentes',      duracion_minutos: 100, precio_base: 70,  genero_objetivo: 'unisex' },
];

const NOMBRES_CLIENTES = [
    'Alicia Vega', 'Roberto Pérez', 'Carmen López', 'Óscar Navarro', 'Isabel Ferrer',
    'Tomás Blanco', 'Nuria Cano', 'Héctor Prieto', 'Beatriz Aguilar', 'Raúl Santana',
    'Paula Medina', 'Fernando Ibáñez', 'Mónica Ortiz', 'Alberto Guerrero', 'Cristina Ríos',
    'Daniel Paredes', 'Silvia Castaño', 'Marcos Delgado', 'Adriana Cruz', 'Gonzalo Ramos',
    'Teresa Vargas', 'Ignacio Serrano', 'Rebeca Peña', 'Emilio Gil', 'Rosa Salvador',
];

const EMAILS_CLIENTES = [
    'alicia.vega@email.com', 'roberto.perez@email.com', 'carmen.lopez@email.com',
    'oscar.navarro@email.com', 'isabel.ferrer@email.com', 'tomas.blanco@email.com',
    'nuria.cano@email.com', 'hector.prieto@email.com', 'beatriz.aguilar@email.com',
    'raul.santana@email.com', 'paula.medina@email.com', 'fernando.ibanez@email.com',
    'monica.ortiz@email.com', 'alberto.guerrero@email.com', 'cristina.rios@email.com',
    'daniel.paredes@email.com', 'silvia.castano@email.com', 'marcos.delgado@email.com',
    'adriana.cruz@email.com', 'gonzalo.ramos@email.com', 'teresa.vargas@email.com',
    'ignacio.serrano@email.com', 'rebeca.pena@email.com', 'emilio.gil@email.com',
    'rosa.salvador@email.com',
];

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)];
}

function slotCita(
    dayOffset: number,
    duracionMinutos: number
): { inicio: string; fin: string } {
    const base = new Date();
    base.setDate(base.getDate() + dayOffset);
    base.setHours(10, 0, 0, 0);
    const fin = new Date(base.getTime() + duracionMinutos * 60000);
    return { inicio: base.toISOString(), fin: fin.toISOString() };
}

function randomTelefono(): string {
    return `6${randomInt(10000000, 99999999)}`;
}

export type SeedResult = {
    success: boolean;
    message: string;
    details?: {
        peluqueriasProcessed: number;
        empleadosCreated: number;
        serviciosCreated: number;
        citasCreated: number;
        errors: string[];
    };
};

export async function seedDatosDemo(): Promise<SeedResult> {
    const supabase = getAdminClient();
    const errors: string[] = [];
    let totalEmpleados = 0;
    let totalServicios = 0;
    let totalCitas = 0;

    try {
        const { data: peluquerias, error: pelError } = await supabase
            .from('peluquerias')
            .select('id');

        if (pelError || !peluquerias || peluquerias.length === 0) {
            return {
                success: false,
                message: 'No se encontraron peluquerías en la base de datos.',
            };
        }

        for (const { id: idPeluqueria } of peluquerias) {

            const nombresEmpleado = new Set<string>();
            while (nombresEmpleado.size < 3) {
                nombresEmpleado.add(pick(NOMBRES_EMPLEADOS));
            }

            const { data: empleadosInsertados, error: empError } = await supabase
                .from('empleados')
                .insert(
                    [...nombresEmpleado].map(nombre => ({
                        nombre,
                        id_peluqueria: idPeluqueria,
                    }))
                )
                .select('id');

            if (empError || !empleadosInsertados || empleadosInsertados.length === 0) {
                errors.push(`[${idPeluqueria}] Error al crear empleados: ${empError?.message}`);
                continue;
            }
            totalEmpleados += empleadosInsertados.length;
            const idsEmpleados = empleadosInsertados.map(e => e.id);

            const catalogoShuffled = [...SERVICIOS_CATALOGO].sort(() => Math.random() - 0.5);
            const serviciosAInsertar = catalogoShuffled.slice(0, 5).map(srv => ({
                nombre_servicio: srv.nombre_servicio,
                precio: parseFloat((srv.precio_base + randomInt(-5, 15)).toFixed(2)),
                duracion_minutos: srv.duracion_minutos,
                genero_objetivo: srv.genero_objetivo,
                id_peluqueria: idPeluqueria,
            }));

            const { data: serviciosInsertados, error: srvError } = await supabase
                .from('servicios')
                .insert(serviciosAInsertar)
                .select('id');

            if (srvError || !serviciosInsertados || serviciosInsertados.length === 0) {
                errors.push(`[${idPeluqueria}] Error al crear servicios: ${srvError?.message}`);
                continue;
            }
            totalServicios += serviciosInsertados.length;

            const idsServicios = serviciosInsertados.map((s, idx) => ({
                id: s.id,
                duracion_minutos: serviciosAInsertar[idx].duracion_minutos,
            }));

            const citasPayload = [];

            for (let i = 0; i < 37; i++) {
                const servicio = pick(idsServicios);
                const { inicio, fin } = slotCita(-(i + 1), servicio.duracion_minutos);
                const clienteIdx = randomInt(0, NOMBRES_CLIENTES.length - 1);
                citasPayload.push({
                    id_peluqueria: idPeluqueria,
                    id_empleado: idsEmpleados[i % idsEmpleados.length],
                    id_servicio: servicio.id,
                    nombre_cliente: NOMBRES_CLIENTES[clienteIdx],
                    telefono: randomTelefono(),
                    fecha_hora_inicio: inicio,
                    fecha_hora_fin: fin,
                    estado: 'pendiente',
                    cliente_email: EMAILS_CLIENTES[clienteIdx],
                });
            }

            for (let i = 0; i < 13; i++) {
                const servicio = pick(idsServicios);
                const { inicio, fin } = slotCita(i + 1, servicio.duracion_minutos);
                const clienteIdx = randomInt(0, NOMBRES_CLIENTES.length - 1);
                citasPayload.push({
                    id_peluqueria: idPeluqueria,
                    id_empleado: idsEmpleados[i % idsEmpleados.length],
                    id_servicio: servicio.id,
                    nombre_cliente: NOMBRES_CLIENTES[clienteIdx],
                    telefono: randomTelefono(),
                    fecha_hora_inicio: inicio,
                    fecha_hora_fin: fin,
                    estado: 'pendiente',
                    cliente_email: EMAILS_CLIENTES[clienteIdx],
                });
            }

            const { error: citaError } = await supabase
                .from('citas')
                .insert(citasPayload);

            if (citaError) {
                errors.push(`[${idPeluqueria}] Error al crear citas: ${citaError.message}`);
            } else {
                totalCitas += citasPayload.length;
            }
        }

        const success = errors.length === 0;
        return {
            success,
            message: success
                ? `✅ Seed completado — ${peluquerias.length} peluquería(s) procesadas.`
                : `⚠️ Seed completado con ${errors.length} error(es). Revisa los detalles.`,
            details: {
                peluqueriasProcessed: peluquerias.length,
                empleadosCreated: totalEmpleados,
                serviciosCreated: totalServicios,
                citasCreated: totalCitas,
                errors,
            },
        };
    } catch (e: any) {
        return {
            success: false,
            message: `Error crítico en seed: ${e.message || 'Error desconocido'}`,
        };
    }
}
