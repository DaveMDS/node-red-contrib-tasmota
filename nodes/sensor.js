module.exports = function (RED) {
  'use strict'
  const BaseTasmotaNode = require('./base_tasmota.js')

  const SENSOR_DEFAULTS = {
    rules: [],
    outputTopic: ''
  }

  class TasmotaSensorNode extends BaseTasmotaNode {
    constructor (userConfig) {
      super(userConfig, RED, SENSOR_DEFAULTS)

      // Subscribe to device telemetry changes  tele/<device>/SENSOR
      this.MQTTSubscribe('tele', 'SENSOR', (topic, payload) => {
        this.onSensorTelemetry(topic, payload)
      })

      // Subscribe to explicit sensor-data responses  stat/<device>/STATUS8
      this.MQTTSubscribe('stat', 'STATUS8', (topic, payload) => {
        this.onSensorStatus(topic, payload)
      })
    }

    onDeviceOnline () {
      // Publish a start command to get the sensors data  cmnd/<device>/STATUS [8]
      this.MQTTPublish('cmnd', 'STATUS', '8')
    }

    onNodeInput (msg) {
      // on input we ask a fresh value
      this.MQTTPublish('cmnd', 'STATUS', '8')
    }

    sendToOutputs (tasmotaData) {
      const topic = this.config.outputTopic ? this.config.outputTopic : undefined

      if (!this.config.rules || !this.config.rules.length) {
        this.send({ topic: topic, payload: tasmotaData })
        return
      }

      for (let i = 0; i < this.config.rules.length; i++) {
        const rule = this.config.rules[i]
        if (!rule || rule === 'payload') {
          this.sendToOutputNum(i, { topic: topic, payload: tasmotaData })
        } else {
          try {
            const expr = RED.util.prepareJSONataExpression(rule, this)
            RED.util.evaluateJSONataExpression(expr, tasmotaData, (err, result) => {
              if (err) {
                throw new Error(err)
              } else {
                this.sendToOutputNum(i, { topic: topic, payload: result })
              }
            })
          } catch (e) {
            this.setNodeStatus('red', 'Error evaluating JSONata expression')
            this.error(e, 'Error evaluating JSONata expression')
          }
        }
      }
    }

    onSensorTelemetry (topic, payload) {
      try {
        const data = JSON.parse(payload.toString())
        this.sendToOutputs(data)
      } catch (err) {
        this.setNodeStatus('red', 'Error parsing JSON data from device')
        this.error(err, 'Error parsing JSON data from device')
      }
    }

    onSensorStatus (topic, payload) {
      try {
        const data = JSON.parse(payload.toString())
        this.sendToOutputs(data.StatusSNS)
      } catch (e) {
        this.setNodeStatus('red', 'Error parsing JSON data from device')
        this.error(e, 'Error parsing JSON data from device')
      }
    }
  }

  RED.nodes.registerType('Tasmota Sensor', TasmotaSensorNode)
}
