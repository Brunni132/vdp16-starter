import {vdp, color} from "../lib/vdp-lib";

class TextPlane {
	constructor() {
		this.characters = vdp.readMap('text');
	}

	drawText(text, x, y) {
		for (let i = 0; i < text.length; i++) {
			this.characters.setElement(x + i, y, text.charCodeAt(i) - 32);
		}
	}

	drawPlane() {
		vdp.writeMap(vdp.map('text'), this.characters);
		vdp.drawBackgroundTilemap('text');
	}
}


export function *main() {
	const textPlane = new TextPlane();
	textPlane.drawText('Hello world!', 10, 14);
	textPlane.drawText('This is an 8x8 text layer', 3, 16);

	while (true) {
		vdp.drawBackgroundTilemap('map');
		textPlane.drawPlane();
		yield;
	}
}