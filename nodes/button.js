module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const BUTTON_DEFAULTS = {
    // no specific options for this node
  }

  class TasmotaButtonNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, BUTTON_DEFAULTS)

      // Subscribes to stat info for all the buttons  stat/<device>/+
      this.MQTTSubscribe('stat', '+', (t, p) => this.onStat(t, p))
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      // last part of the topic must be BUTTON or BUTTONx (ignore any others)
      const lastTopic = mqttTopic.split('/').pop()
      if (!lastTopic.startsWith('BUTTON')) {
        return
      }

      // extract channel number from topic
      const channel = this.extractChannelNum(lastTopic)

      // extract button action from JSON payload
      try {
        var data = JSON.parse(mqttPayloadBuf.toString())
        var action = data.ACTION
      } catch (e) {
        this.setNodeStatus('red', 'Error parsing JSON data from device')
        this.error(e, 'Error parsing JSON data from device')
      }

      // update status icon and label
      this.setNodeStatus('green', `${action} (${channel})`)

      // build and send the new string message for topic 'buttonX'
      const msg = { topic: 'button' + channel, payload: action }
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

  RED.nodes.registerType('Tasmota Button', TasmotaButtonNode)
}
