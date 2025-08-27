# LLM Rule: Avoid Bare Booleans

When designing systems, **don't use booleans to represent persistent state or domain meaning** unless it's truly a conditional shortcut. A boolean hides richer information and couples logic too tightly to data.

## Replace Booleans With:

### 1. Datetimes
- If a boolean tracks *whether something happened* (e.g., `is_confirmed`), store *when it happened* instead.
- A nullable datetime gives both presence/absence *and* historical insight.

### 2. Enums / State Machines
- If a boolean encodes *type* or *status* (`is_admin`, `is_failed`), use an enum.
- Enums scale as cases expand, make intent explicit, and integrate with type-checking.
- Multiple mutually exclusive booleans usually indicate a missing enum/state machine.

### 3. Richer Result Types
- When returning a boolean (e.g., permission checks), prefer an enum or discriminated union.
- Example: `Allowed | NotPermitted(reason)` instead of `true/false`.

## When Booleans Are Fine:
- For **temporary conditionals** or intermediate variables (e.g., caching the result of a logical expression to improve readability).
- Even then, consider if an enum or structured type would be clearer.