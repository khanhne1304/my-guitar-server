/**
 * Nạp .env từ thư mục gốc my-guitar-server (không phụ thuộc process.cwd).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env') });
