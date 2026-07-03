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

## Palette and finish

Core colors: lemon yellow, moss green, lake teal, lavender, coral pink, tangerine, warm brown, mist gray, and cream.

Characters use a deliberately small set of solid fills. Do not use gradients, baked lighting, dimensional highlights, texture, clay rendering, plastic rendering, bevels, or material simulation. Softness comes from the silhouette and motion, not from 3D-style shading. Dark contours may be used sparingly on tiny lane units for legibility, but large characters should favor shape separation over heavy outlines.

## Articulated motion

Characters are flat 2D puppets with false depth. The body, arms, feet, antennae, wings, caps, roots, horns, shells, and held props are separate pieces attached at deliberate pivots.

- Never animate rectangular crops cut from a shaded or textured character. Overlapping lighting and missing seams make the character tear apart in motion. Tiny lane units may use the audited flat-seed crop rig only while its displacement clamps keep every seam buried and its action QA remains clean.
- A limb may rotate and squash around its shoulder or hip, but its attachment point stays inside the body silhouette. Secondary motion is angle-limited.
- Faces live on their own shallow plane. Eyes and pupils can slide, compress, and softly occlude toward the far edge to suggest a turn without changing to a 3D render.
- Battlefield leaders use authored raster cutout parts. Preserve one shared finite palette and edge treatment; the runtime may transform the art, but it must never redraw the identity with geometric stand-ins.
- Pipplo's reference implementation lives in `public/assets/goo-keep/characters/pipplo/rig-v2-flat/layers`. Every visible region uses a solid fill with no gradients, simulated lighting, material texture, or dimensional highlights. Its flat source board and parts preview live outside the shipping bundle under `art-source/goo-keep/characters/pipplo/rig-v2-flat`; the rejected shaded rig is archived under `art-source/goo-keep/characters/pipplo/rig-v1`.
- The five enemy-general rigs live in `public/assets/goo-keep/characters/generals-flat`. Their source boards, finite palettes, crop manifests, and reproducible build inputs live under `art-source/goo-keep/characters/generals-flat`.
- The twelve lane-unit flat seeds live beside their legacy seeds as `seed-flat-v1.png`; only those flat seeds are loaded by the battlefield. Their palette manifest and roster preview live under `art-source/goo-keep/characters/unit-rigs-flat`.

- Idle: slow breathing, asymmetrical secondary motion, tiny weight shifts.
- Travel: body squash follows speed; feet, fins, roots, or wings alternate rather than bobbing as one rigid card.
- Summon: body compresses while arms or props open, then attached parts settle without separating.
- Hit: the body absorbs the impact first; attached parts lag by a few degrees rather than flying away.
- Reduced motion: keep state readability but reduce displacement and overshoot.

Animation should not depend on a short looping strip for its smoothness. Raster frames may provide authored poses, but continuous spring motion supplies the life between poses.

## Battlefield and effects

- Scenery uses the same rounded geometry as the cast: bubble trees, floating islands, soft mushrooms, flowers, and curved hills.
- Keep the center lane readable. Decorative shapes belong in the sky, far hills, and outer thirds.
- Spells should have a visual verb: seeds arc, bubbles rise, roots crack the road, tongues stretch, spores drift, and impacts splat or starburst.
- Combat UI stays above the action or at the outer edges. Never cover feet, contact points, or the middle clash with a full-width strip.

## UI surfaces

Use warm cream cards, deep teal ink, coral danger, lemon rewards, and soft translucent field chips. Corners are round and friendly, but hierarchy comes from scale and spacing rather than putting every label in its own box. Portraits use production character art; procedural placeholder faces are not shipping art.

## Quality gate

Before a visual is accepted, verify it at desktop and phone size in motion. A passing source audit is not enough. Check silhouette, crop, anchor, overlap with the HUD, reduced motion, and whether the action is readable without its text label.
