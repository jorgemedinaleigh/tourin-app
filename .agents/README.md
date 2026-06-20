# Generic Agent Context

This directory contains tool-agnostic support material for coding agents working on this project.

## Single skill source

Use `.agents/SKILLS.md` as the single source of truth for reusable skills and workflows.

Older folders under `.agents/skills/`, `.agents/workflows/`, and `.claude/skills/` are compatibility pointers or deep reference material only. Do not maintain separate task guidance there.

## Structure

- `SKILLS.md` — canonical skills/workflows for most agents.
- `project-context.md` — architecture, domain, and important implementation notes.
- `skills/` — legacy compatibility pointers to `SKILLS.md`.
- `workflows/` — legacy compatibility pointers to `SKILLS.md`.

## Relationship to `.claude/`

`.claude/` is kept for Claude Code compatibility and verbose vendor references. For everyday work, start with:

1. `AGENTS.md`
2. `.agents/project-context.md` when broader architecture context is useful
3. `.agents/SKILLS.md` for task-specific skills/workflows

Only use `.claude/skills/posthog-integration-expo/references/` when deeper PostHog SDK documentation is needed.
