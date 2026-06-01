# Lexicon Labyrinth: Game Design and Combat Brainstorm Brief

Updated: June 2, 2026

Live prototype: https://zebetakeith.github.io/Lingua/

## Purpose of This Brief

Lexicon Labyrinth is a web-based language-learning roguelite. Its study system is becoming credible, but its combat still feels bland. This document describes the current game accurately enough to support a fresh combat brainstorm.

The goal is not to protect the current combat implementation. The goal is to identify a more playful, expressive combat loop that:

- rewards real studying without making studying feel like a toll;
- feels fun even after the novelty wears off;
- works comfortably on a phone, including a narrow Galaxy Flip-sized screen;
- supports long deck-worlds containing up to 2,000 flashcards;
- fits a cute, weird, soft-blob world inspired by LocoRoco rather than conventional fantasy RPG combat;
- gives Pipplo's enemy-eating growth mechanic a strong gameplay identity;
- supports infinite roguelite escalation without relying on gacha mechanics.

## One-Sentence Pitch

Study real flashcards to feed a strange little blob enough energy to survive an endless, cheerful, increasingly chaotic expedition through a deck-specific world.

## Core Fantasy

Every flashcard deck becomes its own persistent "deck-world." The protagonist, Pipplo, explores that world and grows by eating defeated creatures. Studying makes Pipplo and its helpers more capable in battle. Fighting makes the study journey feel like an adventure rather than a checklist.

The game should feel:

- cute first;
- weird second;
- mechanically expressive;
- bouncy and tactile;
- easy to understand on a phone;
- rewarding without being manipulative;
- study-effective enough that a player makes real language-learning progress.

The game should not feel:

- like homework wearing a game costume;
- like a generic menu-driven RPG with flashcards inserted between turns;
- like high-fantasy sword-and-magic combat;
- like a gacha game;
- like a cluttered mobile dashboard;
- like a system where visual effects merely decorate numerical damage.

## Visual Direction

The current visual target is a soft-blob flat 2D mascot style:

- rounded, squashable silhouettes;
- clean vector-like shapes;
- simple limbs;
- tiny expressive faces;
- bright but slightly soft colors;
- minimal shading;
- easy squash-and-stretch animation;
- toy-like monsters that are funny rather than frightening;
- whimsical outdoor and dungeon environments with soft shapes.

Pipplo is the visual anchor:

- rounded on top and flatter along the bottom;
- bright yellow-green body;
- different-color hands and feet;
- pink antenna tip;
- amorphous enough to visibly absorb traits from eaten enemies;
- cute, silly, and readable at phone scale.

The game has already moved away from an earlier dark occult-rune style. Any future combat concept should fit the playful blob world.

## Current High-Level Loop

1. The player imports or edits a flashcard deck.
2. Each deck becomes an independent persistent world.
3. Before a fresh expedition, the player chooses:
   - a study contract;
   - up to two unlocked helpers to accompany Pipplo;
   - a region start when unlocked.
4. If the deck is new, the player drafts starting vocabulary until at least six study cards are introduced.
5. Each floor alternates between:
   - a study set that earns action points;
   - a combat command window;
   - enemy timeline actions;
   - a reward screen after victory.
6. Pipplo eats defeated enemies and gains body stats.
7. Some floors offer new vocabulary, mutations, body traits, curios, or snacks.
8. Every fifth floor is a guardian floor. Every tenth floor is a larger region guardian.
9. The world scales forever until the player loses.
10. On defeat, the game reports both run progress and real study progress.

## Deck-World Structure

Each saved deck is independent. A deck stores:

- up to 2,000 flashcards;
- introduced study cards;
- card ratings and per-direction study progress;
- study settings;
- unlocked helpers;
- selected party members;
- unlocked mutations, curios, and body traits;
- relic history;
- boss clears;
- best floor and run statistics;
- the last study contract;
- one paused expedition snapshot.

Editing a deck affects future study and reward pools. Existing card progress remains associated with stable card IDs.

## Flashcard Import

Players can import flashcards using:

- tabs;
- CSV-style commas;
- `term - definition`;
- `term = definition`;
- `term: definition`.

