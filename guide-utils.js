export const categories = ['Account', 'Finding records', 'Orders', 'Candidates', 'Timesheets'];
export function searchGuides(guides, query = '', category = 'All', savedOnly = false, saved = []) {
  const terms = query.trim().toLocaleLowerCase('en-GB').split(/\s+/).filter(Boolean);
  return guides.filter(g => {
    if (category !== 'All' && g.category !== category) return false;
    if (savedOnly && !saved.includes(g.id)) return false;
    const text = [g.code, g.title, g.category, g.path, g.summary, g.tip, g.outcome, ...g.steps.flatMap(s => [s.title,s.body])].join(' ').toLocaleLowerCase('en-GB');
    return terms.every(t => text.includes(t));
  });
}
export function readStored(storage, key, fallback) {
  try { const value = JSON.parse(storage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}
export function validProgress(value, guides) {
  const clean = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return clean;
  for (const g of guides) if (Array.isArray(value[g.id])) clean[g.id] = [...new Set(value[g.id])].filter(n => g.steps.some(s => s.number === n));
  return clean;
}
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
