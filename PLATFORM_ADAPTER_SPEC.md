# Platform Adapter Spec

## Purpose

This document defines how chat-platform adapters should be structured in this project.

It is based on the refactor already completed for the Telegram integration and is intended to guide:

- future `LINE` integration
- future `Web-only` control entry
- new game projects that reuse this architecture

The adapter layer should remain thin and reusable.

## Core Principle

Each platform adapter should only do four things:

1. receive and validate platform events
2. parse platform-specific input
3. call shared game services
4. render platform-specific output

The adapter should **not** contain core game rules.

## Current Telegram Adapter Structure

The current Telegram adapter is split into:

```txt
src/lib/platforms/telegram/
  ui.ts
  messages.ts
  flows.ts

src/app/api/telegram/webhook/route.ts
```

### `ui.ts`

Owns Telegram-specific interface definitions:

- reply keyboard layout
- command maps
- weather command maps
- speech option menus
- role / character pick keyboard
- reserved text detection

This file should contain:

- button text
- keyboard grouping
- text-to-action lookup maps

This file should **not** write Firebase directly.

### `messages.ts`

Owns Telegram-specific output copy:

- help messages
- application state messages
- approval / rejection notices
- weather mode messages
- player list text
- review result text
- speech feedback text

This file should contain:

- display strings
- assembled multi-line response messages

This file should **not** call services.

### `flows.ts`

Owns Telegram interaction flow logic:

- player flow
- admin flow

This file may:

- inspect incoming text
- call game services
- decide which Telegram keyboard/message to use

This file should not contain low-level webhook parsing.

### `route.ts`

Owns webhook entry only:

- parse Telegram payload
- extract user/chat/message context
- load application/player/session state
- determine admin or player
- forward to matching Telegram flow

This file should stay as small as possible.

## Shared Services Boundary

Platform adapters should call shared services from:

```txt
src/lib/game/
```

Current examples already in use:

- `player-service.ts`
- `world-service.ts`

Future services should follow the same idea:

- platform-independent API
- no Telegram-specific text
- no LINE-specific response format

## Required Adapter Responsibilities

Every platform adapter should provide equivalents for these areas.

### 1. Input parsing

Examples:

- Telegram:
  - text commands
  - reply keyboard labels
- LINE:
  - postback data
  - quick reply actions
  - rich menu actions

The adapter should convert those into internal actions or branch logic.

### 2. User identity mapping

Adapters must normalize platform identity into:

```json
{
  "platform": "telegram",
  "platformUserId": "123456789",
  "platformUsername": "example_user"
}
```

LINE should produce the same shape with `platform = "line"`.

### 3. Permission routing

The adapter must decide whether the incoming user is:

- manager
- approved player
- pending applicant
- unknown user

### 4. Response rendering

The adapter must return platform-native output:

- Telegram reply keyboard
- Telegram text
- LINE quick reply
- LINE flex message
- web control cards

## Recommended Directory Pattern for New Platforms

When adding a new platform, mirror the Telegram structure.

Example for LINE:

```txt
src/lib/platforms/line/
  ui.ts
  messages.ts
  flows.ts

src/app/api/line/webhook/route.ts
```

### `line/ui.ts`

Would contain:

- rich menu action labels
- quick reply structures
- line-specific action maps

### `line/messages.ts`

Would contain:

- line-specific response text
- notification formatting

### `line/flows.ts`

Would contain:

- player flow
- admin flow

### `api/line/webhook/route.ts`

Would contain:

- signature verification
- payload parsing
- context loading
- admin/player routing

## Adapter Input/Output Contract

Every adapter should ideally conform to the same high-level interaction model:

### Input context

```ts
type PlatformContext = {
  platform: "telegram" | "line" | "web";
  platformUserId: string;
  platformUsername?: string;
  displayName?: string;
  chatId?: string;
  rawText?: string;
};
```

### Output intent

Each flow should produce:

- response text
- platform-native menu or action UI
- optional status payload for logs/debug

The rendering can differ, but the action outcome should be the same.

## Action Domains

All platform adapters should eventually map into these shared domains:

- application
- review
- player state
- player speech
- character selection
- weather
- knowledge links

### Example internal action categories

```txt
application/
  apply
  check_status

review/
  approve
  reject
  block

player/
  update_status
  update_character
  set_speech
  clear_speech

world/
  set_weather_auto
  set_weather_rain

knowledge/
  save_url
```

## Existing Telegram Flow Coverage

The current Telegram adapter already covers:

### Player-side

- apply to join
- check application
- enter game
- choose gender
- choose character
- update own state
- set speech
- clear speech
- preset speech
- emoji speech
- announcement speech

### Admin-side

- view manager help
- view player preview
- review pending applications
- approve / reject / block
- list players
- view weather mode
- change weather mode
- control manager state
- save knowledge URLs

## Adapter Rules

For every adapter implementation:

1. keep platform UI text out of game services
2. keep database writes out of `ui.ts` and `messages.ts`
3. keep route handlers thin
4. prefer `flows.ts` for branch logic
5. prefer `messages.ts` for assembled text blocks
6. prefer `ui.ts` for menu/button definitions

## Migration Rule

When adding a new platform:

- do **not** duplicate game rules inside the new webhook
- first reuse:
  - `player-service`
  - `world-service`
- only create the platform-specific:
  - menus
  - messages
  - routing

## Recommended Next Step for LINE

If LINE is added later, the safe order is:

1. create `src/lib/platforms/line/ui.ts`
2. create `src/lib/platforms/line/messages.ts`
3. create `src/lib/platforms/line/flows.ts`
4. create `src/app/api/line/webhook/route.ts`
5. map LINE actions to the same shared game services already used by Telegram

## Practical Summary

The adapter model in this project should always look like:

```text
platform webhook
    ↓
route.ts
    ↓
flows.ts
    ↓
game services
    ↓
Firestore

platform UI/messages are attached alongside the flow layer,
but never replace the shared game core
```

This is the recommended structure for every future platform in this project.
