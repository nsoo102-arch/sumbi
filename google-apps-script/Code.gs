/**
 * Sumbi Google Sheets Web App
 *
 * 배포 (새 버전)
 * 1. script.google.com에서 Code.gs 저장 (Ctrl/Cmd + S)
 * 2. 배포 > 배포 관리 > 연필(수정) > 버전: "새 버전" > 배포
 * 3. 실행: 나 | 액세스: 모든 사용자
 *
 * 시트 탭: users, weekly_plan, daily_record, letters, AdminNotes
 *
 * users 컬럼 (현재 시트 헤더):
 * A created_at | B user_id | C name | D nickname | E email | F password_hash
 * 저장/조회는 헤더명 기준 매핑 (열 순서가 바뀌어도 안전)
 * password_hash: salt:sha256(salt:password) — list_users/get_member 응답에는 포함하지 않음
 * 기존 시트 전용 회원(해시 없음)은 login 시 비밀번호를 등록하거나, signup으로 해시를 붙일 수 있음
 *
 * 인증 API (doPost type):
 * - signup: 이메일 중복 검사 후 회원+비밀번호 해시 저장 (해시 없는 기존 행은 업그레이드)
 * - login: 이메일/비밀번호 검증 후 프로필 반환 (해시 미포함, 해시 없으면 첫 로그인 시 등록)
 * - reset_password: 이메일로 비밀번호 해시 갱신
 * - user: 하위 호환 upsert (password_hash 있으면 저장, 없으면 기존 해시 유지)
 *
 * weekly_plan 컬럼:
 * A created_at | B user_id | C name | D nickname | E email | F week_start_date
 * G ritual_1 | H ritual_2 | I ritual_3 | J ritual_4 | K ritual_5
 *
 * daily_record 컬럼:
 * A timestamp | B userId | C nickname | D date | E completedRituals | F memo
 *
 * letters 컬럼 (없으면 자동 생성):
 * A id | B email | C name | D nickname | E message | F sent_at | G read_at | H status
 * status: unread | read
 *
 * AdminNotes 컬럼 (없으면 자동 생성, 관리자 전용):
 * A email | B note | C updated_at
 */

function formatRitualSlot(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function formatRituals(value) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    return value
      .map(function (item) {
        if (typeof item === "string") {
          return item.trim();
        }
        if (typeof item === "number") {
          return String(item);
        }
        if (typeof item === "object" && item !== null) {
          return (
            item.label ||
            item.name ||
            item.title ||
            item.value ||
            item.text ||
            JSON.stringify(item)
          );
        }
        return "";
      })
      .filter(function (item) {
        return item && String(item).length > 0;
      })
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value).trim();
}

function cellToString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return value.toISOString();
  }

  return String(value).trim();
}

function normalizeEmail(value) {
  return cellToString(value).toLowerCase();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function isHeaderRow(row, keys) {
  if (!row || row.length === 0) {
    return false;
  }

  var normalized = row.map(function (cell) {
    return cellToString(cell).toLowerCase();
  });

  for (var i = 0; i < keys.length; i++) {
    if (normalized.indexOf(keys[i]) !== -1) {
      return true;
    }
  }

  return false;
}

function buildUsersColumnMap(headerRow) {
  // 기본값: Users 시트 헤더 순서
  // created_at | user_id | name | nickname | email | password_hash
  var map = {
    created_at: 0,
    user_id: 1,
    name: 2,
    nickname: 3,
    email: 4,
    password_hash: 5,
  };

  if (!headerRow) {
    return map;
  }

  var foundPasswordHash = false;

  headerRow.forEach(function (cell, index) {
    var key = cellToString(cell).toLowerCase();
    if (key === "user_id" || key === "userid" || key === "id") {
      map.user_id = index;
    } else if (key === "name" || key === "이름") {
      map.name = index;
    } else if (
      key === "nickname" ||
      key === "활동이름" ||
      key === "닉네임"
    ) {
      map.nickname = index;
    } else if (key === "email" || key === "이메일") {
      map.email = index;
    } else if (
      key === "created_at" ||
      key === "createdat" ||
      key === "가입일" ||
      key === "가입일시"
    ) {
      map.created_at = index;
    } else if (
      key === "password_hash" ||
      key === "passwordhash" ||
      key === "비밀번호해시"
    ) {
      map.password_hash = index;
      foundPasswordHash = true;
    }
  });

  if (!foundPasswordHash) {
    map.password_hash = -1;
  }

  return map;
}

/** 빈 users 시트에 표준 헤더를 만들고, password_hash 열이 없으면 추가합니다. */
function ensurePasswordHashColumn(meta) {
  if (meta.error) {
    return meta;
  }

  var sheet = meta.sheet;

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "created_at",
      "user_id",
      "name",
      "nickname",
      "email",
      "password_hash",
    ]);
    meta.hasHeader = true;
    meta.columnMap = buildUsersColumnMap(
      sheet.getRange(1, 1, 1, 6).getValues()[0],
    );
    meta.lastCol = 6;
    return meta;
  }

  var columnMap = meta.columnMap;
  if (
    typeof columnMap.password_hash === "number" &&
    columnMap.password_hash >= 0
  ) {
    meta.lastCol = Math.max(meta.lastCol, columnMap.password_hash + 1);
    return meta;
  }

  var newColIndex = meta.lastCol;
  columnMap.password_hash = newColIndex;
  meta.lastCol = newColIndex + 1;

  if (meta.hasHeader) {
    sheet.getRange(1, newColIndex + 1).setValue("password_hash");
  }

  sheet.getRange(1, newColIndex + 1).setNumberFormat("@");

  return meta;
}

function getUsersSheetAndMap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("users");

  if (!sheet) {
    return { error: "Sheet not found: users" };
  }

  var lastCol = Math.max(sheet.getLastColumn(), 5);
  var headerRow = null;
  var columnMap = buildUsersColumnMap(null);

  if (sheet.getLastRow() > 0) {
    var firstRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (
      isHeaderRow(firstRow, [
        "user_id",
        "email",
        "nickname",
        "created_at",
        "이름",
        "이메일",
        "가입일",
        "password_hash",
      ])
    ) {
      headerRow = firstRow;
      columnMap = buildUsersColumnMap(firstRow);
      lastCol = Math.max(lastCol, headerRow.length);
    }
  }

  return ensurePasswordHashColumn({
    sheet: sheet,
    columnMap: columnMap,
    lastCol: lastCol,
    hasHeader: !!headerRow,
  });
}

/** 클라이언트와 동일한 SHA-256 hex (salt:password → hash) */
function sha256HexAppsScript(message) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    message,
    Utilities.Charset.UTF_8,
  );
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var value = raw[i];
    if (value < 0) {
      value += 256;
    }
    var hex = value.toString(16);
    out.push(hex.length === 1 ? "0" + hex : hex);
  }
  return out.join("");
}

/** salt:sha256(salt:password) — 클라이언트 hashPassword와 동일 형식 */
function hashPasswordAppsScript(password) {
  var salt = Utilities.getUuid();
  var hash = sha256HexAppsScript(salt + ":" + String(password));
  return salt + ":" + hash;
}

/** Sheets가 날짜/숫자로 변환하지 않도록 텍스트로 읽기 */
function readPasswordHashCell(value) {
  var stored = cellToString(value);
  if (stored.charAt(0) === "'") {
    stored = stored.slice(1);
  }
  return stored;
}

function isValidPasswordHash(storedHash) {
  var stored = readPasswordHashCell(storedHash);
  var separator = stored.indexOf(":");
  if (separator <= 0) {
    return false;
  }
  var salt = stored.slice(0, separator);
  var hash = stored.slice(separator + 1);
  // sha256 hex = 64자. Sheets가 날짜로 바꾼 값은 여기서 걸러집니다.
  if (!salt || !/^[0-9a-f]{64}$/i.test(hash)) {
    return false;
  }
  return true;
}

