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

The current animation master is `art-source/goo-keep/characters/pipplo/whole-sprite-v2/pipplo-base.png`. Its asymmetrical goo skirt, body hollows, soft crown fold, leaf collar, and coral clasp give the protagonist a silhouette and role-specific identity equal to the enemy generals.

## Shape language

- Build characters from a small number of soft, readable masses.
- Every family needs a different outer silhouette before color or facial detail is considered.
- Keep faces minimal and expressive. Eyes and mouths should remain readable at phone size.
- Friendly units are round, buoyant, and forward-leaning. Enemy units are strange rather than gruesome: shells, caps, roots, wings, horns, and odd props provide their identity.
- Avoid a generic oval body with interchangeable circles attached to it.

## Palette and materials

Core colors: lemon yellow, moss green, lake teal, lavender, coral pink, tangerine, warm brown, mist gray, and cream.

Pipplo uses clean 2D color regions with restrained soft shading. The shading may help the round silhouette read, but must not create a glossy plastic or fully rendered 3D material. Dark contours may be used on tiny lane units for legibility, while large characters and scenery should favor shape separation over heavy outlines.

## Whole-sprite motion

Hero motion uses cohesive authored frames. Arms, feet, faces, antennae, and props remain inside one complete sprite, so the character can bend and squash without seams opening or pieces drifting away.

- Never animate rectangular crops or separately transform parts cut from a complete painted character. Overlapping pixels and missing seams make the character tear apart in motion.
- Pipplo is the whole-sprite reference. Idle, hit, and devour use 12–16 complete bottom-anchored deformation frames. Summon is the authored-pose pilot: eight identity-locked key poses created together on one shared sheet, normalized to the same scale and anchor, then bridged with restrained whole-sprite motion at runtime.
- The reproducible builder and motion previews live in `scripts/build-pipplo-whole-sprite-animations.py` and `art-source/goo-keep/characters/pipplo/whole-sprite-v2`.
- Phaser may add tiny 60fps whole-character scale, rotation, lift, and wobble between frames. It must not move a limb or facial feature independently.

- Idle: slow breathing, asymmetrical secondary motion, tiny weight shifts.
- Travel: the complete silhouette stretches into motion, compresses on contact, and settles back into its anchor.
- Summon: anticipation squash, upward stretch, soft landing, and a short wobbling settle.
- Hit: impact compression, directional recoil, and a quickly decaying whole-body wobble.
- Devour: anticipation, forward gulp, satisfied squash, and buoyant recovery.
- Reduced motion: keep state readability but reduce displacement and overshoot.

Four- or five-frame loops are too coarse for hero characters. Use 12–16 cohesive frames for silhouette-changing hero motion, then reserve runtime transforms for subtle whole-character interpolation—not live limb assembly.

## Battlefield and effects

- Scenery uses the same rounded geometry as the cast: bubble trees, floating islands, soft mushrooms, flowers, and curved hills.
- Keep the center lane readable. Decorative shapes belong in the sky, far hills, and outer thirds.
- Spells should have a visual verb: seeds arc, bubbles rise, roots crack the road, tongues stretch, spores drift, and impacts splat or starburst.
- Combat UI stays above the action or at the outer edges. Never cover feet, contact points, or the middle clash with a full-width strip.

## UI surfaces

Use warm cream cards, deep teal ink, coral danger, lemon rewards, and soft translucent field chips. Corners are round and friendly, but hierarchy comes from scale and spacing rather than putting every label in its own box. Portraits use production character art; procedural placeholder faces are not shipping art.

## Quality gate

Before a visual is accepted, verify it at desktop and phone size in motion. A passing source audit is not enough. Check silhouette, crop, anchor, overlap with the HUD, reduced motion, and whether the action is readable without its text label.
