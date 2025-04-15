Okay, here is the planning phase followed by the full technical specification for "MyModelArena".

<specification_planning>

**1. Core System Architecture and Key Workflows**

* **Goal:** Define the overall structure and primary user journeys.
* **Steps:**
    * Describe the application as a web-based tool for LLM evaluation management.
    * Outline main user workflows:
        1.  Configure Models (CRUD operations for LLM connection details, pricing).
        2.  Generate Evals (Select LLM(s), provide prompt/config, store questions).
        3.  Manage Evals (Browse, search, tag, version, edit, delete evals/questions).
        4.  Execute Evals (Select eval, select target LLM(s), run async, store responses/tokens/cost/errors).
        5.  Score Responses (Manual rating or LLM-based scoring of model answers).
        6.  Judge Questions (Use LLM(s) to rate quality of generated eval questions).
        7.  View Reports (Compare model performance, costs, judge ratings via tables/charts/leaderboard).
    * Define Architecture:
        * Frontend: React Single Page Application (SPA) using Client Components primarily, potentially Server Components for initial list views.
        * Backend: Node.js RESTful API server using Express.js.
        * Database: SQLite file.
        * LLM Interaction: Direct API calls from the backend server to configured LLM endpoints (using OpenAI protocol).
        * Async Processing: Handled within API route handlers using `async/await` and `Promise.allSettled` for parallel LLM calls. No external queue needed for V1 single-user.
* **Challenges:** Ensuring smooth data flow between frontend, backend, and LLM APIs. Managing asynchronous operations state effectively in the UI.
* **Clarifications Needed:** None immediately, assumptions for V1 seem reasonable.
* **Edge Cases:** Network interruptions during LLM calls, SQLite DB locking under potential (though unlikely for single user) concurrent access, very large text inputs/outputs exceeding limits.

**2. Project Structure and Organization**

* **Goal:** Define the layout of the codebase for clarity and maintainability.
* **Steps:** Propose a standard structure:
    ```
    mymodelarena/
    ├── client/         # React Frontend
    │   ├── public/
    │   ├── src/
    │   │   ├── assets/
    │   │   ├── components/ # Reusable UI components (dumb)
    │   │   │   ├── common/     # Buttons, Inputs, Modals etc.
    │   │   │   └── layout/     # Sidebar, Header, PageWrapper etc.
    │   │   ├── features/   # Feature-specific components & logic
    │   │   │   ├── ModelManagement/
    │   │   │   ├── EvalGeneration/
    │   │   │   └── ... (other features)
    │   │   ├── hooks/      # Custom React hooks
    │   │   ├── contexts/   # React context providers (if used)
    │   │   ├── lib/        # Client-side helpers, API client
    │   │   ├── pages/      # Top-level page components / Routes
    │   │   ├── styles/     # Global styles, themes
    │   │   ├── types/      # TypeScript type definitions
    │   │   └── App.tsx     # Main application component
    │   │   └── index.tsx   # Entry point
    │   ├── package.json
    │   └── tsconfig.json
    ├── server/         # Node.js Backend
    │   ├── src/
    │   │   ├── config/     # App configuration (ports, keys via env)
    │   │   ├── controllers/ # Request handlers, business logic
    │   │   ├── db/         # Database setup, migrations (if tool used), schema
    │   │   │   └── prisma/   # Prisma schema, client generation
    │   │   ├── middleware/ # Express middleware (logging, error handling)
    │   │   ├── models/     # Data structures/validation (could be Prisma models)
    │   │   ├── routes/     # API route definitions
    │   │   ├── services/   # External service interactions (LLMs, tokenizers)
    │   │   ├── utils/      # Helper functions
    │   │   └── server.ts   # Server entry point
    │   ├── package.json
    │   └── tsconfig.json
    └── .env            # Environment variables (API keys, DB path)
    └── .gitignore
    └── README.md
    ```
* **Challenges:** Maintaining consistency across features. Preventing components from becoming too large.
* **Clarifications Needed:** Confirm if monorepo tooling (like Turborepo/Nx) is desired, or if separate `client`/`server` is sufficient (Assuming separate is fine for V1).

**3. Detailed Feature Specifications**

* **Goal:** Break down each feature from the request into actionable steps.
* **Steps:** For each feature (Model Management, Eval Generation, Eval Storage/Mgmt, Eval Execution, Response Scoring, Judge Mode, Results/Reporting, Token/Cost Tracking):
    * Define User Story (e.g., "As a user, I want to add a new LLM configuration so I can use it for generation and execution.").
    * Detail Frontend Implementation (Components needed, state management, API calls).
    * Detail Backend Implementation (API endpoint, controller logic, service calls, DB interactions).
    * Specify Error Handling (API errors, validation errors, LLM errors, UI feedback).
    * Identify Edge Cases (Empty inputs, invalid URLs/keys, duplicate names, rate limits).
* **Challenges:** Handling the complexity of multi-LLM parallel execution and result aggregation. Designing intuitive forms for complex configurations (Eval Gen, Scoring, Judging prompts). Visualizing comparison data effectively.
* **Solutions:** Use loading states extensively. Provide clear error messages. Break complex forms into steps or sections. Use libraries for tables and charts.

**4. Database Schema Design**

* **Goal:** Define the structure for storing application data persistently.
* **Steps:**
    * Choose ORM/Tool: Prisma with SQLite provider.
    * Define Models/Tables: `Models`, `Evals`, `Questions`, `Tags`, `EvalTags` (join), `EvalRuns`, `Responses`, `Scores`, `Judgments`.
    * Specify Fields: Name, type (Prisma types mapping to SQLite: `String`, `Int`, `Float`, `Boolean`, `DateTime`), constraints (`@id`, `@default`, `@unique`, `@relation`), indices (`@index`).
    * Define Relationships: One-to-Many (Model -> EvalRun), Many-to-Many (Eval -> Tag).
    * Consider Versioning: Add `version` field and potentially `originalQuestionId` to `Questions` table for simple tracking.
