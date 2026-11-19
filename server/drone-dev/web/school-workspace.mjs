let owner = null;
const activeAccountKey = 'school:active-account';

export function bindSchoolAccount(id) {
  const previous = owner;
  owner = id || null;
  if (owner) localStorage.setItem(activeAccountKey, owner);
  else if (previous && localStorage.getItem(activeAccountKey) === previous) localStorage.removeItem(activeAccountKey);
}

window.addEventListener('storage', event => {
  if (event.key === activeAccountKey && owner && event.newValue !== owner) location.reload();
});

export function accountStorage(storage) {
  const keyFor = key => 'school:' + owner + ':' + key;
  return {
    getItem(key) { return owner ? storage.getItem(keyFor(key)) : null; },
    setItem(key, value) { if (owner) storage.setItem(keyFor(key), value); },
    removeItem(key) { if (owner) storage.removeItem(keyFor(key)); },
  };
}
