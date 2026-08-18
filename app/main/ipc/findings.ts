import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import type { AssertionRecord, FindingRecord, FindingStatus } from '../../../shared/types';
import type { DbConnection } from '../persistence/database';
import type { ProjectManager } from '../projectManager';

type FindingRow = Omit<FindingRecord, 'assertion_ids'>;
type AssertionBundleRow = Pick<
  AssertionRecord,
  | 'id'
  | 'subject_kind'
  | 'subject_id'
  | 'path'
  | 'value_json'
  | 'source_id'
  | 'confidence'
  | 'review_state'
  | 'review_note'
  | 'reviewed_by'
  | 'reviewed_at'
  | 'created_at'
>;

type FindingCreatePayload = {
  title: string;
  body?: string;
  assertion_ids?: string[];
};

type FindingUpdatePayload = Partial<Pick<FindingRecord, 'title' | 'body' | 'status' | 'assertion_ids'>>;

const VALID_STATUSES = new Set<FindingStatus>(['draft', 'reviewed', 'disputed', 'withdrawn']);

function normalizeAssertionIds(db: DbConnection, ids: string[] | undefined): string[] {
  const unique = Array.from(new Set((ids ?? []).filter(Boolean)));
  if (unique.length === 0) return [];
  const exists = db.prepare('SELECT 1 FROM assertion WHERE id = ? LIMIT 1');
  for (const id of unique) {
    if (!exists.get(id)) throw new Error(`Assertion does not exist: ${id}`);
  }
  return unique;
}

function replaceFindingAssertions(db: DbConnection, findingId: string, assertionIds: string[]) {
  db.prepare('DELETE FROM finding_assertion WHERE finding_id = ?').run(findingId);
  const insert = db.prepare(
    'INSERT INTO finding_assertion (finding_id, assertion_id, position) VALUES (?, ?, ?)'
  );
  assertionIds.forEach((assertionId, index) => insert.run(findingId, assertionId, index));
}

function listFindingAssertionIds(db: DbConnection, findingId: string): string[] {
  return (db.prepare(
    'SELECT assertion_id FROM finding_assertion WHERE finding_id = ? ORDER BY position ASC, assertion_id ASC'
  ).all(findingId) as Array<{ assertion_id: string }>).map((item) => item.assertion_id);
}

function assertReviewable(db: DbConnection, assertionIds: string[]) {
  if (assertionIds.length === 0) throw new Error('A reviewed finding must link at least one assertion');
  const read = db.prepare(
    `SELECT a.review_state, a.source_id, s.id AS resolved_source_id
     FROM assertion a
     LEFT JOIN source s ON s.id = a.source_id
     WHERE a.id = ?`
  );
  for (const assertionId of assertionIds) {
    const row = read.get(assertionId) as { review_state: string; source_id: string; resolved_source_id: string | null } | undefined;
    if (!row) throw new Error(`Assertion does not exist: ${assertionId}`);
    if (row.review_state !== 'accepted') throw new Error('All assertions supporting a reviewed finding must be accepted');
    if (!row.source_id || !row.resolved_source_id) throw new Error('All assertions supporting a reviewed finding must resolve to evidence');
  }
}

function listFindings(db: DbConnection): FindingRecord[] {
  const rows = db.prepare(
    'SELECT id, title, body, status, created_at, updated_at FROM finding ORDER BY updated_at DESC, id ASC'
  ).all() as FindingRow[];
  return rows.map((row) => ({
    ...row,
    assertion_ids: listFindingAssertionIds(db, row.id)
  }));
}

function recordFindingAudit(db: DbConnection, findingId: string, action: string, reason: string | null = null) {
  db.prepare(
    `INSERT INTO audit (id, action, subject_kind, subject_id, actor, reason, transform_run_id, created_at)
     VALUES (?, ?, 'finding', ?, 'user', ?, NULL, ?)`
  ).run(randomUUID(), action, findingId, reason, Math.floor(Date.now() / 1000));
}

