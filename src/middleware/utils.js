const delay = function(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
};

const log = console.log;

const ifExistsReturn = function(parent, child) {
	if (!parent || !child) {
		return null;
	}
	if (parent && parent[child]) {
		return parent[child];
	} else {
		return null;
	}
}

const getDistanceRssi = function(rssi) {
	return Math.pow(10, (-69-(rssi))/35);
}

module.exports = {
	delay,
	ifExistsReturn,
	log,
	getDistanceRssi
}