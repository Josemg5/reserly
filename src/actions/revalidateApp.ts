"use server";

import { revalidatePath } from 'next/cache';

export async function revalidateApp() {
    revalidatePath('/configuracion');
    revalidatePath('/admin/configuracion');
    revalidatePath('/');
}
