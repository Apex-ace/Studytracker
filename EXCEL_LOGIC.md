# Excel logic implemented in the web app

The calculation layer in `lib/performance.js` mirrors the supplied **Pulkit — Class X Board 2027 Performance Tracker** workbook.

## Workbook settings

Default values used when Firestore has no `appConfig/performance` document:

- Default chapter target: **90%**
- Board Ready threshold: **85%**
- Mastered threshold: **90%**
- Good threshold: **80%**
- Weak threshold: **60%**
- Delay warning: **5 days**

Admins can change these values from the Admin dashboard. The web UI reads the settings document in realtime.

## Chapter calculations

For every tracked chapter / skill in Mathematics, Science, Social Studies and English:

### Latest %

The latest available test score is used:

1. Test 3 if present
2. otherwise Test 2
3. otherwise Test 1
4. otherwise blank / no data

### Trend (percentage points)

`Latest % - Test 1 %`

Trend is blank until Test 1 and at least one score are available.

### Board Readiness

The same decision order as the workbook is used:

1. **Not Started** — no test score exists.
2. **Mastered** — Test 2 and Test 3 are both at or above the Mastered threshold.
3. **Board Ready** — Test 3 is at or above the Board Ready threshold and at least two actual study/revision dates are completed.
4. **Weak** — Latest % is below the Weak threshold.
5. **Developing** — all other scored cases.

### Max Delay

For First Cut, Revision 2 and Revision 3, the app calculates `Actual Date - Planned Date` in days and stores no negative delay. The largest delay is shown as Max Delay.

## Subject summary

For each subject:

- **Tracked Areas** = total chapters/skills in the supplied workbook.
- **First Cut %** = chapters with a First Cut Actual date / tracked chapters × 100.
- **Avg Latest %** = average of available chapter Latest % scores.
- **Board Ready** = count of chapters marked Board Ready or Mastered.
- **Weak** = count of chapters marked Weak.
- **Avg Delay** = average Max Delay across rows where the workbook delay formula is active (matching the workbook’s `COUNT(D:K)` behavior, including zero-day delays).
- **Current Status**:
  - No Data — no chapter scores
  - Strong — average ≥ 90
  - Good — average ≥ 80
  - Needs Revision — average ≥ 70
  - Attention — average < 70

## Overall dashboard

Across all four subjects:

- **Overall Latest %** = average of every chapter with score data.
- **Board Ready %** = (Board Ready + Mastered chapters) / all tracked chapters × 100.
- **First Cut Complete %** = chapters with First Cut Actual / all tracked chapters × 100.
- **Weak Areas** = total Weak chapters.

## Skill Tracker

The Skill Tracker uses Test 1 / Test 2 / Test 3 and the same latest-score fallback.

Status:

- No Data
- Strong ≥ 90
- Good ≥ 80
- Needs Revision ≥ 70
- Attention < 70

## Mock Test Tracker

- **Score %** = Marks Obtained / Total Marks × 100
- **Gap (pp)** = Score % - Target %
- **Total Marks Lost** = Unattempted + Careless + Concept + Time Management + Other
- **Execution Potential %** = `MIN(100, (Marks Obtained + Careless Loss + Time Management Loss + Other Loss) / Total Marks × 100)`

The Execution Potential formula intentionally mirrors the workbook: Unattempted and Concept Loss are not added back.
