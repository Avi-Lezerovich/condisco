// Publishes the built plugin (dist/condisco, from `npm run build:plugin`) to the `release` branch,
// which the marketplace in .claude-plugin/marketplace.json points at, then makes a GitHub release
// with the ZIP. Runs in CI after every push to main; does nothing unless plugin.json has a version
// the release branch does not have yet. Installed copies update only when the version changes.
//
// Env: PUBLISH_REMOTE (default "origin"), PUBLISH_BRANCH (default "release"),
//      GH_TOKEN (optional: without it the GitHub release step is skipped).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = path.join(ROOT, 'dist/condisco');
const REMOTE = process.env.PUBLISH_REMOTE || 'origin';
const BRANCH = process.env.PUBLISH_BRANCH || 'release';

const git = (args, opts = {}) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const tryGit = (args, opts) => { try { return git(args, opts); } catch { return null; } };

if (!fs.existsSync(path.join(BUILT, '.claude-plugin/plugin.json'))) {
  console.error('dist/condisco is missing. Run: npm run build:plugin');
  process.exit(1);
}
const { version } = JSON.parse(fs.readFileSync(path.join(BUILT, '.claude-plugin/plugin.json'), 'utf8'));
const source = git(['rev-parse', 'HEAD']);

const exists = tryGit(['fetch', '--no-tags', '--depth=1', REMOTE, `+refs/heads/${BRANCH}:refs/remotes/${REMOTE}/${BRANCH}`]) !== null;
if (exists) {
  const raw = tryGit(['show', `${REMOTE}/${BRANCH}:.claude-plugin/plugin.json`]);
  const published = raw ? JSON.parse(raw).version : null;
  if (published === version) {
    console.log(`${BRANCH} already has ${version}: nothing to publish. Raise the version to release (node scripts/bump-version.mjs X.Y.Z).`);
    process.exit(0);
  }
  console.log(`publishing ${version} (the ${BRANCH} branch has ${published})`);
} else console.log(`publishing ${version} (creating the ${BRANCH} branch)`);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'condisco-release-'));
try {
  if (exists) git(['worktree', 'add', '--detach', work, `${REMOTE}/${BRANCH}`]);
  else {
    git(['worktree', 'add', '--detach', work, 'HEAD']);
    git(['checkout', '--orphan', BRANCH], { cwd: work });
  }
  // Replace everything with the built plugin, so files removed from the plugin disappear too.
  for (const f of fs.readdirSync(work)) if (f !== '.git') fs.rmSync(path.join(work, f), { recursive: true, force: true });
  fs.cpSync(BUILT, work, { recursive: true });
  git(['add', '-A'], { cwd: work });
  const id = ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];
  git([...id, 'commit', '-q', '-m', `Condisco ${version}\n\nBuilt from ${source} by scripts/publish-release.mjs.`], { cwd: work });
  git(['push', REMOTE, `HEAD:refs/heads/${BRANCH}`], { cwd: work });
  console.log(`pushed ${version} to ${REMOTE}/${BRANCH} (${git(['rev-parse', '--short', 'HEAD'], { cwd: work })})`);
} finally {
  tryGit(['worktree', 'remove', '--force', work]);
  fs.rmSync(work, { recursive: true, force: true });
}

// GitHub release with the ZIP, for students who install by upload. Skipped locally (no token)
// and when the tag already exists (for example a release made by hand).
if (!process.env.GH_TOKEN) { console.log('no GH_TOKEN: skipping the GitHub release'); process.exit(0); }
const tag = `v${version}`;
const zip = path.join(ROOT, `dist/condisco-${version}.zip`);
const gh = (args) => execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try { gh(['release', 'view', tag]); console.log(`release ${tag} already exists`); process.exit(0); } catch { /* not there yet */ }

const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
const section = changelog.split(/\n(?=## \[)/).find((s) => s.startsWith(`## [${version}]`));
const notes = (section ? section.split('\n').slice(1).join('\n').trim() + '\n\n' : '')
  + 'Install from the marketplace (updates arrive by themselves): in claude.ai, Customize > Plugins > Add > Add marketplace, enter `Avi-Lezerovich/condisco`, then install Condisco.\n'
  + `Or upload \`condisco-${version}.zip\` (no automatic updates).`;
const notesFile = path.join(os.tmpdir(), `condisco-notes-${version}.md`);
fs.writeFileSync(notesFile, notes);
gh(['release', 'create', tag, zip, '--target', source, '--title', `Condisco ${version}`, '--notes-file', notesFile]);
console.log(`created release ${tag}`);
