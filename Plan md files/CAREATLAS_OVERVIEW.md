# CareAtlas — Platform Overview

CareAtlas is an AI-native healthcare platform built on **ServiceNow** with a React/TypeScript
frontend and a FastAPI backend. It demonstrates a full hospital workflow (patient onboarding →
booking → encounter → discharge) governed end-to-end by ServiceNow AI agents, plus an AI Control
Tower for governing those agents.

The product is organized into **three portals** that share one app shell and a portal switcher:

| Portal | Route prefix | Audience | Purpose |
|--------|--------------|----------|---------|
| **Patient** | `/patient/*` | Patients | Register, book/manage appointments, view visit summaries, manage profile |
| **Clinician** | `/staff/*` | Doctors & reception/admin | Run the clinic: appointments, queue, notes, analytics, patient records, registrations |
| **AI Governance** | `/governance/*` | Governance officers | AI Control Tower: agent inventory, ACL, shadow-AI lifecycle, evidence board |

A landing **role picker** lives at `/role-picker`; unknown routes redirect to `/`.

---

## 1. Architecture

```
React SPA (Vite)  ──fetch──▶  FastAPI  ──REST (Basic auth)──▶  ServiceNow instance
  src/pages/*                  server/app/*                      ven04690.service-now.com
  src/services/serviceNow.ts   main.py (routes)
  src/hooks/*                  servicenow.py (table client)
                               models.py (pydantic)
```

- **Frontend** never talks to ServiceNow directly — every call goes to `/api/*`.
- **Auth** is AWS Cognito (email/password + TOTP MFA) per portal, via dedicated auth contexts.
- **Backend** holds the ServiceNow service-account credentials and is the only thing that reads/writes
  ServiceNow tables.

### Core ServiceNow tables

| Table | Holds | Key fields used |
|-------|-------|-----------------|
| `u_doctor` | Clinicians | name, department, speciality, email, active |
| `u_patient` | Patients | full demographics, contact, insurance, emergency contact, condition, blood type, allergies, registration/account status, time preference, consent |
| `u_appointment` | Appointments | doctor, patient, date, time, status, reason category, reason text, triage priority |
| `u_summary_notes` | Visit summary notes | appointment, doctor, patient, date, time, notes, logged_by |

Supporting tables/sources: `u_ai_decision_log` (Action Fabric audit), `sn_aia_agent` (AI agents),
`alm_ai_system_digital_asset` (managed/unmanaged AI assets), `sys_user` (credential validation).

---

## 2. Backend API surface (`/api/*`)

**Health & auth**
- `GET /health`
- `POST /auth/validate` — validate ServiceNow credentials
- `POST /passwords/pwned-check` — breach check during registration

**Patient**
- `POST /patients/register` — create `u_patient`
- `GET /patients/profile?email&username&name` — fetch a patient profile
- `PATCH /patients/profile` — patient self-edit (contact + emergency contact fields)
- `GET /patients/booking/availability?start_date&days` — doctors + appointments window
- `POST /patients/booking/appointments` — book an appointment

**Clinician / staff**
- `GET /staff/registrations?status&limit` — patient registration queue
- `PATCH /staff/registrations` — approve / reject a registration
- `GET /staff/appointment-options?doctor_sys_id` — all appointments for a doctor
- `GET /staff/appointment?record_id` — a single appointment
- `POST /staff/appointments` — create an appointment (clinician)
- `PATCH /staff/appointments` — update status and/or reschedule (with conflict check)
- `GET /staff/summary-notes?doctor_sys_id&appointment_record_id&patient_sys_id&limit`
- `POST /staff/summary-notes` — create a note (doctor/patient/date/time derived from the appointment)
- `PATCH /staff/summary-notes` — edit a note's text
- `DELETE /staff/summary-notes/{sys_id}` — delete a note

**Governance / AI**
- `GET /agents`, `POST /agents/register`, `GET /agents/managed`, `GET /agents/unmanaged`
- `POST /agents/execute`, `GET /agents/execute/{request_id}` — A2A agent execution
- `POST /a2a/callback/{agent_sys_id}` — ServiceNow callback webhook
- `GET /governance/decision-log?limit` — Action Fabric audit log
- `POST /acl/test` — run read-only ACL probes for a service account

