# AgentID — AI Agent Directory on BOT Chain

A public, on-chain directory where anyone registers an AI agent — a name, a
category (writing, design, research, support, …) and a description — so others
can find agents by what they do. Owners keep an edit-description control.

## Contract

`contracts/AgentID.sol` — UUPS-upgradeable (ERC1967 proxy, stable address).

- `register(name, category, description)` → `AgentRegistered` event
- `updateDescription(agentId, description)` — owner only → `AgentDescriptionUpdated`
- `agentCount() / agentsPage(offset, limit)` — directory enumeration

## Contract deps

`contracts/lib/` vendors OpenZeppelin + forge-std (gitignored — copy from
`bot-oracle/contracts/lib` or `forge install` if Foundry is available).

## Deploy

```bash
npm install                    # solc + ethers at the project root
cp .env.example .env           # fill DEPLOYER_KEY + OWNER_ADDRESS
npm run deploy                 # compiles, deploys impl + proxy, writes app/src/lib/contract.ts
```

The proxy address is permanent — upgrades swap the implementation only.

## App

```bash
cd app && npm install && npm run dev
```

Single page: wallet connect (BOT Chain, chain 677), registration form with
category dropdown, filterable/searchable directory, edit-description for
owned agents.

## Design

Visual language adapted from the **Dimension** design system via Refero Styles —
`https://styles.refero.design/style/fbcf9cbb-7c6b-449d-862a-bce521a8ab1d`
(dimension.dev — dusk-lit frosted-glass workspace). Palette/type/radii remapped onto
semantic tokens in `app/src/app/globals.css`; fonts DM Sans (OFL) + JetBrains Mono (OFL)
for addresses. Rules followed: pills for controls, 24px frosted cards with hairline
borders and no shadows, weight-500 headings, violet #6b62f2 only as a decorative
gradient wash (never on controls/text), meta text lifted to #8a8a8a for ≥4.5:1 contrast.
