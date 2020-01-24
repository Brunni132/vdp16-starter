import {vdp, VDP} from '../lib/vdp-lib';
import {Coroutines} from "./utils";
import {logo} from "./vdp-logo";
const objectDefinitions = require('./level1.json');

const TIMESTEP = 1 / 60;
const GRAVITY = 0.3;
const MAX_Z = 300;
const PERSO_PRIORITY = 3;

class Camera {
	constructor() {
		this.x = this.y = 0;
		this.shakeX = this.shakeY = 0;
		this.minimumX = 0;
	}

	update(perso) {
		const camLimit = 16;
		const ofsX = perso.x - this.x;
		const ofsY = perso.y - this.y;

		if (ofsX < vdp.screenWidth / 2 - camLimit) this.x = perso.x - (vdp.screenWidth / 2 - camLimit);
		if (ofsX > vdp.screenWidth / 2) this.x = perso.x - (vdp.screenWidth / 2);
		if (ofsY < vdp.screenHeight / 2 - camLimit) this.y = perso.y - (vdp.screenHeight / 2 - camLimit);
		if (ofsY > vdp.screenHeight / 2 + camLimit) this.y = perso.y - (vdp.screenHeight / 2 + camLimit);

		this.x = Math.min(map.width * map.tileWidth - vdp.screenWidth,  Math.max(this.minimumX, this.x));
		this.y = Math.min(map.height * map.tileHeight - vdp.screenHeight,  Math.max(0, this.y));
	}

	isVisible(object) {
		const pos = this.transform(object.x, object.y);
		return pos.x + object.width >= 0 && pos.y + object.height >= 0 &&
			pos.x < vdp.screenWidth && pos.y < vdp.screenHeight;
	}


	get xFinal() { return Math.floor(this.x + this.shakeX); }
	get yFinal() { return Math.floor(this.y + this.shakeY); }

	transform(x, y) {
		return { x: Math.floor(x) - this.xFinal, y: Math.floor(y) - this.yFinal };
	}

	transformWithoutShake(x, y) {
		return { x: Math.floor(x) - Math.floor(this.x), y: Math.floor(y) - Math.floor(this.y) };
	}
}

