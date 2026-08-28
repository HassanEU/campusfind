/**
 * CampusFind :: end-to-end smoke test
 *
 * Walks the entire acceptance flow against a running API and a real database:
 *
 *   register -> login -> report lost -> report found -> QR issued ->
 *   match generated -> claim submitted -> staff QR lookup -> verification ->
 *   approval transaction -> item RETURNED -> audit trail -> dashboards update
 *
 * Run with:  npm run smoke        (API must already be running)
 */

const BASE = process.env.SMOKE_API ?? 'http://localhost:4001/api';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, extra?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  \u001b[32mPASS\u001b[0m  ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  \u001b[31mFAIL\u001b[0m  ${label}`, extra ?? '');
  }
}

function section(title: string) {
  console.log(`\n\u001b[1m${title}\u001b[0m`);
}

async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body: body as T };
}

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

async function run() {
  const stamp = Date.now();
  const studentEmail = `smoke.student.${stamp}@campus.edu`;

  /* ---------------------------------------------------------------- health */
  section('1. Health & public data');
  {
    const health = await api('/health');
    check('GET /health returns ok', health.status === 200 && health.body.status === 'ok');

    const stats = await api('/stats/public');
    check(
      'GET /stats/public returns database-derived counters',
      stats.status === 200 && typeof stats.body.stats?.totalLost === 'number',
      stats.body,
    );

    const cats = await api('/categories');
    check('GET /categories returns seeded categories', cats.body.data?.length >= 7);

    const locs = await api('/locations');
    check('GET /locations returns seeded locations', locs.body.data?.length >= 6);
  }

  /* ------------------------------------------------------------------ auth */
  section('2. Authentication & authorization');
  let studentToken = '';
  let staffToken = '';
  let adminToken = '';
  {
    const weak = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'Weak Password', email: `weak.${stamp}@campus.edu`, password: 'abc' },
    });
    check('Weak password is rejected with 400', weak.status === 400, weak.body);

    const badEmail = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'Bad Email', email: 'not-an-email', password: 'Campus@123' },
    });
    check('Invalid email is rejected with 400', badEmail.status === 400);

    const reg = await api('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Smoke Test Student',
        email: studentEmail,
        password: 'Campus@123',
        department: 'Computer Science',
        enrollmentNo: `CS${stamp.toString().slice(-7)}`,
      },
    });
    check('Registration returns 201 with a token', reg.status === 201 && !!reg.body.token, reg.body);
    check('Self-registration always creates a STUDENT', reg.body.user?.role === 'STUDENT');
    studentToken = reg.body.token;

    const staffSetupGuess = await api('/auth/staff-setup', {
      method: 'POST',
      body: {
        fullName: 'Guessed Staff',
        email: `guessed.staff.${stamp}@campus.edu`,
        password: 'Campus@123',
        setupSecret: 'not-the-real-setup-key',
      },
    });
    check(
      'Staff setup rejects a guessed secret (401 when enabled, 404 when disabled)',
      staffSetupGuess.status === 401 || staffSetupGuess.status === 404,
      staffSetupGuess.body,
    );

    const dup = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'Duplicate', email: studentEmail, password: 'Campus@123' },
    });
    check('Duplicate email is rejected with 409', dup.status === 409);

    const wrongPw = await api('/auth/login', {
      method: 'POST',
      body: { email: studentEmail, password: 'WrongPassword1' },
    });
    check('Wrong password is rejected with 401', wrongPw.status === 401);

    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: studentEmail, password: 'Campus@123' },
    });
    check('Login succeeds and returns a token', login.status === 200 && !!login.body.token);
    studentToken = login.body.token;

    const me = await api('/auth/me', { token: studentToken });
    check('GET /auth/me identifies the signed-in user', me.body.user?.email === studentEmail);

    const noToken = await api('/dashboard/student');
    check('Protected route without a token returns 401', noToken.status === 401);

    const staffLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: 'rahul.desai@campusfind.edu', password: 'Campus@123' },
    });
    check('Seeded staff account can sign in', staffLogin.status === 200, staffLogin.body);
    staffToken = staffLogin.body.token;

    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: 'admin@campusfind.edu', password: 'Campus@123' },
    });
    check('Seeded admin account can sign in', adminLogin.status === 200);
    adminToken = adminLogin.body.token;

    const forbidden = await api('/admin/users', { token: studentToken });
    check('Student is blocked from /admin/users with 403', forbidden.status === 403);

    const staffBlocked = await api('/admin/users', { token: staffToken });
    check('Staff is blocked from admin-only user management', staffBlocked.status === 403);
  }

  /* -------------------------------------------------------------- lost item */
  section('3. Report a lost item');
  let lostItemId = 0;
  {
    const invalid = await api('/lost-items', {
      method: 'POST',
      token: studentToken,
      body: { itemName: 'X', categoryId: 1, locationId: 1, description: 'short', lostDate: today },
    });
    check('Invalid lost report is rejected with field errors', invalid.status === 400);

    const future = await api('/lost-items', {
      method: 'POST',
      token: studentToken,
      body: {
        itemName: 'Time Traveller', categoryId: 1, locationId: 1,
        description: 'This description is definitely long enough to pass validation.',
        lostDate: '2099-01-01',
      },
    });
    check('A future lost date is rejected', future.status === 400);

    const cats = await api('/categories');
    const locs = await api('/locations');
    const electronics = cats.body.data.find((c: any) => c.name === 'Electronics');
    const library = locs.body.data.find((l: any) => l.name === 'Central Library');

    const created = await api('/lost-items', {
      method: 'POST',
      token: studentToken,
      body: {
        itemName: 'Smoke Test Headphones',
        categoryId: electronics.categoryId,
        locationId: library.locationId,
        brand: 'Zenith',
        color: 'Charcoal',
        description:
          'Charcoal Zenith over-ear wireless headphones with a folding hinge, left on a reading table in the library.',
        identifyingDetails: 'A small silver sticker shaped like a star on the left earcup.',
        lostDate: daysAgo(2),
        lostTimeApprox: '15:30',
      },
    });
    check('Lost report is created (201)', created.status === 201, created.body);
    // ACTIVE normally, but MATCHED if the engine already found a strong
    // candidate among the items currently on the shelf.
    check(
      'Created report is persisted with an open status',
      ['ACTIVE', 'MATCHED'].includes(created.body.item?.status),
      created.body.item?.status,
    );
    lostItemId = created.body.item?.lostItemId;

    const fetched = await api(`/lost-items/${lostItemId}`, { token: studentToken });
    check('Lost report can be read back from the database', fetched.body.item?.lostItemId === lostItemId);
    check('Lost report has audit history from the trigger', fetched.body.history?.length >= 1);
  }

  /* ------------------------------------------------------------- found item */
  section('4. Report a found item, QR generation, matching');
  let foundItemId = 0;
  let qrCode = '';
  {
    const cats = await api('/categories');
    const locs = await api('/locations');
    const electronics = cats.body.data.find((c: any) => c.name === 'Electronics');
    const library = locs.body.data.find((l: any) => l.name === 'Central Library');

    const created = await api('/found-items', {
      method: 'POST',
      token: staffToken,
      body: {
        itemName: 'Zenith Wireless Headphones',
        categoryId: electronics.categoryId,
        locationId: library.locationId,
        brand: 'Zenith',
        color: 'Charcoal',
        description:
          'Charcoal Zenith wireless over-ear headphones with a folding hinge handed in at the library counter.',
        storageLocation: 'Desk Locker A-09',
        foundDate: daysAgo(1),
        foundTimeApprox: '17:45',
      },
    });
    check('Found report is created (201)', created.status === 201, created.body);
    foundItemId = created.body.item?.foundItemId;
    qrCode = created.body.item?.qrCode;

    check('Trigger issued a QR code in CF-FOUND-###### format', /^CF-FOUND-\d{6}$/.test(qrCode ?? ''), qrCode);
    check('QR image is returned as a data URL', String(created.body.qrDataUrl).startsWith('data:image/png;base64,'));
    check('Matching engine ran on submission', created.body.matchesGenerated >= 1, created.body.matchesGenerated);

    const qr = await api(`/found-items/${foundItemId}/qr`, { token: staffToken });
    check('QR can be re-fetched for printing', qr.status === 200 && qr.body.qrCode === qrCode);
  }

  /* ---------------------------------------------------------------- matches */
  section('5. Matching engine output');
  let matchId = 0;
  {
    const matches = await api('/matches', { token: studentToken });
    check('Student sees their generated matches', matches.body.data?.length >= 1, matches.body);

    const match = matches.body.data.find((m: any) => m.foundItemId === foundItemId);
    check('The seeded pair was matched', !!match);
    matchId = match?.matchId;

    check('Score is high for a near-identical pair', match?.totalScore >= 80, match?.totalScore);
    check('Score never exceeds 100', match?.totalScore <= 100);
    check('Score breakdown has all six criteria', match?.breakdown?.length === 6);
    check('Category criterion scored full marks', match?.breakdown[0]?.earned === 20);
    check('Reasons are human readable', Array.isArray(match?.reasons) && match.reasons.length >= 3, match?.reasons);

    const detail = await api(`/matches/${matchId}`, { token: studentToken });
    check('Match detail loads both sides of the comparison',
      detail.body.match?.lostItemName && detail.body.match?.foundItemName);

    const otherStudent = await api('/auth/login', {
      method: 'POST', body: { email: 'sneha@campus.edu', password: 'Campus@123' },
    });
    const stolen = await api(`/matches/${matchId}`, { token: otherStudent.body.token });
    check('Another student cannot open this match (403)', stolen.status === 403);
  }

  /* ----------------------------------------------------------------- claims */
  section('6. Claim submission');
  let claimId = 0;
  {
    const short = await api('/claims', {
      method: 'POST', token: studentToken,
      body: { foundItemId, claimDetails: 'mine' },
    });
    check('Claim with insufficient proof is rejected', short.status === 400);

    const claim = await api('/claims', {
      method: 'POST',
      token: studentToken,
      body: {
        foundItemId,
        lostItemId,
        matchId,
        claimDetails: 'There is a small silver star-shaped sticker on the left earcup of the headphones.',
      },
    });
    check('Claim is created (201)', claim.status === 201, claim.body);
    claimId = claim.body.claim?.claimId;
    check('Claim starts as PENDING', claim.body.claim?.status === 'PENDING');

    const item = await api(`/found-items/${foundItemId}`, { token: staffToken });
    check('Found item moved to CLAIM_PENDING', item.body.item?.status === 'CLAIM_PENDING');

    const duplicate = await api('/claims', {
      method: 'POST',
      token: (await api('/auth/login', {
        method: 'POST', body: { email: 'kabir@campus.edu', password: 'Campus@123' },
      })).body.token,
      body: { foundItemId, claimDetails: 'I am fairly sure those headphones belong to me actually.' },
    });
    check('A second claim on the same item is blocked (409)', duplicate.status === 409, duplicate.body);
  }

  /* ---------------------------------------------------------- QR + verify */
  section('7. Staff QR verification');
  {
    const studentScan = await api(`/qr/${qrCode}`, { token: studentToken });
    check('A student cannot use the QR lookup (403)', studentScan.status === 403);

    const bogus = await api('/qr/CF-FOUND-999999', { token: staffToken });
    check('An unregistered code returns a clear 404', bogus.status === 404, bogus.body);

    const malformed = await api('/qr/NOT-A-CODE', { token: staffToken });
    check('A malformed code is rejected with 400', malformed.status === 400);

    const scan = await api(`/qr/${qrCode}`, { token: staffToken });
    check('QR lookup loads the item from the database', scan.status === 200 && scan.body.item?.foundItemId === foundItemId);
    check('QR lookup surfaces the pending claim', scan.body.item?.claimId === claimId);
    check('QR lookup shows the claimant for desk-side checking', !!scan.body.item?.claimantName);
    check('Scan counter was incremented', scan.body.item?.scanCount >= 1);

    const early = await api(`/claims/${claimId}`, {
      method: 'PATCH', token: staffToken, body: { action: 'APPROVE' },
    });
    check('Approval is blocked before verification (422)', early.status === 422, early.body);

    const wrongCode = await api('/verifications', {
      method: 'POST', token: staffToken,
      body: { claimId, method: 'QR_SCAN', qrCode: 'CF-FOUND-000001', outcome: 'PASSED' },
    });
    check("A different item's QR code is rejected", wrongCode.status === 400, wrongCode.body);

    const verification = await api('/verifications', {
      method: 'POST',
      token: staffToken,
      body: {
        claimId, method: 'QR_SCAN', qrCode,
        outcome: 'PASSED',
        notes: 'Star sticker on the left earcup confirmed against the physical item.',
      },
    });
    check('Verification is recorded (201)', verification.status === 201, verification.body);
  }

  /* ------------------------------------------------------ approval txn */
  section('8. Approval transaction and return');
  {
    const before = await api('/dashboard/staff', { token: staffToken });
    const pendingBefore = before.body.counters?.pendingClaims ?? 0;

    const approve = await api(`/claims/${claimId}`, {
      method: 'PATCH',
      token: staffToken,
      body: { action: 'APPROVE', reviewNotes: 'Ownership confirmed. Item released at the desk.' },
    });
    check('Claim is approved (200)', approve.status === 200, approve.body);
    check('Claim status is APPROVED', approve.body.claim?.status === 'APPROVED');
    check('Reviewer is recorded on the claim', !!approve.body.claim?.reviewerName);

    const item = await api(`/found-items/${foundItemId}`, { token: staffToken });
    check('Found item is now RETURNED', item.body.item?.status === 'RETURNED', item.body.item?.status);

    const lost = await api(`/lost-items/${lostItemId}`, { token: studentToken });
    check('Linked lost report is now RESOLVED', lost.body.item?.status === 'RESOLVED');

    const returns = await api('/returns', { token: staffToken });
    check('A return record exists for the item',
      returns.body.data?.some((r: any) => r.foundItemId === foundItemId));

    const again = await api(`/claims/${claimId}`, {
      method: 'PATCH', token: staffToken, body: { action: 'APPROVE' },
    });
    check('Approving twice is blocked (409)', again.status === 409, again.body);

    const after = await api('/dashboard/staff', { token: staffToken });
    check('Staff pending-claim counter decreased',
      (after.body.counters?.pendingClaims ?? 0) === pendingBefore - 1,
      { pendingBefore, after: after.body.counters?.pendingClaims });
  }

  /* ------------------------------------------------------------ audit trail */
  section('9. Audit trail & dashboards');
  {
    const audit = await api('/admin/audit-logs?pageSize=100', { token: adminToken });
    check('Audit log endpoint responds', audit.status === 200);

    const actions: string[] = audit.body.data.map((a: any) => a.action);
    for (const expected of [
      'LOST_ITEM_CREATED', 'FOUND_ITEM_CREATED', 'QR_GENERATED',
      'MATCH_CREATED', 'CLAIM_SUBMITTED', 'QR_VERIFIED', 'CLAIM_APPROVED', 'ITEM_RETURNED',
    ]) {
      check(`Audit trail contains ${expected}`, actions.includes(expected));
    }

    const student = await api('/dashboard/student', { token: studentToken });
    check('Student dashboard counters come from SQL', typeof student.body.counters?.lostReports === 'number');
    check('Student dashboard shows the returned item', student.body.counters?.returnedItems >= 1);

    const analytics = await api('/admin/analytics', { token: adminToken });
    check('Admin analytics responds', analytics.status === 200);
    check('Resolution rate is calculated', typeof analytics.body.stats?.resolutionRate === 'number');
    check('Reports-over-time series has 30 days', analytics.body.reportsOverTime?.length === 30);
    check('Category breakdown is present', analytics.body.byCategory?.length >= 7);

    const notifications = await api('/notifications', { token: studentToken });
    check('Student was notified about the approval',
      notifications.body.data?.some((n: any) => n.notificationType === 'CLAIM_APPROVED'),
      notifications.body.data?.map((n: any) => n.notificationType));
  }

  /* ------------------------------------------------------------- pagination */
  section('10. Listing, search & pagination');
  {
    const page = await api('/found-items?page=1&pageSize=5');
    check('Found items are paginated', page.body.data?.length <= 5 && page.body.totalPages >= 1);

    const search = await api('/found-items?search=airpods');
    check('Search finds the AirPods case', search.body.data?.some((i: any) => /airpods/i.test(i.itemName)));

    const publicView = await api('/found-items?pageSize=3');
    check('Anonymous browse never exposes QR codes',
      publicView.body.data.every((i: any) => i.qrCode === undefined));

    const staffView = await api('/found-items?pageSize=3', { token: staffToken });
    check('Staff browse does expose QR codes', staffView.body.data.some((i: any) => !!i.qrCode));
  }

  /* ------------------------------------------------------------------ done */
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  passed: ${passed}   failed: ${failed}`);
  if (failures.length) {
    console.log('\n  failing checks:');
    for (const f of failures) console.log(`   - ${f}`);
  }
  console.log('='.repeat(60));

  process.exit(failed === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error('\nSmoke test crashed:', error);
  process.exit(1);
});
