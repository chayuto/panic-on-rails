/** Railway time (seconds) as m:ss, or h:mm:ss. */
export function formatClock(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const pad = (n: number) => String(n).padStart(2, '0');
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
