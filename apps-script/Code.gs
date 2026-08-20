/**
 * Google Apps Script backend
 * Sheets:
 *   Users: username | passwordHash | name | role | active
 *   LabaRugi / Neraca / ArusKas:
 *     id | owner | namaPerusahaan | periode | dataJson | createdAt | updatedAt
 *
 * Deploy as Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * IMPORTANT:
 * - Do not put the Spreadsheet ID in the React .env.
 * - Put the Spreadsheet ID only in Script Properties as SPREADSHEET_ID.
 * - Store SHA-256 password hashes in Users!B:B.
 */

const CONFIG = {
  SPREADSHEET_ID_PROPERTY: 'SPREADSHEET_ID',
  SESSION_TTL_SECONDS: 21600,
  USER_SHEET: 'Users',
  REPORT_SHEETS: {
    labaRugi: 'LabaRugi',
    neraca: 'Neraca',
    arusKas: 'ArusKas'
  }
};

function doGet(e) {
  try {
    const p = e.parameter || {};
    return json(handleRequest_(p.action || 'ping', p));
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    return json(handleRequest_(body.action || 'ping', body));
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function handleRequest_(action, payload) {
  if (action === 'ping') {
    return { ok: true, service: 'laporan-keuangan-api' };
  }

  if (action === 'login') {
    return login_(payload.username, payload.password);
  }

  const session = requireSession_(payload.token);

  switch (action) {
    case 'list':
      return listReports_(session.username, payload.type);
    case 'get':
      return getReport_(session.username, payload.type, payload.id);
    case 'save':
      return saveReport_(session.username, payload);
    case 'delete':
      return deleteReport_(session.username, payload.type, payload.id);
    default:
      return { ok: false, error: 'Action tidak dikenal.' };
  }
}

function login_(username, password) {
  username = String(username || '').trim();
  password = String(password || '');

  if (!username || !password) {
    return { ok: false, error: 'Username dan password wajib diisi.' };
  }

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.USER_SHEET);
  if (!sheet) {
    return { ok: false, error: 'Sheet Users belum dibuat.' };
  }

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) {
    return { ok: false, error: 'Belum ada user.' };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowUsername = String(row[0] || '').trim();

    if (rowUsername.toLowerCase() !== username.toLowerCase()) continue;

    const passwordHash = String(row[1] || '').trim();
    const name = String(row[2] || username);
    const role = String(row[3] || 'user');
    const active = String(row[4] === '' ? true : row[4]).toLowerCase() !== 'false';

    if (!active) {
      return { ok: false, error: 'Akun tidak aktif.' };
    }

    if (sha256_(password) !== passwordHash) {
      return { ok: false, error: 'Username atau password salah.' };
    }

    const token = Utilities.getUuid() + Utilities.getUuid();
    CacheService.getScriptCache().put(
      'session:' + token,
      JSON.stringify({ username: rowUsername, name, role }),
      CONFIG.SESSION_TTL_SECONDS
    );

    return {
      ok: true,
      data: {
        token,
        username: rowUsername,
        name,
        role
      }
    };
  }

  return { ok: false, error: 'Username atau password salah.' };
}

function requireSession_(token) {
  token = String(token || '').trim();
  if (!token) throw authError_();

  const raw = CacheService.getScriptCache().get('session:' + token);
  if (!raw) throw authError_();

  return JSON.parse(raw);
}

function authError_() {
  const err = new Error('Sesi login tidak valid atau sudah kedaluwarsa.');
  err.code = 'AUTH_REQUIRED';
  return err;
}

function listReports_(owner, type) {
  const sheet = getReportSheet_(type);
  const rows = sheet.getDataRange().getValues();
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) !== owner) continue;

    result.push({
      id: String(rows[i][0]),
      namaPerusahaan: String(rows[i][2] || ''),
      periode: String(rows[i][3] || ''),
      updatedAt: String(rows[i][6] || '')
    });
  }

  result.reverse();
  return { ok: true, data: result };
}

function getReport_(owner, type, id) {
  const sheet = getReportSheet_(type);
  const rowIndex = findRow_(sheet, owner, id);

  if (!rowIndex) {
    return { ok: false, error: 'Laporan tidak ditemukan.' };
  }

  const row = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];

  return {
    ok: true,
    data: {
      id: String(row[0]),
      namaPerusahaan: String(row[2] || ''),
      periode: String(row[3] || ''),
      data: JSON.parse(String(row[4] || '{}')),
      createdAt: String(row[5] || ''),
      updatedAt: String(row[6] || '')
    }
  };
}

function saveReport_(owner, payload) {
  const type = String(payload.type || '');
  const sheet = getReportSheet_(type);
  const now = new Date();
  const dataJson = JSON.stringify(payload.data || {});

  let id = String(payload.id || '').trim();
  let rowIndex = id ? findRow_(sheet, owner, id) : null;

  if (rowIndex) {
    const createdAt = sheet.getRange(rowIndex, 6).getValue();
    sheet.getRange(rowIndex, 1, 1, 7).setValues([[
      id,
      owner,
      String(payload.namaPerusahaan || ''),
      String(payload.periode || ''),
      dataJson,
      createdAt || now,
      now
    ]]);
  } else {
    id = Utilities.getUuid();
    sheet.appendRow([
      id,
      owner,
      String(payload.namaPerusahaan || ''),
      String(payload.periode || ''),
      dataJson,
      now,
      now
    ]);
  }

  return { ok: true, data: { id } };
}

function deleteReport_(owner, type, id) {
  const sheet = getReportSheet_(type);
  const rowIndex = findRow_(sheet, owner, id);

  if (!rowIndex) {
    return { ok: false, error: 'Laporan tidak ditemukan.' };
  }

  sheet.deleteRow(rowIndex);
  return { ok: true };
}

function findRow_(sheet, owner, id) {
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id) && String(rows[i][1]) === String(owner)) {
      return i + 1;
    }
  }

  return null;
}

function getReportSheet_(type) {
  const name = CONFIG.REPORT_SHEETS[type];
  if (!name) throw new Error('Jenis laporan tidak valid.');

  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['id', 'owner', 'namaPerusahaan', 'periode', 'dataJson', 'createdAt', 'updatedAt']);
  }

  return sheet;
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.SPREADSHEET_ID_PROPERTY);

  if (!id) {
    throw new Error('Script Property SPREADSHEET_ID belum diatur.');
  }

  return SpreadsheetApp.openById(id);
}

function sha256_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(b) {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

/**
 * Jalankan sekali setelah menambahkan Code.gs.
 * Membuat sheet Users dan 3 sheet laporan jika belum ada.
 */
function setupSheets() {
  const ss = getSpreadsheet_();

  let users = ss.getSheetByName(CONFIG.USER_SHEET);
  if (!users) {
    users = ss.insertSheet(CONFIG.USER_SHEET);
    users.appendRow(['username', 'passwordHash', 'name', 'role', 'active']);
  }

  Object.keys(CONFIG.REPORT_SHEETS).forEach(function(type) {
    getReportSheet_(type);
  });
}

/**
 * Helper untuk membuat hash password.
 * Jalankan dari Apps Script, lihat hasil di Logs.
 *
 * Contoh:
 *   logPasswordHash_('password123');
 */
function logPasswordHash_(password) {
  console.log(sha256_(String(password)));
}
