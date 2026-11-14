import { expect, test } from '@playwright/test';

test('Studio preview uses real desktop, tablet, and phone viewport widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio', { waitUntil: 'networkidle' });

  const preview = page.frameLocator('iframe[title^="Xem trước Portfolio"]');
  const frameWidth = () =>
    preview
      .locator('html')
      .evaluate((element) => element.ownerDocument.defaultView?.innerWidth);
  const frameTimeOrigin = () =>
    preview
      .locator('html')
      .evaluate((element) => element.ownerDocument.defaultView?.performance.timeOrigin);

  await expect.poll(frameWidth).toBe(1440);
  const desktopTimeOrigin = await frameTimeOrigin();

  await page.getByRole('button', { name: 'Xem kích thước Tablet' }).click();
  await expect.poll(frameWidth).toBe(768);
  await expect.poll(frameTimeOrigin).not.toBe(desktopTimeOrigin);
  const tabletTimeOrigin = await frameTimeOrigin();

  await page.getByRole('button', { name: 'Xem kích thước Mobile' }).click();
  await expect.poll(frameWidth).toBe(390);
  await expect.poll(frameTimeOrigin).not.toBe(tabletTimeOrigin);
  await expect(
    preview.getByRole('button', { name: 'Mở mục lục điều hướng' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Xem toàn cảnh Portfolio' }).click();
  await expect(page.locator('iframe[title^="Xem trước Portfolio"]')).toHaveCount(0);
  const editableCanvas = page.getByTestId('studio-editable-canvas');
  await expect(editableCanvas).toBeVisible();
  const editableTag = editableCanvas.getByRole('textbox', { name: 'Sửa tag Hero 1' });
  await expect(editableTag).toHaveAttribute('contenteditable', 'true');
  await editableTag.fill('Chỉnh sửa trực tiếp');
  await editableTag.press('Tab');
  await expect(editableTag).toHaveText('Chỉnh sửa trực tiếp');

  await page
    .getByRole('button', { name: 'Quay lại xem trước theo thiết bị' })
    .click();
  await expect(page.locator('iframe[title^="Xem trước Portfolio"]')).toBeVisible();
  await expect.poll(frameWidth).toBe(390);
});
