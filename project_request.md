# Project Name
MyModelArena

## Project Description
A web application designed to generate, manage, execute, and evaluate custom evaluation sets (evals) for Large Language Models (LLMs). The tool allows users to configure different LLMs (via Base URL and API Key, using the OpenAI API protocol), use these LLMs to generate challenging eval questions, store these evals in a SQLite database, run evals against multiple configured LLMs simultaneously, and utilize LLMs themselves to judge the quality of the generated eval questions. Results, model comparisons, token usage, and estimated costs will be displayed, including a leaderboard feature.

## Target Audience
Primarily for personal use by the developer.

## Desired Features
### Model Management
- [ ] Allow user to add/configure LLMs.
    - [ ] Store a user-defined name for the model.
    - [ ] Store the Base URL for the model's API endpoint.
    - [ ] Store the API Key securely for the model (e.g., using environment variables or basic encryption if stored in DB).
    - [ ] Assume OpenAI API protocol compatibility for interaction.
    - [ ] [New] Allow input of model pricing information (e.g., cost per input token, cost per output token) for cost estimation.
- [ ] Allow user to view, edit, and delete configured models.

### Eval Generation
- [ ] Allow user to select one or more configured LLMs to generate an eval set.
- [ ] Provide an interface for the user to input a prompt that instructs the selected LLM(s) on how to generate the eval questions.
- [ ] [New] Offer structured options to guide eval generation:
    - [ ] Selection of question types (e.g., checkboxes/tags for logic, coding, creative, general knowledge, daily tasks).
    - [ ] Optional text input for specific domain/topic focus.
    - [ ] Optional selection of desired difficulty level (e.g., easy, medium, hard).
- [ ] Generate a set of eval questions based on the user's prompt and structured options using the selected LLM(s).
    - [ ] Define the expected format/structure of generated questions (e.g., list of strings).
    - [ ] Allow configuration of the number of questions per generated set (Default: 10).
- [ ] Track which LLM generated which eval set.
- [ ] Store generated eval questions persistently in the SQLite database.

### Eval Storage & Management
- [ ] Store eval sets with metadata: unique ID, name/description, generating LLM, generation prompt, timestamp, tags, difficulty level.
- [ ] Store individual questions within sets: unique ID, question text, link to parent eval set.
- [ ] [New] Implement simple eval versioning (e.g., track edits with timestamps, potentially link edited questions to original).
- [ ] [New] Allow user to browse, search, filter (by tag, difficulty, generating LLM), edit, and delete eval sets and questions.
- [ ] [New] Implement tagging system for organizing evals (allow creating/assigning tags).

### Eval Execution
- [ ] Allow user to select a specific stored eval set to run.
- [ ] Allow user to select one, multiple, or all configured LLMs to run the selected eval against.
- [ ] Execute the eval questions against the chosen LLM(s) asynchronously and potentially in parallel.
    - [ ] UI should remain responsive during execution, showing progress/status.
- [ ] Handle API errors, timeouts, or invalid responses gracefully for each model without halting execution for others.
    - [ ] Log errors robustly: timestamp, model name, eval/question ID, error message/code, request details (if possible without exposing keys).
- [ ] Store results for each execution run:
    - [ ] Link run to the specific eval set version used.
    - [ ] For each question and each model: store the generated response text, timestamp, execution time, any errors.
    - [ ] [New] Store token counts (input/output) for each request/response using a tokenizer library (e.g., `gpt-tokenizer`).
    - [ ] [New] Calculate and store estimated cost for each request/response based on stored model pricing and token counts.

### Response Scoring
- [ ] [New] Allow configuration per eval set or run for how responses should be scored:
    - [ ] Option 1: Manual Scoring - Provide a simple UI after execution to rate/score responses (e.g., buttons for Pass/Fail, 1-5 rating, or custom labels).
    - [ ] Option 2: LLM Scoring -
        - [ ] Allow user to select a configured LLM to act as the "Scoring Judge".
        - [ ] Provide an interface to define the scoring criteria/rubric (e.g., via a prompt like "Score the following response based on accuracy and relevance from 1-10, providing justification..."). Criteria might vary based on eval type.
- [ ] Store the score (manual or LLM-generated), justification (if LLM scoring), scorer identity (manual user or scorer LLM), and timestamp alongside the corresponding model response.

### Judge Mode (Eval Question Quality Assessment)
- [ ] Allow user to select a stored eval set.
- [ ] Allow user to select one or more configured LLMs to act as "Judges" for the *questions*.
- [ ] For the selected eval set, have the chosen Judge LLM(s) evaluate the quality of the questions themselves asynchronously.
    - [ ] [New] Provide options for judging structure:
        - [ ] Predefined criteria: Judge scores based on selected aspects (e.g., checkboxes/ratings for Clarity, Difficulty, Relevance, Originality).
        - [ ] Freeform justification: Judge provides a score (e.g., 1-10) and a textual justification.
        - [ ] Combination of both.
    - [ ] User defines the prompt/instructions for the Judge LLM(s).
- [ ] Store the judgments (judge LLM, target question ID, scores per criterion/overall score, justification, timestamp) in the database.
- [ ] [New] Track tokens/cost associated with Judge Mode calls.

### Results & Reporting
- [ ] Display results of eval executions clearly.
    - [ ] Table view comparing responses from different models for the same question side-by-side.
    - [ ] Include scores, execution time, token counts, and estimated cost per response.
    - [ ] Allow filtering/sorting results (by model, score, cost, etc.).
- [ ] Display results of Judge Mode.
    - [ ] Show eval questions alongside their quality scores and justifications from different Judge LLMs.
    - [ ] Allow comparison of how different judges rated the same question.
- [ ] Implement a Leaderboard feature comparing models based on:
    - [ ] Average/Total response scores received across multiple evals.
    - [ ] Average/Total question quality score achieved (as generator, based on Judge Mode results).
    - [ ] [Potential] Average/Total cost per eval run.
    - [ ] [Potential] Average execution speed.
- [ ] [New] Display aggregate token usage and estimated costs (per run, per model, overall).
- [ ] Provide clear visualizations (e.g., bar charts, comparison tables) for model performance, judge ratings, and costs.

## Design Requests
- [ ] Simple and intuitive User Interface (UI) built with React.
- [ ] Clear presentation of comparisons between models, including results, judgments, and costs.
- [ ] Responsive UI (adapts reasonably to different screen sizes, desktop-first focus).
- [ ] Use asynchronous operations for long-running tasks (generation, execution, judging) with clear visual feedback (e.g., loading indicators, progress status, notifications).

## Technology Stack
- [ ] **Frontend:** React
- [ ] **Backend:** Node.js (Preferred) / Python (Alternative if needed for specific LLM libraries)
- [ ] **Database:** SQLite
- [ ] **[New] Tokenizer:** JavaScript library compatible with OpenAI models (e.g., `gpt-tokenizer`)

## Other Notes
- [ ] Prioritize robust error handling and logging throughout the application.
- [ ] Implement basic security measures for API keys suitable for single-user application (env variables recommended).
- [ ] Ensure asynchronous task handling is robust to prevent UI freezes.
- [ ] Cost and token tracking are critical features.
- [ ] Simple eval versioning is desired, complexity should be managed.
- [ ] Consider potential future needs for import/export functionality (though not required for V1).