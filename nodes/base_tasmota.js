'use strict';


const TASMOTA_DEFAULTS = {
    // basic
    broker: '',  // mandatory
    device: '',  // mandatory
    name: '',
    // advanced
    topicMode: 0,
    cmndPrefix: 'cmnd',
    statPrefix: 'stat',
    telePrefix: 'tele',
};


const LWT_ONLINE = 'Online';
const LWT_OFFLINE = 'Offline';


class BaseTasmotaNode {
    constructor(config, RED, more_defaults = {}) {
        // Create the Red node
        RED.nodes.createNode(this, config);

        // Internals
        this._subscribedTopics = [];
        this._brokerConnection = null;

        // LastWillTopic status of the device
        this.statusLWT = LWT_OFFLINE;

        // Merge base and child defaults
        var defaults = Object.assign({}, TASMOTA_DEFAULTS, more_defaults);

        // Merge user and default config
        this.config = {};
        for (const key in defaults) {
            this.config[key] = config[key] || defaults[key];
        }

        // Establish MQTT broker connection
        this._brokerConnection = RED.nodes.getNode(this.config.broker);
        if (!this._brokerConnection) {
            this.setNodeStatus('red', 'No broker connection', 'dot')
            this.error(`Cannot connect to broker: ${this.config.broker}`);
            return;
        }
        this._brokerConnection.register(this);
        this.setNodeStatus('yellow', 'connecting...', 'ring')

        // Subscribe to device availability changes  tele/<device>/LWT
        this.MQTTSubscribe('tele', 'LWT', (topic, payload) => {
            this.statusLWT = payload.toString();
            if (this.statusLWT === LWT_ONLINE) {
                this.setNodeStatus('green', this.statusLWT, 'ring')
                this.onDeviceOnline()
            } else {
                this.setNodeStatus('red', this.statusLWT, 'ring')
                this.onDeviceOffline()
            }
        });

        this.on('input', msg => {
            this.onNodeInput(msg)
        })

        // Remove all connections when node is deleted or restarted
        this.on('close', done => {
            // unsubscribe from all registered topics
            for (let fullTopic of this._subscribedTopics) {
                this._brokerConnection.unsubscribe(fullTopic, this.id);
            }
            // close the broker connection
            this._brokerConnection.deregister(this, done);
        });

    }

    onDeviceOnline() {
        // Subclasses can override to know when the LWT is Online
    }

    onDeviceOffline() {
        // Subclasses can override to know when the LWT is Online
    }

    onNodeInput(msg) {
        // Subclasses can override to receive input messagges from NodeRed
    }

    setNodeStatus(fill, text, shape) {
        if (this.statusLWT === LWT_ONLINE) {
            this.status({fill: fill, shape: shape, text: text})
        } else {
            this.status({fill: 'red', shape: 'ring', text: this.statusLWT});
        }
    }

    buildFullTopic(prefix, command) {
        if (this.config.topicMode == 1) { //Custom (%topic%/%prefix%/)
            if (prefix == 'tele')
                return `${this.config.device}/${this.config.telePrefix}/${command}`;
            else if (prefix == 'cmnd')
                return `${this.config.device}/${this.config.cmndPrefix}/${command}`;
            else if (prefix == 'stat')
                return `${this.config.device}/${this.config.statPrefix}/${command}`;
        } else {
            if (prefix == 'tele')
                return `${this.config.telePrefix}/${this.config.device}/${command}`;
            else if (prefix == 'cmnd')
                return `${this.config.cmndPrefix}/${this.config.device}/${command}`;
            else if (prefix == 'stat')
                return `${this.config.statPrefix}/${this.config.device}/${command}`;
        }
    }

    MQTTPublish(prefix, command, payload) {
        var fullTopic = this.buildFullTopic(prefix, command);
        this._brokerConnection.client.publish(fullTopic, payload);
        // TODO , publish(topic, pl, {qos: 0, retain: false})
    }

    MQTTSubscribe(prefix, command, callback) {
        var fullTopic = this.buildFullTopic(prefix, command);
        this._brokerConnection.subscribe(fullTopic, 2, callback, this.id);
        this._subscribedTopics.push(fullTopic);
    }
}

module.exports = BaseTasmotaNode;
