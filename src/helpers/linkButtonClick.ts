import { sportsbookStore } from "@/state/sportsbookStoreContext";

const { isOpenedSidebar } = sportsbookStore;

export const linkButtonOnClick = (
  e: MouseEvent,
  path: string,
  setLocation: (path: string) => void,
) => {
  e.stopPropagation();
  // Scroll to top smoothly
  window.scrollTo({
    top: 0,
    behavior: "auto",
  });
  isOpenedSidebar.value = false;
  // Check if Control (Windows/Linux) or Cmd (Mac) is pressed
  if (e.ctrlKey || e.metaKey) {
    // Open in new tab with hash-based URL
    const fullUrl = `${window.location.origin}${window.location.pathname}#sportsbook=${path}`;
    window.open(fullUrl, "_blank");
  } else {
    // Normal navigation in same tab
    setLocation(path);
  }
};
