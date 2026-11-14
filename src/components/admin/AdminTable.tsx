import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="h-display break-words text-[32px] sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Cell = ReactElement<{ children?: ReactNode; "data-label"?: string }>;

/** Give every cell its column name, so phones can show "Label  value" rows. */
function labelCells(children: ReactNode, head: string[]) {
  return Children.map(children, (row) => {
    if (!isValidElement<{ children?: ReactNode }>(row) || row.type !== "tr") return row;
    let i = 0;
    return cloneElement(row, {
      children: Children.map(row.props.children, (cell) => (isValidElement(cell) ? cloneElement(cell as Cell, { "data-label": head[i++] || undefined }) : cell)),
    });
  });
}

/**
 * Admin data table. Desktop / tablet: a normal table (scrolls sideways if it must).
 * Phones (< md): each row is a card, one "LABEL · value" line per column (labels from `head`).
 */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="card md:overflow-x-auto">
      <table
        className={[
          "w-full text-left text-sm md:min-w-[640px]",
          // phones: rows → cards
          "max-md:block max-md:[&_thead]:hidden max-md:[&_tbody]:block max-md:[&_tr]:block max-md:[&_tr]:px-4 max-md:[&_tr]:py-3",
          "max-md:[&_td]:flex max-md:[&_td]:min-h-[32px] max-md:[&_td]:items-center max-md:[&_td]:justify-between max-md:[&_td]:gap-4 max-md:[&_td]:whitespace-normal max-md:[&_td]:px-0 max-md:[&_td]:py-1 max-md:[&_td]:text-right",
          "max-md:[&_td[data-label]]:before:shrink-0 max-md:[&_td[data-label]]:before:text-[11px] max-md:[&_td[data-label]]:before:uppercase max-md:[&_td[data-label]]:before:tracking-[0.12em] max-md:[&_td[data-label]]:before:text-secondary max-md:[&_td[data-label]]:before:content-[attr(data-label)]",
          "max-md:[&_td:not([data-label])]:justify-start max-md:[&_td:not([data-label])]:text-left",
        ].join(" ")}
      >
        <thead className="border-b border-border bg-surface-elevated">
          <tr>{head.map((h, i) => <th key={h + i} className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-secondary">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{labelCells(children, head)}</tbody>
      </table>
    </div>
  );
}

export const td = "whitespace-nowrap px-4 py-3 align-middle"; // desktop: no wrapping (the table scrolls instead)
