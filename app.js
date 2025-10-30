/* ===========================
   Onestop AI — Doctor PWA (Vanilla)
   app.js (full file)
   =========================== */

/* ---------------------------
   THEME ENGINE (5 presets)
--------------------------- */
const THEME_KEY = 'os_theme';
const THEME_PRESETS = ['light','dark','pastel','glass','neo'];

function applyTheme(preset) {
  const safe = THEME_PRESETS.includes(preset) ? preset : 'dark';
  document.documentElement.setAttribute('data-theme', safe);
  localStorage.setItem(THEME_KEY, safe);
  window.dispatchEvent(new CustomEvent('os:theme:changed', { detail: { theme: safe }}));
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}
document.addEventListener('DOMContentLoaded', initTheme);

/* ---------------------------
   STATE + STORAGE
--------------------------- */
const DB_KEYS = {
  patients: 'os_patients',
  appointments: 'os_appointments',
  visits: 'os_visits',
  profile: 'os_doctor_profile',
  ui: 'os_ui',
  flags: 'os_flags'
};

const defaultProfile = {
  appName: 'Onestop AI',
  name: 'Dr. John Smith',
  qualification: 'MBBS, MD',
  specialization: 'General Physician',
  clinic: 'HealthCare Clinic',
  phone: '+1234567890',
  address: '123 Medical Street, City',
  autoSendWhatsAppOnSchedule: true, // toggle in Settings
};

const defaultUI = {
  currentView: 'dashboard',
  search: '',
};

const defaultFlags = {
  showInstall: false
};

const State = {
  patients: [],
  appointments: [],
  visits: [],
  profile: structuredClone(defaultProfile),
  ui: structuredClone(defaultUI),
  flags: structuredClone(defaultFlags),
};

function loadState() {
  try {
    const p = JSON.parse(localStorage.getItem(DB_KEYS.patients) || '[]');
    const a = JSON.parse(localStorage.getItem(DB_KEYS.appointments) || '[]');
    const v = JSON.parse(localStorage.getItem(DB_KEYS.visits) || '[]');
    const prof = JSON.parse(localStorage.getItem(DB_KEYS.profile) || 'null') || defaultProfile;
    const ui = JSON.parse(localStorage.getItem(DB_KEYS.ui) || 'null') || defaultUI;
    const flags = JSON.parse(localStorage.getItem(DB_KEYS.flags) || 'null') || defaultFlags;

    State.patients = p;
    State.appointments = a;
    State.visits = v;
    State.profile = { ...defaultProfile, ...prof };
    State.ui = { ...defaultUI, ...ui };
    State.flags = { ...defaultFlags, ...flags };

  } catch (e) {
    console.error('Load state error', e);
  }
}

function saveState() {
  localStorage.setItem(DB_KEYS.patients, JSON.stringify(State.patients));
  localStorage.setItem(DB_KEYS.appointments, JSON.stringify(State.appointments));
  localStorage.setItem(DB_KEYS.visits, JSON.stringify(State.visits));
  localStorage.setItem(DB_KEYS.profile, JSON.stringify(State.profile));
  localStorage.setItem(DB_KEYS.ui, JSON.stringify(State.ui));
  localStorage.setItem(DB_KEYS.flags, JSON.stringify(State.flags));
}