> **Time note:** ServiceNow stores `glide_time` in UTC; the UI displays the instance-local value.
> All appointment times across the app use the same displayed value, and bookings pass that value
> straight through, so the booked time and displayed time stay consistent.

---

## 3. Cross-cutting behaviors

- **Portal switcher** (top-right of every shell): Patient Portal · Clinician Portal · AI Governance.
- **Auth + MFA**: each portal has a sign-in flow supporting password login, first-time
  new-password challenge, TOTP MFA setup (QR + manual key), and 6-digit OTP verification.
- **Role blockers**: routes are wrapped so a patient session can't open clinician/governance
  screens and vice-versa.
- **Doctor identity**: the clinician portal matches the signed-in user to a `u_doctor` record by
  email, then name (`matchDoctorForClinician`); all clinician data is scoped to that doctor.
- **Patient identity**: the patient portal matches the signed-in user to a `u_patient` record by
  email/username/name (`usePatientSchedule`).
- **Adaptive nav**: the clinician nav shrinks (smaller padding/text/icons) automatically once it has
  more than 5 items.
- **Week navigation**: a shared `WeekNav` lets clinicians move ±4 weeks on the dashboard and
  availability views.

---

## 4. Patient portal (`/patient/*`)

**Nav (signed in):** Dashboard · Book · Appointments · Profile · Contact
**Nav (signed out):** Home · Register · Sign in

### 4.1 Landing (`/patient/home`)
Public marketing/info page: value propositions, trust & security (HIPAA), clinic hours, FAQ, and
Register / Sign-in calls to action.

### 4.2 Register (`/patient/register`)
Self-registration form (personal, address, health, account sections) with an **auto-fill** helper,
a **breach-checked password** strength meter, and a consent checkbox. On submit it creates the
`u_patient` record + Cognito account and routes to MFA setup. Shows a confirmation with patient ID.

### 4.3 Email/MFA verification (`/patient/verify-email`)
Authenticator setup: QR code + manual secret, 6-digit OTP verification, and a restart path. On
success routes to the dashboard.

### 4.4 Sign in (`/patient/sign-in`)
Email/password, MFA OTP mode, and first-time new-password challenge. Links to Register.

### 4.5 Dashboard (`/patient/dashboard`)
The signed-in home. Shows KPI cards (next appointment, past visits, profile status), the next
appointment detail, a recent appointment history snippet, quick-action links, profile completeness,
and clinic notifications. Refresh + Logout. Reads live profile + appointments via `usePatientSchedule`.

### 4.6 Book appointment (`/patient/book`)
Three-step booking:
1. **Reason** — visit type, reason category, specialty, concern, insurance, accessibility/interpreter.
2. **Choose time** — doctor/specialty pickers + a weekly calendar (week navigation) with color-coded
   availability (available / lunch / booked / special / outside hours), hover details, click to select.
3. **Review & confirm** — summary of everything; confirm creates the `u_appointment`.

A tabbed panel below shows the patient's own **Upcoming / Past / Plan** appointments.

### 4.7 My appointments (`/patient/appointments`)
Dedicated history of **Upcoming** and **Past** visits, each with a status badge. For upcoming
appointments the patient can **Reschedule** (date/time modal) or **Cancel** (sets status
`cancelled`). Each row links to the appointment detail page.

### 4.8 Appointment detail (`/patient/appointments/:recordId`)
Shows appointment ID, date/time, reason, triage, and status — plus the **doctor's visit summary
notes** for that appointment (read-only). If no notes exist yet, an explanatory empty state is shown.
This is the patient's window into `u_summary_notes`.

### 4.9 Profile (`/patient/profile`)
Full profile: identity/assurance, personal info, address, health info (blood type, known allergies,
insurance, emergency contact — clinic-managed fields are read-only), privacy/consent, account
controls, accessibility prefs, and a photo-crop uploader. The **Edit** action opens a modal that
writes self-owned fields back to `u_patient` via `PATCH /patients/profile`: phone, address lines,
city, postcode, emergency contact (name/phone/relationship), preferred time, primary language.

