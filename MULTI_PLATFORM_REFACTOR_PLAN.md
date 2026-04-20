# Multi-Platform Refactor Plan

## Purpose

This document defines how the current `funyweb` architecture should evolve from a Telegram-first game control system into a platform-neutral game core that can later support:

- `Telegram`
- `LINE`
- `Web-only`
- other chat platforms if needed

The goal is **not** to replace Telegram immediately.
The goal is to keep Telegram as the first working channel while restructuring the system so additional channels can be attached without rewriting the whole game.

## Current Situation

The current project already has these foundations:

- `Next.js` frontend
- `Netlify` deployment
- `Firebase Firestore` as the shared data source
- `Telegram Bot` as the main control channel
- manager/player permissions
- homepage with:
  - featured stage
  - player deck
  - knowledge list
- player personal page
- player application and approval flow
- weather controls
- speech bubble system

However, parts of the data model and bot flow still assume `Telegram` as the only platform.

## Refactor Target

The long-term target is:

1. chat platforms only collect input and render menus
2. game logic lives in shared services
3. frontend only reads normalized player/world data
4. player identity is stored in a platform-neutral way

In short:

- `Telegram / LINE / Web` = control channels
- `Firebase + service layer` = game core
- `Next.js frontend` = visual presentation layer

## Refactor Priorities

### Priority 1: Make identity platform-neutral

Current player/application records still rely heavily on Telegram-specific fields like:

- `telegramUserId`
- `telegramUsername`

These should become a neutral identity model.

### Recommended common identity fields

```json
{
  "platform": "telegram",
  "platformUserId": "123456789",
  "platformUsername": "example_user"
}
```

Later, LINE can use:

```json
{
  "platform": "line",
  "platformUserId": "Uxxxxxxxx",
  "platformUsername": ""
}
```

### Priority 2: Separate platform adapter from game logic

Current bot code does both:

- platform parsing
- game state mutation

These should be split into:

- `platform adapters`
- `game services`

Recommended structure:

```txt
src/lib/platforms/
  telegram/
  line/

src/lib/game/
  players/
  applications/
  speech/
  weather/
  knowledge/
```

### Priority 3: Standardize actions

Bot button text should not directly equal game logic.
Instead, map all interactions into reusable action names.

Example:

```ts
type GameAction =
  | "apply_join"
  | "check_application"
  | "enter_game"
  | "set_status_working"
  | "set_status_sleeping"
  | "set_home_mode_gaming"
  | "set_weather_auto"
  | "set_weather_rain"
  | "speech_open_input"
  | "speech_clear";
```

This allows:

- Telegram reply keyboard
- Telegram inline buttons
- LINE rich menu
- LINE quick replies

to all point to the same internal logic.

## Recommended Data Model

## players

Recommended normalized player document:

```json
{
  "id": "player_001",
  "platform": "telegram",
  "platformUserId": "123456789",
  "platformUsername": "example_user",
  "name": "D-exHor",
  "isApproved": true,
  "isManager": false,
  "status": "at_home",
  "homeMode": "idle",
  "location": "home",
  "characterGender": "male",
  "characterId": "d-exhor",
  "lobbyStatus": "active",
  "speechText": "",
  "speechType": "custom",
  "updatedAt": "2026-04-08T20:00:00.000Z",
  "updatedBy": "telegram",
  "joinedAt": "2026-04-08T18:00:00.000Z"
}
```

### Notes

- `platform + platformUserId` should become the cross-platform identity pair
- `telegramUserId` may be kept temporarily for migration, but should eventually become legacy
- `updatedBy` should track channel origin:
  - `telegram`
  - `line`
  - `web`
  - `admin`
  - `system`

## applications

Recommended normalized application document:

```json
{
  "platform": "telegram",
  "platformUserId": "123456789",
  "platformUsername": "example_user",
  "displayName": "David",
  "status": "pending",
  "createdAt": "2026-04-08T18:10:00.000Z",
  "reviewedAt": null,
  "reviewedBy": null,
  "note": ""
}
```

Recommended `status` values:

- `pending`
- `approved`
- `rejected`
- `blocked`

## world settings

Recommended platform-neutral world document:

```json
{
  "weatherMode": "auto",
  "manualWeather": null,
  "timeMode": "local",
  "updatedAt": "2026-04-08T20:00:00.000Z",
  "updatedBy": "telegram"
}
```

