# BoardTrack — Class X Board 2027

A mobile-first **Next.js + Firebase** study-performance tracker based on the supplied Excel workbook.

## Included

### Student experience

- Email/password sign-in and student registration
- Mobile dashboard with overall score, Board Ready %, First Cut %, and Weak Areas
- Mathematics, Science, Social Studies and English chapter trackers
- First Cut / Revision 2 / Revision 3 planned and actual dates
- Test 1 / Test 2 / Test 3 score entry
- Main weakness and corrective-action tracking
- Automatic Board Readiness / Mastered / Weak / Developing classification
- Priority list generated from weak, delayed and below-target chapters
- Subject competency / skill tracker
- Full mock-test tracker with marks-loss analysis and execution potential
- Responsive bottom navigation for phones and sidebar on larger screens

### Admin experience

- Realtime list of every registered student
- Live Overall Latest %, Board Ready %, First Cut %, and Weak Areas
- Per-student drilldown with subject health and weak/delayed chapter list
- Detailed all-chapter monitoring
- Admin-editable performance thresholds matching the Excel Settings sheet

## Stack

- Next.js App Router
- React
- Firebase Authentication
- Cloud Firestore
- Firestore realtime listeners (`onSnapshot`)
- Plain responsive CSS — no UI-framework dependency
- Vercel deployment

## 1. Create Firebase project

In Firebase Console:

1. Create a project.
2. Add a Web app.
3. Enable **Authentication → Email/Password**.
4. Create **Cloud Firestore**.
5. Copy your Firebase web config values.

## 2. Configure environment

Copy `.env.example` to `.env.local` and fill in the Firebase web-app values:

```bash
cp .env.example .env.local
```

## 3. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Deploy Firestore rules

Install Firebase CLI if required, log in, and deploy the supplied rule file. You can also paste `firebase/firestore.rules` into the Firebase Console rules editor.

The rules enforce:

- Students can read/write only their own chapter, skill and mock-test data.
- Students cannot promote themselves to admin.
- Admins can read all student progress.
- Only admins can change performance settings.

## 5. Create the first admin

1. Register normally through the app.
2. In Firestore Console open `users/{uid}` for that account.
3. Change `role` from `student` to `admin`.
4. Sign out and sign in again.

The Admin link and live admin dashboard will then become available.

## 6. Deploy to Vercel

1. Push this folder to a Git repository.
2. Import the repository into Vercel.
3. Add all `NEXT_PUBLIC_FIREBASE_*` values from `.env.example` as Vercel environment variables.
4. Deploy.
5. Add the final Vercel domain to Firebase Authentication's authorized domains if needed for your sign-in configuration.

## Firestore collections

### `users/{uid}`

```js
{
  name,
  email,
  role: "student" | "admin",
  active,
  createdAt,
  updatedAt
}
```

### `chapterProgress/{uid}_{chapterId}`

Stores only user-entered values (dates, tests, weakness, action). Latest %, trend, delay and readiness are computed from `lib/performance.js` so formulas remain consistent everywhere.

### `skillProgress/{uid}_{skillId}`

Stores competency Test 1 / Test 2 / Test 3 and notes.

### `mockTests/{autoId}`

Stores full sample-paper input data and marks-loss categories.

### `appConfig/performance`

Admin-editable thresholds. If absent, the workbook defaults are used.

## Workbook logic

See [`EXCEL_LOGIC.md`](./EXCEL_LOGIC.md) for the exact formulas and status rules implemented from the spreadsheet.

## Important design decision

The chapter and skill catalog is bundled in `lib/catalog.js`, because it is curriculum/reference data from the workbook. Student progress remains in Firestore. This keeps Firestore smaller, prevents accidental syllabus edits, and makes every student's tracker consistent.

## Timetable and vocabulary additions

The student app now also includes:

- `/timetable` — daily/weekly study planning with Study, Revision, Homework, Test, Reading, Practice and Other activities. Each activity can be marked **Not started**, **Pending** or **Completed**.
- `/words` — a personal Words & Meanings notebook with subject, learned date, example sentence and notes.

The per-student admin detail page also shows today's timetable activity and the student's recently learned words.

Firestore now uses two additional collections:

- `studyActivities`
- `vocabulary`

After updating the project, publish the updated `firebase/firestore.rules` before using these pages.
