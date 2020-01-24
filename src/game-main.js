import {vdp, color, input} from "../lib/vdp-lib";

export function *main() {
	const pos = { x: 67, y: 117 };

	while (true) {
		if (input.isDown(input.Key.Right)) pos.x += 1;
		if (input.isDown(input.Key.Left)) pos.x -= 1;
		if (input.isDown(input.Key.Up)) pos.y -= 1;
		if (input.isDown(input.Key.Down)) pos.y += 1;

		vdp.drawObject('hello', pos.x, pos.y);
		vdp.drawObject('move-with-arrows', 69, 240);
		yield;
	}
}