* **Challenges:** Secure API key storage (decided against DB storage, use env vars). Efficiently querying potentially large `Responses` table. Handling schema migrations in SQLite (Prisma Migrate helps).
* **Edge Cases:** Deleting a Model/Eval should cascade deletes or prevent deletion if dependencies exist (define behavior).

**5. Server Actions and Integrations**

* **Goal:** Define backend logic, database operations, and external API calls.
* **Steps:**
    * *Database Actions (using Prisma):* Define functions for CRUD operations on each model (e.g., `createModel(data)`, `findManyEvals({ where, include })`, `updateResponse(id, data)`). Specify input/output types.
    * *LLM Service:* Create a service module (`llmService.ts`) to handle interactions.
        * Function to fetch response: `getLLMCompletion(modelConfig, prompt, options)`. Takes model URL/key, prompt text/structure. Uses `node-fetch` or `axios`. Handles authentication header. Implements basic retry logic for transient errors.
        * Standardize error handling from API calls (catch network errors, parse API error responses).
    * *Tokenizer Service:* Create a service module (`tokenizerService.ts`) using `gpt-tokenizer`.
        * Function: `countTokens(text)`.
        * Function: `isWithinTokenLimit(text, limit)`.
    * *Cost Calculation Utility:* Create `costUtils.ts`.
        * Function: `calculateCost(modelPricing, inputTokens, outputTokens)`.
    * *Async Handling:* Use `Promise.allSettled` in controllers when calling multiple LLMs for execution or judging to ensure all requests complete or fail independently. Aggregate results/errors.
