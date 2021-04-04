module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const LIGHT_DEFAULTS = {
    havedimmer: true,
    havetemp: false,
    havecolors: false,
    tempformat: 'K',
    colorsformat: 'HSB'
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

  function mired2percent (mired) {
    return 100 - Math.round(((mired - 153) / (500 - 153)) * 100)
  }

  function percent2mired (percent) {
    return Math.floor((((100 - percent) / 100) * (500 - 153)) + 153)
  }

  function mired2kelvin (mired) {
    return Math.floor(1000000 / mired)
  }

  function kelvin2mired (kelvin) {
    return Math.floor(1000000 / kelvin)
  }

  function hsb2rgb (h, s, v) {
    h = (h % 360 + 360) % 360 // normalize angle
    h = (h === 360) ? 1 : (h % 360 / parseFloat(360) * 6)
    s = (s === 100) ? 1 : (s % 100 / parseFloat(100))
    v = (v === 100) ? 1 : (v % 100 / parseFloat(100))

    const i = Math.floor(h)
    const f = h - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)
    const mod = i % 6
    const r = [v, q, p, p, t, v][mod]
    const g = [t, v, v, q, p, p][mod]
    const b = [p, p, t, v, v, q][mod]

    return [
      Math.floor(r * 255),
      Math.floor(g * 255),
      Math.floor(b * 255)
    ]
  }

  class TasmotaLightNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, LIGHT_DEFAULTS)
      this.cache = {} // light status cache, es: {on: true, bright:55, ct:153, colors:...}
      this.colorCmnd = 'Color1' // TODO make Color1/2 configurable ?

      // Subscribes to state changes
      this.MQTTSubscribe('stat', 'RESULT', (topic, payload) => {
        this.onStat(topic, payload)
      })
    }

    onDeviceOnline () {
      // Publish a start command to get the current state of the device
      this.MQTTPublish('cmnd', 'State')
    }

    onNodeInput (msg) {
      let on, bright, ct
      let rgb, hsb, hex, color

      // MODE 1: simple on/off/toggle (without topic)
      if (!msg.topic &&
          (typeof msg.payload === 'number' ||
           typeof msg.payload === 'boolean' ||
           typeof msg.payload === 'string')) {
        on = msg.payload
      }

      // MODE 2: topic mode (with simple-typed payload)
      if (msg.topic && typeof msg.topic === 'string' &&
          (typeof msg.payload === 'boolean' ||
           typeof msg.payload === 'number' ||
           typeof msg.payload === 'string' ||
           Array.isArray(msg.payload))) {
        const cmd = msg.topic.toLowerCase()
        if (cmd === 'on' || cmd === 'state' || cmd === 'power') {
          on = msg.payload
        } else if (cmd === 'bright' || cmd === 'brightness' || cmd === 'dimmer') {
          bright = msg.payload
        } else if (cmd === 'ct' || cmd === 'colortemp') {
          ct = msg.payload
        } else if (cmd === 'rgb' || cmd === 'rgbcolor') {
          rgb = msg.payload
        } else if (cmd === 'hsb' || cmd === 'hsbcolor') {
          hsb = msg.payload
        } else if (cmd === 'hex' || cmd === 'hexcolor') {
          hex = msg.payload
        } else if (cmd === 'color') {
          color = msg.payload
        }
      }

      // MODE 3: object payload (without topic)
      if (!msg.topic && typeof msg.payload === 'object') {
        for (const [key, value] of Object.entries(msg.payload)) {
          const cmd = key.toLowerCase()
          if (cmd === 'on' || cmd === 'state' || cmd === 'power') {
            on = value
          } else if (cmd === 'bright' || cmd === 'brightness' || cmd === 'dimmer') {
            bright = value
          } else if (cmd === 'ct' || cmd === 'colortemp') {
            ct = value
          } else if (cmd === 'rgb' || cmd === 'rgbcolor') {
            rgb = value
          } else if (cmd === 'hsb' || cmd === 'hsbcolor') {
            hsb = value
          } else if (cmd === 'hex' || cmd === 'hexcolor') {
            hex = value
          } else if (cmd === 'color') {
            color = value
          }
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
          ct = percent2mired(ct)
          this.MQTTPublish('cmnd', 'CT', ct.toString())
        } else if (ct >= 2000 && ct <= 6500) { // ct in kelvin (warm to cold)
          ct = kelvin2mired(ct)
          this.MQTTPublish('cmnd', 'CT', ct.toString())
        } else {
          this.warn('Invalid value for the \'ct\' command (should be: 0-100, 2000-6500 or 500-153)')
        }
      }
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      let data
      try {
        data = JSON.parse(mqttPayloadBuf.toString())
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
        if (this.config.tempformat === 'K') {
          this.cache.ct = mired2kelvin(data.CT)
        } else if (this.config.tempformat === 'P') {
          this.cache.ct = mired2percent(data.CT)
        } else { // mired
          this.cache.ct = data.CT
        }
      }
      if (this.config.havecolors && data.HSBColor !== undefined) {
        const hsb = data.HSBColor.split(',').map(Number)
        if (this.config.colorsformat === 'HSB') {
          this.cache.colors = hsb
        } else if (this.config.colorsformat === 'RGB') {
          this.cache.colors = hsb2rgb(hsb[0], hsb[1], hsb[2])
        } else { // Channels
          this.cache.colors = data.Channel
        }
      }

      // send all the cached data to the node output(s)
      // or send each value to the correct output
      if (this.config.outputs === 1 || this.config.outputs === '1') {
        // everything to the same (single) output, as a JSON dict object
        this.send({ payload: this.cache })
      } else if (this.config.outputs === 2 || this.config.outputs === '2') {
        this.send([
          { payload: this.cache.on }, // Output 1: on/off status
          { payload: this.cache.bright } // Output 2: brightness
        ])
      } else if (this.config.outputs === 3 || this.config.outputs === '3') {
        this.send([
          { payload: this.cache.on }, // Output 1: on/off status
          { payload: this.cache.bright }, // Output 2: brightness
          { payload: this.cache.ct } // Output 3: temperature
        ])
      } else if (this.config.outputs === 4 || this.config.outputs === '4') {
        this.send([
          { payload: this.cache.on }, // Output 1: on/off status
          { payload: this.cache.bright }, // Output 2: brightness
          { payload: this.cache.ct }, // Output 3: temperature
          { payload: this.cache.colors } // Output 4: colors
        ])
      }

      // update node status label
      let status
      if (this.cache.on !== undefined) {
        status = this.cache.on ? 'On' : 'Off'
      }
      if (this.cache.bright !== undefined) {
        status += ` bri:${this.cache.bright}%`
      }
      if (this.cache.ct !== undefined) {
        status += ` ct:${this.cache.ct}`
      }
      this.setNodeStatus(this.cache.on ? 'green' : 'grey', status)
    }
  }

  RED.nodes.registerType('Tasmota Light', TasmotaLightNode)
}