function verifyPasswordHash(password, storedHash) {
  var stored = readPasswordHashCell(storedHash);
  var separator = stored.indexOf(":");
  if (separator <= 0) {
    return false;
  }

  var salt = stored.slice(0, separator);
  var expectedHash = stored.slice(separator + 1);
  if (!expectedHash) {
    return false;
  }

  var hash = sha256HexAppsScript(salt + ":" + String(password));
  return hash === expectedHash;
}

/** password_hash 셀을 강제 텍스트로 저장 (Sheets 자동 변환 방지) */
function writePasswordHashCell(sheet, rowIndex, columnIndex0, passwordHash) {
  if (columnIndex0 < 0) {
    return;
  }
  var cell = sheet.getRange(rowIndex, columnIndex0 + 1);
  cell.setNumberFormat("@");
  cell.setValue(cellToString(passwordHash));
}

function publicUserProfile(user) {
  return {
    created_at: user.created_at || "",
    user_id: user.user_id || "",
    name: user.name || "",
    nickname: user.nickname || "",
    email: user.email || "",
    status: "active",
  };
}

/**
 * 이메일로 회원 행을 찾습니다.
 * includePasswordHash=true 일 때만 password_hash를 포함합니다 (login/reset 전용).
 */
function findUserRowByEmail(email, includePasswordHash) {
  var meta = getUsersSheetAndMap();
  if (meta.error) {
    return { error: meta.error };
  }

  var normalized = normalizeEmail(email);
  if (!normalized) {
    return { error: "이메일을 입력해 주세요." };
  }

  var sheet = meta.sheet;
  var columnMap = meta.columnMap;
  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return { found: false, meta: meta };
  }

  var startIndex = meta.hasHeader ? 1 : 0;

  for (var i = startIndex; i < values.length; i++) {
    var row = values[i];
    var rowEmail = normalizeEmail(row[columnMap.email]);
    if (rowEmail !== normalized) {
      continue;
    }

    var user = {
      created_at: cellToString(row[columnMap.created_at]),
      user_id: cellToString(row[columnMap.user_id]),
      name: cellToString(row[columnMap.name]),
      nickname: cellToString(row[columnMap.nickname]),
      email: rowEmail,
      status: "active",
    };

    if (includePasswordHash) {
      user.password_hash = readPasswordHashCell(row[columnMap.password_hash]);
    }

    return {
      found: true,
      rowIndex: i + 1,
      user: user,
      meta: meta,
    };
  }

  return { found: false, meta: meta };
}

function writeUserRow(meta, rowIndex, user, passwordHash) {
  var sheet = meta.sheet;
  var columnMap = meta.columnMap;
  var lastCol = meta.lastCol;
  var row = [];
  var existingHash = "";
  var hasHashColumn =
    typeof columnMap.password_hash === "number" &&
    columnMap.password_hash >= 0;
  // 빈 문자열은 "미전달"로 취급해 기존 해시를 지우지 않음
  var shouldWriteHash =
    hasHashColumn &&
    passwordHash !== undefined &&
    passwordHash !== null &&
    cellToString(passwordHash) !== "";

  if (rowIndex && rowIndex > 0) {
    var existing = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    for (var c = 0; c < lastCol; c++) {
      row[c] = existing[c];
    }
    if (hasHashColumn) {
      existingHash = readPasswordHashCell(existing[columnMap.password_hash]);
    }
  } else {
    for (var i = 0; i < lastCol; i++) {
      row[i] = "";
    }
  }

  row[columnMap.created_at] = user.created_at;
  row[columnMap.user_id] = user.user_id;
  row[columnMap.name] = user.name;
  row[columnMap.nickname] = user.nickname;
  row[columnMap.email] = user.email;

  // setValues로 넣으면 Sheets가 salt:hash를 날짜/숫자로 바꿀 수 있어
  // 프로필만 먼저 쓰고, password_hash는 텍스트 포맷으로 따로 저장합니다.
  if (hasHashColumn) {
    row[columnMap.password_hash] = existingHash || "";
  }

  var targetRowIndex = rowIndex;
  if (rowIndex && rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, lastCol).setValues([row]);
  } else {
    sheet.appendRow(row);
    targetRowIndex = sheet.getLastRow();
  }

  if (shouldWriteHash) {
    writePasswordHashCell(
      sheet,
      targetRowIndex,
      columnMap.password_hash,
      passwordHash,
    );
  } else if (hasHashColumn && existingHash) {
    writePasswordHashCell(
      sheet,
      targetRowIndex,
      columnMap.password_hash,
      existingHash,
    );
  }
}

/** 회원가입: 이메일 중복 검사 후 password_hash와 함께 저장 */
function signupUser(payload) {
  var created_at =
    cellToString(payload.created_at) || new Date().toISOString();
  var user_id = cellToString(payload.user_id || payload.userId || payload.id);
  var name = cellToString(payload.name);
  var nickname = cellToString(payload.nickname);
  var email = normalizeEmail(payload.email);
  var password_hash = cellToString(
    payload.password_hash || payload.passwordHash,
  );

  if (!name) {
    return { success: false, error: "이름을 입력해 주세요." };
  }
  if (!nickname) {
    return { success: false, error: "닉네임을 입력해 주세요." };
  }
  if (!email) {
    return { success: false, error: "이메일을 입력해 주세요." };
  }
  if (!isValidPasswordHash(password_hash)) {
    return { success: false, error: "비밀번호 해시가 올바르지 않습니다." };
  }
  if (!user_id) {
    user_id = Utilities.getUuid();
  }

  var existing = findUserRowByEmail(email, true);
  if (existing.error) {
    return { success: false, error: existing.error };
  }

  // 예전에 프로필만 저장된 회원 → 비밀번호를 붙여 기기 간 로그인 가능하게 함
  if (existing.found) {
    if (isValidPasswordHash(existing.user.password_hash)) {
      return { success: false, error: "이미 가입된 이메일입니다." };
    }

    var upgraded = {
      created_at: existing.user.created_at || created_at,
      user_id: existing.user.user_id || user_id,
      name: name || existing.user.name,
      nickname: nickname || existing.user.nickname,
      email: email,
    };
    writeUserRow(existing.meta, existing.rowIndex, upgraded, password_hash);
    return {
      success: true,
      data: publicUserProfile(upgraded),
    };
  }

  var meta = existing.meta;
  var user = {
    created_at: created_at,
    user_id: user_id,
    name: name,
    nickname: nickname,
    email: email,
  };
  writeUserRow(meta, 0, user, password_hash);

  return {
    success: true,
    data: publicUserProfile(user),
  };
}

/** 로그인: 시트에 저장된 password_hash로 검증 */
function loginUser(payload) {
  var email = normalizeEmail(payload.email);
  var password = String(payload.password || "");

  if (!email) {
    return { success: false, error: "이메일을 입력해 주세요." };
  }
  if (!password) {
    return { success: false, error: "비밀번호를 입력해 주세요." };
  }

  var found = findUserRowByEmail(email, true);
  if (found.error) {
    return { success: false, error: found.error };
  }
  if (!found.found) {
    return {
      success: false,
      error: "이메일 또는 비밀번호가 올바르지 않습니다.",
    };
  }

  var user = found.user;

  // 시트에 비밀번호가 없던 기존 회원: 첫 원격 로그인 시 해시 등록 (기기 간 로그인 마이그레이션)
  if (!isValidPasswordHash(user.password_hash)) {
    var migratedHash = hashPasswordAppsScript(password);
    writeUserRow(found.meta, found.rowIndex, user, migratedHash);
    return {
      success: true,
      data: publicUserProfile(user),
    };
  }

  if (!verifyPasswordHash(password, user.password_hash)) {
    return {
      success: false,
      error: "이메일 또는 비밀번호가 올바르지 않습니다.",
    };
  }

  return {
    success: true,
    data: publicUserProfile(user),
  };
}

