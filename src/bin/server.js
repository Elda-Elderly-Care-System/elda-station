const Station = require('../station/Station');
require('../station/firebase');

const station = new Station();

station.find(null)
.then(stat => stat.connect())
.then(stat => stat.listen())
.catch(e => {
    console.log(e);
});