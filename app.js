"use strict";
/* ---- persistence ---- */
let ACCESS=[];
let ENTRIES={};
function entry(d){ if(!ENTRIES[d]) ENTRIES[d]={values:{},status:'pending',submittedBy:null,submittedAt:null}; return ENTRIES[d]; }
function saveAll(){ /* localStorage removed, handled explicitly with Supabase */ }

async function loadAppData(rec) {
  const allEntries = await window.fetchAllEntries();
  ENTRIES = {};
  allEntries.forEach(row => {
    ENTRIES[row.district] = {
      values: row.values || {},
      status: row.status || 'pending',
      submittedBy: row.submitted_by,
      submittedAt: row.submitted_at
    };
  });
  if (rec.role === 'Admin') {
    ACCESS = await window.fetchAllUsers();
  }
}

/* ---- state ---- */
const PUBLIC_USER = { email: 'public', role: 'Data Entry', vibhag: '', districts: [] };
let S={user: PUBLIC_USER, screen:'landing', district:null, sectionIdx:0, ctx:'user'};

/* ---- helpers ---- */
const $=s=>document.querySelector(s);
const esc=s=>(s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const numv=v=>{const n=parseFloat(v);return isFinite(n)?n:0;};
const val=(d,c)=>numv(entry(d).values[c]);
const auto=(d,c)=>(AUTO[c]||[]).reduce((s,x)=>s+val(d,x),0);
function sectionFilled(d,sec){return sec.cols.filter(c=>{const v=entry(d).values[c];return v!=null&&v!=='';}).length;}
function sectionPct(d,sec){return Math.round(100*sectionFilled(d,sec)/sec.cols.length);}
function districtFilled(d){return ALLCOLS.filter(c=>{const v=entry(d).values[c];return v!=null&&v!=='';}).length;}
function districtPct(d){return Math.round(100*districtFilled(d)/ALLCOLS.length);}
function dispStatus(d){const e=ENTRIES[d];if(e&&e.status==='submitted')return'submitted';if(districtFilled(d)>0)return'draft';return'pending';}
const STLABEL={submitted:'Submitted',draft:'Draft',pending:'Pending'};
const STCLASS={submitted:'sub',draft:'draft',pending:'pend'};

let tT;function toast(m,k){const t=$('#toast');t.textContent=m;t.className='toast show '+(k||'');clearTimeout(tT);tT=setTimeout(()=>t.className='toast',2600);}

/* ---- top chrome ---- */
function topbar(){
  const u=S.user;
  const isAdmin = u && u.role === 'Admin';
  return `<div class="topbar">
    <div class="brand"><div class="logo dev">शि</div>
      <div><div class="t1">शिक्षा महाकुम्भ · संगठन डेटा पोर्टल</div>
      ${S.screen === 'landing' ? '' : `<div class="t2">${u.vibhag ? u.vibhag.toUpperCase() : 'PORTAL'} WORKBOOK</div>`}</div></div>
    <div class="spacer"></div>
    ${isAdmin ? `<span class="pill adm">ADMIN</span>
      <div class="userchip"><span class="em">${esc(u.email)}</span></div>
      <button class="btn sm ghost" style="color:#E7CBA6;border-color:#3a4566" onclick="logout()">लॉगआउट</button>`
    : (S.screen === 'landing' ? '' : `<button class="btn sm ghost" style="color:#E7CBA6;border-color:#3a4566" onclick="S.screen='login';render()">Admin Login</button>`)}
  </div>`;
}
async function logout(){
  await window.supabaseLogout();
  S={user: PUBLIC_USER, screen:'landing', district:null, sectionIdx:0, ctx:'user'};
  render();
}

/* ================= HUB / LANDING ================= */
function landingScreen(){
  const vOpts = Object.entries(SANGATHAN_MAPPING).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  
  $('#app').innerHTML=topbar()+`<div class="content" style="margin:0 auto;max-width:800px">
    <div style="text-align:center;margin:40px 0 20px">
      <h1 class="dev" style="font-size:32px;color:#1B2436">भौगोलिक रचना एवं कार्यस्थिति</h1>
    </div>
    <div class="card pad" style="max-width:600px;margin:0 auto">
      <div style="color:#D9661C;font-size:14px;margin-bottom:12px">● पहले विभाग और जिला चुनें</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:200px">
          <span>अपना विभाग चुनें</span>
          <select id="sel_vibhag" onchange="updateDistDropdown()">
            <option value="">विभाग चुनें</option>
            ${vOpts}
          </select>
        </div>
        <div class="field" style="flex:1;min-width:200px">
          <span>फिर अपना जिला चुनें</span>
          <select id="sel_district" disabled onchange="checkLandingBtn()">
            <option value="">पहले विभाग चुनें</option>
          </select>
        </div>
      </div>
      <div style="background:#eaf2f8;color:#455a64;padding:12px;border-radius:6px;font-size:13px;margin:10px 0">
        जिला सूची चयनित विभाग के अनुसार ड्रॉपडाउन में दिखाई देगी।
      </div>
      <div class="wrap-actions" style="margin-top:20px">
        <button id="btn_start" class="btn primary" disabled onclick="startDataEntry()">डाटा एंट्री शुरू करें</button>
      </div>
    </div>
  </div>`;
}

function updateDistDropdown() {
  const vId = $('#sel_vibhag').value;
  const dSel = $('#sel_district');
  const btn = $('#btn_start');
  if (!vId) {
    dSel.innerHTML = '<option value="">पहले विभाग चुनें</option>';
    dSel.disabled = true;
    btn.disabled = true;
    return;
  }
  const dists = SANGATHAN_MAPPING[vId].districts;
  dSel.innerHTML = '<option value="">जिला चुनें</option>' + dists.map(d => `<option value="${d}">${d}</option>`).join('');
  dSel.disabled = false;
  checkLandingBtn();
}

function checkLandingBtn() {
  const dName = $('#sel_district').value;
  $('#btn_start').disabled = !dName;
}

function startDataEntry() {
  const vId = $('#sel_vibhag').value;
  const dName = $('#sel_district').value;
  if (!vId || !dName) return;
  const vObj = SANGATHAN_MAPPING[vId];
  S.user.vibhag = vObj.name;
  S.user.districts = vObj.districts;
  S.district = dName;
  S.sectionIdx = 0;
  S.screen = 'na_form';
  render();
}
window.updateDistDropdown=updateDistDropdown;window.checkLandingBtn=checkLandingBtn;window.startDataEntry=startDataEntry;

/* ================= LOGIN ================= */
function loginScreen(){
  $('#app').innerHTML=`<div class="loginwrap"><div class="loginbox">
    <div class="lh"><div class="t1">संगठन डेटा पोर्टल</div><div class="t2">Admin Portal Login</div></div>
    <div class="lb">
      <div class="field"><span>Email ID</span><input id="email" type="email" placeholder="approved.mail@example.org" autocomplete="off"></div>
      <div class="field"><span>Password</span><input id="password" type="password" placeholder="Password" autocomplete="off"></div>
      <button class="btn primary" style="width:100%" onclick="doLogin()">Login / साइन इन करें</button>
      <div class="errline" id="lerr"></div>
      <div class="note" style="margin-top:6px">यह लॉगिन केवल एडमिन (Admin) उपयोग के लिए है।</div>
      <button class="btn ghost" style="width:100%;margin-top:10px" onclick="S.screen='landing';render()">← Back to Portal</button>
    </div></div></div>`;
  const ip=$('#password'); ip.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
}

async function doLogin(){
  const email=($('#email').value||'').trim().toLowerCase();
  const password=($('#password').value||'').trim();
  if(!email){$('#lerr').textContent='Email ID दर्ज करें।';return;}
  if(!password){$('#lerr').textContent='Password दर्ज करें।';return;}
  
  $('#lerr').style.color = '';
  $('#lerr').textContent='Login हो रहा है...';
  const { error } = await window.supabaseLoginWithPassword(email, password);
  if (error) { $('#lerr').textContent = error.message; return; }
  
  const rec = { email: email, role: 'Admin', status: 'Active', vibhag: 'Admin', districts: [] };
  await loadAppData(rec);
  
  S.user = rec;
  S.screen = 'ad_dashboard';
  S.ctx = 'admin';
  render();
}

/* ================= NON-ADMIN ================= */
function stepper(stage){ // stage: entry|review|submit
  const steps=[['1','Data Entry','entry'],['2','Review','review'],['3','Submit','submit']];
  const order=['entry','review','submit'];const cur=order.indexOf(stage);
  return `<div class="stepper">${steps.map(([n,l,k],i)=>
    `<div class="step ${k===stage?'on':(i<cur?'done':'')}"><span class="n">${i<cur?'✓':n}</span>${l}</div>`).join('')}</div>`;
}

function openForm(d){
  if(S.ctx==='user' && !S.user.districts.includes(d)){toast('यह जिला आपको आवंटित नहीं है',1);return;}
  S.district=d;S.sectionIdx=0;S.screen='na_form';render();
}
function naForm(){
  const d=S.district,sec=SECTIONS[S.sectionIdx],e=entry(d);
  const locked = e.status==='submitted' && S.ctx!=='admin';
  const groups=sec.groups.map(g=>{
    const fields=g.fields.map(f=>{
      const v=e.values[f.col]??'';
      return `<div class="fld"><label title="${esc(f.label)}">${esc(f.label)}</label>
        <input class="num ${v!==''?'filled':''}" inputmode="numeric" data-col="${f.col}" value="${esc(v)}" ${locked?'disabled':''}></div>`;
    }).join('');
    return `<div class="group"><div class="eyebrow">${esc(g.group)}</div><div class="fgrid">${fields}</div></div>`;
  }).join('');
  const autos=SECTION_AUTOS[sec.key]||[];
  const autoHtml=autos.length?`<div class="autobox"><div class="ttl">स्वतः योग · Auto totals</div><div class="row" id="autorow">
    ${autos.map(c=>`<span class="ai">${esc(AUTO_LABELS[c]||c)}<b data-auto="${c}">${auto(d,c)}</b></span>`).join('')}</div></div>`:'';
  const back=S.ctx==='admin';
  $('#app').innerHTML=topbar()+`<div class="content" style="margin:0 auto">
    ${back?`<button class="btn sm ghost" onclick="adminBack()">← Admin</button>`:
      (S.user.email==='public'?`<button class="btn sm ghost" onclick="S.screen='landing';render()" style="margin-bottom:15px">← Vibhag Workbook</button>${stepper('entry')}`:stepper('entry'))}
    <div class="page-h"><h1 class="dev">${esc(sec.title)}</h1></div>
    <div class="sub">जिला: <b class="dev">${d}</b> · विभाग: <b class="dev">${S.user.vibhag}</b> · Step ${S.sectionIdx+1} of ${SECTIONS.length}${locked?' · <span class="pill sub">Submitted — locked</span>':''}</div>
    <div class="stepper">${SECTIONS.map((s,i)=>`<div class="step ${i===S.sectionIdx?'on':(sectionPct(d,s)===100?'done':'')}" style="cursor:pointer" onclick="goSection(${i})"><span class="n">${sectionPct(d,s)===100&&i!==S.sectionIdx?'✓':i+1}</span>${s.short}</div>`).join('')}</div>
    <div class="card pad">${groups}${autoHtml}
      <div class="formbar">
        <button class="btn" onclick="prevSection()" ${S.sectionIdx===0?'disabled':''}>← पिछला</button>
        <div class="sp"></div>
        ${locked?'':'<button class="btn green" onclick="saveDraft()">Save Draft</button>'}
        ${S.sectionIdx<SECTIONS.length-1
          ? `<button class="btn primary" onclick="nextSection()">अगला: ${SECTIONS[S.sectionIdx+1].short} →</button>`
          : `<button class="btn primary" onclick="gotoReview()">Review Form →</button>`}
      </div></div>`;
  $('#app').querySelectorAll('input[data-col]').forEach(inp=>{
    inp.addEventListener('input',ev=>{
      const c=ev.target.dataset.col,v=ev.target.value;
      e.values[c]=v; ev.target.classList.toggle('filled',v!=='');
      const ar=$('#autorow'); if(ar) ar.querySelectorAll('[data-auto]').forEach(b=>b.textContent=auto(d,b.dataset.auto));
    });
  });
}
function goSection(i){S.sectionIdx=i;render();}
function prevSection(){if(S.sectionIdx>0){S.sectionIdx--;render();}}
function nextSection(){if(S.sectionIdx<SECTIONS.length-1){S.sectionIdx++;saveAll();render();}}
async function saveDraft(){
  const e=entry(S.district);
  if(e.status!=='submitted'){
    await window.upsertEntry(S.district, e.values);
    e.status='draft';
  }
  toast('प्रारूप सेव हुआ','ok');
}
function gotoReview(){saveAll();S.screen='na_review';render();}
function adminBack(){S.ctx='admin';S.screen='ad_entries';render();}

function naReview(){
  const d=S.district,e=entry(d);
  const need=ALLCOLS.length-districtFilled(d);
  const checks=[
    ['ok','Vibhag selected — '+S.user.vibhag],
    ['ok','District selected — '+d],
    [need===0?'ok':'warn', need===0?'All numeric fields filled':`${need} fields still empty (optional)`],
    ['ok','Auto totals calculated'],
  ];
  const secRows=SECTIONS.map(s=>{const p=sectionPct(d,s);const st=p===100?'Complete':(p>0?'Draft':'Pending');
    const cl=p===100?'sub':(p>0?'draft':'pend');
    return `<tr><td>${s.short} <span class="muted">· ${esc(s.title.split('—')[1]||'')}</span></td>
      <td style="width:140px"><div class="bar ${p===100?'g':''}"><i style="width:${p}%"></i></div></td>
      <td class="right num">${p}%</td><td class="right"><span class="pill ${cl}">${st}</span></td></tr>`;}).join('');
  $('#app').innerHTML=topbar()+`<div class="content" style="margin:0 auto">
    ${stepper('review')}
    <div class="page-h"><h1>Review & Submit</h1></div>
    <div class="sub">जिला: <b class="dev">${d}</b> — अंतिम सबमिट के बाद फॉर्म लॉक हो जाएगा (admin अनलॉक कर सकते हैं)।</div>
    <div class="tiles" style="grid-template-columns:1fr 1fr">
      <div class="card pad"><div class="eyebrow">Completion checklist</div>
        ${checks.map(([k,t])=>`<div class="check"><span class="ck ${k}">${k==='ok'?'✓':'!'}</span>${esc(t)}</div>`).join('')}
      </div>
      <div class="card pad"><div class="eyebrow">District summary</div>
        <table class="tbl"><tbody>${secRows}</tbody></table>
      </div></div>
    <div class="card pad" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <div style="flex:1"><div class="muted" style="font-size:13px">Overall</div>
        <div class="bar" style="max-width:320px"><i style="width:${districtPct(d)}%"></i></div></div>
      ${S.user.email === 'public' ? `<div class="field" style="margin:0"><input id="submit_name" type="text" placeholder="आपका नाम (Your Name)" style="width:200px"></div>` : ''}
      <button class="btn" onclick="backToForm()">← Edit Data</button>
      <button class="btn green" onclick="saveDraft();toast('प्रारूप सेव हुआ','ok')">Save Draft</button>
      <button class="btn primary" onclick="finalSubmit()">Final Submit</button>
    </div></div>`;
}
function backToForm(){S.screen='na_form';render();}
async function finalSubmit(){
  const d=S.district,e=entry(d);
  let submittedBy = S.user.email;
  if (S.user.email === 'public') {
    const nameInput = $('#submit_name');
    if (nameInput && nameInput.value.trim() !== '') {
      submittedBy = nameInput.value.trim();
    } else {
      toast('कृपया सबमिट करने से पहले अपना नाम दर्ज करें', 1);
      return;
    }
  }
  e.status='submitted';e.submittedBy=submittedBy;e.submittedAt=new Date().toISOString();
  await window.submitEntry(d, e.values, e.submittedBy);
  S.screen='na_ack';render();
}
function naAck(){
  const d=S.district,e=entry(d);
  const ts=e.submittedAt?new Date(e.submittedAt).toLocaleString('en-IN'):'—';
  $('#app').innerHTML=topbar()+`<div class="content" style="margin:0 auto">
    ${stepper('submit')}
    <div class="card ackcard">
      <div class="ackmark">✓</div>
      <h1 style="font-family:'Tiro Devanagari Hindi';font-weight:400;margin:0 0 6px">Submission Completed</h1>
      <p class="muted" style="margin-top:0">आपके जिले का डेटा सफलतापूर्वक सबमिट हो गया है। आप acknowledgement देख सकते हैं, पर dashboard या reports तक पहुँच नहीं।</p>
      <div style="text-align:left;margin:18px 0">
        <div class="kv"><span class="k">Vibhag</span><span class="v dev">${S.user.vibhag}</span></div>
        <div class="kv"><span class="k">District</span><span class="v dev">${d}</span></div>
        <div class="kv"><span class="k">Submitted by</span><span class="v num" style="font-size:13px">${esc(e.submittedBy)}</span></div>
        <div class="kv"><span class="k">Time stamp</span><span class="v num" style="font-size:13px">${ts}</span></div>
        <div class="kv"><span class="k">Status</span><span class="v"><span class="pill sub">Submitted</span></span></div>
      </div>
      <div class="wrap-actions" style="justify-content:center">
        <button class="btn" onclick="downloadAck('${d}')">Download Acknowledgement</button>
        <button class="btn" onclick="downloadExcel(['${d}'],'${d}_भरा.xlsx')">Download Excel</button>
        <button class="btn primary" onclick="S.screen='landing';render()">Back to Portal</button>
      </div></div></div>`;
}

/* ================= ADMIN ================= */
function adminLayout(active,content){
  const nav=[['ad_dashboard','▦','Dashboard'],['ad_entries','▤','All Entries'],['ad_reports','▥','Reports'],['ad_access','◍','Access Control']];
  $('#app').innerHTML=topbar()+`<div class="shell">
    <aside class="side"><div class="grp">Admin</div>
      ${nav.map(([k,ic,l])=>`<div class="navitem ${k===active?'on':''}" onclick="S.screen='${k}';render()"><span class="ic">${ic}</span>${l}</div>`).join('')}
    </aside><div class="content">${content}</div></div>`;
}
function adDashboard(){
  const sub=DNAMES.filter(d=>dispStatus(d)==='submitted').length;
  const dr=DNAMES.filter(d=>dispStatus(d)==='draft').length;
  const pend=DNAMES.filter(d=>dispStatus(d)==='pending').length;
  const attn=DNAMES.filter(d=>dispStatus(d)!=='submitted').map(d=>{
    const st=dispStatus(d);let issue=st==='pending'?'Not started':(districtPct(d)<60?'Sections incomplete':'Draft — needs submit');
    return `<tr><td class="dev" style="font-size:16px">${d}</td><td>${issue}</td>
      <td class="right"><button class="btn sm" onclick="adminOpen('${d}')">Open</button></td></tr>`;}).join('')||'<tr><td colspan="3" class="muted">सभी जिले सबमिट हो चुके हैं ✓</td></tr>';
  const overview=DNAMES.map(d=>{const p=districtPct(d),st=dispStatus(d);
    return `<div class="dcard"><div class="dh"><div class="ring" style="--p:${p}"><span>${p}%</span></div>
      <div style="flex:1"><div class="nm">${d}</div><span class="pill ${STCLASS[st]}">${STLABEL[st]}</span></div></div>
      <div class="bar ${p===100?'g':''}"><i style="width:${p}%"></i></div>
      <div class="flex"><span class="muted" style="font-size:12px;flex:1">${districtFilled(d)}/${ALLCOLS.length} fields</span>
        <button class="btn sm" onclick="adminOpen('${d}')">View / Edit</button></div></div>`;}).join('');
  adminLayout('ad_dashboard',`
    <div class="page-h"><h1>Admin Dashboard</h1><span class="pill adm">Solan Vibhag</span></div>
    <div class="sub">सभी आवंटित जिलों की प्रगति व अधूरी प्रविष्टियाँ — केवल Admin को दृश्य।</div>
    <div class="tiles">
      <div class="tile acc"><div class="k">Total Districts</div><div class="v num">${DNAMES.length}</div><div class="x">Solan Vibhag</div></div>
      <div class="tile"><div class="k">Submitted</div><div class="v num" style="color:var(--green)">${sub}</div><div class="x">finalised</div></div>
      <div class="tile"><div class="k">Draft</div><div class="v num" style="color:var(--amber)">${dr}</div><div class="x">need follow-up</div></div>
      <div class="tile"><div class="k">Pending</div><div class="v num" style="color:var(--ink3)">${pend}</div><div class="x">not started</div></div>
    </div>
    <div class="tiles" style="grid-template-columns:1.4fr 1fr">
      <div class="card pad"><div class="eyebrow">Completion overview</div><div class="dgrid">${overview}</div></div>
      <div class="card pad"><div class="eyebrow">Attention required</div>
        <table class="tbl"><thead><tr><th>District</th><th>Issue</th><th></th></tr></thead><tbody>${attn}</tbody></table></div>
    </div>`);
}
function adminOpen(d){S.district=d;S.sectionIdx=0;S.ctx='admin';S.screen='na_form';render();}
function adEntries(){
  const rows=DNAMES.map(d=>{const e=ENTRIES[d],st=dispStatus(d);
    return `<tr><td class="dev" style="font-size:16px">${d}</td>
      <td><span class="pill ${STCLASS[st]}">${STLABEL[st]}</span></td>
      <td class="num">${districtFilled(d)}/${ALLCOLS.length}</td>
      <td style="width:150px"><div class="bar ${districtPct(d)===100?'g':''}"><i style="width:${districtPct(d)}%"></i></div></td>
      <td class="num" style="font-size:12px">${e&&e.submittedBy?esc(e.submittedBy):'—'}</td>
      <td class="right wrap-actions" style="justify-content:flex-end">
        <button class="btn sm" onclick="adminOpen('${d}')">${st==='submitted'?'View/Edit':'Open'}</button>
        ${st==='submitted'?`<button class="btn sm" onclick="unlock('${d}')">Unlock</button>`:''}
        <button class="btn sm" onclick="downloadExcel(['${d}'],'${d}_भरा.xlsx')">Excel</button>
      </td></tr>`;}).join('');
  adminLayout('ad_entries',`
    <div class="page-h"><h1>All Entries</h1></div>
    <div class="sub">सभी जिलों की प्रविष्टि स्थिति। Admin किसी भी फॉर्म को खोल/संपादित/अनलॉक कर सकते हैं।</div>
    <div class="card pad"><div class="flex" style="margin-bottom:12px"><div style="flex:1"></div>
      <button class="btn primary" onclick="downloadExcel(DNAMES,'vibhag_consolidated.xlsx')">Consolidated Excel export</button></div>
    <table class="tbl"><thead><tr><th>District</th><th>Status</th><th>Filled</th><th>Progress</th><th>Submitted by</th><th class="right">Actions</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`);
}
async function unlock(d){
  await window.unlockEntry(d);
  const e=entry(d);e.status='draft';e.submittedBy=null;e.submittedAt=null;
  toast(d+' अनलॉक हुआ','ok');render();
}

function adReports(){
  const opt=(arr,all)=>`<option>${all}</option>`+arr.map(x=>`<option>${x}</option>`).join('');
  const preview=DNAMES.map(d=>{
    const cells=SECTIONS.map(s=>`<td class="num right">${sectionPct(d,s)}%</td>`).join('');
    const st=dispStatus(d);
    return `<tr><td class="dev">${d}</td>${cells}<td class="right"><span class="pill ${STCLASS[st]}">${STLABEL[st]}</span></td></tr>`;}).join('');
  adminLayout('ad_reports',`
    <div class="page-h"><h1>Reports</h1></div>
    <div class="sub">Reports अपलोड किए गए Excel शीर्षकों की संरचना का उपयोग करती हैं।</div>
    <div class="tiles" style="grid-template-columns:1.3fr 1fr">
      <div class="card pad"><div class="eyebrow">Report filters</div>
        <div class="field"><span>District</span><select><option>All Districts</option>${DNAMES.map(d=>`<option>${d}</option>`).join('')}</select></div>
        <div class="field"><span>Section</span><select>${opt(SECTIONS.map(s=>s.short),'All Sections')}</select></div>
        <div class="field"><span>Status</span><select><option>Submitted · Draft · Pending</option><option>Submitted</option><option>Draft</option><option>Pending</option></select></div>
        <button class="btn primary" onclick="toast('Preview नीचे अद्यतन है','ok')">Generate Report</button>
      </div>
      <div class="card pad"><div class="eyebrow">Export options</div>
        <div class="wrap-actions" style="flex-direction:column;align-items:stretch">
          <button class="btn" onclick="downloadExcel(DNAMES,'vibhag_summary.xlsx')">Excel summary export</button>
          <button class="btn" onclick="printReport('district')">District-wise PDF</button>
          <button class="btn" onclick="printReport('vibhag')">Vibhag consolidated PDF</button>
          <button class="btn" onclick="exportCSV()">Admin CSV backup</button>
        </div></div>
    </div>
    <div class="card pad"><div class="eyebrow">Preview table — section completion (%)</div>
      <table class="tbl"><thead><tr><th>District</th>${SECTIONS.map(s=>`<th class="right">${s.short}</th>`).join('')}<th class="right">Status</th></tr></thead>
      <tbody>${preview}</tbody></table></div>`);
}
async function adAccess(){
  ACCESS = await window.fetchAllUsers();
  const rows=ACCESS.map((a,i)=>`<tr><td class="num" style="font-size:13px">${esc(a.email)}</td>
    <td><span class="pill ${a.role==='Admin'?'adm':'usr'}">${a.role}</span></td>
    <td class="dev">${a.role==='Admin'?'All':esc(a.districts.join(', '))}</td>
    <td>${a.status}</td>
    <td class="right">${a.role==='Admin'?'<span class="muted" style="font-size:12px">—</span>':`<button class="btn sm" onclick="removeAccess('${esc(a.email)}')">Remove</button>`}</td></tr>`).join('');
  adminLayout('ad_access',`
    <div class="page-h"><h1>Access Control</h1></div>
    <div class="sub">कौन सी मेल आईडी किस विभाग व जिले भर सकती है, Admin तय करते हैं।</div>
    <div class="tiles" style="grid-template-columns:1fr 1.4fr">
      <div class="card pad"><div class="eyebrow">Add / Edit access</div>
        <div class="field"><span>Mail ID</span><input id="acc_email" type="email" placeholder="person@example.org"></div>
        <div class="field"><span>Role</span><select id="acc_role"><option>Data Entry</option><option>Admin</option></select></div>
        <div class="field"><span>Assigned Vibhag</span><select id="acc_vibhag">
          ${Object.values(SANGATHAN_MAPPING).map(v=>`<option>${v.name}</option>`).join('')}
        </select></div>
        <div class="field"><span>Assigned Districts (Ctrl/Cmd for multiple)</span>
          <select id="acc_dist" multiple size="4">${DNAMES.map(d=>`<option>${d}</option>`).join('')}</select></div>
        <button class="btn primary" onclick="addAccess()">Save Access</button><div class="errline" id="aerr"></div>
      </div>
      <div class="card pad"><div class="eyebrow">Access master table</div>
        <table class="tbl"><thead><tr><th>Email</th><th>Role</th><th>Districts</th><th>Status</th><th class="right"></th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="muted" style="font-size:12px;margin-top:10px">Columns: Email, Role, Vibhag, District, Status, Created/Updated.</div>
      </div>
    </div>`);
}
async function addAccess(){
  const email=($('#acc_email').value||'').trim().toLowerCase();
  const role=$('#acc_role').value, vibhag=$('#acc_vibhag').value;
  const dist=[...$('#acc_dist').selectedOptions].map(o=>o.value);
  if(!email){$('#aerr').textContent='Mail ID दर्ज करें।';return;}
  const districts=role==='Admin'?[...DNAMES]:(dist.length?dist:[DNAMES[0]]);
  const rec={email,role,vibhag,districts,status:'Active'};
  
  await window.addUser(rec);
  
  const ex=ACCESS.findIndex(a=>a.email.toLowerCase()===email);
  if(ex>=0)ACCESS[ex]=rec;else ACCESS.push(rec);
  toast('Access सेव हुआ','ok');render();
}
async function removeAccess(email){
  await window.removeUser(email);
  ACCESS = ACCESS.filter(a=>a.email!==email);
  render();
}

/* ================= EXPORT ================= */
function b64ToBuf(b64){const bin=atob(b64),len=bin.length,buf=new Uint8Array(len);for(let i=0;i<len;i++)buf[i]=bin.charCodeAt(i);return buf.buffer;}
async function downloadExcel(dists,filename){
  try{
    toast('Excel बन रहा है…');
    const wb=new ExcelJS.Workbook();await wb.xlsx.load(b64ToBuf(DATA.b64));
    const ws=wb.getWorksheet(SHEET)||wb.worksheets[0];
    let written=0;
    dists.forEach(name=>{const d=DISTRICTS.find(x=>x.name===name);if(!d)return;const e=ENTRIES[name];if(!e)return;
      ALLCOLS.forEach(col=>{const raw=e.values[col];if(raw==null||raw==='')return;
        const n=Number(raw);ws.getCell(col+d.row).value=isFinite(n)?n:raw;written++;});});
    try{wb.calcProperties.fullCalcOnLoad=true;}catch(_){}
    const out=await wb.xlsx.writeBuffer();
    dl(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename);
    toast(`Excel तैयार — ${written} मान`,'ok');
  }catch(err){console.error(err);toast('Excel त्रुटि: '+err.message,1);}
}
function exportCSV(){
  let rows=[['District','Row','Section','FieldCode','Label','Value']];
  const labelOf={};SECTIONS.forEach(s=>s.groups.forEach(g=>g.fields.forEach(f=>labelOf[f.col]=f.label)));
  DISTRICTS.forEach(d=>{const e=ENTRIES[d.name];if(!e)return;
    SECTIONS.forEach(s=>s.cols.forEach(c=>{const v=e.values[c];if(v==null||v==='')return;
      rows.push([d.name,d.row,s.short,c,labelOf[c]||'',v]);}));});
  const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  dl(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'vibhag_backup.csv');
  toast('CSV backup तैयार','ok');
}
function downloadAck(d){
  const e=entry(d);const ts=e.submittedAt?new Date(e.submittedAt).toLocaleString('en-IN'):'—';
  const html=`<!doctype html><meta charset="utf-8"><title>Acknowledgement</title>
  <body style="font-family:sans-serif;max-width:560px;margin:40px auto;color:#1B2436">
  <h2 style="border-bottom:3px solid #D9661C;padding-bottom:8px">संगठन डेटा पोर्टल — Acknowledgement</h2>
  <p>Submission Completed ✓</p>
  <table style="width:100%;border-collapse:collapse">
   <tr><td style="padding:6px;color:#5A6473">Vibhag</td><td style="padding:6px"><b>${S.user.vibhag}</b></td></tr>
   <tr><td style="padding:6px;color:#5A6473">District</td><td style="padding:6px"><b>${d}</b></td></tr>
   <tr><td style="padding:6px;color:#5A6473">Submitted by</td><td style="padding:6px">${esc(e.submittedBy||'')}</td></tr>
   <tr><td style="padding:6px;color:#5A6473">Time stamp</td><td style="padding:6px">${ts}</td></tr>
   <tr><td style="padding:6px;color:#5A6473">Fields filled</td><td style="padding:6px">${districtFilled(d)}/${ALLCOLS.length}</td></tr>
   <tr><td style="padding:6px;color:#5A6473">Status</td><td style="padding:6px"><b>Submitted</b></td></tr>
  </table></body>`;
  dl(new Blob([html],{type:'text/html'}),`acknowledgement_${d}.html`);
}
function printReport(kind){
  const vibhagName = S.user && S.user.vibhag ? S.user.vibhag : 'All';
  const title=kind==='vibhag'?`Vibhag Consolidated Report — ${vibhagName}`:`District-wise Report — ${vibhagName}`;
  let body=`<h2 style="border-bottom:3px solid #D9661C;padding-bottom:8px;font-family:sans-serif">${title}</h2>
    <p style="font-family:sans-serif;color:#555">Generated ${new Date().toLocaleString('en-IN')} · structure mirrors uploaded Excel headings.</p>`;
  body+=`<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px">
    <thead><tr><th style="text-align:left;border-bottom:2px solid #333;padding:6px">District</th>
    ${SECTIONS.map(s=>`<th style="text-align:right;border-bottom:2px solid #333;padding:6px">${s.short}</th>`).join('')}
    <th style="text-align:right;border-bottom:2px solid #333;padding:6px">Status</th></tr></thead><tbody>
    ${DNAMES.map(d=>`<tr><td style="padding:6px;border-bottom:1px solid #ccc">${d}</td>
      ${SECTIONS.map(s=>`<td style="text-align:right;padding:6px;border-bottom:1px solid #ccc">${sectionPct(d,s)}%</td>`).join('')}
      <td style="text-align:right;padding:6px;border-bottom:1px solid #ccc">${STLABEL[dispStatus(d)]}</td></tr>`).join('')}
    </tbody></table>`;
  $('#printArea').innerHTML=body;window.print();
}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}