/** 비밀번호 재설정: 이메일로 password_hash 갱신 */
function resetPasswordUser(payload) {
  var email = normalizeEmail(payload.email);
  var password_hash = cellToString(
    payload.password_hash || payload.passwordHash,
  );

  if (!email) {
    return { success: false, error: "이메일을 입력해 주세요." };
  }
  if (!isValidPasswordHash(password_hash)) {
    return { success: false, error: "비밀번호 해시가 올바르지 않습니다." };
  }

  var found = findUserRowByEmail(email, true);
  if (found.error) {
    return { success: false, error: found.error };
  }
  if (!found.found) {
    return { success: false, error: "등록되지 않은 이메일입니다." };
  }

  var user = found.user;
  writeUserRow(found.meta, found.rowIndex, user, password_hash);

  return {
    success: true,
    data: publicUserProfile(user),
  };
}

/**
 * 헤더명 기준으로 Users 시트에 회원을 추가/갱신합니다.
 * 이메일이 있으면 프로필 업데이트(password_hash는 전달된 경우만 갱신).
 */
function appendUserByHeader(payload) {
  var email = normalizeEmail(payload.email);
  var created_at =
    cellToString(payload.created_at) || new Date().toISOString();
  var user_id = cellToString(payload.user_id || payload.userId || payload.id);
  var name = cellToString(payload.name);
  var nickname = cellToString(payload.nickname);
  var password_hash = cellToString(
    payload.password_hash || payload.passwordHash,
  );

  var existing = findUserRowByEmail(email, true);
  if (existing.error) {
    return { success: false, error: existing.error };
  }

  var meta = existing.meta;

  if (existing.found) {
    var current = existing.user;
    var updated = {
      created_at: current.created_at || created_at,
      user_id: user_id || current.user_id,
      name: name || current.name,
      nickname: nickname || current.nickname,
      email: email || current.email,
    };
    // password_hash가 요청에 있을 때만 갱신 (없으면 기존 해시 유지)
    var nextHash = isValidPasswordHash(password_hash)
      ? password_hash
      : undefined;
    writeUserRow(meta, existing.rowIndex, updated, nextHash);
    return {
      success: true,
      data: publicUserProfile(updated),
    };
  }

  if (!user_id) {
    user_id = Utilities.getUuid();
  }

  var user = {
    created_at: created_at,
    user_id: user_id,
    name: name,
    nickname: nickname,
    email: email,
  };
  writeUserRow(meta, 0, user, password_hash);

  return {
    success: true,
    data: publicUserProfile(user),
  };
}

function buildWeeklyColumnMap(headerRow) {
  var map = {
    created_at: 0,
    user_id: 1,
    name: 2,
    nickname: 3,
    email: 4,
    week_start_date: 5,
    ritual_1: 6,
    ritual_2: 7,
    ritual_3: 8,
    ritual_4: 9,
    ritual_5: 10,
  };

  if (!headerRow) {
    return map;
  }

  headerRow.forEach(function (cell, index) {
    var key = cellToString(cell).toLowerCase();
    if (key === "created_at" || key === "createdat") {
      map.created_at = index;
    } else if (key === "user_id" || key === "userid" || key === "id") {
      map.user_id = index;
    } else if (key === "name" || key === "이름") {
      map.name = index;
    } else if (
      key === "nickname" ||
      key === "활동이름" ||
      key === "닉네임"
    ) {
      map.nickname = index;
    } else if (key === "email" || key === "이메일") {
      map.email = index;
    } else if (
      key === "week_start_date" ||
      key === "weekstartdate" ||
      key === "주시작일"
    ) {
      map.week_start_date = index;
    } else if (key === "ritual_1" || key === "ritual1" || key === "숨비소리1") {
      map.ritual_1 = index;
    } else if (key === "ritual_2" || key === "ritual2" || key === "숨비소리2") {
      map.ritual_2 = index;
    } else if (key === "ritual_3" || key === "ritual3" || key === "숨비소리3") {
      map.ritual_3 = index;
    } else if (key === "ritual_4" || key === "ritual4" || key === "숨비소리4") {
      map.ritual_4 = index;
    } else if (key === "ritual_5" || key === "ritual5" || key === "숨비소리5") {
      map.ritual_5 = index;
    }
  });

  return map;
}

function buildDailyColumnMap(headerRow) {
  var map = {
    timestamp: 0,
    user_id: 1,
    nickname: 2,
    date: 3,
    completed_rituals: 4,
    memo: 5,
  };

  if (!headerRow) {
    return map;
  }

  headerRow.forEach(function (cell, index) {
    var key = cellToString(cell).toLowerCase();
    if (key === "timestamp" || key === "created_at" || key === "createdat") {
      map.timestamp = index;
    } else if (
      key === "userid" ||
      key === "user_id" ||
      key === "id"
    ) {
      map.user_id = index;
    } else if (
      key === "nickname" ||
      key === "활동이름" ||
      key === "닉네임"
    ) {
      map.nickname = index;
    } else if (
      key === "date" ||
      key === "날짜" ||
      key === "recorded_at" ||
      key === "recordedat" ||
      key === "record_date" ||
      key === "recorddate" ||
      key === "기록일" ||
      key === "기록날짜"
    ) {
      map.date = index;
    } else if (
      key === "completedrituals" ||
      key === "completed_rituals" ||
      key === "rituals" ||
      key === "실행한숨비소리"
    ) {
      map.completed_rituals = index;
    } else if (
      key === "memo" ||
      key === "diary" ||
      key === "note" ||
      key === "기록" ||
      key === "내용"
    ) {
      map.memo = index;
    }
  });

  return map;
}

function readUsers() {
  var meta = getUsersSheetAndMap();
  if (meta.error) {
    return { error: meta.error };
  }

  var sheet = meta.sheet;
  var columnMap = meta.columnMap;
  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return { users: [] };
  }

  var startIndex = meta.hasHeader ? 1 : 0;
  var users = [];

  for (var i = startIndex; i < values.length; i++) {
    var row = values[i];
    var user_id = cellToString(row[columnMap.user_id]);
    var name = cellToString(row[columnMap.name]);
    var nickname = cellToString(row[columnMap.nickname]);
    var email = normalizeEmail(row[columnMap.email]);
    var created_at = cellToString(row[columnMap.created_at]);

    if (!user_id && !name && !nickname && !email) {
      continue;
    }

    users.push({
      user_id: user_id,
      name: name,
      nickname: nickname,
      email: email,
      created_at: created_at,
      status: "active",
    });
  }

  return { users: users };
}

function listUsers() {
  var result = readUsers();
  if (result.error) {
    return jsonResponse({ success: false, error: result.error });
  }

  return jsonResponse({ success: true, data: result.users });
}

function findLatestWeeklyPlan(email, userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("weekly_plan");

  if (!sheet) {
    return null;
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return null;
  }

  var startIndex = 0;
  var columnMap = buildWeeklyColumnMap(null);

  if (
    isHeaderRow(values[0], [
      "email",
      "week_start_date",
      "ritual_1",
      "user_id",
      "이메일",
    ])
  ) {
    columnMap = buildWeeklyColumnMap(values[0]);
    startIndex = 1;
  }

  var targetEmail = normalizeEmail(email);
  var targetUserId = cellToString(userId);
  var latest = null;
  var latestSortKey = "";

  for (var i = startIndex; i < values.length; i++) {
    var row = values[i];
    var rowEmail = normalizeEmail(row[columnMap.email]);
    var rowUserId = cellToString(row[columnMap.user_id]);

    var emailMatch = targetEmail && rowEmail === targetEmail;
    var userMatch = targetUserId && rowUserId === targetUserId;

    if (!emailMatch && !userMatch) {
      continue;
    }

    var created_at = cellToString(row[columnMap.created_at]);
    var week_start_date = cellToString(row[columnMap.week_start_date]);
    var sortKey = created_at || week_start_date;

    if (!latest || sortKey >= latestSortKey) {
      latestSortKey = sortKey;
      latest = {
        created_at: created_at,
        user_id: rowUserId,
        name: cellToString(row[columnMap.name]),
        nickname: cellToString(row[columnMap.nickname]),
        email: cellToString(row[columnMap.email]),
        week_start_date: week_start_date,
        rituals: [
          cellToString(row[columnMap.ritual_1]),
          cellToString(row[columnMap.ritual_2]),
          cellToString(row[columnMap.ritual_3]),
          cellToString(row[columnMap.ritual_4]),
          cellToString(row[columnMap.ritual_5]),
        ].filter(function (item) {
          return item.length > 0;
        }),
      };
    }
  }

  return latest;
}

