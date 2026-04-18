# Code Review Interview: Section 01 - Schemas

**Date:** 2026-04-18

## Interview Items

### Range validation on float/int fields
**Decision:** Keep permissive (no Field constraints). The spec explicitly says float ranges are not enforced at schema level to avoid Gemini rejecting outputs on minor floating-point overflows. Validation happens at the business layer.

## Auto-Fixes (no discussion needed)

### Add missing roundtrip tests
Adding standalone roundtrip tests for ModeratorQuestion, AnalystSummary, and TribeResult to improve coverage from ~85% to ~90%+. These are obvious improvements.

## Let Go

- Minor observations about Literal types for QuoteCard.facet/sentiment, Project.status, Project.created_at — these are intentional design choices per spec and don't warrant changes for a hackathon project.
