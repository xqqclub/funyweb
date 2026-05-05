# Funyweb Development History

## Overview

This document records the development process of the `funyweb` project from the initial concept discussion to the current playable web experience.

The project evolved from a single-scene management demo into a Telegram-controlled interactive web experience with:

- realtime character state switching
- Firebase-backed data sync
- Telegram bot controls
- multiple character states
- weather-aware background switching
- knowledge link collection
- mobile and desktop responsive layouts

## Phase 1: Product Planning

### Initial concept

The original goal was to build a game-like website with:

- a 2.5D overhead / isometric feel
- miniature buildings and characters
- pixel-art inspired visuals
- character state switching such as work, go home, clean
- backend control by an administrator
- Telegram bot control
- SVG as a possible rendering method

### Architecture decision

After discussion, the chosen stack became:

- `Next.js`
- `React`
- `Firebase Firestore`
- `Firebase Auth`
- `Netlify`
- `Telegram Bot API`

The core interaction model was defined as:

1. manager changes state from admin panel or Telegram
2. backend writes the state to Firebase
3. frontend reads the state in realtime
4. the scene updates immediately

## Phase 2: MVP Foundation

### Core project setup

The project was scaffolded as a Next.js application and connected to:

- Firebase client configuration
- Firebase Admin SDK
- Netlify deployment

Initial project capabilities included:

- homepage scene
- `/admin` management page
- `/api/status`
- `/api/telegram/webhook`

### State model

The first main actor model included:

- `working`
- `going_home`
- `cleaning`

Later it expanded to:

- `sleeping`
- `biking`
- `at_home`

And eventually:

- `at_home + idle`
- `at_home + gaming`
- `at_home + streaming`
- `at_home + reading`

## Phase 3: Scene Rendering Evolution

### SVG prototype stage

The earliest scene versions used SVG-style simplified buildings, roads, paths, and HUD overlays. This helped validate:

- state transitions
- character motion
- 2.5D scene composition
- HUD placement

### Transition to image-based scene rendering

Later, the direction shifted toward richer illustrated environments using image assets:

- fixed scene backgrounds
- layered characters
- responsive positioning
- state-specific background switching

Backgrounds were organized for:

- desktop
- mobile
- office
- home
- road
- day / night
- later rainy variants

### Visual refinement

The scene gradually gained:

- game-like HUD panels
- refined glassmorphism UI
- mobile-specific responsive layouts
- stronger role for the character as the visual focus
- reduced background dominance on mobile

## Phase 4: Character System Expansion

### Character image pipeline

The project moved from SVG placeholder characters to image-based character sprites.

Work included:

- cutting and preparing sprite frames
- replacing SVG characters with PNG assets
- aligning character positioning per state
- adding slight idle motion

### State-specific character visuals

Character images were connected for:

- working
- going home
- biking
- cleaning
- sleeping
- at home

Later, home sub-state character images were added and renamed to stable asset names:

- `at-home-idle.png`
- `at-home-gaming.png`
- `at-home-streaming.png`
- `at-home-reading.png`

### Motion work

Animation iterations included:

- walking frame sequence
- biking idle motion
- sleeping idle motion
- subtle at-home motion

Several rounds of visual adjustment were made to reduce unwanted position drift and improve perceived stability.

## Phase 5: Telegram Bot Integration

### Initial bot controls

The Telegram bot was first connected as a simple command controller with commands such as:

- `/start`
- `/status`
- `/work`
- `/home`
- `/clean`

### Expanded controls

The bot later added:

- button-based keyboard controls
- Chinese labels
- more states such as `sleeping`, `biking`, `at_home`
- home sub-state selection:
  - gaming
  - streaming
  - reading

### Weather controls

Telegram control later expanded to weather management:

- `目前天氣模式`
- `自動天氣`
- `手動雨天`

The keyboard was reorganized into two conceptual sections:

- character states
- weather controls

## Phase 6: Admin Panel and Auth

The `/admin` page was upgraded to include:

- Firebase Google login
- admin authorization
- protected state updates
- weather mode switching

This allowed the project to support both:

- bot-driven management
- browser-based admin control

## Phase 7: Knowledge List System

### Goal

A new section called `知識列表` was added beneath the main scene area.

The idea:

- links sent to the Telegram bot are stored
- the homepage shows recent knowledge links
- pagination limits visible items to 5 per page

### Implemented behavior

The system now:

- extracts URLs from Telegram messages
- stores them in Firestore
- tries to resolve titles from remote pages
- falls back to a readable fallback when title extraction fails

### UI work

The knowledge list was moved into the left column under the scene so it does not visually break the main layout.

## Phase 8: Weather System

### Automatic weather concept

The project introduced rainy backgrounds and rainy overlay effects.

At first, weather detection attempted to use browser geolocation.

### Simplified weather rule

To reduce friction for normal visitors, the system was changed to use:

- fixed Taichung weather

### Manual override

A manual weather override mode was then introduced:

- `auto` follows Taichung weather
- `rain` forces rainy mode

Priority rule:

