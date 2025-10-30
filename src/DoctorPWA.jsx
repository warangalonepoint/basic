import React, { useEffect, useState } from "react";

/** ----------------------------
 *  Utilities
 * ---------------------------*/
const genId = () =>
  `PAT${Date.now()}${Math.random().toString(36).slice(2, 9)}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const calcAge = (dob) => {
  if (!dob) return "";
  const t = new Date();
  const b = new Date(dob);
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
};

const toWA = (num) => {
  if (!num) return "";
  const d = String(num).replace(/\D/g, "");
  if (d.length >= 11) return d; // already with country code
  if (d.length === 10) return `91${d}`; // default to IN if 10-digit
  return d;
};

/** ----------------------------
 *  Message templates (editable)
 * ---------------------------*/
const DEFAULT_TEMPLATES = {
  nextVisit:
    "Hi {{patientName}}, this is a reminder for your next visit on {{date}} at {{time}} with {{doctorName}} at {{clinicName}}. Reply YES to confirm.",
  medicationReminder:
    "Hello {{patientName}}, please remember to take your medication {{medicine}} ({{dosage}}) at {{timing}}. — {{doctorName}}",
  intakeReminder:
    "Dear {{patientName}}, it’s time to take {{medicine}} ({{dosage}}). Stay consistent for best results. — {{doctorName}}",
  custom: "Hi {{patientName}}, {{customMessage}} — {{doctorName}}",
};

function renderTemplate(tpl, ctx) {
  return tpl
    .replaceAll("{{patientName}}", ctx.patient?.name || "")
    .replaceAll("{{date}}", ctx.date ? fmtDate(ctx.date) : "")
    .replaceAll("{{time}}", ctx.date ? fmtTime(ctx.date) : "")
    .replaceAll("{{doctorName}}", ctx.doctor?.name || "")
    .replaceAll("{{clinicName}}", ctx.doctor?.clinic || "")
    .replaceAll("{{medicine}}", ctx.medicine || "")
    .replaceAll("{{dosage}}", ctx.dosage || "")
    .replaceAll("{{timing}}", ctx.timing || "")
    .replaceAll("{{customMessage}}", ctx.customMessage || "");
}

/** ----------------------------
 *  Theme helpers (light/dark/pastel)
 * ---------------------------*/
const themePalette = (theme) => {
  switch (theme) {
    case "dark":
      return {
        bodyBg: "#0f172a", // slate-900
        text: "#e5e7eb", // gray-200
        cardBg: "#111827", // gray-900
        chipBg: "#1e293b",
        sidebarBg: "linear-gradient(180deg,#0b1020,#1f2937)",
        accentBlue: "#60a5fa",
        accentGreen: "#34d399",
        accentAmber: "#fbbf24",
        accentPurple: "#a78bfa",
        tableDivider: "#1f2937",
      };
    case "pastel":
      return {
        bodyBg:
          "linear-gradient(145deg,#eef3f1 0%,#f0eef9 50%,#fff2eb 100%)",
        text: "#0f172a",
        cardBg: "#ffffff",
        chipBg: "#e5f4ff",
        sidebarBg: "linear-gradient(180deg,#49d6a9,#b9e6ff)",
        accentBlue: "#2563eb",
        accentGreen: "#10b981",
        accentAmber: "#f59e0b",
        accentPurple: "#7c3aed",
        tableDivider: "#e5e7eb",
      };
    default:
      // light
      return {
        bodyBg: "#f3f4f6",
        text: "#111827",
        cardBg: "#ffffff",
        chipBg: "#e5f4ff",
        sidebarBg: "linear-gradient(180deg,#3b82f6,#93c5fd)",
        accentBlue: "#1d4ed8",
        accentGreen: "#10b981",
        accentAmber: "#f59e0b",
        accentPurple: "#7c3aed",
        tableDivider: "#e5e7eb",
      };
  }
};

/** ----------------------------
 *  Component
 * ---------------------------*/
export default function DoctorPWA() {
  /** State */
  const [view, setView] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [doctor, setDoctor] = useState({
    name: "Dr. John Smith",
    qualification: "MBBS, MD",
    specialization: "General Physician",
    clinic: "Onestop Ai Clinic",
    phone: "+919999999999",
    address: "Warangal",
  });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {type, payload}
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [messageCtx, setMessageCtx] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("nextVisit");
  const [preview, setPreview] = useState("");
  const [theme, setTheme] = useState("pastel"); // default pastel

  /** Init from localStorage */
  useEffect(() => {
    const load = (k, f) => {
      try {
        const x = localStorage.getItem(k);
        return x ? JSON.parse(x) : f;
      } catch {
        return f;
      }
    };
    setPatients(load("patients", []));
    setAppointments(load("appointments", []));
    setVisits(load("visits", []));
    const d = load("doctor", null);
    if (d) setDoctor(d);
    const t = load("templates", null);
    if (t) setTemplates({ ...DEFAULT_TEMPLATES, ...t });
    const th = localStorage.getItem("theme");
    if (th) setTheme(th);
  }, []);

  /** Persist */
  useEffect(() => localStorage.setItem("patients", JSON.stringify(patients)), [patients]);
  useEffect(() => localStorage.setItem("appointments", JSON.stringify(appointments)), [appointments]);
  useEffect(() => localStorage.setItem("visits", JSON.stringify(visits)), [visits]);
  useEffect(() => localStorage.setItem("doctor", JSON.stringify(doctor)), [doctor]);
  useEffect(() => localStorage.setItem("templates", JSON.stringify(templates)), [templates]);
  useEffect(() => localStorage.setItem("theme", theme), [theme]);

  /** Derived */
  const todayApts = appointments.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString()
  );
  const tone = themePalette(theme);

  /** Actions */
  const addPatient = (p) =>
    setPatients((prev) => [
      ...prev,
      { ...p, id: genId(), registrationDate: new Date().toISOString() },
    ]);

  const addApt = (a) =>
    setAppointments((prev) => [
      ...prev,
      { ...a, id: genId(), status: "pending" },
    ]);

  /** WhatsApp flow */
  const openSendModal = (patient, date) => {
    const ctx = { patient, date, doctor };
    setMessageCtx(ctx);
    setSelectedTemplate("nextVisit");
    setPreview(renderTemplate(templates.nextVisit, ctx));
    setModal({ type: "sendMessage" });
  };

  const performSend = () => {
    if (!messageCtx?.patient) return;
    const num = toWA(messageCtx.patient.whatsapp || messageCtx.patient.phone);
    if (!num) return alert("No WhatsApp / phone on this patient");
    const url = `https://wa.me/${num}?text=${encodeURIComponent(preview)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setModal(null);
  };

  /** Views */
  const Dashboard = () => (
    <div className="container">
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "16px 0", color: tone.text }}>
        Onestop Ai — Dashboard
      </h1>

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}
      >
        <div className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
          <div className="space-between">
            <div className="text-muted">Total Patients</div>
            <div>🧑‍⚕️</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: tone.accentBlue }}>
            {patients.length}
          </div>
        </div>

        <div className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
          <div className="space-between">
            <div className="text-muted">Today's Appointments</div>
            <div>📅</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: tone.accentGreen }}>
            {todayApts.length}
          </div>
        </div>

        <div className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
          <div className="space-between">
            <div className="text-muted">Pending Reminders</div>
            <div>🔔</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: tone.accentAmber }}>
            {appointments.filter((a) => a.status === "pending").length}
          </div>
        </div>

        <div className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
          <div className="space-between">
            <div className="text-muted">Total Visits</div>
            <div>📈</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: tone.accentPurple }}>
            {visits.length}
          </div>
        </div>
      </div>

      <div className="card p-4 mt-4" style={{ background: tone.cardBg, color: tone.text }}>
        <div className="row space-between mb-3">
          <h3 className="mb-0">Today's Schedule</h3>
          <button className="btn secondary" onClick={() => setView("appointments")}>
            Go to Appointments
          </button>
        </div>

        {!todayApts.length && (
          <div className="text-muted p-2">No appointments today</div>
        )}

        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          {todayApts.map((a) => {
            const p = patients.find((x) => x.id === a.patientId);
            if (!p) return null;
            return (
              <div
                key={a.id}
                className="row space-between p-3 round"
                style={{ background: "#f3f4f6" }}
              >
                <div className="row" style={{ gap: 12 }}>
                  <div className="chip" style={{ background: tone.chipBg }}>
                    {p.name?.slice(0, 1) || "?"}
                  </div>
                  <div className="col">
                    <strong>{p.name}</strong>
                    <span className="text-muted">{fmtTime(a.date)}</span>
                  </div>
                </div>
                <button className="btn primary" onClick={() => openSendModal(p, a.date)}>
                  Send Reminder
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const PatientsView = () => {
    const filtered = patients.filter(
      (p) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search) ||
        p.id?.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div className="container">
        <div className="row space-between">
          <h1 style={{ margin: "16px 0", color: tone.text }}>Patients</h1>
          <div className="row">
            <button className="btn primary" onClick={() => setModal({ type: "addPatient" })}>
              + Add Patient
            </button>
          </div>
        </div>

        <input
          className="input"
          placeholder="Search by name, phone, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div
          className="grid mt-4"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}
        >
          {filtered.map((p) => (
            <div key={p.id} className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="chip" style={{ background: tone.chipBg }}>
                  {p.name?.slice(0, 1) || "?"}
                </div>
                <div className="col">
                  <strong>{p.name}</strong>
                  <span className="text-muted">
                    {p.gender}, {calcAge(p.dob)} yrs
                  </span>
                </div>
              </div>
              <div className="mt-3 text-muted" style={{ fontSize: 14 }}>
                📞 {p.phone} &nbsp;&nbsp; • &nbsp;&nbsp; ID: {p.id.slice(0, 12)}...
              </div>
              <div className="row mt-3">
                <button
                  className="btn secondary"
                  onClick={() => setModal({ type: "viewPatient", payload: p })}
                >
                  View
                </button>
                <button
                  className="btn primary"
                  onClick={() => openSendModal(p, new Date().toISOString())}
                >
                  Quick WA
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AppointmentsView = () => {
    return (
      <div className="container">
        <div className="row space-between">
          <h1 style={{ margin: "16px 0", color: tone.text }}>Appointments</h1>
          <button
            className="btn secondary"
            onClick={() => setModal({ type: "addAppointment" })}
          >
            + Schedule
          </button>
        </div>
        <div className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
          {!appointments.length && <div className="text-muted">No appointments</div>}
          <table className="table" style={{ borderColor: tone.tableDivider }}>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const p = patients.find((x) => x.id === a.patientId);
                if (!p) return null;
                return (
                  <tr key={a.id}>
                    <td>{p.name}</td>
                    <td>{fmtDate(a.date)}</td>
                    <td>{fmtTime(a.date)}</td>
                    <td>
                      <span className="badge" style={{ background: "#fde68a" }}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn primary" onClick={() => openSendModal(p, a.date)}>
                        Send
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    const [tab, setTab] = useState("appearance");
    const [localDoctor, setLocalDoctor] = useState(doctor);
    const [localTpl, setLocalTpl] = useState(templates);
    const [localTheme, setLocalTheme] = useState(theme);

    const save = () => {
      setDoctor(localDoctor);
      setTemplates(localTpl);
      setTheme(localTheme);
      alert("Saved");
    };

    return (
      <div className="container">
        <h1 style={{ margin: "16px 0", color: tone.text }}>Settings</h1>
        <div className="row mb-3">
          <button
            className={`btn ${tab === "appearance" ? "secondary" : ""}`}
            onClick={() => setTab("appearance")}
          >
            Appearance
          </button>
          <button
            className={`btn ${tab === "notifications" ? "secondary" : ""}`}
            onClick={() => setTab("notifications")}
          >
            Notifications
          </button>
        </div>

        {tab === "appearance" && (
          <div className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
            <h3>Branding</h3>
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}
            >
              <div className="col">
                <label className="text-muted mb-2">Doctor Name</label>
                <input
                  className="input"
                  value={localDoctor.name}
                  onChange={(e) =>
                    setLocalDoctor({ ...localDoctor, name: e.target.value })
                  }
                />
              </div>
              <div className="col">
                <label className="text-muted mb-2">Clinic</label>
                <input
                  className="input"
                  value={localDoctor.clinic}
                  onChange={(e) =>
                    setLocalDoctor({ ...localDoctor, clinic: e.target.value })
                  }
                />
              </div>
              <div className="col">
                <label className="text-muted mb-2">Phone</label>
                <input
                  className="input"
                  value={localDoctor.phone}
                  onChange={(e) =>
                    setLocalDoctor({ ...localDoctor, phone: e.target.value })
                  }
                />
              </div>
              <div className="col">
                <label className="text-muted mb-2">Theme</label>
                <select
                  className="input"
                  value={localTheme}
                  onChange={(e) => setLocalTheme(e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="pastel">Pastel</option>
                </select>
              </div>
            </div>
            <button className="btn primary mt-3" onClick={save}>
              Save
            </button>
          </div>
        )}

        {tab === "notifications" && (
          <div className="card p-4" style={{ background: tone.cardBg, color: tone.text }}>
            <h3>Message Templates</h3>
            <p className="text-muted">
              Use placeholders like <code>{`{{patientName}}`}</code>,{" "}
              <code>{`{{date}}`}</code>, <code>{`{{time}}`}</code>,{" "}
              <code>{`{{doctorName}}`}</code>, <code>{`{{clinicName}}`}</code>,{" "}
              <code>{`{{medicine}}`}</code>, <code>{`{{dosage}}`}</code>,{" "}
              <code>{`{{timing}}`}</code>.
            </p>

            {Object.entries(localTpl).map(([k, v]) => (
              <div key={k} className="col mt-3">
                <label
                  className="text-muted mb-2"
                  style={{ textTransform: "capitalize" }}
                >
                  {k}
                </label>
                <textarea
                  className="input"
                  rows="3"
                  value={v}
                  onChange={(e) => setLocalTpl({ ...localTpl, [k]: e.target.value })}
                />
              </div>
            ))}
            <button className="btn primary mt-3" onClick={save}>
              Save Templates
            </button>
          </div>
        )}
      </div>
    );
  };

  /** ----------------------------
   *  Modals
   * ---------------------------*/
  const AddPatientModal = () => {
    const [f, setF] = useState({
      name: "",
      dob: "",
      gender: "Male",
      phone: "",
      whatsapp: "",
      bloodGroup: "",
      allergies: "",
    });
    return (
      <div className="modal">
        <h3 className="mb-3">Add Patient</h3>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}
        >
          <input
            className="input"
            placeholder="Full name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={f.dob}
            onChange={(e) => setF({ ...f, dob: e.target.value })}
          />
          <select
            className="input"
            value={f.gender}
            onChange={(e) => setF({ ...f, gender: e.target.value })}
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
          <input
            className="input"
            placeholder="Phone"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
          <input
            className="input"
            placeholder="WhatsApp (optional)"
            value={f.whatsapp}
            onChange={(e) => setF({ ...f, whatsapp: e.target.value })}
          />
          <input
            className="input"
            placeholder="Blood Group"
            value={f.bloodGroup}
            onChange={(e) => setF({ ...f, bloodGroup: e.target.value })}
          />
        </div>
        <div className="row mt-3">
          <button
            className="btn primary"
            onClick={() => {
              if (!f.name || !f.phone) return alert("Name & phone required");
              addPatient(f);
              setModal(null);
            }}
          >
            Save
          </button>
          <button className="btn" onClick={() => setModal(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const AddAppointmentModal = () => {
    const [f, setF] = useState({
      patientId: "",
      date: "",
      time: "",
      reason: "",
    });
    return (
      <div className="modal">
        <h3 className="mb-3">Schedule Appointment</h3>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}
        >
          <select
            className="input"
            value={f.patientId}
            onChange={(e) => setF({ ...f, patientId: e.target.value })}
          >
            <option value="">Select patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.phone}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
          <input
            className="input"
            type="time"
            value={f.time}
            onChange={(e) => setF({ ...f, time: e.target.value })}
          />
          <input
            className="input"
            placeholder="Reason (optional)"
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
          />
        </div>
        <div className="row mt-3">
          <button
            className="btn primary"
            onClick={() => {
              if (!f.patientId || !f.date || !f.time) return alert("Missing fields");
              addApt({
                patientId: f.patientId,
                date: new Date(`${f.date}T${f.time}`).toISOString(),
                reason: f.reason,
              });
              setModal(null);
            }}
          >
            Save
          </button>
          <button className="btn" onClick={() => setModal(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const ViewPatientModal = () => {
    const p = modal?.payload;
    if (!p) return null;
    return (
      <div className="modal">
        <h3 className="mb-3">Patient</h3>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}
        >
          <div>
            <div className="text-muted">Name</div>
            <strong>{p.name}</strong>
          </div>
          <div>
            <div className="text-muted">Gender</div>
            <strong>{p.gender}</strong>
          </div>
          <div>
            <div className="text-muted">Age</div>
            <strong>{calcAge(p.dob)} yrs</strong>
          </div>
          <div>
            <div className="text-muted">Phone</div>
            <strong>{p.phone}</strong>
          </div>
          <div>
            <div className="text-muted">WhatsApp</div>
            <strong>{p.whatsapp || "-"}</strong>
          </div>
        </div>
        <div className="row mt-3">
          <button
            className="btn primary"
            onClick={() => openSendModal(p, new Date().toISOString())}
          >
            Quick WA
          </button>
          <button className="btn" onClick={() => setModal(null)}>
            Close
          </button>
        </div>
      </div>
    );
  };

  const SendMessageModal = () => {
    const patient = messageCtx?.patient;
    if (!patient) return null;

    const onChangeTemplate = (key) => {
      setSelectedTemplate(key);
      const text = renderTemplate(templates[key], { ...messageCtx });
      setPreview(text);
    };

    return (
      <div className="modal">
        <h3 className="mb-3">Send WhatsApp Message</h3>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}
        >
          <div>
            <div className="text-muted mb-2">Template</div>
            <select
              className="input"
              value={selectedTemplate}
              onChange={(e) => onChangeTemplate(e.target.value)}
            >
              <option value="nextVisit">Next Visit Reminder</option>
              <option value="medicationReminder">Medication Reminder</option>
              <option value="intakeReminder">Medication Intake Reminder</option>
              <option value="custom">Custom Message</option>
            </select>
          </div>
          <div>
            <div className="text-muted mb-2">Format Options</div>
            <select
              className="input"
              onChange={(e) => {
                if (e.target.value === "bold") setPreview(`*${preview}*`);
                if (e.target.value === "italic") setPreview(`_${preview}_`);
                if (e.target.value === "none")
                  setPreview(
                    renderTemplate(templates[selectedTemplate], { ...messageCtx })
                  );
              }}
            >
              <option value="none">Plain</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-muted mb-2">Preview (editable)</div>
          <textarea
            className="input"
            rows="6"
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          />
        </div>

        <div className="row mt-3">
          <button className="btn primary" onClick={performSend}>
            Send via WhatsApp
          </button>
          <button className="btn" onClick={() => setModal(null)}>
            Cancel
          </button>
        </div>

        <div className="mt-3 text-muted" style={{ fontSize: 12 }}>
          Placeholders available:&nbsp;
          <code>{`{{patientName}}`}</code>, <code>{`{{date}}`}</code>,{" "}
          <code>{`{{time}}`}</code>, <code>{`{{doctorName}}`}</code>,{" "}
          <code>{`{{clinicName}}`}</code>, <code>{`{{medicine}}`}</code>,{" "}
          <code>{`{{dosage}}`}</code>, <code>{`{{timing}}`}</code>,{" "}
          <code>{`{{customMessage}}`}</code>.
        </div>
      </div>
    );
  };

  /** ----------------------------
   *  Layout
   * ---------------------------*/
  return (
    <div
      style={{
        minHeight: "100vh",
        background: tone.bodyBg,
      }}
    >
      <div
        className="sidebar"
        style={{
          background: tone.sidebarBg,
          color: "#0f172a",
        }}
      >
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 24 }}>🩺</div>
          <strong>Onestop Ai</strong>
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            className={`nav-btn ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${view === "patients" ? "active" : ""}`}
            onClick={() => setView("patients")}
          >
            Patients
          </button>
          <button
            className={`nav-btn ${view === "appointments" ? "active" : ""}`}
            onClick={() => setView("appointments")}
          >
            Appointments
          </button>
          <button
            className={`nav-btn ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
          >
            Settings
          </button>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            textAlign: "center",
            fontSize: 12,
            opacity: 0.8,
          }}
        >
          Powered by <b>Onestop Ai Services</b>
        </div>
      </div>

      <div className="content">
        {view === "dashboard" && <Dashboard />}
        {view === "patients" && <PatientsView />}
        {view === "appointments" && <AppointmentsView />}
        {view === "settings" && <SettingsView />}
      </div>

      {modal?.type && (
        <div
          className="modal-mask"
          onClick={(e) => {
            if (e.target.classList.contains("modal-mask")) setModal(null);
          }}
        >
          {modal.type === "addPatient" && <AddPatientModal />}
          {modal.type === "addAppointment" && <AddAppointmentModal />}
          {modal.type === "viewPatient" && <ViewPatientModal />}
          {modal.type === "sendMessage" && <SendMessageModal />}
        </div>
      )}
    </div>
  );
}