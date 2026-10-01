import type { GraphEdge, WorkflowModel } from './workflow-model.js';

export const workflowCanvas = { width: 960, height: 600, nodeWidth: 148, nodeHeight: 80 };
type Point = { x: number; y: number };
type Box = {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  x: number;
  y: number;
};
const { width, nodeWidth, nodeHeight } = workflowCanvas;
function boxes(model: WorkflowModel, height: number): Box[] {
  return model.nodes.map((node) => {
    const x = (node.x * width) / 100,
      y = (node.y * height) / 100;
    return {
      id: node.id,
      x,
      y,
      left: x - nodeWidth / 2,
      right: x + nodeWidth / 2,
      top: y - nodeHeight / 2,
      bottom: y + nodeHeight / 2,
    };
  });
}
/** Segment/expanded rectangle clipping; used for orthogonal and host polyline routes. */
function intersects(a: Point, b: Point, box: Box, padding = 12) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  let low = 0,
    high = 1;
  for (const [p, q] of [
    [-dx, a.x - box.left + padding],
    [dx, box.right + padding - a.x],
    [-dy, a.y - box.top + padding],
    [dy, box.bottom + padding - a.y],
  ]) {
    if (p === 0) {
      if (q! < 0) return false;
    } else {
      const t = q! / p!;
      if (p! < 0) low = Math.max(low, t);
      else high = Math.min(high, t);
      if (low > high) return false;
    }
  }
  return true;
}
function port(box: Box, toward: Point, offset: number) {
  const dx = toward.x - box.x,
    dy = toward.y - box.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? { x: dx >= 0 ? box.right + 4 : box.left - 4, y: box.y + offset }
    : { x: box.x + offset, y: dy >= 0 ? box.bottom + 4 : box.top - 4 };
}
function stub(box: Box, point: Point) {
  return {
    x: point.x + (point.x > box.right ? 16 : point.x < box.left ? -16 : 0),
    y: point.y + (point.y > box.bottom ? 16 : point.y < box.top ? -16 : 0),
  };
}
function simplify(points: Point[]) {
  return points.filter(
    (point, i) => !i || point.x !== points[i - 1]!.x || point.y !== points[i - 1]!.y,
  );
}
function midpoint(points: Point[], fraction = 0.5) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y));
  let distance = lengths.reduce((a, b) => a + b, 0) * fraction;
  for (let i = 0; i < lengths.length; i++) {
    const size = lengths[i]!;
    if (distance <= size && size) {
      const a = points[i]!,
        b = points[i + 1]!;
      return { x: a.x + ((b.x - a.x) * distance) / size, y: a.y + ((b.y - a.y) * distance) / size };
    }
    distance -= size;
  }
  return points[0]!;
}
export function routeWorkflow(model: WorkflowModel) {
  const height = Math.max(workflowCanvas.height, Math.ceil(model.nodes.length / 5) * 120);
  const rectangles = boxes(model, height),
    byId = new Map(rectangles.map((box) => [box.id, box]));
  const overlaps = rectangles.some((a, i) =>
    rectangles
      .slice(i + 1)
      .some(
        (b) =>
          a.left - 4 < b.right + 4 &&
          a.right + 4 > b.left - 4 &&
          a.top - 4 < b.bottom + 4 &&
          a.bottom + 4 > b.top - 4,
      ),
  );
  const routes = model.edges.map((edge, edgeIndex) => {
    const from = byId.get(edge.from)!,
      to = byId.get(edge.to)!;
    const family = model.edges.filter((e) => e.from === edge.from && e.to === edge.to);
    const rank = family.findIndex((e) => e.id === edge.id);
    const offset = Math.max(-24, Math.min(24, (rank - (family.length - 1) / 2) * 12));
    const self = from.id === to.id,
      back = !self && (edge.kind === 'loop' || to.x < from.x);
    const hints = (edge.waypoints ?? []).map((p) => ({
      x: (p.x * width) / 100,
      y: (p.y * height) / 100,
    }));
    const start = self
      ? { x: from.right + 4, y: from.y + offset }
      : back && !hints.length
        ? { x: from.x + offset, y: from.top - 4 }
        : port(from, hints[0] ?? to, offset);
    const end = self
      ? { x: to.x + offset, y: to.top - 4 }
      : back && !hints.length
        ? { x: to.x + offset, y: to.top - 4 }
        : port(to, hints.at(-1) ?? from, offset);
    const a = stub(from, start),
      b = stub(to, end);
    const candidates: Point[][] = [];
    if (hints.length) candidates.push([start, a, ...hints, b, end]);
    else if (self) {
      const top = Math.max(16, from.top - 32 - rank * 12),
        right = Math.min(width - 16, from.right + 32 + rank * 12);
      candidates.push([
        start,
        { x: right, y: start.y },
        { x: right, y: top },
        { x: end.x, y: top },
        end,
      ]);
    } else {
      const middleX = (a.x + b.x) / 2 + offset,
        middleY = (a.y + b.y) / 2 + offset;
      if (!back)
        candidates.push(
          [start, a, { x: middleX, y: a.y }, { x: middleX, y: b.y }, b, end],
          [start, a, { x: a.x, y: middleY }, { x: b.x, y: middleY }, b, end],
        );
      const lanesY = [
        ...new Set([
          24 + rank * 12,
          height - 24 - rank * 12,
          ...rectangles.flatMap((r) => [r.top - 16 - rank * 8, r.bottom + 16 + rank * 8]),
        ]),
      ].filter((y) => y >= 16 && y <= height - 16);
      const lanesX = [
        ...new Set([
          24 + rank * 12,
          width - 24 - rank * 12,
          ...rectangles.flatMap((r) => [r.left - 16 - rank * 8, r.right + 16 + rank * 8]),
        ]),
      ].filter((x) => x >= 16 && x <= width - 16);
      for (const y of lanesY) candidates.push([start, a, { x: a.x, y }, { x: b.x, y }, b, end]);
      if (!back)
        for (const x of lanesX) candidates.push([start, a, { x, y: a.y }, { x, y: b.y }, b, end]);
    }
    const valid = candidates.map(simplify).filter(
      (points) =>
        points.every((p) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) &&
        points.slice(1).every(
          (p, i) =>
            !rectangles.some((box) => {
              if (
                (box.id === edge.from && i === 0) ||
                (box.id === edge.to && i === points.length - 2)
              )
                return false;
              return intersects(
                points[i]!,
                p,
                box,
                box.id === edge.from || box.id === edge.to ? 0 : 12,
              );
            }),
        ),
    );
    const length = (points: Point[]) =>
      points
        .slice(1)
        .reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0);
    valid.sort((a, b) => length(a) - length(b));
    const points = valid[0];
    return {
      edge: edge as GraphEdge,
      index: edgeIndex + 1,
      points,
      path: points?.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '),
      label: points ? midpoint(points, (rank + 1) / (family.length + 1)) : undefined,
      loop: self || back,
    };
  });
  const labels: { x: number; y: number }[] = [];
  for (const route of routes) {
    if (!route.points) continue;
    const candidates = [
      route.label!,
      ...[0.25, 0.5, 0.75].map((fraction) => midpoint(route.points!, fraction)),
    ];
    route.label = candidates.find(
      (point) =>
        point.x >= 20 &&
        point.x <= width - 20 &&
        point.y >= 14 &&
        point.y <= height - 14 &&
        !rectangles.some(
          (box) =>
            point.x - 20 < box.right &&
            point.x + 20 > box.left &&
            point.y - 14 < box.bottom &&
            point.y + 14 > box.top,
        ) &&
        !labels.some(
          (label) => Math.abs(label.x - point.x) < 40 && Math.abs(label.y - point.y) < 28,
        ),
    );
    if (route.label) labels.push(route.label);
  }
  return { overlaps, routes, canvas: { width, height } };
}
