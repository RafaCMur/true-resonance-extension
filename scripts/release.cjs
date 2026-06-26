const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: npm run release -- X.Y.Z');
  process.exit(1);
}

const tagName = `v${version}`;
const zipName = `true-resonance-${version}.zip`;
const root = path.resolve(__dirname, '..');
const releasesDir = path.join(root, 'releases');
const zipPath = path.join(releasesDir, zipName);

try {
  execSync(`git rev-parse ${tagName}`, { stdio: 'ignore', cwd: root });
  console.error(`Tag ${tagName} already exists. Aborting.`);
  process.exit(1);
} catch {
}

const ask = question =>
  new Promise(resolve => {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });

const run = (cmd, opts = {}) => {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
};

const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

function checkCleanTree() {
  const staged = execSync('git diff --cached --name-only', { encoding: 'utf8', cwd: root }).trim();
  const unstaged = execSync('git diff --name-only', { encoding: 'utf8', cwd: root }).trim();
  const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8', cwd: root }).trim();

  const dirty = [];
  if (staged) dirty.push({ kind: 'staged', files: staged.split('\n') });
  if (unstaged) dirty.push({ kind: 'unstaged', files: unstaged.split('\n') });
  if (untracked) dirty.push({ kind: 'untracked', files: untracked.split('\n') });

  return dirty;
}

function validateVersions() {
  const manifest = readJson('manifest.json');
  const pkg = readJson('package.json');

  const errors = [];
  if (manifest.version !== version) {
    errors.push(`manifest.json version is "${manifest.version}", expected "${version}"`);
  }
  if (pkg.version !== version) {
    errors.push(`package.json version is "${pkg.version}", expected "${version}"`);
  }
  if (errors.length) {
    console.error('Version mismatch:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('Update the version manually before releasing.');
    process.exit(1);
  }

  const changelogPath = path.join(root, 'CHANGELOG.md');
  const changelog = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';
  if (!changelog.includes(version)) {
    console.warn(`Warning: CHANGELOG.md does not mention "${version}". Continuing anyway.`);
  }
}

function build() {
  console.log('\nBuilding extension...');
  run('npm run build');
}

function zipDist() {
  const distDir = path.join(root, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('dist/ not found. Build failed?');
    process.exit(1);
  }
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  console.log(`\nCreating ${zipName}...`);
  execSync(`cd dist && zip -r ../releases/${zipName} . -x "*.DS_Store"`, {
    stdio: 'inherit',
    cwd: root,
  });
  console.log(`Created: releases/${zipName}`);
}

function gitRelease() {
  run('git checkout main');
  run(`git merge --no-ff develop -m "release: v${version}"`);
  run(`git tag ${tagName}`);
  run('git push origin main --follow-tags');
  run('git checkout develop');
}

(async () => {
  const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: root }).trim();
  if (branch !== 'develop') {
    console.error(`Must run from develop branch (currently on "${branch}").`);
    process.exit(1);
  }

  const dirty = checkCleanTree();
  if (dirty.length) {
    console.log('\nYou have uncommitted changes:');
    dirty.forEach(d => {
      console.log(`\n${d.kind}:`);
      d.files.forEach(f => console.log(`  ${f}`));
    });
    const answer = await ask('\nContinue anyway? [y/N] ');
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Aborted.');
      process.exit(1);
    }
  }

  console.log(`\nValidating version ${version}...`);
  validateVersions();

  build();
  zipDist();

  console.log('\nMerging develop -> main and tagging...');
  gitRelease();

  console.log(`\nDone. v${version} tagged and pushed.`);
  console.log(`Upload releases/${zipName} to the Chrome Web Store dashboard.`);
})().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});