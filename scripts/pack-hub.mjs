import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readPackage = async (...parts) => JSON.parse(await readFile(join(root, ...parts), 'utf8'));
const hub = await readPackage('hub', 'package.json');
const shared = await readPackage('packages', 'shared', 'package.json');
const output = join(root, '.output');
const temporaryRoot = resolve(tmpdir());
const staging = await mkdtemp(join(temporaryRoot, 'dashflow-hub-pack-'));

try {
  const library = join(staging, 'node_modules', '@dashflow', 'shared');
  await Promise.all([mkdir(output, { recursive: true }), mkdir(library, { recursive: true })]);
  await Promise.all([
    cp(join(root, 'hub', 'dist'), join(staging, 'dist'), { recursive: true }),
    cp(join(root, 'hub', 'openapi.yaml'), join(staging, 'openapi.yaml')),
    cp(join(root, 'LICENSE'), join(staging, 'LICENSE')),
    cp(join(root, 'docs', 'HUB_OPERATIONS.md'), join(staging, 'README.md')),
    cp(join(root, 'packages', 'shared', 'dist'), join(library, 'dist'), { recursive: true }),
    writeFile(
      join(library, 'package.json'),
      JSON.stringify({
        name: shared.name,
        version: shared.version,
        type: shared.type,
        license: shared.license,
        exports: shared.exports,
        dependencies: shared.dependencies,
      }),
    ),
    writeFile(
      join(staging, 'package.json'),
      JSON.stringify({
        name: hub.name,
        version: hub.version,
        private: hub.private,
        type: hub.type,
        license: hub.license,
        engines: hub.engines,
        bin: hub.bin,
        dependencies: { ...hub.dependencies, ...shared.dependencies },
        bundleDependencies: [shared.name],
        files: ['dist/', 'openapi.yaml'],
      }),
    ),
  ]);
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Запускайте упаковку через npm run pack:hub');
  const result = spawnSync(process.execPath, [cli, 'pack', '--pack-destination', output], {
    cwd: staging,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  if (dirname(staging) === temporaryRoot) await rm(staging, { recursive: true, force: true });
}