Duplicate cards are skipped. Each deck has a hard cap of 2,000 cards.

## Current Study System

The study system is intentionally more serious than the combat prototype.

### Study Card States

Cards are:

- unintroduced;
- introduced and studying;
- struggling;
- learning;
- familiar;
- strong;
- mastered;
- manually marked as already known.

Cards must be intentionally introduced before appearing in study. New cards enter through the starting draft, between-floor rewards, or direct deck management.

### Study Directions

Each direction has separate progress:

- term to definition;
- definition to term.

Players can enable either or both directions.

### Question Types

Players can enable:

- multiple choice;
- flip and self-grade.

The removed type-to-answer mode is intentionally not part of the design because strict text matching was frustrating and unreliable.

The game favors free recall after mastery rises, but keeps multiple choice available.

### Scheduling

The current spaced-repetition model stores:

- mastery;
- correct streak;
- wrong streak;
- total seen;
- total correct;
- total wrong;
- next due time;
- reviews today;
- correct answers today;
- last review date;
- last reviewed timestamp.

The queue is tiered:

1. missed cards with an active wrong streak;
2. cards currently due;
3. optional early practice only when no higher-priority review remains.

Within a tier, weighting favors:

- weaker mastery;
- harder vocabulary;
- cards with wrong streaks;
- cards reviewed fewer times that day.

### Review Intervals

Correct answers can move a card toward longer review intervals:

- 2 minutes;
- 10 minutes;
- 1 hour;
- 6 hours;
- 1 day;
- 3 days;
- 7 days;
- 14 days;
- 30 days.

A wrong answer makes the card immediately due again.

### Wrong Answers

Wrong answers:

- award no AP;
- reveal the real answer;
- show the player's selected wrong answer;
- remain on screen until the player explicitly taps `Tap to continue`;
- reduce mastery;
- increase wrong streak;
- move the card to the front of the adaptive queue.

### AP Value of Study

Correct answers award AP based on learning value:

- unfamiliar or struggling cards are worth more;
- familiar cards are worth less;
- repeatedly answering the same card correctly on the same day reduces its AP value;
- self-graded recall pays slightly more than multiple choice;
- not-yet-due practice pays less;
- reward values can become fractional.

The current baseline per-card range is roughly `0.1 AP` to `2.1 AP` before roguelite modifiers.

### Study Sets

Each study set ends when either:

- the player resolves an AP hand with a default goal of `5 AP`; or
- the player reaches a safety cap of `12 cards`.

The important consequence is that a player with difficult, useful reviews can earn a combat window with fewer questions. A player repeatedly farming easy familiar cards must answer more questions for less AP.

### Study Settings

Players can toggle:

- term to definition;
- definition to term;
- multiple choice;
- flip and grade;
- shuffled multiple-choice answers.

### Study Progress Surfaces

The game now shows:

- due cards;
- learning cards;
- familiar cards;
- mastered cards;
- cards needing attention;
- per-card mastery percentage;
- per-card next review timing;
- expedition reviews;
- expedition AP earned;
- improving cards;
- newly mastered cards;
- missed words to review next.

## Study Contracts

At expedition start, the player chooses how much new material they want to meet.

Presets:

| Preset | New Cards | Study Minutes |
| --- | ---: | ---: |
| Quick | 5 | 10 |
| Regular | 15 | 25 |
| Long | 35 | 50 |

The player can adjust both values manually.

New vocabulary can appear during the expedition:

- one card on floors ending in `2`;
- one card on floors ending in `4`;
- up to ten cards on camp floors ending in `5` or `0`, limited by the contract and remaining library.

At certain camp floors, a completed contract can be extended by:

- `+10` new cards;
- `+15` study minutes.

The intended design is that a player can continue as long as they want without being forced to absorb a fixed amount of new vocabulary.

## Current Combat System

The active combat system is a turn-order JRPG-style AP system. An older match-3 rune-board prototype remains dormant in the code, but it is no longer the active combat loop.

### Combat Rhythm

