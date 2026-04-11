const normalize = (value: string) => value.trim().toLocaleLowerCase('sr-Latn');

export function compareByNameThenAccount<T>(
  a: T,
  b: T,
  getName: (item: T) => string,
  getAccount: (item: T) => string
): number {
  const nameDiff = normalize(getName(a)).localeCompare(normalize(getName(b)), 'sr-Latn');
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return normalize(getAccount(a)).localeCompare(normalize(getAccount(b)), 'sr-Latn');
}
