'use strict';

module.exports = function (RED) {
    const debug = require('debug')('tasmota_sensor');

    function TasmotaSensorDevice(user_config) {
        // Create Node
        RED.nodes.createNode(this, user_config);

        // Setup working defaults
        var config = {
            // mandatory
            broker: user_config.broker,
            device: user_config.device,
            // advanced
            topicMode: user_config.topicMode || 0,
            cmdPrefix: user_config.cmdPrefix || 'cmnd',
            statPrefix: user_config.statPrefix || 'stat',
            telePrefix: user_config.telePrefix || 'tele',
        }

        // Setup mqtt broker
        const brokerConnection = RED.nodes.getNode(config.broker);
        if (!brokerConnection) {
            this.status({fill: 'red', shape: 'dot', text: 'Could not connect to mqtt'});
            this.error(err, 'Could not connect to mqtt');
            return;
        }
        brokerConnection.register(this);
        this.status({fill: 'yellow', shape: 'dot', text: 'Connecting...'});

        // Topics
        var topicTeleLWT = `${config.telePrefix}/${config.device}/LWT`;
        var topicTeleSENSOR = `${config.telePrefix}/${config.device}/SENSOR`;

        var topicCmdStatus = `${config.cmdPrefix}/${config.device}/status`;

        var topicStatsSensor = `${config.statPrefix}/${config.device}/STATUS8`

        if(config.topicMode == 1){ //Custom (%topic%/%prefix%/)
            topicTeleLWT = `${config.device}/${config.telePrefix}/LWT`;
            topicTeleSENSOR = `${config.device}/${config.telePrefix}/SENSOR`;

            topicCmdStatus = `${config.device}/${config.cmdPrefix}/status`;

            topicStatsSensor = `${config.device}/${config.statPrefix}/STATUS8`
        }

        // Subscribe to device availability changes  tele/<device>/LWT
        brokerConnection.subscribe(topicTeleLWT, 2, (topic, payload) => {
            const stringPayload = payload.toString();
            debug('Topic: %s, Value: %s', topic, stringPayload);
            if (stringPayload === 'Online') {
                this.status({fill: 'green', shape: 'ring', text: 'Online'});
            } else {
                this.status({fill: 'red', shape: 'dot', text: 'Offline'});
            }
        });

        // Subscribe to device telemetry changes  tele/<device>/SENSOR
        brokerConnection.subscribe(topicTeleSENSOR, 2, (topic, payload) => {
            try {
                var data = JSON.parse(payload.toString());
                this.send({payload: data});
            } catch (e) {
                this.status({fill: 'red', shape: 'dot', text: 'Error parsing JSON data from device'});
                this.error(err, 'Error parsing JSON data from device');
            }
        });

        // Publish a start command to get the sensors data  cmnd/<device>/STATUS [8]  => stat/<device>/STATUS8 [json reply data]
        brokerConnection.subscribe(topicStatsSensor, 2, (topic, payload) => {
            try {
                var data = JSON.parse(payload.toString());
                this.send({payload: data.StatusSNS});
            } catch (e) {
                this.status({fill: 'red', shape: 'dot', text: 'Error parsing JSON data from device'});
                this.error(err, 'Error parsing JSON data from device');
            }
        });
        brokerConnection.client.publish(topicCmdStatus, '8');
        this.status({fill: 'yellow', shape: 'ring', text: 'Requesting values...'});

        // Remove Connections when node is deleted or restarted
        this.on('close', done => {
            brokerConnection.unsubscribe(topicTeleLWT, this.id);
            brokerConnection.unsubscribe(topicStatsSensor, this.id);
            brokerConnection.unsubscribe(topicTeleSENSOR, this.id);
            brokerConnection.deregister(this, done);
        });
    }

    RED.nodes.registerType('Tasmota Sensor', TasmotaSensorDevice);
};
