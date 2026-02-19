import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Orcta Stack
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern full-stack TypeScript monorepo template with Hono, React,
            TanStack Router, and clean architecture patterns.
          </p>

          <div className="flex gap-4 justify-center mb-12">
            <Link
              to="/login"
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              API Docs
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <FeatureCard
              title="Clean Architecture"
              description="Discriminated unions, repository pattern, and dependency injection for maintainable code."
            />
            <FeatureCard
              title="Type-Safe"
              description="End-to-end TypeScript with shared types between frontend and backend."
            />
            <FeatureCard
              title="Modern Stack"
              description="React 19, TanStack Router, Hono, Drizzle ORM, and better-auth."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
