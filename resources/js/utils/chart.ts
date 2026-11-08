export interface ChartPoint {
    x: number;
    y: number;
}

/**
 * A smooth path through the points that never overshoots them (a monotone
 * cubic, Fritsch-Carlson): a day with nothing does not dip below the axis
 * and a peak stays where it is. The points must go left to right.
 */
export function smoothLinePath(points: ChartPoint[]): string {
    const n = points.length;

    if (n === 0) return '';
    if (n === 1) return `M${points[0].x},${points[0].y}`;

    const dx: number[] = [];
    const slope: number[] = [];

    for (let i = 0; i < n - 1; i++) {
        dx[i] = points[i + 1].x - points[i].x;
        slope[i] = (points[i + 1].y - points[i].y) / (dx[i] || 1);
    }

    const tangent: number[] = [slope[0]];

    for (let i = 1; i < n - 1; i++) {
        tangent[i] =
            slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }

    tangent[n - 1] = slope[n - 2];

    for (let i = 0; i < n - 1; i++) {
        if (slope[i] === 0) {
            tangent[i] = 0;
            tangent[i + 1] = 0;
            continue;
        }

        const a = tangent[i] / slope[i];
        const b = tangent[i + 1] / slope[i];
        const sum = a * a + b * b;

        if (sum > 9) {
            const scale = 3 / Math.sqrt(sum);
            tangent[i] = scale * a * slope[i];
            tangent[i + 1] = scale * b * slope[i];
        }
    }

    let path = `M${points[0].x},${points[0].y}`;

    for (let i = 0; i < n - 1; i++) {
        const third = dx[i] / 3;

        path += ` C${points[i].x + third},${points[i].y + tangent[i] * third} ${points[i + 1].x - third},${points[i + 1].y - tangent[i + 1] * third} ${points[i + 1].x},${points[i + 1].y}`;
    }

    return path;
}
