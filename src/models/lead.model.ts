import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";

export interface Lead {
  id: number;
  number: string;
  name: string;
  email: string;
  subtitle: string;
  status: "NUEVO" | "ATENDIDO" | "ARCHIVADO";
  created_at: Date | string;
}

export interface LeadInput {
  number?: string;
  name: string;
  email: string;
  subtitle: string;
  status?: "NUEVO" | "ATENDIDO" | "ARCHIVADO";
}

export async function findAllLeads(page = 1, limit = 50): Promise<{ rows: Lead[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM leads");
  const total = (countRows as { total: number }[])[0]?.total || 0;
  const [rows] = await pool.query("SELECT * FROM leads ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
  return { rows: rows as Lead[], total };
}

export async function findLeadById(id: number): Promise<Lead | undefined> {
  const [rows] = await pool.query("SELECT * FROM leads WHERE id = ? LIMIT 1", [id]);
  return (rows as Lead[])[0];
}

export async function createLead(data: LeadInput): Promise<number> {
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM leads");
  const currentTotal = (countRows as { total: number }[])[0]?.total || 0;
  const generatedNum = data.number || `[ LEAD-${String(currentTotal + 1).padStart(3, "0")} ]`;

  const [result] = await pool.query(
    "INSERT INTO leads (number, name, email, subtitle, status) VALUES (?, ?, ?, ?, ?)",
    [generatedNum, data.name, data.email, data.subtitle, data.status || "NUEVO"]
  );
  return (result as { insertId: number }).insertId;
}

export async function updateLeadStatus(id: number, status: "NUEVO" | "ATENDIDO" | "ARCHIVADO"): Promise<void> {
  await pool.query("UPDATE leads SET status = ? WHERE id = ?", [status, id]);
}

export async function deleteLead(id: number): Promise<void> {
  await pool.query("DELETE FROM leads WHERE id = ?", [id]);
}
