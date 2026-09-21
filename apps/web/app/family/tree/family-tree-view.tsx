"use client";

import Link from "next/link";
import type { FamilyRelationship, FamilyTreeEdge, Profile } from "@koino/core";
import { Avatar } from "../../avatar";

const RELATIONSHIP_LABEL: Record<FamilyRelationship, string> = {
  mother: "Mother",
  father: "Father",
  sister: "Sister",
  brother: "Brother",
  grandmother: "Grandmother",
  grandfather: "Grandfather",
  aunt: "Aunt",
  uncle: "Uncle",
  cousin: "Cousin",
  spouse: "Spouse",
  child: "Child",
  other: "Other",
};

const RING_SPACING = 130;
const NODE_SIZE = 56;
const PADDING = 90;

type PositionedNode = { id: string; x: number; y: number; depth: number };

/**
 * Radial "closeness map": the viewer at the center, everyone else placed in
 * rings by hop-distance (see 0034_family_tree.sql), angularly grouped under
 * whichever neighbor first reached them in a BFS from the viewer. Not a real
 * genealogical layout — the relationship labels aren't primitives (no stored
 * "through whom"), so there's no reliable way to align generations. Every
 * edge from the RPC is still drawn, not just the ones used for layout, so a
 * triangle of relationships (e.g. two siblings also connected to each other)
 * renders fully even though only two of its edges placed anyone.
 */
function layoutTree(viewerId: string, edges: FamilyTreeEdge[]): PositionedNode[] {
  const depthOf = new Map<string, number>([[viewerId, 0]]);
  const neighbors = new Map<string, string[]>();
  for (const edge of edges) {
    const da = depthOf.get(edge.person_a);
    if (da === undefined || edge.person_a_depth < da) depthOf.set(edge.person_a, edge.person_a_depth);
    const db = depthOf.get(edge.person_b);
    if (db === undefined || edge.person_b_depth < db) depthOf.set(edge.person_b, edge.person_b_depth);

    if (!neighbors.has(edge.person_a)) neighbors.set(edge.person_a, []);
    if (!neighbors.has(edge.person_b)) neighbors.set(edge.person_b, []);
    neighbors.get(edge.person_a)!.push(edge.person_b);
    neighbors.get(edge.person_b)!.push(edge.person_a);
  }

  const parent = new Map<string, string | null>([[viewerId, null]]);
  const visited = new Set([viewerId]);
  const queue = [viewerId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of neighbors.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, current);
      queue.push(next);
    }
  }

  const children = new Map<string, string[]>();
  for (const [id, p] of parent) {
    if (p === null) continue;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(id);
  }

  const angle = new Map<string, number>();
  function assignAngles(id: string, start: number, end: number) {
    angle.set(id, (start + end) / 2);
    const kids = children.get(id) ?? [];
    if (kids.length === 0) return;
    const slice = (end - start) / kids.length;
    kids.forEach((child, i) => assignAngles(child, start + i * slice, start + (i + 1) * slice));
  }
  assignAngles(viewerId, 0, Math.PI * 2);

  return Array.from(visited).map((id) => {
    const depth = depthOf.get(id) ?? 0;
    const a = angle.get(id) ?? 0;
    const r = depth * RING_SPACING;
    return { id, x: Math.cos(a) * r, y: Math.sin(a) * r, depth };
  });
}

export function FamilyTreeView({ viewer, edges, profiles }: { viewer: Profile; edges: FamilyTreeEdge[]; profiles: Profile[] }) {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const nodes = layoutTree(viewer.id, edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const maxDepth = nodes.reduce((max, n) => Math.max(max, n.depth), 0);
  const halfExtent = maxDepth * RING_SPACING + PADDING;
  const size = halfExtent * 2;

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-card-border bg-background px-4 py-3 sm:px-8">
        <Link href="/family" className="text-sm text-muted hover:text-foreground">
          Back
        </Link>
        <h1 className="text-lg font-bold text-foreground">Family tree</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-8">
        {nodes.length === 1 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-muted">No family connections yet.</p>
            <Link href="/family" className="text-sm text-olive-dark hover:underline">
              Connect with family →
            </Link>
          </div>
        ) : (
          <div className="relative mx-auto" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="absolute left-0 top-0 overflow-visible"
            >
              <defs>
                <marker id="tree-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 Z" className="fill-muted" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const a = nodeById.get(edge.person_a);
                const b = nodeById.get(edge.person_b);
                if (!a || !b) return null;
                const x1 = halfExtent + a.x;
                const y1 = halfExtent + a.y;
                const x2 = halfExtent + b.x;
                const y2 = halfExtent + b.y;
                // Pull the arrowhead back to the edge of the node circle, not its center.
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.hypot(dx, dy) || 1;
                const endX = x2 - (dx / len) * (NODE_SIZE / 2 + 4);
                const endY = y2 - (dy / len) * (NODE_SIZE / 2 + 4);
                const midX = x1 + (endX - x1) * 0.62;
                const midY = y1 + (endY - y1) * 0.62;
                return (
                  <g key={edge.connection_id}>
                    <line x1={x1} y1={y1} x2={endX} y2={endY} className="stroke-card-border" strokeWidth={1.5} markerEnd="url(#tree-arrow)" />
                    <text
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      className="fill-muted text-[10px]"
                      style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 3 }}
                    >
                      {RELATIONSHIP_LABEL[edge.relationship]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {nodes.map((node) => {
              const person = node.id === viewer.id ? viewer : profileById.get(node.id);
              if (!person) return null;
              const left = halfExtent + node.x - NODE_SIZE / 2;
              const top = halfExtent + node.y - NODE_SIZE / 2;
              return (
                <Link
                  key={node.id}
                  href={`/profile/${person.username}`}
                  className="absolute flex flex-col items-center gap-1 text-center"
                  style={{ left, top, width: NODE_SIZE }}
                >
                  <Avatar url={person.avatar_url} username={person.username} size={NODE_SIZE} />
                  <span className="max-w-[80px] truncate text-xs font-medium text-foreground">@{person.username}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
