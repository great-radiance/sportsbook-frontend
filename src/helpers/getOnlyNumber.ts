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
