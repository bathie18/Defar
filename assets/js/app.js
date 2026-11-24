/* DEFAR — Atlas de l'entrepreneuriat jeune
 * Prototype CEGIT pour la DPEP (Ministère de la Jeunesse et des Sports, Sénégal)
 * Front statique : Leaflet + Chart.js. Données simulées (dossier /data).
 */
(() => {
'use strict';

/* ------------------------------------------------------------------ */
/* Référentiels                                                         */
/* ------------------------------------------------------------------ */
const TYPES = {
  espace_jeunes: { lib: 'Espace Jeunes / Maison de la Jeunesse', court: 'Espace Jeunes', c: '#0B5D3B' },
  incubateur:    { lib: 'Incubateur / Accélérateur', court: 'Incubateur', c: '#7C3AED' },
  der:           { lib: 'Guichet DER/FJ', court: 'DER/FJ', c: '#E8A817' },
  adepme:        { lib: 'Antenne ADEPME', court: 'ADEPME', c: '#0E7490' },
  chambre:       { lib: 'Chambre consulaire', court: 'Chambre consulaire', c: '#9A3412' },
  cfp:           { lib: 'Centre de formation professionnelle', court: 'Formation pro.', c: '#2563EB' },
  microfinance:  { lib: 'Microfinance / nano-crédit', court: 'Nano-crédit', c: '#DB2777' },
  apix:          { lib: 'Guichet de formalisation', court: 'Formalisation', c: '#C8102E' },
};
const BESOINS = { orientation: 'Orientation', formation: 'Formation', ideation: 'Idéation', mentorat: 'Mentorat', financement: 'Financement', formalisation: 'Formalisation' };
const SECTEURS = { agriculture: 'Agriculture', numerique: 'Numérique', artisanat: 'Artisanat', sport: 'Sport', economie_verte: 'Économie verte', commerce: 'Commerce', peche: 'Pêche', tourisme: 'Tourisme', elevage: 'Élevage', transformation: 'Transformation', mines: 'Mines', foresterie: 'Foresterie', sel: 'Sel', services: 'Services', tous: 'Tous secteurs' };
const PARCOURS = {
  idee: [
    { t: 'espace_jeunes', titre: 'Être accueilli et orienté', txt: 'Un conseiller vous aide à clarifier votre idée.' },
    { t: 'cfp', titre: 'Acquérir les compétences', txt: 'Formation technique ou en gestion selon votre métier.' },
    { t: 'incubateur', titre: 'Structurer le projet', txt: 'Business model, étude de marché, prototype.' },
  ],
  amorcage: [
    { t: 'incubateur', titre: 'Se faire accompagner', txt: 'Mentorat et plan d\'affaires finalisé.' },
    { t: 'apix', titre: 'Formaliser l\'entreprise', txt: 'NINEA, RCCM, choix du statut juridique.' },
    { t: 'der', titre: 'Financer le démarrage', txt: 'Crédit, subvention ou garantie DER/FJ.' },
  ],
  croissance: [
    { t: 'adepme', titre: 'Diagnostiquer et se mettre à niveau', txt: 'Appui-conseil, accès aux marchés.' },
    { t: 'chambre', titre: 'Rejoindre son réseau professionnel', txt: 'Chambre de commerce ou des métiers.' },
    { t: 'microfinance', titre: 'Financer la croissance', txt: 'Crédit d\'investissement, fonds de roulement.' },
  ],
};
const INDIC = {
  taux:       { lib: "Taux d'atteinte de l'objectif", u: '%', pal: ['#F4F1E6', '#CFE5D6', '#8CC4A2', '#3E9A6B', '#0B5D3B'], dec: 1 },
  formalises: { lib: 'Jeunes entreprises formalisées', u: '', pal: ['#F4F1E6', '#CFE5D6', '#8CC4A2', '#3E9A6B', '#0B5D3B'], dec: 0 },
  densite:    { lib: 'Structures / 10 000 jeunes', u: '', pal: ['#F4F1E6', '#D6E6F2', '#93BEDD', '#4A8CC0', '#1D5A8E'], dec: 2 },
  abandon:    { lib: "Taux d'abandon des porteurs", u: '%', pal: ['#FBF3E4', '#F6D9A8', '#EDAE62', '#D9772F', '#A8431C'], dec: 1 },
  femmes:     { lib: 'Part des femmes entrepreneures', u: '%', pal: ['#F6F0F6', '#E5CFE6', '#C99ACC', '#9F5FA5', '#6E2F7A'], dec: 1 },
};

/* ------------------------------------------------------------------ */
/* Utilitaires                                                          */
/* ------------------------------------------------------------------ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (n, d = 0) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function centroide(geom) {
  // centroïde approché du plus grand anneau (suffisant pour l'orientation)
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = null, bestA = -1;
  polys.forEach(p => {
    const ring = p[0]; let a = 0, x = 0, y = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += f; x += (ring[j][0] + ring[i][0]) * f; y += (ring[j][1] + ring[i][1]) * f;
    }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = [y / (3 * a), x / (3 * a)]; }
  });
  return best;
}
function quantiles(vals, k = 5) {
  const s = [...vals].sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < k; i++) out.push(s[Math.floor(i * s.length / k)]);
  return out;
}
const classe = (v, br) => { let i = 0; while (i < br.length && v >= br[i]) i++; return i; };
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 4500);
}
function baseMap(id) {
  const m = L.map(id, { zoomControl: false, attributionControl: true, minZoom: 6, maxBounds: [[11, -19.5], [17.5, -10.5]] });
  L.control.zoom({ position: 'bottomright' }).addTo(m);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO · Limites : geoBoundaries', subdomains: 'abcd', maxZoom: 18,
  }).addTo(m);
  m.fitBounds([[12.3, -17.6], [16.7, -11.3]]);
  return m;
}

/* ------------------------------------------------------------------ */
/* État                                                                 */
/* ------------------------------------------------------------------ */
const S = {
  deps: null, regs: null, structs: null, serie: null,
  maturite: 'idee', besoins: new Set(), secteur: '', pos: null, posLib: null,
  indic: 'taux', echelle: 'dep', filiere: 'agriculture', selTerr: null,
  mapG: null, mapP: null, layerS: null, layerDepG: null, moi: null, layerP: null, layerPts: null, chart: null,
};

/* ------------------------------------------------------------------ */
/* Navigation                                                           */
/* ------------------------------------------------------------------ */
function allerVue(v) {
  if (!['guichet', 'pilotage', 'partenaires', 'projet'].includes(v)) v = 'guichet';
  $$('.vue').forEach(el => el.classList.toggle('active', el.id === 'vue-' + v));
  $$('[data-vue]').forEach(b => b.classList.toggle('actif', b.dataset.vue === v));
  if (v === 'pilotage') { initPilotage(); setTimeout(() => S.mapP.invalidateSize(), 50); }
  if (v === 'guichet' && S.mapG) setTimeout(() => S.mapG.invalidateSize(), 50);
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
}
$$('[data-vue]').forEach(b => b.addEventListener('click', () => allerVue(b.dataset.vue)));
window.addEventListener('hashchange', () => allerVue(location.hash.slice(1)));

/* ------------------------------------------------------------------ */
/* Chargement                                                           */
/* ------------------------------------------------------------------ */
Promise.all(['departements.geojson', 'regions.geojson', 'structures.geojson', 'serie_nationale.json']
  .map(f => fetch('data/' + f).then(r => r.json())))
  .then(([d, r, s, serie]) => {
    S.deps = d; S.regs = r; S.structs = s; S.serie = serie;
    d.features.forEach(f => { f.properties.c = centroide(f.geometry); });
    r.features.forEach(f => { f.properties.c = centroide(f.geometry); Object.assign(f.properties, agregerRegion(f.properties.nom)); });
    initGuichet();
    initPartenaires();
    allerVue(location.hash.slice(1) || 'guichet');
  })
  .catch(e => {
    console.error(e);
    document.querySelector('main').innerHTML = '<div class="page"><h2>Données indisponibles</h2><p>Ouvrez le prototype via un serveur web (GitHub Pages ou <code>python -m http.server</code>) : les navigateurs bloquent la lecture des fichiers locaux.</p></div>';
  });

function agregerRegion(nom) {
  const ds = S.deps.features.map(f => f.properties).filter(p => p.region === nom);
  const sum = k => ds.reduce((a, p) => a + p[k], 0);
  const pop = sum('pop_jeunes'), w = k => ds.reduce((a, p) => a + p[k] * p.pop_jeunes, 0) / pop;
  const o = { pop_jeunes: pop, structures: sum('structures'), objectif: sum('objectif'), formalises: sum('formalises'), crees: sum('crees'), nb_dep: ds.length };
  o.taux = +(100 * o.formalises / o.objectif).toFixed(1);
  o.densite = +(o.structures / (pop / 1e4)).toFixed(2);
  o.femmes = +w('femmes').toFixed(1); o.abandon = +w('abandon').toFixed(1);
  o.nb_zb = ds.filter(p => p.zone_blanche).length;
  return o;
}

/* ================================================================== */
/* VOLET 1 — GUICHET JEUNES                                             */
/* ================================================================== */
function initGuichet() {
  S.mapG = baseMap('map-guichet');
  S.layerDepG = L.geoJSON(S.deps, { style: { color: '#0B5D3B', weight: .8, opacity: .45, fillColor: '#EDEAE2', fillOpacity: .45 }, interactive: false }).addTo(S.mapG);
  S.layerS = L.layerGroup().addTo(S.mapG);

  // liste des départements
  const sel = $('#ou');
  [...S.deps.features].sort((a, b) => a.properties.nom.localeCompare(b.properties.nom, 'fr'))
    .forEach(f => sel.insertAdjacentHTML('beforeend', `<option value="${esc(f.properties.nom)}">${esc(f.properties.nom)} (${esc(f.properties.region)})</option>`));
  sel.addEventListener('change', () => {
    const f = S.deps.features.find(x => x.properties.nom === sel.value);
    if (!f) { S.pos = null; S.posLib = null; majGuichet(); return; }
    definirPosition(f.properties.c, f.properties.nom, false);
    S.mapG.fitBounds(L.geoJSON(f).getBounds(), { padding: [30, 30] });
  });
  $('#geoloc').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Géolocalisation non disponible : choisissez votre département.');
    navigator.geolocation.getCurrentPosition(p => {
      const ll = [p.coords.latitude, p.coords.longitude];
      if (ll[0] < 12 || ll[0] > 17 || ll[1] < -18 || ll[1] > -11) {
        toast('Vous semblez hors du Sénégal : la démonstration se place à Kolda.');
        const f = S.deps.features.find(x => x.properties.nom === 'Kolda');
        return definirPosition(f.properties.c, 'Kolda (démo)', true);
      }
      definirPosition(ll, 'Ma position', true);
    }, () => toast('Position refusée : choisissez votre département dans la liste.'), { timeout: 8000 });
  });

  $$('#maturite button').forEach(b => b.addEventListener('click', () => {
    $$('#maturite button').forEach(x => x.classList.toggle('on', x === b));
    S.maturite = b.dataset.m; majGuichet();
  }));
  $$('#besoins .chip').forEach(b => b.addEventListener('click', () => {
    b.classList.toggle('on');
    b.classList.contains('on') ? S.besoins.add(b.dataset.b) : S.besoins.delete(b.dataset.b);
    majGuichet();
  }));
  $('#secteur').addEventListener('change', e => { S.secteur = e.target.value; majGuichet(); });

  // légende
  $('#leg-guichet').innerHTML = '<h5>Structures d\'appui</h5>' + Object.values(TYPES).map(t => `<div class="it"><i style="background:${t.c}"></i>${t.court}</div>`).join('');
  majGuichet();
}