### 4.10 Contact (`/patient/contact`)
Support request form (request type + message) with clinic contact info. *(Form is presentational —
there is no contact-case table behind it.)*

---

## 5. Clinician portal (`/staff/*`)

**Nav:** Dashboard · Appointments · Queue · My Notes · Analytics · Admin · Availability · Profile · Patient record

### 5.1 Sign in (`/staff/sign-in`)
Cognito email/password + MFA setup/verification + new-password challenge (same pattern as the other portals).

### 5.2 Dashboard (`/staff/doctor`)
"Today's clinical run sheet". Stat cards (appointments today, upcoming, clinic hours, next open slot),
an **interactive appointment list** that follows a selected day, a navigable **7-Day Schedule**
(±4 weeks via `WeekNav`), doctor profile summary, clinical alerts, pending tasks, and a Summary Notes
shortcut.
- Clicking a day in the 7-Day Schedule re-points the appointment list to that date; the card title
  switches to "Appointments · {date}".
- A **Back to today** button (shown only when off today) resets both the selected date and the week.

### 5.3 Appointments (`/staff/appointments`)
List of **all** the doctor's appointments with status badges. Includes a **search box** (patient,
ID, reason, date) and a **status filter**. Each row links to the detail page. The count reflects
"filtered of total".

### 5.4 Appointment detail (`/staff/appointments/:recordId`)
The clinical workhorse screen:
- Summary card: patient, appointment ID, date/time, doctor, **reason + reason text**, **triage** badge, **status** badge.
- **Status control** — dropdown to set Confirmed / Arrived / In progress / Completed / Cancelled / No-show (writes `u_appointment.u_status`).
- **Reschedule** — modal to change date/time (conflict-checked).
- **Summary notes** — list of notes for this appointment; **Add note** (modal), and per-note **Edit** and **Delete**.

### 5.5 Queue (`/staff/queue`)
Today's **check-in board** with four columns — Waiting → Arrived → In progress → Completed. Each
patient card advances to the next stage with one click (status write), with a "Reset to waiting"
option. Live counts per column.

### 5.6 My Notes (`/staff/notes`)
All summary notes the doctor has logged, as cards (patient, appointment ID, date/time, text,
logged-by). Includes a **search** box. **Add note** opens a modal with an appointment picker
(labeled "date · patient · time"); selecting an appointment auto-fills and locks patient/date/time,
and only the note text is editable. Notes flow to the same `u_summary_notes` table used everywhere.

### 5.7 Analytics (`/staff/analytics`)
Trends derived from the loaded appointment window: stat cards (total, upcoming, completed, no-show
rate + cancelled count), an **appointments-per-week** bar chart (last 8 weeks), a **by-reason** bar
breakdown, and a **by-status** chip summary.

### 5.8 Admin (`/staff/admin`)
Reception/admin master view (all doctors):
- Stat cards (today total, pending approvals, demo cases/rooms).
- **Appointments list** with per-row **Mark arrived** and **Cancel** actions (status writes).
- **Create manual appointment** modal: patient name lookup → resolves `sys_id`, pick doctor/date/time/reason, conflict-checked create.
- **Pending registration approvals** with per-row **Approve / Reject** (writes `u_patient.u_registration_status`).
- Recent activity log (live), plus demo-only contact cases & room status panels.

### 5.9 Availability (`/staff/availability`)
Weekly schedule grid (time × 7 days) with **week navigation** (±4 weeks). Cells are color-coded:
available, break, booked, special appointment, unavailable, with hover details. Metric cards show
doctor, speciality, calendar rule, and loaded booking count.

### 5.10 Profile (`/staff/profile`)
Read-only matched `u_doctor` record (ID, sys_id, name, email, department, speciality, status,
calendar rule), schedule summary, and a list of upcoming appointments.

### 5.11 Patient record (`/staff/patient/:id`)
Search a patient by name to load their live record:
- **Demographics** including blood type and known allergies.
- **Appointment history** table (date, doctor, status, reason).
- **Summary notes** recorded for that patient across appointments.
- An AI-decision-log reference panel.

