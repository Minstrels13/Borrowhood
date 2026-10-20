// Compare the approved snapshot with the proposal; no profile or review rules change here.
export function profileChangeDetails(change) {
  const name = change.full_name !== change.previous_full_name;
  const photo = change.photo_path !== change.previous_photo_path;
  return {
    name,
    photo,
    kind: name && photo ? 'name and photo' : name ? 'name' : photo ? 'photo' : 'identity',
    pending: name && photo ? 'new name and photo' : name ? 'new name' : photo ? 'new photo' : 'identity changes',
  };
}

export function nameDifference(before, after) {
  const oldName = Array.from(before || '');
  const newName = Array.from(after || '');
  let start = 0;
  while (start < oldName.length && start < newName.length && oldName[start] === newName[start]) start++;
  let end = 0;
  while (end < oldName.length - start && end < newName.length - start
    && oldName[oldName.length - 1 - end] === newName[newName.length - 1 - end]) end++;
  return {
    prefix: newName.slice(0, start).join(''),
    removed: oldName.slice(start, oldName.length - end).join(''),
    added: newName.slice(start, newName.length - end).join(''),
    suffix: end ? newName.slice(newName.length - end).join('') : '',
  };
}
