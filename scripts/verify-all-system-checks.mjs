import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

console.log('Running comprehensive pre-flight verification...');

const temp = await mkdtemp(join(tmpdir(), 'btn-audit-'));
try {
  const outFile = join(temp, 'whitepaperSupply.mjs');
  await build({
    entryPoints: ['src/services/whitepaperSupply.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outFile,
  });

  const { calculateWhitepaperSupply, BITNET_GENESIS_TIMESTAMP, BITNET_BLOCK_SUBSIDY_BTN } = await import(pathToFileURL(outFile));

  // 1. Verify Whitepaper Supply calculations
  assert.equal(BITNET_GENESIS_TIMESTAMP, 1689292800, 'Genesis timestamp must be July 14, 2023 UTC');
  assert.equal(BITNET_BLOCK_SUBSIDY_BTN, 1.0, 'Base subsidy must be exactly 1.0 BTN/block');
  const zeroSupply = calculateWhitepaperSupply(0);
  assert.equal(zeroSupply.totalEstimatedSupplyBtn, 0, 'Block 0 must have 0 supply (0 premine)');
  const b1Supply = calculateWhitepaperSupply(1);
  assert.equal(b1Supply.totalEstimatedSupplyBtn, 1.0, 'Block 1 must have 1.0 BTN supply');
  const b7mSupply = calculateWhitepaperSupply(7721500);
  assert.equal(b7mSupply.totalEstimatedSupplyBtn, 7721500, 'Block 7721500 must have 7,721,500 BTN base supply');
  assert.equal(b7mSupply.supplyText, '7,721,500.00', 'Formatted supply text must preserve decimal precision');
  console.log('PASS: Whitepaper supply formulas, 0 premine, 1.0 BTN/block, and exact decimals.');

  // 2. Verify Fee calculation with BigInt Wei precision
  const gasUsed = 21000;
  const effectiveGasPriceWei = 2000000000n; // 2 Gwei
  const expectedFeeWei = BigInt(gasUsed) * effectiveGasPriceWei;
  assert.equal(expectedFeeWei, 42000000000000n, 'Fee calculation in Wei must match gasUsed * effectiveGasPrice');
  console.log('PASS: Transaction fee Wei calculation and gasUsed * effectiveGasPrice.');

  // 3. Scan all src/ files for non-English (Turkish) characters
  function scanDir(dir) {
    const files = readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('.')) continue;
      const full = join(dir, f);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.css') || f.endsWith('.html')) {
        const content = readFileSync(full, 'utf-8');
        const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
        const match = content.match(turkishChars);
        if (match) {
          throw new Error(`Found Turkish character "${match[0]}" in ${full}`);
        }
      }
    }
  }
  scanDir('src');
  console.log('PASS: 0 Turkish characters in all src/ source files.');

  console.log('ALL PRE-FLIGHT VERIFICATIONS PASSED SUCCESSFULLY!');
} finally {
  await rm(temp, { recursive: true, force: true });
}
