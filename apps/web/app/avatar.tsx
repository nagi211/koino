import Image from "next/image";
import type { AvatarShape } from "@koino/core";

// Four circles, each overlapping the center, union into a four-leaf-clover
// silhouette — the same trick a Venn diagram uses, just with more circles. An
// SVG mask (not clip-path) because clip-path's shape functions can't union
// circular lobes like this; a `viewBox`-based SVG mask also scales cleanly to
// whatever pixel size the avatar actually renders at (it doesn't need to know
// the size up front, unlike a clip-path: path() built from fixed coordinates).
const CLOVER_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    "<circle cx='32' cy='32' r='32'/><circle cx='68' cy='32' r='32'/>" +
    "<circle cx='32' cy='68' r='32'/><circle cx='68' cy='68' r='32'/>" +
    "</svg>"
)}")`;

// Shared with any wrapper element (e.g. a colored ring) that needs to match the
// avatar's own outline exactly. Straight-edged shapes use a fixed clip-path
// polygon; "square" uses a variable border-radius instead so `cornerRadius` can
// dial it continuously from sharp corners up to a full circle; "clover" uses an
// SVG mask, not clip-path (see CLOVER_MASK above).
export function getAvatarShapeStyle(shape: AvatarShape, cornerRadius: number): React.CSSProperties {
  switch (shape) {
    case "circle":
      return { borderRadius: "50%" };
    case "square":
      return { borderRadius: `${cornerRadius}%` };
    case "diamond":
      return { clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" };
    case "hexagon": {
      // A regular (equal-sided) hexagon's own bounding box isn't square — a
      // flat-top hexagon is exactly 2:√3 (~1.155:1) wide:tall — so touching all 4
      // edges of a square avatar necessarily stretches it into unequal sides.
      // Instead, fit it by width (touching the left/right points exactly) and let
      // the flat top/bottom edges fall short of the square's top/bottom by the
      // same fraction on each side, which keeps all 6 sides truly equal length.
      const gap = ((1 - Math.sqrt(3) / 2) / 2) * 100;
      const top = gap.toFixed(3);
      const bottom = (100 - gap).toFixed(3);
      return { clipPath: `polygon(25% ${top}%, 75% ${top}%, 100% 50%, 75% ${bottom}%, 25% ${bottom}%, 0 50%)` };
    }
    case "octagon":
      return { clipPath: "polygon(29% 0, 71% 0, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0 71%, 0 29%)" };
    case "clover":
      return {
        WebkitMaskImage: CLOVER_MASK,
        maskImage: CLOVER_MASK,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      };
  }
}

export function Avatar({
  url,
  username,
  size = 32,
  shape = "circle",
  cornerRadius = 0,
  borderWidth = 0,
  borderColor = "transparent",
}: {
  url: string | null;
  username: string;
  // A plain number for a fixed px size, or a CSS size expression (e.g. a
  // clamp(...) string) for a size that responds to available space.
  size?: number | string;
  shape?: AvatarShape;
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}) {
  const shapeStyle = getAvatarShapeStyle(shape, cornerRadius);
  const fontSize = typeof size === "number" ? size * 0.42 : `calc(${size} * 0.42)`;
  const hasBorder = borderWidth > 0;

  const content = url ? (
    <Image src={url} alt={username} fill className="object-cover" />
  ) : (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-olive to-olive-dark font-semibold text-white"
      style={{ fontSize }}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );

  // A plain CSS `border` only paints correctly on axis-aligned edges — combined
  // with a clip-path (diamond/hexagon/octagon), diagonal edges get no border at
  // all, since `border` is really four rectangular strips that a diagonal clip
  // slices straight through. Instead: an outer box filled with the border color
  // and clipped to the shape, with an inner box inset by the border width (also
  // clipped to the same shape) holding the actual image/fallback — that reads as
  // an even ring around the whole outline no matter how many straight edges the
  // shape has. Caught by testing diamond/hexagon with a border and finding it
  // only showed on the flat top/bottom edges, not the diagonal ones.
  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width: size, height: size, ...shapeStyle, backgroundColor: hasBorder ? borderColor : undefined }}
    >
      <div className="absolute overflow-hidden" style={{ inset: hasBorder ? borderWidth : 0, ...shapeStyle }}>
        {content}
      </div>
    </div>
  );
}