function findingBundle(db: DbConnection, projectManager: ProjectManager) {
  const findings = listFindings(db).filter((finding) => finding.status === 'reviewed');
  const assertionById = new Map(
    (db.prepare(
      `SELECT id, subject_kind, subject_id, path, value_json, source_id, confidence, review_state,
              review_note, reviewed_by, reviewed_at, created_at
       FROM assertion ORDER BY id ASC`
    ).all() as AssertionBundleRow[]).map((row) => [row.id, row])
  );
  const sourceById = new Map(
    (db.prepare(
      `SELECT id, kind, locator, title, added_at, hash, mime, folder_path, file_name, display_name,
              file_size, modified_at FROM source ORDER BY id ASC`
    ).all() as Array<Record<string, unknown>>).map((row) => [String(row.id), row])
  );

  const bundleFindings = findings.map((finding) => {
    assertReviewable(db, finding.assertion_ids);
    const assertions = finding.assertion_ids
      .map((id) => assertionById.get(id))
      .filter((value): value is AssertionBundleRow => Boolean(value))
      .map((assertion) => ({
        ...assertion,
        value: (() => {
          try { return JSON.parse(assertion.value_json || '{}') as unknown; } catch { return {}; }
        })(),
        value_json: undefined,
        source: sourceById.get(assertion.source_id) ?? null
      }));
    return { ...finding, assertions };
  });

  const sourceIds = new Set<string>();
  for (const finding of bundleFindings) {
    for (const assertion of finding.assertions) {
      if (assertion.source_id) sourceIds.add(assertion.source_id);
    }
  }
  const sources = Array.from(sourceIds).sort().map((id) => sourceById.get(id)).filter(Boolean);
  return {
    format: 'vitni-findings-evidence-v1',
    case: {
      id: projectManager.getManifest().id,
      name: projectManager.getManifest().name
    },
    findings: bundleFindings,
    sources
  };
}

function markdownForBundle(bundle: ReturnType<typeof findingBundle>): string {
  const lines: string[] = [
    `# ${bundle.case.name} — Findings & Evidence`,
    '',
    `Case ID: \`${bundle.case.id}\``,
    '',
    'This export is deterministic case provenance. Findings are included only when their status is `reviewed`.',
    ''
  ];
  bundle.findings.forEach((finding, findingIndex) => {
    lines.push(`## F${findingIndex + 1}. ${finding.title}`, '', finding.body || '_No narrative recorded._', '');
    lines.push('### Supporting assertions', '');
    finding.assertions.forEach((assertion, assertionIndex) => {
      const source = assertion.source as Record<string, unknown> | null;
      lines.push(
        `${assertionIndex + 1}. **${assertion.path}** — ${JSON.stringify(assertion.value)}`,
        `   - Assertion ID: \`${assertion.id}\``,
        `   - Review: ${assertion.review_state} · Confidence: ${assertion.confidence}`,
        source
          ? `   - Source: ${String(source.title || source.display_name || source.file_name || source.locator)} (\`${String(source.id)}\`)`
          : '   - Source: **missing**',
        ''
      );
    });
  });
  lines.push('## Evidence appendix', '');
  if (bundle.sources.length === 0) lines.push('_No cited sources._', '');
  bundle.sources.forEach((source, index) => {
    const item = source as Record<string, unknown>;
    lines.push(
      `${index + 1}. **${String(item.title || item.display_name || item.file_name || item.locator)}**`,
      `   - ID: \`${String(item.id)}\``,
      `   - Kind: ${String(item.kind)}`,
      `   - Locator: ${String(item.locator)}`,
      item.hash ? `   - SHA/hash: \`${String(item.hash)}\`` : '   - SHA/hash: not recorded',
      ''
    );
  });
  return `${lines.join('\n').trim()}\n`;
}

