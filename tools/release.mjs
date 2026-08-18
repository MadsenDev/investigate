#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bumpVersion,
  checkRelease,
  extractNotes,
  isPrerelease,
  releaseChangelog,
  setLockVersion,
  setPackageVersion,
  setSampleVersion,
} from './release-core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
  pkg: join(ROOT, 'package.json'),
  lock: join(ROOT, 'package-lock.json'),
  changelog: join(ROOT, 'CHANGELOG.md'),
  sample: join(ROOT, 'samples', 'operation-glass-harbor.vitni', 'manifest.json'),
};

const read = (file) => readFileSync(file, 'utf8');
const parseArgs = (argv) => {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) positional.push(arg);
    else {
      const [name, inline] = arg.slice(2).split('=');
      if (inline !== undefined) flags[name] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[name] = argv[(i += 1)];
      else flags[name] = 'true';
    }
  }
  return { positional, flags };
};
const emit = (values) => {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `${Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n')}\n`);
};
const currentVersion = () => JSON.parse(read(FILES.pkg)).version;
const today = () => new Date().toISOString().slice(0, 10);

function commandCheck(flags) {
  const pkg = JSON.parse(read(FILES.pkg));
  const lock = JSON.parse(read(FILES.lock));
  const sample = existsSync(FILES.sample) ? JSON.parse(read(FILES.sample)) : null;
  const tag = flags.tag && flags.tag !== 'true' ? flags.tag : null;
  const problems = checkRelease({
    packageVersion: pkg.version,
    lockVersion: lock.version,
    lockRootVersion: lock.packages?.['']?.version,
    sampleVersion: sample?.app_version,
    changelogText: read(FILES.changelog),
    tag,
  });
  if (problems.length) {
    console.error(`Release metadata is inconsistent (${problems.length} problem(s)):\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Release metadata is consistent at ${pkg.version}${tag ? ` (${tag})` : ''}.`);
  emit({ version: pkg.version, tag: `v${pkg.version}`, prerelease: String(isPrerelease(pkg.version)) });
}

function commandPrepare(positional, flags) {
  const target = positional[0];
  if (!target) throw new Error('Usage: node tools/release.mjs prepare <major|minor|patch|X.Y.Z>');
  const from = currentVersion();
  const version = bumpVersion(from, target);
  const date = flags.date && flags.date !== 'true' ? flags.date : today();
  const changelog = releaseChangelog(read(FILES.changelog), version, date);
  const pkg = setPackageVersion(read(FILES.pkg), version);
  const lock = setLockVersion(read(FILES.lock), version);
  const sample = existsSync(FILES.sample) ? setSampleVersion(read(FILES.sample), version) : null;
  writeFileSync(FILES.changelog, changelog);
  writeFileSync(FILES.pkg, pkg);
  writeFileSync(FILES.lock, lock);
  if (sample != null) writeFileSync(FILES.sample, sample);
  console.log(`Prepared ${from} -> ${version} (${date})`);
  emit({ version, previous: from, tag: `v${version}`, branch: `release/v${version}`, date, prerelease: String(isPrerelease(version)) });
}

function commandNotes(flags) {
  const version = flags.version && flags.version !== 'true' ? flags.version.replace(/^v/, '') : currentVersion();
  const notes = extractNotes(read(FILES.changelog), version);
  if (flags.out && flags.out !== 'true') writeFileSync(join(ROOT, flags.out), `${notes}\n`);
  else console.log(notes);
}

try {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional.shift() ?? 'check';
  if (command === 'check') commandCheck(flags);
  else if (command === 'prepare') commandPrepare(positional, flags);
  else if (command === 'notes') commandNotes(flags);
  else if (command === 'version') console.log(currentVersion());
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
