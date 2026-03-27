const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
import type { SSHConnectionConfig, LogEntry, LogFilter, CommandResult } from './types';

/**
  }
}

/**
 * Storage class for managing SQLite database
 */
export class Storage {
  private db: any;

  constructor(dbPath: string = path.join(process.cwd(), 'ssh_connections.db')) {
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  /**
   * Initialize database schema
   */
  private initDatabase(): void {
    // Connections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT,
        privateKey TEXT,
        privateKeyPath TEXT,
        passphrase TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);

    // Commands table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commands (
        commandId TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        command TEXT NOT NULL,
        status TEXT NOT NULL,
        exitCode INTEGER,
        startedAt INTEGER NOT NULL,
        completedAt INTEGER
      )
    `);

    // Logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commandId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        lineNumber INTEGER NOT NULL,
        content TEXT NOT NULL,
        stream TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (commandId) REFERENCES commands(commandId)
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_logs_commandId ON logs(commandId);
      CREATE INDEX IF NOT EXISTS idx_logs_sessionId ON logs(sessionId);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_commands_sessionId ON commands(sessionId);
    `);
  }

  /**
   * Save a new connection
   */
  saveConnection(config: SSHConnectionConfig): string {
    const id = config.id || crypto.randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO connections (id, name, host, port, username, password, privateKey, privateKeyPath, passphrase, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      config.name,
      config.host,
      config.port,
      config.username,
      config.password || null,
      config.privateKey || null,
      config.privateKeyPath || null,
      config.passphrase || null,
      now,
      now
    );

    return id;
  }

  /**
   * Get a connection by ID
   */
  getConnection(id: string): SSHConnectionConfig | null {
    const stmt = this.db.prepare('SELECT * FROM connections WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.password,
      privateKey: row.privateKey,
      privateKeyPath: row.privateKeyPath,
      passphrase: row.passphrase,
    };
  }

  /**
   * List all saved connections
   */
  listConnections(): SSHConnectionConfig[] {
    const stmt = this.db.prepare('SELECT * FROM connections ORDER BY updatedAt DESC');
    const rows = stmt.all();

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.password,
      privateKey: row.privateKey,
      privateKeyPath: row.privateKeyPath,
      passphrase: row.passphrase,
    }));
  }

  /**
   * Delete a connection
   */
  deleteConnection(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM connections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Save command execution
   */
  saveCommand(commandId: string, sessionId: string, command: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO commands (commandId, sessionId, command, status, startedAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(commandId, sessionId, command, 'running', Date.now());
  }

  /**
   * Update command status
   */
  updateCommandStatus(commandId: string, status: string, exitCode?: number): void {
    const stmt = this.db.prepare(`
      UPDATE commands
      SET status = ?, exitCode = ?, completedAt = ?
      WHERE commandId = ?
    `);

    stmt.run(status, exitCode || null, Date.now(), commandId);
  }

  /**
   * Get command status
   */
  getCommandStatus(commandId: string): CommandResult | null {
    const stmt = this.db.prepare('SELECT * FROM commands WHERE commandId = ?');
    const row = stmt.get(commandId);

    if (!row) return null;

    return {
      commandId: row.commandId,
      sessionId: row.sessionId,
      command: row.command,
      status: row.status,
      exitCode: row.exitCode,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  }

  /**
   * Save log line
   */
  saveLog(commandId: string, sessionId: string, lineNumber: number, content: string, stream: 'stdout' | 'stderr'): void {
    const stmt = this.db.prepare(`
      INSERT INTO logs (commandId, sessionId, lineNumber, content, stream, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(commandId, sessionId, lineNumber, content, stream, Date.now());
  }

  /**
   * Get logs with filtering
   */
  getLogs(filter: LogFilter): LogEntry[] {
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params: any[] = [];

    if (filter.commandId) {
      query += ' AND commandId = ?';
      params.push(filter.commandId);
    }

    if (filter.sessionId) {
      query += ' AND sessionId = ?';
      params.push(filter.sessionId);
    }

    if (filter.stream && filter.stream !== 'both') {
      query += ' AND stream = ?';
      params.push(filter.stream);
    }

    query += ' ORDER BY lineNumber ASC';

    const stmt = this.db.prepare(query);
    let logs: any[] = stmt.all(...params);

    // Apply grep filter
    if (filter.grep) {
      const regex = new RegExp(filter.grep, 'i');
      logs = logs.filter(log => regex.test(log.content));
    }

    // Apply line range filter
    if (filter.fromLine !== undefined && filter.toLine !== undefined) {
      const fromLine = filter.fromLine;
      const toLine = filter.toLine;
      logs = logs.filter(log => log.lineNumber >= fromLine && log.lineNumber <= toLine);
    } else if (filter.fromLine !== undefined) {
      const fromLine = filter.fromLine;
      logs = logs.filter(log => log.lineNumber >= fromLine);
    } else if (filter.toLine !== undefined) {
      const toLine = filter.toLine;
      logs = logs.filter(log => log.lineNumber <= toLine);
    }

    // Apply head filter
    if (filter.head !== undefined) {
      logs = logs.slice(0, filter.head);
    }

    // Apply tail filter
    if (filter.tail !== undefined) {
      logs = logs.slice(-filter.tail);
    }

    return logs.map((log: any) => ({
      id: log.id,
      commandId: log.commandId,
      sessionId: log.sessionId,
      lineNumber: log.lineNumber,
      content: log.content,
      stream: log.stream,
      timestamp: log.timestamp,
    }));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
