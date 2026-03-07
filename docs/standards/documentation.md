# Documentation Standards

Guidelines for maintaining documentation in Svolta.

## Core Principles

### 1. Living Documentation

- Update docs in the same commit as code changes
- Never leave documentation outdated
- Remove obsolete information promptly
- Regular review of living docs (README, CLAUDE.md, CHANGELOG)

### 2. Clarity & Accessibility

- Write for developers unfamiliar with the codebase
- Use clear, concise language
- Provide examples for all patterns
- Include troubleshooting sections

### 3. Structure & Consistency

- Follow established templates
- Use consistent formatting
- Maintain logical hierarchy
- Keep related content together

---

## CLAUDE.md Standards

### Purpose

CLAUDE.md provides AI-specific context for Claude Code. It should be:

- **Concise** - Target 150-200 lines (max 300)
- **Actionable** - Focus on rules Claude must follow
- **Unique** - Don't duplicate content from other docs

### What to Include in Root CLAUDE.md

| Include                           | Don't Include                |
| --------------------------------- | ---------------------------- |
| Git workflow rules                | Detailed API documentation   |
| Critical architecture rules       | Content duplicated elsewhere |
| Essential commands                | Comprehensive examples       |
| "NEVER do X" rules                | Reference material           |
| Documentation update requirements | Environment-specific details |

### Content Guidelines

**Do:**

- Use tables for quick reference
- Keep sections focused (15-40 lines each)
- Link to detailed docs instead of duplicating
- Use emphasis for critical rules ("NEVER", "ALWAYS")

**Don't:**

- Inline full code examples (link to files instead)
- Repeat information from architecture docs
- Include comprehensive troubleshooting (keep brief)

---

## CHANGELOG Standards

### Format

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) with these modifications:

- **No "Unreleased" section** - Assume all documented changes are released
- Group by version with date: `## [0.3.0] - 2026-01-04`
- Use semantic versioning for version numbers

### Categories

Use these categories in this order:

```markdown
### Security

(P0 critical security fixes)

### Added

(New features)

### Changed

(Changes to existing functionality)

### Fixed

(Bug fixes)

### Removed

(Removed features)

### Technical

(Internal changes, stats, metrics)
```

### Writing Changelog Entries

**Do:**

- Start with a verb (Added, Fixed, Changed, Removed)
- Be specific about what changed
- Include file paths for technical changes
- Group related changes together

**Don't:**

- Use "Unreleased" as a section header
- Write vague entries like "Various bug fixes"
- Include implementation details better suited for comments

---

## File Naming Conventions

### Root Level Files (UPPERCASE)

```
README.md           # Project overview
CLAUDE.md           # AI context
CHANGELOG.md        # Version history
LICENSE             # License file
```

### Documentation Files (lowercase with hyphens)

```
docs/
├── standards/
│   ├── code-style.md
│   ├── design-tokens.md
│   ├── documentation.md
│   ├── git-workflow.md
│   └── testing.md
├── guides/
│   ├── local-development-setup.md
│   ├── git-workflow.md
│   ├── troubleshooting.md
│   ├── mediapipe-self-hosting.md
│   └── stripe-integration.md
├── architecture/
│   ├── architecture.md
│   ├── database.md
│   ├── how-alignment-works.md
│   ├── how-billing-works.md
│   └── how-pose-detection-works.md
├── api/
│   └── reference.md
├── components/
│   └── reference.md
└── README.md       # Documentation hub
```

---

## Markdown Formatting

### Headings

```markdown
# H1 - Document Title (one per file)

## H2 - Major Sections

### H3 - Subsections

#### H4 - Details

Don't skip levels: H1 → H2 → H3 (not H1 → H3)
```

### Code Blocks

Always specify language for syntax highlighting:

````markdown
```bash
npm run build
```

```typescript
const { data } = await supabase.from("usage").select("*");
```

```tsx
<Button variant="primary">Click Me</Button>
```
````

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   |
```

### Links

```markdown
# Internal links (relative paths)

[Architecture](../architecture/architecture.md)

# Link to heading

