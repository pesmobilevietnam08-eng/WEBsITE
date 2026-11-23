import { spawnSync } from 'node:child_process';

// npm 11 propagates user ~/.npmrc `allow-scripts` into `npm_config_allow_scripts`
// when executing `npm run ...`, which causes nested `npm audit` to fail with EALLOWSCRIPTS.
const env = { ...process.env };
delete env.npm_config_allow_scripts;

const args = ['audit', '--audit-level=high'];
const result =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], {
        env,
        stdio: 'inherit',
      })
    : spawnSync('npm', args, {
        env,
        stdio: 'inherit',
      });

process.exit(result.status ?? 1);
