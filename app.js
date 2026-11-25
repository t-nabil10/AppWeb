'use strict';
/* ===== MOTOR MANAGER PRO v2 — données & utilitaires ===== */
const KEY='mmp_v3',K2='mmp_v2',KT='mmp_gh_token',KM='mmp_meta',MN=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const def=()=>({v:2,s:{veh:'Mon véhicule',start:9,end:6,price:15.2,ivl:5000,warn:500,big:500,cur:'DH',rd:14,bud:{},remain:null,tank:null,l100ref:null,l100mode:'auto',ce:['Carburant','Parking','Entretien','Vidange','Assurance','Autres'],cr:['Cours','Parking','Autres'],students:[],gh:{owner:'',repo:'',branch:'main',path:'backups/motor-manager-backup.json',dir:'backups/',freq:'daily',keep:0,snap:false}},km:[],exp:[],rev:[],fuel:[],oil:[],rem:[]});
function merge(d,x){const gh=Object.assign(def().s.gh,x.s&&x.s.gh);Object.assign(d.s,x.s);d.s.gh=gh;['km','exp','rev','fuel','oil','rem'].forEach(k=>d[k]=Array.isArray(x[k])?x[k]:[]);return d}
function load1(){try{let x=JSON.parse(localStorage.getItem(K2));if(!x){const o=JSON.parse(localStorage.getItem('mmp_v1'));if(o&&o.s){const sd={};o.km.forEach(r=>{if(!sd[r.date]||r.odo>sd[r.date].odo)sd[r.date]=r});x={s:{veh:o.s.veh,start:o.s.start,end:o.s.end,price:o.s.price,cur:o.s.cur,ce:o.s.ce,cr:o.s.cr},km:Object.values(sd).map(r=>({id:r.id,date:r.date,odo:r.odo})),exp:o.exp,rev:o.rev,fuel:o.fuel.map(f=>({...f,full:true})),oil:[]}}}if(x&&x.s)return merge(def(),x)}catch(e){}return def()}
const nid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function loadDB(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.list)&&x.list.length){const list=x.list.map(v=>{const d=merge(def(),v);d.id=v.id||nid();return d});return{v:3,act:list.some(v=>v.id==x.act)?x.act:list[0].id,list,gh:Object.assign(def().s.gh,x.gh)}}}catch(e){}
  const d=load1();d.id=nid();return{v:3,act:d.id,list:[d],gh:d.s.gh}}
let DB=loadDB(),D=DB.list.find(v=>v.id==DB.act)||DB.list[0],V='sai',AF=null;
const linkGh=()=>DB.list.forEach(v=>v.s.gh=DB.gh);linkGh();const F={},E={},CH={},P={type:'saison',from:'',to:''};
let M=Object.assign({st:'none',last:null,size:null,err:'',hash:null,local:null,dirty:false},(()=>{try{return JSON.parse(localStorage.getItem(KM))||{}}catch(e){return{}}})());
const saveM=()=>localStorage.setItem(KM,JSON.stringify(M));
const save=nd=>{localStorage.setItem(KEY,JSON.stringify(DB));if(!nd){M.dirty=true;saveM();sched()}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const $=s=>document.querySelector(s);
const nf=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fm=v=>v==null||isNaN(v)?'-':nf.format(v)+' '+D.s.cur;
const fn=(v,u='')=>v==null||isNaN(v)?'-':nf.format(v)+u;
const fd=i=>i?i.split('-').reverse().join('/'):'';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>iso(new Date());
const inR=(d,r)=>d>=r[0]&&d<=r[1];
const ALL=['0000','9999'];
const srt=(a,asc)=>a.slice().sort((x,y)=>x.date<y.date?(asc?-1:1):x.date>y.date?(asc?1:-1):0);
const num=v=>parseFloat(String(v).replace(',','.'));
function toast(m,e,a){const t=$('#toast');t.textContent=m;if(a){const b=document.createElement('button');b.type='button';b.className='tbtn';b.textContent=a.l;b.onclick=()=>{clearTimeout(toast.t);t.className='';a.f()};t.append(b)}t.className='show'+(e?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',a?8000:3500)}

/* ===== Saison ===== */
const mo=d=>+d.slice(5,7),wrap=()=>D.s.start>D.s.end;
let SY=null;
function curSeason(){const t=new Date(),y=t.getFullYear();return wrap()&&t.getMonth()+1<D.s.start?y-1:y}
const sy=()=>SY==null?curSeason():SY;
function seasons(){const a=new Set([curSeason()]);[...D.km,...D.exp,...D.rev,...D.fuel,...D.oil].forEach(r=>{const y=+r.date.slice(0,4);a.add(wrap()&&mo(r.date)<D.s.start?y-1:y)});return[...a].sort((x,y)=>y-x)}
const slabel=y=>'Saison '+y+(wrap()?'-'+(y+1):'');
function seasonMonths(){const a=[];let m=D.s.start;for(let i=0;i<12;i++){a.push(m);if(m==D.s.end)break;m=m%12+1}return a}
function mkeys(){const y=sy();return seasonMonths().map(m=>({m,k:(wrap()&&m<D.s.start?y+1:y)+'-'+String(m).padStart(2,'0')}))}
const SR=()=>{const k=mkeys();return[k[0].k+'-01',k[k.length-1].k+'-31']};
function range(){const t=new Date(),ym=(y,m)=>y+'-'+String(m).padStart(2,'0');
  if(P.type=='saison')return SR();
  if(P.type=='courant'){const k=ym(t.getFullYear(),t.getMonth()+1);return[k+'-01',k+'-31']}
  if(P.type=='prec'){const d=new Date(t.getFullYear(),t.getMonth()-1,1),k=ym(d.getFullYear(),d.getMonth()+1);return[k+'-01',k+'-31']}
  return[P.from||'0000',P.to||'9999']}

/* ===== Moteur de calcul centralisé ===== */
const kmRows=()=>srt(D.km,1).map((r,i,a)=>({...r,prev:i?a[i-1].odo:null,dist:i?Math.max(0,r.odo-a[i-1].odo):0,ok:i>0}));
const sum=(a,r,f='amt')=>a.filter(x=>inR(x.date,r)).reduce((s,x)=>s+x[f],0);
const isF=e=>e.cat=='Carburant';
const dcount=(a,r)=>new Set(a.filter(x=>inR(x.date,r)).map(x=>x.date)).size;
function T(r){const kr=kmRows().filter(x=>inR(x.date,r)),km=kr.reduce((s,x)=>s+x.dist,0),e=sum(D.exp,r),v=sum(D.rev,r),de=dcount(D.exp,r),dv=dcount(D.rev,r),dk=kr.filter(x=>x.ok&&x.dist>0).length;
  return{km,e,v,net:v-e,fe:sum(D.exp.filter(isF),r),de,dv,dk,ave:de?e/de:null,avv:dv?v/dv:null,avk:dk?km/dk:null,epk:km?e/km:null,vpk:km?v/km:null}}
function monthly(){const kr=kmRows();return mkeys().map(({m,k})=>{const r=[k+'-01',k+'-31'],E_=D.exp.filter(x=>inR(x.date,r)),V_=D.rev.filter(x=>inR(x.date,r)),K_=kr.filter(x=>inR(x.date,r)&&x.ok),km=K_.reduce((s,x)=>s+x.dist,0),e=E_.reduce((s,x)=>s+x.amt,0),v=V_.reduce((s,x)=>s+x.amt,0);
  return{m,k,name:MN[m-1],km,e,v,net:v-e,fe:E_.filter(isF).reduce((s,x)=>s+x.amt,0),epk:km?e/km:null,vpk:km?v/km:null,ae:E_.length>0,av:V_.length>0,ak:K_.length>0}})}
function avgs(ms){const f=(key,act)=>{const a=ms.filter(x=>x[act]);return a.length?a.reduce((s,x)=>s+x[key],0)/a.length:null};return{v:f('v','av'),e:f('e','ae'),km:f('km','ak')}}
const catSum=(a,r)=>{const o={};a.filter(x=>inR(x.date,r)).forEach(x=>o[x.cat]=(o[x.cat]||0)+x.amt);return o};
const lastOdo=()=>{const a=[...D.km,...D.fuel,...D.oil].map(x=>x.odo).filter(x=>x!=null);return a.length?Math.max(...a):null};
const fsort=()=>D.fuel.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.odo||0)-(b.odo||0));
/* Cycles plein→plein : les pleins partiels s'accumulent jusqu'au prochain plein complet */
function cycles(){let base=null,acc=0,cost=0;const out=[];
  for(const f of fsort()){if(base==null){if(f.full&&f.odo!=null)base=f.odo;continue}
    acc+=f.liters;cost+=f.amt;
    if(f.full&&f.odo!=null){const d=f.odo-base;if(d>0&&acc>0)out.push({date:f.date,odo:f.odo,dist:d,l:acc,l100:acc/d*100,kml:d/acc,cost,cpk:cost/d});base=f.odo;acc=0;cost=0}}
  return out}
function fstat(){const cs=cycles(),td=cs.reduce((s,c)=>s+c.dist,0),tl=cs.reduce((s,c)=>s+c.l,0),tc=cs.reduce((s,c)=>s+c.cost,0),kml=tl?td/tl:null,ts=tankState(D.s.l100mode=='ref'&&refKml()?refKml():(kml||refKml()));
  return{cs,remL:ts?ts.l:null,last:cs[cs.length-1],l100:td?tl/td*100:null,kml,cpk:td?tc/td:null,bought:D.fuel.reduce((s,f)=>s+f.liters,0),spend:sum(D.exp.filter(isF),ALL),lf:srt(D.fuel)[0],range:ts?ts.km:null}}
/* Carburant restant : recalculé depuis le dernier plein complet (capacité) ou le point de départ saisi, puis diminue avec le compteur */
const refKml=()=>D.s.l100ref>0?100/D.s.l100ref:null;
function tankState(kml,ov){if(!kml)return null;const tk=D.s.tank,rm=D.s.remain,lo=lastOdo(),cur=ov!=null&&!isNaN(ov)&&ov>(lo??-1)?ov:lo,
  all=[...D.km,...D.fuel,...D.oil],odoAt=d=>{const a=all.filter(x=>x.odo!=null&&x.date<=d).map(x=>x.odo);return a.length?Math.max(...a):null},
  fs=D.fuel.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts&&b.ts?a.ts-b.ts:(a.odo??1e12)-(b.odo??1e12))),
  fo=f=>f.odo!=null?f.odo:odoAt(f.date);let base=null,ev=[];
  /* Point de départ = dernier plein complet (réservoir plein) ou dernier « carburant restant » saisi, le plus récent des deux.
     Tous les pleins (même partiels, même sans compteur) saisis APRÈS ce point sont ajoutés, après déduction de la consommation depuis le point précédent. */
  const li=tk?fs.map((f,i)=>f.full&&f.odo!=null?i:-1).filter(i=>i>=0).pop():-1;
  if(li>=0){base={l:tk,odo:fs[li].odo,ts:fs[li].ts};ev=fs.slice(li+1)}
  const m=rm&&typeof rm=='object'?rm:(typeof rm=='number'&&lo!=null?{l:rm,odo:lo}:null);
  if(m){const md=m.date||(all.filter(x=>x.odo===m.odo).map(x=>x.date).sort().pop())||'';
    if(!base||m.odo>base.odo||(m.odo==base.odo&&(m.ts&&base.ts?m.ts>base.ts:true))){base={l:m.l,odo:m.odo,ts:m.ts};
      ev=fs.filter(f=>{if(f.ts&&m.ts)return f.ts>m.ts;const q=fo(f);if(!md)return q!=null&&q>m.odo;if(f.date!==md)return f.date>md;if(q!=null&&q!==m.odo)return q>m.odo;return true})}}
  if(!base)return null;let l=base.l,o=base.odo;
  ev.forEach(f=>{const q=fo(f);if(q!=null&&q>o){l=Math.max(0,l-(q-o)/kml);o=q}l+=f.liters;if(tk)l=Math.min(l,tk)});
  if(cur!=null&&cur>o)l=Math.max(0,l-(cur-o)/kml);return{l,km:l*kml,cap:tk||Math.max(base.l,l)}}
/* Jauge visuelle d'autonomie (se met à jour avec le compteur, même en cours de saisie) */
function gauge(cur){const f=fstat(),ur=D.s.l100mode=='ref'&&refKml(),m=ur?null:f.kml,kml=ur?refKml():(f.kml||refKml()),ts=tankState(kml,cur),box=h=>`<div class="card p-3 mb-3"><b class="mb-2"><i class="fa-solid fa-gas-pump"></i> Autonomie</b>${h}</div>`;
  if(!ts)return box('<div class="small text-muted">Pour l\'afficher : page Carburant › renseignez la capacité du réservoir (ou le carburant restant) et, tant qu\'aucun cycle plein→plein n\'est mesuré, une consommation de référence (L/100 km).</div>');
  const pct=Math.max(0,Math.min(100,ts.l/ts.cap*100)),c=pct<=20?'#b5523b':pct<=35?'#e9a23b':'#3d8361',len=157.08,arc='M10 62A50 50 0 0 1 110 62';
  return box(`<div class="d-flex align-items-center gap-3 flex-wrap"><svg viewBox="0 0 120 72" width="190" role="img" aria-label="Jauge de carburant : ${Math.round(pct)} %"><path d="${arc}" fill="none" stroke="#e3e7ef" stroke-width="12" stroke-linecap="round"/><path d="${arc}" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${(len*(1-pct/100)).toFixed(1)}"/><text x="60" y="52" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor">${Math.round(pct)}%</text><text x="6" y="71" font-size="8" fill="#6b7690">E</text><text x="108" y="71" font-size="8" fill="#6b7690">F</text></svg>
  <div><div style="font-size:1.8rem;font-weight:700;color:${c}">≈ ${Math.round(ts.km)} km</div><div class="small text-muted">${fn(ts.l,' L')} restants · basé sur ${fn(kml,' km/L')} (${m?'mesuré':'référence'})</div>${pct<=20?'<div class="small text-danger mt-1"><i class="fa-solid fa-triangle-exclamation"></i> Niveau bas : prévoyez un plein.</div>':''}</div></div>`)}
function oilStat(){const l=srt(D.oil)[0];if(!l)return null;const ivl=l.ivl||D.s.ivl,cur=lastOdo()??l.odo,next=l.odo+ivl,rem=next-cur;
  return{l,ivl,cur,next,rem,pct:Math.max(0,(cur-l.odo)/ivl*100),c:rem<0?'danger':rem<=D.s.warn?'warning':'success',lbl:rem<0?'En retard':rem<=D.s.warn?'Bientôt dû':'À jour'}}

/* ===== Graphiques & composants ===== */
function ch(id,type,labels,sets){const c=document.getElementById(id);if(!c||typeof Chart=='undefined')return;const cols=['#1f6f8b','#e07a5f','#3d8361','#e9a23b','#6c5b7b','#8d99ae','#b5523b'];
  CH[id]=new Chart(c,{type,data:{labels,datasets:sets.map((s,i)=>({backgroundColor:type=='doughnut'?cols:cols[i],borderColor:type=='line'?cols[i]:undefined,tension:.3,...s}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:sets.length>1||type=='doughnut'}}}})}
const cb=(id,t)=>`<div class="col-lg-6"><div class="card p-3"><b class="small">${t}</b><div class="cbox"><canvas id="${id}"></canvas></div></div></div>`;
const kp=(l,v,c='')=>`<div class="col-lg-3 col-6"><div class="card kpi ${c}"><span>${l}</span><b>${v}</b></div></div>`;
const sgn=v=>v>0?'success':v<0?'danger':'';
const inp=(id,l,v,t='text',c='col-md-3 col-6',x='')=>`<div class="${c}"><label class="form-label small">${l}</label><input class="form-control" id="${id}" type="${t}" ${t=='number'?'step="any" inputmode="decimal"':''} value="${esc(v)}" ${x}></div>`;
const ssel=()=>`<div class="col-md-3 col-6"><label class="form-label small">Saison</label><select class="form-select" onchange="SY=+this.value;render()">${seasons().map(y=>`<option value="${y}" ${y==sy()?'selected':''}>${slabel(y)}</option>`).join('')}</select></div>`;
function bnrBak(){if(!D.s.rd||!(D.km.length+D.exp.length+D.rev.length+D.fuel.length+D.oil.length))return'';const l=[M.local,M.last].filter(Boolean).sort().pop(),age=l?(Date.now()-new Date(l))/864e5:Infinity;
  return age>=D.s.rd?`<div class="alert alert-warning py-2 small">Rappel : ${l?'dernière sauvegarde il y a '+Math.floor(age)+' jours':'aucune sauvegarde effectuée'}. <a href="#" onclick="go('bak');return false">Sauvegarder</a></div>`:''}

