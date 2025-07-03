# MyModelArena

A comprehensive web application to generate, manage, execute, and evaluate custom evaluation sets (evals) for Large Language Models (LLMs). Built with modern React and Node.js technologies, featuring full responsive design and automated testing.

## 🚀 Features

### 🤖 **LLM Integration & Management**
*   **Universal Model Support:** Connect to 100+ LLMs through LiteLLM proxy integration
*   **Automatic Pricing:** Real-time cost calculation with up-to-date provider pricing
*   **Model Discovery:** Dynamic model detection with capabilities and pricing information
*   **Unified API:** Single interface for all major providers (OpenAI, Anthropic, Google, Mistral, etc.)

### 📝 **Evaluation Generation & Management**
*   **AI-Powered Generation:** Create custom eval sets using any supported LLM
*   **Template System:** Pre-built templates for common evaluation types
*   **Advanced Configuration:** Fine-tune difficulty, question types, and formats
*   **Tag Management:** Organize and categorize evaluations with custom tags

### ⚡ **Execution & Scoring**
*   **Parallel Execution:** Run evaluations across multiple models simultaneously
*   **Real-time Progress:** Live tracking of evaluation execution with cost monitoring
*   **Dual Scoring System:** Manual scoring and automated LLM-based evaluation
*   **Judge Mode:** Quality assessment of generated evaluation questions

### 📊 **Analytics & Reporting**
*   **Interactive Dashboards:** Model performance comparisons and leaderboards
*   **Cost Analysis:** Detailed token usage and cost tracking across providers
*   **Visual Charts:** Performance metrics with responsive data visualization
*   **Export Capabilities:** Download results and reports for further analysis

### 🎨 **Modern User Experience**
*   **Fully Responsive:** Mobile-first design that works on all devices
*   **Progressive Web App:** App-like experience with offline capabilities
*   **Real-time Updates:** Live progress tracking and notifications
*   **Accessibility:** WCAG compliant with keyboard navigation support

## 🛠 Technology Stack

### Frontend
*   **Framework:** React 19 with Vite for ultra-fast development
*   **Language:** TypeScript for type safety and better DX
*   **State Management:** TanStack Query + Zustand for efficient data flow
*   **Styling:** CSS Modules with responsive design system
*   **Charts:** Recharts for interactive data visualization
*   **UI Components:** Custom component library with accessibility support

### Backend
*   **Runtime:** Node.js with Express framework
*   **Language:** TypeScript for full-stack type safety
*   **Database:** Prisma ORM with SQLite for data persistence
*   **Authentication:** JWT-based with session management
*   **API Design:** RESTful endpoints with OpenAPI documentation

### LLM Integration
*   **Proxy:** LiteLLM for unified access to 100+ providers
*   **Tokenization:** gpt-tokenizer for accurate token counting
*   **Cost Tracking:** Real-time pricing from provider APIs
*   **Reliability:** Built-in retries, fallbacks, and error handling

### Testing & Quality
*   **Unit Tests:** Vitest with React Testing Library
*   **E2E Tests:** Playwright for comprehensive workflow testing
*   **Linting:** ESLint with TypeScript integration
*   **CI/CD:** GitHub Actions for automated testing and deployment

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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git for version control
- LiteLLM proxy access (or individual provider API keys)

### Installation

1.  **Clone and Setup:**
    ```bash
    git clone <repository-url>
    cd mymodelarena
    ```

2.  **Environment Configuration:**
    ```bash
    # Copy environment template
    cp .env.example .env
    
    # Edit .env file with your configuration
    nano .env  # or your preferred editor
    ```
    
    **Required Environment Variables:**
    ```env
    # Database
    DATABASE_URL="file:./server/prisma/dev.db"
    PORT=3001
    
    # LiteLLM Configuration (Recommended)
    LITELLM_MASTER_KEY=your_master_key_here
    LITELLM_PROXY_URL=http://localhost:4000  # or your proxy URL
    
    # Optional: Direct Provider Access (Legacy)
    OPENAI_API_KEY=sk-xxx...
    ANTHROPIC_API_KEY=sk-ant-xxx...
    ```

