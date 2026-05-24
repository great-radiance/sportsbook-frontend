import {
  coerceNameParams,
  widgetCompetitors,
  type WidgetCompetitorRef,
} from "@/helpers/widgetDisplayNames";
import { completeName } from "@/helpers/completeName";
import type { competitor } from "@/types/typesForSocket.ts/tEventModel";

export function competitorsForDisplay(
  list?: { id?: number; name?: string }[] | null,
): competitor[] {
  const refs: WidgetCompetitorRef[] = (list ?? [])
    .filter((c) => c.name?.trim())
    .map((c, i) => ({ id: c.id ?? i, name: c.name!.trim() }));
  return widgetCompetitors(refs);
}

export function resolveMarketDisplayName(
  rawName: string | undefined,
  competitors: competitor[],
  parameters?: Record<string, unknown> | null,
  extraParameters?: Record<string, unknown> | null,
): string {
  const name = rawName?.trim() ?? "";
  if (!name) return "";
  return completeName(
    name,
    competitors,
    coerceNameParams(parameters),
    coerceNameParams(extraParameters),
  );
}

export function resolveSelectionDisplayName(
  rawName: string | undefined,
  competitors: competitor[],
  parameters?: Record<string, unknown> | null,
  extraParameters?: Record<string, unknown> | null,
  selectionExtraParameters?: Record<string, unknown> | null,
): string {
  const name = rawName?.trim() ?? "";
  if (!name) return "";
  return completeName(
    name,
    competitors,
    coerceNameParams(parameters),
    coerceNameParams({
      ...(extraParameters ?? {}),
      ...(selectionExtraParameters ?? {}),
    }),
  );
}
