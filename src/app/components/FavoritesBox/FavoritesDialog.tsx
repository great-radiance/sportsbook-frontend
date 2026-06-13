import { useTranslate } from "@/shared/i18n/i18n";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { FunctionComponent } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "./favoritesDialogStyle.scss";

export const FavoritesDialog: FunctionComponent = () => {
  const { isOpenedFavoritesDialog } = useSportsbookStore();
  const { t } = useTranslate("favorites");
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleRequestClose = () => {
      isOpenedFavoritesDialog.value = false;
    };
    const handleAfterHide = () => {
      isOpenedFavoritesDialog.value = false;
    };

    dialog.addEventListener("sl-request-close", handleRequestClose);
    dialog.addEventListener("sl-after-hide", handleAfterHide);

    return () => {
      dialog.removeEventListener("sl-request-close", handleRequestClose);
      dialog.removeEventListener("sl-after-hide", handleAfterHide);
    };
  }, []);

  return (
    <sl-dialog
      open={isOpenedFavoritesDialog.value}
      onSlRequestClose={() => (isOpenedFavoritesDialog.value = false)}
      onSlAfterHide={() => (isOpenedFavoritesDialog.value = false)}
      onSlClose={() => (isOpenedFavoritesDialog.value = false)}
      ref={dialogRef}
      class="favorites-dialog"
    >
      <div>{t("favorites")}</div>
    </sl-dialog>
  );
};
