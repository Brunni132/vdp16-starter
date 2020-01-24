export class Coroutines {
	constructor() {
		this.coroutines = [];
	}

	//add(object, groupName, generatorOrFn, onFinished = null) {
	//	this.coroutines.push({
	//		groupName, object, generator: generator.bind(object)(), onFinished
	//	});
	//}
	//
	//replaceGenerator(object, groupName, generator, onFinished = null) {
	//	this.stopGroup(object, groupName);
	//	this.addGenerator(object, groupName, generator, onFinished);
	//}

	add(object, groupName, updateFn, onFinished = null) {
		this.coroutines.push({
			groupName, object, updateFn: updateFn, onFinished, frameNo: 0
		});
	}

	isRunning(object, groupName) {
		for (let i = 0; i < this.coroutines.length; i++) {
			if (this.coroutines[i].object === object && this.coroutines[i].groupName === groupName) {
				return true;
			}
		}
		return false;
	}

	replace(object, groupName, updateFn, onFinished = null) {
		this.stopGroup(object, groupName);
		this.add(object, groupName, updateFn, onFinished);
	}

	stopGroup(object, groupName) {
		for (let i = 0; i < this.coroutines.length; i++) {
			if (this.coroutines[i].object === object && this.coroutines[i].groupName === groupName) {
				if (this.coroutines[i].onFinished) this.coroutines[i].onFinished();
				this.coroutines.splice(i, 1);
				i--;
			}
		}
	}

	updateAll() {
		for (let i = 0; i < this.coroutines.length; i++) {
			let done;

			if (this.coroutines[i].updateFn) done = !this.coroutines[i].updateFn(this.coroutines[i].frameNo++);
			else done = this.coroutines[i].generator.next().done;

			if (done) {
				if (this.coroutines[i].onFinished) this.coroutines[i].onFinished();
				this.coroutines.splice(i, 1);
				i--;
			}
		}
	}
}