/* ===== Entretien : échéances & alertes ===== */
const RT=['Assurance','Vignette','Contrôle technique','Pneus','Plaquettes de frein','Filtre à air','Batterie','Courroie de distribution','Révision générale'];
const addM=(d,n)=>{const x=new Date(d+'T12:00:00'),dd=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);x.setDate(Math.min(dd,new Date(x.getFullYear(),x.getMonth()+1,0).getDate()));return iso(x)};
const dayDiff=(a,b)=>Math.round((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/864e5);
function remStat(r){const t=today(),cur=lastOdo(),nd=r.mo>0&&r.date?addM(r.date,r.mo):null,nk=r.km>0&&r.odo!=null?r.odo+r.km:null,dd=nd?dayDiff(nd,t):null,kr=nk!=null&&cur!=null?nk-cur:null,
    late=(dd!=null&&dd<0)||(kr!=null&&kr<0),soon=!late&&((dd!=null&&dd<=30)||(kr!=null&&kr<=D.s.warn));
  return{nd,nk,dd,kr,c:late?'danger':soon?'warning':'success',lbl:late?'En retard':soon?'Bientôt dû':'À jour',rank:late?0:soon?1:2}}
function remBnr(){const l=(D.rem||[]).map(r=>({r,s:remStat(r)})).filter(x=>x.s.rank<2).sort((a,b)=>a.s.rank-b.s.rank);if(!l.length)return'';
  return`<div class="alert alert-${l[0].s.rank==0?'danger':'warning'} py-2 small">Entretien : ${l.slice(0,4).map(x=>`<b>${esc(x.r.name)}</b> (${x.s.lbl.toLowerCase()})`).join(', ')}${l.length>4?' …':''}. <a href="#" onclick="go('mnt');return false">Voir</a></div>`}

/* ===== Budgets mensuels par catégorie ===== */
function budRows(){const k=today().slice(0,7),cs=catSum(D.exp,[k+'-01',k+'-31']),b=D.s.bud||{};
  return Object.keys(b).filter(c=>b[c]>0&&D.s.ce.includes(c)).map(c=>{const s=cs[c]||0,p=s/b[c]*100;return{c,b:b[c],s,p,cl:p>=100?'danger':p>=80?'warning':'success'}})}
function budBnr(){const o=budRows().filter(x=>x.p>=100);return o.length?`<div class="alert alert-danger py-2 small">Budget dépassé ce mois : ${o.slice(0,4).map(x=>`<b>${esc(x.c)}</b> (${Math.round(x.p)} %)`).join(', ')}. <a href="#" onclick="go('stat');return false">Détails</a></div>`:''}
function budCard(){const l=budRows();if(!l.length)return'';
  return`<div class="card p-3 mb-3"><b class="mb-2"><i class="fa-solid fa-bullseye"></i> Budgets de ${MN[new Date().getMonth()].toLowerCase()}</b>${l.map(x=>`<div class="mb-2"><div class="d-flex justify-content-between flex-wrap small"><span>${esc(x.c)}</span><span>${fm(x.s)} / ${fm(x.b)} <b class="text-${x.cl}">${Math.round(x.p)} %</b></span></div><div class="progress" style="height:8px"><div class="progress-bar bg-${x.cl}" style="width:${Math.min(100,x.p)}%"></div></div></div>`).join('')}</div>`}
const budF=()=>`<h2 class="sec">Budgets mensuels par catégorie de dépenses</h2><p class="small text-muted">Laissez vide pour ne pas suivre une catégorie. La barre passe à l'orange dès 80 % et une alerte s'affiche à 100 % (tableau de bord et saisie du jour).</p><div class="row g-2">${D.s.ce.map(c=>`<div class="col-md-3 col-6"><label class="form-label small">${esc(c)} (${esc(D.s.cur)}/mois)</label><input class="form-control" type="number" step="any" min="0" inputmode="decimal" data-bud="${esc(c)}" value="${D.s.bud&&D.s.bud[c]>0?D.s.bud[c]:''}"></div>`).join('')}</div>`;
function bnr(){return remBnr()+budBnr()+bnrBak()}

/* ===== Coût total au km + projection de fin de saison ===== */
const CG={Carburant:['carburant'],Entretien:['entretien','vidange'],Assurance:['assurance']};
function costStat(){const r=SR(),km=T(r).km,ex=D.exp.filter(x=>inR(x.date,r)),g=n=>ex.filter(x=>CG[n].includes(norm(x.cat))).reduce((s,x)=>s+x.amt,0),c={Carburant:g('Carburant'),Entretien:g('Entretien'),Assurance:g('Assurance')},tot=c.Carburant+c.Entretien+c.Assurance;
  const mk=mkeys(),a=new Date(mk[0].k+'-01T12:00:00'),b=new Date(+mk[mk.length-1].k.slice(0,4),+mk[mk.length-1].k.slice(5,7),0,12),n=new Date(today()+'T12:00:00'),total=Math.round((b-a)/864e5)+1,el=Math.min(total,Math.max(0,Math.round((n-a)/864e5)+1));
  const live=el>0&&el<total&&km>0,f=live?total/el:1,pk=km*f,pc={Carburant:c.Carburant*f,Entretien:c.Entretien*f,Assurance:c.Assurance},pt=pc.Carburant+pc.Entretien+pc.Assurance;
  return{km,c,tot,cpk:km?tot/km:null,live,el,total,pk,pc,pt,pcpk:pk?pt/pk:null}}
function costCard(){const s=costStat(),pk=v=>s.km?fn(v/s.km,' DH/km'):'-',pp=v=>s.pk?fn(v/s.pk,' DH/km'):'-',
  row=(l,k)=>`<tr><td>${l}</td><td class="num">${fm(s.c[k])}</td><td class="num">${pk(s.c[k])}</td>${s.live?`<td class="num">${fm(s.pc[k])}</td><td class="num">${pp(s.pc[k])}</td>`:''}</tr>`;
  return`<div class="card p-3 mb-3"><b class="mb-2"><i class="fa-solid fa-coins"></i> Coût total au km — ${slabel(sy())}</b>
  <div class="row g-3 mb-2">${kp('Kilométrage',fn(s.km,' km'))}${kp('Coût total',fm(s.tot))}${kp('Coût au km',s.cpk==null?'-':fn(s.cpk,' DH/km'))}${s.live?kp('Km projetés (fin de saison)',fn(s.pk,' km'))+kp('Coût projeté (fin de saison)',fm(s.pt))+kp('Coût au km projeté',s.pcpk==null?'-':fn(s.pcpk,' DH/km')):''}</div>
  <div class="table-responsive"><table class="table table-sm mb-1"><thead><tr><th>Poste</th><th class="num">Dépensé</th><th class="num">DH/km</th>${s.live?'<th class="num">Projeté</th><th class="num">DH/km proj.</th>':''}</tr></thead><tbody>${row('Carburant','Carburant')}${row('Entretien et vidange','Entretien')}${row('Assurance','Assurance')}</tbody>
  <tfoot><tr class="fw-bold"><td>Total</td><td class="num">${fm(s.tot)}</td><td class="num">${pk(s.tot)}</td>${s.live?`<td class="num">${fm(s.pt)}</td><td class="num">${pp(s.pt)}</td>`:''}</tr></tfoot></table></div>
  <div class="small text-muted">Postes : catégories « Carburant », « Entretien » + « Vidange » et « Assurance ». ${s.live?`Projection : le rythme observé sur ${s.el} jours est prolongé jusqu'à la fin de la saison (${s.total} jours) pour les km, le carburant et l'entretien ; l'assurance n'est pas extrapolée (elle se paie par versements).`:'La projection s\'affiche pendant la saison en cours, dès qu\'un kilométrage est enregistré.'}</div></div>`}

/* ===== Prix du litre : suivi dans le temps vs prix des paramètres ===== */
function pstat(){const a=srt(D.fuel.filter(f=>f.ppl>0)),l=a[0],L=D.fuel.reduce((s,f)=>s+(f.liters||0),0),A=D.fuel.reduce((s,f)=>s+(f.amt||0),0),ps=a.map(f=>f.ppl),ref=D.s.price;
  return{l,ref,avg:L?A/L:null,min:ps.length?Math.min(...ps):null,max:ps.length?Math.max(...ps):null,d:l?l.ppl-ref:null,dp:l&&ref?(l.ppl-ref)/ref*100:null}}
const dp=r=>{if(!r.ppl||!D.s.price)return'';const d=r.ppl-D.s.price;return Math.abs(d)<0.005?'':` <small class="${d>0?'text-danger':'text-success'}">${d>0?'▲':'▼'} ${nf.format(Math.abs(d))}</small>`};
function prRow(){const p=pstat(),c=p.d==null?'':p.d>0.004?'danger':p.d<-0.004?'success':'',sg=v=>(v>0?'+':'')+nf.format(v);
  return`<div class="row g-3 mb-3">${kp('Prix paramétré',fn(p.ref,' DH/L'))}${kp('Dernier prix payé',p.l?fn(p.l.ppl,' DH/L'):'-')}${kp('Écart vs paramétré',p.d==null?'-':sg(p.d)+' DH ('+sg(p.dp)+' %)',c)}${kp('Prix moyen payé (pondéré)',p.avg==null?'-':fn(p.avg,' DH/L'))}${kp('Plus bas / plus haut',p.min==null?'-':fn(p.min)+' / '+fn(p.max))}</div>${p.l&&Math.abs(p.d)>=0.005?`<div class="mb-3"><button class="btn btn-sm btn-outline-dark" onclick="priceRef()">Utiliser le dernier prix (${fn(p.l.ppl)} DH/L) comme prix paramétré</button></div>`:''}`}
function priceRef(){const p=pstat();if(!p.l)return;D.s.price=+p.l.ppl.toFixed(2);save();render();toast('Prix paramétré mis à jour : '+fn(D.s.price,' DH/L'))}

/* ===== Navigation du bas (téléphone) + tableaux en cartes ===== */
const BN=[['sai','Saisie','pen-to-square'],['dash','Bord','gauge-high'],['fuel','Carburant','gas-pump'],['mnt','Entretien','screwdriver-wrench']];
function bnav(){return BN.map(n=>`<button type="button" class="${n[0]==V?'on':''}" onclick="go('${n[0]}')"><i class="fa-solid fa-${n[2]}"></i><span>${n[1]}</span></button>`).join('')+`<button type="button" class="${BN.some(n=>n[0]==V)?'':'on'}" onclick="document.getElementById('side').classList.toggle('open')" aria-label="Plus de pages"><i class="fa-solid fa-ellipsis"></i><span>Plus</span></button>`}
function cardLabels(){document.querySelectorAll('table.table-cards').forEach(t=>{const h=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());
  t.querySelectorAll('tbody tr,tfoot tr').forEach(r=>[...r.children].forEach((c,i)=>{if(h[i]&&!(i==0&&r.parentNode.tagName=='TFOOT'))c.setAttribute('data-label',h[i])}))})}

/* ===== Navigation ===== */
const NAV=[['sai','Saisie du jour','pen-to-square'],['dash','Tableau de bord','gauge-high'],['fuel','Carburant','gas-pump'],['oil','Vidange','oil-can'],['mnt','Entretien','screwdriver-wrench'],['stat','Statistiques','chart-column'],['hkm','Historique km','road'],['hexp','Historique dépenses','wallet'],['hrev','Historique recettes','sack-dollar'],['imp','Importer des données','file-import'],['rep','Rapports & exports','file-export'],['bak','Sauvegarde','cloud-arrow-up'],['stu','Élèves','user-graduate'],['veh','Véhicules','car'],['set','Paramètres','gear'],['ins','Installer l\'app','download']];
function go(v){V=v;$('#side').classList.remove('open');render();scrollTo(0,0)}
function render(){Object.values(CH).forEach(c=>c.destroy());for(const k in CH)delete CH[k];
  $('#nav').innerHTML=NAV.map(n=>`<a class="${n[0]==V?'on':''}" onclick="go('${n[0]}')"><i class="fa-solid fa-${n[2]}"></i>${n[1]}</a>`).join('')+(typeof DIP!='undefined'&&DIP&&!standalone()?'<a onclick="doInstall()" style="background:rgba(233,162,59,.18);color:#e9a23b"><i class="fa-solid fa-download"></i>Installer l\'application</a>':'');
  $('#vsel').innerHTML=vopts();$('#bnav').innerHTML=bnav();$('#ttl').textContent=NAV.find(n=>n[0]==V)[1];AF=null;$('#main').innerHTML=VW[V]();cardLabels();AF&&AF()}

/* ===== Saisie quotidienne ===== */
const X={date:today(),odo:null,xl:[{cat:'',desc:'',amt:''}],rl:[{cat:'',desc:'',amt:''}]};
function kmInfo(){const d=X.date,ex=D.km.find(r=>r.date==d),v=X.odo===null?(ex?ex.odo:null):(X.odo===''?null:num(X.odo)),prev=srt(D.km.filter(r=>r.date<d))[0],dist=v!=null&&!isNaN(v)&&prev?v-prev.odo:null,rows=kmRows().filter(r=>r.date!=d),ym=d.slice(0,7),add=dist>0?dist:0;
  return{prev:prev?prev.odo:null,cur:v,dist,m:rows.filter(r=>r.date.slice(0,7)==ym).reduce((s,r)=>s+r.dist,0)+add,t:rows.reduce((s,r)=>s+r.dist,0)+add}}
function kmLive(){const k=kmInfo(),c=(l,v,x='')=>`<div class="col-md-2 col-6"><div class="small text-muted">${l}</div><b class="${x}">${v}</b></div>`;
  return`<div class="row g-2 mt-1">${c('Relevé précédent',fn(k.prev,' km'))}${c('Compteur actuel',fn(k.cur,' km'))}${c('Distance du jour',k.dist==null?'-':fn(k.dist,' km'),k.dist<0?'text-danger':'')}${c('Distance du mois',fn(k.m,' km'))}${c('Total depuis le début',fn(k.t,' km'))}</div>${k.dist<0?'<div class="text-danger small mt-1">Le compteur est inférieur au relevé précédent.</div>':''}`}
