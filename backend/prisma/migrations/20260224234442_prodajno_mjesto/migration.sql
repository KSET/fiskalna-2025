-- CreateTable
CREATE TABLE "ProdajnoMjesto" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "businessSpace" TEXT NOT NULL,
    "paymentDevice" TEXT NOT NULL,
    "firaApiKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProdajnoMjesto_pkey" PRIMARY KEY ("id")
);
