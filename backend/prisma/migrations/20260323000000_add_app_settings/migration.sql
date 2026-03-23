-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "selectedProdajnoMjestoId" INTEGER,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ensure_single_row" CHECK (id = 1)
);

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_selectedProdajnoMjestoId_fkey" FOREIGN KEY ("selectedProdajnoMjestoId") REFERENCES "ProdajnoMjesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
