import {vdp, color} from "../lib/vdp-lib";

export function *main() {
	let loop = 0;

	while (true) {
		vdp.drawObject('level1', 0, loop);
		loop += 0.2;
		yield;
	}
}