function findRecentDailyRecords(userId, nickname, limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("daily_record");

  if (!sheet) {
    return [];
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return [];
  }

  var startIndex = 0;
  var columnMap = buildDailyColumnMap(null);

  if (
    isHeaderRow(values[0], [
      "timestamp",
      "userid",
      "user_id",
      "nickname",
      "date",
      "completedrituals",
    ])
  ) {
    columnMap = buildDailyColumnMap(values[0]);
    startIndex = 1;
  }

  var targetUserId = cellToString(userId);
  var targetNickname = cellToString(nickname);
  var records = [];

  for (var i = startIndex; i < values.length; i++) {
    var row = values[i];
    var rowUserId = cellToString(row[columnMap.user_id]);
    var rowNickname = cellToString(row[columnMap.nickname]);

    var userMatch = targetUserId && rowUserId === targetUserId;
    var nicknameMatch =
      !targetUserId &&
      targetNickname &&
      rowNickname.toLowerCase() === targetNickname.toLowerCase();

    if (!userMatch && !nicknameMatch) {
      continue;
    }

    var dateKey =
      normalizeKoreaDateKey(row[columnMap.date]) ||
      normalizeKoreaDateKey(row[columnMap.timestamp]);

    records.push({
      timestamp: cellToString(row[columnMap.timestamp]),
      user_id: rowUserId,
      nickname: rowNickname,
      date: dateKey || cellToString(row[columnMap.date]),
      completed_rituals: cellToString(row[columnMap.completed_rituals]),
      memo: cellToString(row[columnMap.memo]),
    });
  }

  records.sort(function (a, b) {
    var aKey = a.timestamp || a.date || "";
    var bKey = b.timestamp || b.date || "";
    if (aKey < bKey) {
      return 1;
    }
    if (aKey > bKey) {
      return -1;
    }
    return 0;
  });

  return records.slice(0, limit || 10);
}

function getMemberDetail(email) {
  var normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return jsonResponse({
      success: false,
      error: "email 파라미터가 필요합니다.",
    });
  }

  var usersResult = readUsers();
  if (usersResult.error) {
    return jsonResponse({ success: false, error: usersResult.error });
  }

  var member = null;
  for (var i = 0; i < usersResult.users.length; i++) {
    if (normalizeEmail(usersResult.users[i].email) === normalizedEmail) {
      member = usersResult.users[i];
    }
  }

  if (!member) {
    return jsonResponse({
      success: false,
      error: "해당 이메일의 회원을 찾을 수 없습니다.",
    });
  }

  var weekly = findLatestWeeklyPlan(member.email, member.user_id);
  var records = findRecentDailyRecords(member.user_id, member.nickname, 10);

  return jsonResponse({
    success: true,
    data: {
      member: member,
      weekly: weekly,
      records: records,
    },
  });
}

function getOrCreateLettersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("letters");
  var headers = [
    "id",
    "email",
    "name",
    "nickname",
    "message",
    "sent_at",
    "read_at",
    "status",
  ];

  if (!sheet) {
    sheet = ss.insertSheet("letters");
    sheet.appendRow(headers);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }

  // 기존 시트에 status 열이 없으면 헤더에 추가
  var headerValues = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var hasStatus = false;
  for (var i = 0; i < headerValues.length; i++) {
    if (cellToString(headerValues[i]).toLowerCase() === "status") {
      hasStatus = true;
      break;
    }
  }
  if (!hasStatus) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue("status");
  }

  return sheet;
}

function buildLettersColumnMap(headerRow) {
  var map = {
    id: 0,
    email: 1,
    name: 2,
    nickname: 3,
    message: 4,
    sent_at: 5,
    read_at: 6,
    status: 7,
  };

  if (!headerRow) {
    return map;
  }

  headerRow.forEach(function (cell, index) {
    var key = cellToString(cell).toLowerCase();
    if (key === "id" || key === "letter_id" || key === "letterid") {
      map.id = index;
    } else if (key === "email" || key === "이메일") {
      map.email = index;
    } else if (key === "name" || key === "이름") {
      map.name = index;
    } else if (
      key === "nickname" ||
      key === "활동이름" ||
      key === "닉네임"
    ) {
      map.nickname = index;
    } else if (
      key === "message" ||
      key === "letter_content" ||
      key === "내용" ||
      key === "편지"
    ) {
      map.message = index;
    } else if (
      key === "sent_at" ||
      key === "sentat" ||
      key === "created_at" ||
      key === "보낸날짜"
    ) {
      map.sent_at = index;
    } else if (
      key === "read_at" ||
      key === "readat" ||
      key === "읽은날짜"
    ) {
      map.read_at = index;
    } else if (key === "status" || key === "상태") {
      map.status = index;
    }
  });

  return map;
}

function resolveLetterStatus(statusValue, readAtValue) {
  var status = cellToString(statusValue).toLowerCase();
  if (status === "read" || status === "unread") {
    return status;
  }
  return cellToString(readAtValue) ? "read" : "unread";
}

function rowToLetter(row, columnMap) {
  var read_at = cellToString(row[columnMap.read_at]);
  var status = resolveLetterStatus(row[columnMap.status], read_at);

  return {
    id: cellToString(row[columnMap.id]),
    email: cellToString(row[columnMap.email]),
    name: cellToString(row[columnMap.name]),
    nickname: cellToString(row[columnMap.nickname]),
    message: cellToString(row[columnMap.message]),
    sent_at: cellToString(row[columnMap.sent_at]),
    read_at: read_at,
    status: status,
  };
}

function createLetter(payload) {
  var email = normalizeEmail(payload.email);
  var message = cellToString(payload.message);

  if (!email) {
    return jsonResponse({
      success: false,
      error: "email이 필요합니다.",
    });
  }

  if (!message) {
    return jsonResponse({
      success: false,
      error: "편지 내용이 비어 있습니다.",
    });
  }

  var sheet = getOrCreateLettersSheet();
  var values = sheet.getDataRange().getValues();
  var columnMap = buildLettersColumnMap(values[0]);
  var id = cellToString(payload.id) || Utilities.getUuid();
  var sent_at = cellToString(payload.sent_at) || new Date().toISOString();
  var letter = {
    id: id,
    email: email,
    name: cellToString(payload.name),
    nickname: cellToString(payload.nickname),
    message: message,
    sent_at: sent_at,
    read_at: "",
    status: "unread",
  };

  var row = [];
  var maxCol = Math.max(
    columnMap.id,
    columnMap.email,
    columnMap.name,
    columnMap.nickname,
    columnMap.message,
    columnMap.sent_at,
    columnMap.read_at,
    columnMap.status,
  );
  for (var c = 0; c <= maxCol; c++) {
    row[c] = "";
  }
  row[columnMap.id] = letter.id;
  row[columnMap.email] = letter.email;
  row[columnMap.name] = letter.name;
  row[columnMap.nickname] = letter.nickname;
  row[columnMap.message] = letter.message;
  row[columnMap.sent_at] = letter.sent_at;
  row[columnMap.read_at] = letter.read_at;
  row[columnMap.status] = letter.status;

  sheet.appendRow(row);

  return jsonResponse({ success: true, data: letter });
}

