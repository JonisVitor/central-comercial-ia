# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner/operator of a small landing-page business who researches local companies, manages sales conversations, and delivers websites.

## Product Purpose

Central Comercial IA organizes local-business prospects, manual outreach, sales stages, and landing-page projects so the operator can see the next action and keep deadlines visible.

## Operating Context

Prospects are found and checked manually, including Google Maps and digital presence. WhatsApp messages are prepared for manual sending. When a sale is confirmed, the project moves through materials, production, review, adjustments, delivery, and annual hosting.

## Capabilities and Constraints

- The current web app is a Vite PWA hosted on Cloudflare Pages, with Pages Functions and D1 for shared online state.
- Lead, message, and project workflows are editable from the app.
- In local development, a separate Node runtime can run six Codex CLI profiles sequentially to analyze records and a seventh web researcher on demand using Codex CLI's native web-search tool.
- The floating assistant is available only when the local Codex runtime is running. It can answer from supplied context, start a read-only internal analysis, or perform a public web search with cited links when explicitly asked.
- The web researcher is read-only: it does not edit CRM data, publish sites, or contact businesses. Codex CLI's web search consumes the authenticated Codex plan allowance and does not require an API key.
- The public Cloudflare app and mobile clients cannot connect to the local agent runtime until a protected remote execution bridge is designed and configured.
- Sending messages to prospects remains a manual, user-approved action.

## Brand Commitments

- Product name: Central Comercial IA.
- Preserve the existing dark navy interface, orange accent, and established typography and controls.
- Use clear, direct Brazilian Portuguese labels.

## Evidence on Hand

- The app currently stores and synchronizes leads, prepared messages, and projects.
- The local panel reports actual Codex CLI execution states and outputs; office artwork is a visualization of those states, not the worker itself.
- External research and landing-page reference collection are available only through the local Codex CLI runtime; they are not connected to the public Cloudflare app or mobile clients yet.

## Product Principles

- Keep the operator in control of customer contact and consequential changes.
- Make the evidence and next action for each lead easy to understand.
- Show whether activity is real, pending, or simulated.
- Keep sales work and website delivery connected in one workflow.