function definirPosition(ll, lib, zoom) {
  S.pos = ll; S.posLib = lib;
  if (S.moi) S.moi.remove();
  S.moi = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="moi"></div>', iconSize: [18, 18] }) }).addTo(S.mapG).bindTooltip(lib);
  if (zoom) S.mapG.setView(ll, 10);
  majGuichet();
}

function filtrer() {
  return S.structs.features.filter(f => {
    const p = f.properties;
    if (!p.maturite.includes(S.maturite)) return false;
    if (S.besoins.size && !p.besoins.some(b => S.besoins.has(b))) return false;
    if (S.secteur && !(p.secteurs.includes(S.secteur) || p.secteurs.includes('tous'))) return false;
    return true;
  }).map(f => {
    const ll = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
    return { f, ll, d: S.pos ? km(S.pos, ll) : null };
  }).sort((a, b) => (a.d ?? 0) - (b.d ?? 0) || a.f.properties.nom.localeCompare(b.f.properties.nom, 'fr'));
}

function majGuichet() {
  const res = filtrer();
  S.layerS.clearLayers();
  res.forEach(r => {
    const t = TYPES[r.f.properties.type];
    L.circleMarker(r.ll, { radius: 6.5, color: '#fff', weight: 1.5, fillColor: t.c, fillOpacity: .95 })
      .on('click', () => ouvrirFiche(r.f.properties.id))
      .bindTooltip(esc(r.f.properties.nom), { className: 'dep' })
      .addTo(S.layerS);
  });
  $('#nb-res').textContent = `${res.length} structure${res.length > 1 ? 's' : ''} adaptée${res.length > 1 ? 's' : ''}`;
  $('#tri-res').textContent = S.pos ? `autour de : ${S.posLib}` : 'indiquez votre position pour trier';
  $('#liste-res').innerHTML = res.length ? res.slice(0, 40).map(r => {
    const p = r.f.properties, t = TYPES[p.type];
    return `<div class="res" data-id="${p.id}"><span class="pastille" style="background:${t.c}"></span>
      <div><h4>${esc(p.nom)}</h4><p>${t.court} · ${esc(p.departement)}</p>
      <div class="tags">${p.besoins.map(b => `<span class="tag">${BESOINS[b]}</span>`).join('')}</div></div>
      <span class="dist">${r.d != null ? fmt(r.d, r.d < 10 ? 1 : 0) + ' km' : ''}</span></div>`;
  }).join('') : '<div class="vide">Aucune structure ne correspond à tous ces critères.<br>Essayez d\'élargir votre recherche.</div>';
  $$('#liste-res .res').forEach(el => el.addEventListener('click', () => ouvrirFiche(el.dataset.id, true)));

  // parcours conseillé : chaque étape renvoie vers la structure la plus proche du type
  $('#parcours').innerHTML = PARCOURS[S.maturite].map((e, i) => {
    let cible = '';
    if (S.pos) {
      const best = S.structs.features.filter(f => f.properties.type === e.t)
        .map(f => ({ f, d: km(S.pos, [f.geometry.coordinates[1], f.geometry.coordinates[0]]) }))
        .sort((a, b) => a.d - b.d)[0];
      if (best) cible = ` <a href="#" data-id="${best.f.properties.id}">→ ${esc(best.f.properties.nom)} (${fmt(best.d, 0)} km)</a>`;
    }
    return `<div class="etape"><span class="num">${i + 1}</span><div><b>${e.titre}</b><span>${e.txt}${cible}</span></div></div>`;
  }).join('');
  $$('#parcours a').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); ouvrirFiche(a.dataset.id, true); }));
}

