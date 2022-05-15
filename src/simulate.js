require('dotenv').config();
const axios = require('axios');

const deviceUniqueId = process.env.DEVICE_UNIQUE_ID;
const server = process.env.SERVER_ADDRESS;
const iterations = 20;
const deviceSpeed = 40;
const driverId = process.env.DRIVER_ID;
const intervalInSecsBetweenTracking = 20;
let step = 0.001;

if (!deviceUniqueId) throw new Error('Set DEVICE_UNIQUE_ID in .env');
if (!server) throw new Error('Set SERVER_ADDRESS in .env');
if (!driverId) throw new Error('Set DRIVER_ID in .env');

const waypoints = [
  [-23.554292, -46.594057],
  [-23.55473, -46.593038],
  [-23.555208, -46.592074],
  [-23.556133, -46.590833],
  [-23.556588, -46.590235],
  [-23.55716, -46.588881],
  [-23.557697, -46.589165],
];

let points = [];

waypoints.forEach((waypoint, index) => {
  const [lat1, lon1] = waypoint;
  const [lat2, lon2] = waypoints[(index + 1) % waypoints.length];
  const length = Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);
  const count = parseInt(Math.ceil(length / step));
  for (let i = 0; i < count; i++) {
    const lat = lat1 + ((lat2 - lat1) * i) / count;
    const lon = lon1 + ((lon2 - lon1) * i) / count;
    points.push([lat, lon]);
  }
});

function course(lat1, lon1, lat2, lon2) {
  const latitude1 = (lat1 * Math.PI) / 180;
  const longitude1 = (lon1 * Math.PI) / 180;
  const latitude2 = (lat2 * Math.PI) / 180;
  const longitude2 = (lon2 * Math.PI) / 180;
  const y = Math.sin(longitude2 - longitude1) * Math.cos(latitude2);
  const x =
    Math.cos(latitude1) * Math.sin(latitude2) -
    Math.sin(latitude1) *
      Math.cos(latitude2) *
      Math.cos(longitude2 - longitude1);
  return ((Math.atan2(y, x) % (2 * Math.PI)) * 180) / Math.PI;
}

async function send(
  lat,
  lon,
  course,
  speed,
  alarm,
  ignition,
  accuracy,
  rpm,
  fuel,
  driverUniqueId
) {
  const params = {
    id: deviceUniqueId,
    timestamp: new Date().getTime(),
    lat,
    lon,
    bearing: course,
    speed,
  };
  if (alarm) params['alarm'] = 'sos';
  if (ignition) params['ignition'] = true;
  if (accuracy) params['accuracy'] = accuracy;
  if (rpm) params['rpm'] = rpm;
  if (fuel) params['fuel'] = fuel;
  if (driverUniqueId) params['driverUniqueId'] = driverUniqueId;
  const queryStringData = new URLSearchParams(params);
  const url = `http://${server}:5055/?${queryStringData.toString()}`;
  const options = {
    headers: {
      'content-Type': 'application/x-www-form-urlencoded',
      Connection: 'keep-alive',
    },
    timeout: 5000,
  };
  // console.log(url, options);
  await axios.get(url, options);
}

const calculatedParameters = [];

for (let index = 0; index < iterations; index++) {
  const [lat1, lon1] = points[index % points.length];
  const [lat2, lon2] = points[(index + 1) % points.length];
  const parameters = {
    lat: lat1,
    lon: lon1,
    speed: index % points.length != 0 ? deviceSpeed : 0,
    alarm: index % 10 == 0,
    ignition: index % points.length != 0,
    accuracy: index % 10 == 0 ? 100 : 0,
    rpm: Math.floor(Math.random() * 4000) + 500,
    fuel: Math.floor(Math.random() * 80) + 0,
    driverUniqueId: index % points.length == 0 ? driverId : false,
    calculatedCourse: course(lat1, lon1, lat2, lon2),
  };
  calculatedParameters.push(parameters);
}

calculatedParameters.forEach(async (parameter, index) => {
  const {
    lat,
    lon,
    calculatedCourse,
    speed,
    alarm,
    ignition,
    accuracy,
    rpm,
    fuel,
    driverUniqueId,
  } = parameter;
  setTimeout(async () => {
    console.log(
      `Tracking ${
        index + 1
      } of ${iterations}: \nPosition lat ${lat} - lng: ${lon}`
    );
    await send(
      lat,
      lon,
      calculatedCourse,
      speed,
      alarm,
      ignition,
      accuracy,
      rpm,
      fuel,
      driverUniqueId
    );
  }, index * intervalInSecsBetweenTracking * 1000);
});
