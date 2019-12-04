module.exports = function(RED) {
    'use strict';
    const BaseTasmotaNode = require('./base_tasmota.js');

    const SWITCH_DEFAULTS = {
        onValue: 'ON',
        offValue: 'OFF',
        toggleValue: 'TOGGLE'
    }

    class TasmotaSwitchNode extends BaseTasmotaNode {
        constructor(user_config) {
            super(user_config, RED, SWITCH_DEFAULTS);

            // Subscribe to device status changes  stat/<device>/STATUS
            this.MQTTSubscribe('stat', 'STATUS', (t, p) => this.onStatus(t, p));

            // Subscribes to the state of the switch  stat/<device>/POWER
            this.MQTTSubscribe('stat', 'POWER', (t, p) => this.onPower(t, p));

            // Publish a start command to get the status  cmnd/<device>/STATUS
            this.MQTTPublish('cmnd', 'STATUS');
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
                this.setNodeStatus('green', 'On');
                this.send({payload: true});
            }
            if (stringPayload === this.config.offValue) {
                this.setNodeStatus('grey', 'Off');
                this.send({payload: false});
            }
        }

        onStatus(topic, payload) {
            const stringPayload = payload.toString();
            try {
                const jsonPayload = JSON.parse(stringPayload);
                if (jsonPayload.Status.Power === 1) {
                    this.setNodeStatus('green', 'On');
                    this.send({payload: true});
                } else {
                    this.setNodeStatus('grey', 'Off');
                    this.send({payload: false});
                }
            } catch (err) {
                this.setNodeStatus('red', 'Error processing Status from device');
                this.error(err, 'Error processing Status from device');
            }
        }
    }

    RED.nodes.registerType('Tasmota Switch', TasmotaSwitchNode);
};
