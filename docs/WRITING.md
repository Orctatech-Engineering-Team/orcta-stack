# Writing Style Guide

This document covers how we write — articles, docs, READMEs, commit messages, everything that a human reads rather than a compiler.

---

## The Four Teachers

These four writers shaped the voice we're going for. Each one contributes something specific.

### William Zinsser — *On Writing Well*

Every sentence earns its place. Cut the word that restates what the previous word already said. No "in order to" when "to" works. No "the reason is because" when "because" works. No filler clause that delays the real sentence.

The reader's time is not yours to waste.

Read: *On Writing Well* (the whole book, not a summary)

### Charity Majors — earned opinions, no hedging

Write from scar tissue, not authority. Don't say *"you should handle errors as values"* — say *"I've debugged enough midnight incidents where a thrown exception vanished into a catch-all to know: if it can fail, the type needs to say so."*

State opinions flatly. Qualifiers only when the qualifier is the point. "It depends" is never a final answer — follow it with the actual answer for the context you're in.

Read: [charity.wtf](https://charity.wtf) — particularly her posts on observability and engineering management

### Casey Muratori — show the machine

Don't describe the pattern, show the actual code, then explain *why* the shape of it is right. Walk the reader through the thinking as it happened, not the cleaned-up post-hoc version. Treat the reader as someone smart who just hasn't seen this yet.

The tutorial that works is the one that never skips the step where things were confusing.

Read: [Handmade Hero](https://handmadehero.org) — watch how he narrates code as he writes it

### Cal Newport — one claim per section, defended, closed

Each section has one argument. You know what the section argues before you read it. You know it's done when the argument lands. No meandering. No "as we've seen above". No recap of what was just said.

Read: *Deep Work* and *Digital Minimalism* — notice the structure more than the content

---

## The Synthesized Voice

These rules apply whether you're writing an article, a PR description, or a section of the README.

**Open with the real problem.** Make the reader feel the friction before you sell the solution. If the opener is "here is a solution", you've skipped the reason anyone should care.

**Use "I" and "you" freely.** This is knowledge transfer between two people, not a whitepaper. "We recommend" is the voice of a committee. "I use this because" is the voice of someone who's actually been there.

**Show code early and let it do work.** Prose explains what the code alone can't — the *why*, the tradeoffs, the history. If you're writing prose to describe something fully expressible in code, write the code instead.

**Short paragraphs.** One idea. Three sentences max. Move on.

**No throat-clearing introductions.** The first sentence of each section is already in the middle of the thought. "In this section we will explore..." is a sentence that could always be deleted.

**Last sentence of a section closes the claim.** Not "and that's why X matters" — that's a restatement. The last sentence draws the conclusion or sets up the next section directly.

---

## On Technical Writing Specifically

**Don't soften opinions you've earned.** If you've debugged something, built it, shipped it, and formed a view — state the view. Hedging with "this might work for some teams" when you mean "this worked for me and here's why" is a disservice to the reader.

**Explain the tradeoff, not just the choice.** Every technical decision has a cost. Readers trust writing that acknowledges what was given up more than writing that only defends what was gained.

**Real code from the real repo.** No pseudocode, no cleaned-up examples that don't compile. If the example changed to make it prettier for the article, say so. If it didn't, don't say so — just show it.

**Name alternatives you rejected and say why.** "I chose X" is half the information. "I chose X over Y because Z" is the part that helps someone in a different context make their own call.

---

## What We're Not Going For

- Academic hedging ("one might argue", "it is worth noting")
- Filler transitions ("Now that we've covered X, let's look at Y")
- False balance ("both approaches have merit" with no follow-through)
- Enthusiasm as a substitute for argument ("this is really exciting!")
- SEO-optimized intros that delay the actual content

---

## Applied to This Project

When writing `docs/DECISIONS.md`, `docs/PATTERNS.md`, inline code comments, or PR descriptions, the same rules apply at a smaller scale. A good comment is a single sentence that says *why*, not *what*. A good PR description opens with the problem, not the solution.
