'use strict'

const TasmotaMqttClient = require('./tasmota_mqtt_client.js')

const TASMOTA_DEFAULTS = {
  // basic
  broker: '', // mandatory
  device: '', // mandatory
  name: '',
  outputs: 1,
  uidisabler: false,
  // advanced
  fullTopic: '%prefix%/%topic%/',
  cmndPrefix: 'cmnd',
  statPrefix: 'stat',
  telePrefix: 'tele'
}

const LWT_ONLINE = 'Online'
const LWT_OFFLINE = 'Offline'

class BaseTasmotaNode {
  constructor (config, RED, more_defaults = {}) {
    // Create the Red node
    RED.nodes.createNode(this, config)

    // Internals
    this.mqttClient = null
    this.closing = false

    // LastWillTopic status of the device
    this.statusLWT = LWT_OFFLINE

    // Merge base and child defaults
    var defaults = Object.assign({}, TASMOTA_DEFAULTS, more_defaults)

    // Merge user and default config
    this.config = {}
    for (const key in defaults) {
      this.config[key] = config[key] || defaults[key]
    }

    // Establish MQTT broker connection
    var brokerNode = RED.nodes.getNode(this.config.broker)
    this.mqttClient = new TasmotaMqttClient(this, brokerNode)

    // Subscribe to device availability changes  tele/<device>/LWT
    this.MQTTSubscribe('tele', 'LWT', (topic, payload) => {
      this.statusLWT = payload.toString()
      if (this.statusLWT === LWT_ONLINE) {
        this.setNodeStatus('green', this.statusLWT, 'ring')
        this._sendEnableUI(true)
        this.onDeviceOnline()
      } else {
        this.setNodeStatus('red', this.statusLWT, 'ring')
        this._sendEnableUI(false)
        this.onDeviceOffline()
      }
    })

    this.on('input', msg => {
      // if topic is 'command' send any tasmota commands over MQTT
      if (msg.topic === 'command') {
        if (typeof msg.payload === 'string') {
          // 1. string payload: 'CMD <param>'
          const [cmd, param] = msg.payload.split(' ', 2)
          this.MQTTPublish('cmnd', cmd, param)
        } else if (Array.isArray(msg.payload)) {
          // 2. list payload: ['CMD <param>', 'CMD <param>', ...]
          for (let i = 0; i < msg.payload.length; i++) {
            const [cmd, param] = msg.payload[i].split(' ', 2)
            this.MQTTPublish('cmnd', cmd, param)
          }
        } else if (typeof msg.payload === 'object') {
          // 3. object payload: {'CMD': 'param', 'CMD': 'param', ...}
          for (const cmd in msg.payload) {
            const param = msg.payload[cmd]
            this.MQTTPublish('cmnd', cmd, param)
          }
        } else {
          this.warn('Invalid payload received for raw tasmota commands')
        }
        return // do not pass the raw command msg to childs
      }

      // Let the child class handle the msg
      this.onNodeInput(msg)
    })

    // Remove all connections when node is deleted or restarted
    this.on('close', done => {
      this.closing = true
      this.mqttClient.disconnect(done)
    })
  }

  _sendEnableUI (enabled) {
    if (this.config.uidisabler) {
      this.sendToAllOutputs({ enabled: enabled })
    }
  }

  sendToAllOutputs (msg) {
    var count = Number(this.config.outputs) || 1
    if (count === 1) {
      this.send(msg)
    } else {
      this.send(new Array(count).fill(msg))
    }
  }

  onBrokerOnline () {
    // probably this is never shown, as the LWT sould be Offline
    // at this point. But we need to update the status.
    this.setNodeStatus('yellow', 'Broker connected', 'ring')
  }

  onBrokerOffline () {
    if (!this.closing) {
      // force the status, regardless the LWT
      this.status({
        fill: 'red',
        shape: 'ring',
        text: 'Broker disconnected'
      })
      this._sendEnableUI(false)
      this.onDeviceOffline()
    }
  }

  onDeviceOnline () {
    // Subclasses can override to know when the LWT is Online
  }

  onDeviceOffline () {
    // Subclasses can override to know when the LWT is Offline
  }

  onNodeInput (msg) {
    // Subclasses can override to receive input messagges from NodeRed
  }

  setNodeStatus (fill, text, shape) {
    if (this.statusLWT === LWT_ONLINE) {
      this.status({
        fill: fill,
        text: text,
        shape: shape || 'dot'
      })
    } else {
      this.status({
        fill: 'red',
        shape: 'ring',
        text: this.statusLWT || LWT_OFFLINE
      })
    }
  }

  buildFullTopic (prefix, command) {
    var full = this.config.fullTopic

    full = full.replace('%topic%', this.config.device)

    if (prefix === 'tele') {
      full = full.replace('%prefix%', this.config.telePrefix)
    } else if (prefix === 'cmnd') {
      full = full.replace('%prefix%', this.config.cmndPrefix)
    } else if (prefix === 'stat') {
      full = full.replace('%prefix%', this.config.statPrefix)
    }

    if (full.endsWith('/')) {
      return full + command
    } else {
      return full + '/' + command
    }
  }

  MQTTPublish (prefix, command, payload) {
    var fullTopic = this.buildFullTopic(prefix, command)
    this.mqttClient.publish(fullTopic, payload)
    // TODO  qos and retain options
  }

  MQTTSubscribe (prefix, command, callback) {
    var fullTopic = this.buildFullTopic(prefix, command)
    this.mqttClient.subscribe(fullTopic, 2, callback)
  }

  /* Return the integer number at the end of the given string,
     default to 1 if no number found. */
  extractChannelNum (str) {
    const numberRegexp = /\d+$/
    return Number(str.match(numberRegexp) || 1)
  }
}

module.exports = BaseTasmotaNode