[See quality gates](#quality-checklist)

# File references in prose

See `lib/stripe/plans.ts` for pricing configuration.
```

---

## Living Documentation

### Files That Must Stay Current

| File                 | Update When          | Purpose               |
| -------------------- | -------------------- | --------------------- |
| CHANGELOG.md         | Every change         | Version history       |
| README.md            | Major features       | Project overview      |
| CLAUDE.md            | Architecture changes | AI context            |
| docs/standards/\*.md | Standards change     | Development standards |
| docs/api/\*.md       | API routes change    | API reference         |

### Update Triggers

**Update CLAUDE.md when:**

- Directory structure changes
- New commands added
- Architecture patterns change
- New "NEVER do X" rules needed

**Update CHANGELOG.md when:**

- Any code change committed
- Documentation improvements
- Dependencies updated
- Bug fixes applied

**Update docs/\*.md when:**

- Related code changes
- New hooks, components, or routes added
- Configuration changes
- Feature behavior changes

---

## Quality Checklist

### Before Committing Documentation

```yaml
content_quality:
  - [ ] Headings follow hierarchy (no skipped levels)
  - [ ] Code blocks have syntax highlighting
  - [ ] Links work (relative paths correct)
  - [ ] No spelling errors
  - [ ] Examples are accurate

formatting:
  - [ ] Consistent heading style
  - [ ] Tables properly formatted
  - [ ] Single blank line between sections
  - [ ] No trailing whitespace

accuracy:
  - [ ] File counts match actual codebase
  - [ ] Hook/component lists are complete
  - [ ] API endpoints match route files
  - [ ] Configuration examples match actual configs
```

### Link Validation

Prefer relative paths for internal links:

```markdown
# Good

[Standards](../standards/code-style.md)

# Bad - breaks if repo moves

[Standards](/docs/standards/code-style.md)
```

---

## Document Templates

### Standards Document

```markdown
# [Standard Name]

Brief description of what this standard covers.

## Overview

[2-3 sentences on purpose and scope]

---

## Rules

### Rule 1: [Name]

[Explanation]

**Do:**

- Correct approach

**Don't:**

- Incorrect approach

---

## Examples

[Concrete examples with code]

---

## Related Standards

- [Related 1](link)
- [Related 2](link)
```

### Feature Documentation

```markdown
# [Feature Name]

Brief description of the feature.

## Overview

[Purpose and how it fits into the app]

---

## Usage

[How to use the feature]

---

## Implementation

[Technical details, key files]

---

## Configuration

[Any configuration options]

---

## Related

- [Related feature](link)
```

---

## Documentation Update Command

Use `/update.docs` to synchronize all documentation with the codebase:

```bash
/update.docs
```

This command will:

1. Scan repository for current metrics
2. Update README.md, CLAUDE.md, CHANGELOG.md
3. Verify and update all `/docs/*.md` files
4. Validate internal links
5. Report any documentation drift

---

## Best Practices

### Do

- Write for newcomers to the codebase
- Provide concrete examples
- Update docs with code changes
- Link to related documentation
- Use consistent terminology
- Test all code examples

### Don't

- Assume prior knowledge
- Use jargon without explanation
- Write vague instructions
- Let docs get stale
- Use "click here" as link text
- Duplicate content across files

---

**Last Updated:** 2026-01-04

---

## Document Templates

### Template A — Architecture ("How X Works")

```markdown
# How [System] Works

## Why This Matters

## Key Files

## [Content sections]
```

Use for: `docs/architecture/how-*.md`

### Template B — Standards

```markdown
# [Topic] Standards

## [Content sections]

## What NOT to Do

## Verification Checklist
```

Use for: `docs/standards/*.md`

### Template C — Guide

```markdown
# [Task Name]

> [One-line purpose]

## Prerequisites

## Steps

## Verification

## Troubleshooting
```

Use for: `docs/guides/*.md`

### Template D — Navigation README

```markdown
# [Section Name]

[One-sentence description]
| Document | Purpose |
```

Use for: `docs/*/README.md`

---

## What NOT to Do

- **No docs without cross-references** — every document should link to related docs
- **No missing verification checklists** in standards files
- **No stale version dates** — update `Last Updated` when making substantive changes

## Verification Checklist

- [ ] Every subdirectory under `docs/` has a `README.md`
- [ ] All standards files have "What NOT to Do" and "Verification Checklist" sections
- [ ] No broken internal links (run link checker or manually verify after moves)
- [ ] New architecture docs follow Template A
- [ ] New guides follow Template C
