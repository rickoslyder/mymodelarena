#!/usr/bin/env tsx
/**
 * Script to update LLM pricing database with latest 2025 pricing information
 * Run with: npx tsx src/scripts/updatePricing2025.ts
 */

import prisma from "../db/prisma";

interface PricingData {
  Provider: string;
  ModelID: string;
  CanonicalID: string;
  ContextWindow: number;
  InputUSDPer1M: number;
  OutputUSDPer1M: number;
  Notes?: string;
}

const PRICING_DATA_2025: PricingData[] = [
  // OpenAI Models
  {
    Provider: "OpenAI",
    ModelID: "gpt-3.5-turbo",
    CanonicalID: "gpt-3.5-turbo-0125",
    ContextWindow: 16000,
    InputUSDPer1M: 0.50,
    OutputUSDPer1M: 1.50,
    Notes: "GPT-3.5 Turbo flagship model, optimized for dialog"
  },
  {
    Provider: "OpenAI", 
    ModelID: "gpt-4o-mini",
    CanonicalID: "gpt-4o-mini",
    ContextWindow: 128000,
    InputUSDPer1M: 0.15,
    OutputUSDPer1M: 0.60,
    Notes: "60% cheaper than GPT-3.5 Turbo, supports up to 16K output tokens"
  },
  {
    Provider: "OpenAI",
    ModelID: "gpt-4o",
    CanonicalID: "gpt-4o",
    ContextWindow: 128000,
    InputUSDPer1M: 5.00,
    OutputUSDPer1M: 20.00,
    Notes: "GPT-4o flagship model for text, includes Realtime and Audio versions"
  },
  {
    Provider: "OpenAI",
    ModelID: "gpt-4-turbo",
    CanonicalID: "gpt-4-turbo",
    ContextWindow: 128000,
    InputUSDPer1M: 10.00,
    OutputUSDPer1M: 30.00,
    Notes: "GPT-4 Turbo model with 128K context"
  },
  {
    Provider: "OpenAI",
    ModelID: "gpt-4",
    CanonicalID: "gpt-4",
    ContextWindow: 32000,
    InputUSDPer1M: 30.00,
    OutputUSDPer1M: 60.00,
    Notes: "Original GPT-4 model, most expensive option"
  },
  {
    Provider: "OpenAI",
    ModelID: "gpt-4.1",
    CanonicalID: "gpt-4.1",
    ContextWindow: 1000000,
    InputUSDPer1M: 15.00,
    OutputUSDPer1M: 60.00,
    Notes: "New 2025 model with 1M token context window"
  },
  {
    Provider: "OpenAI",
    ModelID: "gpt-4.1-mini",
    CanonicalID: "gpt-4.1-mini",
    ContextWindow: 1000000,
    InputUSDPer1M: 1.00,
    OutputUSDPer1M: 4.00,
    Notes: "Mini version with 1M token context window"
  },
  {
    Provider: "OpenAI",
    ModelID: "gpt-4.1-nano",
    CanonicalID: "gpt-4.1-nano",
    ContextWindow: 1000000,
    InputUSDPer1M: 0.30,
    OutputUSDPer1M: 1.20,
    Notes: "Fastest and cheapest model with 1M token context"
  },

  // Anthropic Claude Models
  {
    Provider: "Anthropic",
    ModelID: "claude-3.5-sonnet",
    CanonicalID: "claude-3-5-sonnet-20241022",
    ContextWindow: 200000,
    InputUSDPer1M: 3.00,
    OutputUSDPer1M: 15.00,
    Notes: "Flagship Claude 3.5 model, balanced performance"
  },
  {
    Provider: "Anthropic",
    ModelID: "claude-3.5-haiku",
    CanonicalID: "claude-3-5-haiku-20241022",
    ContextWindow: 200000,
    InputUSDPer1M: 1.00,
    OutputUSDPer1M: 5.00,
    Notes: "Fastest Claude model, good for simple tasks"
  },
  {
    Provider: "Anthropic",
    ModelID: "claude-3-opus",
    CanonicalID: "claude-3-opus-20240229",
    ContextWindow: 200000,
    InputUSDPer1M: 15.00,
    OutputUSDPer1M: 75.00,
    Notes: "Most capable Claude 3 model, highest cost"
  },
  {
    Provider: "Anthropic",
    ModelID: "claude-3.7-sonnet",
    CanonicalID: "claude-3-7-sonnet",
    ContextWindow: 200000,
    InputUSDPer1M: 3.00,
    OutputUSDPer1M: 15.00,
    Notes: "Updated Sonnet model for 2025"
  },
  {
    Provider: "Anthropic",
    ModelID: "claude-sonnet-4",
    CanonicalID: "claude-sonnet-4-20250514",
    ContextWindow: 200000,
    InputUSDPer1M: 3.00,
    OutputUSDPer1M: 15.00,
    Notes: "Latest Claude 4 Sonnet model"
  },
  {
    Provider: "Anthropic",
    ModelID: "claude-opus-4",
    CanonicalID: "claude-opus-4",
    ContextWindow: 200000,
    InputUSDPer1M: 15.00,
    OutputUSDPer1M: 75.00,
    Notes: "Latest Claude 4 Opus model"
  },

  // Google Gemini Models
  {
    Provider: "Google",
    ModelID: "gemini-1.5-flash",
    CanonicalID: "models/gemini-1.5-flash",
    ContextWindow: 128000,
    InputUSDPer1M: 0.075,
    OutputUSDPer1M: 0.30,
    Notes: "Fast and cost-effective, free tier available"
  },
  {
    Provider: "Google",
    ModelID: "gemini-1.5-pro",
    CanonicalID: "models/gemini-1.5-pro",
    ContextWindow: 128000,
    InputUSDPer1M: 1.25,
    OutputUSDPer1M: 5.00,
    Notes: "Flagship Gemini model, free tier available"
  },
  {
    Provider: "Google",
    ModelID: "gemini-2.5-pro",
    CanonicalID: "models/gemini-2.5-pro",
    ContextWindow: 1000000,
    InputUSDPer1M: 7.50,
    OutputUSDPer1M: 30.00,
    Notes: "Most expensive Gemini model with 1M context window"
  },

  // Mistral AI Models
  {
    Provider: "Mistral",
    ModelID: "mistral-large-2",
    CanonicalID: "mistral-large-2",
    ContextWindow: 128000,
    InputUSDPer1M: 8.00,
    OutputUSDPer1M: 24.00,
    Notes: "Latest large model with 128K context"
  },
  {
    Provider: "Mistral",
    ModelID: "mistral-large",
    CanonicalID: "mistral-large",
    ContextWindow: 32000,
    InputUSDPer1M: 8.00,
    OutputUSDPer1M: 24.00,
    Notes: "Original large model with 32K context"
  },
  {
    Provider: "Mistral",
    ModelID: "mistral-small",
    CanonicalID: "mistral-small",
    ContextWindow: 32000,
    InputUSDPer1M: 1.00,
    OutputUSDPer1M: 3.00,
    Notes: "Cost-effective small model"
  },
  {
    Provider: "Mistral",
    ModelID: "mistral-medium-3",
    CanonicalID: "mistral-medium-3",
    ContextWindow: 32000,
    InputUSDPer1M: 0.40,
    OutputUSDPer1M: 2.00,
    Notes: "2025 medium model, 8X lower cost than alternatives"
  },
  {
    Provider: "Mistral",
    ModelID: "codestral",
    CanonicalID: "codestral",
    ContextWindow: 32000,
    InputUSDPer1M: 3.00,
    OutputUSDPer1M: 3.00,
    Notes: "Specialized coding model, blended rate"
  },
  {
    Provider: "Mistral",
    ModelID: "codestral-2501",
    CanonicalID: "codestral-2501",
    ContextWindow: 32000,
    InputUSDPer1M: 3.00,
    OutputUSDPer1M: 3.00,
    Notes: "Updated Codestral model for 2025"
  },

  // Groq Models
  {
    Provider: "Groq",
    ModelID: "llama-3.3-70b-versatile",
    CanonicalID: "llama-3.3-70b-versatile",
    ContextWindow: 128000,
    InputUSDPer1M: 0.59,
    OutputUSDPer1M: 0.79,
    Notes: "Latest Llama model on Groq, very fast inference"
  },
  {
    Provider: "Groq",
    ModelID: "llama-2-70b-4096",
    CanonicalID: "llama2-70b-4096",
    ContextWindow: 4096,
    InputUSDPer1M: 0.70,
    OutputUSDPer1M: 0.80,
    Notes: "~300 tokens/s inference speed"
  },
  {
    Provider: "Groq",
    ModelID: "llama-2-7b-2048",
    CanonicalID: "llama2-7b-chat",
    ContextWindow: 2048,
    InputUSDPer1M: 0.10,
    OutputUSDPer1M: 0.10,
    Notes: "~750 tokens/s inference speed"
  },
  {
    Provider: "Groq",
    ModelID: "mixtral-8x7b-32768",
    CanonicalID: "mixtral-8x7b-32768",
    ContextWindow: 32000,
    InputUSDPer1M: 0.27,
    OutputUSDPer1M: 0.27,
    Notes: "~480 tokens/s inference speed, being deprecated"
  },
  {
    Provider: "Groq",
    ModelID: "gemma-9b-it",
    CanonicalID: "gemma-9b-it",
    ContextWindow: 8000,
    InputUSDPer1M: 0.10,
    OutputUSDPer1M: 0.10,
    Notes: "Replaces Gemma 7B, better performance"
  },

  // xAI Grok Models
  {
    Provider: "xAI",
    ModelID: "grok-3",
    CanonicalID: "grok-3",
    ContextWindow: 128000,
    InputUSDPer1M: 3.00,
    OutputUSDPer1M: 15.00,
    Notes: "Flagship Grok model, matches Claude pricing"
  },
  {
    Provider: "xAI",
    ModelID: "grok-3-mini",
    CanonicalID: "grok-3-mini",
    ContextWindow: 128000,
    InputUSDPer1M: 0.30,
    OutputUSDPer1M: 0.50,
    Notes: "Smaller, cost-effective Grok model"
  },
  {
    Provider: "xAI",
    ModelID: "grok-3-speedier",
    CanonicalID: "grok-3-speedier",
    ContextWindow: 128000,
    InputUSDPer1M: 5.00,
    OutputUSDPer1M: 25.00,
    Notes: "Premium performance version with faster inference"
  },
  {
    Provider: "xAI",
    ModelID: "grok-3-mini-speedier",
    CanonicalID: "grok-3-mini-speedier",
    ContextWindow: 128000,
    InputUSDPer1M: 0.60,
    OutputUSDPer1M: 4.00,
    Notes: "Faster mini version"
  },
  {
    Provider: "xAI",
    ModelID: "grok-beta",
    CanonicalID: "grok-beta",
    ContextWindow: 128000,
    InputUSDPer1M: 5.00,
    OutputUSDPer1M: 15.00,
    Notes: "Beta model for testing new features"
  },
];