class Perso {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.z = 0;
		this.vx = this.vy = this.vz = 0;
		this.width = 24;
		this.height = 12;
		this.maxZ = 0;
		this.direction = 0; // 0=down, 1=up, 2=right, 3=left
		this.canControl = true;
	}

	draw() {
		let tileNo = this.direction;
		if (this.animState === 'hit') tileNo = 4;

		const persoTile = vdp.sprite('perso').tile(tileNo);
		const shadowTile = vdp.sprite('shadow');
		const pos = camera.transformWithoutShake(this.x, this.y);
		const scaleFactor = Math.min(1, (MAX_Z - this.z) / MAX_Z);
		let jumpAltitude = this.z < 0 ? (this.z / 2) : (this.z / 4);
		// To avoid falling over a solid lo-plane block (has lo-priority, so we have no way to put the character behind it)
		if (this.falling && !map.listRolesAt(this.x, this.y + jumpAltitude).includes('void')) return;
		vdp.drawObject(persoTile, pos.x - persoTile.w * scaleFactor / 2, pos.y - persoTile.h * scaleFactor + jumpAltitude,
			{ prio: 3, width: persoTile.w * scaleFactor, height: persoTile.h * scaleFactor });
		if (this.overGround) {
			vdp.drawObject(shadowTile, pos.x - shadowTile.w / 2, pos.y - 4, {prio: 3, transparent: true});
		} else if (!this.overGround && this.z < 10) {
			vdp.drawObject(shadowTile, pos.x - shadowTile.w / 2 + 6, pos.y, {prio: 2, transparent: true, width: 12, height: 5 });
		}
	}

	get left() { return this.x - this.width / 2; }
	get right() { return this.x + this.width / 2; }
	get top() { return this.y - this.height / 2; }
	get bottom() { return this.y + this.height / 2; }
	get falling() { return !this.overGround && this.z >= 10 && this.vz >= 0; }
	get grounded() { return this.z >= -0.1 && this.overGround; }
	get overGround() { return this.maxZ < MAX_Z; }
	set left(value) { this.x = value + this.width / 2; }

	notifyGroundOnObject(obj) {
		this.maxZ = 0;
	}

	stompedEnemy() {
		this.vz = -6;
	}

	replaceInLevel(perso, rolesInTileOfDeath) {
		this.z = 0;
		this.vz = -10;
		if (rolesInTileOfDeath.includes('goleft')) this.vx = -10;
		if (rolesInTileOfDeath.includes('goright')) this.vx = 10;
		if (rolesInTileOfDeath.includes('goup')) this.vy = -10;
		if (rolesInTileOfDeath.includes('godown')) this.vy = 10;
	}

	takeDamage(pushSideways = true, impulseZ = -8) {
		if (pushSideways) {
			Object.assign(this, {vz: impulseZ, vx: -6 * Math.sign(this.vx), vy: 0});
		}
		coroutines.replace(this, 'anim', frame => {
			this.animState = 'hit';
			return frame < 60;
		});
	}

	update() {
		const speed = 2, impulseSpeed = 3, jumpImpulse = -6;
		const targetVelocity = { x: 0, y: 0 };
		const impulse = { x: 0, y: 0 };

		if (this.animState !== 'hit' && this.canControl) {
			if (vdp.input.isDown(vdp.input.Key.Up)) { targetVelocity.y = -speed; this.direction = 1; }
			if (vdp.input.isDown(vdp.input.Key.Down)) { targetVelocity.y = +speed; this.direction = 0; }
			if (vdp.input.isDown(vdp.input.Key.Left)) { targetVelocity.x = -speed; this.direction = 3; }
			if (vdp.input.isDown(vdp.input.Key.Right)) { targetVelocity.x = +speed; this.direction = 2; }
			if (vdp.input.hasToggledDown(vdp.input.Key.A) && this.grounded) this.vz = jumpImpulse;
		}

		this.animState = 'normal';

		// TODO Florian -- refactor to vdp.input.KeyUp
		// if (vdp.input.hasToggledDown(vdp.input.Key.Up)) impulse.y = -impulseSpeed;
		// if (vdp.input.hasToggledDown(vdp.input.Key.Down)) impulse.y = impulseSpeed;
		// if (vdp.input.hasToggledDown(vdp.input.Key.Left)) impulse.x = -impulseSpeed;
		// if (vdp.input.hasToggledDown(vdp.input.Key.Right)) impulse.x = impulseSpeed;

		this.vx += (targetVelocity.x - this.vx) * 0.1;
		this.vy += (targetVelocity.y - this.vy) * 0.1;
		this.vz += GRAVITY;
		this.vx += impulse.x;
		this.vy += impulse.y;

		this.z += this.vz;
		// Do not fall under the ground
		this.z = Math.min(this.maxZ, this.z);

		// Fallen out of the map
		if (this.z >= MAX_Z) this.replaceInLevel(this, map.listRolesAt(this.x, this.y));
		if (this.grounded) this.vz = 0;

		if (!this.falling) {
			// Basic collision detection
			this.x += this.vx;
			while (map.checkCollisionAt(this.left, this.top) || map.checkCollisionAt(this.left, this.bottom)) {
				this.x++;
				//this.vx = 0;
			}
			while (map.checkCollisionAt(this.right, this.top) || map.checkCollisionAt(this.right, this.bottom)) {
				this.x--;
				//this.vx = 0;
			}

			this.y += this.vy;
			while (map.checkCollisionAt(this.left, this.top) || map.checkCollisionAt(this.right, this.top)) {
				this.y++;
				//this.vy = 0;
			}
			while (map.checkCollisionAt(this.left, this.bottom) || map.checkCollisionAt(this.right, this.bottom)) {
				this.y--;
				//this.vy = 0;
			}
		}

		// Can not go to the left
		this.left = Math.max(camera.x, this.left);

		// Special tile roles (fire)
		const roles = map.listRolesAt(this.x, this.y);
		if (roles.includes('void')) this.maxZ = MAX_Z;
		else this.maxZ = 0;
	}
}

