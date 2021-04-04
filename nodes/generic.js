module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  // const DBG = console.log

  const GENERIC_DEFAULTS = {
    subscribeToStat: false,
    subscribeToTele: false
  }

  class TasmotaGenericNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, GENERIC_DEFAULTS)

      // Subscribe to STAT messages (all or just RESULT)
      if (this.config.subscribeToStat) {
        this.MQTTSubscribe('stat', '+', (topic, payload) => {
          this.onMqttMessage(topic, payload)
        })
      } else {
        this.MQTTSubscribe('stat', 'RESULT', (topic, payload) => {
          this.onMqttMessage(topic, payload)
        })
      }
      // Subscribe to TELE messages (if requested)
      if (this.config.subscribeToTele) {
        this.MQTTSubscribe('tele', '+', (topic, payload) => {
          this.onMqttMessage(topic, payload)
        })
      }
    }

    onMqttMessage (topic, payloadBuf) {
      let payload = ''
      try {
        payload = JSON.parse(payloadBuf.toString())
      } catch (e) {
        return // ignore any non-json payload
      }

      // Forward to the node output
      const msg = { topic: topic, payload: payload }
      this.send(msg)
    }

    onNodeInput (msg) {
      this.sendRawCommand(msg.payload)
    }
  }

  RED.nodes.registerType('Tasmota Generic', TasmotaGenericNode)
}