- manual rain override wins over automatic weather

## Phase 9: Naming and Identity

The main avatar display name changed from:

- `Mina`

to:

- `D-exHor`

This required:

- updating defaults
- repairing old Firestore values
- ensuring frontend display stays consistent

## Phase 10: Deployment and Operational Fixes

Throughout development, the project was repeatedly deployed to Netlify.

Several Netlify-specific operational issues were resolved, including:

- stale `.netlify` working directories
- old static publish artifacts
- function bundle size issues
- asset cache-busting strategy revision

To stabilize deployment:

- asset versioning was changed from per-file mtime reads to deploy/build-based version tags
- stale `.netlify` workspaces were cleaned or rotated when plugin publish failures occurred

## Phase 11: Multiplayer Home Page

The homepage was redesigned from a single-character display into a multiplayer lobby-style layout.

The new layout includes:

- a main stage that defaults to the primary manager character
- a player stage list with four visible slots
- empty placeholders while no player has joined
- click-to-focus behavior so a player card can become the main stage
- a right-side information panel that follows the currently focused player

The player stage list now reads from Firestore `players`.

The first four active players are shown on the homepage. Extra approved players are moved into a waitlist-style lobby state.

## Phase 12: Player Registration and Approval

Telegram was expanded from an admin-only controller into a player onboarding channel.

Implemented flow:

1. player opens the Telegram bot
2. player applies to join the game
3. an application is stored in Firestore
4. the manager reviews the application
5. approved players are created in `players`
6. approved players appear in the homepage player stage list

The approval model includes:

- `pending`
- `approved`
- `rejected`
- `blocked`

The manager can also preview the player registration view from Telegram.

## Phase 13: Character Catalog and Player Character Selection

The character system was expanded to support multiple player character styles.

Character assets were organized by gender and character id:

- `public/scenes/shared/characters/male/<character-id>/`
- `public/scenes/shared/characters/female/<character-id>/`

Each character can provide its own state images, walking frames, and home-mode poses.

Telegram character selection was added after approval:

- players choose male or female characters
- players choose a specific character style
- the selected `characterGender` and `characterId` are stored on the player profile

The player stage and main stage now resolve images from the character catalog when available.

## Phase 14: Player Pages

Dedicated player pages were introduced:

- `/player/[playerId]`

These pages focus directly on one player and hide the broader homepage sections such as:

- player stage list
- knowledge list
- admin-oriented layout blocks

Telegram `進入遊戲` links can point players to their own page.

## Phase 15: Speech Bubble System

A persistent speech bubble system was added.

Users can update their character speech from Telegram using:

- custom speech input
- preset lines
- emoji messages
- short announcements
- delete speech

Speech bubbles:

- stay visible until updated or deleted
- appear near the focused character
- use different styling by speech type
- use distinct colors for manager and player identities

Player cards also show a compact one-line speech preview.

## Phase 16: Work Log System

A `工作日誌` section was added to record state and speech changes.

Each log records:

- update time
- target player
- state
- speech text
- update source
- event kind

Work logs are stored in Firestore `work_logs`.

The homepage shows the focused player's own work log, with five entries per page.

The work log system was adjusted to avoid requiring Firestore composite indexes by querying by `targetId` and sorting/paginating in application code.

## Phase 17: Platform Adapter Refactor

The project was refactored toward a future multi-platform architecture.

The goal is to support:

- Telegram
- LINE
- web-based controls

Key changes:

- player and application records now include platform-neutral fields
- game logic was moved into shared service modules
- Telegram-specific UI, messages, and flow logic were extracted into `src/lib/platforms/telegram/`
- a LINE adapter skeleton was created under `src/lib/platforms/line/`
- a LINE webhook route skeleton was added

Supporting planning documents were created:

- `MULTI_PLATFORM_REFACTOR_PLAN.md`
- `PLATFORM_ADAPTER_SPEC.md`

## Phase 18: Firestore Security Rules Hardening

Firestore was moved away from the original test-mode posture into an explicit production-oriented ruleset.

The rule design follows the current application architecture:

- public read access is allowed for display data used by the homepage
- browser clients do not directly write gameplay state
- gameplay writes are handled through trusted backend routes and Firebase Admin SDK
- manager-only operational data stays private
- all unknown collections are denied by default

Publicly readable collections:

- `actors`
- `players`
- `knowledge_items`
- `work_logs`
- `scene_config`

Manager-only collections:

- `applications`
- `telegram_sessions`

Rules were updated in:

- `firestore.rules`

Firebase project deployment metadata was also added so rules can be deployed by CLI in the future:

- `.firebaserc`
- `firebase.json`

The active Firebase project is:

- `fridgechef-yi4qt`

Frontend realtime listeners were also adjusted so browser clients no longer create default documents directly when a document is missing.

Updated client files:

- `src/lib/firebase/actors-client.ts`
- `src/lib/firebase/weather-client.ts`

The Firestore rules were manually published through Firebase Console on 2026-05-01.

## Phase 19: Multiplayer Game Loop Prototype