class Fire {
	constructor() {
		this.x = 0;
	}

	update(perso) {
		this.x += 0.5;

		// Collision with character
		if (perso.left < this.x) {
			perso.takeDamage(false);
			Object.assign(perso, { vx: 10, vy: 3, vz: -10 });
		}

		// Draw
		const sprite = vdp.sprite('firewall');
		const angle = frameNo / 3;
		let scaleX = Math.cos(angle) * 10, scaleY = Math.sin(angle) * 10;
		const screenPos = camera.transform(this.x, 0);
		const x = Math.min(0, -60 + screenPos.x);
		scaleX += Math.max(0, -60 + screenPos.x);
		scaleX = Math.min(128, sprite.w + scaleX);

		// Do not draw outside of the screen since we're affecting the shadow params
		if (x + scaleX > 0) {
			vdp.configObjectTransparency({op: 'add', blendDst: '#888', blendSrc: '#fff'});
			vdp.drawObject('firewall', x, -15, {prio: 8, transparent: true, width: scaleX, height: 290 + scaleY});
			// vdp.drawObject('firewall', x + scaleX - vdp.sprite('firewall').w, -15, {prio: 4, transparent: true, height: 290 + scaleY});
		}
	}
}

class LiveObject {
	constructor(objDef) {
		this.width = parseInt(objDef.width);
		this.height = parseInt(objDef.height);
		this.x = parseInt(objDef.x);
		this.y = parseInt(objDef.y) - this.height;
		this.z = 0;
	}

	collidesWith(perso, {ignoreDepth = false, marginW = 0, marginH = 0} = {}) {
		const depth = 2;
		return perso.right + marginW >= this.left && perso.left - marginW < this.right &&
			perso.bottom + marginH >= this.top && perso.top - marginH < this.bottom &&
			(Math.abs(perso.z - this.z) < depth || ignoreDepth);
	}

	destroy() {
		const thisIndex = liveObjects.indexOf(this);
		liveObjects.splice(thisIndex, 1);
	}

	draw() {}

	get left() { return this.x; }
	get right() { return this.x + this.width; }
	get top() { return this.y; }
	get bottom() { return this.y + this.height; }
	get centerX() { return this.x + this.width / 2; }
	get centerY() { return this.y + this.height / 2; }

	objectPriority(perso) { return this.top <= perso.bottom ? (PERSO_PRIORITY - 1) : PERSO_PRIORITY; }

	update(perso) {}
}

class CrackedTile extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.explosionAnimation = 0;
	}

	draw(perso) {
		const pos = camera.transform(this.x, this.y);

		if (this.explosionAnimation < 3) {
			const animTile = Math.min(2, Math.ceil(this.explosionAnimation));
			vdp.drawObject(vdp.sprite('level1-more').tile(animTile), pos.x, pos.y, {prio: 2});
		}
		else {
			const animSpeed = 50;
			const prio = PERSO_PRIORITY - (this.top + 36 <= perso.bottom ? 1 : 0);
			const height = Math.min(192, (this.explosionAnimation - 3) * animSpeed);
			const flameTop = vdp.sprite('flame').offset(0, 0, 32, 25);
			const flameBody = vdp.sprite('flame').offset(0, 25, 32, 48 - 25);
			const flameBodyHeight = Math.max(0, height - 25);
			const width = 32 + Math.sin(this.explosionAnimation * 100) * 5;
			vdp.drawObject(flameTop, pos.x - (width - 32) / 2, pos.y + 32 - height, {prio, width, height: Math.min(25, height) });
			vdp.drawObject(flameBody, pos.x - (width - 32) / 2, pos.y + 32 - flameBodyHeight, {prio, width, height: flameBodyHeight });
		}
	}

	update(perso) {
		if (this.explosionAnimation > 0) {
			this.explosionAnimation += TIMESTEP * 8;
		}
		else if (perso.right >= this.left - 48) {
			this.explosionAnimation = TIMESTEP * 8;
		}

		if (this.explosionAnimation >= 3 && this.collidesWith(perso, {marginW: -8, marginH: -8})) {
			perso.takeDamage();
		}
	}
}

