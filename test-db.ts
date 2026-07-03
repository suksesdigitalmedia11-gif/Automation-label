import { prisma } from './src/lib/prisma';

async function main() {
  const bgs = await prisma.materialBackground.findMany();
  console.log("Backgrounds:");
  bgs.forEach(b => {
    console.log(`- ${b.name}: fontColor="${b.fontColor}", fileBase64 starts with: ${b.fileBase64 ? b.fileBase64.substring(0, 30) : 'null'}`);
  });

  const fonts = await prisma.materialFont.findMany();
  console.log("\nFonts:");
  fonts.forEach(f => {
    console.log(`- ${f.name}: fontFamily="${f.fontFamily}", fileBase64 starts with: ${f.fileBase64 ? f.fileBase64.substring(0, 30) : 'null'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
