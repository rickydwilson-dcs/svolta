/**
 * Debug Alignment Log API
 *
 * Writes alignment debug entries to debug/alignment-log.json
 * Only available in development mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_FILE = 'debug/alignment-log.json';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug logging disabled in production' },
      { status: 403 }
    );
  }

  try {
    const entry = await request.json();

    // Validate entry has required fields
    if (!entry.timestamp || !entry.input || !entry.result) {
      return NextResponse.json(
        { error: 'Invalid log entry format' },
        { status: 400 }
      );
    }

    const logPath = path.join(process.cwd(), LOG_FILE);
    const logDir = path.dirname(logPath);

    // Ensure debug folder exists
    await fs.mkdir(logDir, { recursive: true });

    // Read existing logs or start with empty array
    let logs: unknown[] = [];
    try {
      const existing = await fs.readFile(logPath, 'utf-8');
      logs = JSON.parse(existing);
      if (!Array.isArray(logs)) {
        logs = [];
      }
    } catch {
      // File doesn't exist yet, start fresh
    }

    // Append new entry
    logs.push(entry);

    // Write back with pretty formatting
    await fs.writeFile(logPath, JSON.stringify(logs, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      entriesCount: logs.length,
      path: LOG_FILE,
    });
  } catch (error) {
    console.error('Failed to write alignment log:', error);
    return NextResponse.json(
      { error: 'Failed to write log entry' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug logging disabled in production' },
      { status: 403 }
    );
  }

  try {
    const logPath = path.join(process.cwd(), LOG_FILE);

    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const logs = JSON.parse(content);
      return NextResponse.json({
        success: true,
        entriesCount: Array.isArray(logs) ? logs.length : 0,
        logs,
      });
    } catch {
      return NextResponse.json({
        success: true,
        entriesCount: 0,
        logs: [],
        message: 'No log file exists yet',
      });
    }
  } catch (error) {
    console.error('Failed to read alignment log:', error);
    return NextResponse.json(
      { error: 'Failed to read log file' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug logging disabled in production' },
      { status: 403 }
    );
  }

  try {
    const logPath = path.join(process.cwd(), LOG_FILE);

    try {
      await fs.unlink(logPath);
      return NextResponse.json({
        success: true,
        message: 'Log file deleted',
      });
    } catch {
      return NextResponse.json({
        success: true,
        message: 'No log file to delete',
      });
    }
  } catch (error) {
    console.error('Failed to delete alignment log:', error);
    return NextResponse.json(
      { error: 'Failed to delete log file' },
      { status: 500 }
    );
  }
}
