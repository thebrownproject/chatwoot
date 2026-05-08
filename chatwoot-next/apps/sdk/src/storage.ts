// Visitor persistence. Matches existing widget behavior in
// `app/javascript/sdk/cookieHelpers.js` — we keep `pubsub_token` and
// the active conversation id in localStorage (keyed by website token)
// so a returning visitor lands back in their thread on next page load.

const STORAGE_PREFIX = 'cw_visitor_';

export interface VisitorState {
  pubsubToken: string | null;
  conversationId: string | null;
}

function storageKey(websiteToken: string): string {
  return `${STORAGE_PREFIX}${websiteToken}`;
}

export function loadVisitorState(websiteToken: string): VisitorState {
  // TODO: read from localStorage, JSON.parse, fall back to empty state
  // when storage is unavailable (Safari ITP / private mode / disabled).
  void storageKey;
  void websiteToken;
  return { pubsubToken: null, conversationId: null };
}

export function saveVisitorState(_websiteToken: string, _state: VisitorState): void {
  // TODO: persist via localStorage.setItem(storageKey(websiteToken), JSON.stringify(state)).
}