1. The battlefield shows Pipplo, helpers, the enemy, enemy intent, HP, and a timeline.
2. The player taps `Ready` to begin a study set.
3. Correct answers earn AP and Gusto.
4. The game switches to the command window.
5. The active party member spends shared AP on commands.
6. Each action advances that character on the timeline.
7. Faster actors may act multiple times before an enemy reaches the front.
8. When an enemy reaches the front, it spends its own AP on a planned sequence.
9. The game returns to another study set.

### Shared Player Resources

#### HP

The party shares one HP pool. Helpers increase maximum HP.

#### AP

- AP comes from correct flashcards.
- AP is shared by the party.
- AP normally expires when the enemy acts or when the player ends the command window.
- Baseline carryover cap is `0`.
- Fractional AP is supported.

#### Gusto

- Gusto is a secondary meter.
- Correct cards charge Gusto.
- Some mutations charge it faster.
- Each Big Trick costs `12 Gusto`.
- A Big Trick costs no AP and does not advance the timeline.

### Timeline

Every party member and enemy has a speed value.

An action adds time to the acting creature. Lower action values act sooner. Faster creatures accumulate less delay for equivalent actions.

The timeline shows:

- current actor;
- upcoming actors;
- relative distance to the next enemy;
- preview text for how each command changes turn order.

The player can intentionally:

- use a cheap action and act again;
- choose a slower skill;
- brace before danger;
- delay an enemy;
- end commands and return to study.

### Elements

Current elements:

- Lightning;
- Flame;
- Tide;
- Leaf;
- Dark;
- Heart, used mostly for legacy healing visuals.

Enemies have:

- an element;
- weaknesses;
- resistances;
- HP;
- optional shields;
- speed;
- AP budget;
- optional special behavior.

Weakness damage is multiplied by `1.35`.

Resistance damage is multiplied by `0.65`.

### Shields

Some enemies have shells or shields.

- Commands that do not hit a weakness deal no shield damage while a shell is active.
- Weakness hits damage shells.
- Breaking a shell delays the enemy's next timeline action.
- Breaking a shell charges Gusto.
- Some mutations add extra shell-break rewards.

### Wobbly

Pipplo can apply `Wobbly`.

- Wobbly strengthens the next weakness hit.
- Triggering it multiplies weakness damage by another `1.35`.
- Some Big Tricks and mutations interact with Wobbly.

### Baseline Commands

Every active creature can use:

| Command | Cost | Current Function |
| --- | ---: | --- |
| Bop | 1 AP | Basic elemental damage |
| Brace | 1 AP | Reduces the next incoming hit and adds a little Gusto |
| Unique Trick | 2-4 AP | Character-specific action |
| Big Trick | 12 Gusto | Free character-specific ultimate that preserves AP and timeline position |

### Party

Pipplo always leads. A deck-world can bring up to two unlocked helpers.

| Character | Element | HP | Attack | Recovery | Speed | Trick | Big Trick | Unlock |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Pipplo | Lightning | 100 | 18 | 8 | 100 | Sticky Tag: damage plus Wobbly | Big Sticker: heavier damage plus two Wobbly weakness hits | Always available |
| Zip Sprig | Flame | 32 | 22 | 4 | 125 | Comet Bonk: Flame burst, stronger after a 4+ correct set | Zoomie Crash: larger Flame burst with the same study synergy | Befriend after Floor 5 guardian |
| Bubble Bell | Tide | 34 | 12 | 13 | 92 | Bubble Up: block the next enemy hit | Bubble Bath: block and delay the next enemy action | Answer 50 cards correctly in the deck-world |
| Mosskin | Leaf | 38 | 14 | 17 | 88 | Sprout Snack: heal and lightly damage | Picnic Burst: large heal and Bubble | Reach Floor 8 |
| Dusk Dot | Dark | 30 | 20 | 5 | 112 | Wink Hole: heavy damage, boosted against Wobbly or shielded enemies | Pocket Void: heavier version | Clear two guardians |

### Enemy AP

Enemies use the same broad AP concept:

- normal enemies usually receive `1 AP`;
- enemies with specials receive `2 AP`;
- bosses receive `3 AP`.

An enemy generally spends:

1. one AP on a strike;
2. remaining AP on a special or additional boss pressure.

### Enemy Behaviors

Current enemy special behaviors:

