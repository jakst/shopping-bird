export function equalsList(
  listA: readonly { name: string; checked: boolean }[],
  listB: readonly { name: string; checked: boolean }[],
) {
  if (listA.length !== listB.length) return false;

  const sortedA = sortList(listA);
  const sortedB = sortList(listB);

  const somethingsWrong = sortedA.some((a, i) => {
    const b = sortedB[i];
    return a.name !== b.name || a.checked !== b.checked;
  });

  return !somethingsWrong;
}

function sortList(list: readonly { name: string; checked: boolean }[]) {
  return [...list].sort((a, b) =>
    `${a.name}:${a.checked}`.localeCompare(`${b.name}:${b.checked}`),
  );
}
