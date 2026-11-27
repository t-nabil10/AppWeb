/* Suivi Heures & Revenus — données en localStorage, aucun backend */
'use strict';
const KEY = 'suiviHeuresEcole';
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const $ = s => document.querySelector(s);
const now = new Date();
let page = 'dashboard', Y = now.getFullYear(), M = now.getMonth(), charts = [];

/* ---------- Données ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
/* Convertit l'ancien format (une seule école) vers le format multi-écoles */
function migrate(d) {
  if (!d || !Array.isArray(d.sessions)) return null;
  if (!Array.isArray(d.schools)) {
    const o = d.settings || {};
    d.schools = [{ id: 's1', name: o.school || 'Mon École', rate: +o.rate || 100, notes: o.notes || '' }];
    d.settings = { fy: o.fy || now.getFullYear() };
  }
  if (!d.schools.length) d.schools.push({ id: uid(), name: 'Mon École', rate: 100, notes: '' });
  d.settings = d.settings || { fy: now.getFullYear() };
  d.off = Array.isArray(d.off) ? d.off : [];            // jours fériés / absences
  d.pay = d.pay && typeof d.pay === 'object' ? d.pay : {}; // paiements par école et par mois
  d.sessions.forEach(s => { if (!s.school) s.school = d.schools[0].id; });
  if (!d.schools.some(s => s.id === d.current)) d.current = d.schools[0].id;
  return d;
}
function load() {
  try { const d = migrate(JSON.parse(localStorage.getItem(KEY))); if (d) return d; } catch (e) { console.warn('Données illisibles', e); }
  const id = uid();
  return migrate({ settings: { fy: now.getFullYear() }, schools: [{ id, name: 'Mon École', rate: 100, notes: '' }], current: id, sessions: [] }); // ajoute off / pay
}
const sch = () => db.schools.find(s => s.id === db.current) || db.schools[0]; // école sélectionnée
const mine = () => db.sessions.filter(s => s.school === sch().id);          // séances de l'école sélectionnée
let db = load();
const save = localOnly => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Erreur de sauvegarde'); }
  clearTimeout(ghTimer);
  if (gh.auto && gh.synced && gh.token) ghTimer = setTimeout(() => ghPush(true), 5000); // envoi auto 5 s après le dernier changement
  const changed = stampChanges();                  // synchro : repère ce qui a changé
  if (!localOnly && changed) scheduleSync();
};
function toast(t, ms = 2500) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), ms); }

/* ---------- Utilitaires ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dim = (y, m) => new Date(y, m + 1, 0).getDate(); // gère les années bissextiles
const wd = s => JOURS[new Date(s + 'T00:00:00').getDay()];
const inc = s => s.hours * s.rate;
const fmt = n => n ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
const fmtH = n => n ? String(+n.toFixed(2)) : '-';
const fmtP = n => fmt(n).replace(/[\u202f\u00a0]/g, ' '); // pour les PDF : la police de jsPDF ne sait pas écrire l'espace spécial entre les milliers
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byMonth = (y, m) => mine().filter(s => s.date.startsWith(`${y}-${pad(m + 1)}`)).sort((a, b) => a.date.localeCompare(b.date));
const sum = l => ({ h: l.reduce((a, s) => a + s.hours, 0), i: l.reduce((a, s) => a + inc(s), 0), d: l.length });
const monthTotals = y => MOIS.map((_, m) => sum(byMonth(y, m)));
const yearOf = s => +s.date.slice(0, 4);

/* ---------- Mutations ---------- */
function setSession(date, hours, notes, rate) {
  const i = db.sessions.findIndex(s => s.school === db.current && s.date === date);
  hours = parseFloat(hours);
  if (hours > 0 && hours <= 24) db.off = db.off.filter(o => !(o.school === db.current && o.date === date)); // un jour travaillé n'est plus férié/absent
  if (!(hours > 0)) { if (i >= 0) db.sessions.splice(i, 1); }
  else if (hours > 24) return toast('Maximum 24 heures par jour');
  else if (i >= 0) { db.sessions[i].hours = hours; if (notes !== undefined) db.sessions[i].notes = notes; if (rate) db.sessions[i].rate = rate; }
  else db.sessions.push({ school: db.current, date, hours, rate: rate || sch().rate, notes: notes || '' }); // taux figé à la saisie
  save(); render();
}

