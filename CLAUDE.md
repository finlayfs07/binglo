# Binglo

Real-life bingo web game. Players scan a QR code, join with a 6-character code, and prove each square with a photo. A host creates the game, watches progress, reviews the winners' photos and publishes results. First target: APU's November orientation, about 200 players in one room.

The full spec is in `docs/PRD.md`. Read it when a task touches game rules, screens, the data model or design.

## Stack
- React + Vite, **JavaScript only (no TypeScript)**
- Tailwind CSS v4 (`@tailwindcss/vite` plugin, theme colours defined with `@theme` in `src/index.css`)
- React Router for routes: `/`, `/create`, `/join/:code`, `/game/:code`, `/host/:code`
- Supabase: Postgres, Realtime (host and lobby only), Storage, anonymous sign-in
- Vitest for unit tests
- Hosted on Vercel, code on GitHub
- Dev machine: Windows, VS Code, cmd terminal

## How to work with me (Fin)
I'm a second-year software engineering student building this to learn, not just to ship.
- Do **one small thing per request**: one component, one function or one config change. Don't build ahead of what I asked.
- After each change, explain in 2–4 plain sentences what you changed and why.
- Don't install a package without telling me what it does and why we need it.
- Prefer simple, readable code over clever code. No abstractions "for later".
- When I write code myself and ask for a review, point out problems and explain them. Don't silently rewrite it.
- Suggest a short commit message at the end of each working change.

## Design rules
Night-sky look, mobile-first, readable outdoors and on a projector.

| Token | Hex | Use |
| --- | --- | --- |
| navy | #1C1F4A | page background |
| navy-light | #2A2E66 | cards, squares |
| periwinkle | #8E92F2 | main button, title glow |
| soft-white | #F4F4FB | main text |
| lavender | #B9BCE6 | secondary text |
| mint | #A6E3C4 | marked square, success |
| pink | #F2B6D6 | bingo, highlights |
| coral | #F07A6A | warnings, disqualify |
| sea | #8FD3B6 | page edges on desktop |

- One main (periwinkle) button per screen; everything else is outlined or text.
- Buttons fully rounded, cards 16px radius (`rounded-2xl`).
- Font: Nunito. Headings 700, body 400–600.
- Tap targets at least 44px tall.
- Dark text (navy) on mint and pink backgrounds, never white.
- Text contrast at least 4.5:1.
- Flat style. No glow, text-shadow, gradients, blur/glassmorphism, emojis or icon libraries. Tactile buttons instead: the main button has a solid darker bottom edge (box-shadow 0 4px 0 #6569D4) that disappears when pressed.
- Overrides the PRD: the Binglo title has NO glow.
- Results/leaderboard screen: Kahoot-style layout, made flat. 1st place in the middle and raised, 2nd on the left, 3rd on the right, as cards with a solid circular number badge (1 = pink, 2 = periwinkle, 3 = mint, navy numbers). Ranks 4–10 below as a clean list with thin lavender dividers, rank number on the left and time on the right. No glossy medals, gradients or glow.

## Product decisions
Decided Oct 20 and Oct 23; these override `docs/PRD.md` where they differ (see "Decisions (Oct 20)" there).
- v1 playable categories: "APU orientation" and "Custom" only. Campus, Park, Indoors and Party show as locked ("Soon").
- The host never plays. They create and run the game, usually on a projected laptop.
- Host game view = projected live leaderboard (top 10) + live event feed (joins, bingos), labelled "Live · final after review". Ranking (live leaderboard and final results): finished by finish time, then unfinished by total squares marked, then name A–Z. No "best line" ranking (`rankPlayers` in `src/lib/game.js`).
- Top 3 / Top 5 = how many the host reviews and puts on the podium. Results always also show a top 10, and each player sees their own rank.
- Photos never appear on the projected screen. Review asks the host to confirm they've stopped projecting before showing any photo.
- Host game view uses Realtime on `players` and `marks` (one connection). Players poll every 3 s.
- Proof is a photo, not a selfie. Camera opens on the back camera, with a flip button. Camera only, no gallery.
- Prompts have `type` "person" (photo must include that person; a different person in every one) or "thing" (object visible). Some have `group: "country"`.
- Country squares are on trust: the host never disqualifies over them.
- Dealing a board: at most 5 prompts with group "country".
- Custom prompts: a line starting with "Someone" is a person square, otherwise a thing square.

## Rules that must not break
- The server decides finish times (`finished_at = now()` in Postgres), never the browser.
- Photos are private to the host: private bucket, signed URLs, never shown to other players.
- Camera only for proof photos, no gallery upload.
- 5×5 has a FREE centre square; 4×4 and 6×6 don't.
