'use strict'

const mqtt = require('mqtt')

/*
  Mqtt connection pool. One connection for each configured broker, shared
  by all nodes that use the same broker config.
    key:brokerUrl  val:MqttClient
*/
var connections = {}

// ensure we use a single connection for each configured broker
function mqttSingleConnect (brokerUrl, options) {
  if (brokerUrl in connections) {
    // reuse client and increase refcount
    var client = connections[brokerUrl]
    client.options.tasmotaRefCount += 1
    return client
  }

  // establish a new mqtt connection (reusing options from the config node)
  var opts = Object.assign({}, options)
  opts.clientId = 'Tasmota_' + options.clientId
  opts.tasmotaRefCount = 1
  client = mqtt.connect(brokerUrl, opts)
  client.setMaxListeners(0)

  // save this new connection in the connections pool
  connections[brokerUrl] = client
  return client
}

// ensure we close the client when refcount goes zero
function mqttSingleDisconnect (brokerUrl, done) {
  var client = connections[brokerUrl]
  if (!client || !client.connected) {
    done()
    return
  }
  client.options.tasmotaRefCount -= 1
  if (client.options.tasmotaRefCount < 1) {
    client.once('close', function () {
      done()
    })
    client.end()
    delete connections[brokerUrl]
  } else {
    done()
  }
}

function matchTopic (subscription, topic) {
  // ...blindly copied from nodes/core/network/10-mqtt.js
  if (subscription === '#' || subscription === topic) {
    return true
  } else if (subscription.startsWith('$share')) {
    subscription = subscription.replace(/^\$share\/[^#+/]+\/(.*)/g, '$1')
  }
  /* eslint-disable no-useless-escape */
  var re = new RegExp('^' + subscription.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g, '\\$1').replace(/\+/g, '[^/]+').replace(/\/#$/, '(\/.*)?') + '$')
  /* eslint-enable no-useless-escape */
  return re.test(topic)
}

class TasmotaMqttClient {
  constructor (tasmotaNode, brokerNode) {
    var self = this

    self.node = tasmotaNode
    self.brokerUrl = brokerNode.brokerurl
    self.subscriptions = []

    self.mqtt_client = mqttSingleConnect(self.brokerUrl, brokerNode.options)

    self.mqtt_client.on('connect', function () {
      self.node.onBrokerOnline()
    })

    self.mqtt_client.on('close', function () {
      self.node.onBrokerOffline()
    })

    self.mqtt_client.on('error', function (err) {
      console.log(err)
    })

    // Mqtt message received, dispatch to the subscribed callbacks
    self.mqtt_client.on('message', function (topic, payload, packet) {
      for (var i = 0; i < self.subscriptions.length; i++) {
        if (matchTopic(self.subscriptions[i].topic, topic)) {
          self.subscriptions[i].callback(topic, payload, packet)
        }
      }
    })
  }

  disconnect (done) {
    for (var i = 0; i < this.subscriptions.length; i++) {
      this.mqtt_client.unsubscribe(this.subscriptions[i].topic)
    }
    this.subscriptions = []
    mqttSingleDisconnect(this.brokerUrl, done)
  }

  subscribe (topic, qos, callback) {
    var sub = {
      topic: topic,
      callback: callback
    }
    this.subscriptions.push(sub)
    this.mqtt_client.subscribe(topic, { qos: qos })
  }

  publish (topic, message, options) {
    this.mqtt_client.publish(topic, message, options)
  }
}

module.exports = TasmotaMqttClient