function listLetters(email, limit) {
  var normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return jsonResponse({
      success: false,
      error: "email 파라미터가 필요합니다.",
    });
  }

  var sheet = getOrCreateLettersSheet();
  var values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) {
    return jsonResponse({ success: true, data: [] });
  }

  var columnMap = buildLettersColumnMap(values[0]);
  var letters = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowEmail = normalizeEmail(row[columnMap.email]);

    if (rowEmail !== normalizedEmail) {
      continue;
    }

    var letter = rowToLetter(row, columnMap);

    if (!letter.id && !letter.message) {
      continue;
    }

    letters.push(letter);
  }

  letters.sort(function (a, b) {
    var aKey = a.sent_at || "";
    var bKey = b.sent_at || "";
    if (aKey < bKey) {
      return 1;
    }
    if (aKey > bKey) {
      return -1;
    }
    return 0;
  });

  var max = limit || 50;
  return jsonResponse({
    success: true,
    data: letters.slice(0, max),
  });
}

function markLetterRead(payload) {
  var id = cellToString(payload.id || payload.letter_id);
  var email = normalizeEmail(payload.email);

  if (!id) {
    return jsonResponse({
      success: false,
      error: "id가 필요합니다.",
    });
  }

  if (!email) {
    return jsonResponse({
      success: false,
      error: "email이 필요합니다.",
    });
  }

  var sheet = getOrCreateLettersSheet();
  var values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) {
    return jsonResponse({
      success: false,
      error: "편지를 찾을 수 없습니다.",
    });
  }

  var columnMap = buildLettersColumnMap(values[0]);
  var requestedReadAt = cellToString(payload.read_at);
  var readAt = requestedReadAt || new Date().toISOString();

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowId = cellToString(row[columnMap.id]);
    var rowEmail = normalizeEmail(row[columnMap.email]);

    // id + 수신자 이메일 모두 일치해야 읽음 처리 (타인 편지 방지)
    if (rowId !== id || rowEmail !== email) {
      continue;
    }

    var existingReadAt = cellToString(row[columnMap.read_at]);
    if (existingReadAt) {
      // 이미 읽은 편지는 read_at을 덮어쓰지 않음
      readAt = existingReadAt;
    } else {
      sheet.getRange(i + 1, columnMap.read_at + 1).setValue(readAt);
    }

    // status 열이 없으면 추가 후 기록
    var statusCol = columnMap.status + 1;
    if (statusCol > sheet.getLastColumn()) {
      sheet.getRange(1, statusCol).setValue("status");
    }
    sheet.getRange(i + 1, statusCol).setValue("read");
    SpreadsheetApp.flush();

    var updated = rowToLetter(row, columnMap);
    updated.read_at = readAt;
    updated.status = "read";
    updated.email = rowEmail;

    return jsonResponse({
      success: true,
      data: updated,
    });
  }

  return jsonResponse({
    success: false,
    error: "편지를 찾을 수 없습니다.",
  });
}

function getOrCreateAdminNotesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("AdminNotes");
  var headers = ["email", "note", "updated_at"];

  if (!sheet) {
    sheet = ss.insertSheet("AdminNotes");
    sheet.appendRow(headers);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function buildAdminNotesColumnMap(headerRow) {
  var map = {
    email: 0,
    note: 1,
    updated_at: 2,
  };

  if (!headerRow) {
    return map;
  }

  headerRow.forEach(function (cell, index) {
    var key = cellToString(cell).toLowerCase();
    if (key === "email" || key === "이메일") {
      map.email = index;
    } else if (key === "note" || key === "memo" || key === "메모" || key === "운영메모") {
      map.note = index;
    } else if (
      key === "updated_at" ||
      key === "updatedat" ||
      key === "수정일" ||
      key === "업데이트"
    ) {
      map.updated_at = index;
    }
  });

  return map;
}

/** 관리자 전용 운영 메모 조회 (회원 비공개) */
function getAdminNote(email) {
  var normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return jsonResponse({
      success: false,
      error: "email 파라미터가 필요합니다.",
    });
  }

  var sheet = getOrCreateAdminNotesSheet();
  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return jsonResponse({
      success: true,
      data: {
        email: normalizedEmail,
        note: "",
        updated_at: "",
      },
    });
  }

  var columnMap = buildAdminNotesColumnMap(values[0]);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowEmail = normalizeEmail(row[columnMap.email]);
    if (rowEmail !== normalizedEmail) {
      continue;
    }

    return jsonResponse({
      success: true,
      data: {
        email: rowEmail,
        note: cellToString(row[columnMap.note]),
        updated_at: cellToString(row[columnMap.updated_at]),
      },
    });
  }

  return jsonResponse({
    success: true,
    data: {
      email: normalizedEmail,
      note: "",
      updated_at: "",
    },
  });
}

/** 관리자 전용 운영 메모 저장 (email 기준 upsert) */
function saveAdminNote(payload) {
  var normalizedEmail = normalizeEmail(payload.email);
  var note = cellToString(payload.note);
  var updated_at =
    cellToString(payload.updated_at) || new Date().toISOString();

  if (!normalizedEmail) {
    return jsonResponse({
      success: false,
      error: "email이 필요합니다.",
    });
  }

  var sheet = getOrCreateAdminNotesSheet();
  var values = sheet.getDataRange().getValues();
  var columnMap = buildAdminNotesColumnMap(
    values && values.length > 0 ? values[0] : null,
  );

  if (!values || values.length === 0) {
    sheet.appendRow(["email", "note", "updated_at"]);
    values = sheet.getDataRange().getValues();
    columnMap = buildAdminNotesColumnMap(values[0]);
  }

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowEmail = normalizeEmail(row[columnMap.email]);
    if (rowEmail !== normalizedEmail) {
      continue;
    }

    sheet.getRange(i + 1, columnMap.email + 1).setValue(normalizedEmail);
    sheet.getRange(i + 1, columnMap.note + 1).setValue(note);
    sheet.getRange(i + 1, columnMap.updated_at + 1).setValue(updated_at);
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      data: {
        email: normalizedEmail,
        note: note,
        updated_at: updated_at,
      },
    });
  }

  var maxCol = Math.max(columnMap.email, columnMap.note, columnMap.updated_at);
  var newRow = [];
  for (var c = 0; c <= maxCol; c++) {
    newRow[c] = "";
  }
  newRow[columnMap.email] = normalizedEmail;
  newRow[columnMap.note] = note;
  newRow[columnMap.updated_at] = updated_at;
  sheet.appendRow(newRow);

  return jsonResponse({
    success: true,
    data: {
      email: normalizedEmail,
      note: note,
      updated_at: updated_at,
    },
  });
}

/**
 * 다양한 Daily 날짜 값을 Asia/Seoul 기준 YYYY-MM-DD로 정규화합니다.
 * - Date 객체 (Sheets)
 * - 2026-07-10
 * - 2026-07-09T15:00:00.000Z  (KST 자정 → 2026-07-10)
 * - locale / "2026. 7. 10" 형식
 *
 * 주의: ISO 문자열을 slice(0,10) 하면 UTC 날짜가 되어
 * KST 자정(전날 15:00Z)이 하루 밀립니다.
 */
function normalizeKoreaDateKey(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (Object.prototype.toString.call(value) === "[object Date]") {
    if (isNaN(value.getTime())) {
      return "";
    }
    return Utilities.formatDate(value, "Asia/Seoul", "yyyy-MM-dd");
  }

  var raw = String(value).trim();
  if (!raw) {
    return "";
  }

  // 순수 달력 날짜(시간 없음)는 이미 KST 기준 일자로 간주
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // ISO / RFC / 일반 Date 파싱 가능 문자열 → Asia/Seoul 포맷
  var parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, "Asia/Seoul", "yyyy-MM-dd");
  }

  // "2026. 7. 10", "2026년 7월 10일", "2026. 7. 10 오전 12:00:00" 등
  var match = raw.match(
    /(\d{4})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/,
  );
  if (match) {
    var year = match[1];
    var month = ("0" + match[2]).slice(-2);
    var day = ("0" + match[3]).slice(-2);
    return year + "-" + month + "-" + day;
  }

  return "";
}

