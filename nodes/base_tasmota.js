'use strict'

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
  telePrefix: 'tele',
  qos: '1',  // NOTE: always stored as string
  retain: 'false'  // NOTE: always stored as string
}

const LWT_ONLINE = 'Online'
const LWT_OFFLINE = 'Offline'

// const DBG = console.log

class BaseTasmotaNode {
  constructor (config, RED, more_defaults = {}) {
    // Create the Red node
    RED.nodes.createNode(this, config)

    // Internals
    this.brokerNode = null
    this.closing = false

    // LastWillTopic status of the device
    this.statusLWT = LWT_OFFLINE

    // Merge base and child defaults
    const defaults = Object.assign({}, TASMOTA_DEFAULTS, more_defaults)

    // Merge user and default config
    this.config = {}
    for (const key in defaults) {
      if (config[key] !== undefined && config[key] !== '') {
        this.config[key] = config[key]
      } else {
        this.config[key] = defaults[key]
      }
    }

    // Adjust qos and retain types (they are stored as string in edit dialog)
    this.config.qos = parseInt(this.config.qos)
    this.config.retain = this.config.retain === true || this.config.retain === 'true'

    // Get and check the broker node (could be wrong if updated from old release)
    const brokerNode = RED.nodes.getNode(this.config.broker)
    if (!brokerNode || brokerNode.type !== 'tasmota-mqtt-broker') {
      this.warn('Broker configuration is wrong or missing, please review the node settings')
      this.status({ fill: 'red', shape: 'dot', text: 'Wrong config' })
      return
    }
    // Register ourself in the broker node
    this.brokerNode = brokerNode
    this.brokerNode.register(this)

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

    this.on('input', (msg, send, done) => {
      if (msg.topic === 'command') {
        // if topic is 'command' send raw tasmota commands over MQTT
        this.sendRawCommand(msg.payload)
      } else {
        // Or let the child class handle the msg
        this.onNodeInput(msg)
      }
      // Notify NodeRed we finished handling the msg
      if (done) {
        done()
      }
    })

    // Deregister from BrokerNode when this node is deleted or restarted
    this.on('close', (done) => {
      this.closing = true
      this.brokerNode.deregister(this)
      done()
    })
  }

  _sendEnableUI (enabled) {
    if (this.config.uidisabler) {
      this.sendToAllOutputs({ enabled: enabled })
    }
  }

  sendToAllOutputs (msg) {
    const count = Number(this.config.outputs) || 1
    if (count === 1) {
      this.send(msg)
    } else {
      this.send(new Array(count).fill(msg))
    }
  }

  sendToOutputNum (num, msg) {
    const count = Number(this.config.outputs) || 1
    const list = Array(count).fill(null)
    list[num] = msg
    this.send(list)
  }

  sendRawCommand (payload) {
    if (typeof payload === 'string') {
      // 1. string payload: 'CMD <param>'
      const [cmd, param] = payload.split(' ', 2)
      this.MQTTPublish('cmnd', cmd, param)
    } else if (Array.isArray(payload)) {
      // 2. list payload: ['CMD <param>', 'CMD <param>', ...]
      for (let i = 0; i < payload.length; i++) {
        const [cmd, param] = payload[i].split(' ', 2)
        this.MQTTPublish('cmnd', cmd, param)
      }
    } else if (typeof payload === 'object') {
      // 3. object payload: {'CMD': 'param', 'CMD': 'param', ...}
      for (const cmd in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, cmd)) {
          const param = payload[cmd]
          this.MQTTPublish('cmnd', cmd, param)
        }
      }
    } else {
      this.warn('Invalid payload received for raw tasmota commands')
    }
  }

  onBrokerConnecting () {
    // force the status, regardless the LWT
    this.status({ fill: 'yellow', shape: 'ring', text: 'Broker connecting' })
  }

  onBrokerOnline () {
    // probably this is never shown, as the LWT sould be Offline
    // at this point. But we need to update the status.
    this.setNodeStatus('red', 'Broker connected', 'ring')
  }

  onBrokerOffline () {
    if (!this.closing) {
      // force the status, regardless the LWT
      this.status({ fill: 'red', shape: 'ring', text: 'Broker disconnected' })
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
    let full = this.config.fullTopic

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
    const fullTopic = this.buildFullTopic(prefix, command)
    const options = {
      qos: this.config.qos,
      retain: this.config.retain
    }
    if (payload !== null && payload !== undefined) {
      // enable sending Numbers and other types (preserving null and undef!)
      payload = String(payload)
    }
    this.brokerNode.publish(fullTopic, payload, options)
  }

  MQTTSubscribe (prefix, command, callback) {
    const fullTopic = this.buildFullTopic(prefix, command)
    this.brokerNode.subscribe(this, fullTopic, this.config.qos, callback)
  }

  /* Return the integer number at the end of the given string,
     default to 1 if no number found. */
  extractChannelNum (str) {
    const numberRegexp = /\d+$/
    return Number(str.match(numberRegexp) || 1)
  }
}

module.exports = BaseTasmotaNode
