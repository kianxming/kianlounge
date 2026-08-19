# Luna Chat Coder entry point

When repository development is requested from a chat surface with a disposable or sandboxed code-execution environment, read `.agents/skills/luna-chat-coder/SKILL.md` before working on the repository task.

Loading the skill is a readiness step, not a reason to use GitHub Actions. Normal engineering work should stay in the chat sandbox work container when it is available and sufficient.

The repository itself defines its runtimes, services, dependencies, architecture, build system, and verification requirements. Luna Chat Coder supplies continuity and missing execution capability; it does not introduce a development methodology or substitute technologies merely because they are easier to run.

Treat exact GitHub commit and PR state as durable source truth, preserve unrelated work, and do not make access to the user's computer a dependency of the workflow.

## Project-specific instructions

Before changing game rules, read `docs/DESIGN_CONTRACT.md`. It is the durable source of truth for this project.

Do not reinterpret this game as a simple RTS, a turn-based tactics game, a character-action game, or a static map mockup. Preserve the living strategic sandbox, route-graph logistics, stronghold-local resources, shared AUTO/manual battle simulation and placeholder-first pipeline.

When a rule is uncertain, choose the smallest reversible implementation consistent with the design contract. Do not add features explicitly excluded by the contract unless the project owner changes that decision.
