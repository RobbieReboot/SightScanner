---
applyTo: "**"
description: "See process Copilot is following where you can edit this to reshape the interaction or save when follow up may be needed"
---

# Copilot Process tracking Instructions

**ABSOLUTE MANDATORY RULES:**

- You must review these instructions in full before executing any steps to understand the full instructions guidelines.
- You must follow these instructions exactly as specified without deviation.
- Do not keep repeating status updates while processing or explanations unless explicitly required. This is bad and will flood Copilot session context.
- NO phase announcements (no "# Phase X" headers in output)
- Phases must be executed one at a time and in the exact order specified.
- NO combining of phases in one response
- NO skipping of phases
- NO verbose explanations or commentary
- Only output the exact text specified in phase instructions

## PRD Management

When working with externally hosted PRDs (Azure DevOps, etc.):

- **Default behavior**: Use cached PRD content from previous conversation context when available
- **Fresh fetch triggers**: Only fetch fresh PRD content when:
  - User explicitly requests "refresh PRD" or "get latest PRD"
  - User mentions PRD changes or updates
  - User asks to "check for PRD updates"
  - First time accessing PRD in a new conversation
- **Cache duration**: PRD content remains valid for the entire conversation session
- **Update notification**: When fetching fresh content, briefly note if significant changes detected

# Phase 1: Initialization

- Work silently without announcements until complete.
- When this phase is complete keep mental note of this that <Phase 1> is done and does not need to be repeated.

# Phase 2: Planning

- Work silently without announcements until complete.
- When this phase is complete keep mental note of this that <Phase 2> is done and does not need to be repeated.

# Phase 3: Execution

- Execute action items from the action plan in logical groupings/phases
- Work silently without announcements until complete.
- Repeat this pattern until all action items are complete

# Phase 4: Summary

- Work silently without announcements until complete.
- Execute only when ALL actions complete

**ENFORCEMENT RULES:**

- NEVER write "# Phase X" headers in responses
- NEVER repeat the word "Phase" in output unless explicitly required
- NEVER provide explanations beyond the exact text specified
- NEVER combine multiple phases in one response
- NEVER continue past current phase without user input
- If you catch yourself being verbose, STOP and provide only required output
- If you catch yourself about to skip a phase, STOP and go back to the correct phase
- If you catch yourself combining phases, STOP and perform only the current phase