function ouvrirFiche(id, zoom) {
  const f = S.structs.features.find(x => x.properties.id === id); if (!f) return;
  const p = f.properties, t = TYPES[p.type], ll = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
  if (zoom) S.mapG.setView(ll, Math.max(S.mapG.getZoom(), 11));
  $$('#liste-res .res').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  const d = S.pos ? fmt(km(S.pos, ll), 1) + ' km' : '—';
  const fiche = $('#fiche');
  fiche.innerHTML = `<div class="ft"><small style="color:${t.c}">${t.lib}</small><h3>${esc(p.nom)}</h3><p>${esc(p.departement)}, région de ${esc(p.region)}</p>
    <button class="fermer" aria-label="Fermer">×</button></div>
    <dl><dt>Distance</dt><dd>${d}</dd><dt>Horaires</dt><dd>${esc(p.horaires)}</dd><dt>Téléphone</dt><dd>${esc(p.tel)}</dd>
    <dt>Éligibilité</dt><dd>${esc(p.eligibilite)}</dd><dt>Services</dt><dd>${p.besoins.map(b => BESOINS[b]).join(', ')}</dd>
    <dt>Secteurs</dt><dd>${p.secteurs.map(s => SECTEURS[s] || s).join(', ')}</dd><dt>Prochain RDV</dt><dd>sous ${p.delai_rdv} jours</dd></dl>
    <div class="actions"><button class="btn" id="btn-rdv">📅 Prendre rendez-vous</button>
    <a class="btn sec" href="https://www.openstreetmap.org/directions?route=${S.pos ? S.pos.join('%2C') : ''}%3B${ll.join('%2C')}" target="_blank" rel="noopener">🧭 Itinéraire</a></div>`;
  fiche.classList.add('ouverte');
  $('.fermer', fiche).onclick = () => fiche.classList.remove('ouverte');
  $('#btn-rdv').onclick = () => modaleRdv(p);
}

