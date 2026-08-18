import assert from 'node:assert/strict';
import test from 'node:test';
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

test('bumps semantic versions', () => {
  assert.equal(bumpVersion('0.6.0', 'patch'), '0.6.1');
  assert.equal(bumpVersion('0.6.0', 'minor'), '0.7.0');
  assert.equal(bumpVersion('0.6.0', 'major'), '1.0.0');
  assert.equal(bumpVersion('0.6.0', '0.7.0-beta.1'), '0.7.0-beta.1');
  assert.equal(isPrerelease('0.7.0-beta.1'), true);
});

test('updates every version-bearing json shape', () => {
  assert.equal(JSON.parse(setPackageVersion('{"version":"0.6.0"}', '0.6.1')).version, '0.6.1');
  const lock = JSON.parse(setLockVersion('{"version":"0.6.0","packages":{"":{"version":"0.6.0"}}}', '0.6.1'));
  assert.equal(lock.version, '0.6.1');
  assert.equal(lock.packages[''].version, '0.6.1');
  assert.equal(JSON.parse(setSampleVersion('{"app_version":"0.6.0"}', '0.6.1')).app_version, '0.6.1');
});

test('cuts unreleased notes into a dated release and extracts them', () => {
  const source = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Better releases.\n\n## [0.6.0]\n\n- Old.\n';
  const next = releaseChangelog(source, '0.6.1', '2026-08-18');
  assert.match(next, /## \[Unreleased\]\n\n## \[0\.6\.1\] - 2026-08-18/);
  assert.match(next, /## \[0\.6\.1\] - 2026-08-18\n\n### Added\n\n- Better releases\./);
  assert.match(extractNotes(next, '0.6.1'), /Better releases/);
  assert.doesNotMatch(extractNotes(next, '0.6.1'), /Old\./);
});

test('release checks catch drift', () => {
  const changelog = '# Changelog\n\n## [Unreleased]\n\n## [0.6.0]\n\n- Current release.\n';
  assert.deepEqual(checkRelease({
    packageVersion: '0.6.0',
    lockVersion: '0.6.0',
    lockRootVersion: '0.6.0',
    sampleVersion: '0.6.0',
    changelogText: changelog,
    tag: 'v0.6.0',
  }), []);
  assert.ok(checkRelease({
    packageVersion: '0.6.0',
    lockVersion: '0.5.0',
    lockRootVersion: '0.6.0',
    sampleVersion: '0.6.0',
    changelogText: changelog,
    tag: 'v0.6.1',
  }).length >= 2);
});
