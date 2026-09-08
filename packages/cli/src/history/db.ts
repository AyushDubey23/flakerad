import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { DatabaseSync } from 'node:sqlite'
import { HistoryEntry } from '../types.js'

const require = createRequire(import.meta.url)

export interface FlakeradDB {
  insertRun(entry: Omit<HistoryEntry, 'id'>): void
  getRecent(limit?: number): HistoryEntry[]
  getAll(): HistoryEntry[]
  close(): void
}

export function openDatabase(dbDirectory = path.join(process.cwd(), '.flakerad')): FlakeradDB {
  if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true })
  }
  const dbPath = path.join(dbDirectory, 'history.db')

  // Try better-sqlite3 first, fallback to native node:sqlite
  try {
    const Database = require('better-sqlite3')
    const db = new Database(dbPath)

    db.exec(`
      CREATE TABLE IF NOT EXISTS test_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        testPattern TEXT NOT NULL,
        testPath TEXT NOT NULL,
        attributedCause TEXT NOT NULL,
        confidence REAL NOT NULL,
        baselineFailureRate REAL NOT NULL,
        seedFailureRate REAL NOT NULL,
        clockFailureRate REAL NOT NULL,
        orderFailureRate REAL NOT NULL,
        detailsJson TEXT NOT NULL
      )
    `)

    return {
      insertRun(entry: Omit<HistoryEntry, 'id'>) {
        const stmt = db.prepare(`
          INSERT INTO test_history (
            timestamp, testPattern, testPath, attributedCause, confidence,
            baselineFailureRate, seedFailureRate, clockFailureRate, orderFailureRate, detailsJson
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        stmt.run(
          entry.timestamp,
          entry.testPattern,
          entry.testPath,
          entry.attributedCause,
          entry.confidence,
          entry.baselineFailureRate,
          entry.seedFailureRate,
          entry.clockFailureRate,
          entry.orderFailureRate,
          entry.detailsJson
        )
      },
      getRecent(limit = 20): HistoryEntry[] {
        const stmt = db.prepare(`SELECT * FROM test_history ORDER BY id DESC LIMIT ?`)
        return stmt.all(limit) as HistoryEntry[]
      },
      getAll(): HistoryEntry[] {
        const stmt = db.prepare(`SELECT * FROM test_history ORDER BY id DESC`)
        return stmt.all() as HistoryEntry[]
      },
      close() {
        db.close()
      }
    }
  } catch {
    // Native Node 22.5+ SQLite
    const db = new DatabaseSync(dbPath)

    db.exec(`
      CREATE TABLE IF NOT EXISTS test_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        testPattern TEXT NOT NULL,
        testPath TEXT NOT NULL,
        attributedCause TEXT NOT NULL,
        confidence REAL NOT NULL,
        baselineFailureRate REAL NOT NULL,
        seedFailureRate REAL NOT NULL,
        clockFailureRate REAL NOT NULL,
        orderFailureRate REAL NOT NULL,
        detailsJson TEXT NOT NULL
      )
    `)

    return {
      insertRun(entry: Omit<HistoryEntry, 'id'>) {
        const stmt = db.prepare(`
          INSERT INTO test_history (
            timestamp, testPattern, testPath, attributedCause, confidence,
            baselineFailureRate, seedFailureRate, clockFailureRate, orderFailureRate, detailsJson
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        stmt.run(
          entry.timestamp,
          entry.testPattern,
          entry.testPath,
          entry.attributedCause,
          entry.confidence,
          entry.baselineFailureRate,
          entry.seedFailureRate,
          entry.clockFailureRate,
          entry.orderFailureRate,
          entry.detailsJson
        )
      },
      getRecent(limit = 20): HistoryEntry[] {
        const stmt = db.prepare(`SELECT * FROM test_history ORDER BY id DESC LIMIT ?`)
        return stmt.all(limit) as unknown as HistoryEntry[]
      },
      getAll(): HistoryEntry[] {
        const stmt = db.prepare(`SELECT * FROM test_history ORDER BY id DESC`)
        return stmt.all() as unknown as HistoryEntry[]
      },
      close() {
        db.close()
      }
    }
  }
}
