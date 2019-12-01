'use strict';

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
          if (isObject(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return deepMerge(target, ...sources);
}


const COMMON_DEFAULT_OPTIONS = {
    config: {
        // basic
        broker: '',  // mandatory
        device: '',  // mandatory
        name: '',
        // advanced
        topicMode: 0,
        cmndPrefix: 'cmnd',
        statPrefix: 'stat',
        telePrefix: 'tele',
    },
    input: {
        topic: {
            messageProp: 'topic'
        },
        payload: {
            messageProp: 'payload'
        }
    }
};

class BaseTasmotaNode {
    constructor(nodeDefinition, RED, options = {}) {
        // Create the Red node
        RED.nodes.createNode(this, nodeDefinition);

        // Internals
        this._subscribedTopics = [];

        // LastWillTopic status of the device
        this.statusLWT = 'Offline';

        // Merge base and child default options
        this.options = deepMerge({}, COMMON_DEFAULT_OPTIONS, options);

        // Merge user and default config
        this.config = {};
        for (const key in this.options.config) {
            this.config[key] = nodeDefinition[key] || this.options.config[key];
        }

        // Establish MQTT broker connection
        this.brokerConnection = RED.nodes.getNode(this.config.broker);
        if (!this.brokerConnection) {
            this.status({fill: 'red', shape: 'dot', text: 'No broker connection'});
            this.error(`Cannot connect to broker: ${this.config.broker}`);
            return;
        }
        this.brokerConnection.register(this);
        this.status({fill: 'yellow', shape: 'ring', text: 'connecting...'});

        // Subscribe to device availability changes  tele/<device>/LWT
        this.MQTTSubscribe('tele', 'LWT', (topic, payload) => {
            this.statusLWT = payload.toString();
            if (this.statusLWT === 'Online') {
                this.setNodeStatus('green', this.statusLWT, 'ring')
            } else {
                this.setNodeStatus('red', this.statusLWT, 'ring')
            }
        });

        this.on('input', msg => {
            this.onNodeInput(msg)
        })

        // Remove all connections when node is deleted or restarted
        this.on('close', done => {
            // unsubscribe from all registered topics
            for (let fullTopic of this._subscribedTopics) {
                this.brokerConnection.unsubscribe(fullTopic, this.id);
            }
            // close the broker connection
            this.brokerConnection.deregister(this, done);
        });

    }

    onNodeInput(msg) {
        // Subclasses can override to receive input messagges from NodeRed
    }

    setNodeStatus(fill, text, shape) {
        if (this.statusLWT === 'Online') {
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
        this.brokerConnection.client.publish(fullTopic, payload);
        // TODO , publish(topic, pl, {qos: 0, retain: false})
    }

    MQTTSubscribe(prefix, command, callback) {
        var fullTopic = this.buildFullTopic(prefix, command);
        this.brokerConnection.subscribe(fullTopic, 2, callback, this.id);
        this._subscribedTopics.push(fullTopic);
    }

}

module.exports = BaseTasmotaNode;
