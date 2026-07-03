const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.fmsfhivitivxlonouhfo:082139063266@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
  });

  await client.connect();

  const bgs = await client.query('SELECT name, font_color, substring(file_base64 from 1 for 50) as base64 FROM materials_backgrounds');
  console.log("Backgrounds:");
  bgs.rows.forEach(b => {
    console.log(`- ${b.name}: fontColor="${b.font_color}", fileBase64 starts with: ${b.base64 ? b.base64 : 'null'}`);
  });

  const fonts = await client.query('SELECT name, font_family, substring(file_base64 from 1 for 50) as base64 FROM materials_fonts');
  console.log("\nFonts:");
  fonts.rows.forEach(f => {
    console.log(`- ${f.name}: fontFamily="${f.font_family}", fileBase64 starts with: ${f.base64 ? f.base64 : 'null'}`);
  });

  await client.end();
}

main().catch(console.error);
