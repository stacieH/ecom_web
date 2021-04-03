export const sorting = (items, actions) => {
  const { direction, sort_by } = actions;
  let dir;
  direction.toLowerCase() === 'ascending' ? (dir = 1) : (dir = -1);
  const sorted_item = items.sort((a, b) => {
    if (a[sort_by].toLowerCase() < b[sort_by].toLowerCase()) {
      return -1 * dir;
    } else {
      return 1 * dir;
    }
  });
  return sorted_item;
};
