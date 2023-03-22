export function px(n: number): string {
    const rootSize = 10;
    const float = String(n % rootSize).replace('.', '');
    const int = Math.floor(n / rootSize);
    return int + '.' + float + 'rem';
}
export function translate(x: number, y: number): string {
    return `translate(${x}px, ${y}px)`;
}
export function cohColorMatrix(r: number, g: number, b: number): string {
    return `coh-color-matrix(${r}, 0, 0, 0, 0, 0, ${g}, 0, 0, 0, 0, 0, ${b}, 0, 0, 0, 0, 0, 1, 0)`;
}
export function clamp(num: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
    return Math.min(Math.max(num, min), max);
}
