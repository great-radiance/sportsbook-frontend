export const getOnlyNumber = (str: string | object | null) => {
  if (typeof str === "string") {
    return str.match(/([-+]?\d*\.?\d+)$/)?.[0];
  }
  if (typeof str === "object" && str !== null) {
    return (
      (str as { h: string | null; e: string | null; o: string | null }).h ??
      (str as { h: string | null; e: string | null; o: string | null }).e ??
      (str as { h: string | null; e: string | null; o: string | null }).o ??
      null
    );
  }
};

/** Handicap figure from labels like "-4.5", "Team (+6.5)", "Name (-1.5)". */
export function extractHandicapFigure(str: string | null | undefined): string | null {
  if (!str || typeof str !== "string") return null;
  const inParens = [...str.matchAll(/\(([+-]?\d+(?:\.\d+)?)\)/g)];
  if (inParens.length > 0) return inParens[inParens.length - 1][1];
  return getOnlyNumber(str) ?? null;
}

export const getOddName = (
  str: string | { h: string | null; e: string | null; o: string | null } | null,
) => {
  if (typeof str === "string") {
    return str;
  }
  if (typeof str === "object" && str !== null) {
    return (str.e ?? "") + (str.o ?? "") + (str.h ?? "");
  }
  return null;
};
