// [U1] ListRow: leading icon tile 40 (radius 12), title, sub, trailing value / chevron / switch. 56-64px.
// Renders a button or link (asChild) when interactive; hover wash + press.
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Slot } from "radix-ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface ListRowProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  icon?: ReactNode;
  iconTone?: "neutral" | "primary" | "success" | "warning" | "danger" | "pod";
  title: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  /** Render as the child element (a / button / Link) for interactive rows. */
  asChild?: boolean;
  interactive?: boolean;
  tone?: "default" | "danger";
}


export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  { icon, iconTone = "neutral", title, description, value, trailing, chevron, asChild, interactive, tone = "default", className, children, ...rest },
  ref,
) {
  const Comp = asChild ? Slot.Root : "div";
  const body = (
    <>
      {icon && <span className={cn("grid size-6 shrink-0 place-items-center text-ink [&_svg]:size-5", tone === "danger" && "text-danger-text")}>{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-[16px] font-medium", tone === "danger" ? "text-danger-text" : "text-ink")}>{title}</span>
        {description && <span className="truncate text-body-sm text-ink-2">{description}</span>}
      </span>
      {value != null && <span className="shrink-0 text-body-sm text-fg-muted tabular">{value}</span>}
      {trailing}
      {chevron && <Icon name="arrow" size={20} className="shrink-0 text-ink-2 transition-transform duration-fast group-hover:translate-x-0.5" />}
    </>
  );
  const cls = cn(
    "group flex min-h-14 w-full items-center gap-3.5 px-4 py-2.5 text-left",
    (interactive || asChild) && "pressable cursor-pointer outline-offset-[-2px] hover:bg-sunken active:scale-100! active:bg-sunken",
    className,
  );
  if (asChild) {
    // Slot needs a single child: clone the child's content with ours.
    return (
      <Comp ref={ref} className={cls} {...rest}>
        {children}
      </Comp>
    );
  }
  return (
    <Comp ref={ref} className={cls} {...rest}>
      {body}
    </Comp>
  );
});

/** Inset group of rows with hairline separators (settings groups, E1). */
export function ListGroup({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("divide-y divide-line border-y border-line", className)} {...rest} />;
}

/** Body of a ListRow for use with asChild: <ListRow asChild><Link href><ListRowBody … /></Link></ListRow>. */
export function ListRowBody(props: Pick<ListRowProps, "icon" | "iconTone" | "title" | "description" | "value" | "trailing" | "chevron" | "tone">) {
  const { icon, iconTone = "neutral", title, description, value, trailing, chevron, tone } = props;
  return (
    <>
      {icon && <span className={cn("grid size-6 shrink-0 place-items-center text-ink [&_svg]:size-5", tone === "danger" && "text-danger-text")}>{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-[16px] font-medium", tone === "danger" ? "text-danger-text" : "text-ink")}>{title}</span>
        {description && <span className="truncate text-body-sm text-ink-2">{description}</span>}
      </span>
      {value != null && <span className="shrink-0 text-body-sm text-fg-muted tabular">{value}</span>}
      {trailing}
      {chevron && <Icon name="arrow" size={20} className="shrink-0 text-ink-2 transition-transform duration-fast group-hover:translate-x-0.5" />}
    </>
  );
}
