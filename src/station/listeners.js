const { delay, getDistanceRssi, log } = require("../middleware/utils");
const { bandRef } = require("./firebase");
const { updateBand } = require("./runner");

function setShortListeners(band, interval) {
    return setInterval(
    async () => {
        await updateShort(band, ["time", "rssi"]);
    }, interval);
}

function setMediumListeners(band, interval, params) {
    return setInterval(
    () => {
        updateMedium(band, params);
    }, interval);
}

function setLongListeners(band, interval) {
    return setInterval(
    () => {
        updateLong(band, []);
    }, interval);
}

function updateShort(bandy) {
    let band = bandy.compiled;
    let updater = {};
    updater.stats = {};
    band.getTime()
    .then(time => {
        updater.local_time = time;
    })
    .catch(e => {
        console.debug("error:", e);
    });

    // updater.stats.distance_rssi = getDistanceRssi(bandy.adData.rssi);
    // updater.stats.distance_rssi = band.
    console.log(updater);
}

async function updateMedium(bandy, params) {
    // Params not integrated.
    let band = bandy.compiled;
    let updater = {};
    updater.stats = {};
    updater.data = {};

    let [battery, ped] = await Promise.all([band.getBatteryInfo(), band.getPedometerStats()]);

    updater.stats.battery = {};
    updater.stats.battery.charging = battery.charging;
    updater.stats.battery.current_level = battery.level;
    updater.stats.battery.off_date = battery.off_date;
    updater.stats.battery.last_charge_date = battery.charge_date;
    updater.stats.battery.last_charge_level = battery.charge_level;

    updater.data.distance_travelled = ped.distance;
    updater.data.heart_rate = ped.heart_rate ? ped.heart_rate : 0;
    updater.data.calories_burned = ped.calories;
    updater.data.steps = ped.steps;

    await updateBand(updater);
    log("Updated, medium.");
}

function updateLong(bandy) {
    let band = bandy.compiled;
    // band.getPedometerStats()
    // .then(steps => {
    //     console.log("Pedometer:", steps);
    // })
    // .catch(e => {
    //     console.debug("error:", e);
    // });
    // console.log(updater);
}

async function getBasicInfo(bandy) {
    let band = bandy.compiled;
    let data = {};
    data.battery = await band.getBatteryInfo();

    data.time = await band.getTime();
    data.hw_version = await band.getHwRevision();
    data.sw_version = await band.getSwRevision();
    data.serial = await band.getSerial();

    data.ped = await band.getPedometerStats();

    data.distance_rssi = getDistanceRssi(bandy.adData.rssi);

    if (band.model !== "hrx") {
        miband.on('heart_rate', (rate) => {
			data.heart_rate = rate;
		});
        await miband.hrmStart();
		await delay(30000);
		await miband.hrmStop();
    }

    return data;
}


module.exports = {
    setShortListeners,
    setMediumListeners,
    setLongListeners,
    getBasicInfo
};