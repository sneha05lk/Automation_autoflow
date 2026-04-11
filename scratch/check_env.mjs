// Run this via: node scratch/check_env.js
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve('.env.local');
const content = readFileSync(envPath, 'utf8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('SERPER')) {
    const val = line.split('=')[1] || '';
    console.log('SERPER line raw:', JSON.stringify(line));
    console.log('Value raw:', JSON.stringify(val));
    console.log('Char codes:', [...val].map(c => c.charCodeAt(0)));
  }
}