/* ---------------------------
   UTILS
--------------------------- */
function generateId(prefix='ID') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}
function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
function calcAge(dob) {
  if (!dob) return '';
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
function byDateAsc(a, b) {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

/* ---------------------------
   WHATSAPP PRESETS
   We keep only WhatsApp, as requested.
--------------------------- */
const WAPRESETS = {
  medicationReminder: ({patient, profile, data}) =>
    `Hi ${patient.name}, this is a reminder to continue your medication.\n\n💊 ${data?.medicine || 'Your prescription'}\n🕒 ${data?.timing || 'as advised'}\n⏳ Days remaining: ${data?.daysRemaining ?? '—'}\n\n— ${profile.name}, ${profile.clinic}`,

  medicationIntake: ({patient, profile, data}) =>
    `Hello ${patient.name}, quick check-in on your medication intake.\n\n💊 ${data?.medicine || 'Your prescription'}\n🕒 ${data?.timing || 'as advised'}\n✅ Please confirm you took today’s dose.\n\n— ${profile.name}, ${profile.clinic}`,

  // Custom is provided via textarea
};

function openWhatsApp(num, message) {
  const phone = (num || '').replace(/\s+/g,'');
  const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/* ---------------------------
   DATA OPS
--------------------------- */
function addPatient(p) {
  const patient = {
    id: generateId('PAT'),
    name: p.name?.trim() || 'Unknown',
    dob: p.dob || '',
    gender: p.gender || 'Other',
    phone: p.phone || '',
    whatsapp: p.whatsapp || p.phone || '',
    bloodGroup: p.bloodGroup || '',
    allergies: p.allergies || '',
    address: p.address || '',
    emergencyContact: p.emergencyContact || '',
    registrationDate: new Date().toISOString(),
  };
  State.patients.push(patient);
  saveState();
  render();
  toast('✅ Patient added');
}

function addAppointment(a) {
  const appt = {
    id: generateId('APT'),
    patientId: a.patientId,
    date: a.date,        // ISO datetime
    reason: a.reason || '',
    status: 'pending',   // pending/completed/cancelled
    createdAt: new Date().toISOString(),
  };
  State.appointments.push(appt);
  State.appointments.sort(byDateAsc);
  saveState();
  render();
  toast('📅 Appointment scheduled');

  // Auto-send WhatsApp confirmation (if enabled)
  if (State.profile.autoSendWhatsAppOnSchedule) {
    const patient = State.patients.find(p => p.id === appt.patientId);
    if (patient) {
      const msg = `Hi ${patient.name}, your appointment is scheduled with ${State.profile.name}.\n\n📆 ${formatDate(appt.date)}\n🕒 ${formatTime(appt.date)}\n🏥 ${State.profile.clinic}\n\nReply to confirm.`;
      openWhatsApp(patient.whatsapp, msg);
    }
  }
}

function updateProfile(patch) {
  State.profile = { ...State.profile, ...patch };
  saveState();
  render();
  toast('🛠️ Profile saved');
}

/* ---------------------------
   EXPORT / IMPORT JSON
--------------------------- */
function doExportJSON() {
  const payload = {
    patients: State.patients,
    appointments: State.appointments,
    visits: State.visits,
    profile: State.profile,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onestopai-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function doImportJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.patients)) State.patients = data.patients;
      if (Array.isArray(data.appointments)) State.appointments = data.appointments.sort(byDateAsc);
      if (Array.isArray(data.visits)) State.visits = data.visits;
      if (data.profile) State.profile = { ...defaultProfile, ...data.profile };
      saveState();
      render();
      toast('📥 Data imported');
    } catch (e) {
      alert('Import failed: invalid JSON');
    }
  };
  reader.readAsText(file);
}

/* ---------------------------
   CSV IMPORT (Patients)
--------------------------- */
function parseCSV(text) {
  // Simple CSV (no quoted commas). For complex CSV, use a parser library offline.
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers:[], rows:[] };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map(line => line.split(',').map(v => v.trim()));
  return { headers, rows };
}

