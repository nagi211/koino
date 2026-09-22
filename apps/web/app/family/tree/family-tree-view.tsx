"use client";

import Link from "next/link";
import { FAMILY_RELATIONSHIP_LABEL, inverseFamilyRelationshipLabel } from "@koino/core";
import type { FamilyRelationship, FamilyTreeEdge, Profile } from "@koino/core";
import { Avatar } from "../../avatar";

// How many generations *up* the addressee sits relative to the requester
// (relationship always reads "addressee is requester's {relationship}" — see
// sendFamilyRequest / AddFamilyButton). Siblings, spouses and cousins share a
// generation; "other" has no reliable direction, so it's treated as level.
const GENERATION_DELTA: Record<FamilyRelationship, number> = {
  mother: 1,
  father: 1,
  grandmother: 2,
  grandfather: 2,
  aunt: 1,
  uncle: 1,
  sister: 0,
  brother: 0,
  cousin: 0,
  spouse: 0,
  other: 0,
  child: -1,
};

function generationLabel(gen: number): string {
  if (gen === 0) return "Your generation";
  if (gen === 1) return "Parents";
  if (gen === -1) return "Children";
  if (gen === 2) return "Grandparents";
  if (gen === -2) return "Grandchildren";
  if (gen > 2) return `${"Great-".repeat(gen - 2)}grandparents`;
  return `${"Great-".repeat(-gen - 2)}grandchildren`;
}

const COLUMN_WIDTH = 184;
const ROW_HEIGHT = 200;
const CARD_WIDTH = 148;
const AVATAR_SIZE = 60;
// Reserved header strip at the top of every row for its generation label +
// rule, kept strictly above where cards start — the label used to share the
// same y as the cards' avatar-center and got cut off behind them.
const LABEL_HEIGHT = 40;

type PositionedNode = { id: string; x: number; y: number; generation: number };

/**
 * A real generational layout, not a hop-distance radial map: every relationship
 * carries an implied generation offset (GENERATION_DELTA), propagated from the
 * viewer across the whole reachable graph, so ancestors land above and
 * descendants below regardless of how many hops away they are.
 *
 * Left-right placement is a second, independent pass over a *different* tree:
 * every node's "slice parent" is one of its generation+1 neighbors (an actual
 * ancestor), never a peer or a descendant — earlier attempts that hung every
 * direct connection off the viewer as an undifferentiated "child" pulled the
 * viewer's own x off-center (it sat at the midpoint of its parents *and*
 * siblings *and* children all at once) and overlapped adjacent cards. A same-
 * generation node with no ancestor of its own (e.g. a sibling with no stored
 * link to the shared parent) inherits its neighbor's resolved slice-parent
 * instead, so siblings still cluster together. What's left after that
 * (genuine root ancestors) anchors a subtree-size-weighted tidy-tree slice,
 * same idea as before, just over the corrected tree.
 */
