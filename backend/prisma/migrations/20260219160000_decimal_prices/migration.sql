-- AlterTable Article
ALTER TABLE "Article" ALTER COLUMN "price" TYPE DECIMAL(10,2),
                      ALTER COLUMN "taxRate" TYPE DECIMAL(10,2);

-- AlterTable Receipt
ALTER TABLE "Receipt" ALTER COLUMN "brutto" TYPE DECIMAL(10,2),
                      ALTER COLUMN "netto" TYPE DECIMAL(10,2),
                      ALTER COLUMN "taxValue" TYPE DECIMAL(10,2),
                      ALTER COLUMN "discountValue" TYPE DECIMAL(10,2),
                      ALTER COLUMN "shippingCost" TYPE DECIMAL(10,2);

-- AlterTable ReceiptItem
ALTER TABLE "ReceiptItem" ALTER COLUMN "quantity" TYPE DECIMAL(10,2),
                          ALTER COLUMN "price" TYPE DECIMAL(10,2),
                          ALTER COLUMN "taxRate" TYPE DECIMAL(10,2);

-- AlterTable Transaction
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE DECIMAL(10,2);

-- AlterTable SalesReport
ALTER TABLE "SalesReport" ALTER COLUMN "totalSalesAmount" TYPE DECIMAL(10,2);
