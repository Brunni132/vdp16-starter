import {vdp, input, color, vec2, mat3} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

export function *main() {
	let loop = 0;

	while (true) {
		vdp.drawBackgroundTilemap('level1', { scrollX: loop });
		vdp.drawObject(vdp.sprite('mario').tile(0), 30, 176);
		loop += 0.2;
		yield;
	}
}