function modaleRdv(p) {
  const m = $('#modale'), b = $('#modale-boite');
  b.classList.remove('doc');
  const j = new Date(Date.now() + p.delai_rdv * 864e5).toISOString().slice(0, 10);
  b.innerHTML = `<button class="fermer" aria-label="Fermer">×</button><h3>Rendez-vous · ${esc(p.nom)}</h3>
    <p class="sub">Votre demande est transmise à la structure, qui confirme par SMS.</p>
    <form id="f-rdv">
      <label>Prénom et nom<input class="champ" required placeholder="Ex. Awa Diallo"></label>
      <label>Téléphone<input class="champ" required type="tel" placeholder="77 000 00 00"></label>
      <label>Date souhaitée<input class="champ" type="date" required min="${j}" value="${j}"></label>
      <label>Votre projet en une phrase<textarea class="champ" rows="2" placeholder="Ex. transformation de mangues séchées à Ziguinchor"></textarea></label>
      <label style="display:flex;gap:8px;align-items:flex-start;font-weight:500"><input type="checkbox" required style="margin-top:4px"> J'accepte que mes données soient utilisées pour mon accompagnement (loi n° 2008-12 sur les données personnelles).</label>
      <button class="btn" type="submit">Envoyer ma demande</button>
    </form>`;
  m.classList.add('ouverte');
  const close = () => m.classList.remove('ouverte');
  $('.fermer', b).onclick = close; m.onclick = e => { if (e.target === m) close(); };
  $('#f-rdv').onsubmit = e => {
    e.preventDefault();
    const code = 'DF-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    b.innerHTML = `<div class="ok"><div class="rond">✓</div><h3>Demande enregistrée</h3>
      <p class="sub">Référence de suivi <code>${code}</code>. La structure vous contactera sous ${p.delai_rdv} jours.<br>Votre parcours est désormais suivi (anonymement) par la DPEP.</p>
      <button class="btn" id="ok-close">Fermer</button></div>`;
    $('#ok-close').onclick = close;
  };
}

/* ================================================================== */
/* VOLET 2 — PILOTAGE                                                   */
/* ================================================================== */
let pilotageInit = false;
function initPilotage() {
  if (pilotageInit) return; pilotageInit = true;
  S.mapP = baseMap('map-pilotage');
  S.layerPts = L.layerGroup().addTo(S.mapP);
  $('#indic').addEventListener('change', e => {
    S.indic = e.target.value;
    $('#filiere').style.display = S.indic === 'opportunites' ? '' : 'none';
    majPilotage();
  });
  $('#filiere').addEventListener('change', e => { S.filiere = e.target.value; majPilotage(); });
  $$('#echelle button').forEach(b => b.addEventListener('click', () => {
    $$('#echelle button').forEach(x => x.classList.toggle('on', x === b));
    S.echelle = b.dataset.e; S.selTerr = null; majPilotage();
  }));
  kpisNationaux();
  graphique();
  zonesBlanches();
  majPilotage();
}

function kpisNationaux() {
  const D = S.deps.features.map(f => f.properties);
  const form = D.reduce((a, p) => a + p.formalises, 0), crees = D.reduce((a, p) => a + p.crees, 0);
  const pop = D.reduce((a, p) => a + p.pop_jeunes, 0);
  const fem = D.reduce((a, p) => a + p.femmes * p.pop_jeunes, 0) / pop;
  const ab = D.reduce((a, p) => a + p.abandon * p.pop_jeunes, 0) / pop;
  const i = S.serie.mois.length - 1, cible = S.serie.trajectoire_cible[i];
  $('#obj-val').innerHTML = `${fmt(form)} <span>/ 100 000</span>`;
  $('#obj-jauge').style.width = form / 1000 + '%';
  $('#obj-cible').style.left = cible / 1000 + '%';
  $('#obj-pct').textContent = `${fmt(form / 1000, 1)} % de l'objectif`;
  const ecart = form - cible;
  $('#obj-ecart').textContent = `${ecart >= 0 ? '+' : ''}${fmt(ecart)} vs trajectoire (repère blanc)`;
  const moisRest = 14; // nov. 2026 → déc. 2027
  const rythme = Math.ceil((100000 - form) / moisRest);
  $('#kpis').innerHTML = [
    [fmt(crees), 'entreprises créées par des jeunes'],
    [fmt(S.structs.features.length), "structures d'appui référencées"],
    [fmt(rythme) + '/mois', 'rythme requis pour 2027', true],
    [fmt(D.filter(p => p.zone_blanche).length), 'départements en zone blanche', true],
    [fmt(fem, 1) + ' %', 'de femmes parmi les formalisées'],
    [fmt(ab, 1) + ' %', "taux d'abandon des porteurs"],
  ].map(([v, l, a]) => `<div class="kpi${a ? ' alerte' : ''}"><b>${v}</b><span>${l}</span></div>`).join('');
}

function graphique() {
  const s = S.serie, lab = s.mois.map(m => { const [y, mo] = m.split('-'); return ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'][+mo - 1] + ' ' + y.slice(2); });
  S.chart = new Chart($('#graph-traj'), {
    data: {
      labels: lab,
      datasets: [
        { type: 'line', label: 'Formalisations cumulées', data: s.cumul, borderColor: '#0B5D3B', backgroundColor: 'rgba(11,93,59,.08)', fill: true, tension: .3, pointRadius: 0, borderWidth: 2.5 },
        { type: 'line', label: 'Trajectoire cible 2027', data: s.trajectoire_cible, borderColor: '#E8A817', borderDash: [6, 4], pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11.5 } } },
        tooltip: { callbacks: { label: c => `${c.dataset.label} : ${fmt(c.parsed.y)}` } } },
      scales: { y: { ticks: { callback: v => fmt(v / 1000) + ' k', font: { size: 11 } }, grid: { color: '#eee' } },
        x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } } },
    },
  });
}

