#!/bin/bash
# Install git hooks for MyModelArena

set -e

echo "🔧 Installing git hooks for MyModelArena..."

# Ensure we're in the project root
if [ ! -d ".git" ]; then
    echo "❌ Error: Must be run from project root (where .git directory exists)"
    exit 1
fi

# Copy pre-commit hook
cp .git/hooks/pre-commit .git/hooks/pre-commit.backup 2>/dev/null || true
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed"
echo ""
echo "📝 Git hooks are now active and will run on every commit"
echo "   This ensures code quality and prevents broken code from being committed"
echo ""
echo "🔧 Hook includes:"
echo "   • Code linting (ESLint)"
echo "   • Type checking (TypeScript)"
echo "   • Unit tests (Vitest)"
echo ""
echo "💡 To skip hooks in emergencies: git commit --no-verify"
echo "   (Not recommended for production branches)"
echo ""
echo "🎉 Setup complete! Happy coding! 🚀"