3.  **Install Dependencies:**
    ```bash
    # Install server dependencies
    cd server && npm install
    
    # Install client dependencies  
    cd ../client && npm install
    ```

4.  **Database Setup:**
    ```bash
    # From server directory
    cd server
    npx prisma migrate dev --name init
    npx prisma generate
    
    # Optional: Seed with sample data
    npm run seed
    ```

## 🎯 Running the Application

### Development Mode

1.  **Start Backend Server:**
    ```bash
    cd server
    npm run dev
    ```
    Server runs on `http://localhost:3001`

2.  **Start Frontend (separate terminal):**
    ```bash
    cd client  
    npm run dev
    ```
    Client runs on `http://localhost:5173`

3.  **Access Application:**
    Open `http://localhost:5173` in your browser

### Production Deployment

1.  **Build Application:**
    ```bash
    # Build frontend
    cd client && npm run build
    
    # Build backend
    cd ../server && npm run build
    ```

2.  **Start Production Server:**
    ```bash
    cd server
    npm start
    ```

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t mymodelarena-client ./client
docker build -t mymodelarena-server ./server
```

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

### Template Management
- `GET /api/templates` - List all evaluation templates
- `POST /api/templates` - Create new template
- `GET /api/templates/:id` - Get specific template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Real-time & Progress Tracking
- `GET /api/eval-runs/:id/status` - Get real-time execution status
- `GET /api/eval-runs/:id/progress` - Get detailed progress information
- WebSocket support for live updates during evaluation execution

### Cost & Analytics
- `GET /api/analytics/costs` - Get cost analysis and breakdowns
- `GET /api/analytics/leaderboard` - Get model performance rankings
- `GET /api/analytics/usage` - Get token usage statistics

## 🧪 Testing

### Unit Tests
```bash
# Backend unit tests
cd server && npm test

# Frontend unit tests  
cd client && npm test

# Interactive test UI
cd client && npm run test:ui
```

### End-to-End Tests
```bash
# Start application first
cd server && npm run dev  # Terminal 1
cd client && npm run dev   # Terminal 2

# Run E2E tests
cd client && npm run test:e2e

# Interactive E2E testing
npm run test:e2e:ui
```

### Code Quality
```bash
# Linting
cd client && npm run lint
cd server && npm run lint

# Type checking
cd client && npm run build  # Includes TypeScript compilation
cd server && npm run build
```

### Automated Testing
The project includes automated testing via GitHub Actions:
- ✅ Unit tests on every push
- ✅ E2E tests on pull requests  
- ✅ Code quality checks (linting, type checking)
- ✅ Build verification across environments

## 📱 Responsive Design

MyModelArena is built with a mobile-first approach and provides an excellent experience across all devices:

### Desktop (>768px)
- Full sidebar navigation with all features accessible
- Multi-column layouts for efficient screen usage
- Advanced data tables with sorting and filtering
- Side-by-side model comparison views

### Tablet (768px and below)
- Collapsible sidebar with overlay navigation
- Responsive grid layouts that adapt to screen size
- Touch-optimized buttons and interactive elements
- Optimized chart displays for smaller screens

### Mobile (480px and below)
- Mobile drawer navigation with hamburger menu
- Single-column layouts for optimal readability
- Touch-first interaction design
- Condensed information density with progressive disclosure

### Accessibility Features
- WCAG 2.1 AA compliant design
- Keyboard navigation support throughout
- Screen reader optimized markup
- High contrast mode compatibility
- Focus management for complex interactions

## 📖 User Guide

### Getting Started

1. **Model Setup**: Navigate to Models page and configure your LLM connections
2. **Create Evaluation**: Use the Generate Eval page to create custom test sets
3. **Run Evaluations**: Execute your evals against multiple models simultaneously
4. **Analyze Results**: Review performance metrics and cost analysis in Reports

### Key Workflows

#### Creating Your First Evaluation
1. Go to **Generate Eval** from the sidebar
2. Choose a template or create custom prompt
3. Configure question count, difficulty, and types
4. Select generation model and click Generate
5. Review and edit generated questions if needed

#### Running Multi-Model Comparisons
1. Navigate to an evaluation from **Evals** list
2. Click **Run Evaluation** button
3. Select multiple models to compare
4. Configure run parameters (temperature, max tokens)
5. Monitor real-time progress and costs
6. Review comparative results in the dashboard

#### Using Judge Mode
1. Open any evaluation from the list
2. Click **Judge Mode** to assess question quality
3. Configure judging criteria and LLM judge
4. Review quality scores and recommendations
5. Refine evaluations based on feedback

### Tips for Best Results

- **Model Selection**: Use diverse models for comprehensive evaluation
- **Question Quality**: Leverage Judge Mode to refine your evaluations
- **Cost Management**: Monitor token usage in real-time during execution
- **Template Reuse**: Save successful configurations as templates
- **Result Analysis**: Use the reporting dashboard for insights

## 🔧 Configuration

### LiteLLM Proxy Setup
```yaml
# litellm_config.yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: openai/gpt-4
      api_key: os.environ/OPENAI_API_KEY
      
  - model_name: claude-3-sonnet
    litellm_params:
      model: anthropic/claude-3-sonnet-20240229
      api_key: os.environ/ANTHROPIC_API_KEY
