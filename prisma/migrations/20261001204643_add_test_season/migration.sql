-- DropForeignKey
ALTER TABLE "GiverSelection" DROP CONSTRAINT "GiverSelection_pairingId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_pairingId_fkey";

-- DropForeignKey
ALTER TABLE "Pairing" DROP CONSTRAINT "Pairing_seasonId_fkey";

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Pairing" ADD CONSTRAINT "Pairing_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiverSelection" ADD CONSTRAINT "GiverSelection_pairingId_fkey" FOREIGN KEY ("pairingId") REFERENCES "Pairing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_pairingId_fkey" FOREIGN KEY ("pairingId") REFERENCES "Pairing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