function zonesBlanches() {
  const zb = S.deps.features.map(f => f.properties).filter(p => p.zone_blanche)
    .sort((a, b) => a.densite - b.densite).slice(0, 8);
  $('#liste-zb').innerHTML = zb.map(p => `<div class="zb" data-n="${esc(p.nom)}"><span class="ico">!</span><div><b>${esc(p.nom)}</b> <small>${esc(p.region)} · ${fmt(p.pop_jeunes)} jeunes · ${p.structures} structure${p.structures > 1 ? 's' : ''} (${fmt(p.densite, 2)} / 10 000)</small></div></div>`).join('')
    + '<div class="reco"><b>Recommandation :</b> déployer des unités mobiles d\'accompagnement et conventionner les Espaces Jeunes existants comme points relais des partenaires (DER/FJ, ADEPME, APIX).</div>';
  $$('#liste-zb .zb').forEach(el => el.addEventListener('click', () => {
    if (S.echelle !== 'dep') $('#echelle [data-e="dep"]').click();
    selectionner(el.dataset.n, true);
  }));
}

function collection() { return S.echelle === 'dep' ? S.deps : S.regs; }

function majPilotage() {
  if (S.layerP) S.layerP.remove();
  S.layerPts.clearLayers();
  const coll = collection(), mode = S.indic;
  let style, leg;

  if (mode === 'zones') {
    const isZ = p => S.echelle === 'dep' ? p.zone_blanche : p.nb_zb > 0;
    style = f => ({ color: '#fff', weight: 1, fillOpacity: .85, fillColor: isZ(f.properties) ? (S.echelle === 'dep' ? '#C8102E' : ['#F6D5D9', '#EE9BA6', '#DD5566', '#C8102E'][Math.min(3, f.properties.nb_zb)]) : '#DDE6E0' });
    leg = `<h5>Zones blanches d'accompagnement</h5><div class="it"><i class="carre" style="background:#C8102E"></i>${S.echelle === 'dep' ? 'Département sous-doté' : 'Région comptant des départements sous-dotés'}</div><div class="it"><i class="carre" style="background:#DDE6E0"></i>Couverture satisfaisante</div><div class="it"><i style="background:#0B5D3B"></i>Structure d'appui</div><p style="color:var(--gris);margin-top:6px">Critère : moins de 0,35 structure pour 10 000 jeunes ou accessibilité insuffisante.</p>`;
    S.structs.features.forEach(f => L.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], { radius: 3, weight: 0, fillColor: '#0B5D3B', fillOpacity: .8, interactive: false }).addTo(S.layerPts));
    $('#class-lib').textContent = 'densité de structures (les plus faibles)';
    classement(coll, 'densite', true, INDIC.densite);
  } else if (mode === 'opportunites') {
    const fil = S.filiere;
    style = f => ({ color: '#fff', weight: 1, fillOpacity: .8, fillColor: (f.properties.bassins || []).includes(fil) ? ((f.properties.bassins[0] === fil) ? '#0B5D3B' : '#8CC4A2') : '#EEECE6' });
    leg = `<h5>Bassins d'activité · ${SECTEURS[fil]}</h5><div class="it"><i class="carre" style="background:#0B5D3B"></i>Filière dominante</div><div class="it"><i class="carre" style="background:#8CC4A2"></i>Filière présente</div><div class="it"><i style="background:#E8A817"></i>Structure accompagnant la filière</div><p style="color:var(--gris);margin-top:6px">Objectif : connecter les projets des jeunes aux chaînes de valeur régionales.</p>`;
    S.structs.features.filter(f => f.properties.secteurs.includes(fil)).forEach(f => L.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], { radius: 5, color: '#fff', weight: 1, fillColor: '#E8A817', fillOpacity: 1 }).bindTooltip(esc(f.properties.nom), { className: 'dep' }).addTo(S.layerPts));
    $('#class-lib').textContent = 'taux d\'atteinte (territoires de la filière)';
    classement({ features: coll.features.filter(f => (f.properties.bassins || []).includes(fil)) }, 'taux', false, INDIC.taux);
  } else {
    const I = INDIC[mode], vals = coll.features.map(f => f.properties[mode]), br = quantiles(vals);
    style = f => ({ color: '#fff', weight: 1, fillOpacity: .88, fillColor: I.pal[classe(f.properties[mode], br)] });
    const lim = [Math.min(...vals), ...br, Math.max(...vals)];
    leg = `<h5>${I.lib}${I.u ? ' (' + I.u + ')' : ''}</h5><div class="ramp">${I.pal.map(c => `<span style="background:${c}"></span>`).join('')}</div><div class="ramp-lab"><span>${fmt(lim[0], I.dec)}</span><span>${fmt(lim[2], I.dec)}</span><span>${fmt(lim[5], I.dec)}</span></div><p style="color:var(--gris);margin-top:6px">Discrétisation par quantiles · ${S.echelle === 'dep' ? 'départements' : 'régions'}</p>`;
    $('#class-lib').textContent = I.lib.toLowerCase();
    classement(coll, mode, false, I);
  }

  S.layerP = L.geoJSON(coll, {
    style,
    onEachFeature: (f, l) => {
      const p = f.properties;
      const v = INDIC[mode] ? `${fmt(p[mode], INDIC[mode].dec)} ${INDIC[mode].u}` : '';
      l.bindTooltip(`<b>${esc(p.nom)}</b>${v ? '<br>' + v : ''}`, { className: 'dep', sticky: true });
      l.on('click', () => selectionner(p.nom));
      l.on('mouseover', () => l.setStyle({ weight: 2.5, color: '#16201B' }));
      l.on('mouseout', () => S.layerP.resetStyle(l) && surligner());
    },
  }).addTo(S.mapP);
  S.layerPts.bringToFront && S.layerPts.eachLayer(l => l.bringToFront());
  $('#leg-pilotage').innerHTML = leg;
  surligner();
  if (S.selTerr) ficheTerritoire(S.selTerr);
}

