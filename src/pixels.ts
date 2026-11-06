/** Fill a connected raster region. Refuse open areas touching the edge when boundedOnly. */
export function floodFill(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, color: number[], boundedOnly = true): boolean {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const start = (y * width + x) * 4;
  const target = Array.from(data.slice(start, start + 4));
  if (target.every((c, i) => c === color[i])) return false;
  const visited = new Uint8Array(width * height);
  const stack = [y * width + x];
  const region: number[] = [];
  let touchesEdge = false;
  const match = (p: number) => target.every((c, i) => Math.abs(data[p * 4 + i] - c) <= 28);
  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    if (!match(p)) continue;
    region.push(p);
    const px = p % width, py = Math.floor(p / width);
    if (px === 0 || py === 0 || px === width - 1 || py === height - 1) touchesEdge = true;
    if (px > 0) stack.push(p - 1);
    if (px < width - 1) stack.push(p + 1);
    if (py > 0) stack.push(p - width);
    if (py < height - 1) stack.push(p + width);
  }
  if (boundedOnly && touchesEdge) return false;
  for (const p of region) for (let c = 0; c < 4; c++) data[p * 4 + c] = color[c];
  return region.length > 0;
}
export function alphaBounds(data: Uint8ClampedArray, width: number, height: number, padding = 8) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) {
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) return null;
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  return { x: left, y: top, width: Math.min(width, right + padding + 1) - left, height: Math.min(height, bottom + padding + 1) - top };
}
