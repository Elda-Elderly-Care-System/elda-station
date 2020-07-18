'use strict';

global.TextDecoder = require('util').TextDecoder;

const bluetooth = require('webbluetooth').bluetooth;
const MiBand = require('../station/miband-hrx');
const tests = require('../middleware/tests');

require('../station/firebase');

const { userRef } = require('../station/firebase');

const log = console.log;

const scan = async function () {
	let filters = MiBand.advertisementService().map(uuid => {
		return {
			services: [uuid]
		}
	});

	try {
		log('Requesting Bluetooth Device...');
		const device = await bluetooth.requestDevice({
			filters,
			optionalServices: MiBand.optionalServices("hrx")
		});

		device.addEventListener('gattserverdisconnected', () => {
			log('Device disconnected');
			return;
		});

		log('Connecting to ' + device.name + '...');
		const server = await device.gatt.connect();
		log('Connected');

		let miband = new MiBand(server);

		await miband.init();

		await tests(miband, userRef);

	} catch (error) {
		log('Argh!', error);
		if (error === 'requestDevice error: no devices found') {
			console.info('Trying again in 3 seconds...');
			setTimeout(scan, 3000);
		}
	}
}

scan();