class Enemy1 extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.width = this.height = 24;
		this.followPlayer = props.followPlayer;
		this.disableFor = 0;
	}

	draw() {
		let tileNo = (frameNo / 16) % 3;
		const pos = camera.transform(this.x, this.y);
		if (this.animState !== 'blinking' || frameNo % 2) {
			vdp.drawObject(vdp.sprite('enemy1').tile(tileNo), pos.x, pos.y, {prio: 2});
		}
	}

	update(perso) {
		if (this.followPlayer && camera.isVisible(this) && this.disableFor <= 0) {
			this.x -= Math.sign(this.x - perso.x) * 0.25;
			this.y -= Math.sign(this.y - perso.y) * 0.25;
		}
		this.disableFor = Math.max(0, this.disableFor - TIMESTEP);
		if (this.collidesWith(perso, {marginW: -4, marginH: -4})) {
			if (perso.z < 0) {
				perso.stompedEnemy();
				this.update = () => {};
				coroutines.replace(this, 'anim', frame => {
					if (frame < 30) {
						this.animState = 'blinking';
						return true;
					}
					this.destroy();
					return false;
				});
			}
			else {
				perso.takeDamage();
				this.disableFor = 1;
			}
		}
	}
}

class RockPillar extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.width = this.height = 32;
		this.visiblePart = 0;
		this.fullyOutside = props.fullyOutside || 32;
		this.spawnY = this.y;
	}

	draw(perso) {
		const pos = camera.transform(this.x, this.y);
		if (this.visiblePart < this.fullyOutside) {
			pos.x += Math.random() * 3 - 1;
			pos.y += Math.random() * 3 - 1;
		}

		const top = vdp.sprite('rock-pillar').offset(0, 0, 32, Math.min(32, this.visiblePart));
		const prio = this.objectPriority(perso);
		vdp.drawObject(top, pos.x, pos.y, {prio});
		if (this.visiblePart > 32) {
			const pillar = vdp.sprite('rock-pillar').offset(0, 32, 32, this.visiblePart - 32);
			vdp.drawObject(pillar, pos.x, pos.y + 32, {prio});
		}
	}

	update(perso) {
		if (camera.isVisible(this)) {
			if (this.visiblePart < 1) this.visiblePart += 0.05;
			else this.visiblePart = Math.min(this.fullyOutside, this.visiblePart + 1);
		}

		this.y = this.spawnY - this.visiblePart + 32;
		const correspondingZ = this.visiblePart > 32 ? (96 - this.visiblePart) : 0;
		if (this.collidesWith(perso, {marginW: -8, marginH: 0, ignoreDepth: true}) && perso.z <= correspondingZ) {
			perso.notifyGroundOnObject(this);
		}
	}
}

class MineCart extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.y += 8;
		this.width = this.height = 32;
		this.takingPerso = false;
		this.direction = 'right';
		this.rideSpeed = 3;
	}

	draw(perso) {
		const pos = camera.transform(this.x, this.y);
		vdp.drawObject('cart-lateral', pos.x, pos.y, {prio: 4});
	}

	update(perso) {
		if (!this.takingPerso && this.collidesWith(perso, { marginW: 0, marginH: 32, ignoreDepth: true})) {
			this.takingPerso = true;
			perso.canControl = false;
		}

		if (this.takingPerso) {
			if (this.direction === 'right') {
				this.x += this.rideSpeed;
				if (map.listRolesAt(this.left, this.bottom).includes('godown')) this.direction = 'down';
			}
			else if (this.direction === 'down') this.y += this.rideSpeed;

			perso.x = this.x + 14;
			perso.y = this.y + 10;
		}
	}
}


