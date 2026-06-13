/** @jsxImportSource preact */
import { ComponentChildren, FunctionComponent, VNode, Fragment } from "preact";
import { useState, useRef, useEffect, useMemo } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { useTranslate } from "@/shared/i18n/i18n";
import { createPortal } from "preact/compat";

import styles from "./Select.module.scss";

interface SelectProps {
  children: ComponentChildren;
  value?: string | number | null | (string | number)[];
  onSelect: (key: string | string[] | any) => void;
  placeholder?: string;
  label?: string;
  triggerIcon?: string;
  className?: string;
  classNames?: {
    trigger?: string;
    wrapper?: string;
    panel?: string;
    item?: string;
  };
  showCheckbox?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultSelected?: string | number | null;
  notInvert?: boolean;
}

interface SelectItemProps {
  value: string | number | null;
  children: ComponentChildren;
  className?: string;
  icon?: string;
  disabled?: boolean;
}

interface SelectItemComponentProps {
  item: SelectItemProps;
  isSelected: boolean;
  showCheckbox: boolean;
  classNames: {
    item?: string;
  };
  onSelect: (value: string | number | null | any) => void;
  disabled?: boolean;
}

// This is used as a child component in JSX
export const SelectItem: FunctionComponent<SelectItemProps> = () => null;
// Make it easier to detect across bundlers/minification:
(SelectItem as any).displayName = "SelectItem";

function isVNode(x: any): x is VNode {
  return x && typeof x === "object" && "type" in x && "props" in x;
}

/**
 * Robustly collect <SelectItem /> nodes from any children shape:
 * - arrays from map()
 * - fragments (<>...</>)
 * - conditional rendering
 * - wrappers (<div>...</div>)
 */
function collectSelectItems(
  children: ComponentChildren,
  out: SelectItemProps[] = [],
): SelectItemProps[] {
  if (children == null || children === false) return out;

  // array
  if (Array.isArray(children)) {
    for (const c of children) collectSelectItems(c as any, out);
    return out;
  }

  // primitives (string/number)
  if (typeof children !== "object") return out;

  // vnode
  if (isVNode(children)) {
    const node: any = children;

    const nodeType = node.type;
    const isSelectItemNode =
      nodeType === SelectItem ||
      nodeType?.displayName === "SelectItem" ||
      nodeType?.name === "SelectItem";

    if (isSelectItemNode) {
      out.push({
        value: node.props.value,
        children: node.props.children,
        className: node.props.className,
        icon: node.props.icon,
        disabled: node.props.disabled,
      });
      return out;
    }

    // unwrap fragment
    if (nodeType === Fragment) {
      collectSelectItems(node.props?.children, out);
      return out;
    }

    // any other wrapper/component: recurse into its children
    if (node.props && "children" in node.props) {
      collectSelectItems(node.props.children, out);
    }

    return out;
  }

  // unknown object shape
  return out;
}