| Behavior | Effect |
| --- | --- |
| Belly Flop | Spends extra AP for damage |
| Scramble Answers | Randomizes answer order next study set |
| Study Tax | Raises the next study goal by `1 AP` |
| Drain Gusto | Drains Gusto and reduces the first AP gain next study set |
| Delay Actor | Pushes a random helper backward on the timeline |
| Self Repair | Restores enemy HP after striking |
| AP Check | Deals extra damage if the player spent fewer than `3 AP` |
| Heal Check | Deals extra damage if the player did not heal or brace |
| Enrage | Increases damage below half HP |
| Sequential | Returns to the timeline more quickly after acting |
| Boss Protocol | Raises next study goal and reduces early AP gain |

### Floors 1-10 Teaching Arc

| Floor | Enemy | Lesson |
| ---: | --- | --- |
| 1 | Bloop Slime | Brace before Belly Flop |
| 2 | Nibble Imp | Bubble Bell guest can block answer scrambling |
| 3 | Doodle Dragon | Spend at least `3 AP` before the enemy acts |
| 4 | Page Wisp | Hit the Tide weakness to crack the shell, delay the enemy, and gain Gusto |
| 5 | Root Lump guardian | Zip Sprig guest uses Flame to crack the shell; guardian enrages below half HP |
| 6 | Nap Puff | Block Study Tax or prepare for a longer study hand |
| 7 | Sprout Grump | Heal or Brace before it acts |
| 8 | Dusk Puff | React to a fast-returning enemy |
| 9 | Nibbly Bat | Crack shell and burst before Self Repair matters |
| 10 | Word Dragon guardian | Handle phases, shell pressure, disruption, and the final `WORD STORM` escalation |

### Scaling Beyond Floor 10

- Every ten floors starts a new region.
- HP scaling increases by region and local floor step.
- Later regions can contain multi-enemy groups.
- Every fifth floor remains a guardian.
- Every tenth floor uses the large region guardian pattern.
- Enemies gain more health, damage, shells, and disruption until defeat becomes inevitable.

## Pipplo's Growth Through Eating

After clearing a room, Pipplo absorbs the defeated enemy.

Current growth stats:

| Stat | Current Meaning |
| --- | --- |
| Bulk | Adds maximum HP and current HP |
| Bop | Adds Pipplo basic attack damage |
| Bounce | Speeds Pipplo's timeline movement |
| Gusto | Adds extra Gusto gain during studying |

Enemy element influences absorbed growth:

- Leaf enemies tend to add Bulk;
- Flame enemies tend to add Bop;
- Tide enemies tend to add Gusto;
- Lightning enemies tend to add Bounce;
- Dark enemies tend to add Bop;
- guardians add additional Bulk and Gusto.

This is one of the most distinctive ideas in the game, but the current combat does not yet make transformation feel central enough.

## Roguelite Rewards

After floors, the player may receive several reward types. To keep the phone UI readable, secondary rewards are stacked inside a slide-out `Reward Pouch`.

### Mutations

Mutations are run-specific modifiers with deck-specific unlock history.

Examples:

- first correct card gives bonus AP;
- perfect study discounts the next Flame action;
- first heal raises a Bubble;
- correct answers charge Gusto faster;
- first wrong answer still charges some Gusto;
- weakness hits deal more damage;
- perfect study applies Wobbly;
- wrong answers charge Gusto but increase incoming damage;
- shell breaks raise Bubble or add damage;
- bracing can delay enemies.

### Body Traits

On camp floors, Pipplo may visibly grow a trait influenced by recently eaten enemies.

| Trait | Current Effect |
| --- | --- |
| Imp Horns | First Pipplo Bop each floor deals bonus damage |
| Bubble Belly | First Brace each floor also raises a Bubble |
| Sprout Tuft | Recover extra HP between floors |
| Spring Tail | Pipplo acts slightly faster |
| Star Freckles | First Pipplo weakness hit each floor adds Gusto |

Pipplo can currently carry up to three visible traits.

### Curios

Pipplo can carry up to three curios.

Examples:

- improve absorbed growth;
- speed Pipplo slightly;
- improve Brace;
- give bonus AP on the first correct card;
- heal between floors.

### Snacks

