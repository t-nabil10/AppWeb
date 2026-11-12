/* Suivi Heures & Revenus — données en localStorage, aucun backend */
'use strict';
const KEY = 'suiviHeuresEcole';
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const $ = s => document.querySelector(s);
const now = new Date();
let page = 'dashboard', Y = now.getFullYear(), M = now.getMonth(), charts = [];

/* ---------- Données ---------- */
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.settings && Array.isArray(d.sessions)) return d;
  } catch (e) { console.warn('Données illisibles', e); }
  return { settings: { school: 'Mon École', rate: 100, fy: now.getFullYear(), notes: '' }, sessions: [] };
}
let db = load();
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Erreur de sauvegarde'); }
  clearTimeout(ghTimer);
  if (gh.auto && gh.synced && gh.token) ghTimer = setTimeout(() => ghPush(true), 5000); // envoi auto 5 s après le dernier changement
};
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }

/* ---------- Utilitaires ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dim = (y, m) => new Date(y, m + 1, 0).getDate(); // gère les années bissextiles
const wd = s => JOURS[new Date(s + 'T00:00:00').getDay()];
const inc = s => s.hours * s.rate;
const fmt = n => n ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
const fmtH = n => n ? String(+n.toFixed(2)) : '-';
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byMonth = (y, m) => db.sessions.filter(s => s.date.startsWith(`${y}-${pad(m + 1)}`)).sort((a, b) => a.date.localeCompare(b.date));
const sum = l => ({ h: l.reduce((a, s) => a + s.hours, 0), i: l.reduce((a, s) => a + inc(s), 0), d: l.length });
const monthTotals = y => MOIS.map((_, m) => sum(byMonth(y, m)));
const yearOf = s => +s.date.slice(0, 4);

/* ---------- Mutations ---------- */
function setSession(date, hours, notes, rate) {
  const i = db.sessions.findIndex(s => s.date === date);
  hours = parseFloat(hours);
  if (!(hours > 0)) { if (i >= 0) db.sessions.splice(i, 1); }
  else if (hours > 24) return toast('Maximum 24 heures par jour');
  else if (i >= 0) { db.sessions[i].hours = hours; if (notes !== undefined) db.sessions[i].notes = notes; if (rate) db.sessions[i].rate = rate; }
  else db.sessions.push({ date, hours, rate: rate || db.settings.rate, notes: notes || '' }); // taux figé à la saisie
  save(); render();
}

/* ---------- Navigation ---------- */
function render() {
  charts.forEach(c => c.destroy()); charts = [];
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.p === page));
  $('#brandName').textContent = db.settings.school;
  const ys = new Set([Y, now.getFullYear(), db.settings.fy, ...db.sessions.map(yearOf)]);
  $('#yearSel').innerHTML = [...ys].sort().map(y => `<option ${y === Y ? 'selected' : ''}>${y}</option>`).join('');
  $('#today').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#view').innerHTML = ({ dashboard, monthly, daily, annual, settings, backup })[page]();
  if (page === 'dashboard' || page === 'annual') drawCharts();
}
function go(p) { page = p; $('#sidebar').classList.remove('open'); render(); }
$('#nav').onclick = e => { const a = e.target.closest('a'); if (a) go(a.dataset.p); };
$('#yearSel').onchange = e => { Y = +e.target.value; render(); };
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
function moveMonth(d) { M += d; if (M < 0) { M = 11; Y--; } if (M > 11) { M = 0; Y++; } render(); }

/* ---------- Pages ---------- */
const kpi = (l, v, c = '') => `<div class="col-6 col-lg-4"><div class="cardx kpi ${c}"><small>${l}</small><b>${v}</b></div></div>`;
const recentRows = l => l.map(s => `<tr><td>${s.date.split('-').reverse().join('/')}</td><td>${wd(s.date)}</td><td>${fmtH(s.hours)}</td><td>${fmt(inc(s))} DH</td></tr>`).join('');

