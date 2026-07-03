# Goo Keep art bible

This document turns the Pipplo reference and the supplied style chart into shipping rules. New art should strengthen this language rather than introducing another visual dialect.

## Pipplo is the anchor

Pipplo must always be recognizable from the silhouette alone:

- a lemon-lime pear-shaped body, not an amorphous puddle;
- one curved antenna ending in a coral-pink orb;
- tiny rounded arms and feet;
- two white eyes with black pupils, a joyful open mouth, and a pink tongue;
- two coral cheek dots on Pipplo's right cheek;
- no armor, costume, castle, or generic slime decorations on the canonical body.

The production master is `public/assets/goo-keep/characters/pipplo/master/pipplo-master-v2.png`.

## Shape language

- Build characters from a small number of soft, readable masses.
- Every family needs a different outer silhouette before color or facial detail is considered.
- Keep faces minimal and expressive. Eyes and mouths should remain readable at phone size.
- Friendly units are round, buoyant, and forward-leaning. Enemy units are strange rather than gruesome: shells, caps, roots, wings, horns, and odd props provide their identity.
- Avoid a generic oval body with interchangeable circles attached to it.

## Palette and materials

Core colors: lemon yellow, moss green, lake teal, lavender, coral pink, tangerine, warm brown, mist gray, and cream.

Pipplo uses solid flat fills with no simulated lighting or material texture. Dark contours may be used on tiny lane units for legibility, but large characters and scenery should favor shape separation over heavy outlines.

## Articulated motion

Characters are flat 2D puppets with false depth. The body, arms, feet, antennae, wings, caps, roots, horns, shells, and held props are separate pieces attached at deliberate pivots.

- Never animate rectangular crops cut from a complete painted character. Overlapping pixels and missing seams make the character tear apart in motion.
- A limb may rotate and squash around its shoulder or hip, but its attachment point stays inside the body silhouette. Secondary motion is angle-limited.
- Faces live on their own shallow plane. Eyes and pupils can slide, compress, and softly occlude toward the far edge to suggest a turn without changing to a 3D render.
- Battlefield leaders may use polished raster cutout parts when every part is authored separately from one approved master. Preserve one shared palette, shading direction, and edge treatment; the runtime may transform the art, but it must never redraw the identity with geometric stand-ins.
- Pipplo is the hybrid-animation reference. The approved flat layers remain under `public/assets/goo-keep/characters/pipplo/rig-v2-flat/layers`, but they are composited offline into twelve cohesive bottom-anchored frames under `public/assets/goo-keep/characters/pipplo/hybrid-idle`. Phaser animates only the complete frames, so arms, feet, face, and antenna can never separate at runtime. The reproducible strip, contact sheet, and motion preview live under `art-source/goo-keep/characters/pipplo/hybrid-idle`.

- Idle: slow breathing, asymmetrical secondary motion, tiny weight shifts.
- Travel: body squash follows speed; feet, fins, roots, or wings alternate rather than bobbing as one rigid card.
- Summon: body compresses while arms or props open, then attached parts settle without separating.
- Hit: the body absorbs the impact first; attached parts lag by a few degrees rather than flying away.
- Reduced motion: keep state readability but reduce displacement and overshoot.

Four- or five-frame loops are too coarse for hero characters. Use 8–16 cohesive authored frames for silhouette-changing motion, then reserve runtime transforms for whole-character recoil, squash, placement, and impact—not live limb assembly.

## Battlefield and effects

- Scenery uses the same rounded geometry as the cast: bubble trees, floating islands, soft mushrooms, flowers, and curved hills.
- Keep the center lane readable. Decorative shapes belong in the sky, far hills, and outer thirds.
- Spells should have a visual verb: seeds arc, bubbles rise, roots crack the road, tongues stretch, spores drift, and impacts splat or starburst.
- Combat UI stays above the action or at the outer edges. Never cover feet, contact points, or the middle clash with a full-width strip.

## UI surfaces

Use warm cream cards, deep teal ink, coral danger, lemon rewards, and soft translucent field chips. Corners are round and friendly, but hierarchy comes from scale and spacing rather than putting every label in its own box. Portraits use production character art; procedural placeholder faces are not shipping art.

## Quality gate

Before a visual is accepted, verify it at desktop and phone size in motion. A passing source audit is not enough. Check silhouette, crop, anchor, overlap with the HUD, reduced motion, and whether the action is readable without its text label.
