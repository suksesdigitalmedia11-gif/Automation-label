const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.fmsfhivitivxlonouhfo:082139063266@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
  });

  await client.connect();

  const fontFile = 'public/fonts/ca007d9a-7041-4035-8863-51f88b4919fe.otf';
  if (fs.existsSync(fontFile)) {
    const bytes = fs.readFileSync(fontFile);
    const base64Str = bytes.toString('base64');
    
    await client.query(
      'UPDATE materials_fonts SET file_base64 = $1 WHERE name = $2',
      [base64Str, 'sindoro']
    );
    console.log('Successfully updated sindoro font base64 in production DB!');
  } else {
    console.log('Font file not found');
  }

  await client.end();
}

main().catch(console.error);
