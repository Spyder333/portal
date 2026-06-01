// Local offline SQLite database powered by sql.js (WASM).
// The full database is loaded into memory at startup and persisted
// to IndexedDB after every write so it survives app restarts.
// In an Electron build, IndexedDB is provided by Chromium and lives
// inside the app's user data folder — so the data stays on the PC.

import initSqlJs, { Database, SqlJsStatic } from "sql.js";
// Vite will emit the wasm file and give us a URL to it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - virtual ?url import
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { get as idbGet, set as idbSet } from "idb-keyval";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const DB_KEY = "fees_approval_sqlite_db_v1";

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  school_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fee_approval_requests (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  school_name TEXT NOT NULL,
  term TEXT NOT NULL,
  year INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  number_of_students INTEGER NOT NULL,
  fee_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  accountant_approved_at TEXT,
  accountant_approved_by TEXT,
  accountant_comments TEXT,
  director_approved_at TEXT,
  director_approved_by TEXT,
  director_comments TEXT,
  final_approved_at TEXT,
  final_approved_by TEXT,
  final_comments TEXT,
  rejected_at TEXT,
  rejected_by TEXT,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS request_documents (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_school ON fee_approval_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON fee_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_documents_request ON request_documents(request_id);
`;

async function persist() {
  if (!db) return;
  const data = db.export();
  await idbSet(DB_KEY, data);
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!SQL) {
      SQL = await initSqlJs({ locateFile: () => wasmUrl as string });
    }
    const saved = (await idbGet(DB_KEY)) as Uint8Array | undefined;
    db = saved ? new SQL.Database(saved) : new SQL.Database();
    db.exec(SCHEMA);
    if (!saved) await persist();
    return db;
  })();

  return initPromise;
}

// ---------- Helpers ----------

function rowsToObjects<T = any>(database: Database, sql: string, params: any[] = []): T[] {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const out: T[] = [];
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}

// ---------- User / Auth API ----------

export type UserRole = "school" | "chief_accountant" | "director" | "permanent_secretary";

export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  school_name: string | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  school_name?: string;
}

export async function signUp(input: SignUpInput): Promise<LocalUser> {
  const database = await getDb();
  const email = input.email.trim().toLowerCase();
  const existing = rowsToObjects(database, "SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) throw new Error("An account with this email already exists.");

  const hash = bcrypt.hashSync(input.password, 10);
  const id = uuidv4();
  database.run(
    `INSERT INTO users (id, email, password_hash, full_name, role, school_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, email, hash, input.full_name, input.role, input.school_name ?? null]
  );
  await persist();
  return { id, email, full_name: input.full_name, role: input.role, school_name: input.school_name ?? null };
}

export async function login(email: string, password: string): Promise<LocalUser> {
  const database = await getDb();
  const rows = rowsToObjects<any>(
    database,
    "SELECT * FROM users WHERE email = ?",
    [email.trim().toLowerCase()]
  );
  if (rows.length === 0) throw new Error("Invalid email or password.");
  const row = rows[0];
  if (!bcrypt.compareSync(password, row.password_hash)) {
    throw new Error("Invalid email or password.");
  }
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    school_name: row.school_name,
  };
}

// ---------- Fee request API ----------

export interface FeeRequest {
  id: string;
  school_id: string;
  school_name: string;
  term: string;
  year: number;
  total_amount: number;
  number_of_students: number;
  fee_type: string;
  description: string | null;
  status: string;
  submitted_at: string;
  accountant_approved_at: string | null;
  accountant_approved_by: string | null;
  accountant_comments: string | null;
  director_approved_at: string | null;
  director_approved_by: string | null;
  director_comments: string | null;
  final_approved_at: string | null;
  final_approved_by: string | null;
  final_comments: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
}

export interface CreateRequestInput {
  school_id: string;
  school_name: string;
  term: string;
  year: number;
  total_amount: number;
  number_of_students: number;
  fee_type: string;
  description: string;
}

