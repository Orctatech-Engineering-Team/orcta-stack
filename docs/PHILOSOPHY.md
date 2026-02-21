# Engineering Philosophy

The beliefs that anchor every decision in this codebase. Not rules — beliefs. Rules can be followed without understanding. Beliefs change how you see the problem.

---

## Simple Is Not Easy

Simple code is the hardest code to write. It requires you to fully understand the problem before you touch the keyboard, make real choices about what to leave out, and resist the pull of every interesting abstraction that presents itself along the way.

Complex code is easy. Every time you're uncertain, you add a layer. Every time requirements might change, you add an interface. Every time a pattern seems reusable, you generalize it. The result is a codebase that looks thorough and feels impressive — until you have to change something, and suddenly you're paying for every assumption you ever deferred.

Simple systems scale. Not because they're small, but because they're honest. They say exactly what they do, do exactly what they say, and leave no hidden state for the next person to stumble into.

**The discipline:** before you add something, ask what it would cost to remove it. If you can't answer that, you don't understand it well enough to add it.

---

## Principles Over Tools

Tools change. The principles that make tools worth choosing don't.

ESLint becomes Biome. Prisma becomes Drizzle. Radix becomes Base UI. The tools in this codebase are specific choices made at a specific time — they can and will be replaced. What doesn't change is the question we ask when choosing them: does this tool help the next person understand what's happening, or does it add machinery they have to learn before they can read the code?

The best tool is often the one that teaches you the least on the way to the thing you were actually trying to build.

---

## Progressive Abstraction

Start with the simplest implementation that solves the real problem in front of you.

Not the problem you might have in six months. Not the pattern you read about last week. The exact problem you have right now, in the simplest form that handles it correctly.

Abstractions earn their existence by appearing more than once. A `tryInfra` wrapper exists because every repository function needed to catch infrastructure errors and every one needed to do it the same way. A `Result<T, E>` type exists because every fallible function needed a way to return failures without throwing. Neither of these was designed upfront — they crystallized after the pattern repeated.

The danger of premature abstraction is that it looks like wisdom. It has interfaces and generics and thoughtful naming. It also locks in assumptions about how the system will be used before you know how it will be used. Those assumptions are wrong more often than they're right.

**The discipline:** write it twice before you abstract it.

---

## Craftsmanship

Code is read far more than it is written. The primary audience for the code you're writing is not the computer — it's the person who reads it next, which will usually be you.

Craftsmanship is not cleverness. A clever solution is one that only the person who wrote it understands. A crafted solution is one where the next reader can see exactly what it does and why — where the variable names, the function boundaries, and the comment choices all reduce the cognitive load rather than increasing it.

This shows up in small things: naming a variable `userId` instead of `id`, splitting a 40-line handler into a use-case and a handler, writing a comment that says *why* instead of *what*. None of these changes are individually significant. Accumulated across a codebase, they're the difference between code that new teammates can navigate in a day and code that requires a guided tour.

---

## Human Experience First

Performance, reliability, and security are not engineering concerns — they're user concerns. Every millisecond of latency is a real person waiting. Every 500 error is a real person seeing a broken page. Every security gap is a real person's data at risk.

This doesn't mean premature optimization. It means holding onto the fact that the code is not the end product. The experience of the person using what you built is the end product. Engineering choices that look neutral — how errors are returned, how loading states are handled, how auth tokens are managed — are all choices that eventually affect a real human in a real moment.

Build with that person in mind. Not as an abstraction, but as a real person with limited time and zero patience for things that don't work.

---

## Influences

These are the thinkers and practitioners whose work shaped how we think about building software.

**[37signals / Jason Fried / DHH](https://37signals.com)** — the source of "simple is not easy". Their argument: most complexity is chosen, not necessary. Constraints produce better software. Doing less, deliberately, is a form of quality. Read *Getting Real*, *REWORK*, and *Shape Up*.

**[The Primeagen](https://www.youtube.com/@ThePrimeagen)** — the performance-first mindset and the insistence on understanding what your code actually does. Not what you think it does, not what the abstraction says it does — what it *actually* does, at the level of the machine. That clarity transfers upward to architecture.

**[Charity Majors](https://charity.wtf)** — observability and the idea that you're not done when it's deployed, you're done when you understand how it behaves in production. Also: earned opinions. Don't recommend things you haven't been burned by. Write from scar tissue.

**[Vercel](https://vercel.com)** — what great developer experience looks like in practice. The best DX is the one that makes the right path the easy path. Zero-config defaults. Errors that tell you what to do. A tool that gets out of your way.

**[Netflix Engineering](https://netflixtechblog.com)** — what quality engineering looks like at scale. Not because we're at that scale, but because the principles — chaos engineering, observability, culture of ownership — apply at any size. You own what you ship, past the merge button.

**[Cal Newport](https://calnewport.com)** — the case for depth over breadth, and for protecting the cognitive space required to do hard things well. Multi-tasking is a myth. Half-done work is worse than not-started work. Finish what you start.

---

## What This Means in Practice

Every decision in this codebase connects back to these beliefs:

- **The 40-line Result type** instead of Effect or neverthrow — progressive abstraction. We own exactly what we need, nothing more.
- **Biome over ESLint + Prettier** — tools over principles, but the simpler tool. One binary, one config, zero plugin conflicts.
- **Base UI over Radix** — the tool that stays out of our way. No z-index negotiation, no portal fighting.
- **`tryInfra` as the single catch boundary** — craftsmanship. One place where infrastructure errors are caught, so there's one place to look when something breaks.
- **The module scaffolder** — making the right path the easy path. Convention enforced by a script is better than convention enforced by a wiki.

When you're making a decision that isn't covered by the existing patterns, come back to these beliefs. They're the question to ask before you add something.
