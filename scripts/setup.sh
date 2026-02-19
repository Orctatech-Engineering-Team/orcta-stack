#!/bin/bash
set -e

echo "🚀 Setting up Orcta Stack..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required. Install: npm i -g pnpm"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup environment files
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env

  # Generate auth secret
  SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  sed -i.bak "s/your-better-auth-secret-min-32-chars/$SECRET/" .env && rm -f .env.bak

  echo "⚠️  Update DATABASE_URL in .env before running migrations"
fi

if [ ! -f apps/frontend/.env ]; then
  cp apps/frontend/.env.example apps/frontend/.env
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update DATABASE_URL in .env"
echo "  2. Run: pnpm db:migrate"
echo "  3. Run: pnpm dev"