function dashboard() {
  const cur = sum(byMonth(Y, M)), yr = sum(db.sessions.filter(s => yearOf(s) === Y));
  const recent = [...db.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return `<h4 class="mb-3">Tableau de bord — ${Y}</h4><div class="row g-3 mb-3">
    ${kpi('Revenu du mois (' + MOIS[M] + ')', fmt(cur.i) + ' DH', 'tq')}${kpi('Heures du mois', fmtH(cur.h))}
    ${kpi('Moyenne d\'heures / jour', fmtH(cur.d ? cur.h / cur.d : 0))}${kpi('Jours travaillés', cur.d || '-')}
    ${kpi('Revenu annuel', fmt(yr.i) + ' DH', 'gold')}${kpi('Heures annuelles', fmtH(yr.h))}</div>
    <div class="row g-3 mb-3"><div class="col-lg-6"><div class="cardx"><canvas id="c1"></canvas></div></div>
    <div class="col-lg-6"><div class="cardx"><canvas id="c2"></canvas></div></div></div>
    <div class="cardx"><h6>Séances récentes</h6><div class="table-responsive"><table class="table table-striped"><thead><tr><th>Date</th><th>Jour</th><th>Heures</th><th>Revenu</th></tr></thead><tbody>${recentRows(recent) || '<tr><td colspan="4" class="text-muted">Aucune séance enregistrée.</td></tr>'}</tbody></table></div></div>`;
}

function monthly() {
  const l = byMonth(Y, M), t = sum(l), n = dim(Y, M); let rows = '';
  for (let d = 1; d <= n; d++) {
    const dt = iso(Y, M, d), s = db.sessions.find(x => x.date === dt), w = wd(dt);
    rows += `<tr class="${w === 'Dimanche' || w === 'Samedi' ? 'we' : ''}"><td>${pad(d)}</td><td>${w}</td>
      <td><input type="number" min="0" max="24" step="0.25" class="form-control form-control-sm w-auto" value="${s ? s.hours : ''}" onchange="setSession('${dt}',this.value)"></td>
      <td>${s ? fmt(s.rate) : '-'}</td><td>${s ? fmt(inc(s)) : '-'}</td></tr>`;
  }
  return `<div class="d-flex align-items-center gap-2 mb-3 flex-wrap"><button class="btn btn-light" onclick="moveMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
    <h4 class="m-0">${MOIS[M]} ${Y}</h4><button class="btn btn-light" onclick="moveMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="ms-auto d-flex gap-2"><button class="btn btn-tq btn-sm" onclick="xlsMonth()"><i class="fa-solid fa-file-excel"></i> Excel</button><button class="btn btn-gold btn-sm" onclick="pdfMonth()"><i class="fa-solid fa-file-pdf"></i> PDF</button></div></div>
    <div class="row g-3 mb-3">${kpi('Heures totales', fmtH(t.h))}${kpi('Revenu mensuel', fmt(t.i) + ' DH', 'tq')}${kpi('Jours travaillés', t.d || '-')}${kpi('Revenu moyen / jour', fmt(t.d ? t.i / t.d : 0) + ' DH', 'gold')}</div>
    <div class="cardx"><div class="table-responsive"><table class="table table-striped align-middle"><thead><tr><th>Jour</th><th>Date</th><th>Heures</th><th>Taux (DH)</th><th>Revenu (DH)</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function daily() {
  const l = byMonth(Y, M);
  const rows = l.map(s => `<tr><td>${s.date.split('-').reverse().join('/')}</td><td>${wd(s.date)}</td>
    <td><input type="number" min="0" max="24" step="0.25" class="form-control form-control-sm" value="${s.hours}" onchange="setSession('${s.date}',this.value)"></td>
    <td><input type="number" min="0" step="0.5" class="form-control form-control-sm" value="${s.rate}" onchange="setSession('${s.date}',${s.hours},undefined,parseFloat(this.value)||${s.rate})"></td>
    <td>${fmt(inc(s))}</td><td><input class="form-control form-control-sm" value="${esc(s.notes)}" onchange="setSession('${s.date}',${s.hours},this.value)"></td>
    <td><button class="btn btn-sm btn-outline-danger" onclick="delS('${s.date}')"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('');
  const opts = Array.from({ length: dim(Y, M) }, (_, i) => `<option value="${iso(Y, M, i + 1)}">${wd(iso(Y, M, i + 1))} ${i + 1}</option>`).join('');
  return `<div class="d-flex align-items-center gap-2 mb-3"><button class="btn btn-light" onclick="moveMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button><h4 class="m-0">Heures — ${MOIS[M]} ${Y}</h4><button class="btn btn-light" onclick="moveMonth(1)"><i class="fa-solid fa-chevron-right"></i></button></div>
    <div class="cardx mb-3"><div class="row g-2 align-items-end"><div class="col-6 col-md-3"><label class="small">Jour</label><select id="nd" class="form-select">${opts}</select></div>
    <div class="col-6 col-md-2"><label class="small">Heures</label><input id="nh" type="number" min="0" max="24" step="0.25" class="form-control"></div>
    <div class="col-12 col-md-5"><label class="small">Notes</label><input id="nn" class="form-control"></div>
    <div class="col-12 col-md-2"><button class="btn btn-tq w-100" onclick="addS()">Enregistrer</button></div></div>
    <small class="text-muted">Une seule séance par date : saisir une date existante met à jour ses heures. Taux appliqué : ${fmt(db.settings.rate)} DH/h.</small></div>
    <div class="cardx"><div class="table-responsive"><table class="table table-striped align-middle"><thead><tr><th>Date</th><th>Jour</th><th>Heures</th><th>Taux</th><th>Revenu</th><th>Notes</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="text-muted">Aucune séance ce mois-ci.</td></tr>'}</tbody></table></div></div>`;
}
function addS() { const h = $('#nh').value; if (!(parseFloat(h) > 0)) return toast('Saisissez un nombre d\'heures valide'); setSession($('#nd').value, h, $('#nn').value); toast('Séance enregistrée'); }
function delS(d) { if (confirm('Supprimer cette séance ?')) setSession(d, 0); }

function annual() {
  const t = monthTotals(Y), tot = sum(db.sessions.filter(s => yearOf(s) === Y)), act = t.map((x, i) => ({ ...x, m: i })).filter(x => x.i > 0);
  const hi = act.length ? act.reduce((a, b) => b.i > a.i ? b : a) : null, lo = act.length ? act.reduce((a, b) => b.i < a.i ? b : a) : null;
  return `<div class="d-flex align-items-center mb-3"><h4 class="m-0">Rapport annuel ${Y}</h4><div class="ms-auto d-flex gap-2"><button class="btn btn-tq btn-sm" onclick="xlsYear()"><i class="fa-solid fa-file-excel"></i> Excel</button><button class="btn btn-gold btn-sm" onclick="pdfYear()"><i class="fa-solid fa-file-pdf"></i> PDF</button></div></div>
    <div class="row g-3 mb-3">${kpi('Revenu annuel', fmt(tot.i) + ' DH', 'gold')}${kpi('Heures annuelles', fmtH(tot.h))}${kpi('Revenu mensuel moyen', fmt(act.length ? tot.i / act.length : 0) + ' DH')}
    ${kpi('Meilleur mois', hi ? MOIS[hi.m] + ' (' + fmt(hi.i) + ')' : '-', 'tq')}${kpi('Mois le plus faible', lo ? MOIS[lo.m] + ' (' + fmt(lo.i) + ')' : '-')}</div>
    <div class="cardx mb-3"><canvas id="c1"></canvas></div>
    <div class="cardx"><div class="table-responsive"><table class="table table-striped"><thead><tr><th>Mois</th><th>Jours</th><th>Heures</th><th>Revenu (DH)</th></tr></thead><tbody>${t.map((x, i) => `<tr><td>${MOIS[i]}</td><td>${x.d || '-'}</td><td>${fmtH(x.h)}</td><td>${fmt(x.i)}</td></tr>`).join('')}
    <tr class="fw-bold"><td>Total</td><td>${tot.d || '-'}</td><td>${fmtH(tot.h)}</td><td>${fmt(tot.i)}</td></tr></tbody></table></div></div>`;
}

function settings() {
  const s = db.settings;
  return `<h4 class="mb-3">Paramètres</h4><div class="cardx"><div class="row g-3">
    <div class="col-md-6"><label>Nom de l'école</label><input id="sn" class="form-control" value="${esc(s.school)}"></div>
    <div class="col-md-3"><label>Taux horaire (DH)</label><input id="sr" type="number" min="0" step="0.5" class="form-control" value="${s.rate}"></div>
    <div class="col-md-3"><label>Année financière</label><input id="sf" type="number" class="form-control" value="${s.fy}"></div>
    <div class="col-12"><label>Notes</label><textarea id="sx" class="form-control">${esc(s.notes)}</textarea></div>
    <div class="col-12"><button class="btn btn-tq" onclick="saveSet(false)">Enregistrer</button>
    <button class="btn btn-gold" onclick="saveSet(true)">Enregistrer et appliquer le taux à toutes les séances passées</button></div></div>
    <small class="text-muted d-block mt-2">Par défaut, un nouveau taux ne concerne que les futures séances : l'historique garde son taux d'origine.</small></div>`;
}
function saveSet(all) {
  const r = parseFloat($('#sr').value), f = parseInt($('#sf').value);
  if (!(r >= 0) || !(f > 1990)) return toast('Valeurs invalides');
  if (all && !confirm('Modifier le taux de TOUTES les séances existantes ?')) return;
  db.settings = { school: $('#sn').value.trim() || 'Mon École', rate: r, fy: f, notes: $('#sx').value };
  if (all) db.sessions.forEach(s => s.rate = r);
  save(); render(); toast('Paramètres enregistrés');
}

function backup() {
  return `<h4 class="mb-3">Sauvegarde et restauration</h4><div class="row g-3"><div class="col-md-6"><div class="cardx"><h6>Exporter (JSON)</h6><button class="btn btn-tq" onclick="exportJSON()">Télécharger la sauvegarde</button></div></div>
    <div class="col-md-6"><div class="cardx"><h6>Restaurer (fusion)</h6><input type="file" accept=".json" class="form-control mb-2" onchange="importJSON(this.files[0])"><small class="text-muted">Les dates déjà existantes ne sont jamais écrasées ; seules les nouvelles séances sont ajoutées.</small></div></div>
    <div class="col-12"><div class="cardx"><h6><i class="fa-brands fa-github"></i> Sauvegarde GitHub</h6><div class="row g-2">
    <div class="col-md-3"><input id="gho" class="form-control" placeholder="Utilisateur GitHub" value="${esc(gh.owner)}" onchange="ghCfg()"></div>
    <div class="col-md-3"><input id="ghr" class="form-control" placeholder="Dépôt (privé)" value="${esc(gh.repo)}" onchange="ghCfg()"></div>
    <div class="col-md-3"><input id="ghp" class="form-control" placeholder="Dossier (sauvegardes)" value="${esc(gh.path)}" onchange="ghCfg()"></div>
    <div class="col-md-3"><input id="ght" type="password" class="form-control" placeholder="Jeton d'accès" value="${esc(gh.token)}" onchange="ghCfg()"></div>
    <div class="col-12 d-flex gap-2 flex-wrap align-items-center"><button class="btn btn-tq" onclick="ghCfg();ghPush()">Envoyer vers GitHub</button><button class="btn btn-gold" onclick="ghCfg();ghPull()">Restaurer depuis GitHub</button>
    <label class="ms-2"><input type="checkbox" id="gha" ${gh.auto ? 'checked' : ''} onchange="ghCfg()"> Envoi automatique (1 fichier par jour)</label></div></div>
    <small class="text-muted d-block mt-2">Chaque envoi crée un nouveau fichier daté ; les anciennes sauvegardes ne sont jamais écrasées. Utilisez un dépôt <b>privé</b> et un jeton à portée limitée à ce dépôt (Contents : lecture/écriture). Le jeton reste sur cet appareil et n'est jamais inclus dans la sauvegarde.</small></div></div>
    <div class="col-12"><div class="cardx"><h6 class="text-danger">Zone dangereuse</h6><button class="btn btn-outline-danger" onclick="wipe()">Effacer toutes les données</button></div></div></div>`;
}
function exportJSON() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `sauvegarde-heures-${iso(now.getFullYear(), now.getMonth(), now.getDate())}.json`; a.click();
}
function mergeData(d) {
  if (!d || !Array.isArray(d.sessions)) throw new Error('Fichier de sauvegarde invalide');
  let add = 0, skip = 0;
  d.sessions.forEach(s => {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.hours > 0 && s.hours <= 24 && s.rate >= 0;
    if (!ok || db.sessions.some(x => x.date === s.date)) return skip++; // jamais d'écrasement
    db.sessions.push({ date: s.date, hours: +s.hours, rate: +s.rate, notes: String(s.notes || '') }); add++;
  });
  save(); render(); toast(`${add} séance(s) ajoutée(s), ${skip} ignorée(s)`);
}
function importJSON(f) {
  if (!f) return; const r = new FileReader();
  r.onload = () => { try { mergeData(JSON.parse(r.result)); } catch (e) { toast('Fichier de sauvegarde invalide'); } };
  r.readAsText(f);
}

