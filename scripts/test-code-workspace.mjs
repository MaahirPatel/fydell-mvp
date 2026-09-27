import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('.shots', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3200/lab/code-workspace');
  const editor = page.getByRole('textbox', { name: 'Python source code' });
  await editor.waitFor({ timeout: 60000 });
  async function fillEditor(text) { await editor.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.insertText(text); }
  const editorValue = () => page.evaluate(() => window.monaco.editor.getModels()[0].getValue());
  await fillEditor('def handle_events(events):\n    return []\n');
  const architecture = page.getByRole('textbox', { name: 'Architecture decision' });
  await architecture.fill('Preserve this architecture draft across polling.');
  await page.waitForTimeout(4500);
  assert.match(await editorValue(), /return \[\]/);
  assert.equal(await architecture.inputValue(), 'Preserve this architecture draft across polling.');
  await page.getByRole('button', { name: 'Save code', exact: true }).click();
  await page.getByText('Code saved.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Save & run tests' }).isDisabled(), true);
  await fillEditor('def handle_events(events):\n    return ["recovered"]\n');
  await page.reload();
  await editor.waitFor();
  assert.match(await editorValue(), /recovered/);
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, `Horizontal overflow at ${width}`);
    await page.screenshot({ path: `.shots/code-workspace-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log('Workspace checks passed: polling preservation, save, recovery, unavailable execution, 3 widths, no browser errors.');
} finally { await browser.close(); }
