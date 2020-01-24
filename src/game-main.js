import {vdp, color} from "../lib/vdp-lib";

// To import the map, we need:
// 1) To create a palette for it (we could reuse an existing one, but in this case we want a dedicated one). In this example, we'll use 'palette1' which is pre-configured for us.
// 2) Create a sprite that will hold the tileset. Go to the SPRITES panel, select an empty area using the Rectangle tool. It needs to be big enough to hold all the tiles, which depends on the tile size. You can always create a too big sprite, and then reduce the height after importing the map by coming back to SPRITES, selecting it and reducing the H property. In this case draw a 128x80 rectangle (look at the status bar to check the size).
// 3) Click on the + button, name the sprite 'level1'.
// 4) In the right panel that configures the sprite, set TW and TH both to 16 (meaning a tile size of 16x16, what the first level of mario is meant for).
// 5) This is when you could be starting to draw your tileset directly. In our case, we are going to auto-generate it from importing an already-drawn map.
// 6) Go to the MAPS panel. Click on the Import button, select the image (level1.png under the gfx directory), select 'level1' as the tileset and click IMPORT. Place the resulting map in any empty area (you can always move it later by doing Ctrl+X / Ctrl+V in Select mode).
// 7) Your tileset and its associated palette will now contain the colors and 16x16 tiles, and the map can be edited by double-clicking on it.

export function *main() {
	let scroll = 0;

	while (true) {
		vdp.drawBackgroundTilemap('level1', { scrollX: scroll, scrollY: -32 });
		vdp.drawObject('hello', 66, 117);
		scroll += 0.5;

		yield;
	}
}