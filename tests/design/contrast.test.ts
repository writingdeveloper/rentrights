import { describe, it, expect } from 'vitest';
function lum(hex: string): number {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function ratio(a: string, b: string): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const light = {
  background: '#F6F4EF', surface: '#FFFDF9', surfaceMuted: '#EFEBE2',
  foreground: '#23262B', mutedForeground: '#5B5A54',
  borderInput: '#857D6B', hcBorder: '#857D6B', primary: '#1F6B4A', primaryStrong: '#18573C',
  success: '#1F7A4D', successSoft: '#E3F3EA', warning: '#9C5400', warningSoft: '#FBEFDD',
  danger: '#B42318',
};
const dark = {
  background: '#15140F', surface: '#201E18', surfaceMuted: '#2A2720',
  foreground: '#ECE7DD', mutedForeground: '#B0A99B',
  borderInput: '#6B6357', hcBorder: '#857D6B', primary: '#5FC08A',
  success: '#56C98A', successSoft: '#10241A', warning: '#E5A85A', warningSoft: '#241B10',
  danger: '#F0857A',
};
describe('token contrast (WCAG 2.2 AA)', () => {
  for (const [name, p] of [['light', light], ['dark', dark]] as const) {
    it(`${name}: body & status text >= 4.5:1`, () => {
      expect(ratio(p.foreground, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.foreground, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.mutedForeground, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.mutedForeground, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.primary, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.success, p.successSoft)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.warning, p.warningSoft)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.danger, p.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: white-on-primary button label >= 4.5:1`, () => {
      const onPrimary = name === 'light' ? '#FFFDF9' : '#15140F';
      expect(ratio(onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: input border (non-text) >= 3:1`, () => {
      expect(ratio(p.borderInput, p.background)).toBeGreaterThanOrEqual(3);
    });
    it(`${name}: high-contrast (prefers-contrast) border >= 3:1`, () => {
      expect(ratio(p.hcBorder, p.background)).toBeGreaterThanOrEqual(3);
    });
  }
});
