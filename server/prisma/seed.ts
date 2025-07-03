import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Define the structure of the pricing data object based on the JSON
interface PricingData {
  Provider: string;
  ModelID: string;
  CanonicalID: string;
  ContextWindow: number;
  InputUSDPer1M: number;
  OutputUSDPer1M: number;
  Notes?: string | null;
  Date: string; // Date comes as string from JSON
}

async function main() {
  console.log(`Start seeding ...`);

  const jsonPath = path.resolve(
    __dirname,
    "../../llm_pricing_api_models_2025-04-16.json"
  );
  let pricingData: PricingData[] = [];

  try {
    const fileContents = fs.readFileSync(jsonPath, "utf-8");
    pricingData = JSON.parse(fileContents);
    console.log(`Loaded ${pricingData.length} records from JSON file.`);
  } catch (error) {
    console.error(`Error reading or parsing JSON file at ${jsonPath}:`, error);
    return; // Stop seeding if file is not found or invalid
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of pricingData) {
    // Validate essential data
    if (!item.ModelID || !item.Date) {
      console.warn(
        `Skipping record due to missing ModelID or Date: ${JSON.stringify(
          item
        )}`
      );
      skippedCount++;
      continue;
    }

    const recordDate = new Date(item.Date);
    if (isNaN(recordDate.getTime())) {
      console.warn(
        `Skipping record due to invalid Date format: ${item.Date} for ModelID: ${item.ModelID}`
      );
      skippedCount++;
      continue;
    }

    try {
      const result = await prisma.modelPrice.upsert({
        where: {
          ModelID_Date: {
            // Compound unique key identifier
            ModelID: item.ModelID,
            Date: recordDate,
          },
        },
        update: {
          // Data to update if record exists
          Provider: item.Provider,
          CanonicalID: item.CanonicalID,
          ContextWindow: item.ContextWindow,
          InputUSDPer1M: item.InputUSDPer1M,
          OutputUSDPer1M: item.OutputUSDPer1M,
          Notes: item.Notes,
        },
        create: {
          // Data to create if record doesn't exist
          Provider: item.Provider,
          ModelID: item.ModelID,
          CanonicalID: item.CanonicalID,
          ContextWindow: item.ContextWindow,
          InputUSDPer1M: item.InputUSDPer1M,
          OutputUSDPer1M: item.OutputUSDPer1M,
          Notes: item.Notes,
          Date: recordDate,
        },
      });
      // Unfortunately, upsert doesn't directly tell us if it created or updated.
      // We could do a findFirst before upsert to track counts accurately,
      // but for a seed script, simplicity is often preferred.
      // Let's assume success means either created or updated.
    } catch (error) {
      console.error(
        `Failed to upsert record for ModelID ${item.ModelID} on Date ${item.Date}:`,
        error
      );
      skippedCount++; // Count as skipped if error during upsert
    }
  }

  // A simple way to estimate counts after the loop (less accurate but avoids pre-checking)
  const finalCount = await prisma.modelPrice.count();
  console.log(
    `Seeding finished. Total records in DB: ${finalCount}. Skipped records: ${skippedCount}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
