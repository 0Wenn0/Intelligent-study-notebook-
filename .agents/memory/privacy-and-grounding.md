---
name: Privacy and grounding
description: Product constraints for private study material and source-grounded learning.
---

The user wants a private, calm, reading-focused notebook, approval before library entry, original excerpts on every item, and clear separation of source facts from generated interpretation. Never invent facts beyond supplied material.

**Why:** These are explicit product requirements.

**How to apply:** New source extraction must create review candidates rather than silently approved records. Preserve quotations and source references through editing and merging.

The smallest useful version uses device-local persistence, not cloud accounts. Real uploaded documents must not be bundled into application assets; use independently authored and clearly labeled demo notes instead.

**Why:** Bundled documents are accessible to visitors and would undermine the requested privacy. Local import keeps personal source text out of the shipped app. This is a first-version scope choice, not a permanent prohibition on authenticated sync.

**How to apply:** Explain browser-only storage and backup limitations honestly. Any future remote processing or sync needs an explicit privacy decision and authentication.

Keep extraction on-device; do not add an external AI service. Demo items also require user approval and must start pending. Keep the existing visual style.

**Why:** The user explicitly set these constraints when requesting improvements to the existing notebook.

**How to apply:** Do not interpret requests for intelligent assistance as permission to connect an AI service or auto-approve demo material. Deliver the smallest working additions without unsolicited expansion.

The interface must support Spanish and English, but never translate original source excerpts.

**Why:** Source fidelity is central to the user's bilingual study workflow.

**How to apply:** Translate interface labels and generated templates, not the underlying evidence or user-written content.