function importPatientsCSV(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const { headers, rows } = parseCSV(reader.result);
      if (!headers.length) return alert('Empty/invalid CSV');
      let imported = 0, skipped = 0;
      const phoneIdx = headers.findIndex(h => ['phone','mobile','contact','phone number'].includes(h));
      const nameIdx = headers.findIndex(h => ['name','patient name','full name'].includes(h));
      const dobIdx = headers.findIndex(h => ['dob','date of birth','birthdate'].includes(h));
      const genderIdx = headers.findIndex(h => ['gender','sex'].includes(h));
      const waIdx = headers.findIndex(h => ['whatsapp','whatsapp number'].includes(h));
      const bgIdx = headers.findIndex(h => ['bloodgroup','blood group','blood'].includes(h));
      const allergiesIdx = headers.findIndex(h => ['allergies','allergy'].includes(h));
      const addrIdx = headers.findIndex(h => ['address','location'].includes(h));
      const emIdx = headers.findIndex(h => ['emergency','emergency contact','emergency number'].includes(h));

      rows.forEach(cols => {
        const phone = cols[phoneIdx] || '';
        const name = cols[nameIdx] || '';
        if (!phone || !name) return; // skip
        const exists = State.patients.some(p => (p.phone||'') === phone);
        if (exists) { skipped++; return; }

        const p = {
          name,
          phone,
          dob: dobIdx>=0 ? cols[dobIdx] : '',
          gender: genderIdx>=0 ? (cols[genderIdx] || 'Male') : 'Male',
          whatsapp: waIdx>=0 ? (cols[waIdx] || phone) : phone,
          bloodGroup: bgIdx>=0 ? cols[bgIdx] : '',
          allergies: allergiesIdx>=0 ? cols[allergiesIdx] : '',
          address: addrIdx>=0 ? cols[addrIdx] : '',
          emergencyContact: emIdx>=0 ? cols[emIdx] : '',
        };
        addPatient(p);
        imported++;
      });

      toast(`✅ CSV import done (Imported: ${imported}, Skipped: ${skipped})`);
    } catch (e) {
      alert('CSV parsing failed');
    }
  };
  reader.readAsText(file);
}

/* ---------------------------
   TOAST (tiny)
--------------------------- */
let toastTimer = null;
function toast(msg='Done') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.position='fixed';
    t.style.bottom='20px';
    t.style.right='20px';
    t.style.padding='10px 14px';
    t.style.borderRadius='10px';
    t.style.background='var(--accent)';
    t.style.color='var(--accent-ink)';
    t.style.zIndex='9999';
    t.style.fontWeight='600';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity='1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.style.opacity='0'; }, 1600);
}

/* ---------------------------
   RENDERERS
--------------------------- */
function h(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }

function renderHeader() {
  return h(`
    <header class="card glass" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">🩺</span>
        <strong>${State.profile.appName}</strong>
      </div>
      <nav>
        ${['dashboard','patients','appointments','reminders','settings'].map(id => `
          <button class="btn ${State.ui.currentView===id?'btn-accent':''}" data-nav="${id}">
            ${id==='dashboard'?'🏠':
              id==='patients'?'🧑‍🤝‍🧑':
              id==='appointments'?'📅':
              id==='reminders'?'🔔':'⚙️'} 
            ${id[0].toUpperCase()+id.slice(1)}
          </button>
        `).join('')}
      </nav>
    </header>
  `);
}
function renderFooter() {
  return h(`
    <footer class="card glass" style="margin-top:16px;padding:10px;text-align:center">
      <small class="muted">© ${new Date().getFullYear()} ${State.profile.appName}. Powered by <b>Onestop Ai Services</b>.</small>
    </footer>
  `);
}

