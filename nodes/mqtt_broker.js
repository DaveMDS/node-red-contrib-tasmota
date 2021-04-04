module.exports = function (RED) {
  'use strict'
  const mqtt = require('mqtt')
  const net = require('net')

  // const DBG = console.log

  // Check if the received <topic> match the initial <subscription> topic
  function matchTopic (subscription, topic) {
    if (subscription === '#' || subscription === topic) {
      return true
    }
    /* eslint-disable no-useless-escape */
    const re = new RegExp('^' + subscription.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g, '\\$1').replace(/\+/g, '[^/]+').replace(/\/#$/, '(\/.*)?') + '$')
    /* eslint-enable no-useless-escape */
    return re.test(topic)
  }

  class TasmotaMQTTBrokerNode {
    constructor (config) {
      RED.nodes.createNode(this, config)

      // Node state
      this.connected = false
      this.users = {}
      this.subscriptions = {}

      // Non-clean sessions need a fixed ClientID
      let cleansession = config.cleansession
      if (!cleansession && !config.clientid) {
        this.warn('Non-clean session need clientid to be given, forcing clean session')
        cleansession = true
      }

      // Create the URL for the MQTT.js API
      let brokerurl = ''
      if (config.broker.indexOf('://') > -1) {
        // if a full url is given then use untouched
        brokerurl = config.broker
      } else {
        // or construct the standard mqtt:// url
        if (config.usetls) {
          brokerurl = 'mqtts://'
        } else {
          brokerurl = 'mqtt://'
        }
        if (config.broker !== '') {
          if (net.isIPv6(config.broker)) {
            brokerurl = brokerurl + '[' + config.broker + ']:' + config.port
          } else {
            brokerurl = brokerurl + config.broker + ':' + config.port
          }
        } else {
          brokerurl = brokerurl + 'localhost:' + config.port
        }
      }

      // Build options for the MQTT.js connection
      const mqttOptions = {
        clientId: config.clientid !== '' ? config.clientid : undefined, // MQTT.js will generate a random one
        username: this.credentials ? this.credentials.user : undefined,
        password: this.credentials ? this.credentials.password : undefined,
        clean: cleansession,
        keepalive: Number(config.keepalive),
        reconnectPeriod: 5000,
        resubscribe: true
      }

      // Setup secure connection if requested
      if (config.usetls && config.tls) {
        const tlsNode = RED.nodes.getNode(config.tls)
        if (tlsNode) {
          tlsNode.addTLSOptions(mqttOptions)
        }
      }

      // Start the MQTT.js connection to broker
      try {
        // DBG("MQTT CONNECT", brokerurl, mqttOptions)
        this.client = mqtt.connect(brokerurl, mqttOptions)

        // MQTT.js has successfully connected to broker
        this.client.on('connect', () => {
          this.connected = true
          this.log('Connected to broker: ' + brokerurl)
          // notify connected status to all nodes
          for (const id in this.users) {
            if (Object.prototype.hasOwnProperty.call(this.users, id)) {
              this.users[id].onBrokerOnline()
            }
          }
        })

        // MQTT.js reconnect started
        this.client.on('reconnect', () => {
          this.connected = false
          // notify connecting status to all nodes
          for (const id in this.users) {
            if (Object.prototype.hasOwnProperty.call(this.users, id)) {
              this.users[id].onBrokerConnecting()
            }
          }
        })

        // MQTT.js has received a messagge (dispatch to matching subscribers only)
        this.client.on('message', (mtopic, mpayload, mpacket) => {
          for (const subscribedTopic in this.subscriptions) {
            if (Object.prototype.hasOwnProperty.call(this.subscriptions, subscribedTopic)) {
              if (matchTopic(subscribedTopic, mtopic)) {
                for (const ref in this.subscriptions[subscribedTopic]) {
                  if (Object.prototype.hasOwnProperty.call(this.subscriptions[subscribedTopic], ref)) {
                    const callback = this.subscriptions[subscribedTopic][ref]
                    callback(mtopic, mpayload, mpacket)
                  }
                }
              }
            }
          }
        })

        // MQTT.js has closed the connection
        this.client.on('close', () => {
          if (this.connected) {
            this.connected = false
            this.log('Disconnected from broker: ' + brokerurl)
            // notify offline status to all nodes
            for (const id in this.users) {
              if (Object.prototype.hasOwnProperty.call(this.users, id)) {
                this.users[id].onBrokerOffline()
              }
            }
          } else {
            this.log('Connection failed to broker: ' + brokerurl)
          }
        })

        // The MQTT.js own reconnect logic will take care of errors
        this.client.on('error', (err) => {
          this.error(err)
        })
      } catch (err) {
        this.error(err)
      }

      // ConfigNode is shutting down, close the mqtt connection
      this.on('close', (done) => {
        if (this.connected) {
          this.client.end(done)
        } else {
          this.client.end()
          done()
        }
      })
    }

    /* Register a new TasmotaNode */
    register (tasmotaNode) {
      this.users[tasmotaNode.id] = tasmotaNode
    }

    /* DeRegister a previously registered TasmotaNode */
    deregister (tasmotaNode) {
      delete this.users[tasmotaNode.id]
    }

    /* Subscribe to the given topic, cb will be fired only for matching topics */
    subscribe (tasmotaNode, topic, qos, callback) {
      this.subscriptions[topic] = this.subscriptions[topic] || {}
      this.subscriptions[topic][tasmotaNode.id] = callback
      this.client.subscribe(topic, { qos: qos })
    }

    /* Publish a new msg over MQTT */
    publish (topic, payload) {
      // var options = {
      //   qos: msg.qos || 0,
      //   retain: msg.retain || false
      // };
      const options = {
        qos: 0,
        retain: false
      }
      this.client.publish(topic, payload, options)
    }
  }

  RED.nodes.registerType('tasmota-mqtt-broker', TasmotaMQTTBrokerNode, {
    credentials: {
      user: { type: 'text' },
      password: { type: 'password' }
    }
  })
}
