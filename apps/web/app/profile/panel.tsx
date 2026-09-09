import type { PanelStyle } from "@koino/core";
import { FONT_STACKS } from "./theme";

export function Panel({
  style,
  title,
  action,
  children,
  className = "",
  inline = false,
  hideTitle = false,
}: {
  style: PanelStyle | null;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Single-row layout: title, content, and action share one line instead of
   * content sitting in its own block below the title. For thin, label-like panels. */
  inline?: boolean;
  /** Inline mode only: omit the title text entirely, centering content in the
   * row instead — for a panel with nothing to label (e.g. the profile link). */
  hideTitle?: boolean;
}) {
  const hasImage = !!style?.backgroundImage;

  const outerClass = style
    ? `relative h-full overflow-hidden shadow-lg ${className}`
    : `relative h-full overflow-hidden rounded-2xl border-2 border-card-border bg-card shadow-lg ${className}`;
  const outerStyle = style
    ? {
        borderColor: style.border,
        borderWidth: style.borderWidth,
        borderStyle: "solid" as const,
        borderRadius: style.cornerRadius,
        ...(hasImage ? {} : { backgroundColor: style.background }),
      }
    : undefined;

  // A photo behind the panel's own text needs a scrim to stay legible regardless
  // of the chosen text color, so we force white text over a dark overlay here.
  const contentClass = inline
    ? `relative flex h-full items-center gap-3 overflow-hidden px-5 ${style ? "" : "text-foreground"}`
    : `relative flex h-full flex-col overflow-y-auto p-5 ${style ? "" : "text-foreground"}`;
  // fontFamily cascades to every descendant (Tailwind's text-size utilities only
  // ever set font-size/line-height, never font-family), so this alone is enough
  // to theme all of a panel's own content — no need to touch each panel's own
  // content renderer the way textSize below does need to.
  const contentStyle = style ? { color: hasImage ? "#ffffff" : style.textColor, fontFamily: FONT_STACKS[style.font] } : undefined;
  const titleStyle = style ? { color: hasImage ? "#ffffff" : style.accentColor } : undefined;
  const titleClass = style
    ? "panel-drag-handle min-w-0 shrink-0 truncate text-base font-bold"
    : "panel-drag-handle min-w-0 shrink-0 truncate text-base font-bold text-foreground";

  return (
    <div className={outerClass} style={outerStyle}>
      {hasImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${style!.backgroundImage})` }} />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}
      <div className={contentClass} style={contentStyle}>
        {inline ? hideTitle ? (
          // No title to balance the action button's width, so centering via a
          // flex-1 sibling would skew the text toward the title-less side —
          // take the action out of flow instead, letting the text center on
          // the panel's true midpoint regardless of whether it's shown.
          <div className="relative min-w-0 flex-1 text-center">
            <div className="truncate">{children}</div>
            {action && <div className="absolute right-0 top-1/2 -translate-y-1/2">{action}</div>}
          </div>
        ) : (
          <>
            <h2 className={titleClass} style={titleStyle} title={title}>
              {title}
            </h2>
            <div className="min-w-0 flex-1 truncate">{children}</div>
            {action && <div className="shrink-0">{action}</div>}
          </>
        ) : (
          <>
            <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
              <h2 className={titleClass} style={titleStyle} title={title}>
                {title}
              </h2>
              {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
          </>
        )}
      </div>
    </div>
  );
}