* **Challenges:** Ensuring compatibility with slight variations in OpenAI protocol adherence across different models (may need adapters later). Handling rate limits gracefully. Managing API key security (pass from env vars, don't expose).
* **Edge Cases:** LLM response format variations, timeouts, content filtering flags from LLMs.

**6. Design System and Component Architecture**

* **Goal:** Define the visual language and reusable UI building blocks.
* **Steps:**
    * *Visual Style:* Define primary color (e.g., `#3B82F6` - blue), grays for text/borders, status colors (green, red, yellow). Choose a clean sans-serif font (e.g., Inter). Define spacing scale (e.g., 4px base). Use CSS Modules for styling.
    * *Core Components (`client/src/components/common`):* `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Modal`, `Table`, `Card`, `Spinner`, `ErrorMessage`, `TagChip`, `ProgressBar`. Define basic props (variant, size, disabled, onClick etc.) using TypeScript interfaces. Define interactive states (:hover, :active, :disabled).
    * *Layout Components (`client/src/components/layout`):* `Sidebar` (navigation links), `Header` (maybe breadcrumbs/title), `PageWrapper` (consistent padding/max-width).
    * *Feature Components (`client/src/features/*`):* Compose core components for specific feature UIs (e.g., `ModelForm`, `EvalRunTable`, `JudgeModeConfig`).
* **Challenges:** Maintaining visual consistency. Ensuring accessibility (semantic HTML, ARIA attributes where needed). Making components flexible yet simple.

**7. Data Flow and State Management**

* **Goal:** Define how data moves through the application and how state is managed.
* **Steps:**
    * *Server -> Client:* Backend API serves JSON data. Frontend fetches using `Workspace` API wrapped in a custom hook or library (TanStack Query recommended for caching, auto-refetching, request state).
    * *Client State:*
        * Local Component State (`useState`): For transient UI state like form inputs, modal visibility.
        * Global State (Zustand recommended): For state shared across features, e.g., list of configured models (to avoid re-fetching), potentially user settings.
        * Server Cache State (TanStack Query): Manages caching, background updates, and request status (loading, error, success) for data fetched from the backend.
    * *Props Drilling:* Pass data down from page/feature components to child components via props. Avoid excessive drilling by composing components logically or using state management where appropriate.
    * *Async Data Handling:* Use TanStack Query's state flags (`isLoading`, `isError`, `error`, `data`) to drive UI updates (show spinners, error messages, or results).
* **Challenges:** Keeping server cache state synchronized. Managing loading/error states consistently across the app. Deciding what belongs in global vs. local state.

**8. Testing Strategy**

* **Goal:** Define how the application's correctness and reliability will be ensured.
* **Steps:**
    * *Unit Tests (Backend):* Use Jest/Vitest. Test utility functions (cost calc, validation), service logic (mocking DB and external APIs), controller input/output validation. Aim for good coverage of business logic.
    * *Unit/Integration Tests (Frontend):* Use Jest/Vitest with React Testing Library. Test individual components' rendering based on props, basic interactions (button clicks), custom hook logic. Mock API calls.
    * *End-to-End (E2E) Tests:* Use Playwright or Cypress. Define key user flow tests:
        1.  Add/Edit/Delete LLM Model.
        2.  Generate an Eval using a model.
        3.  Run the generated Eval against one or more models.
        4.  View the Eval Run results table.
        5.  Apply manual scoring to a response.
        6.  Initiate Judge Mode on an Eval.
        7.  View Judge Mode results.
        8.  Check leaderboard/reporting page renders.
    * *Manual Testing:* Perform exploratory testing, especially around UI interactions, different LLM configurations, and error scenarios.
* **Challenges:** Mocking LLM responses effectively for tests. Setting up and maintaining E2E tests can be time-consuming. Testing async UI states. SQLite in tests (use in-memory mode or test-specific file).

</specification_planning>

---

```markdown
# MyModelArena Technical Specification

## 1. System Overview

* **Core Purpose:** A web application for developers (initially single-user) to create, manage, execute, and analyze custom evaluations (evals) for various Large Language Models (LLMs). It facilitates comparing LLM performance on bespoke tasks, assessing LLM capabilities in generating quality questions, and tracking associated API costs.
* **Key Workflows:**
    1.  **Model Configuration:** Add, view, edit, and delete LLM configurations including name, base URL, API key (via env var), and pricing details.
    2.  **Eval Generation:** Select configured LLM(s), provide a prompt and structured configuration (type, topic, difficulty), generate a set of questions, and store them as an eval set with metadata and tags.
    3.  **Eval Management:** Browse, search, filter (by tag, difficulty, etc.), view details, edit metadata/questions, manage tags, and delete eval sets. Includes simple version tracking for edits.
    4.  **Eval Execution:** Select an eval set, select one or more target LLMs, run the evaluation asynchronously, and store responses, errors, token counts, and calculated costs for each question/model combination in an execution run record.
    5.  **Response Scoring:** After execution, manually score responses (e.g., rating) or configure an LLM to act as a "Scoring Judge" based on a provided rubric/prompt, storing the scores and justifications.
    6.  **Judge Mode:** Select an eval set, select one or more LLMs as "Judges", provide instructions/criteria (predefined or freeform), and have the judges evaluate the quality of the eval *questions*, storing ratings and justifications.
    7.  **Reporting:** View detailed execution run results (side-by-side responses, scores, costs), judge mode results, aggregated cost/token reports, and leaderboards comparing models based on performance metrics.
* **System Architecture:**
    * **Frontend:** React SPA (Vite build tool recommended). Primarily Client Components using TypeScript. Styling via CSS Modules. State management via Zustand and TanStack Query. Routing via `react-router-dom`.
    * **Backend:** Node.js RESTful API server using Express.js and TypeScript. ORM: Prisma. Handles business logic, interacts with the database, and orchestrates calls to external LLM APIs.
    * **Database:** SQLite database file. Schema managed by Prisma Migrate.
    * **LLM Interaction:** Backend makes HTTPS requests to configured LLM API endpoints following the OpenAI API protocol. Uses `node-fetch` or `axios`. Authentication via API keys stored in server environment variables.
    * **Tokenization/Costing:** Backend uses `gpt-tokenizer` library for token counting and calculates costs based on stored model pricing.
    * **Asynchronous Operations:** Handled via `async/await` in Express controllers. Parallel LLM calls utilize `Promise.allSettled`. No external message queue for V1.

## 2. Project Structure

```
mymodelarena/
├── client/         # React Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/         # Static assets (images, fonts)
│   │   ├── components/     # Reusable UI components
│   │   │   ├── common/     # Generic: Button, Input, Modal, Table, Spinner, ErrorMessage, TagChip etc.
│   │   │   └── layout/     # Structure: Sidebar, Header, PageWrapper etc.
│   │   ├── features/       # Feature-specific components, hooks, logic
│   │   │   ├── ModelManagement/  # Components: ModelForm, ModelList, ModelListItem
│   │   │   ├── EvalGeneration/   # Components: EvalGenForm, StructuredOptions
│   │   │   ├── EvalManagement/   # Components: EvalList, EvalDetailView, QuestionEditForm, TagManager
│   │   │   ├── EvalExecution/    # Components: EvalRunConfig, EvalRunProgress, EvalResultsTable
│   │   │   ├── ResponseScoring/  # Components: ManualScoreInput, LLMScoreConfig, ScoreDisplay
│   │   │   ├── JudgeMode/        # Components: JudgeModeConfig, JudgeResultsDisplay
│   │   │   └── Reporting/        # Components: Leaderboard, CostReport, TokenUsageChart
│   │   ├── hooks/          # Custom React hooks (e.g., useDebounce, useAPI)
│   │   ├── contexts/       # Zustand stores / React Context (if needed)
│   │   ├── lib/            # Client-side helpers (e.g., api.ts - fetch wrapper, formatters)
│   │   ├── pages/          # Top-level route components (e.g., HomePage, ModelsPage, EvalsPage)
│   │   ├── styles/         # Global CSS, theme variables, base styles
│   │   ├── types/          # Shared TypeScript interfaces/types
│   │   └── App.tsx         # Main application component, router setup
│   │   └── main.tsx        # React entry point
│   ├── .env.development # Client-side env vars (if any)
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/         # Node.js Backend (Express)
│   ├── src/
│   │   ├── config/         # Load environment variables (dotenv), app constants
│   │   ├── controllers/    # Route handlers implementing business logic
│   │   ├── db/             # Prisma schema, client instance, migration files
│   │   │   └── prisma/
│   │   │       └── schema.prisma
│   │   ├── middleware/     # Express middleware (e.g., request logging, error handling, apiKeyAuth - if needed later)
│   │   ├── routes/         # API route definitions (e.g., models.routes.ts, evals.routes.ts)
│   │   ├── services/       # External interactions (LlmService, TokenizerService)
│   │   ├── utils/          # Utility functions (e.g., error formatting, cost calculation)
│   │   └── server.ts       # Express app setup and server start
│   ├── package.json
│   └── tsconfig.json
├── .env            # Server environment variables (DATABASE_URL, LLM_API_KEYS_if_centralized - better per model)
├── .gitignore
└── README.md
```

## 3. Feature Specification

### 3.1 Model Management (CRUD)

* **User Story:** As a user, I want to add, view, edit, and delete LLM configurations so I can use different models in the application and track their costs accurately.
* **Frontend:**
    * `pages/ModelsPage.tsx`: Fetches and displays list of models using `features/ModelManagement/ModelList`. Includes button to open add/edit modal.
    * `features/ModelManagement/ModelList.tsx`: Renders a table or list of `ModelListItem` components.
    * `features/ModelManagement/ModelListItem.tsx`: Displays model name, base URL (partial?), edit/delete buttons.
    * `features/ModelManagement/ModelForm.tsx`: Modal form with fields for Name (text, required), Base URL (url, required), API Key Env Var Name (text, required - *stores the name of the env var, not the key itself*), Input Token Cost (number, required, >0), Output Token Cost (number, required, >0). Uses local state for inputs, calls API on submit via `lib/api.ts`.
* **Backend:**
    * `routes/models.routes.ts`: Defines `/api/models` endpoints (GET /, POST /, GET /:id, PUT /:id, DELETE /:id).
    * `controllers/modelController.ts`:
        * `getAllModels`: Fetches all models from DB (excluding sensitive fields if any).
        * `getModelById`: Fetches single model.
        * `createModel`: Validates input data (name unique, costs > 0). Retrieves actual API key from `process.env[apiKeyEnvVarName]`. *Does NOT store the key in DB*. Stores config (including env var name) in DB via Prisma. Returns created model data.
        * `updateModel`: Validates input. Updates model config in DB.
        * `deleteModel`: Deletes model from DB. Add check for dependencies (e.g., existing eval runs using this model - maybe prevent deletion or warn).
* **Error Handling:** Validate inputs frontend/backend. Handle API errors during save/delete. Handle case where env var for API key is not set on server. Display clear error messages in UI.
* **Edge Cases:** Duplicate model names, invalid URLs, negative costs, deleting a model used in past runs. Env var name mismatch.

### 3.2 Eval Generation

* **User Story:** As a user, I want to select an LLM, provide instructions and configuration, and have the system generate a set of evaluation questions based on my input.
* **Frontend:**
    * `pages/EvalGenerationPage.tsx` or Modal: Contains `features/EvalGeneration/EvalGenForm`.
    * `features/EvalGeneration/EvalGenForm.tsx`:
        * Select field for choosing the "Generator" LLM (from configured models).
        * Textarea for the main generation prompt.
        * `StructuredOptions` component: Checkboxes for Type Tags (logic, coding, etc.), text input for Topic, select for Difficulty (easy, medium, hard).
        * Number input for Number of Questions (default 10).
        * Submit button triggers API call. Displays loading state during generation. Handles success (e.g., navigate to new eval detail) or error messages.
* **Backend:**
    * `routes/evals.routes.ts`: Defines `POST /api/evals/generate`.
    * `controllers/evalController.ts`: `generateEvalSet` function.
        * Retrieves Generator LLM config (including API key from env var).
        * Constructs a detailed prompt for the LLM incorporating user prompt and structured options (e.g., "Generate {N} {difficulty} questions about {topic} covering aspects of {types}. Output as a numbered list.").
        * Calls `LlmService.getLLMCompletion`.
        * Parses the LLM response to extract questions (e.g., split by newline, remove numbering). Handles potential parsing errors if LLM output format is unexpected.
        * Creates a new `Eval` record in DB with metadata (generator LLM ID, prompt used, config options).
        * Creates associated `Question` records linked to the new `Eval`.
        * Returns the created `Eval` ID or object.
* **Error Handling:** LLM API errors (timeout, rate limit, invalid key, content filtering), network errors. LLM response parsing errors. DB save errors. Provide feedback to user (e.g., "Generation failed: LLM timed out", "Generation failed: Could not parse response").
* **Edge Cases:** LLM generates fewer questions than requested, LLM response is malformed, generation prompt is too long for LLM context window. User provides nonsensical input.

### 3.3 Eval Storage & Management

* **User Story:** As a user, I want to browse, search, filter, view details of, edit, and delete my evaluation sets and their questions, and organize them using tags.
* **Frontend:**
    * `pages/EvalsListPage.tsx`: Displays list/table of evals using `features/EvalManagement/EvalList`. Includes search bar, filters (dropdowns/multi-select for tags, difficulty).
    * `features/EvalManagement/EvalList.tsx`: Fetches evals based on filters/search. Renders list items linking to detail view.
    * `pages/EvalDetailPage.tsx`: Displays eval metadata (name, description, tags, difficulty, generator LLM, timestamp). Shows list of questions. Allows editing metadata. Allows adding/removing tags via `TagManager`. Allows editing/deleting individual questions (`QuestionEditForm`).
    * `features/EvalManagement/QuestionEditForm.tsx`: Simple form (likely modal) to edit question text. Saves changes via API. Tracks version implicitly via `updatedAt` or explicit `version` field bump.
    * `features/EvalManagement/TagManager.tsx`: Component to view, add, and remove tags for an eval (multi-select dropdown with create option).
* **Backend:**
    * `routes/evals.routes.ts`: Endpoints for CRUD on Evals (GET /, POST /, GET /:id, PUT /:id, DELETE /:id), Questions (PUT /:evalId/questions/:questionId, DELETE /:evalId/questions/:questionId), Tags (GET /tags, POST /tags, PUT /evals/:id/tags).
    * `controllers/evalController.ts`, `controllers/questionController.ts`, `controllers/tagController.ts`: Implement logic using Prisma to fetch (with filtering/searching on name/tags), create, update (metadata, question text, tags), and delete evals/questions/tags. Handle tag associations using `EvalTags` join table.
* **Error Handling:** DB errors, validation errors (e.g., empty question text), trying to edit/delete non-existent items.
* **Edge Cases:** Searching with no results, filtering complexity, large number of evals/questions (implement pagination on backend/frontend), concurrent edits (last write wins is acceptable for V1 single user).

### 3.4 Eval Execution

* **User Story:** As a user, I want to select an eval set, choose one or more LLMs to test against, run the evaluation, and see the progress and final results including responses, errors, tokens, and costs.
* **Frontend:**
    * `pages/EvalRunPage.tsx` or initiated from `EvalDetailPage`: Contains `features/EvalExecution/EvalRunConfig`.
    * `features/EvalExecution/EvalRunConfig.tsx`: Allows selecting the Eval set (if not already selected). Provides multi-select checklist for choosing Target LLMs from configured list. Start button triggers API call.
    * `features/EvalExecution/EvalRunProgress.tsx`: Displays progress during execution (e.g., "Running question 5/10 on Model A..."). Updates based on backend status or polling. Shows overall status (Running, Completed, Failed).
    * `features/EvalExecution/EvalResultsTable.tsx`: Displays results after completion (covered in Reporting).
* **Backend:**
    * `routes/evalRuns.routes.ts`: Defines `POST /api/eval-runs`. Maybe GET endpoint for status polling if needed.
    * `controllers/evalRunController.ts`: `createEvalRun` function.
        * Creates an `EvalRun` record in DB (status: PENDING/RUNNING).
        * Retrieves the questions for the selected `Eval`.
        * Retrieves configs for selected Target LLMs (including API keys from env vars).
        * Iterates through each question:
            * For each question, iterates through each selected Target LLM.
            * Calls `LlmService.getLLMCompletion` for the (question, target LLM) pair **asynchronously**. Use `Promise.allSettled` to run calls for all models for a given question in parallel.
            * For each result (settled promise):
                * Counts tokens (`TokenizerService.countTokens`).
                * Calculates cost (`CostUtils.calculateCost`).
                * Stores the response text, input/output tokens, calculated cost, execution time, and any errors (if promise rejected or LLM returned error) in the `Responses` table, linked to the `EvalRun`, `Question`, and `Model`.
                * Update `EvalRun` progress (e.g., increment counter) - potentially using websockets for real-time UI update, or just rely on completion.
        * After all questions/models are processed, update `EvalRun` status to COMPLETED (or FAILED if too many errors occurred).
        * Return the `EvalRun` ID.
* **Error Handling:** Handle errors for *each individual* LLM call (network, API key, rate limit, timeout, content filter). Store these errors per response. Mark `EvalRun` as FAILED only if a significant portion fails or a critical error occurs. Ensure one model failing doesn't stop others. Handle DB errors during response saving.
* **Edge Cases:** No target models selected, eval set has no questions, LLM returns empty response, very long execution time, running multiple evals concurrently (should be handled by async nature, but UI needs clarity).

### 3.5 Response Scoring

* **User Story:** As a user, I want to evaluate the quality of LLM responses either manually or by using another LLM based on specific criteria.
* **Frontend:**
    * Integrated into `EvalResultsTable` or a dedicated scoring view linked from it.
    * `features/ResponseScoring/ManualScoreInput.tsx`: For each response, provides simple controls (e.g., buttons 1-5, Pass/Fail toggle) to assign a manual score. Saves score via API call.
    * `features/ResponseScoring/LLMScoreConfig.tsx`: Button/modal to trigger LLM scoring. Allows selecting the "Scoring Judge" LLM. Provides textarea to input the scoring prompt/rubric. Triggers backend scoring process.
    * `features/ResponseScoring/ScoreDisplay.tsx`: Displays the score (manual or LLM), justification (if LLM), and scorer identity alongside the response. Shows loading/pending state while LLM scoring is in progress.
* **Backend:**
    * `routes/scores.routes.ts`: Defines `POST /api/scores/manual` and `POST /api/scores/llm`.
    * `controllers/scoreController.ts`:
        * `addManualScore`: Receives response ID, score value. Validates input. Creates/updates a `Score` record linked to the `Response`.
        * `triggerLlmScoring`: Receives `EvalRun` ID (or list of Response IDs), Scoring Judge Model ID, and scoring prompt/rubric. *Asynchronously* iterates through specified responses:
            * Constructs a prompt for the Scoring Judge including the original question, the target response, and the user's scoring rubric.
            * Calls `LlmService.getLLMCompletion` using the Scoring Judge LLM.
            * Parses the judge's response to extract score and justification (requires careful prompt engineering).
            * Creates/updates a `Score` record linked to the `Response`, storing the score, justification, and scorer type ('llm') and scorer model ID.
            * Handles errors from the Scoring Judge LLM.
        * Needs a way to report progress/completion back to the frontend (e.g., update score records status, maybe websocket).
* **Error Handling:** Invalid score inputs. LLM Scorer errors (API, parsing response). DB errors. Need to handle state where a response already has a score (overwrite or prevent?).
* **Edge Cases:** Scoring prompt is ineffective/unclear. Scoring LLM fails to provide score/justification in expected format. Scoring a very large number of responses.

### 3.6 Judge Mode (Eval Question Quality Assessment)

* **User Story:** As a user, I want to use LLMs to assess the quality of the questions within my eval sets based on criteria I define.
* **Frontend:**
    * Initiated from `EvalDetailPage`.
    * `features/JudgeMode/JudgeModeConfig.tsx`: Modal or section. Allows selecting one or more "Judge" LLMs. Provides options for judging structure: checkboxes for predefined criteria (Clarity, Difficulty, Relevance, Originality) and/or textarea for freeform justification prompt (e.g., "Rate the quality of this question from 1-10 and explain why."). Start button triggers backend process.
    * `features/JudgeMode/JudgeResultsDisplay.tsx`: Section on `EvalDetailPage` or separate view. Shows each question alongside ratings/justifications from different judges. Allows comparison. Shows loading/pending state during judging.
* **Backend:**
    * `routes/judgments.routes.ts`: Defines `POST /api/judgments`.
    * `controllers/judgmentController.ts`: `triggerJudging` function.
        * Receives `Eval` ID, list of Judge Model IDs, judging config (criteria/prompt).
        * *Asynchronously* iterates through each question in the `Eval`:
            * For each question, iterates through each selected Judge LLM.
            * Constructs a prompt for the Judge LLM including the question text and the judging instructions/criteria.
            * Calls `LlmService.getLLMCompletion` using the Judge LLM.
            * Parses the judge's response to extract scores (per criterion if applicable) and justification.
            * Stores the results in the `Judgments` table, linked to the `Question` and Judge `Model`.
            * Handles errors from Judge LLM.
        * Needs a way to report progress/completion.
* **Error Handling:** LLM Judge errors (API, parsing). DB errors. Ambiguous judging instructions leading to poor results.
* **Edge Cases:** Judging evals with many questions or using many judges. Judge LLM response format inconsistency.

### 3.7 Results & Reporting

* **User Story:** As a user, I want to view detailed results from evaluation runs, compare model performance side-by-side, see judge ratings, track costs, and view leaderboards.
* **Frontend:**
    * `features/EvalExecution/EvalResultsTable.tsx`: Displays data for a completed `EvalRun`. Rows = Questions. Columns = Models tested. Cells show Response text, Score (with justification tooltip if LLM scored), Tokens In/Out, Cost. Allows sorting/filtering within the table.
    * `features/JudgeMode/JudgeResultsDisplay.tsx`: As described above.
    * `pages/ReportingPage.tsx`: Contains components for various reports.
    * `features/Reporting/Leaderboard.tsx`: Fetches aggregated data (e.g., average scores per model across runs, average question quality generated per model based on judgments) and displays in a sorted table.
    * `features/Reporting/CostReport.tsx`: Displays aggregated costs per model, per eval run, or over time. Uses charts (`recharts` or similar library) and tables.
    * `features/Reporting/TokenUsageChart.tsx`: Visualizes token consumption patterns.
* **Backend:**
    * `routes/reports.routes.ts`: Defines endpoints like GET `/api/reports/leaderboard`, GET `/api/reports/costs`, GET `/api/eval-runs/:id/results`.
    * `controllers/reportController.ts`, `controllers/evalRunController.ts`: Implement logic to query and aggregate data from `Responses`, `Scores`, `Judgments`, `Models` tables using Prisma aggregate functions. Calculate averages, sums etc. Format data suitably for frontend display (tables, chart data points). Implement pagination/filtering for large datasets.
* **Error Handling:** DB errors during aggregation. Handling missing data (e.g., models with no runs).
* **Edge Cases:** No data available for reports. Very large datasets requiring efficient aggregation queries. Defining meaningful leaderboard metrics.

## 4. Database Schema (Prisma with SQLite)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL") // e.g., "file:./dev.db"
}

model Model {
  id              String   @id @default(cuid())
  name            String   @unique
  baseUrl         String
  apiKeyEnvVar    String // Name of the env var holding the key
  inputTokenCost  Float    // Cost per 1k input tokens (e.g., 0.001 for $1/M)
  outputTokenCost Float    // Cost per 1k output tokens
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  generatedEvals Eval[]      @relation("GeneratedBy")
  evalResponses  Response[]
  scoresGiven    Score[]     @relation("ScoredByLlm") // Scores given BY this model when acting as scorer
  judgmentsGiven Judgment[]  @relation("JudgedBy") // Judgments given BY this model when acting as judge
}

model Eval {
  id              String   @id @default(cuid())
  name            String?
  description     String?
  generationPrompt String? // The prompt used to generate this eval
  difficulty      String?  // e.g., "easy", "medium", "hard"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  generatorModelId String? // Which model generated this (if any)
  generatorModel   Model?  @relation("GeneratedBy", fields: [generatorModelId], references: [id])

  questions Question[]
  tags      EvalTag[]
  evalRuns  EvalRun[]

  @@index([generatorModelId])
}

model Question {
  id          String   @id @default(cuid())
  evalId      String
  text        String
  version     Int      @default(1) // Simple version counter
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  eval       Eval        @relation(fields: [evalId], references: [id], onDelete: Cascade)
  responses  Response[]
  judgments  Judgment[]

  @@index([evalId])
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  evals EvalTag[]
}

// Explicit many-to-many join table for Evals and Tags
model EvalTag {
  evalId String
  tagId  String
  eval   Eval   @relation(fields: [evalId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([evalId, tagId])
  @@index([tagId])
}

model EvalRun {
  id        String   @id @default(cuid())
  evalId    String
  status    String   // e.g., PENDING, RUNNING, COMPLETED, FAILED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  eval       Eval       @relation(fields: [evalId], references: [id], onDelete: Cascade)
  responses  Response[]

  @@index([evalId])
  @@index([status])
}

model Response {
  id           String   @id @default(cuid())
  evalRunId    String
  questionId   String
  modelId      String   // The model that generated this response
  responseText String?
  error        String?  // Store error message if call failed
  inputTokens  Int?
  outputTokens Int?
  cost         Float?
  executionTimeMs Int?
  createdAt    DateTime @default(now())

  evalRun    EvalRun   @relation(fields: [evalRunId], references: [id], onDelete: Cascade)
  question   Question  @relation(fields: [questionId], references: [id], onDelete: Cascade) // Cascade may be too aggressive? Maybe Restrict.
  model      Model     @relation(fields: [modelId], references: [id], onDelete: Restrict) // Prevent model deletion if responses exist
  scores     Score[]

  @@index([evalRunId])
  @@index([questionId])
  @@index([modelId])
}

model Score {
  id              String   @id @default(cuid())
  responseId      String   @unique // Each response gets max one score record
  scoreValue      Float?   // Could be rating (1-5) or binary (0/1) etc.
  justification   String?  // Primarily for LLM scoring
  scorerType      String   // 'manual' or 'llm'
  scorerLlmId     String?  // Which model did the scoring (if scorerType='llm')
  createdAt       DateTime @default(now())

  response    Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  scorerLlm   Model?   @relation("ScoredByLlm", fields: [scorerLlmId], references: [id], onDelete: SetNull) // If scorer model deleted, keep score but nullify link

  @@index([scorerLlmId])
}

model Judgment {
  id              String   @id @default(cuid())
  questionId      String
  judgeModelId    String   // Which model gave this judgment
  overallScore    Float?   // e.g., 1-10
  // Optional: Store scores per predefined criteria if used
  clarityScore    Float?
  difficultyScore Float?
  relevanceScore  Float?
  originalityScore Float?
  justification   String?
  createdAt       DateTime @default(now())

  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  judgeModel Model    @relation("JudgedBy", fields: [judgeModelId], references: [id], onDelete: Restrict) // Prevent judge model deletion if judgments exist

  @@index([questionId])
  @@index([judgeModelId])
}

```

## 5. Server Actions

### 5.1 Database Actions (Prisma)

* Use Prisma Client for all DB interactions. Examples:
    * `prisma.model.create({ data: { name, baseUrl, apiKeyEnvVar, ... } })`
    * `prisma.eval.findMany({ where: { name: { contains: searchTerm }, tags: { some: { tagId: { in: tagIds } } } }, include: { tags: true, questions: true } })`
    * `prisma.response.create({ data: { evalRunId, questionId, modelId, responseText, inputTokens, outputTokens, cost, error } })`
    * `prisma.score.upsert({ where: { responseId }, update: { scoreValue, justification, ... }, create: { responseId, scoreValue, ... } })`
    * `prisma.judgment.create({ data: { questionId, judgeModelId, overallScore, justification, ... } })`
* Implement within controller functions or dedicated service modules if logic becomes complex.
* Input/Output: Use TypeScript interfaces matching Prisma model shapes, potentially omitting sensitive fields.

### 5.2 Other Actions

* **LlmService (`services/llmService.ts`):**
    * `async getLLMCompletion(model: Model, prompt: string | object, options?: { temperature?: number, max_tokens?: number }): Promise<{ responseText?: string; error?: string; inputTokens?: number; outputTokens?: number; executionTimeMs?: number }>`
        * Retrieve API key: `const apiKey = process.env[model.apiKeyEnvVar];` (Handle missing key error).
        * Construct request body based on OpenAI spec (e.g., `{ model: 'effective-model-name' | null, messages: [{ role: 'user', content: prompt }], ...options }`). *Note: Actual model name might not be needed if Base URL points directly to a model endpoint.*
        * Use `node-fetch`: `const startTime = Date.now(); try { const res = await fetch(model.baseUrl, { method: 'POST', headers: { 'Authorization': \`Bearer ${apiKey}\`, 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }); const endTime = Date.now(); ... } catch (err) { ... }`
        * Handle response: Check `res.ok`. Parse JSON body (`await res.json()`). Extract completion text (e.g., `data.choices[0].message.content`), token usage (`data.usage.prompt_tokens`, `data.usage.completion_tokens`). Handle different response structures if necessary.
        * Error handling: Catch fetch errors, handle non-OK HTTP status codes (4xx, 5xx), parse error messages from response body. Return structured error info. Calculate `executionTimeMs`.
* **TokenizerService (`services/tokenizerService.ts`):**
    * Import `gpt-tokenizer`: `import { encode, decode, countTokens } from 'gpt-tokenizer';`
    * `countTokens(text: string): number` - Wraps `countTokens` from library.
    * `isWithinTokenLimit(text: string, limit: number): boolean` - Compares `countTokens(text)` with `limit`.
* **Cost Utility (`utils/costUtils.ts`):**
    * `calculateCost(model: { inputTokenCost: number, outputTokenCost: number }, inputTokens: number, outputTokens: number): number`
        * Calculates `(inputTokens / 1000 * model.inputTokenCost) + (outputTokens / 1000 * model.outputTokenCost)`. Handle null/undefined tokens (return 0).
* **API Key Handling:** Strictly use environment variables on the server (`.env` file loaded via `dotenv`). The `apiKeyEnvVar` field in the `Model` table tells the server *which* env var to read for that model's key. **Never store actual keys in the database.**

## 6. Design System

### 6.1 Visual Style

* **Color Palette:**
    * Primary: Blue (`#3B82F6`)
    * Secondary/Gray: Slate (`#64748B` text, `#E2E8F0` borders, `#F1F5F9` backgrounds)
    * Success: Green (`#22C55E`)
    * Error: Red (`#EF4444`)
    * Warning: Yellow (`#EAB308`)
    * Text: Dark Gray (`#1E293B`)
* **Typography:**
    * Font Family: Inter (sans-serif fallback)
    * Base Size: 16px
    * Headings: Larger sizes (e.g., 24px, 20px, 18px), heavier weight (600/700)
    * Body: 16px, weight 400
    * Labels/Meta: 14px, weight 400/500
* **Component Styling:** CSS Modules (`.module.css`) for component-scoped styles.
* **Spacing:** Use multiples of 4px/8px for margins, paddings, gaps (e.g., 8px, 16px, 24px, 32px).
* **Layout:** Consistent use of padding within containers. Max-width for main content area on wider screens.

### 6.2 Core Components (`client/src/components/`)

* **Layout:**
    * `Sidebar`: Vertical navigation with links (`NavLink` from `react-router-dom`).
    * `Header`: Optional top bar for page titles or breadcrumbs.
    * `PageWrapper`: Applies standard padding and max-width to page content.
    * Structure Example: `App -> Sidebar + (Header + PageWrapper -> Outlet)`
* **Navigation:** Sidebar links highlight active page. Breadcrumbs if needed.
* **Shared (`common/`):**
    * `Button`: Props: `variant` ('primary', 'secondary', 'danger'), `size` ('sm', 'md', 'lg'), `onClick`, `disabled`, `isLoading`. Shows spinner when `isLoading`.
    * `Input`, `Textarea`, `Select`: Standard form elements with labels, error states, `onChange`, `value`, `disabled`.
    * `Modal`: Props: `isOpen`, `onClose`, `title`, `children` (content). Handles overlay click to close.
    * `Table`: Props: `columns` (config array), `data` (array). Renders `thead`, `tbody`. Handles basic styling. (Consider `react-table` library if complex sorting/filtering needed).
    * `Card`: Wrapper component with padding and border/shadow for grouping content.
    * `Spinner`: Loading indicator animation.
    * `ErrorMessage`: Displays error text in standard format/color.
    * `TagChip`: Displays a tag name with background color, optional close icon.
    * `ProgressBar`: Visual indicator for progress (e.g., eval run).
* **Interactive States:** Clear visual distinction for `:hover`, `:active`, `:focus`, `[disabled]` states on interactive elements (buttons, inputs, links).

## 7. Component Architecture (React)

* Assume React functional components with Hooks and TypeScript.

### 7.1 Server Components (RSC - If applicable/chosen framework supports)

* *Use Case:* Potentially for read-only list views (`EvalsListPage`, initial `ModelList`) to fetch data directly on the server.
* *Data Fetching:* Direct async calls within the component (e.g., `await prisma.eval.findMany()`).
* *Suspense:* Wrap in `<Suspense fallback={<Spinner />}>` for loading states.
* *Error Handling:* Use `error.tsx` conventions if using Next.js App Router, or standard try/catch.
* *Props:* Receive simple props (e.g., search params), pass data down to Client Components if interactivity needed.
* *(Note: For a standard Vite/SPA setup, this section is less relevant; data fetching happens in Client Components via API calls.)*

### 7.2 Client Components (`'use client'` if RSC framework used)

* *Use Case:* All interactive elements: forms, buttons, pages requiring state, components using hooks (`useState`, `useEffect`), event handlers. The majority of the application.
* *State Management:* `useState` for local state. Zustand for cross-component state. TanStack Query for server state caching/fetching.
* *Event Handlers:* Standard React event handlers (`onClick`, `onChange`, `onSubmit`). Call API functions from `lib/api.ts`.
* *UI Interactions:* Handle loading indicators, disabled states, feedback messages based on API call status (managed via TanStack Query or local state).
* *Props Interface (TypeScript):* Define `Props` interface for each component specifying expected data types. E.g.:
    ```typescript
    interface ButtonProps {
      onClick: () => void;
      variant?: 'primary' | 'secondary';
      disabled?: boolean;
      isLoading?: boolean;
      children: React.ReactNode;
    }
    ```

## 8. Data Flow

* **Server -> Client:**
    1.  Client component mounts or TanStack Query trigger occurs.
    2.  API call function (e.g., `api.getEvals({ tag: 'logic' })`) invoked.
    3.  Request sent to Node.js backend API endpoint (e.g., `GET /api/evals?tag=logic`).
    4.  Backend controller fetches data from DB (via Prisma).
    5.  Backend sends JSON response.
    6.  Client receives response, TanStack Query caches it and provides `data`, `isLoading`, `isError` state to the component.
* **Client State Updates:**
    1.  User interacts (e.g., types in form input).
    2.  `onChange` handler updates local component state via `useState`.
    3.  User clicks "Save".
    4.  `onSubmit` handler calls API function (e.g., `api.updateModel(id, formData)`).
    5.  API call function sends PUT request to backend.
    6.  Loading state set (`isLoading` from TanStack Query mutation or local state). UI shows spinner/disables button.
    7.  Backend processes, responds.
    8.  Client receives response. TanStack Query potentially invalidates relevant queries to refetch updated data. Loading state unset. Success/error message shown.
* **State Management Architecture:**
    * **Server Cache:** TanStack Query (handles API data, caching, background sync, optimistic updates if needed).
    * **Global Client State:** Zustand (for minimal shared state like maybe the list of available Models for dropdowns, user preferences if any).
    * **Local Component State:** `useState` (for UI element state like form values, modal visibility).

## 9. Testing

* **Unit Tests (Backend - Jest/Vitest):**
    * Test utility functions: `costUtils.calculateCost`, input validation helpers.
    * Test services: `LlmService.getLLMCompletion` (mock `Workspace`), `TokenizerService.countTokens` (verify output).
    * Test controllers: Mock Prisma client, mock services. Verify input validation, correct service calls, response formatting. E.g., `expect(await modelController.createModel(req, res)). Mocks.prisma.model.create).toHaveBeenCalledWith(...)`.
* **Unit/Integration Tests (Frontend - Jest/Vitest + React Testing Library):**
    * Test simple components render correctly based on props (`<Button> renders children`).
    * Test basic interactions (`fireEvent.click` on Button calls `onClick` prop).
    * Test forms handle input changes and call submit handler (`userEvent.type`, `fireEvent.submit`). Mock API calls within submit handlers.
    * Test custom hooks (`useAPI` hook returns correct loading/error/data states when mock fetch resolves/rejects).
* **E2E Tests (Playwright/Cypress):**
    * **Auth/Setup:** (Not applicable for V1 single-user).
    * **Model CRUD:** `test('should allow adding, editing, and deleting a model configuration', async ({ page }) => { ... })`
    * **Eval Generation:** `test('should generate an eval set using a selected model', async ({ page }) => { ... })`
    * **Eval Execution:** `test('should run an eval against selected models and display results', async ({ page }) => { ... })`
    * **Scoring:** `test('should allow manual scoring of responses', async ({ page }) => { ... })`
    * **Judging:** `test('should allow judging questions using an LLM', async ({ page }) => { ... })`
    * **Reporting:** `test('should display leaderboard and cost reports', async ({ page }) => { ... })`
    * Tests should interact with the UI as a user would, navigate between pages, fill forms, click buttons, and assert that expected elements/text appear or disappear. Use mock LLM API endpoints for predictable E2E runs if needed, or test against actual staging/dev LLM endpoints carefully. Use page object models for maintainability.

```