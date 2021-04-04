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
      this.MQTTSubscribe('stat', '+', (topic, payload) => {
        this.onStat(topic, payload)
      })
    }

    onStat (mqttTopic, mqttPayloadBuf) {
      let channel = null
      let action = null
      let payload = null
      const lastTopic = mqttTopic.split('/').pop()
      try {
        payload = JSON.parse(mqttPayloadBuf.toString())
      } catch (e) {
        return // ignore any non-json payload
      }

      /* Firmware >= 9.1.0
         stat/topic/RESULT = {"Button<X>":{"Action":"SINGLE"}}
         stat/topic/RESULT = {"Switch<X>":{"Action":"SINGLE"}}
      */
      if (lastTopic === 'RESULT') {
        for (const [key, value] of Object.entries(payload)) {
          if (key.startsWith('Button') || key.startsWith('Switch')) {
            channel = this.extractChannelNum(key)
            action = value.Action
          }
        }
      /* Firmware < 9.1.0
         stat/topic/BUTTON<X> = {"ACTION":"DOUBLE"}
      */
      } else if (lastTopic.startsWith('BUTTON')) {
        channel = this.extractChannelNum(lastTopic)
        action = payload.ACTION
      }

      // something usefull received ?
      if (!channel || !action) {
        return
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
        const msgList = Array(this.config.outputs).fill(null)
        msgList[channel - 1] = msg
        this.send(msgList)
      }
    }
  }

  RED.nodes.registerType('Tasmota Button', TasmotaButtonNode)
}
