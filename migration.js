const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
  try {
    await db.execute('ALTER TABLE documentos ADD COLUMN link TEXT;');
    console.log('Added link column');
  } catch(e) { console.log('link column exists or error', e.message); }
  
  try {
    await db.execute('ALTER TABLE documentos ADD COLUMN autores TEXT;');
    console.log('Added autores column');
  } catch(e) { console.log('autores column exists or error', e.message); }
}

migrate();
