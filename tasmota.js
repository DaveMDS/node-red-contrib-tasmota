'use strict';

module.exports = function (RED) {
    const debug = require('debug')('tasmota');

    function TasmotaDevice(config) {
        // Create Node
        RED.nodes.createNode(this, config);

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

        var topicCmdPower = `${config.cmdPrefix}/${config.device}/power`;
        var topicCmdStatus = `${config.cmdPrefix}/${config.device}/status`;

        var topicStatsPower = `${config.statPrefix}/${config.device}/POWER`;
        var topicStatsStatus = `${config.statPrefix}/${config.device}/STATUS`;

        if(config.mode == 1){ //Custom (%topic%/%prefix%/)
            topicTeleLWT = `${config.device}/${config.telePrefix}/LWT`;

            topicCmdPower = `${config.device}/${config.cmdPrefix}/power`;
            topicCmdStatus = `${config.device}/${config.cmdPrefix}/status`;

            topicStatsPower = `${config.device}/${config.statPrefix}/POWER`;
            topicStatsStatus = `${config.device}/${config.statPrefix}/STATUS`;
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

        // Subscribe to device status changes  stat/<device>/STATUS
        brokerConnection.subscribe(topicStatsStatus, 2, (topic, payload) => {
            const stringPayload = payload.toString();
            debug('Topic: %s, Value: %s', topic, stringPayload);
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
        });

        // Subscribes to the state of the switch  stat/<device>/POWER
        brokerConnection.subscribe(topicStatsPower, 2, (topic, payload) => {
            const stringPayload = payload.toString();
            debug('Topic: %s, Value: %s', topic, stringPayload);
            if (stringPayload === config.onValue) {
                this.status({fill: 'green', shape: 'dot', text: 'On'});
                this.send({payload: true});
            }
            if (stringPayload === config.offValue) {
                this.status({fill: 'grey', shape: 'dot', text: 'Off'});
                this.send({payload: false});
            }
        });

        // On boolean input we publish 'ON' or 'OFF' to cmnd/<device>/POWER
        this.on('input', msg => {
            debug('INPUT: %s', JSON.stringify(msg));
            const payload = msg.payload;

            // Switch On/Off for: booleans, the onValue or 1/0 integer
            if (payload === true || payload === config.onValue || payload === 1) {
                brokerConnection.client.publish(topicCmdPower, config.onValue, {qos: 0, retain: false});
            }
            if (payload === false || payload === config.offValue || payload === 0) {
                brokerConnection.client.publish(topicCmdPower, config.offValue, {qos: 0, retain: false});
            }

            // Switch Toggle for: "toggle" (not case sensitive)
            if (payload.toLowerCase() === "toggle") {
                brokerConnection.client.publish(topicCmdPower, config.toggleValue, {qos: 0, retain: false});
            }
        });

        // Publish a start command to get the status  cmnd/<device>/status
        brokerConnection.client.publish(topicCmdStatus);
        this.status({fill: 'yellow', shape: 'ring', text: 'Requesting Status...'});

        // Remove Connections when node is deleted or restarted
        this.on('close', done => {
            brokerConnection.unsubscribe(topicTeleLWT, this.id);
            brokerConnection.unsubscribe(topicStatsPower, this.id);
            brokerConnection.unsubscribe(topicStatsStatus, this.id);
            brokerConnection.deregister(this, done);
        });
    }

    RED.nodes.registerType('Tasmota device', TasmotaDevice);
};
