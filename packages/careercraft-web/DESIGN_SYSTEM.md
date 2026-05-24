# CareerCraft Design System

`src/styles/design-system.css` is the canonical design source of truth.

## Token policy

- Use semantic tokens (`--ds-*`) for all new visual styling.
- Use Tailwind semantic mappings (`bg-background`, `text-foreground`, `border-border`, `bg-primary`) instead of literals.
- Legacy tokens (`--cc-*`, `--as-*`) are compatibility aliases only.
- `src/styles/craft.css` and `src/styles/astral.css` are deprecated compatibility layers. Do not add new styles there.

## Component policy

- Shared UI primitives should be built in `src/components/ui`.
- App-level wrappers should be built in `src/components/craft/AppPrimitives.tsx` or `src/components/astral/*` and consume semantic tokens.
- Prefer shared utility classes from `design-system.css` (`.ds-shell`, `.ds-surface`, `.ds-btn`, `.ds-btn-primary`) over one-off color classes.

## Guardrails

- Run `npm run lint:tokens` in `packages/careercraft-web` before PR.
- The guardrail blocks raw hex and `rgb/rgba(...)` literals in `src/components`, `src/pages`, and `src/features`.
- If a color literal is temporarily required, annotate the line with `data-allow-color-literal` and add a follow-up task to replace it with a token.

## PR checklist

- [ ] New/updated UI code uses semantic tokens only.
- [ ] No new raw color literals in components/pages/features.
- [ ] Shared primitives updated instead of duplicating styles.
- [ ] Public and app surfaces visually align with the unified stripe-polish system.
