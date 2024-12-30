-- CreateTable
CREATE TABLE "EventsTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" INTEGER NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Cursor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventSeq" TEXT NOT NULL,
    "txDigest" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poolAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenAmount" TEXT NOT NULL,
    "buyDigest" TEXT NOT NULL,
    "sellDigest" TEXT,
    "dex" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "suiSpentAmount" TEXT NOT NULL,
    "suiReceivedAmount" TEXT,
    "initialPoolAmountA" TEXT NOT NULL,
    "initialPoolAmountB" TEXT NOT NULL,
    "suiIsA" BOOLEAN NOT NULL,
    "scamProbability" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_poolAddress_key" ON "Trade"("poolAddress");