The first true multiplayer game loop was planned and implemented around rock-paper-scissors.

Gameplay direction:

- players use Telegram or future LINE commands as the game controller
- the website acts as the shared live stage
- players can start or join a round
- both players submit hidden moves
- the backend resolves the match after both moves are submitted
- Telegram sends the result to both players
- the homepage displays the latest resolved game event

New Firestore collections:

- `game_matches`
- `game_events`

Security model:

- `game_matches` stores hidden in-progress move data and is not publicly readable
- `game_events` stores resolved public game results and can be read by the homepage
- all writes still go through backend routes and Firebase Admin SDK

Implemented Telegram player actions:

- `猜拳`
- `石頭`
- `剪刀`
- `布`

New game files:

- `src/types/game.ts`
- `src/lib/firebase/game.ts`
- `src/lib/game/rps-service.ts`
- `src/app/api/game-events/route.ts`
- `src/components/scene/GameEventPanel.tsx`

Frontend changes:

- the homepage now receives recent game events
- the client polls `/api/game-events`
- a `遊戲事件` section displays the latest rock-paper-scissors result

## Phase 20: Manager Gameplay and Expanded Main Character States

The rock-paper-scissors loop was updated so the main manager Telegram account can also participate as a player in matches.

Manager gameplay changes:

- manager Telegram ID can start or join a rock-paper-scissors match
- manager can submit `石頭` / `剪刀` / `布`
- result notifications still route through Telegram
- manager participation does not require creating a normal player registration record

New main character states were added:

- `公司吃飯`
- `外出工作`
- `買東西`
- `在家吃飯`
- `沉思`

Scene behavior:

- `公司吃飯` and `外出工作` use the office background set
- `買東西` and `在家吃飯` use the home background set
- `沉思` uses the same character image in both home and office contexts
- when the manager switches to `沉思`, the scene preserves the current home or office location

New main character image assets:

- `public/scenes/shared/characters/主角-公司吃飯.png`
- `public/scenes/shared/characters/主角-外出工作.png`
- `public/scenes/shared/characters/主角-買東西.png`
- `public/scenes/shared/characters/主角-在家吃飯.png`
- `public/scenes/shared/characters/主角-沉思.png`

## Current Capabilities

At the current stage, the project supports:

- desktop and mobile scene rendering
- character-state-driven backgrounds
- realtime Firebase sync
- Telegram bot control
- home sub-state switching
- weather mode switching
- knowledge link collection
- admin panel with protected actions
- multiplayer player stage list
- Telegram player application and manager approval
- player character selection
- dedicated player pages
- persistent speech bubbles
- per-player work logs
- platform-neutral data fields
- Telegram adapter modules
- LINE adapter skeleton
- production-oriented Firestore rules
- rock-paper-scissors multiplayer event loop
- manager account participation in rock-paper-scissors
- expanded main character states for eating, field work, shopping, and thinking

## Current Major Files

Important areas of the codebase include:

- `src/components/scene/PixelTownScene.tsx`
- `src/components/scene/scene.module.css`
- `src/app/admin/page.tsx`
- `src/app/api/status/route.ts`
- `src/app/api/weather/route.ts`
- `src/app/api/telegram/webhook/route.ts`
- `src/app/api/line/webhook/route.ts`
- `src/app/api/work-log/route.ts`
- `src/app/api/game-events/route.ts`
- `src/app/player/[playerId]/page.tsx`
- `src/components/scene/GameEventPanel.tsx`
- `src/components/scene/PlayerGallery.tsx`
- `src/components/scene/SelectedPlayerInfo.tsx`
- `src/components/scene/WorkLogPanel.tsx`
- `src/components/scene/KnowledgeListPanel.tsx`
- `src/lib/firebase/actors.ts`
- `src/lib/firebase/players.ts`
- `src/lib/firebase/applications.ts`
- `src/lib/firebase/work-log.ts`
- `src/lib/firebase/weather.ts`
- `src/lib/firebase/knowledge.ts`
- `src/lib/firebase/actors-client.ts`
- `src/lib/firebase/weather-client.ts`
- `src/lib/game/player-service.ts`
- `src/lib/game/rps-service.ts`
- `src/lib/game/world-service.ts`
- `src/lib/firebase/game.ts`
- `src/lib/platforms/telegram/`
- `src/lib/platforms/line/`
- `src/lib/characters/catalog.ts`
- `firestore.rules`
- `firebase.json`
- `.firebaserc`

## Suggested Next Steps

Possible future directions discussed or implied during development:

- multiplayer player application and approval flow
- deeper Telegram-based player management
- complete LINE Messaging API integration
- Firebase CLI based rules deployment
- LINE adapter support for rock-paper-scissors
- player game statistics and ranking
- richer player self-service controls
- manager-controlled player slot management
- richer world simulation
- more weather types
- more interactive player-specific scenes
- Telegram Mini App integration

## Notes

This history is a project-level summary, not a full commit-level changelog.

It is intended to preserve the product and engineering context of the project so future development can continue with a clear understanding of how the current version was built.