Pipplo has a two-slot backpack. Snacks are free actions during a command window.

| Snack | Effect |
| --- | --- |
| Berry Pop | Restore HP |
| Bubble Bun | Restore HP and raise a Bubble |
| Jam Drop | Gain `1 AP` |
| Sleepy Cookie | Delay the next enemy |
| Fizz Peel | Cleanse study pressure and fragility |
| Pepper Puff | Empower the next Pipplo Bop |

### Vocabulary Rewards

Some floors offer three vocabulary cards.

For each chosen card, the player can mark:

- Hard;
- Medium;
- Easy;
- Known already.

`Known already` replaces the option rather than adding it to active study.

## Long-Term Progression

Long-term progression is deck-specific:

- helper unlocks;
- mutation history;
- body-trait discoveries;
- curio discoveries;
- boss clears;
- region starts;
- best floor;
- card mastery milestones.

Wisdom Orbs exist as earned currency for future upgrades, but their final long-term use is not yet defined.

There is no gacha mechanic.

## Current UI

### Main Menu

- open expedition;
- how to play;
- flashcards;
- discoveries;
- wisdom orbs;
- best floor;
- total learned words.

### Flashcards

- deck creation and selection;
- import;
- backup and restore;
- study settings;
- per-card mastery;
- due labels;
- pause or reintroduce cards.

### Expedition Setup

- resume paused deck-world;
- choose Quick, Regular, or Long contract;
- adjust new-card and study-minute targets;
- select region start;
- select helpers.

### Combat

- battlefield remains visible;
- party stands on the left;
- enemy stands on the right;
- timeline strip at the top;
- enemy intent near the enemy;
- command panel below;
- AP, HP, Gusto, body stats, backpack, Big Trick, and `End Commands`;
- notices are transient;
- backpack opens as a slide-out drawer.

### Rewards

- Pipplo eating recap;
- floor study telemetry;
- study contract progress;
- vocabulary cards;
- slide-out reward pouch for mutation, trait, curio, and snack choices.

### Defeat

- floor and score;
- wisdom orbs;
- reviews;
- AP earned;
- cards improving;
- newly mastered cards;
- due cards;
- cards needing attention;
- missed words to review next.

## Why Combat May Feel Bland

This section is intentionally candid. These are hypotheses to test, not immutable conclusions.

### 1. The verbs are mechanically familiar

The main commands are still:

- attack;
- defend;
- skill;
- ultimate.

The names are cute, but the underlying choices are recognizable JRPG menu choices. Pipplo's amorphous body and appetite are much stranger than the actions available to it.

### 2. Study and combat are connected mostly through resource generation

Studying currently produces AP and Gusto. Combat consumes AP and Gusto.

That connection is functional, but the details of the study performance rarely reshape the battle in a vivid way. A study set does not usually create a surprising toy, body form, combo pattern, or tactical object. It mostly creates a larger or smaller budget.

### 3. Combat feedback is readable but not inherently playful

The battlefield has animations, projectiles, damage numbers, enemy reactions, shells, bubbles, and intent labels. However, the presentation mainly explains arithmetic that has already happened.

The player is not manipulating something delightful on screen. The effects decorate decisions instead of becoming the decisions.

### 4. Shared AP can flatten party identity

Helpers differ by:

- element;
- speed;
- stats;
- one skill;
- one Big Trick.

But all helpers draw from one AP pool. The optimal move can often become "use the best weakness hit available." Helper relationships and sequencing are not yet rich enough to feel like a party with personality.

### 5. Enemy intent is informational more than dramatic

Enemy plans are visible and tactically legible, but many encounters reduce to one instruction:

- Brace now;
- hit the weakness;
- spend at least `3 AP`;
- heal before the hit;
- burst before repair.

These are useful teaching encounters, but they risk becoming solved checks rather than expressive battles.

### 6. Pipplo's eating fantasy happens after combat

Pipplo eating enemies is a strong hook. At present, it mostly grants passive stat increases and occasional trait choices after a room.

The act of eating, digesting, wobbling, splitting, stretching, or borrowing a defeated enemy's behavior is not yet the center of moment-to-moment play.

### 7. Rewards are broad but not yet transformative enough

The game has:

