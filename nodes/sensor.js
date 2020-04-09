module.exports = function(RED) {
    'use strict';
    const BaseTasmotaNode = require('./base_tasmota.js');

    const SENSOR_DEFAULTS = {
        rules: [],
    };

    class TasmotaSensorNode extends BaseTasmotaNode {
        constructor(user_config) {
            super(user_config, RED, SENSOR_DEFAULTS);

            // Subscribe to device telemetry changes  tele/<device>/SENSOR
            this.MQTTSubscribe('tele', 'SENSOR', (topic, payload) => {
                this.onSensorTelemetry(topic, payload)
            });

            // Subscribe to explicit sensor-data responses  stat/<device>/STATUS8
            this.MQTTSubscribe('stat', 'STATUS8', (topic, payload) => {
                this.onSensorStatus(topic, payload)
            });
        }

        onDeviceOnline() {
            // Publish a start command to get the sensors data  cmnd/<device>/STATUS [8]
            this.MQTTPublish('cmnd', 'STATUS', '8');
        }

        onNodeInput(msg) {
            // on input we ask a fresh value
            this.MQTTPublish('cmnd', 'STATUS', '8');
        }


        sendToOutputs(tasmota_data) {
            if (!this.config.rules || !this.config.rules.length) {
                this.send({payload: tasmota_data});
                return;
            }

            var messages = []
            for (let i = 0; i < this.config.rules.length; i++) {
                let rule = this.config.rules[i];
                if (!rule || rule === 'payload') {
                    messages.push({payload: tasmota_data})
                } else {
                    var expr = RED.util.prepareJSONataExpression(rule, this)
                    var result = RED.util.evaluateJSONataExpression(expr, tasmota_data)
                    messages.push({payload: result})
                }
            }
            this.send(messages)
        }

        onSensorTelemetry(topic, payload) {
            try {
                var data = JSON.parse(payload.toString());
                this.sendToOutputs(data);
            } catch (e) {
                this.setNodeStatus('red', 'Error parsing JSON data from device');
                this.error(err, 'Error parsing JSON data from device');
            }
        }

        onSensorStatus(topic, payload) {
            try {
                var data = JSON.parse(payload.toString());
                this.sendToOutputs(data.StatusSNS);
            } catch (e) {
                this.setNodeStatus('red', 'Error parsing JSON data from device');
                this.error(e, 'Error parsing JSON data from device');
            }
        }
    }

    RED.nodes.registerType('Tasmota Sensor', TasmotaSensorNode);
};
