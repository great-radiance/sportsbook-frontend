/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useState } from "preact/hooks";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: FunctionComponent<SwitchProps> = ({
  checked: controlledChecked,
  onChange,
  disabled = false,
  className = "",
}) => {
  const [uncontrolledChecked, setUncontrolledChecked] = useState(false);
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : uncontrolledChecked;

  const handleClick = () => {
    if (disabled) return;

    const newChecked = !checked;
    if (!isControlled) {
      setUncontrolledChecked(newChecked);
    }
    onChange?.(newChecked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative h-[22px] w-[42px] shrink-0 rounded-full border-2 transition-all duration-300 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]/50
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        ${
          checked
            ? "border-[var(--primary-color)] bg-[var(--primary-color)]"
            : "border-[#9aa8bc] bg-[#c5d0de]"
        }
        ${className}
      `}
    >
      <span
        className={`
          absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out
          ${checked ? "left-[22px]" : "left-[2px]"}
        `}
      />
    </button>
  );
};
