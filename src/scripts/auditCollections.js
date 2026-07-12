/**
 * Audit MongoDB collections vs codebase usage.
 * Run: node src/scripts/auditCollections.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const modelsDir = path.join(root, 'models');

function walk(dir, ext = '.js') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') out.push(...walk(full, ext));
    else if (entry.isFile() && entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/my_guitar';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const dbCollections = (await db.listCollections().toArray()).map((c) => c.name).sort();

  const modelFiles = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.js'));
  const modelToCollection = new Map();
  const collectionToModel = new Map();

  for (const file of modelFiles) {
    const mod = await import(`../models/${file}`);
    const model = mod.default;
    if (!model?.collection?.name) continue;
    const coll = model.collection.name;
    modelToCollection.set(file.replace('.js', ''), coll);
    collectionToModel.set(coll, file.replace('.js', ''));
  }

  const srcFiles = walk(root).filter((f) => !f.includes(`${path.sep}models${path.sep}`));
  const allSource = srcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  const used = [];
  const unused = [];

  for (const [modelName, collName] of modelToCollection) {
    const patterns = [
      `models/${modelName}.js`,
      `models/${modelName}'`,
      `models/${modelName}"`,
      `'${modelName}'`,
      `"${modelName}"`,
      `collection('${collName}')`,
      `from: '${collName}'`,
    ];
    const isUsed = patterns.some((p) => allSource.includes(p));
    const inDb = dbCollections.includes(collName);
    const count = inDb ? await db.collection(collName).countDocuments() : 0;
    const entry = { modelName, collName, inDb, count, isUsed };
    if (isUsed) used.push(entry);
    else unused.push(entry);
  }

  const orphanDb = dbCollections.filter((c) => !collectionToModel.has(c));

  console.log('=== Models USED in codebase ===');
  for (const e of used.sort((a, b) => a.collName.localeCompare(b.collName))) {
    console.log(`${e.collName.padEnd(28)} model=${e.modelName.padEnd(22)} docs=${e.count}`);
  }

  console.log('\n=== Models NOT referenced in codebase ===');
  for (const e of unused.sort((a, b) => a.collName.localeCompare(b.collName))) {
    console.log(`${e.collName.padEnd(28)} model=${e.modelName.padEnd(22)} docs=${e.count} inDb=${e.inDb}`);
  }

  console.log('\n=== DB collections without model ===');
  for (const c of orphanDb) {
    const count = await db.collection(c).countDocuments();
    console.log(`${c.padEnd(28)} docs=${count}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