---

## 6. AI Governance portal (`/governance/*`)

**Nav:** Home · AI Agents · ACL · Demo · Agenda (Sign in when logged out)

### 6.1 Sign in (`/governance/sign-in`)
Governance-officer Cognito login with MFA setup/verification and new-password challenge.

### 6.2 Dashboard / Control Tower (`/governance`)
Evidence board with a KPI strip (registered agents, shadow-AI detections, prompt-injection alerts,
access violations, fairness skew) and panels: agent inventory, fairness monitor, prompt-injection
alerts, shadow-AI detection, expected-vs-actual allocation, access violations, risk scorecard, and the
**Action Fabric audit log** (live from `u_ai_decision_log`). Refresh + Logout.

### 6.3 AI Agents (`/governance/ai-agents`)
**Managed** and **Unmanaged** AI asset tables (from `alm_ai_system_digital_asset`) with filtering,
sorting, column chooser, and pagination, plus an **AI Agent Inventory** of expandable agent cards
(from `sn_aia_agent`) showing role/strategy/proficiency/instructions. Selecting an agent opens a
**chat drawer** that runs the agent over A2A (`/agents/execute`). An **End-to-End Workflow** button
opens the Shadow AI Workflow Modal.

### 6.4 ACL (`/governance/acl`)
Non-human identities & access control: service-account cards (user ID, group, permissions, ACL
rules, roles). **Test ACL** runs read-only probes (`/acl/test`) and shows pass/fail per check;
"View API test details" opens a simulated CLI terminal of the request/response. A "Scheduling agent
comparison" callout opens a comparison modal.

### 6.5 Demo launchpad (`/governance/demo`)
Quick-launch page: an **Application Pipeline** button opens the Patient Lifecycle Modal, an Agenda
link, and deep links that open the live ServiceNow instance (home, AI Agents, Control Tower, users,
roles, groups, ACL rules) in new tabs.

### 6.6 Agenda (`/governance/agenda`)
Interactive walkthrough of the **June 19** demo, organized into nine sections (three-portal frontend,
auth & MFA, ServiceNow tables, AI agent pipeline, A2A protocol, ACL & non-human identities, ACL
testing, Shadow AI discovery, AI Control Tower lifecycle). Each section is a card with a checklist
and a small UI mock. Includes a **PDF export** (portrait/landscape) where the title + agenda nav
share the first page and each section follows; pages are JPEG-compressed for small file size.

### 6.7 Governance modals
- **Shadow AI Workflow Modal** — animated 8-phase lifecycle moving an asset
  *Unmanaged → Managed → Deployed* (Phase 0 "Discovery Scan" → Phase 5 "Deploy" → Final). Tabs across
  the phases, play/pause/reset, milestone vs detailed views. Purely visual.
- **Patient Lifecycle Modal** — animated end-to-end patient journey via 10 governed agent hand-offs
  across four phases (Onboarding · Scheduling · Encounter · Discharge), each step naming its agent and
  governed table. Purely visual.

---

## 7. End-to-end flows

**Patient journey:** Register → MFA → Dashboard → Book (3-step) → (visit happens) → My Appointments →
Appointment detail shows the **doctor's summary notes** → Profile self-edits.

**Clinician day:** Sign in → Dashboard run sheet (pick a day) → Queue checks patients in
(Waiting→Arrived→In progress→Completed) → Appointment detail sets status, reschedules, and logs
**summary notes** → My Notes / Analytics review → Admin approves registrations and creates manual
appointments → Patient record reviews a patient's full history + notes.

**Governance:** Sign in → Control Tower evidence board → AI Agents (inventory + A2A chat + Shadow-AI
workflow) → ACL testing of non-human identities → Demo launchpad & Agenda for the walkthrough.

**Data spine:** every clinical action reads/writes the four core tables (`u_doctor`, `u_patient`,
`u_appointment`, `u_summary_notes`) through the FastAPI layer, and AI-agent activity is evidenced in
`u_ai_decision_log` surfaced on the governance dashboard.
</content>
