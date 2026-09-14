import { randomUUID } from "node:crypto";
import { appendFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function freePorts(count) {
  // Stay below Linux's default ephemeral range (32768+), used by outgoing
  // connections while Docker pulls images. Never stop another service.
  for (let base = 15420; base + count < 25000; base += count) {
    const listeners = [];
    let available = true;
    try {
      for (let offset = 0; offset < count; offset++) {
        const server = createServer();
        try {
          await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(base + offset, "0.0.0.0", resolve);
          });
          listeners.push(server);
        } catch (error) {
          if (error.code !== "EADDRINUSE") throw error;
          available = false;
          break;
        }
      }
    } finally {
      await Promise.all(listeners.map((server) => new Promise((resolve) => server.close(resolve))));
    }
    if (available) return Array.from({ length: count }, (_, offset) => base + offset);
  }
  throw new Error("No free port block available for the isolated Supabase smoke test");
}

export async function prepareCiSupabase() {
  const source = await readFile("supabase/config.toml", "utf8");
  const portPattern = /^(\s*(?:port|shadow_port|inspector_port)\s*=\s*)\d+/gm;
  const count = [...source.matchAll(portPattern)].length;
  if (!count || !/^project_id\s*=\s*"[^"]+"/m.test(source)) throw new Error("Unexpected Supabase config format");
  const ports = await freePorts(count);
  const project = `gymplanner-ci-${randomUUID().slice(0, 8)}`;
  let index = 0;
  const config = source
    .replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${project}"`)
    .replace(portPattern, (_, prefix) => `${prefix}${ports[index++]}`);
  const workdir = await mkdtemp(join(tmpdir(), "gymplanner-ci-"));
  await mkdir(join(workdir, "supabase"));
  await writeFile(join(workdir, "supabase/config.toml"), config);
  return { workdir, project, ports };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (!process.env.GITHUB_ENV) throw new Error("GITHUB_ENV is required to pass the isolated config to later CI steps");
  const { workdir, project, ports } = await prepareCiSupabase();
  await appendFile(process.env.GITHUB_ENV, `SUPABASE_WORKDIR=${workdir}\n`);
  console.log(`Prepared ${project} with local ports ${ports.join(", ")}`);
}