function surligner() {
  if (!S.layerP) return;
  S.layerP.eachLayer(l => { if (l.feature.properties.nom === S.selTerr) { l.setStyle({ weight: 3, color: '#E8A817' }); l.bringToFront(); } });
  S.layerPts.eachLayer(l => l.bringToFront());
}

function classement(coll, k, asc, I) {
  const arr = coll.features.map(f => f.properties).sort((a, b) => asc ? a[k] - b[k] : b[k] - a[k]);
  const max = Math.max(...arr.map(p => p[k]), 1);
  $('#class-corps').innerHTML = arr.slice(0, 15).map((p, i) => `<tr data-n="${esc(p.nom)}"><td>${i + 1}</td><td>${esc(p.nom)}${p.region && S.echelle === 'dep' ? ` <span style="color:var(--gris);font-size:12px">${esc(p.region)}</span>` : ''}</td>
    <td class="n">${fmt(p[k], I.dec)}${I.u ? ' ' + I.u : ''}<span class="minibar"><i style="width:${100 * p[k] / max}%"></i></span></td></tr>`).join('');
  $$('#class-corps tr').forEach(tr => tr.addEventListener('click', () => selectionner(tr.dataset.n, true)));
}

function selectionner(nom, zoom) {
  S.selTerr = nom;
  if (S.layerP) { S.layerP.eachLayer(l => S.layerP.resetStyle(l)); surligner(); }
  if (zoom) {
    const f = collection().features.find(x => x.properties.nom === nom);
    if (f) S.mapP.fitBounds(L.geoJSON(f).getBounds(), { padding: [60, 60], maxZoom: 9 });
  }
  ficheTerritoire(nom);
  $('#territoire').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ficheTerritoire(nom) {
  const f = collection().features.find(x => x.properties.nom === nom); if (!f) return;
  const p = f.properties, dep = S.echelle === 'dep';
  const structs = S.structs.features.filter(s => dep ? s.properties.departement === nom : s.properties.region === nom);
  const parType = Object.keys(TYPES).map(t => [t, structs.filter(s => s.properties.type === t).length]).filter(x => x[1]);
  const manque = Object.keys(TYPES).filter(t => !parType.find(x => x[0] === t));
  const zb = dep ? p.zone_blanche : p.nb_zb > 0;
  const reste = Math.max(0, p.objectif - p.formalises);
  let reco;
  if (zb) reco = `Territoire sous-doté : prioriser une <b>unité mobile</b> et un partenariat avec ${manque.slice(0, 2).map(t => TYPES[t].court).join(' et ') || 'les partenaires régionaux'}.`;
  else if (p.taux < 40) reco = `Offre présente mais performance faible : renforcer le <b>suivi post-orientation</b> et les ateliers de formalisation (taux d'abandon : ${fmt(p.abandon, 1)} %).`;
  else reco = `Territoire en bonne voie : capitaliser et <b>essaimer les bonnes pratiques</b> vers les départements voisins.`;
  $('#territoire').innerHTML = `<h3>Fiche territoire <small>${dep ? 'département' : 'région'}</small></h3>
    <h4>${esc(nom)} ${zb ? '<span class="badge rouge">Zone blanche</span>' : p.taux >= 45 ? '<span class="badge vert">En avance</span>' : ''}</h4>
    <p class="sub">${dep ? 'Région de ' + esc(p.region) : p.nb_dep + ' départements'} · ${fmt(p.pop_jeunes)} jeunes de 15 à 35 ans (est.)</p>
    <div class="kpis">
      <div class="kpi"><b>${fmt(p.formalises)}</b><span>formalisées / objectif ${fmt(p.objectif)}</span></div>
      <div class="kpi"><b>${fmt(p.taux, 1)} %</b><span>taux d'atteinte · reste ${fmt(reste)}</span></div>
      <div class="kpi"><b>${p.structures}</b><span>structures (${fmt(p.densite, 2)} / 10 000 jeunes)</span></div>
      <div class="kpi"><b>${fmt(p.femmes, 1)} %</b><span>de femmes entrepreneures</span></div>
    </div>
    <div class="label">Offre d'accompagnement</div>
    <div class="tags">${parType.map(([t, n]) => `<span class="tag" style="border-left:3px solid ${TYPES[t].c}">${TYPES[t].court} · ${n}</span>`).join('')}</div>
    ${manque.length ? `<div class="label">Absents du territoire</div><div class="tags">${manque.map(t => `<span class="tag">${TYPES[t].court}</span>`).join('')}</div>` : ''}
    <div class="label">Filières porteuses</div><div class="tags">${(p.bassins || []).map(b => `<span class="tag">${SECTEURS[b] || b}</span>`).join('')}</div>
    <div class="reco"><b>Piste d'action :</b> ${reco}</div>`;
}

/* ================================================================== */
/* VOLET 3 — PARTENAIRES                                                */
/* ================================================================== */
function initPartenaires() {
  const D = S.deps.features.map(f => f.properties);
  const nbPart = S.structs.features.length;
  $('#kpis-part').innerHTML = [
    [fmt(nbPart), 'structures référencées'], ['8', 'familles de dispositifs'],
    ['14', 'régions couvertes'], [fmt(D.filter(p => p.zone_blanche).length), 'territoires à équiper'],
  ].map(([v, l]) => `<div class="kpi" style="background:#fff;border:1px solid var(--ligne)"><b>${v}</b><span>${l}</span></div>`).join('');

  const DESC = {
    espace_jeunes: ['Ministère de la Jeunesse', 'Premier accueil, information et orientation de proximité, relais naturel des autres partenaires.'],
    incubateur: ['Privé / associatif', 'Idéation, incubation, mentorat ; passerelle avec la plateforme « Écosystème startup ».'],
    der: ['Financement public', 'Délégation générale à l\'Entrepreneuriat rapide des Femmes et des Jeunes : crédits et garanties.'],
    adepme: ['Appui aux PME', 'Diagnostic, mise à niveau, accès aux marchés pour les jeunes entreprises en croissance.'],
    chambre: ['Chambres consulaires', 'Chambres de commerce, d\'industrie et d\'agriculture, chambres des métiers : immatriculation, réseau.'],
    cfp: ['Formation', 'Centres de formation professionnelle et technique, financement 3FPT, ONFP.'],
    microfinance: ['Finance de proximité', 'Institutions de microfinance et points de nano-crédit pour l\'amorçage.'],
    apix: ['Formalisation', 'Guichets de création d\'entreprise (APIX, BCE régionaux) : NINEA, RCCM, statuts.'],
  };
  $('#familles').innerHTML = Object.entries(TYPES).map(([k, t]) => {
    const n = S.structs.features.filter(f => f.properties.type === k).length;
    return `<div class="carte-p" style="border-top:4px solid ${t.c}"><div class="role">${DESC[k][0]}</div><h4>${t.lib}</h4><p>${DESC[k][1]}</p><p style="margin-top:8px;font-weight:700;color:var(--encre)">${n} points sur la carte</p></div>`;
  }).join('');

  // score de levier : jeunes non couverts × retard
  const besoins = D.map(p => ({ ...p, score: (p.pop_jeunes / (p.structures + 1)) * (1 - p.taux / 100) }))
    .sort((a, b) => b.score - a.score).slice(0, 6);
  $('#besoins-terr').innerHTML = besoins.map((p, i) => `<div class="besoin">
    <div class="t"><h4>${i + 1}. ${esc(p.nom)}</h4><span class="badge ${p.zone_blanche ? 'rouge' : 'vert'}">${p.zone_blanche ? 'Zone blanche' : 'À renforcer'}</span></div>
    <p style="color:var(--gris);font-size:13.5px">Région de ${esc(p.region)} · filières : ${(p.bassins || []).map(b => SECTEURS[b]).join(', ')}</p>
    <div class="chiffres"><div><b>${fmt(p.pop_jeunes)}</b><span>jeunes 15-35 ans</span></div><div><b>${fmt(Math.round(p.pop_jeunes / (p.structures || 1)))}</b><span>jeunes / structure</span></div><div><b>${fmt(Math.max(0, p.objectif - p.formalises))}</b><span>formalisations à atteindre</span></div></div>
    <p style="font-size:13.5px"><b>Investissement suggéré :</b> ${p.zone_blanche ? 'antenne ou unité mobile multi-partenaires' : 'ligne de financement dédiée et programme de mentorat'}${(p.bassins || [])[0] ? ', orienté filière ' + SECTEURS[p.bassins[0]].toLowerCase() : ''}.</p>
  </div>`).join('');
}

/* ------------------------------------------------------------------ */
/* Visionneuse des documents Markdown (argumentaire, architecture)      */
/* ------------------------------------------------------------------ */
$$('a[data-doc]').forEach(a => a.addEventListener('click', ev => {
  if (!window.marked) return; // repli : lien direct vers le .md
  ev.preventDefault();
  fetch(a.getAttribute('href')).then(r => r.text()).then(md => {
    const m = $('#modale'), b = $('#modale-boite');
    b.classList.add('doc');
    b.innerHTML = `<button class="fermer" aria-label="Fermer">×</button><div class="md">${marked.parse(md)}</div>`;
    m.classList.add('ouverte');
    const close = () => { m.classList.remove('ouverte'); b.classList.remove('doc'); };
    $('.fermer', b).onclick = close; m.onclick = e => { if (e.target === m) close(); };
  });
}));

})();
