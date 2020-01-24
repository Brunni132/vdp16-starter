import {vdp, color} from "../lib/vdp-lib";

export function *main() {

	while (true) {
		// Gets the address of the sprite, meaning its x,y position on the sprite sheet,
		// its w,h (width, height) and some other info.
		const hello = vdp.sprite('hello');

		// We can either pass 'hello' (name of the sprite) or the sprite address.
		// As second and third arguments, we pass the x and y position (top-left corner)
		// We place the top-left corner at the middle of the screen minus half the object
		// size, making it centered.
		vdp.drawObject(hello,
			vdp.screenWidth / 2 - hello.w / 2,
			vdp.screenHeight / 2 - hello.h / 2);

		yield;
	}
}