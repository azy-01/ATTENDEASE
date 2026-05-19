# Instructor Face-to-Face Attendance — Implementation Plan

This document describes how to add **instructor-led attendance marking** for **face-to-face classes only**: QR scanning (camera) and **manual entry** with name autocomplete (Base44-style), status selection, and validation when a student is not on the class roster.

---

## 1. Goals

| Goal | Description |
|------|-------------|
| **QR marking** | Instructor scans a student's personal QR code during an active session and records attendance. |
| **Manual marking** | Instructor types a student name; suggestions from the class roster appear; instructor selects **Present** or **Late** and confirms. |
| **Roster validation** | If the entered name does not match anyone in the session's class list, show an alert and do not create a record. |
| **Face-to-face only** | Instructor QR and manual name marking are available only when the linked class mode is `Face-to-face Class`. |
| **Duplicate prevention** | One attendance record per student per session (same as existing student check-in). |

### Out of scope (unless added later)

- Instructor marking for **Online Class** sessions (students may still use manual codes for self check-in).
- Replacing the existing student self-check-in flow on `/student/attendance`.

---

## 2. Current system baseline

### What exists today

| Area | Location | Behavior |
|------|----------|----------|
| Instructor session start/end | `src/app/pages/instructor/attendance/` | Start session with section, subject, optional manual code; list recent sessions. |
| Student QR + manual code | `src/app/pages/student/my-attendance/` | Camera scan (jsQR) or manual code via `submitStudentAttendance()`. |
| Attendance records | Firestore `attendanceRecords` | `AttendanceRecord` with `status`, `method?: 'qr' \| 'manual'`. |
| Class mode | `InstructorClass.classMode` | `'Face-to-face Class'` \| `'Online Class'` (set in Classes UI). |
| Student roster | `instructorStudents` + `assignedStudentIds` on classes | Used on Instructor Students page with section scoping. |
| QR lookup | `StudentApiService.getStudentProfileByQrCode()` | Resolves student profile from `qrCodeValue`. |
| Notifications | `NotificationService` | Activity feed for instructor role. |
| Dialogs | SweetAlert2 | Used on Records, Students, Classes pages. |

### Gaps

- No **Take Attendance** UI on the instructor Attendance page (QR or name autocomplete).
- No **`submitInstructorAttendance`** API bound to a specific session and instructor.
- `InstructorSession` does not store **`classMode`** or **`classId`** (required for reliable F2F gating).
- Student `submitStudentAttendance` uses the **latest global** active session, not the instructor's chosen session.

---

## 3. Product rules

### 3.1 Face-to-face vs online

| Feature | Face-to-face (`Face-to-face Class`) | Online (`Online Class`) |
|---------|-------------------------------------|-------------------------|
| Instructor QR scan | Yes | No |
| Instructor manual (name + Present/Late) | Yes | No |
| Student self-check-in (QR / manual code) | Can remain as implemented | Typically manual code only |

**Class mode source of truth:** `InstructorClass.classMode` in `student-api.service.ts`.

**Legacy classes** with no `classMode` set: use a **strict** policy — treat as **not** face-to-face until an admin sets mode on the class (aligns with “face-to-face only”).

### 3.2 Manual entry (Base44-style)

```
[ Student name + autocomplete suggestions ] [ Present | Late ▼ ] [ Mark attendance ]
```

- Suggestions filter while typing (match `name`, optionally `studentId`).
- Keyboard: ↑/↓ to navigate, Enter to select, Escape to close list.
- **Mark attendance** requires a resolved roster student (selection or exact name match), not free text alone.
- Unknown name → alert: *“Student not found in this class.”*

### 3.3 QR marking (instructor)

- Scan student personal QR (`ATTENDEASE-STUDENT-...` from student profile).
- Resolve via `getStudentProfileByQrCode()`.
- Verify student is on the **session roster**.
- Default status **Present** (optional quick Present/Late before save).
- Same duplicate and not-in-class handling as manual.

### 3.4 Feedback

| Event | UX |
|-------|-----|
| Success | Inline message + `NotificationService.add(..., 'instructor')` |
| Student not in roster | SweetAlert2 or inline error |
| Already marked | Warning: already recorded for this session |
| No F2F active session | Take Attendance hidden or disabled with explanation |
| Online / non-F2F session | No Take Attendance; API returns `FACE_TO_FACE_ONLY` if called |

---

## 4. Data model changes

### 4.1 Extend `InstructorSession`

