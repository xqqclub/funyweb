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

## Current Major Files

Important areas of the codebase include:

- `src/components/scene/PixelTownScene.tsx`
- `src/components/scene/scene.module.css`
- `src/app/admin/page.tsx`
- `src/app/api/status/route.ts`
- `src/app/api/weather/route.ts`
- `src/app/api/telegram/webhook/route.ts`
- `src/lib/firebase/actors.ts`
- `src/lib/firebase/weather.ts`
- `src/lib/firebase/knowledge.ts`

## Suggested Next Steps

Possible future directions discussed or implied during development:

- multiplayer player application and approval flow
- Telegram-based player management
- richer world simulation
- more weather types
- more interactive player-specific scenes
- Telegram Mini App integration

## Notes

This history is a project-level summary, not a full commit-level changelog.

It is intended to preserve the product and engineering context of the project so future development can continue with a clear understanding of how the current version was built.
