
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../data/vocab-master.db');
const db = new Database(DB_PATH);

const user = db.prepare('SELECT * FROM users WHERE username = ?').get('BigDaddy');
console.log('User Details:', user);
