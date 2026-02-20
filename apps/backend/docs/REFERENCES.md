# References & Further Reading

The talks, articles, and specifications that informed the decisions in this codebase. Each section maps to a decision in [DECISIONS.md](./DECISIONS.md).

---

## Functional Core / Imperative Shell

*Decisions: use-case layer, handlers as orchestrators, pure functions for business logic.*

**Gary Bernhardt — "Boundaries"** (Destroy All Software, 2012)
The original articulation of this pattern. A 30-minute screencast explaining why mixing pure logic with I/O produces code that is hard to test and hard to reason about. Every use-case in this codebase exists because of this talk.
https://www.destroyallsoftware.com/talks/boundaries

**Mark Seemann — "Impureim Sandwich"** (2020)
A concise restatement of the same idea: order your code as impure → pure → impure. Handlers are the bread; use-cases are the filling.
https://blog.ploeh.dk/2020/03/02/impureim-sandwich/

---

## Result Types / Railway Oriented Programming

*Decisions: never throw, `Result<T, E>`, `ok`/`err`/`match`/`andThen`/`map` combinators.*

**Scott Wlaschin — "Railway Oriented Programming"** (NDC Oslo, 2014)
The talk that popularised chaining functions that carry a success/failure track. Direct inspiration for the combinator vocabulary in `@repo/shared`. The article version is a good reference to keep open while reading this codebase.
https://fsharpforfun.com/posts/recipe-part2.html
Talk: https://www.youtube.com/watch?v=fYo3LN9Vf_M

**Rust `std::result::Result`**
Language-level proof that Result types work at scale. Much of the combinator naming (`map`, `and_then`, `unwrap_or`) comes from Rust's standard library.
https://doc.rust-lang.org/std/result/

---

## Parse, Don't Validate

*Decisions: Zod at the HTTP boundary, `c.req.valid("json")` returns a fully-typed value — no further runtime checks inside the application.*

**Alexis King — "Parse, Don't Validate"** (2019)
Argues that validation produces a boolean and throws away information; parsing produces a richer type and cannot be bypassed by accident. The core reason we validate *once* at the route boundary and trust the types downstream.
https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/

---

## Making Impossible States Impossible

*Decisions: domain errors are discriminated unions with typed payloads, not generic `Error` subclasses or string codes.*

**Richard Feldman — "Making Impossible States Impossible"** (Elm Europe, 2016)
Shows how to design types so that invalid program states literally cannot be constructed. The pattern behind `type UserError = UserNotFound | EmailTaken` — each variant typed, each distinct, each handling exactly the data its handler needs.
https://www.youtube.com/watch?v=IcgmSRJHu_8

---

## Integration Testing Over Mock-Heavy Unit Tests

*Decisions: repositories tested against a real database, no mocking infrastructure, mocks only for third-party services that cannot run locally.*

**J.B. Rainsberger — "Integrated Tests Are a Scam"** (continuously updated since 2010)
Not an argument against integration tests — an argument against the belief that mocking your infrastructure gives you real confidence. Required reading before reaching for `vi.mock` on a database call.
https://blog.thecodewhisperer.com/permalink/integrated-tests-are-a-scam

**Martin Fowler — "Test Double"**
The canonical taxonomy: stubs, mocks, fakes, spies. Useful for understanding *what* to mock (external HTTP APIs, payment providers, email transports) versus *what not to* (Postgres, Redis, infrastructure you can run in Docker).
https://martinfowler.com/bliki/TestDouble.html

---

## OpenAPI-First Design

*Decisions: `createRoute()` as single source of truth for validation, types, and documentation.*

**OpenAPI Specification 3.1**
The specification every `createRoute()` call maps to. Worth reading the Paths and Components sections if you're extending the API.
https://spec.openapis.org/oas/v3.1.0

**Zod documentation**
Zod schemas serve double duty throughout this codebase: runtime validation at the boundary and static TypeScript type inference everywhere downstream.
https://zod.dev

---

## Framework & Library Choices

**Hono documentation** — framework, routing, middleware, `@hono/zod-openapi`
https://hono.dev

**Drizzle ORM documentation** — schema declaration, query builder, migrations
https://orm.drizzle.team

**better-auth documentation** — session management, auth flows, email verification
https://www.better-auth.com

---

## Observability

*Decisions: wide events over scattered logs + metrics, tail-based sampling, Axiom, `addToEvent` as the instrumentation primitive. See the full rationale in [DECISIONS.md → Observability](./DECISIONS.md).*

**Boris Tane — "Logging Sucks"** (loggingsucks.com, 2024)
The most direct reference for our implementation. Walks through the core problem (17 log lines per request that tell you nothing), defines the vocabulary (cardinality, dimensionality, wide events, canonical log lines), shows the implementation pattern step by step, and covers tail-based sampling. The `wideEventMiddleware` and `addToEvent` pattern in this codebase follows this implementation guide directly.
https://loggingsucks.com

**Charity Majors — Blog and talks (Honeycomb)**
The originator of the "high-cardinality observability" argument. Her central claim: traditional logging and APM are broken because they force you to pre-aggregate before storage, discarding the individual request data you need to debug production. You need to store raw events in a column-oriented store and query them at debug time — not grep them.
- "Observability — The 5-Year Retrospective": https://charity.wtf/2020/03/03/observability-is-a-many-splendored-thing/
- "Is This Just Metrics?": https://charity.wtf/2022/08/12/is-this-just-metrics/
- "High Cardinality is Not the Same As High Dimensionality": https://charity.wtf/2021/08/09/notes-on-the-art-of-measuring-things/

**Stripe Engineering — "Canonical Log Lines"**
The origin of the term. Stripe's approach: each service emits one structured log line per request containing all the context needed to understand what happened. This is the "canonical log line" that `wideEventMiddleware` implements.
https://stripe.com/blog/canonical-log-lines

**Honeycomb documentation — "Core Analysis Loop"**
The mental model for debugging with events: start with a wide query (error rate), narrow by cardinality (which user_id?), expand to see the full event context. This is the loop Axiom's APL enables on our wide events.
https://docs.honeycomb.io/investigate-incidents-faster/

---

## Summary Table

| Resource | Author | Format | Why it matters here |
|---|---|---|---|
| "Boundaries" | Gary Bernhardt | Talk (30 min) | Functional core / imperative shell |
| "Impureim Sandwich" | Mark Seemann | Article | Practical ordering of pure and impure code |
| "Railway Oriented Programming" | Scott Wlaschin | Talk + Article | Result types, combinator design |
| "Parse, Don't Validate" | Alexis King | Article | Zod at the boundary, trust types downstream |
| "Making Impossible States Impossible" | Richard Feldman | Talk (25 min) | Discriminated union error design |
| "Integrated Tests Are a Scam" | J.B. Rainsberger | Article | Real DB over mocks |
| "Test Double" | Martin Fowler | Article | When mocks are actually appropriate |
| *A Philosophy of Software Design* | John Ousterhout | Book | Deep modules, reducing complexity |
| "Logging Sucks" | Boris Tane | Article | Wide events implementation pattern |
| "Observability Requires Rethinking Logging" | Charity Majors | Articles/Talks | High cardinality/dimensionality philosophy |
| "Is This Just Metrics?" | Charity Majors | Article | Why metrics are not a substitute for events |