```

### Environment Variables Reference
```env
# Required
DATABASE_URL="file:./server/prisma/dev.db"
PORT=3001

# LiteLLM (Recommended)
LITELLM_MASTER_KEY=your_master_key
LITELLM_PROXY_URL=http://localhost:4000

# Optional: Direct Provider Access
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
MISTRAL_API_KEY=...

# Advanced Configuration
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_jwt_secret
SESSION_TIMEOUT=7d
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Reset database
cd server
rm prisma/dev.db
npx prisma migrate reset
npx prisma generate
```

#### LiteLLM Proxy Issues
```bash
# Test proxy connection
curl -X GET "http://localhost:4000/health"

# Check model availability
curl -X GET "http://localhost:4000/models" \
  -H "Authorization: Bearer YOUR_MASTER_KEY"
```

#### Frontend Build Errors
```bash
# Clear build cache
cd client
rm -rf dist node_modules/.vite
npm install
npm run build
```

#### Port Conflicts
```bash
# Check what's using port 3001
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

### Getting Help

- 📖 **Documentation**: Check this README and inline code comments
- 🐛 **Bug Reports**: Open an issue with detailed reproduction steps
- 💡 **Feature Requests**: Describe your use case and requirements
- 💬 **Questions**: Use discussions for general questions and support

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test` (both client and server)
5. Commit with conventional commits: `feat: add amazing feature`
6. Push and create a pull request

### Code Standards
- **TypeScript**: Maintain type safety throughout
- **Testing**: Add tests for new features and bug fixes
- **Linting**: Code must pass ESLint checks
- **Documentation**: Update README and inline docs as needed

### Pull Request Process
1. Ensure all tests pass and builds succeed
2. Update documentation for any API changes
3. Get approval from maintainers
4. Squash and merge when ready

## 🏗 Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express Server │    │   LiteLLM Proxy │
│                 │    │                 │    │                 │
│ • React 19      │◄──►│ • TypeScript    │◄──►│ • 100+ Models   │
│ • TypeScript    │    │ • Prisma ORM    │    │ • Unified API   │
│ • TanStack Query│    │ • SQLite DB     │    │ • Cost Tracking │
│ • CSS Modules   │    │ • REST APIs     │    │ • Auto Pricing  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Design Principles
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- **Type Safety**: End-to-end TypeScript for better developer experience
- **Responsive First**: Mobile-friendly design that scales to desktop
- **Performance**: Optimized loading with caching and lazy loading
- **Testability**: Comprehensive test coverage with unit and E2E tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LiteLLM](https://github.com/BerriAI/litellm) for unified LLM access
- [Prisma](https://prisma.io) for excellent database tooling
- [Vite](https://vitejs.dev) for blazing fast development
- [Playwright](https://playwright.dev) for reliable E2E testing
- [TanStack Query](https://tanstack.com/query) for data fetching excellence

---

**Ready to evaluate your LLMs?** 🚀 [Get started now](#-quick-start)

*Built with ❤️ for the LLM evaluation community* 