class Map {
	constructor(name) {
		this.hiPlane = vdp.readMap(name + '-hi');
		this.loPlane = vdp.readMap(name + '-lo');
		this.tileWidth = vdp.sprite(name).tw;
		this.tileHeight = vdp.sprite(name).th;
		this.width = this.loPlane.width;
		this.height = this.loPlane.height;
		this.tileRoles = {};

		// Parse tile roles (['1-3;5-6', 'role1|role2', '4;7-8', 'role3', …]
		for (let i =  0; i < objectDefinitions.tileTypes.length; i += 2) {
			const intervals = objectDefinitions.tileTypes[i].split(';');
			const roles = objectDefinitions.tileTypes[i + 1].split('|');
			for (let interval of intervals) {
				let [lo, up] = interval.split('-');
				for (let j = up || lo; j >= lo; j--) {
					this.tileRoles[j] = roles;
				}
			}
		}
	}

	checkCollisionAt(x, y) {
		return this.listRolesAt(x, y).includes('wall');
	}

	listRolesAt(x, y) {
		const loTile = this.getBlockAt(this.loPlane, x, y);
		const hiTile = this.getBlockAt(this.hiPlane, x, y);
		return (this.tileRoles[loTile] || []).concat(this.tileRoles[hiTile] || []);
	}

	getBlockAt(plane, x, y) {
		return plane.getElement(x / this.tileWidth, y / this.tileHeight);
	}
}

function addObject(obj) {
	liveObjects.push(obj);
}

function animateLevel() {
	// Fire
	if (frameNo % 4 === 0) {
		const pal = vdp.readPalette('level1-objects');
		const it = (frameNo / 4) % 8;
		pal.array[1] = vdp.color.make(255, 160 + it * 16, 0);
		pal.array[2] = vdp.color.make(160 + it * 8, 0, 0);
		pal.array[3] = vdp.color.make(255, 64 + it * 8, 0);
		// Flame
		[pal.array[4], pal.array[5], pal.array[6]] = [pal.array[5], pal.array[6], pal.array[4]];
		vdp.writePalette('level1-objects', pal);
	}

	if (frameNo % 16 === 1) {
		// Replace fire bubble tile
		let tileNo = 110 + Math.max(0, Math.floor(frameNo / 16) % 6 - 2);
		let tile = vdp.readSprite(vdp.sprite('level1').tile(tileNo), vdp.CopySource.rom);
		vdp.writeSprite(vdp.sprite('level1').tile(111), tile);
	}

	if (frameNo % 8 === 2) {
		// Fire lava scroll
		const sprite = vdp.readSprite(vdp.sprite('level1').tile(108));
		for (let y = 0; y < 8; y++)
			for (let x = 0; x < 16; x++) sprite.setElement(x, y, sprite.getElement((x + 1) % 16, y));
		for (let y = 8; y < 16; y++)
			for (let x = 15; x >= 0; x--) sprite.setElement((x + 2) % 16, y, sprite.getElement(x, y));
		vdp.writeSprite(vdp.sprite('level1').tile(108), sprite);
	}
}