/** Asia/Seoul 기준 YYYY-MM-DD (normalizeKoreaDateKey 별칭) */
function toKoreaDateString(value) {
  if (value === null || value === undefined || value === "") {
    return getKoreaToday();
  }
  return normalizeKoreaDateKey(value) || getKoreaToday();
}

function getKoreaToday() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
}

/** 월요일 시작 주간 (KST) */
function getKoreaWeekStart(dateString) {
  var parts = String(dateString || getKoreaToday()).split("-");
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  var utc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  var weekday = utc.getUTCDay(); // 0 Sun .. 6 Sat
  var diff = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return Utilities.formatDate(utc, "UTC", "yyyy-MM-dd");
}

function addDaysToDateString(dateString, days) {
  var parts = String(dateString).split("-");
  var utc = new Date(
    Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
  );
  utc.setUTCDate(utc.getUTCDate() + days);
  return Utilities.formatDate(utc, "UTC", "yyyy-MM-dd");
}

function buildUserLookup() {
  var usersResult = readUsers();
  var byId = {};
  var byNickname = {};
  var byEmail = {};

  if (usersResult.error || !usersResult.users) {
    return {
      byId: byId,
      byNickname: byNickname,
      byEmail: byEmail,
      total: 0,
    };
  }

  for (var i = 0; i < usersResult.users.length; i++) {
    var user = usersResult.users[i];
    if (user.user_id) {
      byId[user.user_id] = user;
    }
    if (user.nickname) {
      byNickname[user.nickname.toLowerCase()] = user;
    }
    if (user.email) {
      byEmail[normalizeEmail(user.email)] = user;
    }
  }

  return {
    byId: byId,
    byNickname: byNickname,
    byEmail: byEmail,
    total: usersResult.users.length,
  };
}

function resolveUserFromDaily(rowUserId, rowNickname, lookup) {
  if (rowUserId && lookup.byId[rowUserId]) {
    return lookup.byId[rowUserId];
  }
  if (rowNickname && lookup.byNickname[rowNickname.toLowerCase()]) {
    return lookup.byNickname[rowNickname.toLowerCase()];
  }
  return null;
}

/**
 * 등록 회원(Users 시트)에 해당하는 고유 키만 반환.
 * Users에 없는 테스트 Daily/Weekly 행은 참여율에서 제외합니다.
 */
function registeredParticipantKey(userId, nickname, email, lookup) {
  var id = cellToString(userId);
  if (id && lookup.byId[id]) {
    return "id:" + id;
  }

  var normalizedEmail = normalizeEmail(email);
  if (normalizedEmail && lookup.byEmail && lookup.byEmail[normalizedEmail]) {
    var byEmailUser = lookup.byEmail[normalizedEmail];
    if (byEmailUser.user_id) {
      return "id:" + cellToString(byEmailUser.user_id);
    }
    return "email:" + normalizedEmail;
  }

  var user = resolveUserFromDaily(userId, nickname, lookup);
  if (!user) {
    return "";
  }

  if (user.user_id) {
    return "id:" + cellToString(user.user_id);
  }
  if (user.email) {
    return "email:" + normalizeEmail(user.email);
  }

  return "";
}

function readAllDailyRecords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("daily_record");

  if (!sheet) {
    return [];
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return [];
  }

  var startIndex = 0;
  var columnMap = buildDailyColumnMap(null);

  if (
    isHeaderRow(values[0], [
      "timestamp",
      "userid",
      "user_id",
      "nickname",
      "date",
      "completedrituals",
    ])
  ) {
    columnMap = buildDailyColumnMap(values[0]);
    startIndex = 1;
  }

  var records = [];
  for (var i = startIndex; i < values.length; i++) {
    var row = values[i];
    var timestampRaw = row[columnMap.timestamp];
    var dateRaw = row[columnMap.date];
    var timestamp = cellToString(timestampRaw);
    var user_id = cellToString(row[columnMap.user_id]);
    var nickname = cellToString(row[columnMap.nickname]);
    var completed_rituals = cellToString(row[columnMap.completed_rituals]);
    var memo = cellToString(row[columnMap.memo]);

    // Date 객체는 cellToString 전에 원본으로 정규화해야 UTC slice 오류를 피함
    var dateKey =
      normalizeKoreaDateKey(dateRaw) || normalizeKoreaDateKey(timestampRaw);

    if (!timestamp && !user_id && !nickname && !dateKey && !memo) {
      continue;
    }

    records.push({
      timestamp: timestamp,
      user_id: user_id,
      nickname: nickname,
      date: dateKey,
      completed_rituals: completed_rituals,
      memo: memo,
    });
  }

  return records;
}

function countUnreadLetters() {
  var sheet;
  try {
    sheet = getOrCreateLettersSheet();
  } catch (error) {
    return 0;
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return 0;
  }

  var columnMap = buildLettersColumnMap(values[0]);
  var count = 0;

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = cellToString(row[columnMap.id]);
    var message = cellToString(row[columnMap.message]);
    if (!id && !message) {
      continue;
    }

    // 요구사항: read_at이 비어 있으면 읽지 않은 편지
    var read_at = cellToString(row[columnMap.read_at]);
    if (!read_at) {
      count += 1;
    }
  }

  return count;
}

function clampPercent(value) {
  var n = Number(value);
  if (!isFinite(n) || n < 0) {
    return 0;
  }
  if (n > 100) {
    return 100;
  }
  return Math.round(n);
}

/** completed_rituals 셀을 개별 숨비소리 배열로 정규화 */
function normalizeRitualItems(value) {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Object.prototype.toString.call(value) === "[object Array]") {
    var fromArray = [];
    for (var i = 0; i < value.length; i++) {
      var item = cellToString(value[i]);
      if (item) {
        fromArray.push(item);
      }
    }
    return fromArray;
  }

  var raw = cellToString(value);
  if (!raw) {
    return [];
  }

  if (raw.charAt(0) === "[" && raw.charAt(raw.length - 1) === "]") {
    try {
      var parsed = JSON.parse(raw);
      if (Object.prototype.toString.call(parsed) === "[object Array]") {
        return normalizeRitualItems(parsed);
      }
    } catch (error) {
      // 일반 문자열로 처리
    }
  }

  var parts = raw.split(/[,|·]/);
  var items = [];
  for (var p = 0; p < parts.length; p++) {
    var part = cellToString(parts[p]);
    if (part) {
      items.push(part);
    }
  }
  return items;
}

