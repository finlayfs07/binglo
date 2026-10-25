# Binglo — Product Requirements (v1)

Oct 16, 2026 · @Finlay Frank Shayo

## Overview

Binglo is a web game for real-life bingo: players spot things around them and prove each square with a photo. No download is needed. Players scan a QR code, type a 6-character code and play. The first target is APU's November orientation; parties, clubs and events come next.

**Problem.** Icebreaker bingo at events uses paper cards with prompts like "ask someone their passion". Nobody can check them, people tick boxes without doing anything, and it doesn't feel like real bingo.

**Solution.** Prompts you can see ("someone wearing braces", "a tote bag"), a photo as proof (with the person in it, for "Someone" squares), a host who checks the proof, and a race to complete a line against a timer.

**Who it's for**

- **Host:** an orientation leader, club committee member or party host. Creates and runs the game, usually on a laptop that's projected, and never plays.
- **Player:** a new student or guest on their own phone, usually on campus Wi-Fi or mobile data, and probably meeting the others for the first time.

**Goals for v1**

1. One full game runs smoothly from start to finish with 200 players in a single room.
2. A player gets from scanning the QR code to seeing their board in under 30 seconds.
3. APU's orientation team agrees to use it at the November intake.

**How we measure it:** players per game, the share who complete at least one square, the time to the first bingo, and crashes or failed uploads per game (target: zero).

## Scope

v1 includes only what's needed to run one real orientation game. Everything else waits until after the first event.

| In v1 | Not in v1 (later) |
| --- | --- |
| Create a game, join with a code or QR | Accounts, logins, saved history |
| Categories: APU orientation (Campus, Park, Indoors, Party shown as locked "Soon") | AI checks on photos |
| Custom board: host types their own prompts | Saving and reusing custom boards |
| Grid size: 4×4, 5×5 or 6×6 | Teams or pair mode |
| Timer: 5, 10, 15 or 20 minutes | Sound effects, music, animations beyond basics |
| Photo proof for every square | Native iOS/Android app |
| Projected live leaderboard (top 10) and event feed | Paid plans, branding for schools |
| Review step at the end, with disqualification | Chat or reactions |
| Results: podium (top 3 or top 5), top 10 leaderboard, own rank on each phone | Analytics dashboard for hosts |
| How to play screen (the ? button) | Languages other than English |

## User flows

The host runs setup, start, end and review. Players only join, play and wait. The two sides connect at four moments: join, start, finish and end.

&#91;embedded content: Binglo flow · host and player, 4 sync points\]

Read each column top to bottom. Arrows across are the moments when one side's action shows up live on the other side's screen.

## Screens

There are ten screens. The host uses 1–2–3–4–8–9, and a player uses 1–5–6–7–9. Every screen works on a phone first, and screens 3, 4 and 9 also look good projected in a hall.

1. **Home**
   - "Binglo" title, big and glowing, centred.
   - Two buttons: **Create game** (main) and **Join game**.
   - A **?** button at the bottom opens How to play.
2. **Create game (host setup)**, one screen in three parts:
   - **Category:** APU orientation or **Custom**. Campus, Park, Indoors and Party are shown locked with a "Soon" label and can't be picked in v1. Custom opens a pop-up where the host types one prompt per line; if there are too few prompts for the grid, the app asks for more. A line starting with "Someone" becomes a person square; any other line is a thing square.
   - **Grid size:** 4×4, 5×5 (default) or 6×6.
   - **Timer:** 5, 10 (default), 15 or 20 minutes.
   - **Winners to announce:** top 3 (default) or top 5. This is how many finishers the host reviews and puts on the podium.
   - The host taps **Create**.
3. **Lobby (host)**
   - A large 6-character code and a QR code, readable from the back of a hall.
   - **Copy link** and **Share** buttons.
   - A live list of joined players, with a count.
   - **Start game**, disabled until at least 2 players have joined.
4. **Host game view** (projected)
   - Countdown timer and players finished / total.
   - A live leaderboard of the top 10, labelled "Live · final after review". Finished players rank by finish time, then unfinished players by total squares marked, then by name A–Z.
   - A live feed of events: players joining and bingos ("Aisha got bingo in 6:41").
   - No photos, ever.
   - **End game now** button, which asks to confirm.
   - The host never plays, which keeps the host's job simple.
