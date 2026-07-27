# Organic launch campaign design

## Objective

Launch Guardrail Wallet to developers building AI agents and to self-hosting
enthusiasts without paid advertising. The campaign should turn the existing
public demo and repository into a clear invitation to test, install, report
issues, and contribute.

The primary first-month outcomes are 100 GitHub stars, 20 documented installs,
5 active testers, and 3 independent mentions or discussions. These are learning
targets, not promises presented in product copy.

## Positioning

The core message is:

> A self-hosted payment firewall for AI agents. Agents request purchases;
> policies and the owner decide; keys stay at home.

The household purchase flow is the lead example because it makes the security
model concrete. TON is presented as one pluggable payment rail, not as a token,
investment, or the product's identity.

Every launch asset must state that the public demo uses a stub executor and
moves no real money. Copy must not claim production readiness, audited security,
guaranteed savings, or autonomous access to unrestricted funds.

## Audience

The primary audience is developers working on AI agents, local-first software,
MCP integrations, and agentic commerce. The secondary audience is self-hosting
enthusiasts who want local control and explicit approval for household tasks.
TON developers are a distribution channel and integration audience, not the
main positioning.

## Campaign assets

The repository is the campaign's source of truth. The implementation produces:

- a tagged GitHub pre-release with a concise problem, demo flow, limitations,
  quickstart, and request for testers;
- a launch page in the repository containing reusable facts, links, screenshots,
  demo credentials, and disclosure language;
- one short demo recording or animated walkthrough showing request, policy,
  approval, and stub execution;
- platform-specific post drafts for Show HN, `r/selfhosted`, `r/LocalLLaMA`, DEV
  Community, relevant Telegram communities, and TON developer communities;
- stable campaign links with privacy-preserving UTM parameters;
- issue templates for installation feedback and integration proposals.

Posts are adapted to each community rather than duplicated verbatim. Every post
leads with the problem and working demo, not a donation request. Support links
remain available in the repository but are not the campaign call to action.

## Launch sequence

The campaign runs in three stages so feedback can improve later posts.

1. Publish the GitHub pre-release and launch page, then verify all demo,
   documentation, quickstart, and issue links.
2. Publish the developer-focused announcement to Show HN and DEV Community.
   Use the first technical questions to clarify documentation before expanding.
3. Publish tailored posts to self-hosting, local AI, Telegram, and TON developer
   communities. Reply with reproducible technical details and record recurring
   questions as documentation issues.

Only GitHub-native publication is automated from the repository. External posts
are published through the owner's accounts after a final preview, respecting
each community's self-promotion rules.

## Measurement

Campaign links use a consistent scheme:

```text
https://patronhill.ru/?utm_source=<community>&utm_medium=organic&utm_campaign=guardrail_launch
```

Public metrics are GitHub stars, forks, clones, release downloads, issues, and
external discussions. The demo may count aggregate landing and documentation
visits, but it must not add fingerprinting, cross-site advertising trackers, or
collection of wallet, agent, or household data for marketing.

Qualitative feedback is grouped into installation friction, unclear security
boundaries, missing integrations, and useful household workflows. Product
changes are prioritized from repeated evidence rather than raw page views.

## Safety and community rules

- Never publish wallet mnemonics, bot tokens, API secrets, server keys, or owner
  credentials in campaign material.
- Never describe the demo stub as a real payment executor.
- Never post the same message repeatedly or bypass moderation rules.
- Never purchase followers, stars, votes, testimonials, or backlinks.
- Never imply endorsement from TON, Telegram, OpenAI, or a community.
- Pause a channel if readers consistently misunderstand the security boundary.

## Failure handling

If the demo is unavailable, external promotion pauses until the production smoke
check passes. If a launch link is wrong, the canonical launch page is corrected
before publishing more posts. If a community removes a post, the campaign
records the stated reason and does not repost without moderator permission.

Security reports take priority over promotion. A credible report pauses the
campaign, follows `SECURITY.md`, and resumes only after the public claim and demo
behavior accurately reflect the resolved state.

## Success criteria

The campaign is ready to launch when the GitHub pre-release, launch page, demo
walkthrough, post drafts, UTM links, and feedback templates are internally
consistent; the public demo and quickstart pass their existing smoke checks; and
all copy clearly describes the stub executor and self-hosted trust model.

The campaign is successful when it creates attributable technical evaluation:
developers run the project, submit useful feedback, discuss the security model,
or propose integrations. Star count alone is not treated as product validation.
