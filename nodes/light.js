module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const LIGHT_DEFAULTS = {
    havedimmer: true,
    havetemp: false,
    havecolors: false
  }

  // values for the tasmota POWER command
  const onValue = 'ON'
  const offValue = 'OFF'
  const toggleValue = 'TOGGLE'

  // named colors supported by the color command
  const TASMOTA_COLORS = {
    red: '1',
    green: '2',
    blue: '3',
    orange: '4',
    lightgreen: '5',
    lightblue: '6',
    amber: '7',
    cyan: '8',
    purple: '9',
    yellow: '10',
    pink: '11',
    white: '12',
    '+': '+',
    '-': '-'
  }

  class TasmotaLightNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, LIGHT_DEFAULTS)
      this.cache = {} // light status cache, es: {on: true, bright:55}
      this.colorCmnd = 'Color1' // TODO make Color1/2 configurable

      // Subscribes to state changes
      this.MQTTSubscribe('stat', 'RESULT', (t, p) => this.onStat(t, p))
    }

    onDeviceOnline () {
      // Publish a start command to get the current state of the device
      this.MQTTPublish('cmnd', 'State')
    }

    onNodeInput (msg) {
      var on, bright, ct
      var rgb, hsb, hex, color

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
           typeof msg.payload === 'string' ||
           Array.isArray(msg.payload))) {
        if (msg.topic === 'on' || msg.topic === 'state') {
          on = msg.payload
        }
        if (msg.topic === 'bright' || msg.topic === 'brightness' || msg.topic === 'dimmer') {
          bright = msg.payload
        }
        if (msg.topic === 'ct' || msg.topic === 'colorTemp') {
          ct = msg.payload
        }
        if (msg.topic === 'rgb') {
          rgb = msg.payload
        }
        if (msg.topic === 'hsb') {
          hsb = msg.payload
        }
        if (msg.topic === 'hex') {
          hex = msg.payload
        }
        if (msg.topic === 'color') {
          color = msg.payload
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
        // rgb, hsb, hex, color
        if (typeof msg.payload.rgb !== 'undefined') {
          rgb = msg.payload.rgb
        }
        if (typeof msg.payload.hsb !== 'undefined') {
          hsb = msg.payload.hsb
        }
        if (typeof msg.payload.hex !== 'undefined') {
          hex = msg.payload.hex
        }
        if (typeof msg.payload.color !== 'undefined') {
          color = msg.payload.color
        }
      }

      // did we found something usefull?
      if (on === undefined && bright === undefined && ct === undefined &&
          rgb === undefined && hsb === undefined && hex === undefined && color === undefined) {
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

      // rgb: array[r,g,b] or string "r,g,b" (0-255, 0-255, 0-255)
      if (rgb !== undefined) {
        if (typeof rgb === 'string') {
          this.MQTTPublish('cmnd', this.colorCmnd, rgb)
        } else if (Array.isArray(rgb) && rgb.length === 3) {
          this.MQTTPublish('cmnd', this.colorCmnd, rgb.toString())
        } else {
          this.warn('Invalid value for the \'rgb\' command (should be: [r,g,b] [0-255, 0-255, 0-255])')
        }
      }

      // hsb: array[h,s,b] or string "h,s,b" (0-360, 0-100, 0-100)
      if (hsb !== undefined) {
        if (typeof hsb === 'string') {
          this.MQTTPublish('cmnd', 'HsbColor', hsb)
        } else if (Array.isArray(hsb) && hsb.length === 3) {
          this.MQTTPublish('cmnd', 'HsbColor', hsb.toString())
        } else {
          this.warn('Invalid value for the \'hsb\' command (should be: [h,s,b] [0-360, 0-100, 0-100])')
        }
      }

      // hex: #CWWW, #RRGGBB, #RRGGBBWW or #RRGGBBCWWW (with or without #)
      if (hex !== undefined) {
        if (typeof hex === 'string') {
          hex = (hex[0] === '#') ? hex : '#' + hex
          if (hex.length === 5 || hex.length === 7 || hex.length === 9 || hex.length === 11) {
            this.MQTTPublish('cmnd', this.colorCmnd, hex)
          } else {
            this.warn('Invalid length for the \'hex\' command (should be: #CWWW, #RRGGBB, #RRGGBBWW or #RRGGBBCWWW)')
          }
        } else {
          this.warn('Invalid type for the \'hex\' command (should be: #CWWW, #RRGGBB, #RRGGBBWW or #RRGGBBCWWW)')
        }
      }

      // color: ColorName or +/- (next/prev color)
      if (color !== undefined) {
        if (typeof color === 'string') {
          const colorCode = TASMOTA_COLORS[color.replace(/\s/g, '').toLowerCase()]
          if (colorCode !== undefined) {
            this.MQTTPublish('cmnd', this.colorCmnd, colorCode)
          } else {
            this.warn('Invalid value for the \'color\' command (should be a color name or +/-)')
          }
        } else {
          this.warn('Invalid type for the \'color\' command (should be a string)')
        }
      }
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      try {
        var data = JSON.parse(mqttPayloadBuf.toString())
      } catch (err) {
        this.setNodeStatus('red', 'Error parsing JSON data from device')
        this.error(err, 'Error parsing JSON data from device')
        return
      }

      // update cache with the received data
      if (data.POWER !== undefined) {
        this.cache.on = (data.POWER === onValue)
      }
      if (this.config.havedimmer && data.Dimmer !== undefined) {
        this.cache.bright = data.Dimmer
      }
      if (this.config.havetemp && data.CT !== undefined) {
        // TODO convert to K or % (based on user conf)
        this.cache.ct = data.CT
      }
      if (this.config.havecolors && data.Color !== undefined) {
        this.cache.hex = data.Color
      }
      if (this.config.havecolors && data.HSBColor !== undefined) {
        // TODO also populate msg.payload.rgb (with proper conversion from hsb)
        this.cache.hsb = data.HSBColor.split(',').map(Number)
      }

      // send all the cached data to the node output
      this.send({ payload: this.cache })

      // update node status label
      var status
      if (this.cache.on !== undefined) {
        status = this.cache.on ? 'On' : 'Off'
      }
      if (this.cache.bright !== undefined) {
        status += ` (${this.cache.bright}%)`
      }
      this.setNodeStatus(this.cache.on ? 'green' : 'grey', status)
    }
  }

  RED.nodes.registerType('Tasmota Light', TasmotaLightNode)
}
