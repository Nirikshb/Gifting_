let open = false;

export function openAnalytics() {
  open = true;
}

export function closeAnalytics() {
  open = false;
}

export function analyticsIsOpen() {
  return open;
}
