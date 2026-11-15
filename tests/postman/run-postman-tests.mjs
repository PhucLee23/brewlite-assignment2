// Chạy toàn bộ bộ test Postman bằng Newman, kể cả bước chuẩn bị dữ liệu mà Postman không tự làm được.
//
//   npm install                 (lần đầu, cài newman)
//   node run-postman-tests.mjs
//
// Biến môi trường (tùy chọn):
//   BASE_URL       địa chỉ backend, mặc định http://localhost:4000
//   PSQL_URL       chuỗi kết nối nếu muốn gọi psql trực tiếp thay vì qua `docker compose exec db`
//   POSTGRES_USER, POSTGRES_DB   tài khoản và tên CSDL trong container, mặc định brewlite
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import newman from 'newman';

const here = dirname(fileURLToPath(import.meta.url));
const file = readdirSync(here).find((f) => f.endsWith('.postman_collection.json'));
if (!file) throw new Error('Không tìm thấy file *.postman_collection.json cạnh script');

const collection = JSON.parse(readFileSync(join(here, file), 'utf8'));
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';
collection.variable.find((v) => v.key === 'baseUrl').value = BASE_URL;

const folders = collection.item.map((f) => f.name);
const setupFolder = folders[0];
// Folder cần đơn PAID chạy sau cùng, sau khi đánh dấu PAID trong CSDL
const paidFolder = folders.find((f) => f.includes('cần 2 đơn PAID'));
const mainFolders = folders.filter((f) => f !== paidFolder);

// Thư mục gốc repo (nơi có docker-compose.yml) để gọi `docker compose exec db`
let root = here;
while (!existsSync(join(root, 'docker-compose.yml')) && dirname(root) !== root) root = dirname(root);

function sql(query) {
  const [cmd, args] = process.env.PSQL_URL
    ? ['psql', [process.env.PSQL_URL, '-v', 'ON_ERROR_STOP=1', '-c', query]]
    : ['docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', process.env.POSTGRES_USER ?? 'brewlite', '-d', process.env.POSTGRES_DB ?? 'brewlite', '-v', 'ON_ERROR_STOP=1', '-c', query]];
  const res = spawnSync(cmd, args, { encoding: 'utf8', cwd: root });
  if (res.status !== 0) throw new Error(`Lệnh SQL lỗi (kiểm tra Docker đang chạy CSDL): ${res.stderr || res.error}`);
  return res.stdout.trim();
}

function run(col, folder, title) {
  console.log(`\n==================== ${title} ====================`);
  let vars = {};
  return new Promise((resolve, reject) => {
    const emitter = newman.run({ collection: col, folder, reporters: ['cli'] }, (err, summary) => {
      if (err) return reject(err);
      const a = summary.run.stats.assertions;
      const broken = summary.run.failures.filter((f) => f.error && f.error.name !== 'AssertionError').length;
      resolve({ title, vars, passed: a.total - a.failed, total: a.total, failed: a.failed + broken });
    });
    // Newman không ghi biến collection ngược ra file: giữ lại giá trị sau mỗi script để dùng cho bước sau
    const keep = (err, o) => {
      const scope = o && o.executions && o.executions[0] && o.executions[0].result.collectionVariables;
      if (scope) vars = scope.toObject();
    };
    emitter.on('prerequest', keep);
    emitter.on('test', keep);
  });
}

const results = [];
const main = await run(collection, mainFolders, 'Các folder chính');
results.push(main);

if (paidFolder) {
  const ids = [main.vars.counterOrderId, main.vars.counterCancelId].map(Number);
  if (ids.every((id) => Number.isInteger(id) && id > 0)) {
    console.log(`\nĐánh dấu đơn #${ids[0]}, #${ids[1]} đã thanh toán (PAID) để chạy luồng Quầy`);
    console.log(sql(`UPDATE "Order" SET status = 'PAID' WHERE id IN (${ids.join(', ')}) AND status = 'PENDING';`));
    for (const v of collection.variable) if (main.vars[v.key] !== undefined) v.value = String(main.vars[v.key]);
    results.push(await run(collection, [setupFolder, paidFolder], paidFolder));
  } else {
    results.push({ title: paidFolder, passed: 0, total: 0, failed: 1, note: 'không tạo được đơn cho luồng Quầy (xem lỗi ở bước tạo đơn cho Quầy)' });
  }
}

console.log('\n========== TỔNG KẾT ==========');
for (const r of results) {
  const ok = r.failed === 0;
  console.log(`${ok ? '✓ PASS' : '✗ FAIL'}  ${r.title}: ${r.passed}/${r.total} kiểm tra đạt${r.note ? ` (${r.note})` : ''}`);
}
process.exit(results.every((r) => r.failed === 0) ? 0 : 1);
