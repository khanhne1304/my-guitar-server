/**
 * Nạp .env từ thư mục gốc my-guitar-server (không phụ thuộc process.cwd).
 */
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Windows/mạng không có IPv6: Node mặc định thử IPv6 trước → fetch timeout ~10s (fetch failed)
dns.setDefaultResultOrder('ipv4first');

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env') });
