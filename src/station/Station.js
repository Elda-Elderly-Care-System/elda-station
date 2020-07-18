/* NPM Imports */
const { Bluetooth, BluetoothDevice, bluetooth } = require('webbluetooth');

/* Local Imports */
const MiBand = require('./miband-hrx');
const tests = require('../middleware/tests');
const { ifExistsReturn } = require('../middleware/utils');
const { 
    setShortListeners, setLongListeners, 
    setMediumListeners, getBasicInfo } = require('./listeners');
const utils = require('../middleware/utils');
const { updateInitial, fireAlertToBase } = require('./runner');

/* Constants */
const log = console.log;
const DEFAULT_BAND_MODEL = "hrx";
/**
 * Stores station objects. These can be used to start, 
 * terminate or modify a station.
 * @class Station
 */
class Station {
    /**
    * Creates an instance of Station.
    * @param {object} props Custom properties for station (optional)
    * @param {object} settings Settings for the station (optional)
    * @param {BluetoothDevice} device Prediscovered bluetooth device (optional)
    * @param {FirebaseDBRef} ref Reference to a firebase database path (optional)
    * @memberof Station
    */
    constructor(props, settings, device, ref) {
        // Start timer implementation to terminate station after timer seconds.
        this.band = {};
        this.band.model = ifExistsReturn(props, 'model') || DEFAULT_BAND_MODEL;

        this.settings = {};
            this.settings.name = 
                ifExistsReturn(settings, 'name') 
                || "Development Station";
            this.settings.description = 
                ifExistsReturn(settings, 'description') 
                || "Development station for Elda v2.";

        this.settings.user = process.env.USER || "guest";
        this.settings.desktop_session = process.env.DESKTOP_SESSION || "unknown";

        if (device) {
            this.band.raw = device; // we can probably make this a devices array.
        } else {
            log(`Starting Elda station for ${this.settings.user}.`);
            log("You can run station.find() or station.listen() about now.");
            // log(this);
        }

        if (ref) {
            this.ref = ref;
        }
    }

    async setup() {
        let devs = await fetchDevices();

        if (devs) {
            let initial = 5,
                turn    = 1;
            let not_registered = setInterval(async function() {
                let list = await fetchDevices();
                if (list) {
                    devs = list;
                    clearInterval(not_registered);
                    return;
                }
                turn += 1;
            }, (initial * (turn * 2)) * 1000);
        }

        if (!this.settings.tracking) this.settings.tracking = devs;
    }

    /**
     * Finds a band based on requested or default parameters.
     *
     * @param {object} options Filters for searching a device (optional)
     * @param {object} postFind Options for actions that must occur once 
     * the requested device is discovered (optional)
     * @returns Same instance on which this method was invoked
     * @memberof Station
     */
    async find(options, postFind) {
        // Filters defaults to MiBand.advertisementService
        // OptionalServices defaults to MiBand.optionalServices
        // mac defaults to null. Not yet supported on webbluetooth api.
        // Keep a check on this issue: 
        // https://github.com/WebBluetoothCG/web-bluetooth/issues/417

        let filters = options && options.filters ? 
        options.filters : MiBand.advertisementService().map(uuid => {
            return {
                services: [uuid]
            }
        });

        let optionalServices = ifExistsReturn(options, 'optionalServices') 
        || MiBand.optionalServices(this.band.model);

        log('Finding requested device.');
        try {
            let device = await bluetooth.requestDevice({
                filters,
                optionalServices: optionalServices
            });

            device.addEventListener('gattserverdisconnected', () => {
                log('Device disconnected');
                return;
            });

            this.registerDevice(device);

            log(`Device: ${this.band.raw.name} | ${this.band.raw.id} found.`);
    
            if (postFind && postFind.connectImmediately == true) {
                await this.connect(this.band.raw);
            }

            this.band.adData = device.adData;

            return this;
        } catch (error) {
            if (error === "Error: requestDevice error: no devices found" || true) {
                log("Trying again in 3 seconds.");
                setTimeout(async () => {
                    await this.find(...arguments);
                }, 3000);
            }
            else throw Error (error);
        }
    }
    /**
     * Connects to the device that was previously requested and found.
     * Optionally, you can also connect to a device that was not found previously
     * by supplying BluetoothDevice object as the only pparameter.
     *
     * @param {BluetoothDevice} dev (optional)
     * @returns Same instance on which this method was invoked
     * @memberof Station
     */
    async connect(dev) {
        let device = dev || this.band.raw;

        if (!device) {
            log("No devices provided or registered.");
            return this;
        }

        if (device.gatt.connected) {
            log(`Already connected to ${device.name}.`);
            return this;
        }

        device.addEventListener('gattserverdisconnected', () => {
            log('Device disconnected.');
            console.info('Trying again in 3 seconds...');
            setTimeout(this.find, 3000);
            return this;
        });

        log('Connecting to ' + device.name + '.');
        let devi = await device.gatt.connect();
        this.registerDevice(devi);
        log('Connected.');

        return this;
    }
    /**
     * Starts listening for changes and starts logging them to the console
     * and Firebase.
     *
     * @param {object} options Custom settings for listening (optional)
     * @returns Same instance on which this method was invoked
     * @memberof Station
     */
    async listen(options) {
        if (!this.band.raw) {
            return log(`Connect to a device first!`);
        }
        if (ifExistsReturn(options, 'delay')) {
            await utils.delay(delay);
        }

        this.band.compiled = new MiBand(this.band.raw, this.band.model || DEFAULT_BAND_MODEL);
        await this.band.compiled.init();

        this.band.compiled.on('button', this.handleTaps);

        if (this.band.model !== DEFAULT_BAND_MODEL) {
            this.band.compiled.on('heart_rate', (rate) => {
                log('Heart Rate:', rate);
            });
            await this.band.compiled.hrmStart();
        }

        await updateInitial(await getBasicInfo(this.band));

        this.listeners = {};
        // this.listeners.shortInterval = setShortListeners(this.band, 5000);
        this.listeners.mediumInterval = setMediumListeners(this.band, 45000, ["pedometer", "battery"]);
        // this.listeners.longInterval = setLongListeners(this.band, 300000);
    }

    async test(dev) {
        let device = dev || this.band.compiled;

        if (!device) {
            return log("No devices provided or registered.");
        }

        await tests(device);
    }

    handleTaps = () => {
        this.band.taps += 1;
        process.stdout.write(`${this.band.taps} `);
        let trigger = () => {
            if (this.band.taps >= 8) {
                // console.log(
                // `Trigger set for device: ${this.band.raw.id} | taps: ${this.band.taps}.`);
                this.band.taps = 0;
                fireAlertToBase();
            }
            else {
                this.band.taps = 0;
            }
        }

        if (this.band.taps >= 1) {
            if (this.band.taps >= 8) {
                trigger();
                clearTimeout(this.band.timer);
            }
            if (!this.band.timer) {
                this.band.timer = setTimeout(trigger, (8 - this.band.taps) * 500);
            }
        }
    }

    registerDevice(device) {
        this.band.raw = device;
        this.band.taps = 0;
    }

    kill() {
        let intervals = ["shortInterval", "mediumInterval", "longInterval"];
        intervals.forEach(inter => {
            if (ifExistsReturn(this.listeners, inter)) {
                clearInterval(this.listeners[inter]);
            }
        });
        process.exit();
    }
}

module.exports = Station;