function layoutTree(viewerId: string, edges: FamilyTreeEdge[]) {
  const generation = new Map<string, number>([[viewerId, 0]]);
  const neighbors = new Map<string, { id: string; edge: FamilyTreeEdge }[]>();
  for (const edge of edges) {
    if (!neighbors.has(edge.person_a)) neighbors.set(edge.person_a, []);
    if (!neighbors.has(edge.person_b)) neighbors.set(edge.person_b, []);
    neighbors.get(edge.person_a)!.push({ id: edge.person_b, edge });
    neighbors.get(edge.person_b)!.push({ id: edge.person_a, edge });
  }

  const visited = new Set([viewerId]);
  const queue = [viewerId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { id: next, edge } of neighbors.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      const delta = GENERATION_DELTA[edge.relationship];
      const currentGen = generation.get(current)!;
      generation.set(next, edge.person_a === current ? currentGen + delta : currentGen - delta);
      queue.push(next);
    }
  }

  const sliceParent = new Map<string, string | null>();
  for (const id of visited) {
    const up = (neighbors.get(id) ?? []).find((n) => generation.get(n.id) === generation.get(id)! + 1);
    if (up) sliceParent.set(id, up.id);
  }
  let resolving = true;
  while (resolving) {
    resolving = false;
    for (const id of visited) {
      if (sliceParent.has(id)) continue;
      const peer = (neighbors.get(id) ?? []).find(
        (n) => generation.get(n.id) === generation.get(id) && sliceParent.get(n.id) != null
      );
      if (peer) {
        sliceParent.set(id, sliceParent.get(peer.id)!);
        resolving = true;
      }
    }
  }
  for (const id of visited) {
    if (!sliceParent.has(id)) sliceParent.set(id, null);
  }

  const children = new Map<string, string[]>();
  for (const id of visited) {
    const p = sliceParent.get(id)!;
    if (p === null) continue;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(id);
  }

  const leafCountCache = new Map<string, number>();
  function leafCount(id: string): number {
    const cached = leafCountCache.get(id);
    if (cached !== undefined) return cached;
    const kids = children.get(id) ?? [];
    const count = kids.length === 0 ? 1 : kids.reduce((sum, kid) => sum + leafCount(kid), 0);
    leafCountCache.set(id, count);
    return count;
  }

  const slot = new Map<string, number>();
  function assignSlot(id: string, start: number, end: number) {
    slot.set(id, (start + end) / 2);
    const kids = children.get(id) ?? [];
    if (kids.length === 0) return;
    const total = leafCount(id);
    let cursor = start;
    for (const kid of kids) {
      const width = (end - start) * (leafCount(kid) / total);
      assignSlot(kid, cursor, cursor + width);
      cursor += width;
    }
  }
  const roots = Array.from(visited).filter((id) => sliceParent.get(id) === null);
  const totalWidth = roots.reduce((sum, root) => sum + leafCount(root), 0);
  let rootCursor = 0;
  for (const root of roots) {
    const width = leafCount(root);
    assignSlot(root, rootCursor, rootCursor + width);
    rootCursor += width;
  }

  const minGen = Math.min(...Array.from(visited).map((id) => generation.get(id)!));
  const maxGen = Math.max(...Array.from(visited).map((id) => generation.get(id)!));

  const nodes: PositionedNode[] = Array.from(visited).map((id) => ({
    id,
    x: (slot.get(id)! - totalWidth / 2) * COLUMN_WIDTH,
    y: (maxGen - generation.get(id)!) * ROW_HEIGHT,
    generation: generation.get(id)!,
  }));

  return { nodes, minGen, maxGen };
}

