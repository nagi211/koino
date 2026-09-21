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

// Display-only inversion for a direct edge where the viewer is the
// *addressee* — the stored word describes the viewer ("you're my child"), so
// this derives what the other person is *to the viewer* instead. Gendered
// terms fall back to a neutral word when the other person's gender isn't set.
function inverseLabel(relationship: FamilyRelationship, requester: Profile): string {
  const gender = requester.gender;
  switch (relationship) {
    case "mother":
    case "father":
      return "Child";
    case "grandmother":
    case "grandfather":
      return "Grandchild";
    case "aunt":
    case "uncle":
      return gender === "male" ? "Nephew" : gender === "female" ? "Niece" : "Niece/Nephew";
    case "child":
      return gender === "male" ? "Father" : gender === "female" ? "Mother" : "Parent";
    case "sister":
    case "brother":
      return gender === "male" ? "Brother" : gender === "female" ? "Sister" : "Sibling";
    case "cousin":
      return "Cousin";
    case "spouse":
      return "Spouse";
    case "other":
      return "Other";
  }
}

function generationLabel(gen: number): string {
  if (gen === 0) return "Your generation";
  if (gen === 1) return "Parents";
  if (gen === -1) return "Children";
  if (gen === 2) return "Grandparents";
  if (gen === -2) return "Grandchildren";
  if (gen > 2) return `${"Great-".repeat(gen - 2)}grandparents`;
  return `${"Great-".repeat(-gen - 2)}grandchildren`;
}

const COLUMN_WIDTH = 152;
const ROW_HEIGHT = 190;
const CARD_WIDTH = 116;
const AVATAR_SIZE = 60;

type PositionedNode = { id: string; x: number; y: number; generation: number };

/**
 * A real generational layout, not a hop-distance radial map: every relationship
 * carries an implied generation offset (GENERATION_DELTA), propagated from the
 * viewer across the whole reachable graph, so ancestors land above and
 * descendants below regardless of how many hops away they are. Left-right
 * placement is a separate, purely structural pass — a subtree-size-weighted
 * tidy-tree slice down the BFS closeness tree — so family units cluster
 * together instead of every row being independently centered.
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

  const layoutParent = new Map<string, string | null>([[viewerId, null]]);
  const visited = new Set([viewerId]);
  const queue = [viewerId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { id: next, edge } of neighbors.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      layoutParent.set(next, current);
      const delta = GENERATION_DELTA[edge.relationship];
      const currentGen = generation.get(current)!;
      generation.set(next, edge.person_a === current ? currentGen + delta : currentGen - delta);
      queue.push(next);
    }
  }

  const children = new Map<string, string[]>();
  for (const [id, p] of layoutParent) {
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
  const totalWidth = leafCount(viewerId);
  assignSlot(viewerId, 0, totalWidth);

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
  const offsetY = 20;

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
            {/* Generation rows: a thin rule + serif label on the left of each tier —
                the labels carry real structural meaning (which generation this is),
                not decoration, so they're worth the vertical space. */}
            {Array.from(rows.keys())
              .sort((a, b) => b - a)
              .map((gen) => {
                const y = (maxGen - gen) * ROW_HEIGHT + offsetY + AVATAR_SIZE / 2;
                return (
                  <div key={gen} className="absolute left-0 right-0 flex items-center gap-3" style={{ top: y }}>
                    <span className="shrink-0 whitespace-nowrap font-serif text-xs uppercase tracking-[0.15em] text-muted">
                      {generationLabel(gen)}
                    </span>
                    <span className="h-px flex-1 bg-card-border" />
                  </div>
                );
              })}

            <svg width={width} height={height} className="absolute left-0 top-0 overflow-visible" style={{ pointerEvents: "none" }}>
              {edges.map((edge) => {
                const a = nodeById.get(edge.person_a);
                const b = nodeById.get(edge.person_b);
                if (!a || !b) return null;
                const higher = a.generation >= b.generation ? a : b;
                const lower = a.generation >= b.generation ? b : a;
                const hx = higher.x + offsetX + CARD_WIDTH / 2;
                const hy = higher.y + offsetY + AVATAR_SIZE + 34;
                const lx = lower.x + offsetX + CARD_WIDTH / 2;
                const ly = lower.y + offsetY;
                const midY = (hy + ly) / 2;

                const path =
                  higher.generation === lower.generation
                    ? `M ${hx} ${hy - 17} L ${lx} ${ly - 17}`
                    : `M ${hx} ${hy} L ${hx} ${midY} L ${lx} ${midY} L ${lx} ${ly}`;

                return (
                  <g key={edge.connection_id}>
                    <path d={path} className="stroke-card-border" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                );
              })}
            </svg>

            {edges.map((edge) => {
              const a = nodeById.get(edge.person_a);
              const b = nodeById.get(edge.person_b);
              if (!a || !b) return null;
              const higher = a.generation >= b.generation ? a : b;
              const lower = a.generation >= b.generation ? b : a;
              const sameRow = higher.generation === lower.generation;
              const midX = (higher.x + lower.x) / 2 + offsetX + CARD_WIDTH / 2;
              const midY = sameRow
                ? higher.y + offsetY + AVATAR_SIZE + 17
                : (higher.y + offsetY + AVATAR_SIZE + 34 + lower.y + offsetY) / 2;
              return (
                <span
                  key={edge.connection_id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-card-border bg-background px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted"
                  style={{ left: midX, top: midY }}
                >
                  {RELATIONSHIP_LABEL[edge.relationship]}
                </span>
              );
            })}

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
              if (directEdge && directEdge.person_a === viewer.id) tag = RELATIONSHIP_LABEL[directEdge.relationship];
              else if (directEdge && directEdge.person_b === viewer.id) {
                const requester = profileById.get(directEdge.person_a) ?? viewer;
                tag = inverseLabel(directEdge.relationship, requester);
              }

              return (
                <Link
                  key={node.id}
                  href={`/profile/${person.username}`}
                  className={`absolute flex flex-col items-center gap-1.5 rounded-2xl border px-2.5 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isViewer ? "border-olive-dark bg-olive/10" : "border-card-border bg-card"
                  }`}
                  style={{ left: node.x + offsetX, top: node.y + offsetY, width: CARD_WIDTH }}
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
