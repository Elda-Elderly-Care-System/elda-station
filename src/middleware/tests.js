const { log, delay } = require("./utils");

const tests = async function (miband, userRef) {

	let info = {
		time: await miband.getTime(),
		battery: await miband.getBatteryInfo(),
		hw_ver: await miband.getHwRevision(),
		sw_ver: await miband.getSwRevision(),
		serial: await miband.getSerial(),
	};

	log(`HW ver: ${info.hw_ver}  SW ver: ${info.sw_ver}`);
	info.serial && log(`Serial: ${info.serial}`);
	log(info.battery);
	log(`Time: ${info.time.toLocaleString()}`);

	let ped = await miband.getPedometerStats();
	log('Pedometer:', JSON.stringify(ped));

	if (userRef) {
		userRef.child('admin').update(info)
		.then(() => {
			log("Updated.");
		})
		.catch(e => {
			log("error:", e);
		});

		userRef.child('admin/medical').update(ped)
		.then(() => {
			log("Updated.");
			// ref.child('admin').once("value", function(snapshot) {
			// 	console.log(snapshot.val());
			// });
		})
		.catch(e => {
			log("error:", e);
		});
	}

	log('Notifications demo...');
	await miband.showNotification('message');
	await delay(3000);
	await miband.showNotification('phone');
	await delay(5000);
	await miband.showNotification('off');

	miband.on('button', () => log('Tap detected'));

	try {
		await miband.waitButton(10000);
	}
	catch (e) {
		log('Okay, nevermind.');
	}

	if (miband.model !== "hrx") {
		log('Heart Rate Monitor (single-shot)');
		log('Result:', await miband.hrmRead());

		log('Heart Rate Monitor (continuous for 30 sec)...');
		miband.on('heart_rate', (rate) => {
			log('Heart Rate:', rate);
		});
		await miband.hrmStart();
		await delay(30000);
		await miband.hrmStop();
	}

	return log('Finished.');
};


module.exports = tests;