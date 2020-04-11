module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const SWITCH_DEFAULTS = {
    onValue: 'ON',
    offValue: 'OFF',
    toggleValue: 'TOGGLE'
  }

  /* Return the integer number at the end of the given string,
     default to 1 if no number found. */
  function extractChannel (str) {
    const numberRegexp = /\d+$/
    return Number(str.match(numberRegexp) || 1)
  }

  class TasmotaSwitchNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, SWITCH_DEFAULTS)
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
      const topic = msg.topic || 'switch1'

      var channel = topic.toLowerCase().startsWith('switch') ? extractChannel(topic) : 1
      var command = 'POWER' + channel

      // Switch On/Off for: booleans, the onValue or 1/0 (int or str)
      if (payload === true || payload === this.config.onValue ||
          payload === 1 || payload === '1') {
        this.MQTTPublish('cmnd', command, this.config.onValue)
      }
      if (payload === false || payload === this.config.offValue ||
          payload === 0 || payload === '0') {
        this.MQTTPublish('cmnd', command, this.config.offValue)
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
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      // last part of the topic must be POWER or POWERx (ignore any others)
      const lastTopic = mqttTopic.split('/').pop()
      if (!lastTopic.startsWith('POWER')) {
        return
      }

      // check payload is valid
      const mqttPayload = mqttPayloadBuf.toString()
      var status
      if (mqttPayload === this.config.onValue) {
        status = 'On'
      } else if (mqttPayload === this.config.offValue) {
        status = 'Off'
      } else {
        return
      }

      // extract channel number and save in cache
      const channel = extractChannel(lastTopic)
      this.cache[channel - 1] = status

      // update status icon and label
      this.setNodeStatus(this.cache[0] === 'On' ? 'green' : 'grey', this.cache.join(' - '))

      // build and send the new boolen message for topic 'switchX'
      var msg = { topic: 'switch' + channel, payload: (status === 'On') }
      if (this.config.outputs === 1 || this.config.outputs === '1') {
        // everything to the same (single) output
        this.send(msg)
      } else {
        // or send to the correct output
        var msgList = Array(this.config.outputs).fill(null)
        msgList[channel - 1] = msg
        this.send(msgList)
      }
    }
  }

  RED.nodes.registerType('Tasmota Switch', TasmotaSwitchNode)
}