- mutations;
- traits;
- curios;
- snacks;
- helpers;
- body growth;
- Big Tricks.

This is a healthy content vocabulary, but many rewards add a bonus rather than changing the player's mental model. A great roguelite run should sometimes become weird enough that the player wants to tell someone what happened.

### 8. The alternating loop can feel stop-start

The loop alternates:

1. study set;
2. command window;
3. action animation;
4. enemy action;
5. study set.

This supports learning, but the command stage may feel like an interruption rather than a satisfying payoff unless it creates a more tactile, surprising burst of play.

## What Seems Worth Keeping

These parts appear to support the game's identity:

- deck-specific worlds;
- serious persistent study progress;
- adaptive AP rewards;
- fractional AP for familiar repetitions;
- wrong answers that pause and teach;
- Quick, Regular, and Long study contracts;
- Pipplo as an amorphous eater;
- visible absorption and body traits;
- cute soft-blob art direction;
- infinite roguelite escalation;
- mobile-first layout;
- non-gacha unlocks;
- enemy intents;
- readable short battles;
- deck-specific unlocks.

## What Is Safe to Reinvent

These parts can be reconsidered aggressively:

- the exact function of AP;
- whether combat should remain a standard command menu;
- whether there should be a timeline at all;
- whether helpers should act as separate JRPG characters;
- whether Big Tricks should remain conventional ultimates;
- whether weaknesses should remain a simple multiplier;
- whether shells should remain ordinary shields;
- whether the player should choose one action at a time;
- whether the player should directly manipulate Pipplo's body;
- whether eating should happen only after a kill;
- whether study sets should always alternate with combat at the same cadence.

## Design Constraints for a New Combat Concept

A replacement combat system should satisfy most of these:

1. It must be comfortable with one thumb on a narrow phone.
2. It should create meaningful decisions within roughly `5-20` seconds after a study set.
3. It should not require high mechanical dexterity.
4. It should preserve real learning quality.
5. It should use study performance as more than a damage multiplier.
6. It should make Pipplo's amorphous eating fantasy central.
7. It should allow helpers and absorbed traits to alter playstyle.
8. It should support many enemies and bosses without requiring bespoke code for every fight.
9. It should support infinite scaling and 2,000-card deck-worlds.
10. It should remain understandable without large tutorial panels.
11. It should look lively using simple CSS motion and 2D sprites.
12. It should not drift back toward generic swords, spells, or dark fantasy.
13. It should not become another match-3 game unless matching is only one optional small ingredient.

## Useful Brainstorm Questions

### Core Verb

- What should Pipplo physically do after a study set?
- Can the player stretch, squash, split, roll, slingshot, stack, digest, or spit absorbed traits?
- Can combat feel toy-like rather than menu-like?
- What is the smallest action that would still feel fun after hundreds of uses?

### Study-to-Combat Translation

- Should different card results create different temporary body parts or moves?
- Could missed cards create recoverable complications rather than only punishment?
- Could difficult answers create rare "flavors" that let Pipplo mutate for one turn?
- Could mastery affect reliability, efficiency, or move shape rather than raw damage?
- Could a study hand generate a small set of physical tokens, ingredients, or body segments to play with?

### Eating

- Could Pipplo take a bite before an enemy is defeated?
- Could eating steal one enemy behavior?
- Could Pipplo choose which part of an enemy to digest?
- Could the player spit an absorbed feature back out as a projectile or helper?
- Could digestion create temporary build-defining forms?

### Helpers

- Should helpers remain full party members?
- Would helpers be more distinctive as passive toys, triggered assists, orbiting companions, or one-use interruptions?
- Could helpers change the meaning of an input rather than add more buttons?

### Roguelite Builds

- What kinds of rewards would genuinely transform a run?
- Could Pipplo become wide, bouncy, sticky, hollow, spiky, bubbly, split into copies, or carry swallowed enemies?
- Can a reward create a new verb rather than `+10%` output?
- How can runs become funny enough to describe afterward?

### Enemy Design

- Can enemies create spatial or behavioral problems instead of simple stat checks?
- Can a monster force Pipplo to spit something out, split, defend a weak spot, or digest under pressure?
- Can bosses have readable toy-like rules that evolve over several floors?

