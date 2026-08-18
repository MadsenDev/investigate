const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function bumpVersion(current, requested) {
  if (VERSION_RE.test(requested)) return requested;
  if (!['major', 'minor', 'patch'].includes(requested)) {
    throw new Error(`Unsupported release target: ${requested}`);
  }
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-.*)?$/.exec(current);
  if (!match) throw new Error(`Unsupported version format: ${current}`);
  let [major, minor, patch] = match.slice(1).map(Number);
  if (requested === 'major') {
    major += 1; minor = 0; patch = 0;
  } else if (requested === 'minor') {
    minor += 1; patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

export function isPrerelease(version) {
  return version.includes('-');
}

export function setPackageVersion(text, version) {
  const value = JSON.parse(text);
  value.version = version;
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function setLockVersion(text, version) {
  const value = JSON.parse(text);
  value.version = version;
  if (value.packages?.['']) value.packages[''].version = version;
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function setSampleVersion(text, version) {
  const value = JSON.parse(text);
  value.app_version = version;
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function releaseChangelog(text, version, date) {
  const marker = '## [Unreleased]';
  const at = text.indexOf(marker);
  if (at < 0) throw new Error('CHANGELOG.md has no [Unreleased] section.');
  const after = at + marker.length;
  const nextHeading = text.indexOf('\n## [', after);
  const unreleased = text.slice(after, nextHeading < 0 ? text.length : nextHeading).trim();
  if (!unreleased) throw new Error('CHANGELOG.md [Unreleased] is empty.');
  const suffix = nextHeading < 0 ? '' : text.slice(nextHeading);

  // Leave a fresh Unreleased section in place and move its previous contents
  // under the new dated release heading. The old implementation accidentally
  // left those notes above the new heading, producing an empty release section.
  return `${text.slice(0, after)}\n\n## [${version}] - ${date}\n\n${unreleased}${suffix}\n`;
}

export function extractNotes(text, version) {
  const heading = new RegExp(`^## \\[${version.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\](?: - \\d{4}-\\d{2}-\\d{2})?\\s*$`, 'm');
  const match = heading.exec(text);
  if (!match) throw new Error(`CHANGELOG.md has no section for ${version}.`);
  const start = match.index + match[0].length;
  const next = text.indexOf('\n## [', start);
  const notes = text.slice(start, next < 0 ? text.length : next).trim();
  if (!notes) throw new Error(`CHANGELOG.md section ${version} is empty.`);
  return notes;
}

export function checkRelease({ packageVersion, lockVersion, lockRootVersion, sampleVersion, changelogText, tag }) {
  const problems = [];
  if (!VERSION_RE.test(packageVersion)) problems.push(`package.json has invalid version ${packageVersion}`);
  if (lockVersion !== packageVersion) problems.push(`package-lock.json version ${lockVersion} != ${packageVersion}`);
  if (lockRootVersion !== packageVersion) problems.push(`package-lock root version ${lockRootVersion} != ${packageVersion}`);
  if (sampleVersion && sampleVersion !== packageVersion) problems.push(`sample manifest app_version ${sampleVersion} != ${packageVersion}`);
  if (!changelogText.includes('## [Unreleased]')) problems.push('CHANGELOG.md is missing [Unreleased]');
  const releasedHeading = new RegExp(`^## \\[${packageVersion.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\](?: - \\d{4}-\\d{2}-\\d{2})?\\s*$`, 'm');
  if (!releasedHeading.test(changelogText)) problems.push(`CHANGELOG.md has no release section for ${packageVersion}`);
  if (tag && tag !== `v${packageVersion}`) problems.push(`tag ${tag} != v${packageVersion}`);
  return problems;
}
