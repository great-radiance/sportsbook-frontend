import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";

type Props = {
  mv?: number;
  className?: string;
};

const DISPLAY_MS = 5000;

/** Green/red corner tick when odds move (mv: 1 up, -1 down). Hides after 5s. */
export const OddsMoveIndicator: FunctionComponent<Props> = ({
  mv = 0,
  className = "",
}) => {
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    if (mv !== 1 && mv !== -1) {
      setVisible(false);
      return;
    }

    setDirection(mv);
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, DISPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [mv]);

  if (!visible) return null;

  if (direction === 1) {
    return (
      <span
        className={`absolute odd-move-mark top-1 right-[2px] w-0 h-0 market-indicator-up border-solid border-t-0 border-r-[8px] border-b-[8px] border-l-0 border-t-transparent border-r-[#16C72E] border-b-[#000000] border-l-transparent bg-[linear-gradient(to_top_right,_#000000_0%,_#16C72E_100%)] [clip-path:polygon(0_0,_100%_0,_100%_100%)] ${className}`}
      />
    );
  }

  return (
    <span
      className={`absolute odd-move-mark bottom-1 right-[2px] w-0 h-0 market-indicator-down border-solid border-b-[8px] border-l-[8px] border-t-0 border-r-0 border-b-[#FF3449] border-l-transparent border-t-transparent border-r-[#000000] bg-[linear-gradient(to_top_right,_#000000_0%,_#FF3449_100%)] ${className}`}
    />
  );
};
