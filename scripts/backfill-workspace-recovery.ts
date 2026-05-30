/**
 * Backfill: asigna recoveryCode a Workspaces existentes que no lo tengan.
 * Idempotente: ejecutar después de la migración del schema.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function genCode(): string {
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}

async function main() {
  const sinCodigo = await prisma.workspace.findMany({ where: { recoveryCode: null } });
  console.log(`Workspaces sin recoveryCode: ${sinCodigo.length}`);
  for (const ws of sinCodigo) {
    for (let i = 0; i < 5; i++) {
      try {
        const code = genCode();
        const updated = await prisma.workspace.update({
          where: { id: ws.id },
          data: { recoveryCode: code },
        });
        console.log(`OK ${ws.id} -> ${updated.recoveryCode}`);
        break;
      } catch (e) {
        console.log(`Colisión, reintentando ${ws.id}...`);
      }
    }
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
