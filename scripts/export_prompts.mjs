// 导出全部 prompt 为 CSV（离线批量使用 prompt 文本，不涉及任何图片）
// 用法：node scripts/export_prompts.mjs [输出路径，默认 exports/prompts.csv]
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['meta', 'poses', 'costumes', 'portraits']) vm.runInContext(fs.readFileSync(path.join(root, 'data', f + '.js'), 'utf8'), ctx);
const PR = createRequire(import.meta.url)(path.join(root, 'assets/js/prompts.js'));
const { PA_POSES: P, PA_COSTUMES: C, PA_PORTRAITS: R } = ctx.window;
const cat = Object.fromEntries(P.categories.map(c => [c.key, c])), hair = Object.fromEntries(R.hairs.map(h => [h.key, h])), sec = Object.fromEntries(R.sections.map(s => [s.key, s]));
const rows = [['type', 'id', 'variant', 'source_link', 'prompt_zh', 'prompt_en']];
for (const p of P.items) for (const a of p.a) for (const m of ['line', 'depth']) {
  const r = PR.pose(p, { mode: m, angle: a, cat: cat[p.c] }); rows.push(['pose', p.id, m + ':' + a, PR.links.pose(m, p.id, a).image, r.zh, r.en]);
}
for (const c of C.items) { const r = PR.costume(c); rows.push(['costume-' + c.set, c.id, c.c, PR.links.costume(c.set, c.id).image, r.zh, r.en]); }
for (const it of R.items) { const r = PR.portrait(it, R.styles[it.st], hair[it.h], sec[it.sec]); rows.push(['portrait', it.id, it.sec + ':' + it.h, PR.links.portrait(it).image, r.zh, r.en]); }
const out = process.argv[2] || path.join(root, 'exports', 'prompts.csv');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, '\ufeff' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n'));
console.log(`${rows.length - 1} 行 × 2 语言 = ${(rows.length - 1) * 2} 条 prompt → ${out}`);