const updKm=()=>{const e=$('#kmlive');if(e)e.innerHTML=kmLive();const g=$('#gaugebox');if(g)g.innerHTML=gauge(kmInfo().cur)};
function xrows(k){const cs=k=='xl'?D.s.ce:D.s.cr;return X[k].map((r,i)=>`<div class="row g-2 mb-2"><div class="col-md-3 col-6"><select class="form-select" onchange="X.${k}[${i}].cat=this.value${k=='rl'?';render()':''}">${cs.map(c=>`<option ${c==(r.cat||cs[0])?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="col-md-5 col-12">${descCtl(k,i,r)}</div><div class="col-md-3 col-8"><input class="form-control" type="number" step="any" inputmode="decimal" placeholder="Montant (DH)" value="${esc(r.amt)}" oninput="X.${k}[${i}].amt=this.value"></div><div class="col-md-1 col-4"><button class="btn btn-light" title="Retirer" onclick="X.${k}.splice(${i},1);if(!X.${k}.length)X.${k}.push({cat:'',desc:'',amt:''});render()">×</button></div></div>`).join('')}
function saiSave(){const d=X.date;if(!d)return toast('Date requise',1);
  const odo=X.odo===''||X.odo==null?null:num(X.odo),ex=D.km.find(r=>r.date==d);
  if(X.odo!==null&&X.odo!==''&&(isNaN(odo)||odo<0))return toast('Compteur invalide',1);
  if(odo!=null&&(!ex||ex.odo!=odo)){const er=kmCheck(d,odo,ex&&ex.id);if(er)return toast(er,1)}
  const L=(k,cs)=>X[k].filter(r=>String(r.amt).trim()!=='').map(r=>({desc:r.desc.trim(),cat:r.cat||cs[0],amt:num(r.amt)})),xs=L('xl',D.s.ce),rs=L('rl',D.s.cr);
  if([...xs,...rs].some(r=>isNaN(r.amt)||r.amt<=0))return toast('Montant invalide',1);
  if(odo==null&&!xs.length&&!rs.length)return toast('Rien à enregistrer',1);
  if(odo!=null){ex?ex.odo=odo:D.km.push({id:uid(),date:d,odo})}
  xs.forEach(r=>D.exp.push({id:uid(),date:d,note:'',...r}));rs.forEach(r=>D.rev.push({id:uid(),date:d,note:'',...r}));
  const nn=[...new Set(rs.filter(r=>isCours(r.cat)&&r.desc&&r.desc.length<=40&&!stuAll().some(x=>norm(x)==norm(r.desc))).map(r=>r.desc))];
  X.odo=null;X.xl=[{cat:'',desc:'',amt:''}];X.rl=[{cat:'',desc:'',amt:''}];save();render();toast('Journée enregistrée',0,nn.length?{l:'Ajouter '+(nn.length==1?'« '+nn[0]+' »':nn.length+' noms')+' aux élèves',f:()=>setStu([...stuAll(),...nn])}:undefined)}
const VW_sai=()=>{const ex=D.km.find(r=>r.date==X.date),ov=X.odo===null?(ex?ex.odo:''):X.odo;
  return`${bnr()}<div class="card p-3 mb-3"><div class="row g-2 align-items-end"><div class="col-md-3 col-6"><label class="form-label small">Date</label><input type="date" class="form-control" value="${X.date}" onchange="X.date=this.value;X.odo=null;render()"></div></div></div>
  <div id="gaugebox">${gauge()}</div><div class="card p-3 mb-3"><b class="mb-2"><i class="fa-solid fa-road"></i> Kilométrage ${ex?'<span class="badge text-bg-info">relevé existant : modification</span>':''}</b><div class="row g-2">${inp('odo','Compteur actuel (km)',ov,'number','col-md-3 col-12','oninput="X.odo=this.value;updKm()"')}</div><div id="kmlive">${kmLive()}</div></div>
  <div class="card p-3 mb-3"><b class="mb-2"><i class="fa-solid fa-wallet"></i> Dépenses</b>${xrows('xl')}<div><button class="btn btn-sm btn-light" onclick="X.xl.push({cat:'',desc:'',amt:''});render()">+ Ajouter une dépense</button></div></div>
  <div class="card p-3 mb-3"><b class="mb-2"><i class="fa-solid fa-sack-dollar"></i> Recettes</b>${xrows('rl')}<div><button class="btn btn-sm btn-light" onclick="X.rl.push({cat:'',desc:'',amt:''});render()">+ Ajouter une recette</button></div></div>
  <button class="btn btn-acc btn-lg" onclick="saiSave()"><i class="fa-solid fa-check"></i> Enregistrer la journée</button> <span class="small text-muted ms-2">Les sections vides sont ignorées.</span>`};

/* ===== CRUD générique (historiques, carburant, vidange) ===== */
const cat=k=>({n:'cat',l:'Catégorie',t:'sel',opts:()=>D.s[k]}),dt={n:'date',l:'Date',t:'date'},nt={n:'note',l:'Notes',t:'text',o:1},ds={n:'desc',l:'Description',t:'text',o:1},dsr={n:'desc',l:'Description / élève',t:'stu',o:1},am={n:'amt',l:'Montant (DH)',t:'number'},od={n:'odo',l:'Compteur (km)',t:'number'};
const FL={exp:[dt,cat('ce'),ds,am,nt],rev:[dt,dsr,{...cat('cr'),x:'onchange="stuCat()"'},am,nt],km:[dt,od],
 fuel:[dt,{...od,o:1},{n:'ppl',l:'Prix du litre (DH/L)',t:'number',o:1,x:'oninput="fuelCalc()"'},{...am,o:1,l:'Montant payé (DH)',x:'oninput="fuelCalc()"'},{n:'liters',l:'Litres ajoutés (calculé)',t:'number',o:1},{n:'full',l:'Type de plein',t:'sel',opts:()=>['Plein complet','Partiel']},nt],
 oil:[dt,od,{n:'ivl',l:'Intervalle (km)',t:'number',o:1},{n:'type',l:'Type d\'huile',t:'text',o:1},{...am,o:1},nt]};
function fld(f,rec){let v=rec?rec[f.n]:null;if(f.n=='full'&&rec)v=rec.full?'Plein complet':'Partiel';
  if(f.t=='stu')return stuField(rec);
  if(f.t=='sel')return`<div class="col-md-3 col-6"><label class="form-label small">${f.l}</label><select class="form-select" id="f_${f.n}" ${f.x||''}>${f.opts().map(o=>`<option ${o==v?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
  return inp('f_'+f.n,f.l,v!=null?v:(f.t=='date'?today():(f.n=='ppl'&&!rec?lastPpl():'')),f.t,'col-md-3 col-6',f.x||'')}
const lastPpl=()=>{const f=srt(D.fuel)[0];return f&&f.ppl?+f.ppl.toFixed(2):D.s.price};
function fuelCalc(){const a=num($('#f_amt').value||''),p=num($('#f_ppl').value||''),e=$('#f_liters');if(e&&a>0&&p>0)e.value=(a/p).toFixed(2)}
function kmCheck(date,odo,id){const o=D.km.filter(x=>x.id!=id);if(o.some(x=>x.date==date))return'Un relevé existe déjà à cette date : modifiez-le depuis l\'historique';
  const p=srt(o.filter(x=>x.date<date))[0],n=srt(o.filter(x=>x.date>date),1)[0];
  if(p&&odo<p.odo)return'Compteur inférieur au relevé précédent ('+p.odo+' km)';if(n&&odo>n.odo)return'Compteur supérieur au relevé suivant ('+n.odo+' km)';
  if(p&&odo-p.odo>D.s.big&&!confirm('Écart important : '+(odo-p.odo)+' km depuis le dernier relevé. Confirmer ?'))return'Saisie annulée';return null}
function sub(k){const r={};
  for(const f of FL[k]){let v=document.getElementById('f_'+f.n).value.trim();
    if(f.t=='number'){if(v==='')v=null;else{v=num(v);if(isNaN(v)||v<0||(['amt','ivl','liters','ppl'].includes(f.n)&&v<=0))return toast('Valeur invalide : '+f.l,1)}}
    if(!f.o&&(v===''||v===null))return toast('Champ requis : '+f.l,1);r[f.n]=v}
  if(k=='km'){const er=kmCheck(r.date,r.odo,E.km);if(er)return toast(er,1)}
  if(k=='fuel'){r.full=r.full=='Plein complet';let{liters:l,amt:a,ppl:p}=r;if(a&&p&&(!l||Math.abs(l-a/p)<0.006))l=a/p;
    if(l&&a)p=a/l;else if(a&&p)l=a/p;else if(l&&p)a=l*p;else return toast('Renseignez le prix du litre et le montant payé',1);
    if(r.full&&r.odo==null)return toast('Le compteur est requis pour un plein complet',1);Object.assign(r,{liters:l,amt:a,ppl:p})}
  if(k=='oil')r.ivl=r.ivl||D.s.ivl;
  r.id=E[k]||uid();const arr=D[k],i=arr.findIndex(x=>x.id==r.id);r.ts=(i>=0&&arr[i].ts)||Date.now();i<0?arr.push(r):arr[i]=r;
  if(k=='fuel'||k=='oil'){D.exp=D.exp.filter(x=>x.fid!=r.id);if(r.amt)D.exp.push({id:'e'+r.id,fid:r.id,date:r.date,cat:k=='fuel'?'Carburant':'Vidange',desc:k=='fuel'?'Plein '+(r.full?'complet':'partiel'):'Vidange'+(r.type?' — '+r.type:''),amt:r.amt,note:''})}
  E[k]=null;save();render();toast('Enregistré')}
function edit(k,id){E[k]=id;render();scrollTo(0,0)}
function del(k,id){if(!confirm('Supprimer cet enregistrement ? Les statistiques seront recalculées.'))return;const rec=D[k].find(x=>x.id==id);if(!rec)return;const lk=(k=='fuel'||k=='oil')?D.exp.filter(x=>x.fid==id):[];D[k]=D[k].filter(x=>x.id!=id);if(lk.length)D.exp=D.exp.filter(x=>x.fid!=id);save();render();toast('Enregistrement supprimé',0,{l:'Annuler',f:()=>{D[k].push(rec);lk.forEach(x=>D.exp.push(x));save();render();toast('Suppression annulée')}})}
const tA=(rows,f='amt')=>rows.reduce((s,r)=>s+(r[f]||0),0);
const dc=['Date',r=>fd(r.date)];
const COL={exp:[dc,['Catégorie',r=>esc(r.cat)],['Description',r=>esc(r.desc)],['Montant',r=>fm(r.amt),1,R=>fm(tA(R))],['Notes',r=>esc(r.note)]],
 km:[dc,['Précédent',r=>fn(r.prev,' km'),1],['Compteur',r=>fn(r.odo,' km'),1],['Distance',r=>fn(r.dist,' km'),1,R=>fn(tA(R,'dist'),' km')]],
 fuel:[dc,['Compteur',r=>fn(r.odo,' km'),1],['Litres',r=>fn(r.liters,' L'),1,R=>fn(tA(R,'liters'),' L')],['Montant',r=>fm(r.amt),1,R=>fm(tA(R))],['Prix/L',r=>fm(r.ppl)+dp(r),1],['Type',r=>r.full?'Complet':'Partiel'],['L/100 km',r=>{const c=cycles().find(c=>c.date==r.date&&c.odo==r.odo);return c?fn(c.l100):'-'},1]],
 oil:[dc,['Compteur',r=>fn(r.odo,' km'),1],['Intervalle',r=>fn(r.ivl,' km'),1],['Huile',r=>esc(r.type)],['Montant',r=>fm(r.amt),1,R=>fm(tA(R))]]};
COL.rev=[dc,['Description',r=>esc(r.desc)],['Catégorie',r=>esc(r.cat)],COL.exp[3],COL.exp[4]];
function pre(k){
  if(k=='exp'||k=='rev'){const t=new Date(),td=iso(t),m=new Date(t);m.setDate(t.getDate()-((t.getDay()+6)%7));const wk=iso(m),s=f=>D[k].filter(f).reduce((x,r)=>x+r.amt,0);
    return`<div class="row g-3 mb-3">${kp('Aujourd\'hui',fm(s(r=>r.date==td)))}${kp('Semaine en cours',fm(s(r=>r.date>=wk&&r.date<=td)))}${kp('Mois en cours',fm(s(r=>r.date.slice(0,7)==td.slice(0,7))))}${kp(slabel(sy()),fm(s(r=>inR(r.date,SR()))))}</div>`}
  if(k=='km'){const td=today(),t=new Date(),m=new Date(t);m.setDate(t.getDate()-((t.getDay()+6)%7));const a=(x,y)=>kmRows().filter(r=>r.date>=x&&r.date<=y).reduce((s,r)=>s+r.dist,0);
    return`<div class="row g-3 mb-3">${kp('Aujourd\'hui',fn(a(td,td),' km'))}${kp('Semaine en cours',fn(a(iso(m),td),' km'))}${kp('Mois en cours',fn(a(td.slice(0,7)+'-01',td),' km'))}${kp('Total depuis le début',fn(a(...ALL),' km'))}</div>`}
  if(k=='fuel'){const f=fstat(),ur=D.s.l100mode=='ref'&&refKml(),cu=ur?D.s.l100ref:(f.l100!=null?f.l100:D.s.l100ref),cs_=ur||f.l100==null?'référence':'mesurée';
    return`${gauge()}<div class="row g-3 mb-3">${kp('Litres achetés (total)',fn(f.bought,' L'))}${kp('Dépense carburant totale',fm(f.spend))}${kp('Dernier plein',f.lf?fd(f.lf.date)+' · '+fn(f.lf.liters,' L'):'-')}${kp('Dernier compteur',fn(lastOdo(),' km'))}${kp('Dernière conso',f.last?fn(f.last.l100,' L/100 km'):'-')}${kp('Conso moyenne',f.l100==null?'-':fn(f.l100,' L/100 km'))}${kp('Efficacité moyenne',f.kml==null?'-':fn(f.kml,' km/L'))}${kp('Coût carburant / km',f.cpk==null?'-':fn(f.cpk,' DH/km'))}${kp('Carburant restant estimé',f.remL==null?'-':fn(f.remL,' L'))}${kp('Autonomie estimée',f.range==null?'-':fn(f.range,' km'))}</div>${prRow()}
    <div class="card p-3 mb-3"><div class="row g-2 align-items-end">${inp('tank','Capacité du réservoir (L)',D.s.tank??'','number','col-md-3 col-6')}${inp('rem','Carburant restant maintenant (L), optionnel','','number','col-md-3 col-6')}${inp('l100','Conso de référence (L/100 km)',D.s.l100ref??'','number','col-md-3 col-6')}<div class="col-md-3 col-6"><label class="form-label small">Consommation utilisée</label><select class="form-select" id="l100mode"><option value="auto" ${D.s.l100mode!='ref'?'selected':''}>Auto (mesurée, sinon référence)</option><option value="ref" ${D.s.l100mode=='ref'?'selected':''}>Toujours la référence</option></select></div><div class="col-md-3 col-12"><button class="btn btn-acc" onclick="saveRem()">Mettre à jour</button></div></div><div class="small text-muted mt-2">L'autonomie se met à jour toute seule avec le compteur : un plein complet remplit le réservoir (capacité), chaque kilomètre retire 1/(km/L moyen) litre, et les pleins partiels ajoutent leurs litres. Sans capacité, saisissez une fois le carburant restant : le suivi repart de ce point. En mode « Auto », la référence ne sert que tant qu'aucun cycle plein→plein n'est mesuré ; choisissez « Toujours la référence » pour imposer votre valeur. <b>Consommation utilisée actuellement : ${cu==null?'-':fn(cu,' L/100 km')} (${cs_}).</b> La consommation (L/100 km) n'est mesurée qu'entre deux pleins complets.</div></div>
    <div class="row g-3 mb-3">${cb('f1','Consommation (L/100 km) par cycle plein à plein')}${cb('f2','Dépenses de carburant par mois')}${cb('f3','Prix du litre payé vs prix paramétré (DH/L)')}</div>`}
  if(k=='oil'){const o=oilStat();if(!o)return'<div class="alert alert-secondary">Aucune vidange enregistrée. Ajoutez-en une pour activer le suivi.</div>';
    return`<div class="card p-3 mb-3"><div class="d-flex align-items-center gap-2 mb-2"><b>Prochaine vidange</b><span class="badge text-bg-${o.c}">${o.lbl}</span></div><div class="progress mb-3" style="height:12px"><div class="progress-bar bg-${o.c}" style="width:${Math.min(100,o.pct)}%"></div></div>
    <div class="row g-3">${kp('Dernière vidange',fd(o.l.date))}${kp('Compteur à la dernière vidange',fn(o.l.odo,' km'))}${kp('Compteur actuel',fn(o.cur,' km'))}${kp('Prochaine vidange à',fn(o.next,' km'))}${kp('Kilomètres restants',fn(o.rem,' km'),o.c)}${kp('Intervalle réalisé',fn(o.pct,' %'))}</div></div>`}
  return''}
const saveRem=()=>{const r=$('#rem').value.trim(),t=$('#tank').value.trim(),q=$('#l100').value.trim(),rv=r===''?null:num(r),tv=t===''?null:num(t),qv=q===''?null:num(q);
  if((rv!=null&&(isNaN(rv)||rv<0))||(tv!=null&&(isNaN(tv)||tv<=0))||(qv!=null&&(isNaN(qv)||qv<=0)))return toast('Valeur invalide',1);
  const md=$('#l100mode').value;if(md=='ref'&&qv==null)return toast('Renseignez la consommation de référence pour l\'utiliser',1);
  if(rv!=null){const o=lastOdo();if(o==null)return toast('Enregistrez d\'abord un compteur',1);D.s.remain={l:rv,odo:o,date:today(),ts:Date.now()}}D.s.tank=tv;D.s.l100ref=qv;D.s.l100mode=md;save();render();toast('Mise à jour effectuée : autonomie recalculée')};
function page(k){const f=F[k]||(F[k]={q:'',cat:'',from:'',to:'',sort:'d'}),rec=E[k]?D[k].find(x=>x.id==E[k]):null,cats=k=='exp'?D.s.ce:k=='rev'?D.s.cr:null,cols=COL[k],T_={exp:'dépense',rev:'recette',km:'relevé',fuel:'plein',oil:'vidange'}[k];
  let rows=(k=='km'?kmRows():D[k]).filter(r=>(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!f.cat||r.cat==f.cat)&&(!f.q||JSON.stringify(r).toLowerCase().includes(f.q.toLowerCase())));
  rows=f.sort=='m'?rows.slice().sort((a,b)=>(b.amt||b.dist||0)-(a.amt||a.dist||0)):srt(rows,f.sort=='a');
  const sel=(a,t)=>`<option value="${a}" ${f.sort==a?'selected':''}>${t}</option>`;
  const filt=`<div class="row g-2 mb-3">${inp('q_'+k,'Recherche',f.q,'text','col-md-3 col-12',`onchange="F['${k}'].q=this.value;render()"`)}
   ${cats?`<div class="col-md-2 col-6"><label class="form-label small">Catégorie</label><select class="form-select" onchange="F['${k}'].cat=this.value;render()"><option value="">Toutes</option>${cats.map(c=>`<option ${c==f.cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div>`:''}
   ${inp('d1_'+k,'Du',f.from,'date','col-md-2 col-6',`onchange="F['${k}'].from=this.value;render()"`)}${inp('d2_'+k,'Au',f.to,'date','col-md-2 col-6',`onchange="F['${k}'].to=this.value;render()"`)}
   <div class="col-md-3 col-6"><label class="form-label small">Tri</label><select class="form-select" onchange="F['${k}'].sort=this.value;render()">${sel('d','Date ↓ (récent)')}${sel('a','Date ↑ (ancien)')}${k=='km'||k=='oil'?'':sel('m','Montant ↓')}</select></div></div>`;
  return`<div class="card p-3 mb-3"><b class="mb-2">${rec?'Modifier':'Ajouter'} — ${T_}</b><div class="row g-2 align-items-end">${FL[k].map(x=>fld(x,rec)).join('')}
   <div class="col-md-3 col-6"><button class="btn btn-acc" onclick="sub('${k}')"><i class="fa-solid fa-check"></i> Enregistrer</button> ${rec?`<button class="btn btn-light" onclick="E['${k}']=null;render()">Annuler</button>`:''}</div></div></div>
  ${pre(k)}${filt}<div class="card"><div class="table-responsive"><table class="table table-hover table-cards mb-0"><thead><tr>${cols.map(c=>`<th class="${c[2]?'num':''}">${c[0]}</th>`).join('')}<th></th></tr></thead><tbody>
  ${rows.map(r=>`<tr>${cols.map(c=>`<td class="${c[2]?'num':''}">${c[1](r)}</td>`).join('')}<td class="num">${r.fid?'<small class="text-muted">lié (carburant/vidange)</small>':`<a class="btn btn-sm btn-light" onclick="edit('${k}','${r.id}')" title="Modifier"><i class="fa-solid fa-pen"></i></a> <a class="btn btn-sm btn-light text-danger" onclick="del('${k}','${r.id}')" title="Supprimer"><i class="fa-solid fa-trash"></i></a>`}</td></tr>`).join('')||`<tr><td colspan="${cols.length+1}" class="text-center text-muted p-4">Aucune donnée</td></tr>`}
  </tbody><tfoot><tr class="fw-bold">${cols.map((c,i)=>`<td class="${c[2]?'num':''}">${i==0?'Total ('+rows.length+')':c[3]?c[3](rows):''}</td>`).join('')}<td></td></tr></tfoot></table></div></div>`}
const VW={sai:VW_sai,hkm:()=>page('km'),hexp:()=>page('exp'),hrev:()=>page('rev'),oil:()=>page('oil')};
VW.fuel=()=>{const h=page('fuel');AF=()=>{const cs=fstat().cs,ms=monthly();ch('f1','line',cs.map(c=>fd(c.date)),[{label:'L/100 km',data:cs.map(c=>c.l100)}]);ch('f2','bar',ms.map(x=>x.name.slice(0,4)),[{label:'Carburant (DH)',data:ms.map(x=>x.fe)}]);const pf=fsort().filter(f=>f.ppl>0);ch('f3','line',pf.map(f=>fd(f.date)),[{label:'Prix payé (DH/L)',data:pf.map(f=>f.ppl)},{label:'Prix paramétré (DH/L)',data:pf.map(()=>D.s.price),borderDash:[6,4],pointRadius:0}])};return h};

/* ===== Entretien : rappels génériques (assurance, vignette, contrôle technique, pneus…) ===== */
function remSave(){const g=i=>$('#'+i).value.trim(),name=g('m_name'),date=g('m_date'),odo=g('m_odo')===''?null:num(g('m_odo')),mo=g('m_mo')===''?0:num(g('m_mo')),km=g('m_km')===''?0:num(g('m_km'));
  if(!name)return toast('Nom requis',1);if(!date)return toast('Date requise',1);
  if(isNaN(mo)||mo<0||isNaN(km)||km<0||(odo!=null&&(isNaN(odo)||odo<0)))return toast('Valeur invalide',1);
  if(!(mo>0)&&!(km>0))return toast('Indiquez un intervalle en mois ou en km',1);
  if(km>0&&odo==null)return toast('Le compteur est requis pour un intervalle en km',1);
  const r={id:E.rem||uid(),name,date,odo,mo,km,cat:g('m_cat'),note:g('m_note')},i=D.rem.findIndex(x=>x.id==r.id);i<0?D.rem.push(r):D.rem[i]=r;E.rem=null;save();render();toast('Rappel enregistré')}
function remDone(id){const r=D.rem.find(x=>x.id==id);if(!r)return;
  const a=prompt('« '+r.name+' » effectué aujourd\'hui.\nMontant payé en '+D.s.cur+' (laissez vide pour ne pas enregistrer de dépense) :','');if(a===null)return;
  let v=null;if(a.trim()!==''){v=num(a);if(isNaN(v)||v<=0)return toast('Montant invalide',1)}
  r.date=today();const o=lastOdo();if(o!=null)r.odo=o;
  if(v)D.exp.push({id:uid(),date:r.date,cat:D.s.ce.includes(r.cat)?r.cat:D.s.ce[0],desc:r.name,amt:v,note:''});
  save();render();toast('Rappel remis à zéro'+(v?' · dépense enregistrée':''))}
VW.mnt=()=>{const rec=E.rem?D.rem.find(x=>x.id==E.rem):null,v=(k,d='')=>rec&&rec[k]?rec[k]:d,
  list=D.rem.map(r=>({r,s:remStat(r)})).sort((a,b)=>a.s.rank-b.s.rank||(a.s.dd??9e9)-(b.s.dd??9e9)),
  card=({r,s})=>`<div class="col-lg-4 col-md-6"><div class="card p-3 h-100"><div class="d-flex justify-content-between align-items-start gap-2"><b>${esc(r.name)}</b><span class="badge text-bg-${s.c}">${s.lbl}</span></div>
    <div class="small text-muted mt-1">Dernière fois : ${fd(r.date)}${r.odo!=null?' · '+fn(r.odo,' km'):''}</div>
    ${s.nd?`<div class="small mt-2">Échéance : <b>${fd(s.nd)}</b> (${s.dd<0?'dépassée de '+(-s.dd)+' j':s.dd==0?'aujourd\'hui':'dans '+s.dd+' j'})</div>`:''}
    ${s.nk!=null?`<div class="small">À <b>${fn(s.nk,' km')}</b>${s.kr!=null?' ('+(s.kr<0?'dépassé de '+fn(-s.kr,' km'):'dans '+fn(s.kr,' km'))+')':''}</div>`:''}
    ${r.note?`<div class="small text-muted mt-1">${esc(r.note)}</div>`:''}
    <div class="mt-auto pt-3 d-flex gap-1"><button class="btn btn-acc btn-sm" onclick="remDone('${r.id}')"><i class="fa-solid fa-check"></i> Fait</button><button class="btn btn-sm btn-light" onclick="edit('rem','${r.id}')" aria-label="Modifier"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light text-danger" onclick="del('rem','${r.id}')" aria-label="Supprimer"><i class="fa-solid fa-trash"></i></button></div></div></div>`;
  return`${list.length?'':'<div class="alert alert-secondary">Aucun rappel pour le moment. Ajoutez l\'assurance, la vignette, le contrôle technique, les pneus…</div>'}<div class="row g-3 mb-3">${list.map(card).join('')}</div>
  <div class="card p-3 mb-3"><b class="mb-2">${rec?'Modifier':'Ajouter'} un rappel</b>
  <div class="mb-2">${RT.map(n=>`<button type="button" class="btn btn-sm btn-light me-1 mb-1" onclick="$('#m_name').value=this.textContent">${n}</button>`).join('')}</div>
  <div class="row g-2 align-items-end">${inp('m_name','Nom',v('name'),'text','col-md-4 col-12')}${inp('m_date','Dernière fois (date)',v('date',today()),'date','col-md-2 col-6')}${inp('m_odo','Compteur à ce moment (km)',v('odo',lastOdo()??''),'number','col-md-3 col-6')}${inp('m_mo','Tous les (mois)',v('mo'),'number','col-md-3 col-6')}${inp('m_km','Tous les (km)',v('km'),'number','col-md-3 col-6')}
  <div class="col-md-3 col-6"><label class="form-label small">Catégorie de la dépense</label><select class="form-select" id="m_cat">${D.s.ce.map(c=>`<option ${c==v('cat','Entretien')?'selected':''}>${esc(c)}</option>`).join('')}</select></div>${inp('m_note','Notes',v('note'),'text','col-md-6 col-12')}
  <div class="col-12"><button class="btn btn-acc" onclick="remSave()"><i class="fa-solid fa-check"></i> Enregistrer</button> ${rec?`<button class="btn btn-light" onclick="E.rem=null;render()">Annuler</button>`:''}</div></div>
  <div class="small text-muted mt-2">Renseignez un intervalle en mois (assurance, vignette, contrôle technique), en km (pneus, plaquettes) ou les deux : le rappel s'active dès qu'une des deux échéances est atteinte. « Bientôt dû » = moins de 30 jours ou moins de ${fn(D.s.warn,' km')} (seuil des Paramètres). Le bouton « Fait » remet le rappel à zéro et peut enregistrer la dépense.</div></div>`};

/* ===== Plusieurs véhicules : D = véhicule actif, DB = tous les véhicules ===== */
const vopts=()=>DB.list.map(v=>`<option value="${esc(v.id)}" ${v.id==DB.act?'selected':''}>${esc(v.s.veh)}</option>`).join('')+'<option value="__new">+ Ajouter un véhicule…</option>';
function vchg(id){if(id=='__new')return addVeh();switchVeh(id)}
function switchVeh(id,quiet){const v=DB.list.find(x=>x.id==id);if(!v)return;DB.act=id;D=v;SY=null;Object.keys(E).forEach(k=>E[k]=null);Object.keys(F).forEach(k=>delete F[k]);
  X.odo=null;X.xl=[{cat:'',desc:'',amt:''}];X.rl=[{cat:'',desc:'',amt:''}];save(1);render();if(!quiet)toast('Véhicule actif : '+v.s.veh)}
function addVeh(n){if(n===undefined)n=prompt('Nom du nouveau véhicule :','');n=(n||'').trim();if(!n){render();return}
  const d=def();Object.assign(d.s,JSON.parse(JSON.stringify(D.s)),{veh:n,remain:null,tank:null,l100ref:null});d.id=uid();DB.list.push(d);linkGh();switchVeh(d.id,1);toast('Véhicule « '+n+' » ajouté (réglages copiés depuis le précédent, données vides)')}
function delVeh(id){if(DB.list.length<2)return toast('Impossible de supprimer le seul véhicule',1);const v=DB.list.find(x=>x.id==id);if(!v)return;
  if((prompt('Supprimer « '+v.s.veh+' » et toutes ses données ('+v.km.length+' relevés, '+v.exp.length+' dépenses, '+v.rev.length+' recettes) ?\nTapez SUPPRIMER pour confirmer.')||'')!=='SUPPRIMER')return;
  const i=DB.list.indexOf(v);DB.list.splice(i,1);if(DB.act==id)switchVeh(DB.list[0].id,1);else{save();render()}
  toast('Véhicule supprimé',0,{l:'Annuler',f:()=>{DB.list.splice(Math.min(i,DB.list.length),0,v);save();render();toast('Véhicule restauré')}})}
function withVeh(v,f){const o=D,s0=SY;D=v;SY=null;try{return f()}finally{D=o;SY=s0}}
function fleet(){return DB.list.map(v=>withVeh(v,()=>{const t=T(SR()),cs=costStat();return{id:v.id,name:v.s.veh,km:t.km,v:t.v,e:t.e,net:t.net,cpk:cs.cpk,late:(D.rem||[]).filter(q=>remStat(q).rank==0).length,soon:(D.rem||[]).filter(q=>remStat(q).rank==1).length}}))}
VW.veh=()=>{const rows=fleet(),sum=k=>rows.reduce((s,x)=>s+x[k],0);
  return`<div class="card mb-3"><div class="table-responsive"><table class="table table-cards mb-0"><thead><tr><th>Véhicule</th><th class="num">Km</th><th class="num">Recettes</th><th class="num">Dépenses</th><th class="num">Solde</th><th class="num">Coût/km</th><th>Entretien</th><th></th></tr></thead><tbody>
  ${rows.map(x=>`<tr><td><b>${esc(x.name)}</b> ${x.id==DB.act?'<span class="badge text-bg-warning">actif</span>':''}</td><td class="num">${fn(x.km,' km')}</td><td class="num">${fm(x.v)}</td><td class="num">${fm(x.e)}</td><td class="num ${x.net<0?'text-danger':'text-success'}">${fm(x.net)}</td><td class="num">${x.cpk==null?'-':fn(x.cpk,' DH/km')}</td><td>${x.late?`<span class="badge text-bg-danger">${x.late} en retard</span> `:''}${x.soon?`<span class="badge text-bg-warning">${x.soon} bientôt</span>`:''}${x.late||x.soon?'':'<span class="text-muted">—</span>'}</td>
  <td class="num">${x.id==DB.act?'':`<button class="btn btn-sm btn-acc" onclick="switchVeh('${x.id}')">Activer</button> `}<button class="btn btn-sm btn-light text-danger" onclick="delVeh('${x.id}')" aria-label="Supprimer ${esc(x.name)}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
  </tbody><tfoot><tr class="fw-bold"><td>Total (${rows.length})</td><td class="num">${fn(sum('km'),' km')}</td><td class="num">${fm(sum('v'))}</td><td class="num">${fm(sum('e'))}</td><td class="num">${fm(sum('net'))}</td><td></td><td></td><td></td></tr></tfoot></table></div></div>
  <div class="card p-3 mb-3"><b class="mb-2">Ajouter un véhicule</b><div class="row g-2 align-items-end">${inp('nv_name','Nom du véhicule','','text','col-md-6 col-12')}<div class="col-md-3 col-6"><button class="btn btn-acc" onclick="addVeh($('#nv_name').value)"><i class="fa-solid fa-plus"></i> Ajouter</button></div></div></div>
  <div class="alert alert-info small">Chaque véhicule a ses propres relevés, dépenses, recettes, pleins, vidanges, rappels, budgets, saison et catégories (un nouveau véhicule reprend les réglages du véhicule actif, sans les données). Le tableau compare la saison en cours de chacun. Les imports, les exports Excel/PDF et les pages de saisie portent sur le <b>véhicule actif</b> (sélecteur en haut). La sauvegarde JSON / GitHub contient <b>tous</b> les véhicules.</div>`};

/* ===== Rapports PDF mensuel / saison + partage WhatsApp ===== */
let RM='';
const RMv=()=>RM||today().slice(0,7);
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'vehicule';
function repCtx(k){const r=k=='oil'?ALL:k=='mois'?monthR():SR();return{r,t:T(r),per:k=='mois'?MN[+RMv().slice(5,7)-1]+' '+RMv().slice(0,4):k=='oil'?'Historique complet':slabel(sy())}}
function alertsList(){return(D.rem||[]).map(q=>({q,s:remStat(q)})).filter(x=>x.s.rank<2)}
function waSummary(k,per,t){const L=['*Motor Manager Pro* — '+D.s.veh,per,'','Recettes : '+fm(t.v),'Dépenses : '+fm(t.e),'Solde net : '+fm(t.net),'Kilomètres : '+fn(t.km,' km'),'Carburant : '+fm(t.fe)];
  if(t.epk!=null)L.push('Dépenses / km : '+fn(t.epk,' DH/km'));
  if(k=='saison'){const c=costStat();if(c.cpk!=null)L.push('Coût au km (carburant + entretien + assurance) : '+fn(c.cpk,' DH/km'));if(c.live)L.push('Projection fin de saison : '+fm(c.pt)+' pour '+fn(c.pk,' km')+' ('+(c.pcpk==null?'-':fn(c.pcpk,' DH/km'))+')')}
  const al=alertsList();if((k=='saison'||k=='mois')&&al.length)L.push('','Entretien à prévoir : '+al.map(x=>x.q.name+' ('+x.s.lbl.toLowerCase()+')').join(', '));
  return L.map(x=>String(x).replace(/[\u202f\u00a0]/g,' ')).join('\n')}
function waText(k){const c=repCtx(k);window.open('https://wa.me/?text='+encodeURIComponent(waSummary(k,c.per,c.t)),'_blank')}
function pdfShare(k){const b=pdfBuild(k),f=typeof File=='function'?new File([b.d.output('blob')],b.name,{type:'application/pdf'}):null;
  if(f&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:b.name,text:b.txt}).catch(e=>{if(e&&e.name!='AbortError')toast('Partage impossible : '+e.message,1)});return}
  b.d.save(b.name);window.open('https://wa.me/?text='+encodeURIComponent(b.txt),'_blank');toast('PDF téléchargé : joignez-le à la conversation WhatsApp')}
const pdf=k=>{const b=pdfBuild(k);b.d.save(b.name)};

/* ===== Élèves : liste de noms, choix dans la saisie des cours (liste déroulante ou saisie libre) ===== */
const isCours=c=>/cours/i.test(c||'');
const stuAll=()=>D.s.students||[];
function setStu(a){D.s.students=a;DB.list.forEach(v=>v.s.students=a.slice());save();render()}
function stuAdd(){const el=$('#st_new'),ns=String(el.value||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean),cur=stuAll(),
    add=ns.filter((n,i)=>!cur.some(c=>norm(c)==norm(n))&&ns.findIndex(m=>norm(m)==norm(n))==i);
  if(!ns.length)return toast('Saisissez au moins un nom',1);if(!add.length)return toast('Ces élèves sont déjà dans la liste',1);
  setStu([...cur,...add]);toast(add.length+' élève'+(add.length>1?'s ajoutés':' ajouté'))}
function stuRename(i){const old=stuAll()[i],n=(prompt('Nouveau nom pour « '+old+' » :',old)||'').trim();if(!n||n==old)return;
  if(stuAll().some((c,j)=>j!=i&&norm(c)==norm(n)))return toast('Ce nom existe déjà',1);
  const k=DB.list.reduce((s,v)=>s+v.rev.filter(r=>r.desc==old).length,0);
  if(k&&confirm('Renommer aussi les '+k+' recette'+(k>1?'s':'')+' déjà enregistrée'+(k>1?'s':'')+' au nom de « '+old+' » ?'))DB.list.forEach(v=>v.rev.forEach(r=>{if(r.desc==old)r.desc=n}));
  const a=stuAll().slice();a[i]=n;setStu(a);toast('Élève renommé')}
function stuDel(i){const n=stuAll()[i];if(!confirm('Retirer « '+n+' » de la liste ?\nLes recettes déjà enregistrées ne sont pas modifiées.'))return;
  const a=stuAll().slice();a.splice(i,1);setStu(a);toast('Élève retiré de la liste',0,{l:'Annuler',f:()=>{const b=stuAll().slice();b.splice(Math.min(i,b.length),0,n);setStu(b)}})}
/* description d'une recette dans la saisie du jour : liste d'élèves pour les catégories « cours », champ libre sinon (ou via « Autre ») */
function descCtl(k,i,r){const st=stuAll(),cat=r.cat||D.s.cr[0],plain=`<input class="form-control" placeholder="Description" value="${esc(r.desc)}" oninput="X.${k}[${i}].desc=this.value">`;
  if(k!='rl'||!isCours(cat))return plain;
  if(!st.length)return plain+'<div class="form-text">Ajoutez vos élèves dans l\'onglet « Élèves » pour les choisir dans une liste.</div>';
  if(r.free||(r.desc&&!st.includes(r.desc)))return`<div class="input-group"><input class="form-control" placeholder="Nom ou description (saisie libre)" value="${esc(r.desc)}" oninput="X.rl[${i}].desc=this.value;X.rl[${i}].free=true"><button class="btn btn-light" type="button" title="Choisir dans la liste" aria-label="Choisir dans la liste" onclick="X.rl[${i}].free=false;X.rl[${i}].desc='';render()"><i class="fa-solid fa-list"></i></button></div>`;
  return`<select class="form-select" onchange="stuPick(${i},this.value)"><option value="">— Choisir un élève —</option>${st.map(n=>`<option ${n==r.desc?'selected':''}>${esc(n)}</option>`).join('')}<option value="__free">✎ Autre (saisie libre)…</option></select>`}
function stuPick(i,v){const r=X.rl[i];if(v=='__free'){r.free=true;r.desc='';render()}else{r.desc=v;r.free=false}}
/* même principe dans le formulaire des recettes (historique) */
function stuField(rec){const st=stuAll(),v=rec&&rec.desc||'',cours=isCours(rec?rec.cat:D.s.cr[0]),list=st.length&&cours&&(!v||st.includes(v));
  return`<div class="col-md-3 col-6"><label class="form-label small">Description / élève</label>
  <select class="form-select ${list?'':'d-none'}" id="f_stsel" onchange="stuSel(this.value)"><option value="">— Choisir un élève —</option>${st.map(n=>`<option ${n==v?'selected':''}>${esc(n)}</option>`).join('')}<option value="__free">✎ Autre (saisie libre)…</option></select>
  <input class="form-control ${list?'d-none':''}" id="f_desc" placeholder="Nom ou description" value="${esc(v)}">
  <a href="#" class="small ${st.length&&cours&&!list?'':'d-none'}" id="f_stback" onclick="stuBack();return false">↩ choisir dans la liste</a></div>`}
const cl=(e,c,on)=>e&&e.classList[on?'add':'remove'](c);
function stuSel(v){const t=$('#f_desc');if(v=='__free'){cl($('#f_stsel'),'d-none',1);cl(t,'d-none',0);cl($('#f_stback'),'d-none',0);t.value='';t.focus()}else t.value=v}
function stuBack(){cl($('#f_stsel'),'d-none',0);cl($('#f_desc'),'d-none',1);cl($('#f_stback'),'d-none',1);$('#f_stsel').value='';$('#f_desc').value=''}
function stuCat(){const st=stuAll(),c=$('#f_cat'),s=$('#f_stsel'),t=$('#f_desc');if(!c||!s||!t)return;const cours=isCours(c.value),list=cours&&st.length&&(!t.value||st.includes(t.value));
  cl(s,'d-none',!list);cl(t,'d-none',!!list);cl($('#f_stback'),'d-none',!(cours&&st.length&&!list));if(list)s.value=st.includes(t.value)?t.value:''}
VW.stu=()=>{const r=SR(),st=stuAll(),rv=DB.list.flatMap(v=>v.rev).filter(x=>isCours(x.cat)&&inR(x.date,r)),
  rows=st.map((n,i)=>{const L=rv.filter(x=>x.desc==n);return{n,i,c:L.length,t:L.reduce((s,x)=>s+x.amt,0),last:L.length?srt(L)[0].date:''}}),
  lib=rv.filter(x=>!st.includes(x.desc)),tot=rows.reduce((s,x)=>s+x.t,0)+lib.reduce((s,x)=>s+x.amt,0);
  return`<div class="card p-3 mb-3"><b class="mb-2"><i class="fa-solid fa-user-plus"></i> Ajouter des élèves</b><div class="row g-2 align-items-end">${inp('st_new','Nom(s) (séparés par une virgule ou un retour à la ligne)','','text','col-md-6 col-12')}<div class="col-md-3 col-6"><button class="btn btn-acc" onclick="stuAdd()"><i class="fa-solid fa-plus"></i> Ajouter</button></div></div>
  <div class="small text-muted mt-2">Dans « Saisie du jour » et « Recettes », quand la catégorie contient « cours », la description devient une <b>liste déroulante</b> de ces élèves, avec l'option <b>« Autre (saisie libre) »</b> pour un nom absent de la liste.</div></div>
  <div class="row g-2 mb-2">${ssel()}</div>
  <div class="card mb-3"><div class="table-responsive"><table class="table table-cards mb-0"><thead><tr><th>Élève</th><th class="num">Séances</th><th class="num">Total encaissé</th><th>Dernière séance</th><th></th></tr></thead><tbody>
  ${rows.length?rows.map(x=>`<tr><td><b>${esc(x.n)}</b></td><td class="num">${x.c}</td><td class="num">${fm(x.t)}</td><td>${x.last?fd(x.last):'—'}</td><td class="num"><button class="btn btn-sm btn-light" onclick="stuRename(${x.i})" aria-label="Renommer ${esc(x.n)}"><i class="fa-solid fa-pen"></i></button> <button class="btn btn-sm btn-light text-danger" onclick="stuDel(${x.i})" aria-label="Retirer ${esc(x.n)}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''):'<tr><td colspan="5" class="text-muted">Aucun élève pour le moment.</td></tr>'}
  ${lib.length?`<tr><td><i>Autres (saisie libre)</i></td><td class="num">${lib.length}</td><td class="num">${fm(lib.reduce((s,x)=>s+x.amt,0))}</td><td>${fd(srt(lib)[0].date)}</td><td></td></tr>`:''}
  </tbody><tfoot><tr class="fw-bold"><td>Total des cours (${esc(slabel(sy()))})</td><td class="num">${rv.length}</td><td class="num">${fm(tot)}</td><td></td><td></td></tr></tfoot></table></div></div>`};

/* ===== Tableau de bord & statistiques ===== */
VW.dash=()=>{const r=range(),t=T(r),ms=monthly(),L=ms.map(x=>x.name.slice(0,4)),fs=fstat(),o=oilStat();
  AF=()=>{ch('c1','bar',L,[{label:'Recettes',data:ms.map(x=>x.v)},{label:'Dépenses',data:ms.map(x=>x.e)}]);ch('c2','line',L,[{label:'Solde net (DH)',data:ms.map(x=>x.net)}]);const cs=catSum(D.exp,r);ch('c3','doughnut',Object.keys(cs),[{data:Object.values(cs)}]);
    const kd=kmRows().filter(x=>x.ok&&inR(x.date,r)).slice(-60);ch('c4','bar',kd.map(x=>fd(x.date).slice(0,5)),[{label:'Km du jour',data:kd.map(x=>x.dist)}]);ch('c5','bar',L,[{label:'Km',data:ms.map(x=>x.km)}]);ch('c6','line',fs.cs.map(c=>fd(c.date)),[{label:'L/100 km',data:fs.cs.map(c=>c.l100)}]);ch('c7','line',L,[{label:'Carburant (DH)',data:ms.map(x=>x.fe)}])};
  const sel=(v,l)=>`<option value="${v}" ${P.type==v?'selected':''}>${l}</option>`;
  return`${bnr()}${gauge()}${budCard()}${costCard()}<div class="row g-2 mb-3 align-items-end"><div class="col-md-3 col-6"><label class="form-label small">Période</label><select class="form-select" onchange="P.type=this.value;render()">${sel('saison','Saison complète')}${sel('courant','Mois courant')}${sel('prec','Mois précédent')}${sel('custom','Période personnalisée')}</select></div>${ssel()}
  ${P.type=='custom'?inp('p1','Du',P.from,'date','col-md-3 col-6','onchange="P.from=this.value;render()"')+inp('p2','Au',P.to,'date','col-md-3 col-6','onchange="P.to=this.value;render()"'):''}</div>
  <div class="row g-3">${kp('Total recettes',fm(t.v))}${kp('Total dépenses',fm(t.e))}${kp('Solde net',fm(t.net),sgn(t.net))}${kp('Moyenne recettes / jour',fm(t.avv))}${kp('Moyenne dépenses / jour',fm(t.ave))}${kp('Kilométrage total',fn(t.km,' km'))}${kp('Moyenne km / jour',fn(t.avk,' km'))}${kp('Conso moyenne',fs.l100==null?'-':fn(fs.l100,' L/100 km'))}${kp('Autonomie estimée',fs.range==null?'-':fn(fs.range,' km'))}${kp('Prochaine vidange',o?fn(o.rem,' km restants'):'-',o?o.c:'')}</div>
  <div class="row g-3 mt-1">${cb('c1','Recettes vs dépenses par mois')}${cb('c2','Évolution du solde net')}${cb('c3','Dépenses par catégorie')}${cb('c4','Kilométrage journalier (60 derniers jours)')}${cb('c5','Kilométrage mensuel')}${cb('c6','Consommation (L/100 km)')}${cb('c7','Dépenses de carburant')}</div>`};
VW.stat=()=>{const ms=monthly(),r=SR(),t=T(r),a=avgs(ms),L=ms.map(x=>x.name.slice(0,4)),days={};
  kmRows().filter(x=>x.ok&&inR(x.date,r)).forEach(x=>(days[x.date]=days[x.date]||{km:0,e:0,v:0}).km+=x.dist);D.exp.filter(x=>inR(x.date,r)).forEach(x=>(days[x.date]=days[x.date]||{km:0,e:0,v:0}).e+=x.amt);D.rev.filter(x=>inR(x.date,r)).forEach(x=>(days[x.date]=days[x.date]||{km:0,e:0,v:0}).v+=x.amt);
  AF=()=>{ch('s1','bar',L,[{label:'Recettes',data:ms.map(x=>x.v)},{label:'Dépenses',data:ms.map(x=>x.e)}]);ch('s2','bar',L,[{label:'Km',data:ms.map(x=>x.km)}]);const ce=catSum(D.exp,r),cr=catSum(D.rev,r);ch('s3','doughnut',Object.keys(ce),[{data:Object.values(ce)}]);ch('s4','doughnut',Object.keys(cr),[{data:Object.values(cr)}]);ch('s5','line',L,[{label:'Carburant (DH)',data:ms.map(x=>x.fe)}]);ch('s6','line',L,[{label:'Solde net (DH)',data:ms.map(x=>x.net)}])};
  return`<div class="row g-2 mb-3">${ssel()}</div><p class="text-muted small">Les moyennes ne portent que sur les mois (ou jours) contenant des données réelles, indicateur par indicateur. Les mois futurs vides sont affichés mais exclus.</p>
  <div class="row g-3 mb-3">${kp('Recettes de la saison',fm(t.v))}${kp('Dépenses de la saison',fm(t.e))}${kp('Solde net de la saison',fm(t.net),sgn(t.net))}${kp('Total kilomètres',fn(t.km,' km'))}${kp('Recette mensuelle moyenne',fm(a.v))}${kp('Dépense mensuelle moyenne',fm(a.e))}${kp('Kilométrage mensuel moyen',fn(a.km,' km'))}${kp('Dépenses / km',t.epk==null?'-':fn(t.epk,' DH/km'))}${kp('Moyenne recettes / jour',fm(t.avv))}${kp('Moyenne dépenses / jour',fm(t.ave))}${kp('Moyenne km / jour',fn(t.avk,' km'))}${kp('Recettes / km',t.vpk==null?'-':fn(t.vpk,' DH/km'))}</div>
  <div class="card mb-3"><div class="table-responsive"><table class="table table-cards mb-0"><thead><tr><th>Mois</th><th class="num">Kilométrage</th><th class="num">Dépenses</th><th class="num">Recettes</th><th class="num">Solde</th><th class="num">Carburant</th><th class="num">Dép./km</th><th class="num">Rec./km</th></tr></thead><tbody>
  ${ms.map(x=>`<tr><td>${x.name}</td><td class="num">${x.ak?fn(x.km,' km'):'-'}</td><td class="num">${x.ae?fm(x.e):'-'}</td><td class="num">${x.av?fm(x.v):'-'}</td><td class="num">${x.ae||x.av?fm(x.net):'-'}</td><td class="num">${x.fe?fm(x.fe):'-'}</td><td class="num">${fn(x.epk)}</td><td class="num">${fn(x.vpk)}</td></tr>`).join('')}
  </tbody><tfoot><tr class="fw-bold"><td>Total</td><td class="num">${fn(t.km,' km')}</td><td class="num">${fm(t.e)}</td><td class="num">${fm(t.v)}</td><td class="num">${fm(t.net)}</td><td class="num">${fm(t.fe)}</td><td class="num">${fn(t.epk)}</td><td class="num">${fn(t.vpk)}</td></tr><tr class="fw-bold"><td>Moyenne (mois actifs)</td><td class="num">${fn(a.km,' km')}</td><td class="num">${fm(a.e)}</td><td class="num">${fm(a.v)}</td><td colspan="4"></td></tr></tfoot></table></div></div>
  ${costCard()}<div class="row g-3 mb-3">${cb('s1','Recettes vs dépenses')}${cb('s2','Kilométrage par mois')}${cb('s3','Dépenses par catégorie')}${cb('s4','Recettes par catégorie')}${cb('s5','Dépenses de carburant')}${cb('s6','Évolution du solde net')}</div>
  <h2 class="sec">Résultat journalier (30 derniers jours d'activité)</h2><div class="card"><div class="table-responsive"><table class="table table-cards mb-0"><thead><tr><th>Date</th><th class="num">Km</th><th class="num">Dépenses</th><th class="num">Recettes</th><th class="num">Résultat</th></tr></thead><tbody>${Object.keys(days).sort().reverse().slice(0,30).map(d=>{const x=days[d];return`<tr><td>${fd(d)}</td><td class="num">${fn(x.km,' km')}</td><td class="num">${fm(x.e)}</td><td class="num">${fm(x.v)}</td><td class="num ${x.v-x.e<0?'text-danger':'text-success'}">${fm(x.v-x.e)}</td></tr>`}).join('')||'<tr><td colspan="5" class="text-center text-muted p-3">Aucune activité</td></tr>'}</tbody></table></div></div>`};

/* ===== Exports Excel & PDF ===== */
function sheet(k,r){const S=a=>srt(a.filter(x=>inR(x.date,r)),1),n=(a,i)=>a[i];
  if(k=='exp'||k=='rev')return[k=='exp'?'Dépenses':'Recettes',['Date','Catégorie','Description','Montant (DH)','Notes'],S(D[k]).map(x=>[fd(x.date),x.cat,x.desc,x.amt,x.note]),[3],[3]];
  if(k=='km')return['Kilométrage',['Date','Relevé précédent','Compteur (km)','Distance (km)'],kmRows().filter(x=>inR(x.date,r)).map(x=>[fd(x.date),x.prev,x.odo,x.dist]),[],[3]];
  if(k=='fuel')return['Pleins',['Date','Compteur (km)','Litres','Montant (DH)','Prix/L (DH)','Type'],S(D.fuel).map(x=>[fd(x.date),x.odo,x.liters,x.amt,x.ppl,x.full?'Complet':'Partiel']),[3,4],[2,3]];
  if(k=='cyc')return['Consommation',['Date','Compteur (km)','Distance (km)','Litres','L/100 km','km/L','Coût (DH)','DH/km'],cycles().filter(x=>inR(x.date,r)).map(x=>[fd(x.date),x.odo,x.dist,x.l,x.l100,x.kml,x.cost,x.cpk]),[6,7],[2,3,6]];
  if(k=='oil')return['Vidanges',['Date','Compteur (km)','Intervalle (km)','Huile','Montant (DH)'],S(D.oil).map(x=>[fd(x.date),x.odo,x.ivl,x.type,x.amt]),[4],[4]];
  return['Statistiques',['Mois','Km','Dépenses (DH)','Recettes (DH)','Solde (DH)','Carburant (DH)','Dép./km','Rec./km'],monthly().map(x=>[x.name,x.km,x.e,x.v,x.net,x.fe,x.epk,x.vpk]),[2,3,4,5],[1,2,3,4,5]]}
function xl(keys,name,r=ALL){const wb=XLSX.utils.book_new();keys.forEach(k=>{const[n,h,rows,money,tot]=sheet(k,r),tr=h.map((_,i)=>i==0?'Total':tot.includes(i)?rows.reduce((s,x)=>s+(+x[i]||0),0):''),ws=XLSX.utils.aoa_to_sheet([h,...rows,tr]);
  ws['!cols']=h.map((x,i)=>({wch:Math.max(x.length,...rows.map(q=>String(q[i]??'').length))+3}));
  for(let q=1;q<=rows.length+1;q++)money.forEach(c=>{const a=ws[XLSX.utils.encode_cell({r:q,c})];if(a&&typeof a.v=='number')a.z='#,##0.00 "DH"'});XLSX.utils.book_append_sheet(wb,ws,n)});
  XLSX.writeFile(wb,name+'-'+slug(D.s.veh)+'-'+today()+'.xlsx')}
const monthR=()=>{const k=RMv();return[k+'-01',k+'-31']};
function pdfBuild(k){const{jsPDF}=window.jspdf,d=new jsPDF();let y=34;const now=new Date(),r=k=='oil'?ALL:k=='mois'?monthR():SR(),t=T(r),ti={mois:'Rapport financier mensuel',saison:'Rapport saisonnier complet',exp:'Détail des dépenses',rev:'Détail des recettes',km:'Rapport kilométrage',fuel:'Rapport carburant',oil:'Historique des vidanges'}[k],per=k=='mois'?MN[+RMv().slice(5,7)-1]+' '+RMv().slice(0,4):k=='oil'?'Historique complet':slabel(sy()),cl=s=>String(s).replace(/[\u202f\u00a0]/g,' ');
  d.setFillColor(20,33,61);d.rect(0,0,210,24,'F');d.setTextColor(255);d.setFontSize(15);d.setFont('helvetica','bold');d.text('MOTOR MANAGER PRO',14,15);d.setFontSize(9);d.setFont('helvetica','normal');d.text(ti,196,15,{align:'right'});d.setTextColor(0);
  const txt=(s,b,z)=>{if(y>282){d.addPage();y=18}d.setFont('helvetica',b?'bold':'normal');d.setFontSize(z||10);d.text(cl(s),14,y);y+=z?8:6};
  txt(D.s.veh+'  |  '+per+'  |  Généré le '+fd(today()),0,9);y+=2;
  [['Recettes',fm(t.v)],['Dépenses',fm(t.e)],['Solde net',fm(t.net)],['Kilomètres',fn(t.km,' km')],['Carburant',fm(t.fe)],['Dépenses/km',fn(t.epk,' DH/km')],['Recettes/km',fn(t.vpk,' DH/km')]].forEach(x=>txt(x[0]+' : '+x[1],1));y+=3;
  if(k=='saison'){const c=costStat();[['Coût carburant',fm(c.c.Carburant)],['Coût entretien et vidange',fm(c.c.Entretien)],['Coût assurance',fm(c.c.Assurance)],['Coût total au km',c.cpk==null?'-':fn(c.cpk,' DH/km')]].forEach(x=>txt(x[0]+' : '+x[1],1));if(c.live)txt('Projection fin de saison : '+fm(c.pt)+' pour '+fn(c.pk,' km'),1);y+=3}
  const al=alertsList();if((k=='saison'||k=='mois')&&al.length){txt('Entretien à prévoir :',1);al.forEach(x=>txt('- '+x.q.name+' ('+x.s.lbl.toLowerCase()+(x.s.nd?', échéance '+fd(x.s.nd):'')+')',0));y+=3}
  if(k=='saison'||k=='mois'){const ms=monthly(),c=document.createElement('canvas');c.width=900;c.height=360;const cc=new Chart(c,{type:'bar',data:{labels:ms.map(x=>x.name.slice(0,4)),datasets:[{label:'Recettes',data:ms.map(x=>x.v),backgroundColor:'#1f6f8b'},{label:'Dépenses',data:ms.map(x=>x.e),backgroundColor:'#e07a5f'}]},options:{animation:false,responsive:false}});const im=c.toDataURL('image/png');cc.destroy();d.addImage(im,'PNG',14,y,180,72);y+=78}
  const keys={mois:['exp','rev'],saison:['stat'],exp:['exp'],rev:['rev'],km:['km'],fuel:['fuel','cyc'],oil:['oil']}[k];
  keys.forEach(s=>{const[n,h,rows,,tot]=sheet(s,r),w=182/h.length;y+=2;txt(n,1,11);
    const line=(a,b)=>{if(y>284){d.addPage();y=18}d.setFont('helvetica',b?'bold':'normal');d.setFontSize(8);a.forEach((c,i)=>{const x=14+w*i;typeof c=='number'?d.text(cl(nf.format(c)),x+w-2,y,{align:'right'}):d.text(cl(c??'').slice(0,Math.floor(w/1.8)),x,y)});y+=5.5};
    line(h,1);rows.forEach(q=>line(q));line(h.map((_,i)=>i==0?'Total':tot.includes(i)?rows.reduce((s2,x)=>s2+(+x[i]||0),0):''),1)});
  return{d,name:'motor-manager-'+slug(D.s.veh)+'-'+k+'-'+today()+'.pdf',txt:waSummary(k,per,t)}}
VW.rep=()=>{const b=(f,l,i)=>`<button class="btn btn-outline-dark btn-sm me-1 mb-1" onclick="${f}"><i class="fa-solid fa-${i}"></i> ${l}</button>`;
  const xb=(l,ks,n,r)=>b(`xl(${JSON.stringify(ks).replace(/"/g,"'")},'${n}',${r})`,l,'file-excel');
  return`<div class="row g-3"><div class="col-lg-6"><div class="card p-3 h-100"><b>Exports Excel</b><p class="small text-muted">Tri chronologique, formats DH et dates, totaux, colonnes ajustées.</p>${xb('Rapport complet',['exp','rev','km','fuel','cyc','oil','stat'],'rapport-complet','ALL')}${xb('Rapport mensuel',['exp','rev','km','fuel','cyc','oil'],'rapport-mensuel','monthR()')}${xb('Rapport saisonnier',['exp','rev','km','fuel','cyc','oil','stat'],'rapport-saisonnier','SR()')}${xb('Dépenses',['exp'],'depenses','ALL')}${xb('Recettes',['rev'],'recettes','ALL')}${xb('Kilométrage',['km'],'kilometrage','ALL')}${xb('Consommation carburant',['fuel','cyc'],'carburant','ALL')}${xb('Vidanges',['oil'],'vidanges','ALL')}</div></div>
  <div class="col-lg-6"><div class="card p-3 h-100"><b>Rapports PDF</b><p class="small text-muted">Indicateurs, graphique (rapports mensuel et saisonnier), coût au km, entretien à prévoir, tableaux et totaux. Le mois choisi vaut aussi pour l'export Excel mensuel.</p><div class="row g-2 mb-2"><div class="col-md-4 col-6"><label class="form-label small">Mois (rapport mensuel)</label><input type="month" class="form-control" value="${RMv()}" onchange="RM=this.value;render()"></div>${ssel()}</div>${b("pdf('mois')",'Mensuel','file-pdf')}${b("pdf('saison')",'Saisonnier','file-pdf')}${b("pdf('exp')",'Dépenses','file-pdf')}${b("pdf('rev')",'Recettes','file-pdf')}${b("pdf('km')",'Kilométrage','file-pdf')}${b("pdf('fuel')",'Carburant','file-pdf')}${b("pdf('oil')",'Vidanges','file-pdf')}
  <hr class="my-3"><b><i class="fa-brands fa-whatsapp"></i> Partager sur WhatsApp</b><p class="small text-muted mt-1">Sur téléphone, le menu de partage s'ouvre avec le PDF joint : choisissez WhatsApp. Sinon le PDF est téléchargé et WhatsApp s'ouvre avec le résumé : joignez simplement le fichier.</p>${b("pdfShare('mois')",'PDF mensuel','share-nodes')}${b("pdfShare('saison')",'PDF saisonnier','share-nodes')}${b("waText('mois')",'Résumé mensuel (texte)','comment')}${b("waText('saison')",'Résumé saisonnier (texte)','comment')}</div></div></div>`};

/* ===== Sauvegarde locale JSON ===== */
const APP_VER='2026.11.24';
/* Un seul véhicule : format v2, lisible par TOUTES les versions de l'app. Plusieurs véhicules : format v3 (versions récentes uniquement). */
const snapshot=()=>{const vs=DB.list.map(v=>{const d=JSON.parse(JSON.stringify(v));delete d.s.gh;return d}),b={app:'motor-manager-pro',exportedAt:new Date().toISOString(),appVersion:APP_VER};return vs.length==1?{...b,version:2,data:vs[0]}:{...b,version:3,data:{act:DB.act,vehicles:vs}}};
const hash=o=>{const s=JSON.stringify(o);let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h+':'+s.length};
const validV=d=>d&&d.s&&['km','exp','rev','fuel','oil'].every(k=>Array.isArray(d[k]))&&Array.isArray(d.s.ce)&&Array.isArray(d.s.cr);
const badB=o=>o&&o.app=='motor-manager-pro'&&o.version>3?'Cette sauvegarde vient d\'une version plus récente de l\'application : mettez cet appareil à jour (Sauvegarde › Mettre à jour l\'application) puis réessayez':'Sauvegarde invalide ou version non prise en charge';
function validB(o){return o&&o.app=='motor-manager-pro'&&typeof o.version=='number'&&o.version<=3&&o.data&&(o.version>=3?Array.isArray(o.data.vehicles)&&o.data.vehicles.length>0&&o.data.vehicles.every(validV):validV(o.data))}
function restore(o,src,fromGh){if(!validB(o))return toast(badB(o),1);const vs=o.version>=3?o.data.vehicles:[o.data],c=k=>vs.reduce((a,v)=>a+v[k].length,0);
  if(!confirm('Restaurer la sauvegarde '+src+' du '+new Date(o.exportedAt).toLocaleString('fr-FR')+' ?\n\n'+vs.length+' véhicule'+(vs.length>1?'s':'')+' : '+c('km')+' relevés, '+c('exp')+' dépenses, '+c('rev')+' recettes, '+c('fuel')+' pleins, '+c('oil')+' vidanges.\n\nLes données actuelles de cet appareil seront REMPLACÉES.'))return;
  const list=vs.map(v=>{const d=merge(def(),v);d.id=v.id||uid();return d}),act=o.version>=3&&list.some(v=>v.id==o.data.act)?o.data.act:list[0].id;
  DB={v:3,act,list,gh:DB.gh};D=list.find(v=>v.id==act);linkGh();SY=null;Object.keys(E).forEach(k=>E[k]=null);save(true);if(fromGh){M.hash=hash(snapshot().data);M.dirty=false}else{M.dirty=true}saveM();render();toast('Données restaurées : statistiques recalculées')}
function jsonOut(){M.local=new Date().toISOString();saveM();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,1)],{type:'application/json'}));a.download='motor-manager-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);if(V=='bak')render()}
function jsonIn(i){const f=i.files[0];if(!f)return;f.text().then(t=>{try{restore(JSON.parse(t),f.name)}catch(e){toast('Fichier JSON illisible',1)}});i.value=''}
function resetAll(){if(prompt('Cette action efface TOUTES les données locales (tous les véhicules). Tapez SUPPRIMER pour confirmer.')!=='SUPPRIMER')return;const d=def();d.id=uid();DB={v:3,act:d.id,list:[d],gh:DB.gh};D=d;linkGh();SY=null;save();render();toast('Données réinitialisées')}
VW.bak=()=>{AF=()=>{storageInfo();offlineInfo()};const g=D.s.gh,t=tok(),fo=(v,l)=>`<option value="${v}" ${g.freq==v?'selected':''}>${l}</option>`;
  return`<div class="card p-3 mb-3"><b>Sauvegarde locale (JSON, tous les véhicules)</b><p class="small text-muted">Dernier export : ${M.local?new Date(M.local).toLocaleString('fr-FR'):'jamais'}. Le jeton GitHub n'est jamais inclus.<br>Version de l'application : <b>${APP_VER}</b> · format de sauvegarde ${DB.list.length>1?'v3 (plusieurs véhicules : les anciennes versions ne peuvent pas la lire)':'v2 (lisible par toutes les versions)'}.</p><div id="stinfo" class="small mb-1"></div><div id="offinfo" class="small mb-1"></div><button class="btn btn-outline-secondary btn-sm mb-2" onclick="prepOffline()"><i class="fa-solid fa-plane"></i> Préparer le mode hors ligne</button>
  <div><button class="btn btn-outline-dark btn-sm me-1 mb-1" onclick="jsonOut()"><i class="fa-solid fa-download"></i> Télécharger</button><label class="btn btn-outline-dark btn-sm me-1 mb-1"><i class="fa-solid fa-upload"></i> Restaurer un fichier<input type="file" accept=".json" hidden onchange="jsonIn(this)"></label><button class="btn btn-outline-secondary btn-sm me-1 mb-1" onclick="mmpRepair()" title="Vide le cache de l'application (pas vos données) et recharge la dernière version"><i class="fa-solid fa-arrows-rotate"></i> Mettre à jour l'application</button><button class="btn btn-outline-danger btn-sm mb-1" onclick="resetAll()"><i class="fa-solid fa-trash"></i> Réinitialiser</button></div></div>
  <div class="card p-3 mb-3"><b><i class="fa-brands fa-github"></i> Sauvegardes GitHub datées</b><div class="alert alert-info small my-2">Chaque sauvegarde crée un <b>nouveau fichier daté</b> (ex. <code>motor-manager_2026-11-22_21-40-05.json</code>) dans le dossier choisi : aucune ne remplace la précédente, donc <b>aucun conflit</b>. En mode « Quotidienne », une sauvegarde est faite automatiquement chaque jour à l'ouverture de l'application, si des données ont changé depuis la dernière. Pour restaurer, ouvrez la liste et <b>choisissez la sauvegarde voulue</b>. Vous pouvez aussi supprimer les anciennes : automatiquement après la durée choisie (après chaque sauvegarde réussie), avec « Supprimer les anciennes », ou une par une avec la corbeille. Le nettoyage conserve toujours les 5 plus récentes et ne touche que les fichiers créés par l\'application (<code>motor-manager_date_heure.json</code>).</div><div id="ghst" class="my-2">${ghStatus()}</div>
  <div class="alert alert-warning small py-2">Le stockage du navigateur (LocalStorage) n'est pas chiffré : le jeton enregistré ici est accessible à toute personne ayant accès à ce navigateur. Une application sans serveur ne peut pas protéger un secret comme le ferait un serveur. Utilisez un dépôt <b>privé</b> et un jeton « fine-grained » limité à ce seul dépôt, avec la permission « Contents : Read and write ».</div>
  <div class="row g-2">${inp('gh_owner','Utilisateur / propriétaire',g.owner)}${inp('gh_repo','Nom du dépôt',g.repo)}${inp('gh_branch','Branche',g.branch)}${inp('gh_dir','Dossier des sauvegardes',bdir(g))}
  <div class="col-md-3 col-6"><label class="form-label small">Sauvegarde automatique</label><select class="form-select" id="gh_freq">${fo('daily','Quotidienne (automatique)')}${fo('weekly','Hebdomadaire (automatique)')}${fo('manual','Manuelle uniquement')}</select></div>
  <div class="col-md-3 col-6"><label class="form-label small">Suppression des anciennes sauvegardes</label><select class="form-select" id="gh_keep">${[[0,'Jamais (tout conserver)'],[30,'Après 30 jours'],[60,'Après 60 jours'],[90,'Après 90 jours'],[180,'Après 6 mois'],[365,'Après 1 an']].map(o=>`<option value="${o[0]}" ${(+g.keep||0)==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
  
  <div class="col-md-6"><label class="form-label small">Jeton d'accès personnel — actuel : <b>${t?'••••••••••••'+esc(t.slice(-4)):'aucun'}</b></label><input class="form-control" id="gh_tok" type="password" autocomplete="off" placeholder="Coller un jeton pour enregistrer ou remplacer"></div></div>
  <div class="mt-3"><button class="btn btn-outline-dark btn-sm me-1 mb-1" onclick="ghCfg(true)">Enregistrer la configuration</button><button class="btn btn-outline-dark btn-sm me-1 mb-1" onclick="ghTest()"><i class="fa-solid fa-plug"></i> Tester la connexion</button><button class="btn btn-acc btn-sm me-1 mb-1" onclick="ghCfg();ghPush(true)"><i class="fa-solid fa-cloud-arrow-up"></i> Sauvegarder maintenant</button><button class="btn btn-outline-dark btn-sm me-1 mb-1" onclick="ghList()"><i class="fa-solid fa-clock-rotate-left"></i> Voir les sauvegardes et restaurer</button><button class="btn btn-outline-danger btn-sm me-1 mb-1" onclick="ghCfg();ghPrune(true)"><i class="fa-solid fa-broom"></i> Supprimer les anciennes</button><button class="btn btn-outline-danger btn-sm mb-1" onclick="tokDel()">Supprimer le jeton</button></div>
  <div id="blist" class="mt-3"></div>
  <div class="small text-muted mt-2">Pour révoquer le jeton côté GitHub : Settings › Developer settings › Personal access tokens. L'application reste utilisable sans GitHub ; les données restent d'abord dans ce navigateur.</div></div>`};

/* ===== Paramètres ===== */
VW.set=()=>{const s=D.s,g=s.gh,t=tok(),op=v=>MN.map((n,i)=>`<option value="${i+1}" ${i+1==v?'selected':''}>${n}</option>`).join(''),ta=(id,l,a)=>`<div class="col-md-4"><label class="form-label small">${l} (une par ligne)</label><textarea class="form-control" id="${id}" rows="6">${esc(a.join('\n'))}</textarea></div>`,fo=(v,l)=>`<option value="${v}" ${g.freq==v?'selected':''}>${l}</option>`;
  return`<div class="card p-3 mb-3"><div class="row g-3">${inp('s_veh','Nom du véhicule',s.veh)}<div class="col-md-3 col-6"><label class="form-label small">Début de saison</label><select class="form-select" id="s_start">${op(s.start)}</select></div><div class="col-md-3 col-6"><label class="form-label small">Fin de saison</label><select class="form-select" id="s_end">${op(s.end)}</select></div>${inp('s_cur','Devise',s.cur)}
  ${inp('s_price','Prix du carburant (DH/L)',s.price,'number')}${inp('s_ivl','Intervalle de vidange (km)',s.ivl,'number')}${inp('s_warn','Seuil d\'alerte entretien et vidange (km avant)',s.warn,'number')}${inp('s_big','Alerte écart de compteur (km)',s.big,'number')}${inp('s_rd','Rappel de sauvegarde (jours, 0 = off)',s.rd,'number')}
  ${ta('s_ce','Catégories de dépenses',s.ce)}${ta('s_cr','Catégories de recettes',s.cr)}</div>${budF()}<div class="mt-3"><button class="btn btn-acc" onclick="setSave()">Enregistrer les paramètres</button></div></div>`};
function setSave(){const g=i=>$('#'+i).value,n=i=>num(g(i)),L=i=>[...new Set(g(i).split('\n').map(x=>x.trim()).filter(Boolean))];
  const p=n('s_price'),iv=n('s_ivl'),w=n('s_warn'),b=n('s_big'),rd=n('s_rd'),ce=L('s_ce'),cr=L('s_cr');
  if(!(p>0)||!(iv>0)||isNaN(w)||w<0||!(b>0)||isNaN(rd)||rd<0)return toast('Valeurs numériques invalides',1);if(!ce.length||!cr.length)return toast('Les listes de catégories ne peuvent pas être vides',1);
  const bud={};let bb=false;document.querySelectorAll('[data-bud]').forEach(i=>{const v=num(i.value);if(i.value.trim()!==''&&(isNaN(v)||v<0))bb=true;else if(v>0&&ce.includes(i.dataset.bud))bud[i.dataset.bud]=v});if(bb)return toast('Budget invalide',1);
  Object.assign(D.s,{bud,veh:g('s_veh').trim()||'Mon véhicule',start:+g('s_start'),end:+g('s_end'),price:p,ivl:iv,warn:w,big:b,rd,cur:g('s_cur')||'DH',ce,cr});DB.list.forEach(v=>{v.s.rd=D.s.rd;v.s.cur=D.s.cur});SY=null;save();toast('Paramètres enregistrés');render()}

/* ===== Sauvegarde GitHub (API Contents) ===== */
const tok=()=>localStorage.getItem(KT)||'';
const b64=s=>{const b=new TextEncoder().encode(s);let t='';for(let i=0;i<b.length;i+=8192)t+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(t)};
const dir=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')+1):'';
const herr=s=>({401:'Jeton invalide ou expiré',403:'Accès refusé : vérifiez la permission « Contents : Read and write » du jeton ou la limite d\'API',404:'Dépôt, branche ou fichier introuvable (le jeton doit aussi couvrir ce dépôt)',409:'Conflit de version, réessayez',422:'Requête refusée (branche inexistante ou conflit)'}[s]||'Erreur GitHub ('+s+')');
function ghCfg(v){const g=D.s.gh,x=i=>$('#'+i);if(!x('gh_owner'))return;g.owner=x('gh_owner').value.trim();g.repo=x('gh_repo').value.trim();g.branch=x('gh_branch').value.trim()||'main';{let d=x('gh_dir').value.trim().replace(/^\/+/,'').replace(/\/+$/,'');g.dir=(d||'backups')+'/'}g.freq=x('gh_freq').value;g.keep=+(x('gh_keep')||{}).value||0;
  const t=x('gh_tok').value.trim();if(t){localStorage.setItem(KT,t);x('gh_tok').value='';}
  localStorage.setItem(KEY,JSON.stringify(DB));sched();if(v){toast('Configuration enregistrée');render()}}
function tokDel(){if(!confirm('Supprimer le jeton de ce navigateur ? (Pensez aussi à le révoquer sur GitHub.)'))return;localStorage.removeItem(KT);M.st='none';saveM();render();toast('Jeton supprimé')}
async function api(path,o={}){const g=D.s.gh,t=tok();if(!g.owner||!g.repo||!t)throw new Error('Configuration GitHub incomplète (propriétaire, dépôt ou jeton manquant)');
  if(!navigator.onLine)throw new Error('Hors ligne : GitHub injoignable (vos données locales sont intactes)');
  const base='https://api.github.com/repos/'+encodeURIComponent(g.owner)+'/'+encodeURIComponent(g.repo)+(path===''?'':'/contents/'+path.split('/').map(encodeURIComponent).join('/'));
  try{return await fetch(base+(o.q||''),{method:o.m||'GET',headers:{Authorization:'Bearer '+t,Accept:o.raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},body:o.b?JSON.stringify(o.b):undefined,cache:'no-store'})}catch(e){throw new Error('Réseau indisponible : GitHub injoignable')}}
const stInfo=()=>{if(M.dirty&&M.st=='ok')return['warning','Sauvegarde en attente'];return{none:['secondary','Non connecté'],connected:['info','Connecté'],pending:['warning','Sauvegarde en cours…'],ok:['success','Sauvegarde réussie'],fail:['danger','Sauvegarde échouée']}[M.st]||['secondary','—']};
function ghStatus(){const g=D.s.gh,s=stInfo();return`<div class="small"><span class="badge text-bg-${s[0]} me-2">${s[1]}</span>Dépôt : <b>${esc(g.owner&&g.repo?g.owner+'/'+g.repo:'—')}</b> · Dossier : <b>${esc(bdir(g))}</b> · Taille : <b>${M.size?(M.size/1024).toFixed(1)+' Ko':'—'}</b><br>Dernière sauvegarde réussie : <b>${M.last?new Date(M.last).toLocaleString('fr-FR'):'jamais'}</b>${M.err?`<br><span class="text-danger">Dernière erreur : ${esc(M.err)}</span>`:''}</div>`}
function stat(s,e){M.st=s;if(e!==undefined)M.err=e;saveM();const el=$('#ghst');if(el)el.innerHTML=ghStatus()}
async function ghTest(){ghCfg();stat('pending');try{const r=await api('');if(!r.ok)throw new Error(herr(r.status));const j=await r.json();if(j.permissions&&j.permissions.push===false)throw new Error('Le jeton n\'a pas le droit d\'écriture sur ce dépôt');
  stat('connected','');toast(j.private?'Connexion réussie (dépôt privé)':'Connexion réussie, mais le dépôt est PUBLIC : vos données seraient visibles par tous',!j.private)}catch(e){stat('fail',e.message);toast(e.message,1)}}
async function put(path,txt,msg){for(let i=0;i<2;i++){const g=D.s.gh;let sha;const r=await api(path,{q:'?ref='+encodeURIComponent(g.branch)});if(r.ok)sha=(await r.json()).sha;else if(r.status!=404)throw new Error(herr(r.status));
  const p=await api(path,{m:'PUT',b:{message:msg,content:b64(txt),branch:g.branch,sha}});if(p.ok)return;if((p.status==409||p.status==422)&&i==0)continue;throw new Error(herr(p.status))}}
let busy=false,tm=null;
function ghPush(manual){return ghBackup(manual)}
function sched(){if(!tok())return;M.dirty=true}
function periodic(){const g=D.s.gh;if(!tok()||!g.owner||!g.repo||busy)return;const f=g.freq=='manual'?'manual':g.freq=='weekly'?'weekly':'daily';
  if(f=='daily'&&(!M.last||M.dirty)&&dayOf(M.last)!=today())return ghBackup(false);
  if(f=='weekly'&&(!M.last||M.dirty)&&(!M.last||(Date.now()-new Date(M.last))/864e5>=7))return ghBackup(false)}

/* ===== Sauvegardes datées : un fichier par sauvegarde, jamais écrasé (donc aucun conflit) =====
   Nom : <dossier>/motor-manager_AAAA-MM-JJ_HH-mm-ss.json (heure de l'appareil). Restauration : on choisit dans la liste. */
const nowStamp=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'_'+p(d.getHours())+'-'+p(d.getMinutes())+'-'+p(d.getSeconds())};
const bdir=g=>(g.dir||dir(g.path)||'backups/');
const dayOf=t=>t?iso(new Date(t)):'';
let BL=[];
async function ghBackup(manual){if(busy)return;const g=D.s.gh;if(!tok()||!g.owner||!g.repo){if(manual)toast('Configuration GitHub incomplète (propriétaire, dépôt ou jeton)',1);return}
  busy=true;stat('pending');
  try{const sn=snapshot(),h=hash(sn.data);
    if(!manual&&h==M.hash){M.dirty=false;stat('ok','');busy=false;return}   /* rien de nouveau depuis la dernière sauvegarde */
    const txt=JSON.stringify(sn,null,1),st=nowStamp(),base=bdir(g)+'motor-manager_'+st;let name=base+'.json';
    for(let i=0;i<4;i++){const p=await api(name,{m:'PUT',b:{message:'Sauvegarde Motor Manager Pro '+st,content:b64(txt),branch:g.branch}});
      if(p.ok)break;if((p.status==422||p.status==409)&&i<3){name=base+'-'+(i+2)+'.json';continue}throw new Error(herr(p.status))}   /* même seconde : on ajoute un suffixe */
    M.hash=h;M.last=sn.exportedAt;M.size=new Blob([txt]).size;M.dirty=false;stat('ok','');
    if(+g.keep>0)await ghPrune(false);
    if(manual)toast('Sauvegarde créée : '+st.replace('_',' à ').replace(/-(\d\d)-(\d\d)$/,':$1:$2'));
    if($('#blist'))ghList()}
  catch(e){stat('fail',e.message);if(manual)toast(e.message,1)}busy=false}
async function ghList(){const box=$('#blist');if(!box)return;ghCfg();box.innerHTML='<div class="text-muted small">Chargement des sauvegardes…</div>';
  try{const g=D.s.gh,q='?ref='+encodeURIComponent(g.branch),b=bdir(g),items=[];
    for(const d of[b,b+'history/']){const r=await api(d.replace(/\/$/,''),{q});if(r.ok){const j=await r.json();if(Array.isArray(j))j.forEach(f=>{if(f.type=='file'&&/\.json$/i.test(f.name))items.push(f)})}else if(r.status!=404)throw new Error(herr(r.status))}
    if(g.path&&!items.some(f=>f.path==g.path)){const r=await api(g.path,{q});if(r.ok){const f=await r.json();if(f&&f.name&&!Array.isArray(f))items.push(f)}}
    const info=f=>{let m=f.name.match(/(\d{4})-(\d{2})-(\d{2})[_T](\d{2})-(\d{2})-(\d{2})/);if(m)return{k:m.slice(1,7).join(''),l:m[3]+'/'+m[2]+'/'+m[1]+' à '+m[4]+':'+m[5]+':'+m[6]};
      m=f.name.match(/(\d{4})-(\d{2})-(\d{2})/);if(m)return{k:m.slice(1,4).join('')+'000000',l:m[3]+'/'+m[2]+'/'+m[1]+' (instantané de l\'ancienne version)'};return{k:'0',l:'Ancien fichier unique « '+f.name+' »'}};
    const L=items.map(f=>({f,i:info(f)})).sort((a,c)=>a.i.k<c.i.k?1:-1);BL=L.map(x=>({path:x.f.path,sha:x.f.sha,name:x.f.name,label:x.i.l}));
    box.innerHTML=L.length?`<b class="small">${L.length} sauvegarde${L.length>1?'s':''} — la plus récente en premier</b><div class="list-group mt-2">${L.map((x,n)=>`<div class="list-group-item d-flex justify-content-between align-items-center gap-2"><div><b>${esc(x.i.l)}</b><div class="small text-muted">${(x.f.size/1024).toFixed(1)} Ko</div></div><div class="d-flex gap-1"><button class="btn btn-sm btn-acc" onclick="ghRestoreFile(${n})">Restaurer</button><button class="btn btn-sm btn-light text-danger" onclick="ghDelFile(${n})" aria-label="Supprimer cette sauvegarde"><i class="fa-solid fa-trash"></i></button></div></div>`).join('')}</div>`:'<div class="alert alert-secondary small mb-0">Aucune sauvegarde trouvée dans ce dossier.</div>'}
  catch(e){box.innerHTML='<div class="alert alert-danger small mb-0">'+esc(e.message)+'</div>'}}
async function ghRestoreFile(n){const p=(BL[n]||{}).path;if(!p)return;
  try{const r=await api(p,{q:'?ref='+encodeURIComponent(D.s.gh.branch),raw:1});if(!r.ok)throw new Error(herr(r.status));let o;try{o=JSON.parse(await r.text())}catch(e){throw new Error('Fichier de sauvegarde illisible')}if(!validB(o))throw new Error(badB(o));restore(o,'GitHub',true)}
  catch(e){toast(e.message,1)}}

/* ===== Suppression des anciennes sauvegardes ===== */
const bkName=/^motor-manager_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:-\d+)?\.json$/,KEEP_MIN=5;
async function ghPrune(manual){const g=D.s.gh,days=+g.keep||0;
  if(!days){if(manual)toast('Choisissez d\'abord une durée de conservation (« Après 60 jours », par exemple) puis enregistrez',1);return}
  try{const r=await api(bdir(g).replace(/\/$/,''),{q:'?ref='+encodeURIComponent(g.branch)});if(r.status==404)return;if(!r.ok)throw new Error(herr(r.status));
    const j=await r.json(),L=(Array.isArray(j)?j:[]).map(f=>{const m=f.type=='file'&&f.name.match(bkName);return m?{f,k:m.slice(1,7).join(''),t:new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]).getTime()}:null}).filter(Boolean).sort((a,b)=>a.k<b.k?1:-1),
      old=L.slice(KEEP_MIN).filter(x=>x.t<Date.now()-days*864e5);
    if(!old.length){if(manual)toast('Aucune sauvegarde à supprimer (les '+KEEP_MIN+' plus récentes sont toujours conservées)');return}
    if(manual&&!confirm('Supprimer définitivement '+old.length+' sauvegarde'+(old.length>1?'s':'')+' de plus de '+days+' jours ?\n\nLes '+KEEP_MIN+' plus récentes sont toujours conservées. Seuls les fichiers créés par l\'application sont concernés.'))return;
    let n=0;for(const x of old){const d=await api(x.f.path,{m:'DELETE',b:{message:'Nettoyage : suppression de '+x.f.name,sha:x.f.sha,branch:g.branch}});if(!d.ok&&d.status!=404)throw new Error(herr(d.status));n++}
    if(manual)toast(n+' ancienne'+(n>1?'s':'')+' sauvegarde'+(n>1?'s':'')+' supprimée'+(n>1?'s':''));if($('#blist'))ghList()}
  catch(e){if(manual)toast(e.message,1)}}
async function ghDelFile(n){const f=BL[n];if(!f)return;if(!confirm('Supprimer définitivement la sauvegarde du '+f.label+' ?\n\nCette action est irréversible.'))return;
  try{const d=await api(f.path,{m:'DELETE',b:{message:'Suppression de '+f.name,sha:f.sha,branch:D.s.gh.branch}});if(!d.ok&&d.status!=404)throw new Error(herr(d.status));toast('Sauvegarde supprimée');ghList()}catch(e){toast(e.message,1)}}

/* ===== Stockage protégé (le navigateur n'efface pas les données automatiquement) ===== */
async function storageInfo(){const e=$('#stinfo');if(!e)return;let p=null,u=null;
  try{if(navigator.storage&&navigator.storage.persisted)p=await navigator.storage.persisted();if(navigator.storage&&navigator.storage.estimate){const x=await navigator.storage.estimate();u=x.usage}}catch(_){}
  e.innerHTML='Stockage de l\'appareil : '+(p===true?'<span class="badge text-bg-success">protégé</span>':p===false?'<span class="badge text-bg-warning">non protégé</span> <button class="btn btn-sm btn-outline-dark ms-1" onclick="askPersist()">Demander la protection</button>':'<span class="text-muted">information indisponible</span>')+(u!=null?' · utilisé : '+(u/1048576).toFixed(1)+' Mo':'')}
async function askPersist(){try{const ok=await navigator.storage.persist();toast(ok?'Stockage protégé : le navigateur ne l\'effacera pas automatiquement':'Demande refusée par le navigateur (installez l\'app sur l\'écran d\'accueil puis réessayez)',!ok)}catch(e){toast('Non pris en charge sur cet appareil',1)}storageInfo()}
try{if(navigator.storage&&navigator.storage.persisted)navigator.storage.persisted().then(p=>p?0:navigator.storage.persist&&navigator.storage.persist()).catch(()=>{})}catch(e){}

/* ===== Mode hors ligne : état du cache + recomplétion à la demande ===== */
const askPrecache=()=>{try{navigator.serviceWorker.ready.then(r=>r.active&&r.active.postMessage('precache')).catch(()=>{})}catch(e){}};
async function offlineInfo(){const e=$('#offinfo');if(!e)return;
  try{if(typeof caches=='undefined'||!navigator.serviceWorker||!navigator.serviceWorker.controller)throw 0;
    const ks=(await caches.keys()).filter(k=>k.startsWith('mmp-')).sort();if(!ks.length)throw 0;
    const urls=(await(await caches.open(ks[ks.length-1])).keys()).map(r=>r.url),
      need=[['/index.html','la page'],['/app.js','l\'application'],['/styles.css','les styles'],['bootstrap.min.css','Bootstrap'],['font-awesome/6.5.2/css/all.min.css','les icônes (CSS)'],['fa-solid-900.woff2','les icônes (police)'],['chart.umd.min.js','les graphiques'],['xlsx.full.min.js','l\'export Excel'],['jspdf.umd.min.js','l\'export PDF']],
      miss=need.filter(n=>!urls.some(u=>u.includes(n[0])));
    e.innerHTML='Mode hors ligne : '+(miss.length?'<span class="badge text-bg-warning">incomplet</span> il manque '+miss.map(m=>m[1]).join(', ')+'. Connectez-vous à Internet et appuyez sur « Préparer le mode hors ligne ».':'<span class="badge text-bg-success">prêt</span> <span class="text-muted">('+urls.length+' fichiers en cache)</span>')}
  catch(_){e.innerHTML='Mode hors ligne : <span class="badge text-bg-secondary">pas encore actif</span> <span class="text-muted">— ouvrez l\'application une fois avec Internet (adresse https), attendez quelques secondes, puis rouvrez-la.</span>'}}
function prepOffline(){if(navigator.onLine===false){toast('Connectez-vous à Internet pour préparer le mode hors ligne',1);return}askPrecache();toast('Préparation du mode hors ligne…');setTimeout(offlineInfo,4000);setTimeout(offlineInfo,12000)}

/* ===== Notice « nouvelle version disponible » ===== */
let updShown=false;
function showUpd(){if(updShown||typeof document=='undefined'||!document.body)return;updShown=true;
  try{const b=document.createElement('div');b.id='upd';b.setAttribute('role','alert');b.innerHTML='<span>Une nouvelle version de l\'application est disponible.</span><button type="button" id="upd_go">Mettre à jour</button><button type="button" id="upd_x" aria-label="Plus tard">✕</button>';
    document.body.appendChild(b);b.querySelector('#upd_go').onclick=()=>location.reload();b.querySelector('#upd_x').onclick=()=>b.remove()}catch(e){}}
function checkUpdate(){if(typeof fetch!='function'||(navigator.onLine===false))return;
  try{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{})}catch(e){}
  fetch('app.js',{cache:'no-store'}).then(r=>r.ok?r.text():'').then(t=>{const m=t.match(/APP_VER\s*=\s*'(\d[^']*)'/);if(m&&m[1]!==APP_VER)showUpd()}).catch(()=>{})}

/* ===== Import de l'historique : Excel, CSV ou copier-coller ===== */
let IMP=null;
const pad=n=>String(n).padStart(2,'0'),norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function pd(v,i){if(v instanceof Date&&!isNaN(v))return new Date(v.getTime()+43200000).toISOString().slice(0,10);
  if(typeof v=='number'&&i==0&&v>20000&&v<80000)return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
  if(typeof v=='string'){const t=v.trim();let m=t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;const mm=+m[2],dd=+m[1];return mm>=1&&mm<=12&&dd>=1&&dd<=31?y+'-'+pad(mm)+'-'+pad(dd):null}
    m=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3]}return null}
function pn(v){if(typeof v=='number')return v;if(typeof v!='string')return NaN;let t=v.replace(/[\s\u00a0\u202f]/g,'').replace(/(dh|mad)$/i,'');if(!/^-?[\d.,]+$/.test(t))return NaN;if(t.includes(',')&&t.includes('.'))t=t.replace(/\./g,'');return parseFloat(t.replace(',','.'))}
function textRows(t){const l=t.split(/\r?\n/).filter(x=>x.trim()),f=l[0]||'',dl=[';','\t',','].map(d=>[d,f.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  return l.map(line=>{const o=[];let c='',q=false;for(let i=0;i<line.length;i++){const h=line[i];if(h=='"'){if(q&&line[i+1]=='"'){c+='"';i++}else q=!q}else if(h==dl&&!q){o.push(c);c=''}else c+=h}o.push(c);return o.map(x=>x.trim())})}
function parseRows(kind,rows){const ok=[],bad=[],it=[];
  rows.forEach(r=>{const di=r.findIndex((c,i)=>pd(c,i)),date=di<0?null:pd(r[di],di);if(!date)return;
    const nums=r.map((c,i)=>[pn(c),i]).filter(([n,i])=>i!=di&&isFinite(n));
    if(kind=='km'){const pos=nums.filter(x=>x[0]>0);if(!pos.length)return bad.push({date,why:'compteur manquant'});return ok.push({date,odo:pos[0][0]})}
    if(!nums.length)return bad.push({date,why:'montant manquant'});const amt=nums[nums.length-1][0];if(!(amt>0))return bad.push({date,why:'montant nul ou négatif'});
    it.push({date,amt,tx:r.filter((c,i)=>i!=di&&typeof c=='string'&&c.trim()&&!isFinite(pn(c))&&!pd(c,i)).map(x=>x.trim())})});
  if(kind=='km')return{ok,bad};
  /* catégories connues + catégories nouvelles du fichier (1er texte d'une ligne à 2 textes), pour un résultat indépendant de l'ordre des lignes et d'une réimportation */
  const base=kind=='exp'?D.s.ce:D.s.cr,has=(l,t)=>l.some(c=>norm(c)==norm(t)),cand=[];
  it.forEach(x=>{if(x.tx.length>=2&&!x.tx.some(t=>has(base,t))&&!has(cand,x.tx[0]))cand.push(x.tx[0])});
  const all=[...base,...cand];
  it.forEach(x=>{const hit=x.tx.find(t=>has(all,t));let cat,desc;
    if(hit){cat=all.find(c=>norm(c)==norm(hit));desc=x.tx.filter(t=>t!==hit).join(' ')}else if(x.tx.length>=2){cat=x.tx[0];desc=x.tx.slice(1).join(' ')}else{cat=base.includes('Autres')?'Autres':base[base.length-1];desc=x.tx[0]||''}
    ok.push({date:x.date,cat,desc,amt:x.amt})});
  return{ok,bad}}
const kindOf=n=>/stat/i.test(n)?null:/kilom|compteur|^km/i.test(n)?'km':/rec/i.test(n)?'rev':/d[eé]p|expens|carb|hist/i.test(n)?'exp':null;
function analyse(items,skipped){const R={km:{ok:[],bad:[],dup:0,read:0},exp:{ok:[],bad:[],dup:0,read:0},rev:{ok:[],bad:[],dup:0,read:0},ce:[],cr:[],skipped};
  items.forEach(({kind,rows})=>{const q=parseRows(kind,rows);R[kind].read+=q.ok.length+q.bad.length;R[kind].bad.push(...q.bad);R[kind].ok.push(...q.ok)});
  const work=D.km.map(x=>({date:x.date,odo:x.odo,old:1})),acc=[];
  srt(R.km.ok,1).forEach(r=>{const w=srt(work,1),same=w.find(x=>x.date==r.date);
    if(same){same.odo==r.odo?R.km.dup++:R.km.bad.push({date:r.date,why:'un relevé différent existe déjà ('+same.odo+' km)'});return}
    const p=[...w].reverse().find(x=>x.date<r.date),n=w.find(x=>x.date>r.date&&x.old);
    if(p&&r.odo<p.odo)return R.km.bad.push({date:r.date,why:'compteur inférieur au relevé précédent ('+p.odo+' km)'});
    if(n&&r.odo>n.odo)return R.km.bad.push({date:r.date,why:'compteur supérieur au relevé suivant ('+n.odo+' km)'});
    work.push(r);acc.push(r)});R.km.ok=acc;
  [['exp','ce'],['rev','cr']].forEach(([k,c])=>{const cnt={},key=r=>r.date+'|'+r.amt+'|'+norm(r.cat)+'|'+norm(r.desc);D[k].forEach(x=>{const q=key(x);cnt[q]=(cnt[q]||0)+1});
    R[k].ok=R[k].ok.filter(r=>{const q=key(r);if(cnt[q]>0){cnt[q]--;R[k].dup++;return false}return true});
    R[k].ok.forEach(r=>{if(!D.s[c].some(x=>norm(x)==norm(r.cat))&&!R[c].some(x=>norm(x)==norm(r.cat)))R[c].push(r.cat)})});
  return R}
function impShow(R){IMP=R;const tot=R.km.ok.length+R.exp.ok.length+R.rev.ok.length,bad=[...R.km.bad,...R.exp.bad,...R.rev.bad];
  const row=([k,l])=>{const o=R[k],ds=o.ok.map(x=>x.date).sort();return`<tr><td>${l}</td><td class="num">${o.read}</td><td class="num text-success"><b>${o.ok.length}</b></td><td class="num">${o.dup}</td><td class="num ${o.bad.length?'text-danger':''}">${o.bad.length}</td><td>${ds.length?fd(ds[0])+' → '+fd(ds[ds.length-1]):'-'}</td><td class="num">${k=='km'?'':fm(o.ok.reduce((s,x)=>s+x.amt,0))}</td></tr>`};
  $('#imp').innerHTML=`<div class="card p-3 mt-3"><b>Aperçu avant import</b><div class="table-responsive"><table class="table table-sm mb-2"><thead><tr><th></th><th class="num">Lignes lues</th><th class="num">À importer</th><th class="num">Déjà présentes</th><th class="num">Rejetées</th><th>Période</th><th class="num">Total</th></tr></thead><tbody>${[['km','Kilométrage'],['exp','Dépenses'],['rev','Recettes']].map(row).join('')}</tbody></table></div>
  ${R.ce.length||R.cr.length?`<div class="small mb-2">Nouvelles catégories créées : <b>${esc([...R.ce,...R.cr].join(', '))}</b></div>`:''}${R.skipped.length?`<div class="small text-muted mb-2">Feuilles ignorées : ${esc(R.skipped.join(', '))}</div>`:''}
  ${bad.length?`<div class="small text-danger mb-2">Lignes rejetées (${bad.length}) : ${bad.slice(0,8).map(b=>esc(fd(b.date)+' — '+b.why)).join(' ; ')}${bad.length>8?' …':''}</div>`:''}
  <div><button class="btn btn-acc" ${tot?'':'disabled'} onclick="impOk()">Importer ${tot} enregistrement${tot>1?'s':''}</button> <button class="btn btn-light" onclick="IMP=null;$('#imp').innerHTML=''">Annuler</button></div></div>`}
function impOk(){if(!IMP)return;const R=IMP;let n=0;R.km.ok.forEach(r=>{D.km.push({id:uid(),date:r.date,odo:r.odo});n++});
  ['exp','rev'].forEach(k=>R[k].ok.forEach(r=>{D[k].push({id:uid(),date:r.date,cat:r.cat,desc:r.desc,amt:r.amt,note:''});n++}));
  R.ce.forEach(c=>D.s.ce.push(c));R.cr.forEach(c=>D.s.cr.push(c));IMP=null;save();render();toast(n+' enregistrements importés : statistiques recalculées')}
async function impFile(i){const f=i.files[0];if(!f)return;const forced=$('#imp_kind').value;
  try{const items=[],skipped=[];
    if(/\.(csv|txt|tsv)$/i.test(f.name)){const k=forced!='auto'?forced:kindOf(f.name.replace(/\.[^.]+$/,''));if(!k){i.value='';return toast('Fichier CSV : choisissez le type de données (Kilométrage, Dépenses ou Recettes)',1)}items.push({kind:k,rows:textRows(await f.text())})}
    else{const wb=XLSX.read(await f.arrayBuffer(),{cellDates:true});wb.SheetNames.forEach(n=>{const k=/stat/i.test(n)?null:forced!='auto'?forced:kindOf(n);if(k)items.push({kind:k,rows:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null,cellDates:true})});else skipped.push(n)})}
    i.value='';if(!items.length)return toast('Aucune feuille reconnue : nommez-les Kilométrage, Dépenses, Recettes, ou choisissez le type',1);impShow(analyse(items,skipped))}
  catch(e){i.value='';toast('Fichier illisible',1)}}
function impPaste(){const t=$('#imp_txt').value;if(!t.trim())return toast('Collez d\'abord les lignes',1);impShow(analyse([{kind:$('#imp_pk').value,rows:textRows(t)}],[]))}
function impTpl(){const wb=XLSX.utils.book_new(),add=(n,h,w)=>{const ws=XLSX.utils.aoa_to_sheet([h]);ws['!cols']=w.map(x=>({wch:x}));XLSX.utils.book_append_sheet(wb,ws,n)};
  add('Kilométrage',['Date','Compteur (km)'],[14,16]);add('Dépenses',['Date','Catégorie','Description','Montant (DH)'],[14,16,34,14]);add('Recettes',['Date','Catégorie','Description','Montant (DH)'],[14,16,34,14]);
  const a=XLSX.utils.aoa_to_sheet([['Aide'],['Date : JJ/MM/AAAA (ex. 15/09/2026).'],['Kilométrage : un relevé de compteur par jour, valeurs croissantes.'],['Dépenses / Recettes : une ligne par opération ; plusieurs lignes le même jour sont permises.'],['Catégories existantes — dépenses : '+D.s.ce.join(', ')+' ; recettes : '+D.s.cr.join(', ')+'. Une catégorie inconnue sera créée.'],['Les lignes déjà présentes dans l\'application sont ignorées : réimporter le même fichier est sans risque.']]);a['!cols']=[{wch:110}];XLSX.utils.book_append_sheet(wb,a,'Aide');XLSX.writeFile(wb,'modele-import-motor-manager.xlsx')}
VW.imp=()=>{const op=`<option value="km">Kilométrage</option><option value="exp">Dépenses</option><option value="rev">Recettes</option>`;
  return`<div class="row g-3"><div class="col-lg-6"><div class="card p-3 h-100"><b>Importer un fichier Excel ou CSV</b><p class="small text-muted">Un classeur avec des feuilles nommées Kilométrage, Dépenses et Recettes est reconnu automatiquement (la feuille Stats, calculée, est ignorée). Pour un CSV ou une feuille au nom différent, choisissez le type.</p>
  <div class="row g-2"><div class="col-6"><label class="form-label small">Type de données</label><select class="form-select" id="imp_kind"><option value="auto">Automatique (nom de feuille)</option>${op}</select></div><div class="col-6"><label class="form-label small">Fichier (.xlsx, .xls, .csv)</label><input type="file" class="form-control" accept=".xlsx,.xls,.csv,.txt,.tsv" onchange="impFile(this)"></div></div>
  <div class="mt-2"><button class="btn btn-outline-dark btn-sm" onclick="impTpl()"><i class="fa-solid fa-file-excel"></i> Télécharger le modèle Excel</button></div></div></div>
  <div class="col-lg-6"><div class="card p-3 h-100"><b>Copier-coller depuis Excel</b><p class="small text-muted">Copiez des lignes (date, catégorie, description, montant — ou date, compteur) et collez-les ici.</p><div class="row g-2"><div class="col-6"><select class="form-select" id="imp_pk">${op}</select></div><div class="col-6"><button class="btn btn-outline-dark" onclick="impPaste()">Analyser</button></div><div class="col-12"><textarea class="form-control" id="imp_txt" rows="4" placeholder="15/09/2026&#9;Parking&#9;Gare&#9;10"></textarea></div></div></div></div></div>
  <div id="imp"></div>
  <div class="alert alert-info small mt-3">Les doublons sont ignorés (réimport sans risque), les compteurs doivent rester croissants, les montants en format français (1 234,50) sont compris. Les dépenses « Carburant » importées comptent dans les dépenses ; pour mesurer la consommation (L/100 km), enregistrez aussi les pleins dans la page Carburant.</div>`};

/* ===== Installation (PWA) : PC, Android, iOS ===== */
let DIP=null;
if(typeof addEventListener=='function'){addEventListener('beforeinstallprompt',e=>{e.preventDefault();DIP=e;render()});addEventListener('appinstalled',()=>{DIP=null;toast('Application installée');render()})}
const standalone=()=>(typeof matchMedia=='function'&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
const plat=()=>{const u=navigator.userAgent||'';return/iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1)?'ios':/Android/.test(u)?'android':'pc'};
async function doInstall(){if(!DIP)return;DIP.prompt();try{await DIP.userChoice}catch(e){}DIP=null;render()}
VW.ins=()=>{const pl=plat(),sec=location.protocol=='https:'||location.hostname=='localhost'||location.hostname=='127.0.0.1',card=(k,t,i,h)=>`<div class="col-lg-4"><div class="card p-3 h-100 ${pl==k?'border-warning':''}"><b><i class="fa-solid fa-${i}"></i> ${t} ${pl==k?'<span class="badge text-bg-warning">votre appareil</span>':''}</b><ol class="small mt-2 mb-0 ps-3">${h}</ol></div></div>`;
  return`${standalone()?'<div class="alert alert-success">L\'application est déjà installée sur cet appareil.</div>':!sec?'<div class="alert alert-warning small"><b>Installation impossible depuis un fichier local.</b> Ouvrez l\'application via une adresse HTTPS (voir « Héberger l\'application » plus bas).</div>':DIP?'<div class="mb-3"><button class="btn btn-acc btn-lg" onclick="doInstall()"><i class="fa-solid fa-download"></i> Installer l\'application</button></div>':'<div class="alert alert-secondary small">Si le bouton d\'installation n\'apparaît pas, suivez les étapes de votre appareil ci-dessous.</div>'}
  <div class="row g-3 mb-3">${card('pc','PC (Chrome ou Edge)','desktop','<li>Ouvrez l\'adresse HTTPS de l\'application.</li><li>Cliquez sur l\'icône <b>Installer</b> à droite de la barre d\'adresse, ou sur le bouton ci-dessus.</li><li>Autre voie : menu ⋮ › <b>Enregistrer et partager › Installer</b> (Edge : ⋯ › Applications › Installer ce site).</li><li>Une icône apparaît sur le bureau et dans le menu Démarrer.</li>')}
  ${card('android','Android (Chrome)','mobile-screen','<li>Ouvrez l\'adresse HTTPS dans Chrome.</li><li>Appuyez sur <b>Installer l\'application</b> (bouton ci-dessus ou bandeau du bas).</li><li>Sinon : menu ⋮ › <b>Installer l\'application</b> (ou « Ajouter à l\'écran d\'accueil »).</li><li>L\'icône apparaît dans vos applications.</li>')}
  ${card('ios','iPhone / iPad (Safari)','apple','<li>Ouvrez l\'adresse HTTPS dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b> (carré avec une flèche).</li><li>Choisissez <b>Sur l\'écran d\'accueil</b>, puis <b>Ajouter</b>.</li><li>Lancez l\'application depuis cette icône : l\'installation iOS ne montre pas de bouton automatique.</li>')}</div>
  <div class="card p-3 mb-3"><b>Héberger l'application (nécessaire pour l'installer)</b><ol class="small mt-2 mb-2 ps-3"><li>Créez un dépôt GitHub pour l'application (le code seul, aucune donnée personnelle).</li><li>Déposez-y : <code>index.html, styles.css, app.js, sw.js, manifest.json, icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png, apple-touch-icon.png</code> (10 fichiers, tous à la racine du dépôt).</li><li>Dépôt › <b>Settings › Pages › Deploy from a branch › main / (root)</b> : GitHub donne une adresse <code>https://votre-nom.github.io/nom-du-depot/</code>.</li><li>Ouvrez cette adresse sur chaque appareil, <b>deux fois</b> avec internet (pour la mise en cache hors ligne), puis installez.</li><li>Pour la sauvegarde des données, utilisez un <b>autre dépôt privé</b> et un jeton limité à ce seul dépôt (Paramètres › Sauvegarde GitHub).</li></ol></div>
  <div class="card p-3 mb-3"><b><i class="fa-solid fa-screwdriver-wrench"></i> L'application ne s'ouvre pas sur le téléphone ?</b><ol class="small mt-2 mb-2 ps-3"><li>Ouvrez l'adresse <b>https://…github.io/…</b> dans Chrome : un fichier téléchargé ou ouvert depuis le gestionnaire de fichiers (file://, content://) ne peut ni s'installer ni utiliser le mode hors ligne.</li><li>Avec internet, appuyez sur <b>Réparer</b> ci-dessous (vide le cache de cette application seulement), puis rouvrez-la.</li><li>Si l'ancienne icône reste cassée : désinstallez-la (appui long › Désinstaller), rouvrez l'adresse dans Chrome et réinstallez.</li><li>Après chaque mise à jour des fichiers sur GitHub, attendez 1 à 2 minutes avant de recharger.</li></ol><button class="btn btn-outline-dark btn-sm" onclick="mmpRepair()"><i class="fa-solid fa-rotate"></i> Réparer l'application</button></div>
  <div class="alert alert-warning small mb-0"><b>Les données restent sur chaque appareil</b> (PC, téléphone et application installée ont chacun leur propre stockage). Pour les transférer ou les synchroniser : sauvegardez sur GitHub (ou en JSON) puis, sur l'autre appareil, onglet Sauvegarde › « Voir les sauvegardes et restaurer » et choisissez la sauvegarde voulue. Si vous avez déjà saisi des données avec une autre adresse (par exemple le fichier ouvert directement), exportez-les d'abord en JSON, puis restaurez-les dans la version installée.</div>`};

/* ===== Démarrage (mode hors ligne via service worker, sur http/https) ===== */
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
setInterval(periodic,6e5);setTimeout(periodic,5000);setTimeout(checkUpdate,8000);setInterval(checkUpdate,18e5);setTimeout(askPrecache,3000);
if(typeof addEventListener=='function')addEventListener('online',()=>{periodic();askPrecache()});
if(typeof document!='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible'){periodic();checkUpdate()}});
if('serviceWorker' in navigator&&navigator.serviceWorker.addEventListener){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)showUpd()})}
render();