export function FamilyTreeView({ viewer, edges, profiles }: { viewer: Profile; edges: FamilyTreeEdge[]; profiles: Profile[] }) {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const { nodes, minGen, maxGen } = layoutTree(viewer.id, edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const rows = new Map<number, PositionedNode[]>();
  for (const node of nodes) {
    if (!rows.has(node.generation)) rows.set(node.generation, []);
    rows.get(node.generation)!.push(node);
  }

  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const width = maxX - minX + COLUMN_WIDTH + 80;
  const height = (maxGen - minGen + 1) * ROW_HEIGHT + 40;
  const offsetX = -minX + 40;
  // Row labels sit at offsetY (the row's un-shifted top); cards and edges sit
  // LABEL_HEIGHT further down, inside the same row slot but below its header.
  const offsetY = 20;
  const cardOffsetY = offsetY + LABEL_HEIGHT;

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-card-border bg-background px-4 py-3 sm:px-8">
        <Link href="/family" className="text-sm text-muted hover:text-foreground">
          Back
        </Link>
        <h1 className="font-serif text-lg font-semibold text-foreground">Family tree</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-background p-8">
        {nodes.length === 1 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-muted">No family connections yet.</p>
            <Link href="/family" className="text-sm text-olive-dark hover:underline">
              Connect with family →
            </Link>
          </div>
        ) : (
          <div className="relative mx-auto" style={{ width, height }}>
            {/* Generation rows: a thin rule + serif label in a dedicated strip above
                each tier — the labels carry real structural meaning (which
                generation this is), not decoration, so they're worth the space.
                Kept strictly above cardOffsetY so a card never sits on top of it. */}
            {Array.from(rows.keys())
              .sort((a, b) => b - a)
              .map((gen) => {
                const y = (maxGen - gen) * ROW_HEIGHT + offsetY + LABEL_HEIGHT / 2;
                return (
                  <div key={gen} className="absolute left-0 right-0 flex items-center gap-3" style={{ top: y }}>
                    <span className="shrink-0 whitespace-nowrap font-serif text-xs uppercase tracking-[0.15em] text-muted">
                      {generationLabel(gen)}
                    </span>
                    <span className="h-px flex-1 bg-card-border" />
                  </div>
                );
              })}

            {(() => {
              // Card anchor points, in this container's coordinate space. Same-
              // generation edges (siblings/spouse/cousin) connect side-to-side at
              // the card's vertical center; cross-generation edges connect
              // bottom-of-ancestor to top-of-descendant via an orthogonal elbow.
              const cardTop = (n: PositionedNode) => n.y + cardOffsetY;
              const cardBottom = (n: PositionedNode) => n.y + cardOffsetY + AVATAR_SIZE + 34;
              const cardCenterY = (n: PositionedNode) => n.y + cardOffsetY + (AVATAR_SIZE + 34) / 2;
              const cardCenterX = (n: PositionedNode) => n.x + offsetX + CARD_WIDTH / 2;
              const cardLeft = (n: PositionedNode) => n.x + offsetX;
              const cardRight = (n: PositionedNode) => n.x + offsetX + CARD_WIDTH;

              function geometry(edge: FamilyTreeEdge) {
                const a = nodeById.get(edge.person_a);
                const b = nodeById.get(edge.person_b);
                if (!a || !b) return null;
                if (a.generation === b.generation) {
                  const [leftNode, rightNode] = cardCenterX(a) <= cardCenterX(b) ? [a, b] : [b, a];
                  const y = cardCenterY(leftNode);
                  return {
                    path: `M ${cardRight(leftNode)} ${y} L ${cardLeft(rightNode)} ${y}`,
                    labelX: (cardRight(leftNode) + cardLeft(rightNode)) / 2,
                    labelY: y,
                  };
                }
                const higher = a.generation > b.generation ? a : b;
                const lower = a.generation > b.generation ? b : a;
                const hx = cardCenterX(higher);
                const hy = cardBottom(higher);
                const lx = cardCenterX(lower);
                const ly = cardTop(lower);
                const midY = (hy + ly) / 2;
                return {
                  path: `M ${hx} ${hy} L ${hx} ${midY} L ${lx} ${midY} L ${lx} ${ly}`,
                  labelX: (hx + lx) / 2,
                  labelY: midY,
                };
              }

              return (
                <>
                  <svg width={width} height={height} className="absolute left-0 top-0 overflow-visible" style={{ pointerEvents: "none" }}>
                    {edges.map((edge) => {
                      const g = geometry(edge);
                      if (!g) return null;
                      return (
                        <path
                          key={edge.connection_id}
                          d={g.path}
                          className="stroke-card-border"
                          strokeWidth={1.5}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    })}
                  </svg>

                  {edges.map((edge) => {
                    const g = geometry(edge);
                    if (!g) return null;
                    return (
                      <span
                        key={edge.connection_id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-card-border bg-background px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted"
                        style={{ left: g.labelX, top: g.labelY }}
                      >
                        {FAMILY_RELATIONSHIP_LABEL[edge.relationship]}
                      </span>
                    );
                  })}
                </>
              );
            })()}

            {nodes.map((node) => {
              const person = node.id === viewer.id ? viewer : profileById.get(node.id);
              if (!person) return null;
              const isViewer = node.id === viewer.id;

              // Only tag a node when the viewer is directly on one side of the
              // edge — anything further out relies on the row label instead of
              // a guessed compound relationship (see file header for why).
              const directEdge = edges.find((e) => e.person_a === viewer.id && e.person_b === node.id) ??
                edges.find((e) => e.person_b === viewer.id && e.person_a === node.id);
              let tag: string | null = null;
              if (directEdge && directEdge.person_a === viewer.id) tag = FAMILY_RELATIONSHIP_LABEL[directEdge.relationship];
              else if (directEdge && directEdge.person_b === viewer.id) {
                const requester = profileById.get(directEdge.person_a) ?? viewer;
                tag = inverseFamilyRelationshipLabel(directEdge.relationship, requester);
              }

              return (
                <Link
                  key={node.id}
                  href={`/profile/${person.username}`}
                  className={`absolute flex flex-col items-center gap-1.5 rounded-2xl border px-2.5 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isViewer ? "border-olive-dark bg-olive/10" : "border-card-border bg-card"
                  }`}
                  style={{ left: node.x + offsetX, top: node.y + cardOffsetY, width: CARD_WIDTH }}
                >
                  <Avatar
                    url={person.avatar_url}
                    username={person.username}
                    size={AVATAR_SIZE}
                    borderWidth={isViewer ? 2 : 0}
                    borderColor="var(--olive-dark)"
                  />
                  <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                    {person.display_name || `@${person.username}`}
                  </span>
                  {isViewer ? (
                    <span className="rounded-full bg-olive-dark px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">You</span>
                  ) : tag ? (
                    <span className="rounded-full bg-input px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">{tag}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
