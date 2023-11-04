module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const SWITCH_DEFAULTS = {
    notopic: false
  }

  // values for the tasmota POWER command
  const onValue = 'ON'
  const offValue = 'OFF'
  const toggleValue = 'TOGGLE'

  class TasmotaSwitchNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, SWITCH_DEFAULTS)
      this.cache = [] // switch status cache, es: [1=>'On', 2=>'Off']

      // Subscribes to state change of all the switch  stat/<device>/+
      this.MQTTSubscribe('stat', '+', (topic, payload) => {
        this.onStat(topic, payload)
      })
    }

    onDeviceOnline () {
      // Publish a start command to get the state of all the switches
      this.MQTTPublish('cmnd', 'POWER0')
    }

    onNodeInput (msg) {
      const payload = msg.payload
      const topic = msg.topic || 'switch1'

      const channel = topic.toLowerCase().startsWith('switch') ? this.extractChannelNum(topic) : 1
      const command = 'POWER' + channel

      // Switch On/Off for booleans and 1/0 (int or str)
      if (payload === true || payload === 1 || payload === '1') {
        this.MQTTPublish('cmnd', command, onValue)
        return
      }
      if (payload === false || payload === 0 || payload === '0') {
        this.MQTTPublish('cmnd', command, offValue)
        return
      }

      // String payload: on/off, true/false, toggle (not case sensitive)
      if (typeof payload === 'string') {
        switch (payload.toLowerCase()) {
          case 'on':
          case 'true':
            this.MQTTPublish('cmnd', command, onValue)
            return
          case 'off':
          case 'false':
            this.MQTTPublish('cmnd', command, offValue)
            return
          case 'toggle':
            this.MQTTPublish('cmnd', command, toggleValue)
            return
        }
      }

      this.warn('Invalid payload received on input')
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      // last part of the topic must be POWER or POWERx (ignore any others)
      const lastTopic = mqttTopic.split('/').pop()
      if (!lastTopic.startsWith('POWER')) {
        return
      }

      // check payload is valid
      const mqttPayload = mqttPayloadBuf.toString()
      let status
      if (mqttPayload === onValue) {
        status = 'On'
      } else if (mqttPayload === offValue) {
        status = 'Off'
      } else {
        return
      }

      // extract channel number and save in cache
      const channel = this.extractChannelNum(lastTopic)
      this.cache[channel - 1] = status

      // update status icon and label
      this.setNodeStatus(this.cache[0] === 'On' ? 'green' : 'grey', this.cache.join(' - '))

      // build the boolean message, with optional topic 'switchX'
      const msg = { payload: (status === 'On') }
      if (!this.config.notopic) {
        msg.topic = 'switch' + channel
      }

      // send the message to correct output
      if (this.config.outputs === 1 || this.config.outputs === '1') {
        // everything to the same (single) output
        this.send(msg)
      } else {
        // or send to the correct output
        this.sendToOutputNum(channel - 1, msg)
      }
    }
  }

  RED.nodes.registerType('Tasmota Switch', TasmotaSwitchNode)
}
