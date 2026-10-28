// <Line>: the serif line that carries a screen (DESIGN.md §3; PB 1.2, 5.1, 5.2). One per screen, left-anchored,
// 2-5 words. Digit runs ("1pm", "#2", "22") are re-set in Figtree, because Instrument Serif's 1 reads as l
// (founder R2 #1). Sizes are the type tokens:
//   xxl  the cropped day at the lock (display-2xl, runs off the edge with `crop`)
//   xl   the plan line, "Run it back?" (display-xl)
//   lg   page lines: "Saved you a seat.", "Hoopers, Sunday 1pm." (display-lg)
//   md   sheet and settings lines (heading-xl)
//   sm   sheet titles (heading-lg, 32px)
import { Children, isValidElement, cloneElement, type ElementType, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const SIZES = {
  xxl: "text-display-2xl",
  xl: "text-display-xl",
  lg: "text-display-lg",
  md: "text-heading-xl",
  sm: "text-heading-lg",
} as const;

export type LineSize = keyof typeof SIZES;

const DIGITS = /(\d[\d:.,–-]*\s?(?:am|pm)?)/i;

/** Splits a string so every digit run sits in a Figtree span. Exported for places that render their own serif. */
export function figures(text: string): ReactNode[] {
  return text.split(DIGITS).map((part, i) =>
    i % 2 ? (
      <span key={i} className="fig">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function withFigures(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === "string") return DIGITS.test(child) ? figures(child) : child;
    if (typeof child === "number") return <span className="fig">{child}</span>;
    if (isValidElement<{ children?: ReactNode; className?: string }>(child) && child.props.children != null) {
      if (typeof child.props.className === "string" && child.props.className.includes("fig")) return child;
      return cloneElement(child, undefined, withFigures(child.props.children));
    }
    return child;
  });
}

type LineProps<T extends ElementType> = {
  as?: T;
  size?: LineSize;
  /** One word cropped by the right edge (the lock day). */
  crop?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Line<T extends ElementType = "h1">({ as, size = "lg", crop, children, className, ...rest }: LineProps<T>) {
  const Tag = (as ?? "h1") as ElementType;
  return (
    <Tag className={cn("line", SIZES[size], crop && "crop", className)} {...rest}>
      {withFigures(children)}
    </Tag>
  );
}
