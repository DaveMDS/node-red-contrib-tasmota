# node-red-contrib-tasmota

Tasmota devices for building automation inside [Node-RED](https://nodered.org/).

The goal of the project is to support a wide set of features exposed by the Tasmota firmware over MQTT.

## Getting Started

This assumes you have [Node-RED](https://nodered.org) already installed and working, if you need to install Node-RED see [here](https://nodered.org/docs/getting-started/installation).

Install via Node-RED Manage Palette interface

```
node-red-contrib-tasmota
```

Install via npm

```shell
$ cd ~/.node-red
$ npm install node-red-contrib-tasmota
# then restart node-red
```

## Included Nodes

The installed nodes have more detailed information in the Node-RED info pane, shown when the node is selected. Below is a quick summary

### Tasmota Smitch

Lets you control your tasmota switch, and of course give you messagges on state changes.
The value is also requested on startup, so the state should always be accurate.

### Tasmota Sensor

This simple node listen for telemetry from the tasmota and fire a messagge with
the JSON data received. On any input the sensor data is refreshed.

## Authors

**[@DaveMDS](https://github.com/DaveMDS)** - [node-red-contrib-tasmota](https://github.com/DaveMDS/node-red-contrib-tasmota)

Initially forked from [contrib-sonoff-tasmota](https://github.com/steffenmllr/node-red-contrib-sonoff-tasmota)
