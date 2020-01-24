const { addColors, blank, config, image,map,multiPalette,palette,sprite,tileset, readTmx,tiledMap, global } = require('../tools/gfxConverter/dsl.js');
const {Palette} = require('../tools/gfxConverter/palette.js');
const fs = require('fs');

function compressMap(pixelData, cellBits) {
	const qtyBits = 16 - cellBits;
	const maxQty = (1 << qtyBits) - 1, bitmask = (1 << cellBits) - 1;
	let result = new Uint16Array(pixelData.length);
	let pixelIndex = 0;

	function numIdenticalFrom(offset) {
		let i;
		for (i = 1; i + offset < pixelData.length; i++) {
			if (pixelData[offset + i] !== pixelData[offset]) return i;
		}
		return i;
	}

	for (let i = 0; i < pixelData.length; ) {
		const identical = Math.min(maxQty, numIdenticalFrom(i));
		if (pixelData[i] > bitmask) throw new Error(`Can't compress cell ${pixelData[i]} with ${cellBits}`);
		result[pixelIndex++] = identical << cellBits | pixelData[i];
		i += identical;
	}
	result = result.subarray(0, pixelIndex);

	checkCompressed(pixelData, result, cellBits);
	console.log(`Successfully compressed map (${pixelData.length * 2} -> ${result.length * 2} bytes)`);
	const str = Buffer.from(result.buffer).toString('base64');
	console.log(`TEMP str len `, str.length);
	const output = Buffer.from(str, 'base64');
	console.log(`TEMP `, output);
	return result;
}

function checkCompressed(originalData, compressedData, cellBits) {
	const decompressed = decompressMap(compressedData, cellBits);
	for (let i = 0; i < originalData.length; i++) {
		if (decompressed[i] !== originalData[i]) throw new Error(`Error in compression scheme at ${i}`);
	}
}

function decompressMap(data, cellBits) {
	const bitmask = (1 << cellBits) - 1;
	const result = [];
	for (let i = 0; i < data.length; i++) {
		for (let j = 0; j < data[i] >>> cellBits; j++) result.push(data[i] & bitmask);
	}
	return result;
}


config({ compact: true, debug: true }, () => {
	// Used for the background gradient
	palette('blank1', () => {});
	palette('blank2', () => {});
	palette('blank3', () => {});

	palette('title-screen', () => {
		tiledMap('title-screen', 'title-screen', { tileWidth: 8, tileHeight: 8, tilesetWidth: 16, tilesetHeight: 32 });
		tileset('title-barque', 'barque.png', 8, 8, { tilesetWidth: 16 }, () => {
			map('title-barque', 'barque.png');
		});
	});

	palette('level1', () => {
		const tmx = readTmx('level1-new.tmx');
		const til = tmx.readTileset('level1', global.palette('level1'), {tilesetWidth: 16});
		tileset(til);
		map(tmx.readMap('level1-hi', til));
		map(tmx.readMap('level1-lo', til));

		const objects = {
			objects: tmx.json.map.objectgroup[0].object,
			firstTile: parseInt(tmx.getTileset('objects')['$'].firstgid),
			tileTypes: [
				'0-2;6-8;12-14;18-21;24-25;37;45;53;38-41;46-47;66-69;86-89;97-98;102-104', 'wall',
				'108-113', 'fire|void|goleft',
				'114-117', 'void|godown',
				'124', 'godown'
			]
		};
		fs.writeFileSync('../src/level1.json', JSON.stringify(objects));

		tileset('level1-more', 'level1-more.png', 32, 32, {tilesetWidth: 1});
		sprite('rock-pillar', 'rock-pillar.png');
	});

	palette('perso', () => {
		tileset('perso', 'perso.png', 24, 24, {tilesetWidth: 1});
		sprite('shadow', 'shadow.png');
		tileset('enemy1', 'enemy1.png', 24, 24, {tilesetWidth: 1});
	});

	palette('level1-objects', () => {
		sprite('firewall', 'firewall.png');
		sprite('flame', 'flame.png');
		sprite('cart-lateral', 'cart-lateral.png');
		sprite('cart-vertical', 'cart-vertical.png');
	});

	palette('vdp-logo', () => {
		tileset('vdp-logo', blank(8, 128), 2, 2, () => {
			map('vdp-logo', 'vdp-logo.png');
			const compressed = compressMap(global.map('vdp-logo').mapData.pixelData, 8);
			const decompressed = decompressMap(compressed, 8);
		});
		tileset('vdp-logo-2', blank(4, 32), 8, 8, () => {
			map('vdp-logo-2', 'vdp-logo-2.png');
		});
	});
});
