# Original illustrated map

`illustrated-board-v2.png` is an original AI-generated terrain illustration created for BoardBot on October 5, 2026 with the built-in Imagegen tool. The final generation used only the original `illustrated-board.guide.svg` rendered as a PNG. Its final prompt is preserved in `illustrated-board.prompt.txt`. No publisher artwork, component scan, owner photograph, character design or trademark logo was supplied to that generation. An earlier perspective illustration was discarded because its floors did not align.

The guide consists of BoardBot's original region shapes and floor/road geometry. Floor anchors were manually studied from the owner's private board reference; the accepted graph is documented separately in Rules-Reference and Game-Data-Checklist. The photograph, prepared components and concept renders remain ignored and are not part of this asset directory.

This original terrain asset, guide and prompt are distributed under BoardBot's [MIT License](../../../LICENSE). This notice grants no rights to third-party games, component text, trademarks or illustrations. The illustration is decorative: software supplies labels, numbered markers, legal highlights, portals, passages and observed pieces. It contains no executable rules or private game state.

The renderer places the square image at y=35 in its 1000-unit canvas; this aligns the generated clear floors with the checked floor anchors and leaves a narrow title band. This positioning does not alter the image's pixels. Use the painted layer only for the exact accepted topology; other imports use code-rendered terrain and their supplied edges.

The PNG is bundled locally by Vite. It requires no remote image service, font, runtime AI request or account.
