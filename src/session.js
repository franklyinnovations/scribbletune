'use strict';

const Tone = require('tone');
const utils = require('./utils');
const loop = require('./loop');

const getNextPos = () => {
	var arr = Tone.Transport.position.split(':');
	// If we are still around 0:0:0x, then set start position to 0
	if (arr[0] === '0' && arr[1] === '0') {
		return 0;
	}
	// Else set it to the next bar
	return (+arr[0] + 1) + ':0:0';
};

class Channel {
	constructor(params) {
		this.idx = params.idx,
		this._activePatternIdx = -1;
		this._clips = [];
		if (params.sound) {
			this.player = new Tone.Player(params.sound).toMaster();
		}
		if (params.synth) {
			this.instrument = new Tone[params.synth]().toMaster();
		}
		params.loops.forEach(this.addLoop, this);
	}

	get clips() {
		return this._clips;
	}

	startClip(idx) {
		// Stop any other currently running clip
		if (this._activePatternIdx > -1 && this._activePatternIdx !== idx) {
			this.stopClip(this._activePatternIdx);
		}

		if (this._clips[idx] && this._clips[idx].state !== 'started') {
			this._activePatternIdx = idx;
			let when = getNextPos();
			this._clips[idx].start(when);
		}
	}

	stopClip(idx) {
		this._clips[idx].stop(getNextPos());
	}

	addLoop(loopParams, idx) {
		idx = idx || this._clips.length;
		if (loopParams.pattern) {
			this._clips[idx] = loop(Object.assign({
				player: this.player, // will be ignored if undefined
				instrument: this.instrument // will be ignored if undefined
			}, loopParams));
		} else {
			// Allow creation of empty clips
			this._clips[idx] = null;
		}
	}

	get activeClipIdx() {
		return this._activePatternIdx;
	}
}

class Session {
	constructor(arr) {
		arr = arr || [];
		this._channels = arr.map((ch, i) => {
			ch.idx = ch.idx || i;
			return new Channel(ch);
		});
	}

	createChannel(ch) {
		ch.idx = ch.idx || this._channels.length;
		this._channels.push(new Channel(ch));
	}

	get channels() {
		return this._channels;
	}

	start() {
		Tone.Transport.start();
	}

	stop() {
		Tone.Transport.stop();
	}

	// Start the clips at a specific index in all the channels
	startRow(idx) {
		this._channels.forEach(ch => {
			ch.startClip(idx);
		});
	}
}

// Export method that allows creation of a session with channels
// Either channels can be added upfront as an array as the `channels` param
// Or can be later added with session.createChannel method
module.exports = channels => {
	return new Session(channels);
}