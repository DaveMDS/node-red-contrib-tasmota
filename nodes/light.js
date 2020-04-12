module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const LIGHT_DEFAULTS = {
    // no specific options for this node
  }

  // values for the tasmota POWER command
  const onValue = 'ON'
  const offValue = 'OFF'
  const toggleValue = 'TOGGLE'

  class TasmotaLightNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, LIGHT_DEFAULTS)
      this.cache = [] // switch status cache, es: [1=>'On', 2=>'Off']

      // Subscribes to state changes
      this.MQTTSubscribe('stat', 'RESULT', (t, p) => this.onStat(t, p))
    }

    onDeviceOnline () {
      // Publish a start command to get the state of all the switches
      this.MQTTPublish('cmnd', 'POWER0')
    }

    onNodeInput (msg) {
      const payload = msg.payload

      // Switch On/Off for booleans and 1/0 (int or str)
      if (payload === true || payload === 1 || payload === '1') {
        this.MQTTPublish('cmnd', 'POWER', onValue)
        return
      }
      if (payload === false || payload === 0 || payload === '0') {
        this.MQTTPublish('cmnd', 'POWER', offValue)
        return
      }

      // String payload: on/off, true/false, toggle (not case sensitive)
      if (typeof payload === 'string') {
        switch (payload.toLowerCase()) {
          case 'on':
          case 'true':
            this.MQTTPublish('cmnd', 'POWER', onValue)
            return
          case 'off':
          case 'false':
            this.MQTTPublish('cmnd', 'POWER', offValue)
            return
          case 'toggle':
            this.MQTTPublish('cmnd', 'POWER', toggleValue)
            return
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
        return
      }

      this.warn('Invalid payload received on input')
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      const mqttPayload = mqttPayloadBuf.toString()

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
