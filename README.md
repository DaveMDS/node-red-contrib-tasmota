# node-red-contrib-tasmota

![License](https://img.shields.io/github/license/davemds/node-red-contrib-tasmota.svg)
![Release](https://img.shields.io/npm/v/node-red-contrib-tasmota.svg)
![NPM](https://img.shields.io/npm/dm/node-red-contrib-tasmota.svg)

Tasmota devices for building automation inside [Node-RED](https://nodered.org/).

The goal of the project is to support a wide set of features exposed by the Tasmota firmware over MQTT.

## Getting Started

This assumes you have [Node-RED](https://nodered.org) already installed and working, if you need to install Node-RED see [here](https://nodered.org/docs/getting-started/installation).

Install via Node-RED Manage Palette interface ([node page](https://flows.nodered.org/node/node-red-contrib-tasmota))

```
node-red-contrib-tasmota
```

Install via [npm](https://www.npmjs.com/package/node-red-contrib-tasmota)

```shell
$ cd ~/.node-red
$ npm install node-red-contrib-tasmota
# then restart node-red
```

## Included Nodes

The installed nodes have more detailed information in the Node-RED info pane, shown when the node is selected. Below is a quick summary

### Tasmota Switch

Lets you control your tasmota switch, and of course give you messagges on state changes.
The value is also requested on startup, so the state should always be accurate.

![Switch Flow](/media/switch.png?raw=true)

### Tasmota Sensor

This simple node listen for telemetry from the tasmota and fire a messagge with
the JSON data received. On any input the sensor data is refreshed.

![Sensor Flow](/media/sensor.png?raw=true)

## Authors

**[@DaveMDS](https://github.com/DaveMDS)** - [node-red-contrib-tasmota](https://github.com/DaveMDS/node-red-contrib-tasmota)

Initially forked from [contrib-sonoff-tasmota](https://github.com/steffenmllr/node-red-contrib-sonoff-tasmota)