/* ================= ROUTER ================= */
function render(){
  saveAll();
  switch(S.screen){
    case'landing':return landingScreen();
    case'login':return loginScreen();
    case'na_form':return naForm();
    case'na_review':return naReview();
    case'na_ack':return naAck();
    case'ad_dashboard':return adDashboard();
    case'ad_entries':return adEntries();
    case'ad_reports':return adReports();
    case'ad_access':return adAccess();
    default:return loginScreen();
  }
}
window.logout=logout;window.doLogin=doLogin;window.openForm=openForm;
window.goSection=goSection;window.prevSection=prevSection;window.nextSection=nextSection;
window.saveDraft=saveDraft;window.gotoReview=gotoReview;window.backToForm=backToForm;
window.finalSubmit=finalSubmit;window.adminOpen=adminOpen;window.adminBack=adminBack;
window.unlock=unlock;window.addAccess=addAccess;window.removeAccess=removeAccess;
window.downloadExcel=downloadExcel;window.exportCSV=exportCSV;window.downloadAck=downloadAck;
window.printReport=printReport;window.S=S;window.DNAMES=DNAMES;window.render=render;
async function init() {
  await loadAppData({ role: 'Public' });
  
  const { data: { session } } = await window.supabaseGetSession();
  if (session) {
    const rec = { email: session.user.email, role: 'Admin', status: 'Active', vibhag: 'Admin', districts: [] };
    await loadAppData(rec);
    S.user = rec;
    S.screen = 'ad_dashboard';
    S.ctx = 'admin';
  }
  render();
}
init();
