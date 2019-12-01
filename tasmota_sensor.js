module.exports = function(RED) {
    'use strict';
    const BaseTasmotaNode = require('./common');

    const DEFAULT_OPTIONS = {
        config: {
            sensorTelemetryRefresh: 0
        }
    }

    class TasmotaSensorNode extends BaseTasmotaNode {
        constructor(nodeDefinition) {
            super(nodeDefinition, RED, DEFAULT_OPTIONS);

            // Subscribe to device telemetry changes  tele/<device>/SENSOR
            this.MQTTSubscribe('tele', 'SENSOR', (topic, payload) => {
                this.onSensorTelemetry(topic, payload)
            });

            // Subscribe to explicit sensor-data responses  stat/<device>/STATUS8
            this.MQTTSubscribe('stat', 'STATUS8', (topic, payload) => {
                this.onSensorStatus(topic, payload)
            });

            // Publish a start command to get the sensors data  cmnd/<device>/STATUS [8]
            this.MQTTPublish('cmnd', 'STATUS', '8');
            this.status({fill: 'yellow', shape: 'ring', text: 'Requesting values...'});
        }

        onSensorTelemetry(topic, payload) {
            try {
                var data = JSON.parse(payload.toString());
                this.send({payload: data});
            } catch (e) {
                this.status({fill: 'red', shape: 'dot', text: 'Error parsing JSON data from device'});
                this.error(err, 'Error parsing JSON data from device');
            }
        }

        onSensorStatus(topic, payload) {
            try {
                var data = JSON.parse(payload.toString());
                this.send({payload: data.StatusSNS});
            } catch (e) {
                this.status({fill: 'red', shape: 'dot', text: 'Error parsing JSON data from device'});
                this.error(e, 'Error parsing JSON data from device');
            }
        }
    }

    RED.nodes.registerType('Tasmota Sensor', TasmotaSensorNode);
};