export const Select: FunctionComponent<SelectProps> = ({
  children,
  value,
  onSelect,
  placeholder = "Select...",
  label,
  triggerIcon,
  className = "",
  classNames = {},
  showCheckbox = false,
  defaultSelected,
  onOpenChange,
  notInvert = false,
}) => {
  const { t } = useTranslate("common");
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const setOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const isControlled = value !== undefined;

  const getInitialValue = (): string | number | null | (string | number)[] => {
    if (isControlled) return showCheckbox ? [] : null;

    if (defaultSelected !== undefined) {
      if (defaultSelected === null) return showCheckbox ? [] : null;

      if (showCheckbox) {
        return Array.isArray(defaultSelected)
          ? (defaultSelected.filter(
              (v): v is string | number => v !== null,
            ) as any)
          : [defaultSelected];
      }
      return defaultSelected;
    }

    return showCheckbox ? [] : null;
  };

  const [internalValue, setInternalValue] = useState<
    string | number | null | (string | number)[]
  >(() => getInitialValue());

  const currentValue = isControlled ? value : internalValue;

  const updatePanelPosition = () => {
    const btn = triggerRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    setPanelPos({
      top: r.bottom + 6, // mt-1-ish
      left: r.left,
      width: r.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePanelPosition();

    const onScroll = () => updatePanelPosition();
    const onResize = () => updatePanelPosition();

    const onPointerDown = (e: PointerEvent) => {
      const wrapper = selectRef.current;
      if (!wrapper) return;

      const path = (e.composedPath?.() ?? []) as EventTarget[];
      if (!path.includes(wrapper)) setOpen(false);
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  // ✅ Items are collected robustly from the vnode tree
  const items = useMemo(() => collectSelectItems(children, []), [children]);

  const isMultiSelect = showCheckbox;

  const selectedValues = isMultiSelect
    ? Array.isArray(currentValue)
      ? currentValue
      : currentValue !== null && currentValue !== undefined
        ? [currentValue]
        : []
    : [];

  const selectedItem = !isMultiSelect
    ? (items.find((item) => String(item.value) === String(currentValue)) ??
      null)
    : null;

  const selectedItems = isMultiSelect
    ? items.filter((item) =>
        selectedValues.some((v) => String(v) === String(item.value)),
      )
    : [];

  const handleSelect = (itemValue: string | number | null) => {
    if (isMultiSelect) {
      const currentValues = Array.isArray(currentValue)
        ? [...currentValue]
        : currentValue !== null && currentValue !== undefined
          ? [currentValue]
          : [];

      const valueStr = String(itemValue);
      const index = currentValues.findIndex((v) => String(v) === valueStr);

      let newValues: (string | number)[];
      if (index >= 0) {
        newValues = currentValues.filter((_, i) => i !== index) as (
          | string
          | number
        )[];
      } else {
        newValues = [...currentValues, itemValue as string | number] as (
          | string
          | number
        )[];
      }

      if (!isControlled) setInternalValue(newValues);
      onSelect(newValues as string[]);
    } else {
      if (!isControlled) setInternalValue(itemValue);
      onSelect(itemValue as string);
      setOpen(false);
    }
  };

  const getDisplayText = () => {
    if (isMultiSelect) {
      if (selectedItems.length === 0) return placeholder;
      if (selectedItems.length === 1) return selectedItems[0].children;
      return `${selectedItems.length} selected`;
    } else {
      if (
        !selectedItem ||
        currentValue === null ||
        currentValue === undefined
      ) {
        return placeholder;
      }
      return selectedItem.children;
    }
  };

  const getDisplayIcon = () => {
    if (triggerIcon) return triggerIcon;

    if (isMultiSelect) {
      return selectedItems.length > 0 ? selectedItems[0].icon : null;
    } else {
      if (!selectedItem || currentValue === null || currentValue === undefined)
        return null;
      return selectedItem.icon || null;
    }
  };

  const portalNodeRef = useRef<HTMLElement | null>(null);

  const getPortalTarget = (): HTMLElement | null => {
    const wrapper = selectRef.current;
    if (!wrapper) return null;

    const root = wrapper.getRootNode() as ShadowRoot | Document;

    // 1) Try to portal into your main layout INSIDE the same root:
    const mainLayout =
      root instanceof ShadowRoot
        ? (root.querySelector("#sportsbook-main-layout") as HTMLElement | null)
        : (document.getElementById(
            "sportsbook-main-layout",
          ) as HTMLElement | null);

    if (mainLayout) {
      // Create/reuse a dedicated portal container inside main layout
      if (portalNodeRef.current && portalNodeRef.current.isConnected) {
        // Ensure it's still under main layout (in case of rerenders)
        if (portalNodeRef.current.parentElement !== mainLayout) {
          mainLayout.appendChild(portalNodeRef.current);
        }
        return portalNodeRef.current;
      }

      const node = document.createElement("div");
      node.setAttribute("data-select-portal", "true");
      // keep it neutral; panel itself is position:fixed
      node.style.position = "relative";
      mainLayout.appendChild(node);

      portalNodeRef.current = node;
      return node;
    }

    // 2) Fallback: avoid crash if main layout isn't found (shadow id not present yet)
    // Create a host in the same root so portal still works
    const hostParent = root instanceof ShadowRoot ? root : document.body;

    if (portalNodeRef.current && portalNodeRef.current.isConnected) {
      return portalNodeRef.current;
    }

    const fallback = document.createElement("div");
    fallback.setAttribute("data-select-portal-fallback", "true");
    fallback.style.position = "relative";
    hostParent.appendChild(fallback);

    portalNodeRef.current = fallback;
    return fallback;
  };

  useEffect(() => {
    return () => {
      if (portalNodeRef.current?.isConnected) portalNodeRef.current.remove();
      portalNodeRef.current = null;
    };
  }, []);

  const portalTarget = isOpen ? getPortalTarget() : null;

  const panel =
    isOpen && panelPos && portalTarget
      ? createPortal(
          <div
            className={[styles.panel, classNames.panel || ""].join(" ")}
            style={{
              position: "fixed",
              top: `${panelPos.top}px`,
              left: `${panelPos.left}px`,
              width: `${panelPos.width}px`,
              zIndex: 999999,
            }}
          >
            <div className={styles.panelInner}>
              {items.length > 0 ? (
                items.map((item, index) => {
                  const isSelected = isMultiSelect
                    ? selectedValues.some(
                        (v) => String(v) === String(item.value),
                      )
                    : String(item.value) === String(currentValue);

                  const uniqueKey =
                    item.value !== null && item.value !== undefined
                      ? `item-${index}-${String(item.value)}`
                      : `item-${index}`;

                  return (
                    <SelectItemRenderer
                      key={uniqueKey}
                      item={item}
                      isSelected={isSelected}
                      showCheckbox={showCheckbox}
                      classNames={classNames}
                      onSelect={handleSelect}
                      disabled={item.disabled}
                    />
                  );
                })
              ) : (
                <div className={styles.noOptions}>
                  {t("noOptionsAvailable")}
                </div>
              )}
            </div>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <div
      className={[styles.wrapper, className, classNames.wrapper || ""].join(
        " ",
      )}
      ref={selectRef}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const next = !isOpen;
          setOpen(next);
          if (next) updatePanelPosition();
        }}
        className={[styles.trigger, classNames.trigger || ""].join(" ")}
      >
        {label ? (
          <div className={styles.labelBlock}>
            <span className={styles.labelText}>{label}</span>

            <div className={styles.valueRow}>
              {getDisplayIcon() && (
                <img
                  src={getDisplayIcon()!}
                  alt=""
                  className={styles.valueIconSmall}
                />
              )}
              <span className={styles.valueText}>{getDisplayText()}</span>
            </div>
          </div>
        ) : (
          <div className={styles.valueRowSingle}>
            {getDisplayIcon() && (
              <img
                src={getDisplayIcon()!}
                alt=""
                className={styles.valueIcon}
              />
            )}
            <span className={styles.valueText}>{getDisplayText()}</span>
          </div>
        )}

        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          className={[
            styles.chevron,
            notInvert ? "" : styles.chevronInvert,
            isOpen ? styles.chevronOpen : styles.chevronClosed,
          ].join(" ")}
          alt="Toggle"
        />
      </button>

      {panel}
    </div>
  );
};

const SelectItemRenderer = ({
  item,
  isSelected,
  showCheckbox,
  classNames,
  onSelect,
  disabled = false,
}: SelectItemComponentProps) => {
  const { isMobile } = useSportsbookStore();
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    onSelect(item.value);
  };

  const handlePointerDown = (e: PointerEvent) => {
    // DO NOT preventDefault on touch/pen; it blocks scrolling.
    // Keep stopPropagation so outside-click logic is unchanged.
    e.stopPropagation();

    // Optional: if you still need the old behavior for mouse (avoid focus, etc.)
    if (e.pointerType === "mouse") {
      e.preventDefault();
    }
  };

  const itemClass = [
    styles.item,
    disabled ? styles.itemDisabled : "",
    !disabled && !isMobile.value ? styles.itemHover : "",
    classNames.item || "",
    item.className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      className={itemClass}
    >
      {item.icon && <img src={item.icon} alt="" className={styles.itemIcon} />}

      <div className={styles.itemContent}>
        {typeof item.children === "string" ||
        typeof item.children === "number" ? (
          <span className={styles.itemText}>{item.children}</span>
        ) : (
          <div className={styles.itemCustom}>{item.children}</div>
        )}
      </div>

      {showCheckbox &&
        (isSelected ? (
          <div className={styles.checkboxChecked}>
            <svg
              className={styles.checkboxIcon}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ) : (
          <div className={styles.checkboxEmpty} />
        ))}
    </button>
  );
};