```ts
export interface InstructorSession {
  id: string;
  subject: string;
  section: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  manualAttendanceCode?: string;
  startedAt?: string;
  instructorAuthId?: string;
  /** Set when session is created from a resolved class. */
  classMode?: 'Face-to-face Class' | 'Online Class';
  classId?: string;
}
```

**On `startSession()`** in `attendance.ts`:

1. Match `selectedSection` + `selectedSubject` to an `InstructorClass`.
2. Copy `classMode` and `classId` onto the new session document.

### 4.2 Attendance record (no breaking change)

Continue using existing `AttendanceRecord`:

- `method`: `'qr'` \| `'manual'` (instructor manual can use `'manual'`; optional future field `markedBy?: 'instructor' | 'student'` if distinction is needed).
- `status`: instructor-chosen `'Present'` \| `'Late'` for manual marks (do **not** auto-apply `resolveAttendanceStatus()` for instructor submissions).

---

## 5. API design

### 5.1 `submitInstructorAttendance`

Add to `StudentApiService`:

```ts
submitInstructorAttendance(payload: {
  sessionId: string;
  instructorAuthId: string;
  studentEmail: string;
  studentName: string;
  status: 'Present' | 'Late';
  method: 'qr' | 'manual';
}): Promise<
  | { success: true; record: AttendanceRecord }
  | {
      success: false;
      reason:
        | 'SESSION_NOT_ACTIVE'
        | 'SESSION_NOT_OWNED'
        | 'FACE_TO_FACE_ONLY'
        | 'STUDENT_NOT_IN_CLASS'
        | 'ALREADY_RECORDED'
        | 'INVALID_STUDENT';
    }
>;
```

**Server-side steps:**

1. Load session by `sessionId`.
2. Verify `status === 'active'`.
3. Verify `session.instructorAuthId === payload.instructorAuthId`.
4. Verify `session.classMode === 'Face-to-face Class'` → else `FACE_TO_FACE_ONLY`.
5. Verify student is in session roster (see §5.2).
6. Use existing `buildAttendanceRecordId(sessionId, studentEmail)` and Firestore **transaction** (same pattern as `submitStudentAttendance`).
7. Write record with payload `status` and `method` (no time-based auto status for instructor marks).

### 5.2 `getSessionRoster(sessionId)`

Returns `InstructorStudent[]` for the session:

1. Load session; if not F2F → return `[]` (or throw / error code).
2. Resolve class via `classId` or match `section` + `subject` to `InstructorClass`.
3. Filter active students whose `id` is in `class.assignedStudentIds`.
4. Exclude archived students.

### 5.3 Helper: resolve class for session

Shared logic for start session, roster, and validation:

- Match `session.section` to `class.name` or `class.section`.
- Match `session.subject` to `assignedSubjects` or class name fallback (consistent with `overview.ts` / `students.ts`).

---

## 6. UI / UX plan

### 6.1 Page structure (`/instructor/attendance`)

1. **Start New Session** (existing) — with F2F filtering (see §6.2).
2. **Take Attendance** (new card) — only when an active session has `classMode === 'Face-to-face Class'`.
3. **Recent Sessions** (existing) — show mode badge (F2F / Online).

### 6.2 Start session — face-to-face filtering

**Option A (recommended):** Section/subject dropdowns only list classes where `classMode === 'Face-to-face Class'`.

**Option B:** Show all classes; disable online with tooltip: *“Instructor QR and manual marking are only for face-to-face classes.”*

If online sessions still need a **manual code** for student self-check-in without instructor marking, use Option B for session start but hide Take Attendance for online.

### 6.3 Take Attendance panel

**Session selector:** Dropdown of instructor's active sessions (default: most recently started). Changing session reloads roster and “already marked” set.

**Tabs:**

| Tab | Content |
|-----|---------|
| **Scan QR** | Camera modal (reuse patterns from `my-attendance.ts` / jsQR) |
| **Manual** | Autocomplete input + status select + Mark button |

**Live log (optional polish):** List students marked in this session (name, status, time, method).

**Roster hints:** Suggestions show students not yet marked; already-marked students disabled or badged in the list.

### 6.4 Online active session

- Show in Recent Sessions with **Online** badge.
- No Take Attendance card (or collapsed message).
- Students use manual code on their attendance page if session provides a code.

---

## 7. Component structure

