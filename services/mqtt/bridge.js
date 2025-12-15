const path = require('path');
const MqttClient = require('./client');


class MqttBridge {
constructor({ url, options = {}, topics = [ 'company/+/device/+/telemetry', 'company/+/device/+/event' ] } = {}) {
this.client = new MqttClient({ url, options, subscriptions: topics.map(t => ({ topic: t, opts: { qos: 1 } })) });
this.client.on('message', this._onMessage.bind(this));
this.client.on('error', (err) => console.error('[mqtt] error', err));
this.client.on('connect', () => console.log('[mqtt] connected to', url));
}


start() { this.client.start(); }
stop() { this.client.stop(); }


async _onMessage({ topic, payload, packet }) {
// Try to parse JSON, fallback to raw string
let parsed = null;
try { parsed = payload ? JSON.parse(payload) : null; } catch (e) {
// not JSON
parsed = { _raw: payload };
}


// Standardize basic metadata
const msg = {
topic,
payload: parsed,
qos: packet && packet.qos,
retain: packet && packet.retain,
ts: Date.now()
};


// Attempt to save to DB if Telemetry model exists
try {
// try to load models from project root
// Adjust the require path if your models export is different
const models = require(path.join(process.cwd(), 'models'));
if (models && models.Telemetry && typeof models.Telemetry.create === 'function') {
// try to map fields; adjust according to your model
const deviceId = (msg.payload && (msg.payload.deviceId || msg.payload.device_id)) || extractDeviceIdFromTopic(topic);


const record = {
deviceId,
topic: topic,
payload: JSON.stringify(msg.payload),
qos: msg.qos,
retain: msg.retain,
ts: new Date(msg.ts)
};


// Non-blocking write
models.Telemetry.create(record).catch(err => console.error('[mqtt] failed to persist telemetry', err));
return; // done
}
} catch (e) {
// models not available, continue to emit event
}


// If no direct DB model found, emit an event so app.js or other service can handle
this.client.emit('telemetry', msg);
}
}


function extractDeviceIdFromTopic(topic) {
// naive extractor using expected pattern: company/{org}/device/{deviceId}/...
const parts = topic.split('/');
const deviceIndex = parts.findIndex(p => p === 'device');
if (deviceIndex >= 0 && parts.length > deviceIndex + 1) return parts[deviceIndex + 1];
return null;
}


module.exports = MqttBridge;