5. **Join**
   - A code box (filled in automatically when they arrive via QR) and a name box, then **Join**.
   - Then a waiting screen: "You're in. Waiting for the host to start" with the player count.
6. **Board (player)**
   - Top bar: time left and how many people have finished.
   - The grid. Tapping an open square opens the camera; a square with a photo shows a tick.
   - The board shows a bingo animation the moment a line is complete, along with the player's time.
   - After bingo, only the winning line locks. Other squares stay open for new photos and retakes until the game ends.
7. **Camera / photo proof**
   - The prompt at the top, the back camera on, a flip button to switch cameras, a shutter button, then **Use photo / Retake**.
   - A short line: "Ask first. This photo goes to the host, and you can save it to your bingo card later."
8. **Review (host)**
   - Before any photo is shown, the host must confirm they've stopped projecting.
   - Finishers in order of time. Tapping one shows their line's photos side by side, each with its prompt.
   - **Approve** or **Disqualify** per player. A disqualified player drops off and the next one moves up.
   - **Publish results** when the top 3 or 5 are all approved.
9. **Results (everyone)**
   - Podium for the top 3 or 5 with times, then a top 10 leaderboard (same ranking as the live one, with disqualified players removed).
   - Each player also sees their own rank on their phone, even if they're outside the top 10.
   - Players see "Waiting for results…" until the host publishes.
   - Planned: each player can make a share card of their own bingo card from here (see Decision 14).
10. **How to play** (pop-up from the ? button): 4 short steps plus the rules, including what gets you disqualified and "Only share photos of people who said yes."

## Game rules and logic

A player wins by completing one line: a row, a column or either diagonal. Ranking is by finish time, and only after the host has checked the photos.

**Board**

- Every player gets the same prompts in a **different random order**, so nobody can copy a neighbour's line.
- 5×5 has a FREE centre square. 4×4 and 6×6 have no centre, so no free square.
- The category needs at least N² prompts (16, 24 with FREE, or 36). The app picks randomly from the category's pool, with at most 5 prompts from the "country" group.
- Each prompt has a type: **person** (the photo must include that person) or **thing** (the photo just needs the object).

**Squares and proof**

- Tap a square, take a photo in the app, and the square is marked straight away. No waiting for approval during play, which keeps the game fast.
- The camera only: no uploading from the gallery.
- A player can take new photos and retake photos until the game ends, except in their winning line: those squares lock at bingo.
- Rule (shown in How to play, checked in review): a different person in every "person" photo, and what's on the square must be visible. For "thing" squares, the object just needs to be visible.

**Winning**

- The app checks for a line after every marked square. When one is complete, it saves `finished_at` and the player's time = finished\_at − game start.
- The game keeps going after the first bingo, so others can still finish and get ranked.
- Only a player's first bingo counts. They can keep filling other squares, but extra squares and extra lines never change their rank.
- The game ends when the timer hits 0 or the host taps **End game now**. Nobody can mark squares after that.

**Review and disqualification**

- The host reviews finishers in time order, only until the top 3 or 5 are approved. Nobody has to check 200 boards.
- The host only looks at the photos in the winning line, not the whole board.
- Disqualify if: a photo is missing what's on the square, the same person appears in two "person" photos, or it's a photo of a screen or picture.
- "Country" squares are on trust: the host can't check where someone is from, so they never disqualify over them.
- Results are published only after review. Players who didn't finish are ranked by total squares marked, then by name A–Z.

## Design

The look is the night-sky style from the reference: deep navy background, soft white text, a periwinkle main button, with mint and pink as accents. It's simple, calm and readable outdoors and on a projector.

| Role | Colour | Hex (approx., from reference) |
| --- | --- | --- |
| Background | Deep navy | `#1C1F4A` |
| Cards, squares | Lighter navy | `#2A2E66` |
| Main button | Periwinkle | `#8E92F2` |
| Main text | Soft white | `#F4F4FB` |
| Secondary text | Lavender grey | `#B9BCE6` |
| Marked square, success | Mint | `#A6E3C4` |
| Bingo, highlights | Soft pink | `#F2B6D6` |
| Warnings, disqualify | Coral | `#F07A6A` |
| Page edges on desktop | Sea green | `#8FD3B6` |

