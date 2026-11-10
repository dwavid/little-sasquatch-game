# Little Sasquatch: Find Your Family

A pixel-art side-scroller. Little Sasquatch gets separated from his family in a storm,
and has to find food and shelter before nightfall.

**Play it:** just open `index.html` in a browser (Chrome, Edge, Firefox, Safari). No install, no internet needed.
(Or run `python3 -m http.server` in this folder and visit http://localhost:8000.)

## Level 1 - After the Storm
* Your tummy starts low. Raid the **coolers** in the campgrounds to fill it back up (5 hearts = full).
* **Park Rangers** chase you. Outrun them, **jump on their hats** to stun them, or **hide in a bush**.
* Touch a **trail marker** flag to save your spot. If you faint, you wake up at the last one.
* **Berry bushes** near the end grow back, so you can never get stuck hungry.
* Once your tummy is full, find the shelter before night falls.

## Controls
| | |
|---|---|
| Move | Arrow keys or **A / D** |
| Jump | **Space**, Up arrow or **W** (hold for a higher jump) |
| Grab food | **E** (or X) when standing next to a cooler / berry bush |
| Hide | Hold **Down** or **S** while standing in a bush |
| Pause | **P** |
| Sound on/off | **M** |

On a phone or tablet, on-screen buttons appear automatically.

## How it's built
Plain HTML5 canvas + JavaScript, **no libraries and no image files** - every sprite is drawn in code.

```
index.html        the page
src/sprites.js    all the pixel art (Little Sasquatch, mom, dad, rangers, coolers, trees, cave...)
src/font.js       the tiny pixel font + speech bubbles
src/audio.js      sound effects and music (synthesised)
src/level1.js     LEVEL 1 DATA - coolers, rangers, signs, ground, sky colours
src/render.js     backdrop, terrain and scenery drawing
src/game.js       player, rangers, scenes (title, intro, play, ending)
```

### Easy things to change (all in `src/level1.js`)
* Add or move a cooler: edit the `coolers` list (`food` can be `apple`, `cookie`, `sandwich`, `fish`).
* Add a ranger: add an entry to `rangers` (`x` is where he starts, `min`/`max` is how far he patrols).
* Change how much food heals: edit `FOOD` at the top.
* Change the signs' messages: edit `signs`.
* Make the player faster / jump higher: the numbers at the top of the Player section in `src/game.js` (`MAXV`, `JUMPV`).

### Debug shortcuts (add to the URL)
`index.html?scene=play&x=3000&hp=10` starts Level 1 at x=3000 with full health.
`?scene=play&ending=1` jumps to the night/campfire ending. `?scene=intro` plays the intro.