```text
AttendanceComponent (attendance.ts)
├── Session management (existing)
├── startSession() → persists classMode, classId
└── TakeAttendancePanel (inline or child standalone component)
    ├── activeSessionId: signal
    ├── roster: InstructorStudent[]
    ├── markedEmails: Set<string>
    ├── tab: 'qr' | 'manual'
    ├── isFaceToFaceSession: computed
    ├── ManualMarkForm
    │   ├── searchQuery → filteredSuggestions
    │   ├── selectedStudent
    │   ├── status: 'Present' | 'Late'
    │   └── confirmManual()
    └── QrMarkPanel
        ├── QrScannerService (extracted from my-attendance) or shared util
        └── onQrDetected → resolve → confirmQr()
```

**Suggested new files:**

| File | Purpose |
|------|---------|
| `src/app/pages/instructor/attendance/take-attendance-panel.component.ts` | Take Attendance UI (optional split) |
| `src/app/core/scanner/qr-scanner.service.ts` | Shared camera + decode logic |
| `docs/instructor-face-to-face-attendance-plan.md` | This document |

---

## 8. Implementation phases

### Phase 1 — Foundation

- [ ] Extend `InstructorSession` with `classMode`, `classId`.
- [ ] Resolve and persist class on `startSession()`.
- [ ] Implement `getSessionRoster()` and `submitInstructorAttendance()` with F2F guard.
- [ ] Unit tests for roster resolution and API reason codes.

### Phase 2 — Manual attendance UI

- [ ] Take Attendance card + session selector.
- [ ] Autocomplete dropdown (custom; no new dependency).
- [ ] Present / Late select + Mark button.
- [ ] Alerts for not-in-class, already recorded, success notifications.

### Phase 3 — Instructor QR scanning

- [ ] Extract or reuse QR scanner from `my-attendance.ts`.
- [ ] Gate scanner with `isFaceToFaceSession`.
- [ ] Wire decode → profile → roster → `submitInstructorAttendance`.

### Phase 4 — Polish

- [ ] F2F filter on Start Session dropdowns.
- [ ] Session mode badges in Recent Sessions.
- [ ] Live “marked today” list per session.
- [ ] Accessibility: `role="listbox"`, `aria-expanded`, `aria-live` for errors.

### Phase 5 — Optional alignment

- [ ] In `submitStudentAttendance`, reject `method: 'qr'` when session `classMode === 'Online Class'` (student uses code only for online).

---

## 9. Validation and edge cases

| Case | Handling |
|------|----------|
| Multiple active F2F sessions | Session dropdown; roster reloads per session |
| Student not in `assignedStudentIds` | `STUDENT_NOT_IN_CLASS` + alert |
| Duplicate mark | Transaction → `ALREADY_RECORDED` |
| Archived student | Excluded from roster |
| Typo in name | No exact match → alert, no save |
| `classMode` missing on class | Strict: not F2F; block Take Attendance |
| Wrong instructor | `SESSION_NOT_OWNED` |
| Session ended | `SESSION_NOT_ACTIVE`; disable UI |

---

## 10. Testing checklist

- [ ] F2F class → start session → `classMode` stored on session.
- [ ] Take Attendance visible for active F2F session only.
- [ ] Type partial name → suggestions update.
- [ ] Select student + Late → Firestore record with `status: 'Late'`, `method: 'manual'`.
- [ ] Unknown name → alert, no record.
- [ ] Mark same student twice → already recorded.
- [ ] Scan valid student QR on F2F session → record created.
- [ ] Scan QR for student not in class → error.
- [ ] Online session → Take Attendance hidden; API returns `FACE_TO_FACE_ONLY`.
- [ ] End session → marking disabled.
- [ ] Record appears on Instructor **Records** page.

---

## 11. Dependencies

Already in `package.json`:

- `jsqr` — QR decode
- `sweetalert2` — alerts
- `firebase` — Firestore transactions

No new npm packages required for autocomplete.

---

## 12. Related code references

| Topic | Path |
|-------|------|
| Instructor attendance page | `src/app/pages/instructor/attendance/attendance.ts` |
| Student QR / manual check-in | `src/app/pages/student/my-attendance/my-attendance.ts` |
| API & types | `src/app/core/data/student-api.service.ts` |
| Class mode UI | `src/app/pages/instructor/classes/classes.ts` |
| Roster scoping pattern | `src/app/pages/instructor/students/students.ts` |
| Records list | `src/app/pages/instructor/records/records.ts` |
| Notifications | `src/app/core/data/notification.service.ts` |

---

## 13. Summary

Instructor **QR** and **manual name** attendance are **face-to-face only**. Store `classMode` (and `classId`) on each session at start, show Take Attendance only for active F2F sessions, and enforce the same rule in `submitInstructorAttendance`. Manual entry follows a Base44-style autocomplete from the class roster, with Present/Late selection and clear errors when the student is not enrolled in that class.
