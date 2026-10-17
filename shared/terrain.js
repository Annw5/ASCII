export const SEA = 3;    // уровень воды
export const MAXH = 12;  // максимальная высота

export function heightAt(x, y) {
  const v = 6
    + 3.5 * Math.sin(x * 0.13)
    + 3   * Math.cos(y * 0.17)
    + 2   * Math.sin((x + y) * 0.09)
    + 1.5 * Math.sin(x * 0.5) * Math.cos(y * 0.45);
  return Math.max(0, Math.min(MAXH, Math.round(v)));
}