function renderDashboard() {
  const today = new Date();
  const todays = State.appointments.filter(a => {
    const d = new Date(a.date);
    return d.toDateString() === today.toDateString();
  });

  return h(`
    <section>
      <div class="card" style="padding:16px; margin-bottom:12px">
        <h2 style="margin:0 0 8px 0">📊 Overview</h2>
        <div style="display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
          <div class="card" style="padding:14px">
            <div class="muted">Total Patients</div>
            <div style="font-size:28px; font-weight:800; color:var(--accent)">${State.patients.length}</div>
          </div>
          <div class="card" style="padding:14px">
            <div class="muted">Today's Appointments</div>
            <div style="font-size:28px; font-weight:800; color:#22c55e">${todays.length}</div>
          </div>
          <div class="card" style="padding:14px">
            <div class="muted">Pending Reminders</div>
            <div style="font-size:28px; font-weight:800; color:#f59e0b">${State.appointments.filter(a=>a.status==='pending').length}</div>
          </div>
          <div class="card" style="padding:14px">
            <div class="muted">Visits (total)</div>
            <div style="font-size:28px; font-weight:800; color:#a78bfa">${State.visits.length}</div>
          </div>
        </div>
      </div>

      <div class="card" style="padding:16px">
        <h3 style="margin-top:0">🕒 Today’s Schedule</h3>
        ${todays.length===0 ? `<div class="muted">No appointments today.</div>` : todays.map(a=>{
          const p = State.patients.find(x=>x.id===a.patientId);
          if (!p) return '';
          return `
            <div class="card" style="padding:12px; display:flex; align-items:center; justify-content:space-between; margin:8px 0">
              <div style="display:flex;align-items:center; gap:10px">
                <div class="chip" style="font-weight:700">${p.name?.[0]||'?'}</div>
                <div>
                  <div><b>${p.name||'—'}</b></div>
                  <div class="muted">${formatTime(a.date)}</div>
                </div>
              </div>
              <button class="btn btn-accent" data-wa-apt="${a.id}">💬 Remind</button>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `);
}

function renderPatients() {
  const q = (State.ui.search||'').toLowerCase();
  const list = State.patients.filter(p=>
    (p.name||'').toLowerCase().includes(q) ||
    (p.phone||'').includes(q) ||
    (p.id||'').toLowerCase().includes(q)
  );

  return h(`
    <section>
      <div class="card" style="padding:16px; margin-bottom:12px">
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
          <h2 style="margin:0">🧑‍🤝‍🧑 Patients</h2>
          <div style="margin-left:auto; display:flex; gap:6px">
            <label class="btn" for="csvFile">⬆️ Import CSV</label>
            <input id="csvFile" type="file" accept=".csv" style="display:none" />
            <button class="btn btn-accent" id="btnAddPatient">➕ Add Patient</button>
          </div>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px; align-items:center">
          <input id="searchBox" placeholder="Search name / phone / ID" style="flex:1; padding:.6rem .8rem; border-radius:10px; border:1px solid var(--border); background:var(--card); color:var(--ink)"/>
        </div>
      </div>

      <div style="display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
        ${list.map(p=>`
          <div class="card" style="padding:14px">
            <div style="display:flex; align-items:center; gap:10px">
              <div class="chip" style="font-size:18px; font-weight:800">${p.name?.[0]||'?'}</div>
              <div>
                <div><b>${p.name||'—'}</b></div>
                <div class="muted">${p.gender||'—'}, ${calcAge(p.dob)||'—'} yrs</div>
              </div>
            </div>
            <div class="muted" style="margin-top:8px">☎️ ${p.phone||'—'}</div>
            <div class="muted">💬 ${p.whatsapp||'—'}</div>
            <div class="muted">🆔 ${p.id}</div>
            <div style="display:flex; gap:8px; margin-top:10px">
              <button class="btn btn-accent" data-view-patient="${p.id}">🔎 View</button>
              <button class="btn" data-wa-quick="${p.id}">💬 WhatsApp</button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Add Patient Modal (inline form card) -->
      <dialog id="dlgAddPatient" class="card" style="padding:16px; border:none; max-width:520px">
        <h3>➕ Add Patient</h3>
        <form id="formAddPatient" style="display:grid; gap:8px; margin-top:8px">
          <input name="name" required placeholder="Full name"/>
          <input name="dob" required type="date" placeholder="DOB (YYYY-MM-DD)"/>
          <select name="gender">
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
          <input name="phone" required placeholder="Phone (+countrycode...)"/>
          <input name="whatsapp" placeholder="WhatsApp (defaults to phone)"/>
          <input name="bloodGroup" placeholder="Blood Group (e.g., O+)"/>
          <input name="allergies" placeholder="Allergies"/>
          <input name="address" placeholder="Address"/>
          <input name="emergencyContact" placeholder="Emergency Contact"/>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px">
            <button type="button" class="btn" id="btnCancelAddPat">Cancel</button>
            <button class="btn btn-accent" type="submit">Save</button>
          </div>
        </form>
      </dialog>
    </section>
  `);
}

function renderAppointments() {
  // auto-sort by date asc
  State.appointments.sort(byDateAsc);

  const filter = ['all','today','upcoming','overdue'].includes(State.ui.apptFilter) ? State.ui.apptFilter : 'all';
  const todayMid = new Date(); todayMid.setHours(0,0,0,0);

  const filtered = State.appointments.filter(a=>{
    const d = new Date(a.date); d.setHours(0,0,0,0);
    if (filter==='today') return d.getTime()===todayMid.getTime();
    if (filter==='upcoming') return d.getTime()>=todayMid.getTime();
    if (filter==='overdue') return d.getTime()<todayMid.getTime() && a.status==='pending';
    return true;
  });

  return h(`
    <section>
      <div class="card" style="padding:16px; margin-bottom:12px">
        <div style="display:flex; gap:8px; align-items:center">
          <h2 style="margin:0">📅 Appointments</h2>
          <div style="margin-left:auto; display:flex; gap:6px">
            <button class="btn btn-accent" id="btnNewApt">➕ Schedule</button>
          </div>
        </div>
        <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap">
          ${['all','today','upcoming','overdue'].map(f=>`
            <button class="theme-pill ${filter===f?'active':''}" data-appt-filter="${f}">${f}</button>
          `).join('')}
        </div>
      </div>

      <div class="card" style="padding:0; overflow:hidden">
        ${filtered.length===0 ? `<div class="muted" style="padding:16px">No appointments.</div>` : `
          ${filtered.map(a=>{
            const p = State.patients.find(x=>x.id===a.patientId);
            if (!p) return '';
            return `
              <div style="display:flex;justify-content:space-between;gap:8px;padding:12px;border-bottom:1px solid var(--border)">
                <div style="display:flex;gap:10px;align-items:center">
                  <div class="chip" style="font-weight:800">${p.name?.[0]||'?'}</div>
                  <div>
                    <div><b>${p.name||'—'}</b></div>
                    <div class="muted">${formatDate(a.date)} · ${formatTime(a.date)}</div>
                    <div class="muted">Status: ${a.status}</div>
                  </div>
                </div>
                <div style="display:flex; gap:6px; align-items:center">
                  <button class="btn" data-wa-apt="${a.id}">💬 Remind</button>
                </div>
              </div>
            `;
          }).join('')}
        `}
      </div>

      <!-- New Appointment dialog -->
      <dialog id="dlgNewApt" class="card" style="padding:16px; border:none; max-width:520px">
        <h3>➕ Schedule Appointment</h3>
        <form id="formNewApt" style="display:grid; gap:8px; margin-top:8px">
          <select name="patientId" required>
            <option value="">Choose patient</option>
            ${State.patients.map(p=>`<option value="${p.id}">${p.name} — ${p.phone}</option>`).join('')}
          </select>
          <input type="date" name="date" required />
          <input type="time" name="time" required />
          <textarea name="reason" placeholder="Reason (optional)"></textarea>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px">
            <button type="button" class="btn" id="btnCancelNewApt">Cancel</button>
            <button class="btn btn-accent" type="submit">Save</button>
          </div>
        </form>
      </dialog>
    </section>
  `);
}

function renderReminders() {
  const now = new Date();
  const next48 = State.appointments.filter(a=>{
    if (a.status!=='pending') return false;
    const diffH = (new Date(a.date).getTime() - now.getTime())/(1000*60*60);
    return diffH>0 && diffH<=48;
  }).sort(byDateAsc);

  return h(`
    <section>
      <div class="card" style="padding:16px; margin-bottom:12px">
        <h2 style="margin:0">🔔 Reminders</h2>
        <p class="muted" style="margin:8px 0 0">Send WhatsApp reminders with 1 tap. Only WhatsApp is supported (as requested).</p>
      </div>

      <div class="card" style="padding:16px">
        <h3 style="margin-top:0">Pending (next 48h): ${next48.length}</h3>

        ${next48.length===0 ? `<div class="muted">No pending reminders.</div>` : `
          ${next48.map(a=>{
            const p = State.patients.find(x=>x.id===a.patientId);
            if (!p) return '';
            const hoursUntil = Math.round((new Date(a.date)-now)/(1000*60*60));
            return `
              <div class="card" style="padding:12px; margin:10px 0; display:flex; justify-content:space-between; align-items:center; gap:8px">
                <div>
                  <div><b>${p.name||'—'}</b> <span class="chip">${hoursUntil<24?`${hoursUntil}h`:`${Math.round(hoursUntil/24)}d`} left</span></div>
                  <div class="muted">${formatDate(a.date)} · ${formatTime(a.date)}</div>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end">
                  <button class="btn" data-wa-preset="medicationReminder" data-wa-for="${p.id}" data-apt="${a.id}">💊 Medication</button>
                  <button class="btn" data-wa-preset="medicationIntake" data-wa-for="${p.id}" data-apt="${a.id}">⏱️ Intake</button>
                  <button class="btn btn-accent" data-wa-apt="${a.id}">💬 Generic</button>
                </div>
              </div>
            `;
          }).join('')}
          <div style="display:flex; gap:8px; margin-top:12px">
            <button class="btn btn-accent" id="btnSendAll">🚀 Send All (generic)</button>
          </div>
        `}
      </div>

      <div class="card" style="padding:16px; margin-top:12px">
        <h3 style="margin:0 0 8px 0">✍️ Custom WhatsApp</h3>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <select id="waCustomPatient">
            ${State.patients.map(p=>`<option value="${p.id}">${p.name} — ${p.phone}</option>`).join('')}
          </select>
          <textarea id="waCustomText" placeholder="Write your message..." style="flex:1; min-width:240px"></textarea>
          <button class="btn btn-accent" id="btnSendCustom">Send</button>
        </div>
      </div>
    </section>
  `);
}

function renderSettings() {
  const t = localStorage.getItem(THEME_KEY) || 'dark';
  const p = State.profile;

  return h(`
    <section>
      <div class="card" style="padding:16px; margin-bottom:12px">
        <h2 style="margin:0">⚙️ Settings</h2>
      </div>

      <div class="card" style="padding:16px; margin-bottom:12px">
        <h3 style="margin-top:0">🎨 Theme Presets</h3>
        <div id="themeRow" style="display:flex; gap:8px; flex-wrap:wrap">
          ${THEME_PRESETS.map(x=>`<button class="theme-pill ${t===x?'active':''}" data-theme="${x}">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}
        </div>
      </div>

      <div class="card" style="padding:16px; margin-bottom:12px">
        <h3 style="margin-top:0">👤 Doctor Profile</h3>
        <form id="formProfile" style="display:grid; gap:8px; max-width:720px">
          <input name="appName" placeholder="App Name" value="${p.appName||''}"/>
          <input name="name" placeholder="Doctor Name" value="${p.name||''}"/>
          <input name="qualification" placeholder="Qualification" value="${p.qualification||''}"/>
          <input name="specialization" placeholder="Specialization" value="${p.specialization||''}"/>
          <input name="clinic" placeholder="Clinic Name" value="${p.clinic||''}"/>
          <input name="phone" placeholder="Phone" value="${p.phone||''}"/>
          <input name="address" placeholder="Address" value="${p.address||''}"/>

          <label style="display:flex; align-items:center; gap:8px">
            <input type="checkbox" name="autoSendWhatsAppOnSchedule" ${p.autoSendWhatsAppOnSchedule?'checked':''}/>
            <span>Auto-send WhatsApp confirmation on scheduling</span>
          </label>

          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px">
            <button type="submit" class="btn btn-accent">Save</button>
          </div>
        </form>
      </div>

      <div class="card" style="padding:16px">
        <h3 style="margin-top:0">🗄️ Data</h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          <button id="btnExport" class="btn">⬇️ Export JSON</button>
          <label class="btn" for="jsonImport">⬆️ Import JSON</label>
          <input id="jsonImport" type="file" accept=".json" style="display:none"/>
          <button id="btnClear" class="btn" style="border-color:#ef4444;color:#ef4444">🗑️ Clear All</button>
        </div>
        <div class="muted" style="margin-top:8px">
          Storage: ~${(new Blob([JSON.stringify({
            patients: State.patients, appointments: State.appointments, visits: State.visits
          })]).size/1024).toFixed(1)} KB
        </div>
      </div>
    </section>
  `);
}

/* ---------------------------
   MAIN APP RENDER + WIRING
--------------------------- */
function render() {
  const root = document.getElementById('app');
  root.innerHTML = '';

  // header
  const header = renderHeader();
  root.appendChild(header);

  // body (view)
  let view;
  switch (State.ui.currentView) {
    case 'patients': view = renderPatients(); break;
    case 'appointments': view = renderAppointments(); break;
    case 'reminders': view = renderReminders(); break;
    case 'settings': view = renderSettings(); break;
    default: view = renderDashboard(); break;
  }
  root.appendChild(view);

  // footer
  root.appendChild(renderFooter());

  // WIRE HEADER NAV
  header.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      State.ui.currentView = btn.dataset.nav;
      saveState();
      render();
    });
  });

  // VIEW-SPECIFIC WIRING
  if (State.ui.currentView==='patients') wirePatientsView(view);
  if (State.ui.currentView==='appointments') wireAppointmentsView(view);
  if (State.ui.currentView==='reminders') wireRemindersView(view);
  if (State.ui.currentView==='settings') wireSettingsView(view);

  // generic WhatsApp apt buttons (present in Dashboard & Appointments)
  root.querySelectorAll('[data-wa-apt]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const apptId = btn.dataset.waApt;
      const a = State.appointments.find(x=>x.id===apptId);
      if (!a) return;
      const p = State.patients.find(y=>y.id===a.patientId);
      if (!p) return;
      const msg = `Hi ${p.name}, reminder for your appointment with ${State.profile.name}.\n\n📆 ${formatDate(a.date)}\n🕒 ${formatTime(a.date)}\n🏥 ${State.profile.clinic}\n\nReply to confirm.`;
      openWhatsApp(p.whatsapp, msg);
    });
  });
}

function wirePatientsView(view) {
  const searchBox = view.querySelector('#searchBox');
  if (searchBox) {
    searchBox.value = State.ui.search || '';
    searchBox.addEventListener('input', ()=>{
      State.ui.search = searchBox.value;
      saveState();
      render();
    });
  }
  const csvFile = view.querySelector('#csvFile');
  if (csvFile) csvFile.addEventListener('change', e=>{
    if (e.target.files?.[0]) importPatientsCSV(e.target.files[0]);
  });

  const btnAdd = view.querySelector('#btnAddPatient');
  const dlg = view.querySelector('#dlgAddPatient');
  const form = view.querySelector('#formAddPatient');
  const cancel = view.querySelector('#btnCancelAddPat');

  if (btnAdd && dlg) btnAdd.addEventListener('click', ()=>dlg.showModal());
  if (cancel && dlg) cancel.addEventListener('click', ()=>dlg.close());
  if (form) form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    addPatient(Object.fromEntries(fd.entries()));
    dlg.close();
  });

  // view + quick WA
  view.querySelectorAll('[data-view-patient]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.viewPatient;
      const p = State.patients.find(x=>x.id===id);
      if (!p) return;
      alert(
        `Patient\n\n${p.name}\nGender: ${p.gender}\nAge: ${calcAge(p.dob)}\nPhone: ${p.phone}\nWhatsApp: ${p.whatsapp}\nID: ${p.id}\nRegistered: ${formatDate(p.registrationDate)}`
      );
    });
  });
  view.querySelectorAll('[data-wa-quick]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.waQuick;
      const p = State.patients.find(x=>x.id===id);
      if (!p) return;
      openWhatsApp(p.whatsapp, `Hi ${p.name}, this is ${State.profile.name} (${State.profile.clinic}).`);
    });
  });
}

function wireAppointmentsView(view) {
  // filter chips
  view.querySelectorAll('[data-appt-filter]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      State.ui.apptFilter = chip.dataset.apptFilter;
      saveState();
      render();
    });
  });

  // schedule dialog
  const btnNew = view.querySelector('#btnNewApt');
  const dlg = view.querySelector('#dlgNewApt');
  const cancel = view.querySelector('#btnCancelNewApt');
  const form = view.querySelector('#formNewApt');

  if (btnNew && dlg) btnNew.addEventListener('click', ()=>dlg.showModal());
  if (cancel && dlg) cancel.addEventListener('click', ()=>dlg.close());
  if (form) form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const date = fd.get('date');
    const time = fd.get('time');
    const iso = new Date(`${date}T${time}`).toISOString();
    addAppointment({
      patientId: fd.get('patientId'),
      date: iso,
      reason: fd.get('reason') || ''
    });
    dlg.close();
  });
}

function wireRemindersView(view) {
  // Generic remind buttons are handled in global render() for [data-wa-apt].
  // Preset buttons:
  view.querySelectorAll('[data-wa-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const preset = btn.dataset.waPreset;
      const patientId = btn.dataset.waFor;
      const apptId = btn.dataset.apt;
      const p = State.patients.find(x=>x.id===patientId);
      const a = State.appointments.find(x=>x.id===apptId);
      if (!p || !a) return;
      const msg = WAPRESETS[preset]({
        patient: p,
        profile: State.profile,
        data: { medicine: 'As prescribed', timing: `${formatTime(a.date)}`, daysRemaining: 3 }
      });
      openWhatsApp(p.whatsapp, msg);
    });
  });

  // Send All generic
  const btnAll = view.querySelector('#btnSendAll');
  if (btnAll) btnAll.addEventListener('click', ()=>{
    // Collect pending next 48h again:
    const now = new Date();
    const list = State.appointments
      .filter(a=>{
        if (a.status!=='pending') return false;
        const diffH = (new Date(a.date)-now)/(1000*60*60);
        return diffH>0 && diffH<=48;
      })
      .sort(byDateAsc);

    list.forEach((a, idx)=>{
      const p = State.patients.find(x=>x.id===a.patientId);
      if (!p) return;
      const msg = `Hi ${p.name}, reminder for your appointment with ${State.profile.name}.\n\n📆 ${formatDate(a.date)}\n🕒 ${formatTime(a.date)}\n🏥 ${State.profile.clinic}\n\nReply to confirm.`;
      setTimeout(()=>openWhatsApp(p.whatsapp, msg), idx*800);
    });
  });

  // Custom WA
  const sel = view.querySelector('#waCustomPatient');
  const ta = view.querySelector('#waCustomText');
  const send = view.querySelector('#btnSendCustom');
  if (send) send.addEventListener('click', ()=>{
    const id = sel.value;
    const p = State.patients.find(x=>x.id===id);
    if (!p) return alert('Select patient');
    if (!ta.value.trim()) return alert('Write a message');
    openWhatsApp(p.whatsapp, `${ta.value.trim()}\n\n— ${State.profile.name}, ${State.profile.clinic}`);
  });
}

function wireSettingsView(view) {
  // theme pills
  const row = view.querySelector('#themeRow');
  if (row) {
    const pills = Array.from(row.querySelectorAll('.theme-pill'));
    function syncActive() {
      const cur = localStorage.getItem(THEME_KEY) || 'dark';
      pills.forEach(p => p.classList.toggle('active', p.dataset.theme===cur));
    }
    row.addEventListener('click', (e)=>{
      const btn = e.target.closest('.theme-pill');
      if (!btn) return;
      applyTheme(btn.dataset.theme);
      syncActive();
    });
    window.addEventListener('os:theme:changed', syncActive);
  }

  // profile form
  const form = view.querySelector('#formProfile');
  if (form) form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    updateProfile({
      appName: fd.get('appName'),
      name: fd.get('name'),
      qualification: fd.get('qualification'),
      specialization: fd.get('specialization'),
      clinic: fd.get('clinic'),
      phone: fd.get('phone'),
      address: fd.get('address'),
      autoSendWhatsAppOnSchedule: !!fd.get('autoSendWhatsAppOnSchedule'),
    });
  });

  // data ops
  const btnExport = view.querySelector('#btnExport');
  const jsonImport = view.querySelector('#jsonImport');
  const btnClear = view.querySelector('#btnClear');

  if (btnExport) btnExport.addEventListener('click', doExportJSON);
  if (jsonImport) jsonImport.addEventListener('change', e=>{
    if (e.target.files?.[0]) doImportJSON(e.target.files[0]);
  });
  if (btnClear) btnClear.addEventListener('click', ()=>{
    if (!confirm('Delete ALL data? This cannot be undone.')) return;
    localStorage.clear();
    // reset in-memory
    State.patients = [];
    State.appointments = [];
    State.visits = [];
    State.profile = structuredClone(defaultProfile);
    State.ui = structuredClone(defaultUI);
    State.flags = structuredClone(defaultFlags);
    saveState();
    render();
    toast('🗑️ Cleared');
  });
}

/* ---------------------------
   BOOT
--------------------------- */
function boot() {
  loadState();
  render();
}

document.addEventListener('DOMContentLoaded', boot);