## knowledge items

Keep this independent from chat platform:

```json
{
  "title": "Example title",
  "url": "https://example.com",
  "sourcePlatform": "telegram",
  "createdBy": "123456789",
  "createdAt": "2026-04-08T20:00:00.000Z"
}
```

## Service Layer Design

The service layer should not know or care whether input came from Telegram or LINE.

Recommended services:

### `player-service`

- approve player
- reject player
- block player
- create player
- update player status
- update player character
- update player speech
- promote waitlist player

### `application-service`

- submit application
- get application status
- list pending applications
- review application

### `weather-service`

- set auto weather
- set manual rain
- get effective weather

### `speech-service`

- set custom speech
- set preset speech
- set emoji speech
- set announcement speech
- clear speech

### `knowledge-service`

- create item from URL
- enrich title
- list paginated items

## Platform Adapter Design

Each chat platform should only do these things:

1. verify request/webhook
2. parse platform event format
3. convert input into internal action
4. call shared services
5. render response for that platform

### Telegram adapter responsibilities

- parse commands and buttons
- manage reply keyboard / inline keyboard
- deliver chat response text
- route action to services

### LINE adapter responsibilities

- validate LINE signature
- parse event payload
- map rich menu / postback / text to internal actions
- render LINE-friendly response payloads

## UI and Frontend Impact

Good news: the current frontend mostly already works in a platform-neutral way.

The homepage and player pages mainly depend on:

- player state
- weather state
- knowledge items
- speech data

These are already mostly independent from Telegram.

### What should change in frontend models

The frontend should gradually stop reading Telegram-specific fields directly.

Instead of depending on:

- `telegramUserId`
- `telegramUsername`

it should prefer:

- `platform`
- `platformUserId`
- `platformUsername`

## Migration Strategy

Do not rewrite everything at once.

Use this staged migration:

### Stage 1: Add neutral fields

Keep old fields for compatibility, but start writing:

- `platform`
- `platformUserId`
- `platformUsername`

### Stage 2: Update service APIs

Refactor Firestore helpers so all new reads/writes use neutral identity fields first.

### Stage 3: Shrink Telegram-specific assumptions

Move Telegram-only logic into:

```txt
src/lib/platforms/telegram/
```

### Stage 4: Add LINE adapter

Only after stages 1 to 3 are stable, create:

```txt
src/lib/platforms/line/
```

### Stage 5: Remove legacy Telegram-only assumptions

Only after migration is complete should old Telegram-specific fields become optional or deprecated.

## Recommended Folder Refactor

Suggested structure:

```txt
src/
  app/
    api/
      telegram/
      line/
      status/
      weather/
  components/
    scene/
  lib/
    firebase/
    game/
      applications/
      players/
      speech/
      weather/
      knowledge/
    platforms/
      telegram/
      line/
  types/
```

## Permissions Model

This should remain channel-independent.

### Manager

- approve players
- reject players
- block players
- control global weather
- manage knowledge list
- inspect all players

### Player

- update own status
- update own speech
- choose own character
- access own player page

### Waitlist player

- can access own page
- does not appear in main homepage stage deck

## Telegram vs LINE Implementation Impact

### Reusable between both

- Firestore schema
- player state logic
- weather logic
- speech logic
- homepage
- player page
- knowledge list
- approval rules

### Must be implemented per platform

- webhook verification
- menu/button payloads
- message formatting
- callback/postback handling
- input mode/session handling

## Recommended Next Steps

If this project is going to support LINE later, the safest order is:

1. add platform-neutral identity fields to `players` and `applications`
2. create service modules for players/applications/weather/speech
3. reduce Telegram webhook into a platform adapter only
4. migrate frontend code away from Telegram-specific assumptions
5. add a LINE adapter

## Rule for New Projects

If a new game is built from this architecture, the new project should follow these rules from day one:

- never hardcode one chat platform into the game core
- use `platform + platformUserId` as identity
- keep frontend visual logic separate from chat logic
- keep platform menu text separate from game actions
- keep Firestore schema reusable across Telegram, LINE, and Web

## Practical Summary

The architecture should evolve toward this:

```text
Telegram / LINE / Web
        ↓
 platform adapters
        ↓
   shared game services
        ↓
 Firebase Firestore
        ↓
 Next.js frontend
```

This is the structure that will let the current Telegram-based game grow into a multi-platform game system without rebuilding from scratch.
