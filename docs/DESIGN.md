# TIMELINER — UI design v0.1

**Interactive canvas:** https://claude.ai/artifact/ABND6k1WXFuxPjKUE6JusJ (private; press Play on a board to use it).
Boards: Timeline (vertical, live) · Night theme · Add to timeline · Focus mode · End-of-day review · Horizontal.

The canvas prototype is a throwaway design file, not app code. The real components follow `ARCHITECTURE.md`.

## 1. Visual language
- **Mood:** cozy desk. Warm cream ground, pastel layer colors, rounded pills, chunky 44 px touch targets. Night theme: deep purple.
- **Fonts:** Fredoka (titles, numbers, level) + Nunito (everything else). Both are free Google Fonts (OFL); bundle them with `expo-font`.
- **No emoji in UI.** Simple stroke icons.

### Color tokens
| Token | Light | Night |
|---|---|---|
| ground | `#F4EEE2` | `#231D45` |
| surface | `#FFFBF3` | `#2F2860` |
| ink | `#1F1A2E` | `#F4F1FF` |
| muted | `#625B70` | `#BDB5E0` |
| line / lineStrong | `#E9E0CF` / `#C9BCA4` | white 10 % / 30 % |
| chip | `#EAE2D2` | `#3D3574` |
| accent (now-line, active) | `#C2410C` | `#FFB86B` |

### Layer colors (fill / text)
Work `#F6D365 / #3D3000` · Study `#B3CCF5 / #10284F` · Health `#B9D99D / #1F3A0C` · Life `#F6C0D8 / #561233`.
Users can pick their own later; text on every fill must stay ≥ 4.5 : 1.

### Entry kinds
| Kind | Icon | Shape on timeline |
|---|---|---|
| Task (time block) | timer | card from start to end, focus-able |
| Todo | checkbox | pill at a time |
| Note | pencil | pill at a moment |
| Reminder | bell | pill at a moment + notification |

### Entry states
- **Planned:** pastel fill.
- **Active:** accent ring + progress bar filling along the bottom.
- **Done:** check icon, faded.
- **Skipped:** dashed outline, a neutral "gap". Never red (RESEARCH.md #10).
- **Past:** everything before the now-line sits under a soft veil; the future stays bright.

## 2. Screens
1. **Timeline (home).** Date + greeting · HUD (level, XP bar, streak, freezes) · Day / Week / Month / Year progress bars · zoom bar (Sec → Year) · layer chips · timeline area (lane headers with today's progress or the current long goal, time gutter with ticks, lanes, live now-line with a ticking clock pill and the character riding it) · tab bar (Timeline, Focus, Review, +).
2. **Add sheet.** Opens from a tap on the timeline (time and lane pre-filled, snapped to the zoom) or from +. Kind, title, time scale (Time / Hour / Day / Week / Month / Year), length, layer, reminder, optional treat. Shows the plan as a sentence ("At 3:45 PM today, in Work, I will …"). Month and year goals add the obstacle + if-then fields (WOOP).
3. **Focus.** One task only: ring countdown, today's path with the character moving forward, treat, "park a thought" into Inbox, Pause / Done, then a suggested 5-minute break.
4. **Review.** Stats, the path you walked (gaps shown neutrally, with "move to tomorrow"), plan vs. actual with a padding suggestion, tomorrow's first task, and it **ends on the best moment**.
5. **Directions and themes.** Same timeline running down, up, right or left; light and night.

## 3. Interactions
| Gesture | Result |
|---|---|
| Tap empty spot | Add sheet at that time and lane |
| Tap card | Card actions: start focus / done / edit (prototype: toggles done) |
| Drag / scroll | Travel in time; "Back to now" returns to live follow |
| Pinch | Zoom smoothly between Sec and Year (prototype uses chips) |
| Long-press card, drag | Reschedule (later slice) |
| Complete | Haptic tick + "+XP" toast; character steps forward |

## 4. Accessibility
- Every card is a button with a full label: "Task, Code review, 2:00–2:30 PM, skipped".
- Respect system font size; layouts must not clip at 130 %.
- "Reduce motion": the now-line steps once a second instead of flowing.
- Color is never the only signal: kind icons and text always come with it.
- Keyboard and screen-reader path to add an entry: the + button (no gesture needed).

## 5. Where the references went
| Reference | Taken |
|---|---|
| Purple vertical timeline (pill cards, colored icon nodes) | Night theme, pill-shaped point entries, kind icons |
| "Bee-Bot OS" board (git-branch lanes, soft clay buttons) | Layers as parallel lanes, chunky rounded controls |
| "Intelly" dashboard (today's timeline, time pill on a current-time line, faded past, pastel tiles) | Now-line + clock pill, past veil, pastel palette, Review tiles |
| Classic alternating timeline (icon circles, tags) | Single-layer view = centered spine; layer tags |

Plus app patterns listed in `RESEARCH.md` §2.
