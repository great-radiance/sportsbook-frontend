/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { useTranslate } from "@/shared/i18n/i18n";
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import './style.scss';

interface BonusInfo {
  count: string;
  minOdds: string;
  percentage: number;
}

const bonusData: BonusInfo[] = [
  { count: "4", minOdds: "1.00", percentage: 4 },
  { count: "5", minOdds: "1.00", percentage: 5 },
  { count: "6", minOdds: "1.00", percentage: 10 },
  { count: "7", minOdds: "1.00", percentage: 15 },
  { count: "8", minOdds: "1.00", percentage: 20 },
  { count: "9", minOdds: "1.00", percentage: 25 },
  { count: "10+", minOdds: "1.00", percentage: 30 },
];

export const BonusInfoDialog: FunctionComponent = () => {
  const { isBonusInfoOpen } = useSportsbookStore();
  const { t } = useTranslate('bonus');
  const dialogRef = useRef<any>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleRequestClose = () => {
      isBonusInfoOpen.value = false;
    };

    const handleAfterHide = () => {
      isBonusInfoOpen.value = false;
    };

    dialog.addEventListener('sl-request-close', handleRequestClose);
    dialog.addEventListener('sl-after-hide', handleAfterHide);

    return () => {
      dialog.removeEventListener('sl-request-close', handleRequestClose);
      dialog.removeEventListener('sl-after-hide', handleAfterHide);
    };
  }, []);

  return (
    <>
      <sl-dialog
        ref={dialogRef}
        open={isBonusInfoOpen.value}
        onSlRequestClose={() => isBonusInfoOpen.value = false}
        onSlAfterHide={() => isBonusInfoOpen.value = false}
        onSlClose={() => isBonusInfoOpen.value = false}
        className="bonusInfoDialog mx-auto my-auto rounded-[24px] flex flex-col">

        <div className="flex w-full items-center justify-center pb-6">
          <h2 className="text-[16px] font-semibold uppercase">{t('accumulatorBonus')}</h2>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto rounded-[4px] p-3 bg-white/10 mx-2">
          <div className="w-full">
            {/* Table Header */}
            <div className="flex border-b items-center justify-center border-white/10 pb-2 mb-2 pr-4">
              <div className="flex-1 text-[12px] font-medium uppercase text-center">{t('count')}</div>
              <div className="flex-1 text-[12px] font-medium uppercase text-center">{t('minOdds')}</div>
              <div className="flex-1 text-[var(--primary-color)] text-[12px] font-medium uppercase text-right">%</div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col">
              {bonusData.map((item, index) => (
                <div key={index} className="flex w-full">
                  <div className="flex-1 text-[14px] text-center">{item.count}</div>
                  <div className="flex-1 text-[14px] text-center">{item.minOdds}</div>
                  <div className="flex-1 text-[var(--primary-color)] pr-4 text-[14px] text-right font-medium">{item.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </sl-dialog>
    </>
  );
};