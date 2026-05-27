import { test, expect } from '@playwright/test';

test.describe('Flujo Principal de Reservas', () => {
  test('El cliente puede completar una reserva exitosamente', async ({ page }) => {
    await page.goto('/mi-peluqueria/reservas');
    
    await page.waitForSelector('text=Cargando', { state: 'hidden' });
    await expect(page.locator('h1')).toBeVisible();

    const firstService = page.locator('.servicio-card').first();
    await firstService.click();
    
    await page.locator('button:has-text("Continuar")').click();

    const firstEmployee = page.locator('.empleado-card').first();
    if (await firstEmployee.isVisible()) {
      await firstEmployee.click();
      await page.locator('button:has-text("Continuar")').click();
    }

    await page.waitForSelector('.react-calendar');
    const availableDay = page.locator('.react-calendar__tile:not(:disabled)').first();
    await availableDay.click();

    const firstTimeSlot = page.locator('.time-slot-btn').first();
    await firstTimeSlot.click();
    await page.locator('button:has-text("Continuar")').click();

    await page.fill('input[type="text"]', 'Cliente Test');
    await page.fill('input[type="tel"]', '600000000');
    await page.fill('input[type="email"]', 'test@test.com');

    await page.locator('button:has-text("Confirmar Reserva")').click();

    await expect(page.locator('text=¡Reserva confirmada!')).toBeVisible();
  });
});