### Cadence

- Should every study set always lead to a command window?
- Should AP be spent continuously, in bursts, or as ingredients for one larger move?
- Would shorter study bursts with more tactile combat feel better?
- Could longer study sets create a more spectacular but still quick combat payoff?

## Candidate Direction Families to Explore

These are prompts for exploration, not recommendations yet.

### Direction A: Build-a-Blob Actions

Correct answers generate a few body pieces or temporary traits. The player assembles a tiny loadout before Pipplo acts:

- springy foot;
- bubble belly;
- sticky tongue;
- horn;
- duplicate blob;
- heavy bottom;
- comet tail.

The resulting body visibly changes Pipplo's next action. The focus is expressive combinations rather than attack menus.

### Direction B: Swallow, Digest, Spit

Pipplo can:

- Bop;
- Swallow;
- Digest;
- Spit.

Enemies have edible features. Swallowing changes Pipplo temporarily. Spitting turns stored features into attacks or utility. Builds emerge from choosing what to keep in Pipplo's belly.

### Direction C: One-Thumb Slingshot Blob

After studying, the player receives a small number of launches. Drag backward and release Pipplo through enemies, bumpers, hazards, or food. Traits change bounce, stickiness, size, splitting, and absorption.

This adds a tactile payoff while remaining simple on phones. It would need careful testing to avoid becoming dexterity-heavy.

### Direction D: Blob Timeline With Programmable Tricks

Keep the visible timeline, but replace the command menu with a short queue of physical trick cards generated by study:

- place up to three tricks;
- see a preview;
- launch the sequence;
- watch Pipplo wobble through it.

Helpers alter or remix the trick queue. This keeps strategy while making the payoff more animated and build-driven.

### Direction E: Tiny Positional Arena

Combat occurs in a small one-screen lane or arena. Pipplo rolls, stretches, blocks, eats, and rebounds with a handful of taps or swipes. Study creates stamina, body size, or temporary features.

This could make enemies feel more alive, but it is the largest implementation change.

## Questions the Next Design Proposal Should Answer

For each proposed combat concept, explain:

1. What does the player physically tap, swipe, hold, or drag?
2. What is fun about doing it for the hundredth time?
3. What does a correct answer create?
4. What does a wrong answer do besides punish the player?
5. How does mastery change combat without rewarding shallow repetition?
6. How does Pipplo eat enemies during play?
7. How do absorbed traits change the run?
8. What do helpers do?
9. How does one normal enemy differ from another?
10. How does a boss become memorable?
11. What information must remain visible on a `360x880` phone screen?
12. How long does one study-combat cycle take?
13. What existing systems can be reused?
14. What prototype can be built first to determine whether the concept is fun?

## Suggested ChatGPT Brainstorm Prompt

Copy the following prompt into a new conversation together with this document:

```text
I am redesigning the combat in this language-learning roguelite. Read the attached design brief carefully.

The study engine, deck-world concept, cute soft-blob art direction, mobile-first constraints, and Pipplo's enemy-eating fantasy matter. The current AP timeline JRPG combat works mechanically but feels bland. I am willing to replace the combat loop aggressively.

Please propose 4 substantially different combat systems. Do not merely rename attack, defend, skill, and ultimate. At least 2 concepts should make Pipplo's amorphous body and eating mechanic central to moment-to-moment play. Avoid match-3 as the main mechanic, avoid gacha, avoid fantasy swords and generic spell menus, and keep the experience comfortable on a narrow phone.

For each concept, describe:
- the one-thumb inputs;
- a 30-60 second example battle;
- how flashcard results become gameplay;
- what makes repeated play fun;
- how helpers work;
- how eating and digestion work;
- how roguelite rewards transform the run;
- how enemies and bosses create variety;
- what existing systems can be reused;
- the main implementation risk.

Then compare the 4 concepts in a table and recommend the best first prototype. For the recommended prototype, define a minimal playable version that can be implemented quickly without final art.
```

## Final Design Principle

The strongest version of Lexicon Labyrinth should make the player feel:

> "I came here to play with this funny evolving blob, and somehow I also learned my vocabulary."