async function updatePricing() {
  const currentDate = new Date();
  const dateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  
  console.log(`🔄 Starting pricing database update for ${dateOnly.toISOString().split('T')[0]}`);
  console.log(`📊 Processing ${PRICING_DATA_2025.length} models across all providers`);

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const pricing of PRICING_DATA_2025) {
    try {
      // Check if this exact pricing already exists for today
      const existingRecord = await prisma.modelPrice.findFirst({
        where: {
          ModelID: pricing.ModelID,
          Date: dateOnly,
        },
      });

      if (existingRecord) {
        console.log(`⏭️  Skipping ${pricing.Provider}/${pricing.ModelID} - already exists for today`);
        skippedCount++;
        continue;
      }

      // Insert new pricing record
      await prisma.modelPrice.create({
        data: {
          Provider: pricing.Provider,
          ModelID: pricing.ModelID,
          CanonicalID: pricing.CanonicalID,
          ContextWindow: pricing.ContextWindow,
          InputUSDPer1M: pricing.InputUSDPer1M,
          OutputUSDPer1M: pricing.OutputUSDPer1M,
          Notes: pricing.Notes || null,
          Date: dateOnly,
        },
      });

      console.log(`✅ Added ${pricing.Provider}/${pricing.ModelID}: $${pricing.InputUSDPer1M}/$${pricing.OutputUSDPer1M} per 1M tokens`);
      insertedCount++;

    } catch (error) {
      console.error(`❌ Error adding ${pricing.Provider}/${pricing.ModelID}:`, error);
      errorCount++;
    }
  }

  console.log('\n📈 Pricing update summary:');
  console.log(`✅ Inserted: ${insertedCount} models`);
  console.log(`⏭️  Skipped: ${skippedCount} models (already existed)`);
  console.log(`❌ Errors: ${errorCount} models`);
  
  if (insertedCount > 0) {
    console.log('\n🎉 Pricing database successfully updated with latest 2025 pricing!');
  }

  // Display provider summary
  const providerCounts = PRICING_DATA_2025.reduce((acc, pricing) => {
    acc[pricing.Provider] = (acc[pricing.Provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📊 Models by provider:');
  Object.entries(providerCounts).forEach(([provider, count]) => {
    console.log(`  ${provider}: ${count} models`);
  });
}

async function main() {
  try {
    await updatePricing();
  } catch (error) {
    console.error('💥 Fatal error during pricing update:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { updatePricing, PRICING_DATA_2025 };