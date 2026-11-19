const timeZone = 'Asia/Seoul';
const clockFields = {timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'};
const clockFormat = new Intl.DateTimeFormat('ko-KR', clockFields);
const dayFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone, year: 'numeric', month: 'long', day: 'numeric',
});
const creationFormat = new Intl.DateTimeFormat('ko-KR', {
  ...clockFields, year: 'numeric', month: '2-digit', day: '2-digit',
});

function createdTime(record) {
  const seconds = record?.created_at;
  return Number.isFinite(seconds) && Math.abs(seconds) <= 8.64e12 ? seconds : -Infinity;
}

export function compareMissionCreation(left, right) {
  const a = createdTime(left), b = createdTime(right);
  if (a !== b) return b - a;
  const idA = left.mission_id ?? left.id, idB = right.mission_id ?? right.id;
  if (idA === idB) return 0;
  return idA < idB ? -1 : 1;
}

export function missionCreationLabel(record) {
  const seconds = createdTime(record);
  return Number.isFinite(seconds) ? '생성 ' + creationFormat.format(seconds * 1000) : '생성 일시 미상';
}

export function missionCreationClock(record) {
  const seconds = createdTime(record);
  return Number.isFinite(seconds) ? clockFormat.format(seconds * 1000) : '';
}

export function missionsByCreationDay(missions) {
  const days = new Map();
  for (const mission of [...missions].sort(compareMissionCreation)) {
    const seconds = createdTime(mission);
    const day = Number.isFinite(seconds) ? dayFormat.format(seconds * 1000) : '생성일 미상';
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(mission);
  }
  return days;
}

function orderChildren(parent, children) {
  const keep = new Set(children);
  for (const child of Array.from(parent.children)) {
    if (!keep.has(child)) child.remove();
  }
  let cursor = parent.firstElementChild;
  for (const child of children) {
    if (child === cursor) cursor = cursor.nextElementSibling;
    else parent.insertBefore(child, cursor);
  }
}

function updateOptions(select, days) {
  const doc = select.ownerDocument;
  const byValue = new Map(Array.from(select.options, option => [option.value, option]));
  const byDay = new Map(Array.from(select.querySelectorAll('optgroup'), group => [group.label, group]));
  const contents = [];
  if (doc.defaultView.CSS?.supports('appearance', 'base-select')) {
    let caption = select.querySelector('button');
    if (!caption) {
      caption = doc.createElement('button');
      caption.type = 'button';
      caption.append(doc.createElement('selectedcontent'));
    }
    contents.push(caption);
  }
  function optionFor(value, text, title) {
    const option = byValue.get(value) || doc.createElement('option');
    if (!option.hasAttribute('value') || option.value !== value) option.value = value;
    if (option.textContent !== text) option.textContent = text;
    if (option.title !== title) option.title = title;
    return option;
  }
  contents.push(optionFor('', '임무 선택', ''));
  // Keep focused rows in the document when another operator adds or renames a mission.
  for (const [day, entries] of days) {
    const group = byDay.get(day) || doc.createElement('optgroup');
    if (group.label !== day) group.label = day;
    orderChildren(group, entries.map(m => optionFor(m.mission_id, m.title, missionCreationLabel(m))));
    contents.push(group);
  }
  orderChildren(select, contents);
}

export function renderMissionPicker(select, missions, current) {
  const byId = new Map(missions.map(mission => [mission.mission_id, mission]));
  if (current) byId.set(current.mission_id, current);
  updateOptions(select, missionsByCreationDay(byId.values()));
  const value = current?.mission_id ?? '';
  if (select.value !== value) select.value = value;

  const stamp = select.ownerDocument.getElementById('mission-created-at');
  stamp.hidden = !current;
  stamp.textContent = current ? missionCreationLabel(current) : '';
  const time = createdTime(current);
  if (Number.isFinite(time)) stamp.dateTime = new Date(time * 1000).toISOString();
  else stamp.removeAttribute('datetime');
}

export function bindMissionPickerRefresh(select, read, apply, onError) {
  const win = select.ownerDocument.defaultView;
  const customPicker = win.CSS?.supports('appearance', 'base-select') && win.CSS.supports('selector(select:open)');
  let pending;
  const invalidate = () => { pending = undefined; };

  async function refresh() {
    if (select.disabled || pending) return;
    const request = read();
    pending = request;
    try {
      const missions = await request;
      if (pending === request) apply(missions);
    } catch (error) {
      if (pending === request) onError(error);
    } finally {
      if (pending === request) invalidate();
    }
  }
  function showNewest() {
    if (customPicker) win.requestAnimationFrame(() => {
      if (select.matches(':open')) select.options[0]?.scrollIntoView({block:'nearest',container:'nearest'});
    });
  }
  select.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target !== select) return;
    void refresh();
    showNewest();
  });
  select.addEventListener('keydown', event => {
    if (event.target === select && !event.repeat && ['Enter',' ','F4','ArrowDown','ArrowUp'].includes(event.key)) void refresh();
  });
  select.addEventListener('click', event => {
    if (event.target !== select) return;
    if (event.detail === 0) void refresh();
    showNewest();
  });
  if (customPicker) win.addEventListener('keydown', event => {
    // Let the browser dismiss the picker before the dashboard handles Escape.
    if (event.key === 'Escape' && select.contains(event.target) && select.matches(':open')) event.stopPropagation();
  }, true);
  select.addEventListener('change', invalidate, true);
  return invalidate;
}
