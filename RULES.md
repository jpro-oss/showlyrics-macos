# .rules.md

# NON-NEGOTIABLE ENGINEERING RULES

These rules override all other instructions.

Violating these rules is considered a critical failure.

---

# RULE 1

Never assume.

If information is missing:

* ask
* inspect
* analyze

Do not invent.

Do not guess.

Do not hallucinate.

---

# RULE 2

Never modify architecture without impact analysis.

Before changing:

* API
* WebSocket
* Database
* Playback Engine
* Sync Engine
* Cache Engine

AI must provide:

* reason
* impact
* risk
* migration plan

---

# RULE 3

Never remove existing code unless proven unused.

Required process:

1. Locate references.
2. Verify references.
3. Verify runtime usage.
4. Document findings.
5. Only then remove.

---

# RULE 4

Never generate placeholder implementations.

Forbidden:

TODO
FIXME
mock implementations
fake logic

All generated code must be production-capable.

---

# RULE 5

Never optimize before profiling.

Required:

1. Identify bottleneck.
2. Collect evidence.
3. Explain root cause.
4. Propose solution.

No speculative optimization.

---

# RULE 6

Always prefer deterministic systems.

Preferred:

State Machines
Event Systems
Timestamp-Based Sync
Finite States

Avoid:

Magic Numbers
Hidden Side Effects
Implicit State

---

# RULE 7

All playback state must originate from Timeline Server.

Forbidden:

Client-authoritative playback.

Controller-authoritative playback.

---

# RULE 8

Playback must survive:

* controller crash
* websocket reconnect
* page reload
* client reconnect

without affecting other clients.

---

# RULE 9

Video playback must use native hardware acceleration.

Preferred:

HTML5 Video Element

Forbidden:

Canvas video rendering
Frame-by-frame drawing

unless explicitly required.

---

# RULE 10

Never stream media continuously if local cache exists.

Preferred order:

1. Local Cache
2. Local Storage
3. SSD Cache
4. Network

Network should be last resort.

---

# RULE 11

Every implementation must explain:

* Why
* How
* Tradeoffs
* Risks

before code generation.

---

# RULE 12

Every major feature requires:

* Architecture Review
* Failure Analysis
* Performance Analysis

before implementation.

---

# RULE 13

If uncertainty exists:

Output:

UNCERTAINTY DETECTED

Then explain:

* what is unknown
* what needs validation
* possible outcomes

Never fabricate certainty.

---

# RULE 14

When reviewing code:

Assume code is wrong until verified.

Do not trust assumptions.

Verify behavior.

Verify state transitions.

Verify concurrency.

Verify edge cases.

---

# RULE 15

For synchronization systems:

Always prioritize:

Correctness
Determinism
Recovery

over:

Convenience
Simplicity
Shorter code

---

# RULE 16

All websocket logic must tolerate:

* packet loss
* duplicate messages
* delayed messages
* reconnects

---

# RULE 17

Every solution must include:

Worst Case Scenario

Failure Scenario

Recovery Scenario

---

# RULE 18

Never claim performance improvements without measurable metrics.

Required:

Before
After
Expected Gain

---

# RULE 19

All architecture decisions must be evaluated against:

* scalability
* reliability
* maintainability
* performance
* fault tolerance

---

# RULE 20

If PRD and implementation conflict:

PRD wins.

If TDD and implementation conflict:

TDD wins.

Never silently override specifications.