function getAdminStats() {
  var lookup = buildUserLookup();
  var today = getKoreaToday();
  var weekStart = getKoreaWeekStart(today);
  var weekEnd = addDaysToDateString(weekStart, 6);
  var dailyRecords = readAllDailyRecords();

  var weekKeys = {};
  var weeklyRecordCount = 0;
  var ritualCounts = {};

  // 최근 4주 (이번 주 포함): weekStart를 기준으로 과거로
  var recentWeeks = [];
  for (var w = 0; w < 4; w++) {
    var start = addDaysToDateString(weekStart, -7 * w);
    var end = addDaysToDateString(start, 6);
    recentWeeks.push({
      week_start: start,
      week_end: end,
      keys: {},
    });
  }

  for (var i = 0; i < dailyRecords.length; i++) {
    var record = dailyRecords[i];
    var dateKey = normalizeKoreaDateKey(record.date);
    if (!dateKey) {
      continue;
    }

    var matchedUser = resolveUserFromDaily(
      record.user_id,
      record.nickname,
      lookup,
    );
    var uniqueKey = registeredParticipantKey(
      record.user_id,
      record.nickname,
      matchedUser ? matchedUser.email : "",
      lookup,
    );
    if (!uniqueKey) {
      continue;
    }

    for (var wi = 0; wi < recentWeeks.length; wi++) {
      var week = recentWeeks[wi];
      if (dateKey >= week.week_start && dateKey <= week.week_end) {
        week.keys[uniqueKey] = true;
      }
    }

    if (dateKey >= weekStart && dateKey <= weekEnd) {
      weekKeys[uniqueKey] = true;
      weeklyRecordCount += 1;

      var rituals = normalizeRitualItems(record.completed_rituals);
      for (var ri = 0; ri < rituals.length; ri++) {
        var ritualName = rituals[ri];
        ritualCounts[ritualName] = (ritualCounts[ritualName] || 0) + 1;
      }
    }
  }

  var totalUsers = lookup.total;
  var weeklyParticipants = Object.keys(weekKeys).length;
  if (totalUsers > 0 && weeklyParticipants > totalUsers) {
    weeklyParticipants = totalUsers;
  }
  if (totalUsers <= 0) {
    weeklyParticipants = 0;
  }

  var weeklyParticipationRate =
    totalUsers > 0
      ? clampPercent((weeklyParticipants / totalUsers) * 100)
      : 0;

  var topRituals = [];
  for (var ritualKey in ritualCounts) {
    if (Object.prototype.hasOwnProperty.call(ritualCounts, ritualKey)) {
      topRituals.push({
        name: ritualKey,
        count: ritualCounts[ritualKey],
      });
    }
  }
  topRituals.sort(function (a, b) {
    if (a.count !== b.count) {
      return b.count - a.count;
    }
    return String(a.name).localeCompare(String(b.name), "ko");
  });
  topRituals = topRituals.slice(0, 5);

  var recentWeekStats = [];
  for (var rw = 0; rw < recentWeeks.length; rw++) {
    var weekInfo = recentWeeks[rw];
    var participants = Object.keys(weekInfo.keys).length;
    if (totalUsers > 0 && participants > totalUsers) {
      participants = totalUsers;
    }
    if (totalUsers <= 0) {
      participants = 0;
    }
    recentWeekStats.push({
      week_start: weekInfo.week_start,
      week_end: weekInfo.week_end,
      participants: participants,
    });
  }

  return jsonResponse({
    success: true,
    data: {
      totalUsers: totalUsers,
      weeklyParticipants: weeklyParticipants,
      weeklyParticipationRate: weeklyParticipationRate,
      weeklyRecordCount: weeklyRecordCount,
      topRituals: topRituals,
      recentWeeks: recentWeekStats,
      today: today,
      week_start: weekStart,
      week_end: weekEnd,
    },
  });
}

function getRecentUsers(limit) {
  var usersResult = readUsers();
  if (usersResult.error || !usersResult.users) {
    return [];
  }

  var users = usersResult.users.slice();
  users.sort(function (a, b) {
    var aKey = a.created_at || "";
    var bKey = b.created_at || "";
    if (aKey < bKey) {
      return 1;
    }
    if (aKey > bKey) {
      return -1;
    }
    return 0;
  });

  return users.slice(0, limit || 3).map(function (user) {
    return {
      user_id: user.user_id,
      name: user.name,
      nickname: user.nickname,
      email: normalizeEmail(user.email),
      created_at: user.created_at,
    };
  });
}

function getAdminSummary() {
  var lookup = buildUserLookup();
  var today = getKoreaToday();
  var weekStart = getKoreaWeekStart(today);
  var weekEnd = addDaysToDateString(weekStart, 6);
  var dailyRecords = readAllDailyRecords();

  // Set: 등록 회원(Users)만, user_id 우선 중복 제거
  var todayKeys = {};
  var weekKeys = {};

  for (var i = 0; i < dailyRecords.length; i++) {
    var record = dailyRecords[i];
    // readAllDailyRecords와 동일한 KST 정규화 키 사용
    var dateKey = normalizeKoreaDateKey(record.date);
    if (!dateKey) {
      continue;
    }

    var matchedUser = resolveUserFromDaily(
      record.user_id,
      record.nickname,
      lookup,
    );
    var uniqueKey = registeredParticipantKey(
      record.user_id,
      record.nickname,
      matchedUser ? matchedUser.email : "",
      lookup,
    );
    if (!uniqueKey) {
      continue;
    }

    if (dateKey === today) {
      todayKeys[uniqueKey] = true;
    }

    if (dateKey >= weekStart && dateKey <= weekEnd) {
      weekKeys[uniqueKey] = true;
    }
  }

  // 이번 주 참여자 = Daily에 이번 주 기록을 남긴 등록 회원 수 (행 수 아님)

  var totalUsers = lookup.total;
  var weeklyParticipants = Object.keys(weekKeys).length;
  var todayWriters = Object.keys(todayKeys).length;

  // 안전장치: 전체 회원 수를 넘지 않음
  if (totalUsers > 0) {
    if (weeklyParticipants > totalUsers) {
      weeklyParticipants = totalUsers;
    }
    if (todayWriters > totalUsers) {
      todayWriters = totalUsers;
    }
  } else {
    weeklyParticipants = 0;
    todayWriters = 0;
  }

  var weeklyParticipationRate =
    totalUsers > 0
      ? clampPercent((weeklyParticipants / totalUsers) * 100)
      : 0;

  var unreadLetters = countUnreadLetters();
  var recentUsers = getRecentUsers(3);

  return jsonResponse({
    success: true,
    data: {
      total_members: totalUsers,
      today_breathers: todayWriters,
      week_participants: weeklyParticipants,
      unread_letters: unreadLetters,
      totalUsers: totalUsers,
      todayWriters: todayWriters,
      weeklyParticipants: weeklyParticipants,
      weeklyParticipationRate: weeklyParticipationRate,
      unreadLetters: unreadLetters,
      recentUsers: recentUsers,
      today: today,
      week_start: weekStart,
      week_end: weekEnd,
    },
  });
}

/**
 * 이번 주 Daily 기록이 없는 등록 회원 목록.
 * 가입 오래된 순(created_at 오름차순).
 */
function listInactiveThisWeek() {
  var usersResult = readUsers();
  if (usersResult.error) {
    return jsonResponse({ success: false, error: usersResult.error });
  }

  var lookup = buildUserLookup();
  var today = getKoreaToday();
  var weekStart = getKoreaWeekStart(today);
  var weekEnd = addDaysToDateString(weekStart, 6);
  var dailyRecords = readAllDailyRecords();
  var activeKeys = {};

  for (var i = 0; i < dailyRecords.length; i++) {
    var record = dailyRecords[i];
    var dateKey = normalizeKoreaDateKey(record.date);
    if (!dateKey || dateKey < weekStart || dateKey > weekEnd) {
      continue;
    }

    var matchedUser = resolveUserFromDaily(
      record.user_id,
      record.nickname,
      lookup,
    );
    var uniqueKey = registeredParticipantKey(
      record.user_id,
      record.nickname,
      matchedUser ? matchedUser.email : "",
      lookup,
    );
    if (uniqueKey) {
      activeKeys[uniqueKey] = true;
    }
  }

  var inactive = [];
  var users = usersResult.users || [];

  for (var u = 0; u < users.length; u++) {
    var user = users[u];
    var key = "";
    if (user.user_id) {
      key = "id:" + cellToString(user.user_id);
    } else if (user.email) {
      key = "email:" + normalizeEmail(user.email);
    }

    if (!key || activeKeys[key]) {
      continue;
    }

    inactive.push({
      user_id: user.user_id || "",
      name: user.name || "",
      nickname: user.nickname || "",
      email: normalizeEmail(user.email),
      created_at: user.created_at || "",
    });
  }

  inactive.sort(function (a, b) {
    var aKey = a.created_at || "";
    var bKey = b.created_at || "";
    var aValid = !!aKey && !isNaN(new Date(aKey).getTime());
    var bValid = !!bKey && !isNaN(new Date(bKey).getTime());

    // 가입일 없거나 잘못된 값은 맨 아래
    if (!aValid && !bValid) {
      return String(a.name).localeCompare(String(b.name), "ko");
    }
    if (!aValid) {
      return 1;
    }
    if (!bValid) {
      return -1;
    }
    // 오래된 순
    if (aKey < bKey) {
      return -1;
    }
    if (aKey > bKey) {
      return 1;
    }
    return String(a.name).localeCompare(String(b.name), "ko");
  });

  return jsonResponse({
    success: true,
    data: inactive,
    week_start: weekStart,
    week_end: weekEnd,
    today: today,
  });
}

