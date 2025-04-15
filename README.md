# MyModelArena

A web application to generate, manage, execute, and evaluate custom evaluation sets (evals) for Large Language Models (LLMs).

## Features

*   **Model Management:** Configure connections to different LLMs (name, base URL, API key env var, pricing).
*   **Eval Generation:** Use LLMs to generate eval questions based on prompts.
*   **Eval Management:** Store, browse, search, tag, and edit eval sets and questions.
*   **Eval Execution:** Run eval sets against multiple configured LLMs simultaneously.
*   **Response Scoring:** Manually score responses or use an LLM judge for scoring.
*   **Judge Mode:** Use LLMs to evaluate the quality of the generated eval questions.
*   **Reporting:** View side-by-side results, cost tracking, and model leaderboards.

## Technology Stack

*   **Frontend:** React (Vite), TypeScript, TanStack Query, Zustand, CSS Modules, Recharts, React Select
*   **Backend:** Node.js, Express, TypeScript, Prisma
*   **Database:** SQLite
*   **LLM Interaction:** OpenAI API protocol assumption
*   **Tokenizer:** gpt-tokenizer
*   **Testing:** Vitest, React Testing Library, Playwright

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
        *   For each LLM you want to use, add its API key as an environment variable (e.g., `MY_OPENAI_KEY=sk-xxx...`).
        *   **Important:** Update the corresponding `*_API_KEY_ENV_VAR` variables in `.env` to match the names of the variables you just added (e.g., `OPENAI_API_KEY_ENV_VAR=MY_OPENAI_KEY`). The application reads the *name* from this variable to find the actual key in the environment.
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

## Running Tests

*   **Backend Unit Tests:**
    *   From the `server/` directory: `npm test` (requires configuring test script in `server/package.json` for Vitest/Jest)
*   **Frontend Unit/Component Tests:**
    *   From the `client/` directory: `npm test` or `npm run test:ui`
*   **End-to-End Tests:**
    *   Ensure both client and server are running.
    *   From the `client/` directory: `npx playwright test` or `npx playwright test --ui` 