# MyModelArena

A web application to generate, manage, execute, and evaluate custom evaluation sets (evals) for Large Language Models (LLMs).

## Features

*   **Model Management:** Configure connections to 100+ LLMs through LiteLLM proxy with automatic pricing.
*   **Eval Generation:** Use any supported LLM to generate eval questions based on prompts.
*   **Eval Management:** Store, browse, search, tag, and edit eval sets and questions.
*   **Eval Execution:** Run eval sets against multiple configured LLMs simultaneously.
*   **Response Scoring:** Manually score responses or use an LLM judge for scoring.
*   **Judge Mode:** Use LLMs to evaluate the quality of the generated eval questions.
*   **Reporting:** View side-by-side results, cost tracking, and model leaderboards.

## Technology Stack

*   **Frontend:** React (Vite), TypeScript, TanStack Query, Zustand, CSS Modules, Recharts, React Select
*   **Backend:** Node.js, Express, TypeScript, Prisma
*   **Database:** SQLite
*   **LLM Integration:** LiteLLM Proxy (supports 100+ providers with unified API)
*   **Tokenizer:** gpt-tokenizer
*   **Testing:** Vitest, React Testing Library, Playwright

## LiteLLM Integration

This application uses [LiteLLM](https://github.com/BerriAI/litellm) proxy to provide unified access to 100+ LLM providers including:
- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude models)
- Google (Gemini models)
- Mistral AI models
- Groq models
- DeepSeek models
- And many more...

The LiteLLM proxy simplifies model management and provides:
- **Unified API**: Single OpenAI-compatible interface for all providers
- **Real-time Pricing**: Automatic cost calculation based on latest provider pricing
- **Model Discovery**: Dynamic fetching of available models and their capabilities
- **Built-in Reliability**: Automatic retries, fallbacks, and error handling

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd mymodelarena
    ```
2.  **Environment Variables:**
    *   Copy the `.env.example` file to `.env` in the project root: `cp .env.example .env`
    *   Edit the `.env` file:
        *   Verify `DATABASE_URL` (default should be fine: `file:./server/prisma/dev.db`).
        *   Verify `PORT` (default: `3001`).
        *   **LiteLLM Configuration:**
            *   Set `LITELLM_MASTER_KEY` to your LiteLLM proxy master key
            *   Set `LITELLM_PROXY_URL` if using a custom proxy (defaults to the provided proxy)
        *   **Optional:** For direct provider access (legacy), you can still set individual API keys (e.g., `OPENAI_API_KEY=sk-xxx...`)
3.  **Install Server Dependencies:**
    ```bash
    cd server
    npm install
    ```
4.  **Run Database Migrations:**
    ```bash
    # Still inside the server/ directory
    npx prisma migrate dev
    # You might be prompted to name the initial migration (e.g., "init")
    # Prisma generate should run automatically after migrate
    ```
5.  **Install Client Dependencies:**
    ```bash
    cd ../client 
    npm install
    ```

## Running the Application

1.  **Start the Backend Server:**
    *   From the `server/` directory:
    ```bash
    npm run dev # Or configure a start script (e.g., using ts-node or compiled output)
    ```
    *   The server should start on the port specified in `.env` (default: 3001).
2.  **Start the Frontend Client:**
    *   From the `client/` directory (in a separate terminal):
    ```bash
    npm run dev
    ```
    *   The client development server should start (usually on port 5173) and open in your browser.

## API Endpoints

### LiteLLM Integration Endpoints
- `GET /api/litellm/models` - Get all available models from LiteLLM proxy
- `GET /api/litellm/models/:modelName` - Get detailed info for a specific model
- `POST /api/litellm/test-connection` - Test connection to LiteLLM proxy

### Model Management
- `GET /api/models/suggested` - Get suggested models with pricing from LiteLLM
- `POST /api/models` - Create a new model (auto-fetches pricing from LiteLLM)
- `GET /api/models` - List all configured models
- `GET /api/models/:id` - Get specific model details
- `PUT /api/models/:id` - Update model configuration
- `DELETE /api/models/:id` - Delete model

### Eval Management & Execution
- `POST /api/evals` - Generate new eval set
- `POST /api/evals/:id/runs` - Execute eval against models
- `GET /api/evals/runs/:id/results` - Get eval run results

## Running Tests

*   **Backend Unit Tests:**
    *   From the `server/` directory: `npm test` (requires configuring test script in `server/package.json` for Vitest/Jest)
*   **Frontend Unit/Component Tests:**
    *   From the `client/` directory: `npm test` or `npm run test:ui`
*   **End-to-End Tests:**
    *   Ensure both client and server are running.
    *   From the `client/` directory: `npx playwright test` or `npx playwright test --ui` 