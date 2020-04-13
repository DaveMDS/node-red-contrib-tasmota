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
      var on, bright, ct

      // MODE 1: simple on/off/toggle (without topic)
      if (!msg.topic &&
          (typeof msg.payload === 'number' ||
           typeof msg.payload === 'boolean' ||
           typeof msg.payload === 'string')) {
        on = msg.payload
      }

      // MODE 2: topic mode (with simple-typed payload)
      if (msg.topic &&
          (typeof msg.payload === 'boolean' ||
           typeof msg.payload === 'number' ||
           typeof msg.payload === 'string')) {
        if (msg.topic === 'on' || msg.topic === 'state') {
          on = msg.payload
        }
        if (msg.topic === 'bright' || msg.topic === 'brightness' || msg.topic === 'dimmer') {
          bright = msg.payload
        }
        if (msg.topic === 'ct' || msg.topic === 'colorTemp') {
          ct = msg.payload
        }
      }

      // MODE 3: object payload (without topic)
      if (!msg.topic && typeof msg.payload === 'object') {
        // on (aliases: state)
        if (typeof msg.payload.on !== 'undefined') {
          on = msg.payload.on
        }
        if (typeof msg.payload.state !== 'undefined') {
          on = msg.payload.state
        }
        // bright (aliases: brightness, dimmer)
        if (typeof msg.payload.bright !== 'undefined') {
          bright = msg.payload.bright
        }
        if (typeof msg.payload.brightness !== 'undefined') {
          bright = msg.payload.brightness
        }
        if (typeof msg.payload.dimmer !== 'undefined') {
          bright = msg.payload.dimmer
        }
        // ct (aliases: colorTemp)
        if (typeof msg.payload.ct !== 'undefined') {
          ct = msg.payload.ct
        }
        if (typeof msg.payload.colorTemp !== 'undefined') {
          ct = msg.payload.colorTemp
        }
      }

      // did we found something usefull?
      if (on === undefined && bright === undefined && ct === undefined) {
        this.warn('Invalid message received on input')
        return
      }

      // on: true/false, 1/0, on/off, toggle (not case sensitive)
      if (on !== undefined) {
        switch (on.toString().toLowerCase()) {
          case '1':
          case 'on':
          case 'true':
            this.MQTTPublish('cmnd', 'POWER', onValue)
            break
          case '0':
          case 'off':
          case 'false':
            this.MQTTPublish('cmnd', 'POWER', offValue)
            break
          case 'toggle':
            this.MQTTPublish('cmnd', 'POWER', toggleValue)
            break
          default:
            this.warn('Invalid value for the \'on\' command (should be: true/false, 1/0, on/off or toggle)')
        }
      }

      // bright: 0-100
      if (bright !== undefined) {
        bright = parseInt(bright)
        if (isNaN(bright) || bright < 0 || bright > 100) {
          this.warn('Invalid value for the \'bright\' command (should be: 0-100)')
        } else {
          this.MQTTPublish('cmnd', 'Dimmer', bright.toString())
        }
      }

      // ct: 500-153, 2000-6500, 0-100 (warm to cold)
      if (ct !== undefined) {
        ct = parseInt(ct)
        if (isNaN(ct)) {
          this.warn('Invalid value for the \'ct\' command (should be: 0-100, 2000-6500 or 500-153)')
        } else if (ct >= 153 && ct <= 500) { // ct in mired (cold to warm)
          this.MQTTPublish('cmnd', 'CT', ct.toString())
        } else if (ct >= 0 && ct <= 100) { // ct in percent (warm to cold)
          ct = 100 - ct
          ct = Math.floor(((ct / 100) * (500 - 153)) + 153)
          this.MQTTPublish('cmnd', 'CT', ct.toString())
        } else if (ct >= 2000 && ct <= 6500) { // ct in kelvin (warm to cold)
          ct = Math.floor(1000000 / ct)
          this.MQTTPublish('cmnd', 'CT', ct.toString())
        } else {
          this.warn('Invalid value for the \'ct\' command (should be: 0-100, 2000-6500 or 500-153)')
        }
      }

      /*
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
      */
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