function drawBackgrounds(bgGradientPalettes) {
	const bgPos = camera.transform(0, 0);
	const scrollY = Math.floor(bgPos.y / 16);
	const mountainLimit = 112 + scrollY;
	const colorSwap = new vdp.LineColorArray(0, 0);
	for (let i = 0; i < 48; i++)
		colorSwap.setLine(i, bgGradientPalettes[0][Math.floor(i / 3)]);
	for (let i = 4; i < mountainLimit; i++) {
		const add = i % 4 === 2 ? 1 : 0;
		colorSwap.setLine(i + 44, bgGradientPalettes[1][Math.floor(Math.min(15, i / 4 + add))]);
	}
	for (let i = 0; i < 256 - mountainLimit; i++) {
		colorSwap.setLine(i + mountainLimit, bgGradientPalettes[2][Math.floor(Math.max(0, Math.min(15, (i - 4) / 2)))]);
	}
	vdp.configColorSwap([colorSwap]);

	const lineTransform = new vdp.LineTransformationArray();
	const vScroll = -bgPos.y;
	const transformArray = [-1, 0, 0, -1, -1, -1, 0, 0, 1, 1, 0, 0, 0, 0];
	for (let i = 0; i < lineTransform.length; i++) {
		const hScroll = transformArray[(i + frameNo + vScroll) % transformArray.length];
		lineTransform.translateLine(i, [hScroll, vScroll]);
	}

	vdp.drawBackgroundTilemap('level1-lo', { scrollX: -bgPos.x, scrollY: -bgPos.y, prio: 1, wrap: false });
	vdp.drawBackgroundTilemap('level1-hi', { scrollX: -bgPos.x, prio: 13, wrap: false, lineTransform });

	// Draw mountains
	const mountainTile = vdp.sprite('level1').tile(93).offset(0, 0, 48, 32);
	const fineScroll = (-bgPos.x / 4) % 48;
	for (let i = -fineScroll; i < 256; i += 48)
		vdp.drawObject(mountainTile, i, mountainLimit - 32, { prio: 1 });
}

function drawObjects(perso) {
	for (let i = 0; i < liveObjects.length; i++) {
		if (camera.isVisible(liveObjects[i])) liveObjects[i].draw(perso);
	}
}

function prepareBgGradient() {
	const palette1 = [], palette2 = [0], palette3 = [];
	for (let i = 0; i < 16; i++)  // Blue to red gradient
		palette1.push(vdp.color.make(i * 16, 0, 0x88 - i * 8));
	for (let i = 1; i < 16; i++) 	// Red to yellow
		palette2.push(vdp.color.make(255, i * 16, 0));
	const mountain = vdp.color.make('#d4a26e');
	for (let i = 0; i < 16; i++)	// Mountain to black
		palette3.push(vdp.color.sub(mountain, vdp.color.make(i * 16, i * 16, i * 16)));
	return [palette1, palette2, palette3];
}

function prepareObjects() {
	for (let i = 0; i < objectDefinitions.objects.length; i++) {
		const obj = objectDefinitions.objects[i];
		if (!obj['$'].gid) continue;
		const tileNo = parseInt(obj['$'].gid - objectDefinitions.firstTile);
		// The format is super weird because of the xml => json conversion, just sowith it
		const properties = {};
		if (obj.properties) obj.properties[0].property.forEach(o => properties[o['$'].name] = o['$'].value);

		if (tileNo === 2) addObject(new CrackedTile(obj['$'], properties));
		else if (tileNo === 3) addObject(new Enemy1(obj['$'], properties));
		else if (tileNo === 4) addObject(new Enemy1(obj['$'], Object.assign({ followPlayer: true }, properties)));
		else if (tileNo === 5) addObject(new RockPillar(obj['$'], properties));
		else if (tileNo === 6) addObject(new MineCart(obj['$'], properties));
		else throw new Error(`Unsupported object type ${tileNo}`);
	}
}

function shakeScreen() {
	if (frameNo % 3 === 0) {
		camera.shakeX = Math.random() * 3 - 1;
		camera.shakeY = Math.random() * 3 - 1;
	}
}

function updateObjects(perso) {
	for (let i = liveObjects.length - 1; i >= 0; i--) {
		liveObjects[i].update(perso);
	}
}