**Rules**

- One main button per screen (periwinkle); everything else is outlined or text.
- Rounded everything: buttons fully rounded, cards 16 px corners.
- Faint stars and a crescent moon on Home only, as background decoration.
- The "Binglo" title gets a soft glow (a text-shadow in periwinkle).
- Font: **Nunito** or **Baloo 2** (rounded, friendly) from Google Fonts. Headings 700, body 400–600.
- Buttons and squares at least 44 px tall, for thumbs.
- Check every text colour against its background for contrast (4.5:1). Dark text on the mint and pink squares, not white.

## Tech stack and tools

The stack is React + Vite on the front end, Supabase for database, photo storage and live updates, and Vercel for hosting. It costs $0 to build and test, and everything is either something you already know (React, JS) or one new service (Supabase).

| What | Tool | Why this one | Cost |
| --- | --- | --- | --- |
| Front end | React + Vite (JavaScript) | You know React; Vite starts in seconds | Free |
| Styling | Tailwind CSS | Colours from the Design table become reusable classes | Free |
| Routing | React Router | `/`, `/create`, `/join/:code`, `/game/:code`, `/host/:code` | Free |
| Database | Supabase (Postgres) | Real SQL (good for your CV), tables you can see in a dashboard | Free plan |
| Live updates | Supabase Realtime | Host lobby list, host live leaderboard and feed | Free up to 200 connections |
| Photo storage | Supabase Storage | Same project, same permissions system | Free plan: 1 GB |
| Identity | Supabase anonymous sign-in | Each phone gets an ID without a login screen | Free |
| Photo shrinking | `browser-image-compression` | Turns 4 MB photos into \~100 KB before upload | Free |
| QR code | `qrcode.react` | Draws the join QR in the lobby | Free |
| Hosting | Vercel | Connects to GitHub, deploys on every push | Free (Hobby) |
| Code | GitHub | Version control; the repo becomes a portfolio piece | Free |
| Load testing | k6 (or a Node script) | Simulates 200 players before the real event | Free |
| AI pair | Claude Code | Used as described in the build guide, not to write everything | Your plan |

**The 200-connection limit.** Supabase's free plan allows 200 concurrent Realtime connections and 100 messages per second ([Supabase docs](https://supabase.com/docs/guides/realtime/limits)). A 200-player game plus the host goes over that. The plan:

- Only the **host's screens** (lobby and game view) use Realtime: one connection.
- During play, each **player's phone checks the game status every 3 seconds** with a normal request (polling), which doesn't count against Realtime. It also copes better with weak Wi-Fi.
- For the real orientation, consider Supabase Pro (500 connections) for that one month; check the current price on Supabase's pricing page.

**Why not Firebase?** It would also work. Supabase is chosen because it's SQL (your SDM and data modules use relational thinking), its dashboard makes the data easy to see while learning, and its storage, database and permissions share one system.

## Data model and realtime

The data model has four tables, plus prompt lists kept as JSON files in the code for v1. The server, not the phone, decides finish times, so nobody can fake a fast time by editing the page.