export async function writeFindingsEvidenceBundle(
  db: DbConnection,
  projectManager: ProjectManager,
  outputDir: string
): Promise<{ findingCount: number; sourceCount: number }> {
  const bundle = findingBundle(db, projectManager);
  await fsp.mkdir(outputDir, { recursive: true });
  await fsp.writeFile(path.join(outputDir, 'findings-evidence.json'), `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  await fsp.writeFile(path.join(outputDir, 'findings-evidence.md'), markdownForBundle(bundle), 'utf8');
  return { findingCount: bundle.findings.length, sourceCount: bundle.sources.length };
}

export function registerFindingHandlers(ipcMain: IpcMain, projectManager: ProjectManager) {
  ipcMain.handle('db:findings:list', () => listFindings(projectManager.getDatabase()));

  ipcMain.handle('db:finding:create', (_event, payload: FindingCreatePayload) => {
    const db = projectManager.getDatabase();
    const title = payload.title.trim();
    if (!title) throw new Error('Finding title is required');
    const assertionIds = normalizeAssertionIds(db, payload.assertion_ids);
    const now = Math.floor(Date.now() / 1000);
    const id = randomUUID();
    const create = db.transaction(() => {
      db.prepare(
        'INSERT INTO finding (id, title, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, title, payload.body?.trim() ?? '', 'draft', now, now);
      replaceFindingAssertions(db, id, assertionIds);
      recordFindingAudit(db, id, 'finding.create', assertionIds.length ? `${assertionIds.length} supporting assertion(s)` : null);
    });
    create();
    return id;
  });

  ipcMain.handle('db:finding:update', (_event, findingId: string, updates: FindingUpdatePayload) => {
    const db = projectManager.getDatabase();
    const current = db.prepare('SELECT title, body, status FROM finding WHERE id = ? LIMIT 1').get(findingId) as Pick<FindingRow, 'title' | 'body' | 'status'> | undefined;
    if (!current) throw new Error(`Finding does not exist: ${findingId}`);
    if (updates.status && !VALID_STATUSES.has(updates.status)) throw new Error('Invalid finding status');
    if (updates.title !== undefined && !updates.title.trim()) throw new Error('Finding title is required');
    const assertionIds = updates.assertion_ids === undefined ? null : normalizeAssertionIds(db, updates.assertion_ids);
    const effectiveAssertionIds = assertionIds ?? listFindingAssertionIds(db, findingId);
    const effectiveStatus = updates.status ?? current.status;
    if (effectiveStatus === 'reviewed') assertReviewable(db, effectiveAssertionIds);
    const update = db.transaction(() => {
      db.prepare(
        'UPDATE finding SET title = ?, body = ?, status = ?, updated_at = ? WHERE id = ?'
      ).run(
        updates.title?.trim() ?? current.title,
        updates.body?.trim() ?? current.body,
        effectiveStatus,
        Math.floor(Date.now() / 1000),
        findingId
      );
      if (assertionIds) replaceFindingAssertions(db, findingId, assertionIds);
      const reasons: string[] = [];
      if (updates.status) reasons.push(`status=${updates.status}`);
      if (assertionIds) reasons.push(`assertions=${assertionIds.length}`);
      if (updates.title !== undefined) reasons.push('title updated');
      if (updates.body !== undefined) reasons.push('body updated');
      recordFindingAudit(db, findingId, 'finding.update', reasons.join(', ') || null);
    });
    update();
    return true;
  });

  ipcMain.handle('db:finding:delete', (_event, findingId: string) => {
    const db = projectManager.getDatabase();
    const existing = db.prepare('SELECT title FROM finding WHERE id = ?').get(findingId) as { title: string } | undefined;
    if (!existing) return false;
    recordFindingAudit(db, findingId, 'finding.delete', existing.title);
    const result = db.prepare('DELETE FROM finding WHERE id = ?').run(findingId);
    return result.changes > 0;
  });

  ipcMain.handle('report:findings:export-bundle', async () => {
    const db = projectManager.getDatabase();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(projectManager.getRoot(), projectManager.getManifest().paths.exports, `findings-evidence-${stamp}`);
    const result = await writeFindingsEvidenceBundle(db, projectManager, outputDir);
    db.prepare(
      `INSERT INTO audit (id, action, subject_kind, subject_id, actor, reason, transform_run_id, created_at)
       VALUES (?, 'findings.export', 'case', ?, 'user', ?, NULL, ?)`
    ).run(randomUUID(), projectManager.getManifest().id, `${result.findingCount} finding(s), ${result.sourceCount} source(s)`, Math.floor(Date.now() / 1000));
    return { outputDir, ...result };
  });
}
