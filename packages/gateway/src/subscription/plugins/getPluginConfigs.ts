import * as path from 'path';
import * as fs from 'fs';

import downloadPlugins from './downloadPlugins';

function getFilesFullPaths(
  dir: string,
  pred: (filename: string) => boolean
): string[] {
  if (!fs.existsSync(dir)) { return []; }

  return fs
    .readdirSync(dir)
    .map(fileName => {
      if (!pred(fileName)) { return ''; }

      const fullName = path.join(dir, fileName);
      const stat = fs.lstatSync(fullName);

      if (stat.isDirectory()) { return ''; }

      return fullName;
    })
    .filter(x => x);
}

/** ESM import of CJS `module.exports` */
function normalizePluginModule(ns: any): any {
  if (ns && typeof ns === 'object' && 'default' in ns && ns.default != null) {
    return ns.default;
  }
  return ns;
}

/**
 * Multiple services can expose the same subscriptionPlugin (e.g. misconfigured
 * download URL). Duplicate `name` would repeat Subscription fields and break SDL.
 */
function dedupePluginsByName(
  pairs: { file: string; plugin: any }[],
): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const { file, plugin } of pairs) {
    const name = plugin?.name as string | undefined;
    if (!name) {
      out.push(plugin);
      continue;
    }
    if (seen.has(name)) {
      console.warn(
        `[gateway] subscription plugin "${name}" skipped duplicate (${path.basename(
          file,
        )}); check service subscriptionPlugin.js / download URL.`,
      );
      continue;
    }
    seen.add(name);
    out.push(plugin);
  }
  return out;
}

export default async function getPluginConfigs(): Promise<any[]> {
  await downloadPlugins();
  const directory = path.join(__dirname, '/downloads');
  const files = getFilesFullPaths(directory, name => /\.(t|j)s$/.test(name));

  const pairs: { file: string; plugin: any }[] = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      // Another startup cycle may refresh downloads concurrently; skip stale entry.
      console.warn(
        `[gateway] subscription plugin file disappeared before import: ${file}`,
      );
      continue;
    }

    try {
      const resolved = path.resolve(file);
      delete require.cache[resolved];
      const moduleNs = require(resolved);
      pairs.push({ file, plugin: normalizePluginModule(moduleNs) });
    } catch (e) {
      console.warn(
        `[gateway] subscription plugin import failed (${path.basename(file)}): ${e.message}`,
      );
    }
  }

  return dedupePluginsByName(pairs);
}
