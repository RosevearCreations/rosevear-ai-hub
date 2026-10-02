# ADR-0002: Home Assistant as primary IoT layer

**Status:** Accepted  
**Date:** 2026-10-02

## Context
Directly maintaining integrations for Meross, Govee, Gosund, cameras, sensors, and future brands would duplicate work.

## Decision
Home Assistant is the primary IoT abstraction layer.

## Exceptions
A direct integration may be added only when:
- Home Assistant cannot expose required functionality
- a stable legitimate API/local protocol exists
- the security model approves it
- maintenance cost is documented
