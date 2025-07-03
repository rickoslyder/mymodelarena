import { Page } from '@playwright/test';

// Test data configuration
export const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:3000/api',
  timeout: 30000,
};

export const TEST_DATA = {
  models: {
    testModel: {
      name: 'E2E Test Model',
      modelIdentifier: 'gpt-3.5-turbo-test',
      provider: 'openai',
    }
  },
  evals: {
    testEval: {
      name: 'E2E Test Evaluation',
      description: 'Test evaluation for E2E testing',
    }
  },
  templates: {
    testTemplate: {
      name: 'E2E Test Template',
      description: 'Test template for E2E testing',
      category: 'test',
      prompt: 'Generate {{numQuestions}} test questions about {{topic}}',
    }
  }
};

/**
 * Setup test data via API calls
 */
export class TestDataManager {
  private static createdIds: {
    models: string[];
    evals: string[];
    templates: string[];
  } = {
    models: [],
    evals: [],
    templates: [],
  };

  /**
   * Create a test model via API
   */
  static async createTestModel(page: Page, modelData = TEST_DATA.models.testModel) {
    try {
      const response = await page.request.post(`${TEST_CONFIG.apiUrl}/models`, {
        data: {
          name: modelData.name,
          modelIdentifier: modelData.modelIdentifier,
          provider: modelData.provider,
          inputTokenCost: 0.001,
          outputTokenCost: 0.002,
        }
      });

      if (response.ok()) {
        const data = await response.json();
        if (data.success && data.data?.id) {
          this.createdIds.models.push(data.data.id);
          return data.data.id;
        }
      }
      throw new Error(`Failed to create test model: ${response.status()}`);
    } catch (error) {
      console.warn('Could not create test model via API:', error);
      return null;
    }
  }

  /**
   * Create a test evaluation via API
   */
  static async createTestEval(page: Page, evalData = TEST_DATA.evals.testEval) {
    try {
      const response = await page.request.post(`${TEST_CONFIG.apiUrl}/evals`, {
        data: {
          name: evalData.name,
          description: evalData.description,
          questions: [
            { text: 'What is 2 + 2?' },
            { text: 'What is the capital of France?' },
            { text: 'Explain photosynthesis.' },
          ]
        }
      });

      if (response.ok()) {
        const data = await response.json();
        if (data.success && data.data?.id) {
          this.createdIds.evals.push(data.data.id);
          return data.data.id;
        }
      }
      throw new Error(`Failed to create test eval: ${response.status()}`);
    } catch (error) {
      console.warn('Could not create test eval via API:', error);
      return null;
    }
  }

  /**
   * Create a test template via API
   */
  static async createTestTemplate(page: Page, templateData = TEST_DATA.templates.testTemplate) {
    try {
      const response = await page.request.post(`${TEST_CONFIG.apiUrl}/templates`, {
        data: {
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          prompt: templateData.prompt,
          isPublic: true,
          tags: ['test', 'e2e'],
        }
      });

      if (response.ok()) {
        const data = await response.json();
        if (data.success && data.data?.id) {
          this.createdIds.templates.push(data.data.id);
          return data.data.id;
        }
      }
      throw new Error(`Failed to create test template: ${response.status()}`);
    } catch (error) {
      console.warn('Could not create test template via API:', error);
      return null;
    }
  }

  /**
   * Clean up all created test data
   */
  static async cleanup(page: Page) {
    console.log('Cleaning up test data...');
    
    // Clean up models
    for (const modelId of this.createdIds.models) {
      try {
        await page.request.delete(`${TEST_CONFIG.apiUrl}/models/${modelId}`);
      } catch (error) {
        console.warn(`Could not delete model ${modelId}:`, error);
      }
    }

    // Clean up evals
    for (const evalId of this.createdIds.evals) {
      try {
        await page.request.delete(`${TEST_CONFIG.apiUrl}/evals/${evalId}`);
      } catch (error) {
        console.warn(`Could not delete eval ${evalId}:`, error);
      }
    }

    // Clean up templates
    for (const templateId of this.createdIds.templates) {
      try {
        await page.request.delete(`${TEST_CONFIG.apiUrl}/templates/${templateId}`);
      } catch (error) {
        console.warn(`Could not delete template ${templateId}:`, error);
      }
    }

    // Reset tracking
    this.createdIds = { models: [], evals: [], templates: [] };
  }

  /**
   * Wait for server to be ready
   */
  static async waitForServer(page: Page, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await page.request.get(`${TEST_CONFIG.apiUrl}/health`);
        if (response.ok()) {
          console.log('Server is ready');
          return true;
        }
      } catch {
        // Server not ready yet
      }
      
      console.log(`Waiting for server... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server did not become ready within timeout');
  }
}

/**
 * Helper functions for common test actions
 */
export class TestHelpers {
  /**
   * Navigate and wait for page to be fully loaded
   */
  static async navigateAndWait(page: Page, path: string) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  /**
   * Fill form field by name attribute
   */
  static async fillField(page: Page, name: string, value: string) {
    await page.locator(`[name="${name}"]`).fill(value);
  }

  /**
   * Select option by value
   */
  static async selectOption(page: Page, selector: string, value: string) {
    await page.locator(selector).selectOption(value);
  }

  /**
   * Click button and wait for navigation
   */
  static async clickAndWaitForNavigation(page: Page, buttonText: string) {
    await Promise.all([
      page.waitForNavigation(),
      page.getByRole('button', { name: buttonText }).click(),
    ]);
  }

  /**
   * Wait for toast message to appear
   */
  static async waitForToast(page: Page, message?: string) {
    const toast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
    await toast.first().waitFor({ state: 'visible', timeout: 10000 });
    
    if (message) {
      await page.getByText(message).waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  /**
   * Wait for loading to complete
   */
  static async waitForLoadingToComplete(page: Page) {
    // Wait for any loading spinners to disappear
    await page.locator('.loading, [data-testid="loading"], .spinner').waitFor({ 
      state: 'hidden', 
      timeout: 15000 
    }).catch(() => {
      // Ignore timeout - loading spinner might not exist
    });
  }
}