# ADR-0002: Build a mobile-first PWA instead of native apps

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Aaj needs a mobile recording experience, a judge-tryable live URL, and rapid delivery. Separate native applications would add distribution, permissions, build, and review complexity without improving the core voice-to-plan proof.

## Decision

Build a responsive web application with progressive-web-app metadata and a server-side inference boundary. Use browser recording where supported and file upload as the compatibility fallback.

## Consequences

- One deployment supports mobile and desktop judging.
- Browser codec and microphone differences require capability detection and fallback.
- Installability is useful polish but follows real 0G integration in priority.
- Native-only capabilities and app-store distribution are out of scope.