| Table | Main columns | What it holds |
| --- | --- | --- |
| `games` | `id`, `code` (6 chars, unique), `host_id`, `category`, `grid_size`, `duration_sec`, `winners_count`, `status` (lobby / playing / review / finished), `started_at`, `ends_at` | One row per game |
| `players` | `id`, `game_id`, `user_id`, `name`, `board` (array of prompts in that player's order), `finished_at`, `disqualified` | One row per person in a game |
| `marks` | `id`, `player_id`, `cell_index`, `photo_path`, `created_at` | One row per square with a photo |
| `custom_prompts` | `game_id`, `prompts` (array) | Only for Custom games |

**Prompts.** Categories live in `src/data/prompts/`, about 40 prompts each, so boards vary. v1 only needs `apu.json`; `campus.json` and the others come when those categories unlock. Each prompt is `{ "text", "type" }`, where `type` is `"person"` or `"thing"`, plus an optional `"group"` (for now only `"country"`). Editing a JSON file is faster than building an admin page.

**Server-side logic (Postgres functions you call from React)**

- `create_game(...)` makes a unique code and returns it.
- `join_game(code, name)` adds the player and deals them a shuffled board.
- `start_game(game_id)` sets `status = playing`, `started_at = now()`, `ends_at = now() + duration`.
- `mark_square(player_id, cell_index, photo_path)` rejects the mark if the game isn't playing or time is up, saves it, checks for a line, and sets `finished_at = now()` on the first line.

**Security (Row Level Security in Supabase)**

- A player can only read their own marks and photos. The host can read every mark and photo in their game.
- Photos go in a private bucket, path `games/<game_id>/<player_id>/<cell>.jpg`, shown to the host through short-lived signed links.

**Who listens to what**

| Who | How | Listens for |
| --- | --- | --- |
| Host lobby | Realtime | New rows in `players` |
| Host game view | Realtime (one connection) | Changes to `players` and `marks` |
| Player waiting / board | Poll every 3 s | `games.status`, `ends_at`, finished count |
| Player results | Poll every 3 s | `games.status = finished` |

## Privacy, safety and edge cases

Photos of new students are the main thing a university will question, so privacy is a requirement, not a nice-to-have.

**Privacy**

- Only first names or nicknames; no email, no login.
- Photos are visible only to the host and the player who took them, never to other players or on the projector.
- All photos for a game are deleted 24 hours after it ends (a scheduled Supabase job), so players should save their bingo card before then.
- Binglo never posts anything itself. A player can choose to share their own bingo card from their phone.
- The rules say: ask before you take a photo of someone; anyone can say no.

**Edge cases**

| Situation | What happens |
| --- | --- |
| Player refreshes or their browser crashes | Their ID is saved on the phone, so they rejoin the same board with their marks intact |
| Player joins after the game started | Allowed; they get a board but no extra time |
| Wrong or expired code | "Game not found" message, the code box stays filled for fixing |
| Two players with the same name | Second becomes "Aisha 2" |
| Camera permission denied | A screen explaining how to allow it, with a retry button |
| Upload fails on bad Wi-Fi | The photo is kept on the phone and retried automatically; the square shows "uploading" |
| Host's phone dies | Host reopens the link on any device and continues (host ID saved, plus a host link) |
| Nobody finishes before time | Results rank everyone by squares completed; review is skipped |
| Timer ends while a photo is uploading | Accepted if it was taken before `ends_at` (5-second grace) |
| Phone with no data | Pair up with a friend (mentioned in How to play) |

## Build plan and learning guide

The demo takes 7 days, one working slice per day, each ending with something you can open on your phone. Every day also has one concept you must be able to explain without AI.

| Day | Build | Concept you'll own | Done when |
| --- | --- | --- | --- |
| 1 | Vite + React + Tailwind project, colours, Home screen, How to play pop-up, deploy to Vercel | How a deploy pipeline works (GitHub → Vercel) | Home screen is live at a URL on your phone |
| 2 | Supabase project, `games` + `players` tables, anonymous sign-in, Create game and Join screens | Tables, primary/foreign keys, what a client library does | You create a game on a laptop and join it from your phone |
| 3 | Lobby with Realtime player list, QR code, Start game | Websockets vs normal requests; subscribing and unsubscribing | Players appear live; Start moves everyone to the board |
| 4 | Board: shuffled deal, grid sizes, FREE square, timer, line detection (with unit tests) | Pure functions and testing them with Vitest | Tests pass for rows, columns, both diagonals on 4, 5, 6 |
| 5 | Camera, photo compression, Storage upload, `mark_square` function, Row Level Security | Who can read what (RLS); why the server decides the time | A photo marks a square; another player can't see it |
| 6 | Host game view, End game, Review screen, Results screen | State machines: lobby → playing → review → finished | One full game runs start to finish |
| 7 | Play-test with 5+ friends, fix bugs, record a 30-second demo clip | Debugging from real users, not guesses | Clip recorded, bug list written |
| Later | Load test with 200 fake players, polling, retry on failed uploads, auto-delete photos | Load testing and finding bottlenecks | 200 simulated players, no errors |

**How to use Claude Code like an engineer, not a vibe coder**

1. **You write the plan for each day first,** in a short `notes/day-N.md`: what you're building and how you think it should work. Then ask Claude to review your plan before it writes code.
2. **Small asks.** One component or one function per prompt, never "build the lobby".
3. **Read every diff before accepting it.** If you can't explain a line, ask "why is this here?" until you can.
4. **Write one piece by hand each day.** For example, do the line-detection function yourself on Day 4, then ask Claude to review it.
5. **Tests are your proof.** Ask Claude to write tests, but you decide what cases they must cover.
6. **Commit after every working step** with a clear message, so you can always go back.
7. **End each day with a 3-line log:** what you built, what broke, what you learned. That log becomes your LinkedIn post and your interview stories.

**Accounts to set up before Day 1:** GitHub, Supabase (sign in with GitHub), Vercel (sign in with GitHub). Install Node.js LTS and VS Code.

## Open questions

- [x] Should the host also be able to play, or only run the game? Decided Oct 20: the host never plays.
- [ ] What are the 40 APU prompts? Draft them with the ambassadors, since they know what's actually around campus.
- [ ] When is the November orientation schedule finalised, and who signs off on outside tools?
- [ ] Does the orientation venue have Wi-Fi that can handle 200 phones uploading photos?
- [ ] Is a domain like binglo.app worth buying before the pitch, or is the free Vercel URL fine?
- [ ] Confirm with APU orientation (Yamin) that students may share their own bingo cards.

## Decisions (Oct 20)

These override anything earlier in this document.

1. **Categories.** Only "APU orientation" and "Custom" can be played in v1. Campus, Park, Indoors and Party are shown as locked with a "Soon" label.
2. **The host never plays.** The host creates and runs the game, usually on a laptop that's projected.
3. **Projected live leaderboard.** During play, the host screen shows the top 10 plus a live feed of events (players joining, bingos), labelled "Live · final after review". Ranking: finished players by finish time, then unfinished players by total squares marked, then by name A–Z (changed Oct 23, see 12).
4. **Top 3 / Top 5** sets how many players the host reviews and puts on the podium. The Results screen always also shows a top 10 leaderboard, and each player sees their own rank on their phone.
5. **No photos on the projector.** Before Review shows any photo, the host must confirm they've stopped projecting.
6. **Realtime.** The host game view uses Realtime on `players` and `marks` over one connection. Players keep polling every 3 s.

**Added Oct 23**

7. **Photo proof, not selfies.** The camera opens with the back camera and has a flip button. Camera only, no gallery.
8. **Person and thing squares.** Every prompt has a type. "person" squares need a different person in every photo; "thing" squares just need the object visible.
9. **Country squares are on trust.** Prompts with group "country" ("Someone from Kenya") can't be checked, so the host never disqualifies over them.
10. **Country limit.** When a board is dealt, at most 5 prompts can have group "country".
11. **Custom prompts.** A line starting with "Someone" is a person square; any other line is a thing square.
12. **Simpler ranking.** Unfinished players rank by total squares marked, then name A–Z, on both the live leaderboard and the final results. "Most squares in their best line" is no longer used. Finished players still rank by finish time.

**Added Oct 25**

13. **Only the winning line locks.** After bingo, the squares in the winning line lock; every other square stays open for new photos and retakes until the game ends. Only the first bingo counts: extra squares and lines never change rank. Planned: `007` SQL adds `players.winning_line`, and `mark_square` rejects only those cells (instead of rejecting every mark after bingo).
14. **Share card (planned, after Results).** Built on the player's phone: a 9:16 image of their bingo card with their own photos and a small Binglo mark. It opens the phone's share sheet (Instagram etc.) and falls back to "Save image" where sharing isn't supported. Binglo never posts anything itself.
15. **Consent wording.** The camera line becomes "Ask first. This photo goes to the host, and you can save it to your bingo card later." How to play adds the rule "Only share photos of people who said yes." Photos are visible to the host and the player who took them, and are still deleted 24 hours after the game, so players save their card before then.
16. **Open question:** confirm with APU orientation (Yamin) that students may share their own bingo cards (also listed under Open questions).
17. **Build order:** 19f End game now + auto-close → 20 player locks (`007` SQL, time-up lock, finished count in the top bar) → 21 Review → 22 Results → 23 Share card + consent wording.

> **Open issue:** `apu.json` has 36 prompts, but 16 are "country". With the limit of 5, only 25 are usable: enough for 4×4 (16) and 5×5 (24), not 6×6 (36). APU needs at least 11 more non-country prompts, or 6×6 must be blocked for APU.