export async function createRequest(input: CreateRequestInput): Promise<string> {
  const database = await getDb();
  const id = uuidv4();
  database.run(
    `INSERT INTO fee_approval_requests
     (id, school_id, school_name, term, year, total_amount, number_of_students, fee_type, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id,
      input.school_id,
      input.school_name,
      input.term,
      input.year,
      input.total_amount,
      input.number_of_students,
      input.fee_type,
      input.description,
    ]
  );
  await persist();
  return id;
}

export async function listRequestsForSchool(schoolId: string): Promise<FeeRequest[]> {
  const database = await getDb();
  return rowsToObjects<FeeRequest>(
    database,
    "SELECT * FROM fee_approval_requests WHERE school_id = ? ORDER BY submitted_at DESC",
    [schoolId]
  );
}

export async function listAllRequests(): Promise<FeeRequest[]> {
  const database = await getDb();
  return rowsToObjects<FeeRequest>(
    database,
    "SELECT * FROM fee_approval_requests ORDER BY submitted_at DESC"
  );
}

export async function getRequest(id: string): Promise<FeeRequest | null> {
  const database = await getDb();
  const rows = rowsToObjects<FeeRequest>(
    database,
    "SELECT * FROM fee_approval_requests WHERE id = ?",
    [id]
  );
  return rows[0] ?? null;
}

function nowIso() {
  return new Date().toISOString();
}

export async function accountantApprove(id: string, userId: string, comments: string) {
  const database = await getDb();
  database.run(
    `UPDATE fee_approval_requests
     SET status='approved_by_accountant', accountant_approved_at=?, accountant_approved_by=?, accountant_comments=?
     WHERE id=? AND status='pending'`,
    [nowIso(), userId, comments, id]
  );
  await persist();
}

export async function directorApprove(id: string, userId: string, comments: string) {
  const database = await getDb();
  database.run(
    `UPDATE fee_approval_requests
     SET status='approved_by_director', director_approved_at=?, director_approved_by=?, director_comments=?
     WHERE id=? AND status='approved_by_accountant'`,
    [nowIso(), userId, comments, id]
  );
  await persist();
}

export async function secretaryApprove(id: string, userId: string, comments: string) {
  const database = await getDb();
  database.run(
    `UPDATE fee_approval_requests
     SET status='approved', final_approved_at=?, final_approved_by=?, final_comments=?
     WHERE id=? AND status='approved_by_director'`,
    [nowIso(), userId, comments, id]
  );
  await persist();
}

export async function rejectRequest(id: string, userId: string, reason: string) {
  const database = await getDb();
  database.run(
    `UPDATE fee_approval_requests
     SET status='rejected', rejected_at=?, rejected_by=?, rejection_reason=?
     WHERE id=?`,
    [nowIso(), userId, reason, id]
  );
  await persist();
}

// ---------- Documents API ----------

export interface RequestDocument {
  id: string;
  request_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface RequestDocumentWithData extends RequestDocument {
  data_base64: string;
}

export async function addDocument(
  requestId: string,
  file: File
): Promise<RequestDocument> {
  const database = await getDb();
  const id = uuidv4();
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
  const base64 = btoa(binary);
  database.run(
    `INSERT INTO request_documents (id, request_id, file_name, mime_type, size_bytes, data_base64)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, requestId, file.name, file.type || "application/octet-stream", file.size, base64]
  );
  await persist();
  return {
    id,
    request_id: requestId,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    uploaded_at: nowIso(),
  };
}

export async function listDocuments(requestId: string): Promise<RequestDocument[]> {
  const database = await getDb();
  return rowsToObjects<RequestDocument>(
    database,
    `SELECT id, request_id, file_name, mime_type, size_bytes, uploaded_at
     FROM request_documents WHERE request_id = ? ORDER BY uploaded_at ASC`,
    [requestId]
  );
}

export async function getDocumentData(id: string): Promise<RequestDocumentWithData | null> {
  const database = await getDb();
  const rows = rowsToObjects<RequestDocumentWithData>(
    database,
    `SELECT * FROM request_documents WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export function downloadDocument(doc: RequestDocumentWithData) {
  const byteString = atob(doc.data_base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
  const blob = new Blob([bytes], { type: doc.mime_type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.file_name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- UI helpers ----------

export const ROLE_NAMES: Record<UserRole, string> = {
  school: "School",
  chief_accountant: "Chief Accountant (Revenue)",
  director: "Director",
  permanent_secretary: "Permanent Secretary",
};

export function getStatusBadgeVariant(status: string): any {
  switch (status) {
    case "pending":
      return "warning";
    case "approved_by_accountant":
    case "approved_by_director":
      return "default";
    case "approved":
      return "success";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending Review",
    approved_by_accountant: "Approved by Accountant",
    approved_by_director: "Approved by Director",
    approved: "Final Approval",
    rejected: "Rejected",
  };
  return labels[status] || status;
}
