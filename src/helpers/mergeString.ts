export const mergeString = (strings: (string | number)[]): string => {
  return strings.map(String).join("-").trim();
};