/** @type {VDP} */
let frameNo;
let camera = new Camera();
let map;
let liveObjects = [];
let coroutines = new Coroutines();

function *titleScreen() {
	const lineTransform = new vdp.LineTransformationArray();
	let cloudProgress = 0;
	let fade = 255, fadeDirection = -4, frameNo = 0;

	//const colorArray = new vdp.LineColorArray();
	//for (let i = 0; i < colorArray.length; i++) {
	//	if (i >= 160) colorArray.setAll()
	//}

	vdp.configBackdropColor('#048');

	while (fade < 256) {
		if (vdp.input.hasToggledDown(vdp.input.Key.Start) || vdp.input.hasToggledDown(vdp.input.Key.A)) {
			fadeDirection = 16;
		}
		cloudProgress++;
		fade = Math.max(0, fade + fadeDirection);

		for (let i = 0; i < vdp.screenHeight; i++) {
			const vFactor = i / (vdp.screenHeight - 1);
			const verticalScale = 1 - vFactor * 1.5;
			const horizontalScale = 1 - vFactor * 1;
			const mat = vdp.mat3.create();

			let line = (cloudProgress + (i / verticalScale)) % 320;
			if (line % 320 >= 160) line = 320 - line;

			if (i < 128) {
				vdp.mat3.translate(mat, mat, [128, 0]);
				vdp.mat3.scale(mat, mat, [ 1 / horizontalScale, 1 ]);
				vdp.mat3.translate(mat, mat, [-128, line - i]);
			} else {
				vdp.mat3.translate(mat, mat, [0, 161 - i]);
			}
			lineTransform.setLine(i, mat);
		}

		const offsetY = Math.sin(frameNo / 30) * 5;
		frameNo++;

		vdp.configFade({color: '#008', factor: fade});
		vdp.drawBackgroundTilemap('title-screen', {wrap: true, lineTransform});
		vdp.drawBackgroundTilemap('title-barque', { scrollY: offsetY });
		vdp.drawObject(vdp.sprite('perso').tile(1), 154, 130 - offsetY, {width: 48, height: 48});
		yield;
	}
}


export function *main() {
	yield *logo(vdp);
	yield *titleScreen();

	const fireLimitPos = 960;
	let fadeOut = 255;
	const perso = new Perso(100, 128);
	//const perso = new Perso(1200, 600);
	//const perso = new Perso(2460, 50);
	const fire = new Fire();
	let subscene = 0;

	map = new Map('level1');
	frameNo = 0;

	const bgGradientPalettes = prepareBgGradient();
	prepareObjects();

	while (fadeOut < 256) {
		// Default config, may be overriden
		vdp.configObjectTransparency({ op: 'add', blendDst: '#888', blendSrc: '#fff'});

		perso.update();
		camera.update(perso);
		updateObjects(perso);
		animateLevel();
		// Coroutines take precedence on previous handlers (including objects)
		coroutines.updateAll();

		if (subscene === 0) {
			fadeOut = Math.max(0, fadeOut - 16);
			shakeScreen();
			// Make the fire continously approach
			if (fire.x - camera.x < -0) fire.x = camera.x - 0;
			if (perso.x >= fireLimitPos) {
				subscene = 1;
			}
		}
		else if (subscene === 1) {
			// Close the view
			camera.minimumX = Math.min(fireLimitPos, camera.x + 1);
			fire.x = Math.min(fire.x + 4, fireLimitPos - 35);
			if (camera.x < fireLimitPos) shakeScreen();

			if (perso.x >= 2600 && perso.y >= 800) {
				subscene = 2;
			}
		}
		else if (subscene === 2) {
			fadeOut += 16;
		}

		vdp.configFade({color: '#008', factor: fadeOut});
		drawBackgrounds(bgGradientPalettes);
		perso.draw();
		drawObjects(perso);

		fire.update(perso);

		frameNo++;
		yield;
	}


}
