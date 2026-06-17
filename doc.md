# React Doctor: one skill that makes agents good at React

Today React Doctor is a code scanner. The plan is to grow it into a single skill, `/react-doctor`, that does more than scan: it helps a coding agent write better React, quietly checks its own changes in the background, and can open a real browser to measure speed, reproduce bugs, and review design. People pick it up one developer at a time because the local skill is free and useful on its own, and the way it spreads to a whole team is by getting added to continuous integration (CI).

## What it is

It is the skill we already ship, grown, rather than a new wrapper around a pile of separate tools. The cleanup pass it does today becomes one option among several, and [React Grab](https://github.com/aidenybai/react-grab) and the browser piece from [Expect](https://github.com/millionco/expect) get folded in so they stop being separate installs. That consolidation is deliberate. With Expect, having a few separate tools left people unsure what to install and when, and that confusion is a big part of what hurt adoption.

Installation stays the same. You run `npx react-doctor` and call it as `/react-doctor`. We keep the package name, the command, and the brand all as React Doctor, which means we keep the GitHub stars, the install command people already know, and the [react.doctor](https://www.react.doctor) domain.

## What it does

There are really two kinds of work it handles. Most of it runs instantly off the code itself, and the parts that need a browser only spin one up when you actually ask for them.

- **Finding and fixing problems** (`doctor`, or `debug`, `audit`, `review`): it reads your code for the score and the 502 rules, profiles speed when you ask (`perf`), or opens a browser to reproduce a bug (`debug`).
- **Building and improving the user interface, or UI** (`design`, or `dev`): it writes or refines UI and reviews it against a screenshot, and `grab` lets you point at an element on screen to get its file, line, and component tree.

When something does need a browser, it connects to the Chrome you already have open over the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) (CDP), and only downloads its own copy of Chrome if nothing is running. That one detail solves the biggest headache Expect had, because logins and cookies work on their own when it is your real session.

The browser part is our own, slimmed down from Expect. It keeps the page open between commands, runs scripts in a sandbox, and carries the accessibility check, the speed trace, the page snapshot, and the network log. We left out the things we do not need, like the video recording, the terminal UI, and the test runner. Since it runs from the command line and the open page holds the state, there is no separate server to keep alive.

## How it picks what to do

We let the model choose which job to run by reading the skill, the same way it already routes to other skills, rather than matching keywords. So `/react-doctor` on its own lets it decide, naming a job like `/react-doctor perf` forces that one, and when the request is genuinely unclear the skill just asks.

For the common cases it follows a rough guide:

| You say or change                                       | Job                 |
| ------------------------------------------------------- | ------------------- |
| "review", "before commit", "clean up", or changed files | doctor (reads code) |
| "slow", "laggy", "re-rendering"                         | perf                |
| "broken", "crashes", "not working"                      | debug (browser)     |
| "looks off", "polish", a pasted element or screenshot   | design              |
| unclear                                                 | ask                 |

We keep this judgment with the model instead of a fixed keyword list, because keyword matching only gets worse as models get better at reading what you actually meant.

## Where the instructions live

The skill itself stays small, in the same spirit as the [writing-guidelines](.agents/skills/writing-guidelines/SKILL.md) skill. The `SKILL.md` holds only the ten always-on rules and the short routing guide, and each job pulls its full instructions fresh from a web address when it runs:

```bash
curl --fail --silent --show-error \
  https://www.react.doctor/prompts/debug.md
```

The per-rule fix recipes load the same way, for example `https://www.react.doctor/prompts/rules/react-builtins/exhaustive-deps.md`. Editing one of these files updates every user on their next run, with no reinstall, and the `/react-doctor` triage flow already works exactly like this.

Because react-doctor is open source, these instruction files live in the repo and download straight from GitHub (`raw.githubusercontent.com`), the same approach writing-guidelines uses, and the `react.doctor/prompts` links are just a stable alias for those same files. A copy ships inside the package as a fallback for when the download fails or the network is blocked.

The reason for the split is that the ten rules belong inside the skill, since they apply to every edit, while the longer job instructions belong online so we can change them without shipping a new version.

## Running in the background

By default the skill works without anyone calling it. When the agent finishes a task it looks only at the changed lines, and it stays quiet unless it finds one to three issues it is genuinely confident about, mentioning each one once.

The browser jobs (perf, debug, design review) never start on their own. They only run when you or the agent asks, because they are slower and need a live page, and firing them on every change would just be noise. Noise is what gets a skill turned off.

## The always-on React rules

The skill ships with ten rules that shape how the agent writes React on every edit. We keep the list at ten on purpose, since the real value is in the browser jobs rather than a long rulebook:

1. Derive state, do not duplicate it.
2. Skip effects for values you can compute while rendering and for handling events.
3. Compose components instead of piling on boolean props.
4. Lift state only as far as it needs to go.
5. Keep one source of truth.
6. Render without side effects.
7. Use stable keys, never the array index.
8. Fetch independent data in parallel.
9. Skip manual memoization and let the compiler handle it.
10. Handle the loading, error, and empty states.

## The design job

We write the design job ourselves, treating [React UI](../brain/react-ui/SKILL.md), [ui.sh](https://ui.sh), [Impeccable](../brain/impeccable/SKILL.md), and the [design reference](../brain/design-reference.md) as source material rather than dependencies. The important part is that a review opens the page, takes a screenshot, and reports things it can actually measure, like contrast ratio, line length, spacing, and tap-target size, instead of offering opinions. Those measured findings are the part a smarter model cannot match just by reading code, whereas plain taste advice is. The `dev` name runs the live loop, where you point at an element and improve it as you build.

## CI: where it goes team-wide

In CI the first version stays code-only: the scan, the score, a pinned pull request comment, and inline suggestions. The browser jobs stay on your machine, and profiling in CI comes later, since it needs the app booted and a stable baseline, and it is really the "prove the impact to my manager" feature.

The local skill earns the habit one developer at a time, and CI is how that becomes the whole team's default on every pull request. Both are free. The path from one to the other is the prompt already in the installer that offers to add the GitHub Action, shown once per repo after the local skill has shown its worth. How we make money is a separate decision, not a paywall on CI.

## What we measure

Three numbers carry the story:

- **Habit**: how often the agent accepts and lands a fix the background check surfaced, plus weekly active repos.
- **Conversion**: the share of local users who turn on the CI check, which tells us whether personal use spreads to the whole team.
- **Retention**: whether teams keep the CI check on over time, which is the one that matters most.

Alongside that, a short "very sad, mid, not sad" survey runs in the command line for a sample of users.

## What to build, in order

We build all of this and land it as one pull request, rather than merging anything piecemeal first. [Pull request #811](https://github.com/millionco/react-doctor/pull/811) is the starting point for the profiler, not something we merge on its own. The order we build it in:

1. Take the profiler from pull request #811 as the starting point and rebuild it as the perf job. It is the template for every browser job.
2. Prove the browser part works: connect to a running Chrome, keep the page open across commands, run sandboxed scripts, and inject the [React DevTools](https://react.dev/learn/react-developer-tools) hooks. Everything else depends on this, so it goes first.
3. Expand the `/react-doctor` skill, with the ten rules plus the routing guide, under 200 lines.
4. Turn on the background check, code-only and on by default.
5. Add debug and grab on top of the browser part.
6. Write the design job with measured review.
7. Deprecate React Grab, leaving a shim so current users do not break.

## What could go wrong

- **The browser part**: if connecting to Chrome, keeping the page open, and injecting the DevTools hooks do not compose, the whole browser story is shaky, so we test it before building on it.
- **Background noise**: on by default with a loose threshold is how you get uninstalled. We ship it nearly silent and loosen it only once the fix-acceptance data says it is safe.
- **Conversion**: if people love the local skill but never turn it on in CI, it stays a personal tool and never reaches the team. Better to learn that early and cheaply.
- **Design**: if measured review turns out no better than the model's own taste, we cut design from the first version.