/* ---------- Sauvegarde GitHub (API Contents) ---------- */
const GHK = 'suiviHeuresGH'; // config + jeton stockés à part : jamais inclus dans la sauvegarde JSON
let gh = (() => { try { return JSON.parse(localStorage.getItem(GHK)) || {}; } catch (e) { return {}; } })(), ghTimer;
function ghCfg() {
  gh = { ...gh, owner: $('#gho').value.trim(), repo: $('#ghr').value.trim(), path: $('#ghp').value.trim() || 'sauvegardes', token: $('#ght').value.trim(), auto: $('#gha').checked };
  localStorage.setItem(GHK, JSON.stringify(gh));
}
async function ghApi(method, body, sub = '') {
  if (!gh.owner || !gh.repo || !gh.token) throw new Error('configuration incomplète');
  const folder = gh.path && !gh.path.endsWith('.json') ? gh.path : 'sauvegardes';
  const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${folder}${sub}`, {
    method, cache: 'no-store', headers: { Authorization: 'Bearer ' + gh.token, Accept: 'application/vnd.github+json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 404 && method === 'GET') return null;
  if (!r.ok) throw new Error('erreur ' + r.status);
  return r.json();
}
/* Chaque envoi manuel crée un NOUVEAU fichier daté : les anciennes sauvegardes restent intactes.
   L'envoi automatique crée au plus un fichier par jour (mis à jour dans la journée). */
async function ghPush(silent) {
  try {
    const d = new Date(), day = iso(d.getFullYear(), d.getMonth(), d.getDate());
    const name = silent ? `sauvegarde-${day}.json` : `sauvegarde-${day}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.json`;
    const cur = silent ? await ghApi('GET', null, '/' + name) : null;
    await ghApi('PUT', { message: 'Sauvegarde ' + name, content: btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2)))), sha: cur ? cur.sha : undefined }, '/' + name);
    gh.synced = true; localStorage.setItem(GHK, JSON.stringify(gh));
    if (!silent) toast('Nouvelle sauvegarde créée : ' + name);
  } catch (e) { toast('Échec GitHub : ' + e.message); }
}
async function ghPull() {
  try {
    const list = await ghApi('GET');
    const files = (Array.isArray(list) ? list : []).map(f => f.name).filter(n => n.endsWith('.json')).sort().reverse().slice(0, 10);
    if (!files.length) return toast('Aucune sauvegarde trouvée sur GitHub');
    const n = parseInt(prompt('Quelle sauvegarde restaurer ? (numéro)\n' + files.map((f, i) => `${i + 1}. ${f}`).join('\n'), '1'));
    if (!(n >= 1 && n <= files.length)) return;
    const cur = await ghApi('GET', null, '/' + files[n - 1]);
    mergeData(JSON.parse(decodeURIComponent(escape(atob(cur.content.replace(/\n/g, ''))))));
    gh.synced = true; localStorage.setItem(GHK, JSON.stringify(gh));
  } catch (e) { toast('Échec GitHub : ' + e.message); }
}
function wipe() { if (confirm('Supprimer définitivement toutes les données ?') && confirm('Dernière confirmation : action irréversible.')) { localStorage.removeItem(KEY); db = load(); render(); } }

/* ---------- Graphiques ---------- */
function drawCharts() {
  const t = monthTotals(Y), mk = (id, label, data, color, type) => { const c = $('#' + id); if (c) charts.push(new Chart(c, { type, data: { labels: MOIS.map(m => m.slice(0, 3)), datasets: [{ label, data, backgroundColor: color, borderColor: color, tension: .35, fill: false }] }, options: { plugins: { legend: { position: 'bottom' } } } })); };
  mk('c1', 'Revenu (DH)', t.map(x => x.i), '#0E8FA0', page === 'annual' ? 'line' : 'bar');
  mk('c2', 'Heures', t.map(x => x.h), '#F2A33A', 'bar');
}

/* ---------- Exports ---------- */
function xlsSave(wb, name) { XLSX.writeFile(wb, name); }
const dash = n => n ? n : '-';
function xlsMonth() {
  const l = byMonth(Y, M), t = sum(l);
  const rows = [['Date', 'Jour', 'Heures', 'Taux (DH)', 'Revenu (DH)', 'Notes'], ...l.map(s => [s.date, wd(s.date), s.hours, s.rate, inc(s), s.notes]), ['Total', '', dash(t.h), '', dash(t.i), '']];
  const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 30 }];
  Object.keys(ws).forEach(k => { if (k[0] !== '!' && typeof ws[k].v === 'number') ws[k].z = '#,##0.00'; });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, MOIS[M]); xlsSave(wb, `rapport-${MOIS[M]}-${Y}.xlsx`);
}
function xlsYear() {
  const t = monthTotals(Y), tot = sum(db.sessions.filter(s => yearOf(s) === Y));
  const ws = XLSX.utils.aoa_to_sheet([['Mois', 'Jours', 'Heures', 'Revenu (DH)'], ...t.map((x, i) => [MOIS[i], dash(x.d), dash(x.h), dash(x.i)]), ['Total', dash(tot.d), dash(tot.h), dash(tot.i)]]);
  const det = XLSX.utils.aoa_to_sheet([['Date', 'Jour', 'Heures', 'Taux', 'Revenu', 'Notes'], ...db.sessions.filter(s => yearOf(s) === Y).sort((a, b) => a.date.localeCompare(b.date)).map(s => [s.date, wd(s.date), s.hours, s.rate, inc(s), s.notes])]);
  ws['!cols'] = det['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Synthèse ' + Y); XLSX.utils.book_append_sheet(wb, det, 'Détails'); xlsSave(wb, `bilan-annuel-${Y}.xlsx`);
}
function pdfDoc(title, period, head, body) {
  const { jsPDF } = window.jspdf, p = new jsPDF();
  p.setFontSize(16); p.setTextColor(30, 42, 82); p.text(db.settings.school, 14, 18);
  p.setFontSize(12); p.text(`${title} — ${period}`, 14, 27);
  p.autoTable({ startY: 34, head: [head], body, headStyles: { fillColor: [30, 42, 82] }, alternateRowStyles: { fillColor: [241, 245, 251] } });
  return p;
}
function pdfMonth() {
  const l = byMonth(Y, M), t = sum(l);
  pdfDoc('Rapport mensuel', `${MOIS[M]} ${Y}`, ['Date', 'Jour', 'Heures', 'Taux', 'Revenu (DH)'],
    [...l.map(s => [s.date, wd(s.date), fmtH(s.hours), fmt(s.rate), fmt(inc(s))]), ['Total', '', fmtH(t.h), '', fmt(t.i)]]).save(`rapport-${MOIS[M]}-${Y}.pdf`);
}
function pdfYear() {
  const t = monthTotals(Y), tot = sum(db.sessions.filter(s => yearOf(s) === Y));
  pdfDoc('Bilan annuel', String(Y), ['Mois', 'Jours', 'Heures', 'Revenu (DH)'],
    [...t.map((x, i) => [MOIS[i], x.d || '-', fmtH(x.h), fmt(x.i)]), ['Total', tot.d || '-', fmtH(tot.h), fmt(tot.i)]]).save(`bilan-annuel-${Y}.pdf`);
}

/* ---------- Démarrage ---------- */
render();

/* ---------- PWA : enregistrement du service worker ---------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW non enregistré', e)));
}
