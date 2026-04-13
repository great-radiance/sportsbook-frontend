import { FunctionComponent } from "preact";
import { useLocation } from "wouter-preact";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: FunctionComponent<BreadcrumbsProps> = ({
  items,
}) => {
  const [, setLocation] = useLocation();

  return (
    <nav className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-sub-color)]" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span
          key={`${item.label}-${index}`}
          className="flex items-center gap-2"
        >
          {item.href ? (
            <button
              type="button"
              onClick={() => setLocation(item.href || "/")}
              className="text-[12px] font-medium text-[var(--text-primary-color)] transition hover:text-[var(--text-basic-color)]"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[12px] font-medium text-[var(--text-basic-color)]">
              {item.label}
            </span>
          )}
          {index < items.length - 1 ? (
            <span className="text-[var(--text-sub-color)]">/</span>
          ) : null}
        </span>
      ))}
    </nav>
  );
};
