export function trimAndUppercase(value: string) {
  let newName = value.trim();
  const firstChar = newName[0];

  if (firstChar === firstChar.toLowerCase())
    newName = firstChar.toUpperCase() + newName.substring(1);

  return newName;
}
