module.exports = function(RED) {
    'use strict';
    const BaseTasmotaNode = require('./common');

    const DEFAULT_OPTIONS = {
        config: {
            onValue: 'ON',
            offValue: 'OFF',
            toggleValue: 'TOGGLE'
        }
    }

    class TasmotaSwitchNode extends BaseTasmotaNode {
        constructor(nodeDefinition) {
            super(nodeDefinition, RED, DEFAULT_OPTIONS);

            // Subscribe to device status changes  stat/<device>/STATUS
            this.MQTTSubscribe('stat', 'STATUS', (t, p) => this.onStatus(t, p));

            // Subscribes to the state of the switch  stat/<device>/POWER
            this.MQTTSubscribe('stat', 'POWER', (t, p) => this.onPower(t, p));

            // Publish a start command to get the status  cmnd/<device>/STATUS
            this.MQTTPublish('cmnd', 'STATUS');
            this.status({fill: 'yellow', shape: 'ring', text: 'Requesting Status...'});

        }

        onNodeInput(msg) {
            const payload = msg.payload;

            // Switch On/Off for: booleans, the onValue or 1/0 (int or str)
            if (payload === true || payload === this.config.onValue || payload === 1 || payload === "1") {
                this.MQTTPublish('cmnd', 'POWER', this.config.onValue);
            }
            if (payload === false || payload === this.config.offValue || payload === 0 || payload === "0") {
                this.MQTTPublish('cmnd', 'POWER', this.config.offValue);
            }

            // string payload (not case sensitive)
            if (typeof payload === 'string') {
                // "toggle" => Toggle the switch
                if(payload.toLowerCase() === "toggle") {
                    this.MQTTPublish('cmnd', 'POWER', this.config.toggleValue);
                }
            }
        }

        onPower(topic, payload) {
            const stringPayload = payload.toString();
            if (stringPayload === this.config.onValue) {
                this.status({fill: 'green', shape: 'dot', text: 'On'});
                this.send({payload: true});
            }
            if (stringPayload === this.config.offValue) {
                this.status({fill: 'grey', shape: 'dot', text: 'Off'});
                this.send({payload: false});
            }
        }

        onStatus(topic, payload) {
            const stringPayload = payload.toString();
            try {
                const jsonPayload = JSON.parse(stringPayload);
                if (jsonPayload.Status.Power === 1) {
                    this.status({fill: 'green', shape: 'dot', text: 'On'});
                    this.send({payload: true});
                } else {
                    this.status({fill: 'grey', shape: 'dot', text: 'Off'});
                    this.send({payload: false});
                }
            } catch (err) {
                this.status({fill: 'red', shape: 'dot', text: 'Error processing Status from device'});
                this.error(err, 'Error processing Status from device');
            }
        }
    }

    RED.nodes.registerType('Tasmota Switch', TasmotaSwitchNode);
};
