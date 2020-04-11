module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const LIGHT_DEFAULTS = {
    onValue: 'ON',
    offValue: 'OFF',
    toggleValue: 'TOGGLE'
  }

  class TasmotaLightNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, LIGHT_DEFAULTS)
      this.cache = [] // switch status cache, es: [1=>'On', 2=>'Off']

      // Subscribes to state change of all the switch  stat/<device>/+
      this.MQTTSubscribe('stat', '+', (t, p) => this.onStat(t, p))
    }

    onDeviceOnline () {
      // Publish a start command to get the state of all the switches
      this.MQTTPublish('cmnd', 'POWER0')
    }

    onNodeInput (msg) {
      const payload = msg.payload

      // Switch On/Off for: booleans, the onValue or 1/0 (int or str)
      if (payload === true || payload === this.config.onValue ||
          payload === 1 || payload === '1') {
        this.MQTTPublish('cmnd', 'POWER', this.config.onValue)
      }
      if (payload === false || payload === this.config.offValue ||
          payload === 0 || payload === '0') {
        this.MQTTPublish('cmnd', 'POWER', this.config.offValue)
      }

      // String payload: on, off, toggle (not case sensitive)
      if (typeof payload === 'string') {
        switch (payload.toLowerCase()) {
          case 'on':
            this.MQTTPublish('cmnd', command, this.config.onValue)
            break
          case 'off':
            this.MQTTPublish('cmnd', command, this.config.offValue)
            break
          case 'toggle':
            this.MQTTPublish('cmnd', command, this.config.toggleValue)
            break
        }
      }

      // combined hsv and power payload object
      if (typeof payload === 'object') {
        if (payload.POWER) {
          this.MQTTPublish('cmnd', 'Power', payload.POWER.toString())
        }
        if (payload.Dimmer) {
          this.MQTTPublish('cmnd', 'Dimmer', payload.Dimmer.toString())
        }
        if (payload.Color) {
          this.MQTTPublish('cmnd', 'Color1', payload.Color.toString())
        }
        if (payload.HSBColor) {
          this.MQTTPublish('cmnd', 'HsbColor', payload.HSBColor.toString())
        }
        if (payload.CT) {
          this.MQTTPublish('cmnd', 'CT', payload.CT.toString())
        }
      }
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      const mqttPayload = mqttPayloadBuf.toString()
      // last part of the topic must be POWER or POWERx (ignore any others)
      const lastTopic = mqttTopic.split('/').pop()
      if (!lastTopic.startsWith('RESULT')) {
        return
      }

      // check payload is valid
      var status
      if (mqttPayload.includes('"POWER":"ON"')) {
        status = 'On'
      } else if (mqttPayload.includes('"POWER":"OFF"')) {
        status = 'Off'
      } else {
        return
      }

      // extract channel number and save in cache
      this.cache[0] = status

      // update status icon and label
      this.setNodeStatus(this.cache[0] === 'On' ? 'green' : 'grey', this.cache[0])

      // build and send the new boolen message for topic 'switchX'
      var msg = {
        payload: mqttPayload
      }

      msg.payload = JSON.parse(msg.payload)

      // everything to the same (single) output
      this.send(msg)
    }
  }

  RED.nodes.registerType('Tasmota Light', TasmotaLightNode)
}
