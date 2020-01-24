import {vdp, color} from "../lib/vdp-lib";

// Creating a new map:
// 1) Create a new sprite. A sprite is used as a tileset, that is, a list of tiles which compose the background, like a puzzle. Go to SPRITES, use the Rect tool, draw a selection (in our case we want 5 tiles of 16x16 each, so we create a rectangle of 80x16) and then click on the + button. Name it 'map2'.
// 2) Set the TW and TH properties in the right panel to 16, setting up 16x16 tiles.
// 3) Go back to the Select tool, select the 'map' sprite and double click on it.
// 4) Use the pen tool to draw some elements: one tile is a ground piece, and two other tiles are a mountain. The fourth tile is a smiley to be used as the sun, and the fifth an empty tile (to leave the background appearing).
// 5) Go back to the select tool (Escape key). Go to MAPS, draw a selection, in this case 16x16 (the size of the screen is 256x256, which corresponds to 16x16 tiles of 16x16, so a 16x16 map will fill up the screen) and click on the + button to create the map. Name it 'map'.
// 6) Go back to the Select tool, and double click on the map to edit it.
// 7) From the right panel, click on the appropriate tiles, and then click on the left map to draw the tile on it. Use right click and draw a selection to copy parts of the map and fill it up quicker.

export function *main() {
	while (true) {
		vdp.drawBackgroundTilemap('map');
		yield;
	}
}