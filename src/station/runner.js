let  { bandRef, statRef, userRef } = require('./firebase');
let hrx = bandRef.doc('admin-hrx');

const updateInitial = async (data) => {
    let updater = structureData(data);
    await hrx.update(updater);
    // console.log(result);
}

const structureData = function (data) {
    let updater = {};

    patient = "sample-ptint";

    updater.data = {};
    updater.data.distance_travelled = data.ped.distance;
    updater.data.heart_rate = data.ped.heart_rate ? data.ped.heart_rate : 0;
    updater.data.calories_burned = data.ped.calories;
    updater.data.steps = data.ped.steps;

    updater.stats = {};

    updater.stats.battery = {};
    updater.stats.battery.charging = data.battery.charging;
    updater.stats.battery.current_level = data.battery.level;
    updater.stats.battery.off_date = data.battery.off_date;
    updater.stats.battery.last_charge_date = data.battery.charge_date;
    updater.stats.battery.last_charge_level = data.battery.charge_level;

    updater.stats.local_time = data.time;
    updater.stats.sw_version = data.sw_version;
    updater.stats.hw_version = data.hw_version;
    updater.stats.serial_no = data.serial;
    updater.stats.distance_rssi = data.distance_rssi;

    return updater;
}

async function updateBand(updater) {
    await hrx.update(updater);
}

async function fetchDevices() {
    let token = process.env.STATION_KEY;
    station = await statRef.doc(token).get();
    return station.bands;
}

const fireAlertToBase = () => {
    log("Starting emergency activities.");
    userRef.child('admin').update({
        "emergency": 1
    })
    .then(() => log("Emergency trigger activated."))
    .catch((e) => log("Trigger was not activate because of an error:", e));
}

const changeProperty = (prop, value) => {
    userRef.child('admin').update({
        [prop]: value
    })
    .then(() => log(`${prop} updated.`))
    .catch((e) => log("Update did ot occur because of an error:", e));
}

module.exports = {
    updateInitial,
    updateBand,
    fetchDevices,
    fireAlertToBase,
    changeProperty
}