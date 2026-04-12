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
        relative w-[36px] h-[20px] rounded-full transition-all duration-500 ease-out
        focus:outline-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${checked ? "#2d374d" : "#C2CEE5"}
        ${className}
      `}
    >
      <span
        className={`
          absolute top-[2px] w-[16px] h-[16px] rounded-full transition-all duration-500 ease-out
          ${checked ? "right-[2px] bg-[var(--primary-color)]" : "left-[2px] bg-[var(--sub-element-color)]"}
        `}
      />
    </button>
  );
};