/* ---------- Navigation ---------- */
function render() {
  charts.forEach(c => c.destroy()); charts = [];
  document.querySelectorAll('#nav a, #bottomBar button').forEach(a => a.classList.toggle('active', a.dataset.p === page));
  $('#brandName').textContent = sch().name;
  $('#schoolSel').innerHTML = db.schools.map(s => `<option value="${s.id}" ${s.id === db.current ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const ys = new Set([Y, now.getFullYear(), db.settings.fy, ...db.sessions.map(yearOf)]);
  $('#yearSel').innerHTML = [...ys].sort().map(y => `<option ${y === Y ? 'selected' : ''}>${y}</option>`).join('');
  $('#today').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#view').innerHTML = ({ dashboard, monthly, daily, annual, settings, backup })[page]();
  if (page === 'dashboard' || page === 'annual') drawCharts();
}
function go(p) {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // valide la saisie en cours avant de changer de page
  page = p; $('#sidebar').classList.remove('open'); render(); window.scrollTo(0, 0);
}
/* Android : la barre du bas se cache pendant la saisie (clavier ouvert), sinon elle flotte au-dessus du clavier et masque les champs */
const isField = e => e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
document.addEventListener('focusin', e => { if (isField(e)) document.body.classList.add('kb'); });
document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement || !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) document.body.classList.remove('kb'); }, 150));
$('#schoolSel').onchange = e => switchSchool(e.target.value);
$('#yearSel').onchange = e => { Y = +e.target.value; render(); };
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
function moveMonth(d) { M += d; if (M < 0) { M = 11; Y--; } if (M > 11) { M = 0; Y++; } render(); }

/* ---------- Pages ---------- */
const kpi = (l, v, c = '') => `<div class="col-6 col-lg-4"><div class="cardx kpi ${c}"><small>${l}</small><b>${v}</b></div></div>`;
const recentRows = l => l.map(s => `<tr><td>${s.date.split('-').reverse().join('/')}</td><td>${wd(s.date)}</td><td>${fmtH(s.hours)}</td><td>${fmt(inc(s))} DH</td></tr>`).join('');

function dashboard() {
  const cur = sum(byMonth(Y, M)), yr = sum(mine().filter(s => yearOf(s) === Y));
  const recent = [...mine()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return `<h4 class="mb-3">Tableau de bord — ${Y}</h4>${todayCard()}<div class="row g-3 mb-3">
    ${kpi('Revenu du mois (' + MOIS[M] + ')', fmt(cur.i) + ' DH', 'tq')}${kpi('Heures du mois', fmtH(cur.h))}
    ${kpi('Moyenne d\'heures / jour', fmtH(cur.d ? cur.h / cur.d : 0))}${kpi('Jours travaillés', cur.d || '-')}
    ${kpi('Revenu annuel', fmt(yr.i) + ' DH', 'gold')}${kpi('Reste à encaisser', fmt(due(Y)) + ' DH', 'tq')}</div>
    <div class="row g-3 mb-3"><div class="col-lg-6"><div class="cardx"><canvas id="c1"></canvas></div></div>
    <div class="col-lg-6"><div class="cardx"><canvas id="c2"></canvas></div></div></div>
    <div class="cardx"><h6>Séances récentes</h6><div class="table-responsive"><table class="table table-striped"><thead><tr><th>Date</th><th>Jour</th><th>Heures</th><th>Revenu</th></tr></thead><tbody>${recentRows(recent) || '<tr><td colspan="4" class="text-muted">Aucune séance enregistrée.</td></tr>'}</tbody></table></div></div>`;
}

function monthly() {
  const l = byMonth(Y, M), t = sum(l), n = dim(Y, M), p = db.pay[payKey(Y, M)]; let rows = '';
  for (let d = 1; d <= n; d++) {
    const dt = iso(Y, M, d), s = mine().find(x => x.date === dt), w = wd(dt), o = offOf(dt), plan = planOf(dt);
    rows += `<tr class="${w === 'Dimanche' || w === 'Samedi' ? 'we' : ''}"><td>${pad(d)}</td><td>${w}</td>
      <td><input type="number" min="0" max="24" step="0.25" class="form-control form-control-sm w-auto" value="${s ? s.hours : ''}" placeholder="${plan || ''}" ${o ? 'disabled' : ''} onchange="setSession('${dt}',this.value)"></td>
      <td><select class="form-select form-select-sm w-auto" onchange="setOff('${dt}',this.value)"><option value="">Travail</option><option value="ferie" ${o && o.type === 'ferie' ? 'selected' : ''}>Férié</option><option value="absent" ${o && o.type === 'absent' ? 'selected' : ''}>Absent</option></select></td>
      <td>${s ? fmt(s.rate) : '-'}</td><td>${s ? fmt(inc(s)) : '-'}</td></tr>`;
  }
  const pay = p && p.paid
    ? `<span class="badge bg-success">Payé le ${p.date.split('-').reverse().join('/')} — ${fmt(p.amount)} DH</span><button class="btn btn-sm btn-outline-secondary" onclick="setPay(false)">Annuler</button>`
    : `<span class="badge bg-warning text-dark">Non payé</span><button class="btn btn-sm btn-tq" onclick="setPay(true)" ${t.i ? '' : 'disabled'}>Marquer comme payé</button>`;
  return `<div class="d-flex align-items-center gap-2 mb-3 flex-wrap"><button class="btn btn-light" onclick="moveMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
    <h4 class="m-0">${MOIS[M]} ${Y}</h4><button class="btn btn-light" onclick="moveMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="ms-auto d-flex gap-2 flex-wrap"><button class="btn btn-gold btn-sm" onclick="fillMonth()"><i class="fa-solid fa-wand-magic-sparkles"></i> Remplir le mois</button><button class="btn btn-tq btn-sm" onclick="xlsMonth()"><i class="fa-solid fa-file-excel"></i> Excel</button><button class="btn btn-outline-secondary btn-sm" onclick="pdfMonth()"><i class="fa-solid fa-file-pdf"></i> PDF</button></div></div>
    <div class="row g-3 mb-3">${kpi('Heures totales', fmtH(t.h))}${kpi('Revenu mensuel', fmt(t.i) + ' DH', 'tq')}${kpi('Jours travaillés', t.d || '-')}${kpi('Revenu moyen / jour', fmt(t.d ? t.i / t.d : 0) + ' DH', 'gold')}</div>
    <div class="cardx mb-3 d-flex flex-wrap align-items-center gap-2"><b>Paiement de ${MOIS[M]}</b>${pay}</div>
    <div class="cardx"><div class="table-responsive"><table class="table table-striped align-middle"><thead><tr><th>N°</th><th>Jour</th><th>Heures</th><th>Statut</th><th>Taux (DH)</th><th>Revenu (DH)</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
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
    <small class="text-muted">Une seule séance par date : saisir une date existante met à jour ses heures. Taux appliqué : ${fmt(sch().rate)} DH/h.</small></div>
    <div class="cardx"><div class="table-responsive"><table class="table table-striped align-middle"><thead><tr><th>Date</th><th>Jour</th><th>Heures</th><th>Taux</th><th>Revenu</th><th>Notes</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="text-muted">Aucune séance ce mois-ci.</td></tr>'}</tbody></table></div></div>`;
}
function addS() { const h = $('#nh').value; if (!(parseFloat(h) > 0)) return toast('Saisissez un nombre d\'heures valide'); setSession($('#nd').value, h, $('#nn').value); toast('Séance enregistrée'); }
function delS(d) { if (confirm('Supprimer cette séance ?')) setSession(d, 0); }

function annual() {
  const t = monthTotals(Y), tot = sum(mine().filter(s => yearOf(s) === Y)), act = t.map((x, i) => ({ ...x, m: i })).filter(x => x.i > 0);
  const hi = act.length ? act.reduce((a, b) => b.i > a.i ? b : a) : null, lo = act.length ? act.reduce((a, b) => b.i < a.i ? b : a) : null;
  return `<div class="d-flex align-items-center mb-3"><h4 class="m-0">Rapport annuel ${Y}</h4><div class="ms-auto d-flex gap-2"><button class="btn btn-tq btn-sm" onclick="xlsYear()"><i class="fa-solid fa-file-excel"></i> Excel</button><button class="btn btn-gold btn-sm" onclick="pdfYear()"><i class="fa-solid fa-file-pdf"></i> PDF</button></div></div>
    <div class="row g-3 mb-3">${kpi('Revenu annuel', fmt(tot.i) + ' DH', 'gold')}${kpi('Heures annuelles', fmtH(tot.h))}${kpi('Revenu mensuel moyen', fmt(act.length ? tot.i / act.length : 0) + ' DH')}
    ${kpi('Meilleur mois', hi ? MOIS[hi.m] + ' (' + fmt(hi.i) + ')' : '-', 'tq')}${kpi('Mois le plus faible', lo ? MOIS[lo.m] + ' (' + fmt(lo.i) + ')' : '-')}${kpi('Reste à encaisser', fmt(due(Y)) + ' DH', 'gold')}</div>
    <div class="cardx mb-3"><canvas id="c1"></canvas></div>
    <div class="cardx"><div class="table-responsive"><table class="table table-striped"><thead><tr><th>Mois</th><th>Jours</th><th>Heures</th><th>Revenu (DH)</th><th>Paiement</th></tr></thead><tbody>${t.map((x, i) => `<tr><td>${MOIS[i]}</td><td>${x.d || '-'}</td><td>${fmtH(x.h)}</td><td>${fmt(x.i)}</td><td>${x.i ? (paidOf(Y, i) ? '<span class="badge bg-success">Payé</span>' : '<span class="badge bg-warning text-dark">Non payé</span>') : '-'}</td></tr>`).join('')}
    <tr class="fw-bold"><td>Total</td><td>${tot.d || '-'}</td><td>${fmtH(tot.h)}</td><td>${fmt(tot.i)}</td><td>Reste : ${fmt(due(Y))}</td></tr></tbody></table></div></div>`;
}

function settings() {
  const s = sch();
  return `<h4 class="mb-3">Paramètres</h4>
    <div class="cardx mb-3"><h6>Mes écoles</h6><div class="d-flex flex-wrap gap-2 mb-2">${db.schools.map(x => `<button class="btn btn-sm ${x.id === db.current ? 'btn-tq' : 'btn-outline-secondary'}" onclick="switchSchool('${x.id}')">${esc(x.name)}</button>`).join('')}
    <button class="btn btn-sm btn-gold" onclick="addSchool()"><i class="fa-solid fa-plus"></i> Ajouter une école</button></div>
    <small class="text-muted">Chaque école a ses propres séances, son taux horaire et ses rapports. Changez d'école avec la liste en haut de l'écran.</small></div>
    <div class="cardx"><h6>École sélectionnée</h6><div class="row g-3">
    <div class="col-md-6"><label>Nom de l'école</label><input id="sn" class="form-control" value="${esc(s.name)}"></div>
    <div class="col-md-3"><label>Taux horaire (DH)</label><input id="sr" type="number" min="0" step="0.5" class="form-control" value="${s.rate}"></div>
    <div class="col-md-3"><label>Année financière</label><input id="sf" type="number" class="form-control" value="${db.settings.fy}"></div>
    <div class="col-12"><label>Emploi du temps (heures par jour de la semaine)</label><div class="row g-2">${[1, 2, 3, 4, 5, 6, 0].map(i => `<div class="col-3 col-md"><small>${JOURS[i].slice(0, 3)}</small><input type="number" min="0" max="24" step="0.25" class="form-control form-control-sm sch" data-d="${i}" value="${(s.sched || {})[i] || ''}"></div>`).join('')}</div></div>
    <div class="col-12"><label>Notes</label><textarea id="sx" class="form-control">${esc(s.notes)}</textarea></div>
    <div class="col-12 d-flex gap-2 flex-wrap"><button class="btn btn-tq" onclick="saveSet(false)">Enregistrer</button>
    <button class="btn btn-gold" onclick="saveSet(true)">Enregistrer et appliquer le taux aux séances passées</button>
    <button class="btn btn-outline-danger ms-auto" onclick="delSchool()">Supprimer cette école</button></div></div>
    <small class="text-muted d-block mt-2">Quand vous changez le taux, l'application demande s'il s'applique aussi aux séances déjà saisies ou seulement aux nouvelles (l'historique garde alors son taux d'origine).</small></div>`;
}
// Question posée quand le taux change alors que des séances existent déjà : nouvelles seulement / aussi les anciennes / annuler
function askRate(oldR, newR, n) {
  return new Promise(res => {
    const el = document.createElement('div');
    el.className = 'modal fade'; el.tabIndex = -1;
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h6 class="modal-title m-0">Nouveau taux horaire</h6></div>
      <div class="modal-body">Le taux passe de <b>${esc(String(oldR))}</b> à <b>${esc(String(newR))}</b> DH.<br>Faut-il l'appliquer aussi aux <b>${n}</b> séance(s) déjà saisie(s) ?</div>
      <div class="modal-footer flex-column align-items-stretch gap-2 m-0">
        <button type="button" class="btn btn-tq" data-a="new">Seulement les nouvelles séances</button>
        <button type="button" class="btn btn-gold" data-a="all">Aussi les séances déjà saisies</button>
        <button type="button" class="btn btn-outline-secondary" data-a="cancel">Annuler</button></div></div></div>`;
    document.body.appendChild(el);
    const m = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
    let ans = 'cancel';
    el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) { ans = b.dataset.a; m.hide(); } });
    el.addEventListener('hidden.bs.modal', () => { el.remove(); res(ans); });
    m.show();
  });
}
async function saveSet(all) {
  const r = parseFloat($('#sr').value), f = parseInt($('#sf').value);
  if (!(r >= 0) || !(f > 1990)) return toast('Valeurs invalides');
  if (all && !confirm('Modifier le taux de TOUTES les séances de cette école ?')) return;
  const s = sch();
  if (!all && r !== s.rate) { // le taux change : on demande ce qu'il faut faire des séances déjà saisies
    const n = mine().filter(x => x.rate !== r).length;
    if (n) { const a = await askRate(s.rate, r, n); if (a === 'cancel') return; all = a === 'all'; }
  }
  s.name = $('#sn').value.trim() || s.name; s.rate = r; s.notes = $('#sx').value; db.settings.fy = f;
  s.sched = {}; document.querySelectorAll('.sch').forEach(i => { const h = parseFloat(i.value); if (h > 0) s.sched[i.dataset.d] = h; });
  if (all) mine().forEach(x => x.rate = r);
  save(); render(); toast('Paramètres enregistrés');
}
function switchSchool(id) { db.current = id; save(); render(); toast('École : ' + sch().name); }
function addSchool() {
  const name = (prompt('Nom de la nouvelle école :') || '').trim(); if (!name) return;
  const rate = parseFloat(prompt('Taux horaire (DH) :', sch().rate));
  db.schools.push({ id: uid(), name, rate: rate >= 0 ? rate : 100, notes: '' });
  db.current = db.schools[db.schools.length - 1].id; save(); render(); toast('École ajoutée : ' + name);
}
function delSchool() {
  if (db.schools.length < 2) return toast('Il faut garder au moins une école');
  const s = sch(), n = mine().length;
  if (!confirm(`Supprimer « ${s.name} » et ses ${n} séance(s) ?`)) return;
  if (n && !confirm('Dernière confirmation : ces séances seront perdues (pensez à une sauvegarde JSON).')) return;
  db.sessions = db.sessions.filter(x => x.school !== s.id); db.schools = db.schools.filter(x => x.id !== s.id);
  db.off = db.off.filter(x => x.school !== s.id); Object.keys(db.pay).forEach(k => { if (k.startsWith(s.id + '|')) delete db.pay[k]; });
  db.current = db.schools[0].id; save(); render(); toast('École supprimée');
}

function backup() {
  return `<h4 class="mb-3">Sauvegarde et restauration</h4><div class="row g-3"><div class="col-md-6"><div class="cardx"><h6>Exporter (JSON)</h6><button class="btn btn-tq" onclick="exportJSON()">Télécharger la sauvegarde</button></div></div>
    <div class="col-md-6"><div class="cardx"><h6>Restaurer (fusion)</h6><input type="file" class="form-control mb-2" onchange="importJSON(this.files[0]);this.value=''"><small class="text-muted">Les dates déjà existantes ne sont jamais écrasées ; seules les nouvelles séances sont ajoutées.</small></div></div>
    <div class="col-12"><div class="cardx"><h6><i class="fa-brands fa-github"></i> Sauvegarde GitHub</h6><div class="row g-2">
    <div class="col-md-3"><input id="gho" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" class="form-control" placeholder="Utilisateur GitHub" value="${esc(gh.owner)}" onchange="ghCfg()"></div>
    <div class="col-md-3"><input id="ghr" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" class="form-control" placeholder="Dépôt (privé)" value="${esc(gh.repo)}" onchange="ghCfg()"></div>
    <div class="col-md-3"><input id="ghp" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" class="form-control" placeholder="Dossier (sauvegardes)" value="${esc(gh.path)}" onchange="ghCfg()"></div>
    <div class="col-md-3"><input id="ght" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" type="password" class="form-control" placeholder="Jeton d'accès" value="${esc(gh.token)}" onchange="ghCfg()"></div>
    <div class="col-12 d-flex gap-2 flex-wrap align-items-center"><button class="btn btn-tq" onclick="ghCfg();ghPush()">Envoyer vers GitHub</button><button class="btn btn-gold" onclick="ghCfg();ghPull()">Restaurer depuis GitHub</button>
    <label class="ms-2"><input type="checkbox" id="gha" ${gh.auto ? 'checked' : ''} onchange="ghCfg()"> Envoi automatique (1 fichier par jour)</label></div>
    <div class="col-12"><hr class="my-1"><label class="fw-semibold"><input type="checkbox" id="ghs" ${gh.sync ? 'checked' : ''} onchange="ghCfg()"> Synchronisation automatique entre appareils</label>
    <button class="btn btn-sm btn-tq ms-2" onclick="ghCfg();syncNow()">Synchroniser maintenant</button> <small class="text-muted ms-2" id="syncInfo">${syncInfo()}</small>
    <small class="text-muted d-block mt-1">Sur chaque téléphone : mêmes identifiants GitHub puis cochez cette case. Les modifications faites hors ligne sont envoyées dès le retour d'internet. Si deux appareils modifient la même chose, la dernière modification est conservée.</small></div>
    <div class="col-12 d-flex gap-2 flex-wrap align-items-center"><small class="text-muted">Supprimer les sauvegardes de plus de :</small>
    <button class="btn btn-sm btn-outline-danger" onclick="ghClean(30)">30 jours</button><button class="btn btn-sm btn-outline-danger" onclick="ghClean(60)">60 jours</button><button class="btn btn-sm btn-outline-danger" onclick="ghClean(90)">90 jours</button></div></div>
    <small class="text-muted d-block mt-2">Chaque envoi crée un nouveau fichier daté ; les anciennes sauvegardes ne sont jamais écrasées. Utilisez un dépôt <b>privé</b> et un jeton à portée limitée à ce dépôt (Contents : lecture/écriture). Le jeton reste sur cet appareil et n'est jamais inclus dans la sauvegarde.</small></div></div>
    <div class="col-12"><div class="cardx"><h6 class="text-danger">Zone dangereuse</h6><button class="btn btn-outline-danger" onclick="wipe()">Effacer toutes les données</button></div></div></div>`;
}
/* Enregistre un fichier : feuille de partage sur iPhone/iPad (le téléchargement direct n'y marche pas), téléchargement classique ailleurs */
async function saveBlob(blob, name) {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  try {
    const file = new File([blob], name, { type: blob.type });
    if (ios && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportJSON() {
  const d = new Date();
  saveBlob(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), `sauvegarde-heures-${iso(d.getFullYear(), d.getMonth(), d.getDate())}.json`);
}
function mergeData(d) {
  d = migrate(d); if (!d) throw new Error('Fichier de sauvegarde invalide');
  if (!d.sessions.length && !d.off.length && !Object.keys(d.pay).length) return toast('Cette sauvegarde est vide (0 séance) : choisissez un autre fichier', 7000);
  let add = 0, same = 0, bad = 0; const diff = [];
  const s0 = db.schools[0]; // appareil neuf : on remplace l'école vide par défaut par celles de la sauvegarde
  if (!db.sessions.length && db.schools.length === 1 && s0.name === 'Mon École' && !s0.notes && !Object.keys(s0.sched || {}).length) { db.schools = []; db.current = d.current; }
  d.schools.forEach(s => { if (!db.schools.some(x => x.id === s.id)) db.schools.push({ id: String(s.id), name: String(s.name || 'École'), rate: +s.rate || 0, notes: String(s.notes || ''), sched: s.sched || {} }); });
  d.sessions.forEach(s => {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.hours > 0 && s.hours <= 24 && s.rate >= 0 && db.schools.some(x => x.id === s.school);
    if (!ok) return bad++;
    const cur = db.sessions.find(x => x.school === s.school && x.date === s.date);
    if (!cur) { db.sessions.push({ school: s.school, date: s.date, hours: +s.hours, rate: +s.rate, notes: String(s.notes || '') }); return add++; }
    if (cur.hours === +s.hours && cur.rate === +s.rate) same++; else diff.push([cur, s]); // jamais d'écrasement silencieux
  });
  let upd = 0;
  if (diff.length && confirm(`${diff.length} séance(s) existent déjà avec des valeurs différentes (heures ou taux).\nLes remplacer par celles de la sauvegarde ?`)) {
    diff.forEach(([c, s]) => { c.hours = +s.hours; c.rate = +s.rate; c.notes = String(s.notes || ''); }); upd = diff.length;
  }
  (d.off || []).forEach(o => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(o.date) && ['ferie', 'absent'].includes(o.type) && db.schools.some(x => x.id === o.school) &&
        !db.off.some(x => x.school === o.school && x.date === o.date) && !db.sessions.some(x => x.school === o.school && x.date === o.date)) db.off.push({ school: o.school, date: o.date, type: o.type });
  });
  Object.entries(d.pay || {}).forEach(([k, p]) => { if (!db.pay[k] && p && p.paid) db.pay[k] = { paid: true, date: String(p.date || ''), amount: +p.amount || 0 }; });
  if (!db.schools.some(s => s.id === db.current)) db.current = db.schools[0].id;
  if (!mine().length) { const s = db.schools.find(x => db.sessions.some(y => y.school === x.id)); if (s) db.current = s.id; } // affiche l'école qui contient des données
  save(); render();
  toast(`${add} ajoutée(s), ${upd} remplacée(s), ${same} déjà présente(s) à l'identique, ${diff.length - upd} conservée(s), ${bad} invalide(s)`, 8000);
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
  const was = gh.sync;
  gh = { ...gh, owner: $('#gho').value.trim(), repo: $('#ghr').value.trim(), path: $('#ghp').value.trim() || 'sauvegardes', token: $('#ght').value.replace(/\s+/g, ''), auto: $('#gha').checked, sync: $('#ghs') ? $('#ghs').checked : gh.sync };
  localStorage.setItem(GHK, JSON.stringify(gh));
  if (gh.sync && !was) syncNow(); else if (!gh.sync) setSync('idle');
}
async function ghApi(method, body, sub = '') {
  if (!gh.owner || !gh.repo || !gh.token) throw new Error('configuration incomplète');
  const folder = gh.path && !gh.path.endsWith('.json') ? gh.path : 'sauvegardes';
  const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${folder}${sub}`, {
    method, cache: 'no-store', headers: { Authorization: 'Bearer ' + gh.token, Accept: 'application/vnd.github+json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 404 && method === 'GET') return null;
  if (!r.ok) { const e = new Error(r.status === 401 || r.status === 403 ? 'jeton refusé (' + r.status + ')' : 'erreur ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
/* Chaque envoi manuel crée un NOUVEAU fichier daté : les anciennes sauvegardes restent intactes.
   L'envoi automatique crée au plus un fichier par jour (mis à jour dans la journée). */
async function ghPush(silent) {
  try {
    if (!db.sessions.length) { if (silent || !confirm('Aucune séance sur cet appareil : la sauvegarde sera vide et pourrait apparaître comme la plus récente. Continuer ?')) return; }
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
    const files = (Array.isArray(list) ? list : []).filter(f => f.name.endsWith('.json')).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 10);
    if (!files.length) return toast('Aucune sauvegarde trouvée sur GitHub');
    const n = parseInt(prompt('Quelle sauvegarde restaurer ? (numéro)\n(une taille proche de 0 Ko = sauvegarde vide)\n' + files.map((f, i) => `${i + 1}. ${f.name} — ${(f.size / 1024).toFixed(1)} Ko`).join('\n'), '1'));
    if (!(n >= 1 && n <= files.length)) return;
    const cur = await ghApi('GET', null, '/' + files[n - 1].name);
    mergeData(JSON.parse(decodeURIComponent(escape(atob(cur.content.replace(/\n/g, ''))))));
    gh.synced = true; localStorage.setItem(GHK, JSON.stringify(gh));
  } catch (e) { toast('Échec GitHub : ' + e.message); }
}
function wipe() { if (confirm('Supprimer définitivement toutes les données ?') && confirm('Dernière confirmation : action irréversible.')) { localStorage.removeItem(KEY); db = load(); resetMeta(); render(); } }

/* Supprime sur GitHub les sauvegardes plus vieilles que N jours (la plus récente est toujours conservée) */
async function ghClean(days) {
  let n = 0;
  try {
    ghCfg();
    const list = await ghApi('GET');
    const files = (Array.isArray(list) ? list : []).filter(f => /^sauvegarde-\d{4}-\d{2}-\d{2}.*\.json$/.test(f.name)).sort((a, b) => b.name.localeCompare(a.name));
    if (!files.length) return toast('Aucune sauvegarde sur GitHub');
    const limit = new Date(); limit.setHours(0, 0, 0, 0); limit.setDate(limit.getDate() - days);
    const old = files.slice(1).filter(f => new Date(f.name.slice(11, 21) + 'T00:00:00') < limit);
    if (!old.length) return toast(`Aucune sauvegarde de plus de ${days} jours à supprimer`);
    if (!confirm(`Supprimer ${old.length} sauvegarde(s) de plus de ${days} jours sur GitHub ?\n(La plus récente est toujours conservée.)\n\nLes plus anciennes :\n` + old.slice(-5).map(f => f.name).join('\n'))) return;
    for (const f of old) { await ghApi('DELETE', { message: 'Suppression ' + f.name, sha: f.sha }, '/' + f.name); n++; } // un par un (l'API GitHub n'aime pas les suppressions simultanées)
    toast(`${n} sauvegarde(s) supprimée(s)`, 5000);
  } catch (e) { toast(`Échec GitHub après ${n} suppression(s) : ${e.message}`, 6000); }
}

/* ---------- Jours fériés / absences, emploi du temps, paiements ---------- */
const offOf = date => db.off.find(o => o.school === db.current && o.date === date);
const wdi = date => new Date(date + 'T00:00:00').getDay();
const planOf = date => +(sch().sched || {})[wdi(date)] || 0; // heures prévues par l'emploi du temps
function setOff(date, type) { // type vide = retirer le statut
  db.off = db.off.filter(o => !(o.school === db.current && o.date === date));
  if (type) { db.sessions = db.sessions.filter(s => !(s.school === db.current && s.date === date)); db.off.push({ school: db.current, date, type }); }
  save(); render();
}
function fillMonth() { // remplit uniquement les jours vides, sans écraser ni toucher aux fériés/absences
  if (!Object.values(sch().sched || {}).some(h => h > 0)) return toast("Définissez d'abord l'emploi du temps (Paramètres)");
  let n = 0;
  for (let d = 1; d <= dim(Y, M); d++) {
    const dt = iso(Y, M, d), h = planOf(dt);
    if (h > 0 && !offOf(dt) && !mine().some(s => s.date === dt)) { db.sessions.push({ school: db.current, date: dt, hours: h, rate: sch().rate, notes: '' }); n++; }
  }
  save(); render(); toast(n + ' jour(s) rempli(s)');
}
const askToday = dt => { const h = parseFloat(prompt("Nombre d'heures :")); if (h > 0) setSession(dt, h); };
function clearDay(dt) { setOff(dt, ''); setSession(dt, 0); }
function todayCard() {
  const dt = iso(now.getFullYear(), now.getMonth(), now.getDate()), cs = mine().find(s => s.date === dt), o = offOf(dt), plan = planOf(dt);
  const st = o ? (o.type === 'ferie' ? 'Férié' : 'Absent') : cs ? fmtH(cs.hours) + ' h — ' + fmt(inc(cs)) + ' DH' : 'Non renseigné';
  const b = h => `<button class="btn btn-sm btn-tq" onclick="setSession('${dt}',${h})">${h} h</button>`;
  return `<div class="cardx mb-3"><div class="d-flex flex-wrap align-items-center gap-2"><div class="me-auto"><small class="text-muted">Aujourd'hui · ${wd(dt)} ${now.getDate()} ${MOIS[now.getMonth()]}</small><div class="fw-semibold">${st}</div></div>
    ${plan ? `<button class="btn btn-sm btn-gold" onclick="setSession('${dt}',${plan})">Emploi du temps (${fmtH(plan)} h)</button>` : ''}${b(2)}${b(4)}
    <button class="btn btn-sm btn-outline-secondary" onclick="askToday('${dt}')">Autre</button>
    <button class="btn btn-sm btn-outline-secondary" onclick="setOff('${dt}','absent')">Absent</button><button class="btn btn-sm btn-outline-secondary" onclick="setOff('${dt}','ferie')">Férié</button>
    ${cs || o ? `<button class="btn btn-sm btn-outline-danger" onclick="clearDay('${dt}')"><i class="fa-solid fa-xmark"></i></button>` : ''}</div></div>`;
}
const payKey = (y, m) => `${db.current}|${y}-${pad(m + 1)}`;
const paidOf = (y, m) => { const p = db.pay[payKey(y, m)]; return p && p.paid ? +p.amount : 0; };
const due = y => monthTotals(y).reduce((a, t, m) => a + Math.max(0, t.i - paidOf(y, m)), 0); // reste à encaisser
function setPay(on) {
  const k = payKey(Y, M);
  if (!on) { delete db.pay[k]; save(); return render(); }
  const t = sum(byMonth(Y, M)), amount = parseFloat(prompt('Montant reçu (DH) :', t.i));
  if (!(amount >= 0)) return;
  const date = prompt('Date de réception (AAAA-MM-JJ) :', iso(now.getFullYear(), now.getMonth(), now.getDate()));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return toast('Date invalide');
  db.pay[k] = { paid: true, date, amount }; save(); render(); toast('Paiement enregistré');
}

/* ---------- Synchronisation entre appareils (fichier partagé sur GitHub) ----------
   Vos données ne changent pas de forme : chaque élément (école, séance, jour férié/absence, paiement) est repéré par sa clé
   (ex. école + date) et reçoit une date de dernière modification, gardée à part (suiviHeuresSyncMeta).
   Fusion : pour chaque élément, la modification la plus récente gagne ; les suppressions sont propagées.
   Hors ligne : tout reste sur l'appareil et part au retour d'internet. */
const SYNC_FILE = '/sync/data.json', SMK = 'suiviHeuresSyncMeta';
let smeta = null, syncTimer, syncBusy = false, syncAgain = false, syncState = 'idle', pendingRender = false, lastTry = 0, syncLast = +localStorage.getItem('suiviHeuresLastSync') || 0;
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec = c => JSON.parse(decodeURIComponent(escape(atob(c.replace(/\n/g, '')))));
const saveMeta = () => { try { localStorage.setItem(SMK, JSON.stringify(smeta)); } catch (e) {} };
const stableSched = o => Object.keys(o || {}).sort().map(k => [k, +o[k]]);
function records() { // tout ce qui se synchronise, sous forme clé -> valeur
  const m = new Map(), add = (k, v) => m.set(k, { v, sig: JSON.stringify(v) });
  db.schools.forEach(x => add('C|' + x.id, { id: x.id, name: x.name, rate: +x.rate || 0, notes: x.notes || '', sched: stableSched(x.sched) }));
  db.sessions.forEach(x => add('S|' + x.school + '|' + x.date, { school: x.school, date: x.date, hours: +x.hours, rate: +x.rate, notes: x.notes || '' }));
  db.off.forEach(x => add('O|' + x.school + '|' + x.date, { school: x.school, date: x.date, type: x.type }));
  Object.entries(db.pay).forEach(([k, x]) => { if (x) add('P|' + k, { paid: !!x.paid, date: x.date || '', amount: +x.amount || 0 }); });
  return m;
}
function initMeta() {
  if (smeta) return;
  try { const m = JSON.parse(localStorage.getItem(SMK)); if (m && m.u && m.sig && m.tomb) { smeta = m; return; } } catch (e) {}
  smeta = { u: {}, sig: {}, tomb: {} }; // état de départ : les données existantes n'ont pas de date (0), la 1re modification leur en donne une
  records().forEach((r, k) => { smeta.sig[k] = r.sig; smeta.u[k] = 0; });
  saveMeta();
}
function resetMeta() { smeta = null; try { localStorage.removeItem(SMK); } catch (e) {} initMeta(); }
function stampChanges() { // compare les données à l'état connu : date les éléments modifiés, note les suppressions
  initMeta();
  const cur = records(), t = Date.now(); let ch = false;
  cur.forEach((r, k) => { if (smeta.sig[k] !== r.sig) { smeta.sig[k] = r.sig; smeta.u[k] = t; delete smeta.tomb[k]; ch = true; } });
  Object.keys(smeta.sig).forEach(k => { if (!cur.has(k)) { delete smeta.sig[k]; delete smeta.u[k]; smeta.tomb[k] = t; ch = true; } });
  if (ch) saveMeta();
  return ch;
}
function snapshot() { const rec = {}; records().forEach((r, k) => { rec[k] = { u: smeta.u[k] || 0, v: r.v }; }); return { v: 2, rec, tomb: { ...smeta.tomb } }; }
const canonS = x => JSON.stringify([Object.keys(x.rec || {}).sort().map(k => [k, +x.rec[k].u || 0, JSON.stringify(x.rec[k].v)]), Object.keys(x.tomb || {}).sort().map(k => [k, x.tomb[k]])]);
function validRemote(k, v) {
  if (!v || typeof v !== 'object') return false;
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (k[0] === 'C') return k === 'C|' + v.id && typeof v.name === 'string';
  if (k[0] === 'S') return date.test(v.date) && k === 'S|' + v.school + '|' + v.date && v.hours > 0 && v.hours <= 24 && v.rate >= 0;
  if (k[0] === 'O') return date.test(v.date) && k === 'O|' + v.school + '|' + v.date && (v.type === 'ferie' || v.type === 'absent');
  if (k[0] === 'P') return /^P\|.+\|\d{4}-\d{2}$/.test(k) && typeof v.paid === 'boolean';
  return false;
}
function mergeSync(r) {
  initMeta();
  const loc = records(), R = {}, tomb = { ...((r && r.tomb) || {}) };
  Object.keys((r && r.rec) || {}).forEach(k => { const e = r.rec[k]; if (e && validRemote(k, e.v)) R[k] = { u: +e.u || 0, v: e.v, sig: JSON.stringify(e.v) }; });
  // appareil neuf : son école par défaut (jamais utilisée) est remplacée par celles du serveur
  const s0 = db.schools[0];
  if (db.schools.length === 1 && !db.sessions.length && !db.off.length && !Object.keys(db.pay).length && s0.name === 'Mon École' && !s0.notes
      && !Object.keys(s0.sched || {}).length && !(smeta.u['C|' + s0.id] > 0) && Object.keys(R).some(k => k[0] === 'C')) loc.delete('C|' + s0.id);
  Object.keys(smeta.tomb).forEach(k => { tomb[k] = Math.max(+tomb[k] || 0, smeta.tomb[k]); });
  const out = new Map();
  new Set([...loc.keys(), ...Object.keys(R)]).forEach(k => {
    const l = loc.get(k), x = R[k], lu = l ? (smeta.u[k] || 0) : 0;
    const w = l && x ? ((lu > x.u || (lu === x.u && l.sig >= x.sig)) ? { u: lu, v: l.v, sig: l.sig } : x) : l ? { u: lu, v: l.v, sig: l.sig } : x;
    if (w && !(k in tomb && tomb[k] >= w.u)) out.set(k, w); // supprimé plus récemment ailleurs : on le retire
  });
  const schoolOf = k => k[0] === 'P' ? k.slice(2, k.lastIndexOf('|')) : out.get(k).v.school;
  [...out.keys()].filter(k => k[0] !== 'C' && !out.has('C|' + schoolOf(k))).forEach(k => out.delete(k)); // éléments d'une école supprimée
  [...out.keys()].filter(k => k[0] === 'S').forEach(k => { // séance et férié/absence le même jour : le plus récent gagne
    const ok = 'O|' + k.slice(2);
    if (out.has(ok)) { if (out.get(ok).u > out.get(k).u) out.delete(k); else out.delete(ok); }
  });
  const yr = Date.now() - 365 * 864e5;
  Object.keys(tomb).forEach(k => { if (out.has(k) || tomb[k] < yr) delete tomb[k]; });
  // application aux données
  const prev = Object.fromEntries(db.schools.map(x => ['C|' + x.id, x]));
  const order = db.schools.map(x => 'C|' + x.id), sk = [...out.keys()].filter(k => k[0] === 'C');
  sk.sort((a, b) => { const ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib) || (a < b ? -1 : 1); });
  db.schools = sk.map(k => { const v = out.get(k).v; return { ...(prev[k] || {}), id: v.id, name: v.name, rate: v.rate, notes: v.notes, sched: Object.fromEntries(v.sched || []) }; });
  const of = t => [...out].filter(([k]) => k[0] === t);
  db.sessions = of('S').map(([, w]) => ({ school: w.v.school, date: w.v.date, hours: w.v.hours, rate: w.v.rate, notes: w.v.notes || '' }));
  db.off = of('O').map(([, w]) => ({ school: w.v.school, date: w.v.date, type: w.v.type }));
  db.pay = {}; of('P').forEach(([k, w]) => { db.pay[k.slice(2)] = { paid: w.v.paid, date: w.v.date, amount: w.v.amount }; });
  if (!db.schools.length) { const id = uid(); db.schools = [{ id, name: 'Mon École', rate: 100, notes: '' }]; }
  if (!db.schools.some(x => x.id === db.current)) db.current = db.schools[0].id;
  smeta = { u: {}, sig: {}, tomb };
  records().forEach((rec, k) => { smeta.sig[k] = rec.sig; smeta.u[k] = out.has(k) ? out.get(k).u : 0; });
  saveMeta();
}
function syncInfo() {
  if (!gh.sync) return 'Désactivée';
  return ({ sync: 'Synchronisation…', pending: 'Modifications en attente…', offline: 'Hors ligne : envoi dès le retour d\'internet', error: 'Échec, nouvel essai automatique' }[syncState])
    || (syncLast ? 'Dernière synchro à ' + hhmm(syncLast) : 'Pas encore synchronisé');
}
function setSync(st) {
  syncState = st;
  const info = $('#syncInfo'); if (info) info.textContent = syncInfo();
  let b = $('#syncBadge');
  if (!gh.sync) { if (b) b.style.display = 'none'; return; }
  if (!b) {
    const bar = $('.topbar'); if (!bar) return;
    b = document.createElement('span'); b.id = 'syncBadge'; b.style.cursor = 'pointer'; b.onclick = () => syncNow();
    bar.insertBefore(b, bar.querySelector('.ms-auto'));
  }
  const m = { sync: ['fa-rotate fa-spin', 'bg-info', 'Synchro…'], pending: ['fa-cloud-arrow-up', 'bg-warning text-dark', 'En attente'], offline: ['fa-cloud-arrow-up', 'bg-warning text-dark', 'Hors ligne'], error: ['fa-triangle-exclamation', 'bg-danger', 'Erreur'] }[st]
    || ['fa-circle-check', 'bg-success', syncLast ? hhmm(syncLast) : 'OK'];
  b.style.display = ''; b.className = 'badge rounded-pill ' + m[1]; b.title = syncInfo();
  b.innerHTML = `<i class="fa-solid ${m[0]}"></i> <span class="d-none d-sm-inline">${m[2]}</span>`;
}
function scheduleSync(delay = 2500) {
  if (!gh.sync || !gh.token) return;
  clearTimeout(syncTimer); setSync(navigator.onLine === false ? 'offline' : 'pending');
  syncTimer = setTimeout(() => syncNow(true), delay);
}
const typing = () => { const a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('#view').contains(a)); };
function softRender() { if (typing()) pendingRender = true; else render(); } // ne coupe pas une saisie en cours
async function syncNow(silent) {
  if (!gh.sync || !gh.owner || !gh.repo || !gh.token) { if (!silent) toast('Cochez la synchronisation et remplissez les identifiants GitHub'); return; }
  if (syncBusy) { syncAgain = true; return; }
  clearTimeout(syncTimer);
  if (navigator.onLine === false) return setSync('offline');
  syncBusy = true; setSync('sync');
  try {
    let done = false, changed = false;
    const view = () => JSON.stringify([db.schools, db.sessions, db.off, db.pay]);
    for (let i = 0; i < 3 && !done; i++) {
      const cur = await ghApi('GET', null, SYNC_FILE);
      let remote = null;
      if (cur) { if (!cur.content) throw new Error('fichier de synchronisation trop volumineux'); remote = dec(cur.content); }
      if (remote) { const before = view(); mergeSync(remote); if (view() !== before) { changed = true; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} } }
      initMeta();
      const snap = snapshot();
      if (remote && canonS(snap) === canonS(remote)) { done = true; break; } // rien à envoyer
      try { await ghApi('PUT', { message: 'sync ' + new Date().toISOString(), content: enc(snap), sha: cur ? cur.sha : undefined }, SYNC_FILE); done = true; }
      catch (e) { if (e.status === 409 || e.status === 422) continue; throw e; } // un autre appareil a écrit entre-temps : on refusionne
    }
    if (!done) throw Object.assign(new Error('conflit, nouvel essai plus tard'), { status: 409 });
    syncLast = Date.now(); localStorage.setItem('suiviHeuresLastSync', syncLast);
    setSync('ok'); if (changed) softRender();
    if (!silent) toast('Synchronisation terminée');
  } catch (e) {
    setSync(e.status ? 'error' : 'offline'); console.warn('Synchro', e);
    if (!silent) toast('Synchronisation : ' + (e.status ? e.message : 'pas de connexion'));
  } finally { syncBusy = false; if (syncAgain) { syncAgain = false; scheduleSync(1000); } }
}
const autoSync = () => { if (gh.sync && Date.now() - lastTry > 10000) { lastTry = Date.now(); syncNow(true); } };

/* ---------- Graphiques ---------- */
function drawCharts() {
  Chart.defaults.color = dark ? '#cbd3ea' : '#22262E'; Chart.defaults.borderColor = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)';
  const t = monthTotals(Y), mk = (id, label, data, color, type) => { const c = $('#' + id); if (c) charts.push(new Chart(c, { type, data: { labels: MOIS.map(m => m.slice(0, 3)), datasets: [{ label, data, backgroundColor: color, borderColor: color, tension: .35, fill: false }] }, options: { plugins: { legend: { position: 'bottom' } } } })); };
  mk('c1', 'Revenu (DH)', t.map(x => x.i), '#0E8FA0', page === 'annual' ? 'line' : 'bar');
  mk('c2', 'Heures', t.map(x => x.h), '#F2A33A', 'bar');
}

/* ---------- Exports ---------- */
const sl = () => sch().name.replace(/[^\w\u00C0-\u017F]+/g, '-'); // nom d'école utilisable dans un nom de fichier
function xlsSave(wb, name) { saveBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name); }
const dash = n => n ? n : '-';
function xlsMonth() {
  const l = byMonth(Y, M), t = sum(l);
  const rows = [['Date', 'Jour', 'Heures', 'Taux (DH)', 'Revenu (DH)', 'Notes'], ...l.map(s => [s.date, wd(s.date), s.hours, s.rate, inc(s), s.notes]), ['Total', '', dash(t.h), '', dash(t.i), '']];
  const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 30 }];
  Object.keys(ws).forEach(k => { if (k[0] !== '!' && typeof ws[k].v === 'number') ws[k].z = '#,##0.00'; });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, MOIS[M]); xlsSave(wb, `rapport-${sl()}-${MOIS[M]}-${Y}.xlsx`);
}
function xlsYear() {
  const t = monthTotals(Y), tot = sum(mine().filter(s => yearOf(s) === Y));
  const ws = XLSX.utils.aoa_to_sheet([['Mois', 'Jours', 'Heures', 'Revenu (DH)'], ...t.map((x, i) => [MOIS[i], dash(x.d), dash(x.h), dash(x.i)]), ['Total', dash(tot.d), dash(tot.h), dash(tot.i)]]);
  const det = XLSX.utils.aoa_to_sheet([['Date', 'Jour', 'Heures', 'Taux', 'Revenu', 'Notes'], ...mine().filter(s => yearOf(s) === Y).sort((a, b) => a.date.localeCompare(b.date)).map(s => [s.date, wd(s.date), s.hours, s.rate, inc(s), s.notes])]);
  ws['!cols'] = det['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Synthèse ' + Y); XLSX.utils.book_append_sheet(wb, det, 'Détails'); xlsSave(wb, `bilan-annuel-${sl()}-${Y}.xlsx`);
}
// Bilan général pour les PDF : ce qui est gagné, déjà encaissé, reste à encaisser, mois payés / non payés
const frDate = d => d.split('-').reverse().join('/');
const money = n => (n ? fmtP(n) : '0,00') + ' DH';
const payInfo = (y, m) => { const p = db.pay[payKey(y, m)]; return p && p.paid ? p : null; };
function paySummary(y) {
  const t = monthTotals(y), act = MOIS.map((_, m) => m).filter(m => t[m].i > 0 || payInfo(y, m));
  const paid = act.filter(m => payInfo(y, m)), unpaid = act.filter(m => !payInfo(y, m));
  return { paid, unpaid, enc: MOIS.reduce((a, _, m) => a + paidOf(y, m), 0), due: due(y) };
}
const listMois = l => l.length ? l.map(m => MOIS[m]).join(', ') : 'Aucun';
function pdfDoc(title, period, head, body, summary) {
  const { jsPDF } = window.jspdf, p = new jsPDF(), navy = () => p.setTextColor(30, 42, 82);
  p.setFontSize(16); navy(); p.text(sch().name, 14, 18);
  p.setFontSize(12); navy(); p.text(`${title} — ${period}`, 14, 27);
  let y = 34;
  if (summary && summary.length) {
    p.setFontSize(11); navy(); p.text('Bilan général', 14, y + 2);
    p.autoTable({ startY: y + 5, body: summary, theme: 'grid', styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62, fillColor: [241, 245, 251] } } });
    y = p.lastAutoTable.finalY + 9;
    p.setFontSize(11); navy(); p.text('Détail', 14, y); y += 3;
  }
  p.autoTable({ startY: y, head: [head], body, headStyles: { fillColor: [30, 42, 82] }, alternateRowStyles: { fillColor: [241, 245, 251] } });
  return { save: name => saveBlob(p.output('blob'), name) };
}
function pdfMonth() {
  const l = byMonth(Y, M), t = sum(l), ps = paySummary(Y), pi = payInfo(Y, M);
  pdfDoc('Rapport mensuel', `${MOIS[M]} ${Y}`, ['Date', 'Jour', 'Heures', 'Taux', 'Revenu (DH)'],
    [...l.map(s => [s.date, wd(s.date), fmtH(s.hours), fmtP(s.rate), fmtP(inc(s))]), ['Total', '', fmtH(t.h), '', fmtP(t.i)]], [
      ['Heures travaillées', t.h ? fmtH(t.h) + ' h' : '-'],
      ['Jours travaillés', t.d || '-'],
      ['Revenu du mois', money(t.i)],
      [`Paiement de ${MOIS[M]}`, pi ? `Payé le ${frDate(pi.date)} — ${money(pi.amount)}` : t.i ? 'Non payé' : '-'],
      ['Reste à encaisser (ce mois)', money(Math.max(0, t.i - paidOf(Y, M)))],
      [`Reste à encaisser (année ${Y})`, money(ps.due)],
      [`Mois payés (${Y})`, listMois(ps.paid)],
      [`Mois non payés (${Y})`, listMois(ps.unpaid)]]).save(`rapport-${sl()}-${MOIS[M]}-${Y}.pdf`);
}
function pdfYear() {
  const t = monthTotals(Y), tot = sum(mine().filter(s => yearOf(s) === Y)), ps = paySummary(Y);
  pdfDoc('Bilan annuel', String(Y), ['Mois', 'Jours', 'Heures', 'Revenu (DH)', 'Paiement'],
    [...t.map((x, i) => { const pi = payInfo(Y, i); return [MOIS[i], x.d || '-', fmtH(x.h), fmtP(x.i), pi ? `Payé le ${frDate(pi.date)}` : x.i ? 'Non payé' : '-']; }),
      ['Total', tot.d || '-', fmtH(tot.h), fmtP(tot.i), `Reste : ${money(ps.due)}`]], [
      ['Revenu annuel', money(tot.i)],
      ['Heures travaillées', tot.h ? fmtH(tot.h) + ' h' : '-'],
      ['Jours travaillés', tot.d || '-'],
      ['Déjà encaissé', money(ps.enc)],
      ['Reste à encaisser', money(ps.due)],
      ['Mois payés', listMois(ps.paid)],
      ['Mois non payés', listMois(ps.unpaid)]]).save(`bilan-annuel-${sl()}-${Y}.pdf`);
}

/* ---------- Thème clair / sombre ---------- */
const THK = 'suiviTheme';
let dark = (localStorage.getItem(THK) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
function applyTheme() {
  document.documentElement.dataset.bsTheme = dark ? 'dark' : 'light';
  $('meta[name=theme-color]').content = dark ? '#0b1020' : '#1E2A52';
  $('#themeBtn').innerHTML = dark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}
$('#themeBtn').onclick = () => { dark = !dark; localStorage.setItem(THK, dark ? 'dark' : 'light'); applyTheme(); render(); };
applyTheme();

/* ---------- Démarrage ---------- */
initMeta(); // état de départ de la synchro (avant toute modification)
render();
document.addEventListener('focusout', () => { if (pendingRender) setTimeout(() => { if (pendingRender && !typing()) { pendingRender = false; render(); } }, 300); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) autoSync(); }); // retour dans l'app
window.addEventListener('online', () => { lastTry = 0; autoSync(); });                          // retour d'internet
setInterval(() => { if (!document.hidden) autoSync(); }, 60000);                               // vérification toutes les minutes
if (gh.sync) { lastTry = Date.now(); syncNow(true); }

/* ---------- PWA : enregistrement du service worker ---------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const had = !!navigator.serviceWorker.controller; // recharge une seule fois quand une nouvelle version prend la main
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !window.__reloaded) { window.__reloaded = true; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(e => console.warn('SW non enregistré', e)));
}