function listUnreadLetters(limit) {
  var sheet;
  try {
    sheet = getOrCreateLettersSheet();
  } catch (error) {
    return jsonResponse({ success: true, data: [] });
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return jsonResponse({ success: true, data: [] });
  }

  var columnMap = buildLettersColumnMap(values[0]);
  var letters = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var letter = rowToLetter(row, columnMap);

    if (!letter.id && !letter.message) {
      continue;
    }

    if (cellToString(letter.read_at)) {
      continue;
    }

    letters.push(letter);
  }

  letters.sort(function (a, b) {
    var aKey = a.sent_at || "";
    var bKey = b.sent_at || "";
    if (aKey < bKey) {
      return 1;
    }
    if (aKey > bKey) {
      return -1;
    }
    return 0;
  });

  var max = limit || 100;
  return jsonResponse({
    success: true,
    data: letters.slice(0, max),
  });
}

function listDailyByDate(dateParam) {
  // 서버가 date를 주면 사용, 없으면 Asia/Seoul 오늘
  var targetDate = normalizeKoreaDateKey(dateParam) || getKoreaToday();

  var lookup = buildUserLookup();
  var dailyRecords = readAllDailyRecords();
  var results = [];

  for (var i = 0; i < dailyRecords.length; i++) {
    var record = dailyRecords[i];
    var recordDate = normalizeKoreaDateKey(record.date);
    if (!recordDate || recordDate !== targetDate) {
      continue;
    }

    var user = resolveUserFromDaily(record.user_id, record.nickname, lookup);

    results.push({
      timestamp: record.timestamp,
      user_id: record.user_id,
      name: user ? user.name : "",
      nickname: record.nickname || (user ? user.nickname : ""),
      email: user ? normalizeEmail(user.email) : "",
      date: recordDate,
      completed_rituals: record.completed_rituals,
      memo: record.memo,
    });
  }

  results.sort(function (a, b) {
    var aKey = a.timestamp || a.date || "";
    var bKey = b.timestamp || b.date || "";
    if (aKey < bKey) {
      return 1;
    }
    if (aKey > bKey) {
      return -1;
    }
    return 0;
  });

  return jsonResponse({
    success: true,
    data: results,
  });
}

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : "";

    if (action === "list_users") {
      return listUsers();
    }

    if (action === "get_member") {
      var email = e && e.parameter ? e.parameter.email : "";
      return getMemberDetail(email);
    }

    if (action === "list_letters" || action === "get_letters") {
      var letterEmail = e && e.parameter ? e.parameter.email : "";
      var limit = e && e.parameter && e.parameter.limit
        ? Number(e.parameter.limit)
        : 50;
      return listLetters(letterEmail, limit);
    }

    if (action === "admin_summary") {
      return getAdminSummary();
    }

    if (action === "admin_stats") {
      return getAdminStats();
    }

    if (action === "list_daily_by_date") {
      var date = e && e.parameter ? e.parameter.date : "";
      return listDailyByDate(date);
    }

    if (action === "list_unread_letters") {
      var unreadLimit =
        e && e.parameter && e.parameter.limit
          ? Number(e.parameter.limit)
          : 100;
      return listUnreadLetters(unreadLimit);
    }

    if (action === "get_admin_note") {
      var noteEmail = e && e.parameter ? e.parameter.email : "";
      return getAdminNote(noteEmail);
    }

    if (action === "list_inactive_this_week") {
      return listInactiveThisWeek();
    }

    return jsonResponse({
      success: false,
      error:
        "Unknown action. Use list_users, get_member, list_letters, get_letters, admin_summary, admin_stats, list_daily_by_date, list_unread_letters, get_admin_note, or list_inactive_this_week",
    });
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const type = body.type;
    const payload = body.payload || {};

    if (type === "signup") {
      var signupResult = signupUser(payload);
      if (!signupResult.success) {
        return jsonResponse({
          success: false,
          error: signupResult.error || "회원가입에 실패했습니다.",
        });
      }
      return jsonResponse({ success: true, data: signupResult.data });
    }

    if (type === "login") {
      var loginResult = loginUser(payload);
      if (!loginResult.success) {
        return jsonResponse({
          success: false,
          error: loginResult.error || "로그인에 실패했습니다.",
        });
      }
      return jsonResponse({ success: true, data: loginResult.data });
    }

    if (type === "reset_password") {
      var resetResult = resetPasswordUser(payload);
      if (!resetResult.success) {
        return jsonResponse({
          success: false,
          error: resetResult.error || "비밀번호 변경에 실패했습니다.",
        });
      }
      return jsonResponse({ success: true, data: resetResult.data });
    }

    if (type === "list_users") {
      return listUsers();
    }

    if (type === "get_member") {
      return getMemberDetail(payload.email || body.email || "");
    }

    if (type === "list_letters" || type === "get_letters") {
      return listLetters(
        payload.email || body.email || "",
        payload.limit || body.limit || 50,
      );
    }

    if (type === "admin_summary") {
      return getAdminSummary();
    }

    if (type === "admin_stats") {
      return getAdminStats();
    }

    if (type === "list_daily_by_date") {
      return listDailyByDate(payload.date || body.date || "");
    }

    if (type === "list_unread_letters") {
      return listUnreadLetters(payload.limit || body.limit || 100);
    }

    if (type === "create_letter") {
      return createLetter(payload);
    }

    if (type === "mark_letter_read" || type === "read_letter") {
      return markLetterRead(payload);
    }

    if (type === "get_admin_note") {
      return getAdminNote(payload.email || body.email || "");
    }

    if (type === "save_admin_note") {
      return saveAdminNote(payload);
    }

    if (type === "list_inactive_this_week") {
      return listInactiveThisWeek();
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = {
      user: "users",
      weekly_plan: "weekly_plan",
      daily_record: "daily_record",
    };
    const sheet = ss.getSheetByName(sheetName[type]);

    if (!sheet) {
      return ContentService.createTextOutput("Sheet not found").setMimeType(
        ContentService.MimeType.TEXT,
      );
    }

    if (type === "user") {
      var userResult = appendUserByHeader(payload);
      if (!userResult.success) {
        return jsonResponse({
          success: false,
          error: userResult.error || "회원 저장에 실패했습니다.",
        });
      }
      return jsonResponse({ success: true, data: userResult.data });
    } else if (type === "weekly_plan") {
      sheet.appendRow([
        payload.created_at,
        payload.user_id || payload.userId || "",
        payload.name,
        payload.nickname,
        payload.email,
        payload.week_start_date,
        formatRitualSlot(payload.ritual_1),
        formatRitualSlot(payload.ritual_2),
        formatRitualSlot(payload.ritual_3),
        formatRitualSlot(payload.ritual_4),
        formatRitualSlot(payload.ritual_5),
      ]);
    } else if (type === "daily_record") {
      const completedRituals = formatRituals(
        payload.completedRituals ||
          payload.rituals ||
          payload.checks ||
          payload.checkedItems ||
          payload.checked_rituals,
      );

      // YYYY-MM-DD 문자열로 저장해 Sheets Date→UTC 밀림을 줄입니다.
      var dailyDateKey =
        normalizeKoreaDateKey(payload.date) || getKoreaToday();

      sheet.appendRow([
        payload.timestamp ? new Date(payload.timestamp) : new Date(),
        payload.userId || payload.user_id || "",
        payload.nickname || "",
        dailyDateKey,
        completedRituals,
        payload.memo || payload.diary || payload.note || "",
      ]);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) });
  }
}
