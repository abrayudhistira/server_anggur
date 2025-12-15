const mqtt = require('mqtt');
const EventEmitter = require('events');


class MqttClient extends EventEmitter {
constructor({ url, options = {}, subscriptions = [] } = {}) {
super();
this.url = url || process.env.MQTT_URL || 'mqtt://localhost:1883';
this.options = options;
this.subscriptions = subscriptions; // array of { topic, opts }
this.client = null;
this.connected = false;
}


start() {
if (this.client) return;
this.client = mqtt.connect(this.url, this.options);


this.client.on('connect', () => {
this.connected = true;
this.emit('connect');
// (re)subscribe
this.subscriptions.forEach(s => {
try {
this.client.subscribe(s.topic, s.opts || { qos: 1 }, (err) => {
if (err) this.emit('error', err);
});
} catch (e) {
this.emit('error', e);
}
});
});


this.client.on('reconnect', () => this.emit('reconnect'));
this.client.on('close', () => { this.connected = false; this.emit('close'); });
this.client.on('offline', () => this.emit('offline'));


this.client.on('error', (err) => this.emit('error', err));


this.client.on('message', (topic, msg, packet) => {
// Buffer -> string
const payload = msg && msg.length ? msg.toString() : null;
this.emit('message', { topic, payload, packet });
});
}


subscribe(topic, opts = { qos: 1 }) {
if (!this.client) this.subscriptions.push({ topic, opts });
else this.client.subscribe(topic, opts, (err) => { if (err) this.emit('error', err); });
}


publish(topic, payload, opts = { qos: 1, retain: false }) {
if (!this.client) throw new Error('MQTT client not started');
const message = (typeof payload === 'string') ? payload : JSON.stringify(payload);
this.client.publish(topic, message, opts, (err) => { if (err) this.emit('error', err); });
}


stop() {
if (this.client) {
try { this.client.end(true); } catch (e) { /* ignore */ }
this.client = null;
}
}
}


module.exports = MqttClient;