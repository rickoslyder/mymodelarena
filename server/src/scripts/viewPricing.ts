#!/usr/bin/env tsx
/**
 * Quick script to view the current pricing data in the database
 */

import prisma from "../db/prisma";

async function viewPricing() {
  const today = new Date();
  const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  console.log(`📊 Pricing data for ${dateOnly.toISOString().split('T')[0]}\n`);

  const allPricing = await prisma.modelPrice.findMany({
    where: {
      Date: dateOnly,
    },
    orderBy: [
      { Provider: 'asc' },
      { InputUSDPer1M: 'asc' }
    ]
  });

  if (allPricing.length === 0) {
    console.log("No pricing data found for today.");
    return;
  }

  // Group by provider
  const byProvider = allPricing.reduce((acc, pricing) => {
    if (!acc[pricing.Provider]) {
      acc[pricing.Provider] = [];
    }
    acc[pricing.Provider].push(pricing);
    return acc;
  }, {} as Record<string, typeof allPricing>);

  Object.entries(byProvider).forEach(([provider, models]) => {
    console.log(`\n🏢 ${provider} (${models.length} models):`);
    console.log('─'.repeat(80));
    
    models.forEach(model => {
      const contextDisplay = model.ContextWindow >= 1000 ? 
        `${(model.ContextWindow / 1000).toFixed(0)}K` : 
        model.ContextWindow.toString();
      
      console.log(`  📝 ${model.ModelID.padEnd(25)} │ $${model.InputUSDPer1M.toString().padStart(6)}/$${model.OutputUSDPer1M.toString().padEnd(6)} │ ${contextDisplay.padEnd(6)} │ ${model.Notes || ''}`);
    });
  });

  console.log(`\n\n📈 Summary:`);
  console.log(`  Total models: ${allPricing.length}`);
  console.log(`  Providers: ${Object.keys(byProvider).length}`);
  
  // Find cheapest and most expensive
  const sortedByInput = [...allPricing].sort((a, b) => a.InputUSDPer1M - b.InputUSDPer1M);
  const cheapest = sortedByInput[0];
  const mostExpensive = sortedByInput[sortedByInput.length - 1];
  
  console.log(`  Cheapest input: ${cheapest.Provider}/${cheapest.ModelID} ($${cheapest.InputUSDPer1M}/1M)`);
  console.log(`  Most expensive input: ${mostExpensive.Provider}/${mostExpensive.ModelID} ($${mostExpensive.InputUSDPer1M}/1M)`);
}

async function main() {
  try {
    await viewPricing();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}