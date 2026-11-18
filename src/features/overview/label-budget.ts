export interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
}
export function visibleLabels(
  boxes: LabelBox[],
  width: number,
  height: number,
  budget: number,
  padding = 3,
): Set<string> {
  const ordered = boxes
    .slice()
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        Math.hypot(a.x - width / 2, a.y - height / 2) -
          Math.hypot(b.x - width / 2, b.y - height / 2) ||
        a.id.localeCompare(b.id),
    );
  const accepted: LabelBox[] = [];
  for (const box of ordered) {
    if (accepted.length >= budget) break;
    if (
      box.x - box.width / 2 < padding ||
      box.x + box.width / 2 > width - padding ||
      box.y - box.height / 2 < padding ||
      box.y + box.height / 2 > height - padding
    )
      continue;
    if (
      accepted.some(
        (other) =>
          Math.abs(box.x - other.x) < (box.width + other.width) / 2 + padding &&
          Math.abs(box.y - other.y) < (box.height + other.height) / 2 + padding,
      )
    )
      continue;
    accepted.push(box);
  }
  return new Set(accepted.map((box) => box.id));
}
