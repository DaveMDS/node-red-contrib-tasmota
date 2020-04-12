# node-red-contrib-tasmota

![License](https://img.shields.io/github/license/davemds/node-red-contrib-tasmota.svg)
[![npm version](https://img.shields.io/npm/v/node-red-contrib-tasmota.svg)](https://www.npmjs.com/package/node-red-contrib-tasmota)
[![npm montly](https://img.shields.io/npm/dt/node-red-contrib-tasmota.svg)](https://www.npmjs.com/package/node-red-contrib-tasmota)
[![node tasmota](https://img.shields.io/badge/Node--RED-contrib--tasmota-ee0077.svg)](https://flows.nodered.org/node/node-red-contrib-tasmota)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

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

The installed nodes have more detailed information in the Node-RED info pane, 
shown when the node is selected. Below is a quick summary.


### Tasmota Switch node

Lets you control your tasmota switch, and of course give you messagges on state changes.
The value is also requested on startup, so the state should always be accurate.

Support up to 8 channals devices, the node can be configured to send all the
status changes to a single output (in this case the topic is used to distinguish channels)
or can be configured to have N outputs (one for each channel).


![Switch1 Flow](/media/switch1.png?raw=true)
![Switch2 Flow](/media/switch2.png?raw=true)


### Tasmota Sensor node

This node listen for telemetry from the tasmota device and fire a messagge with
the JSON data received. On any input messagge fresh data is requested.

Outputs can be freely configured to extract only the data you are intrested in,
you can configure as many output as you like, giving a JSONata expression for
each output channel. 

![Sensor1 Flow](/media/sensor1.png?raw=true)
![Sensor2 Flow](/media/sensor2.png?raw=true)


### Tasmota Light node

Lets you control your tasmota light controller, and of course give you messagges on state changes.
The value is also requested on startup, so the state should always be accurate.
This node works identically to the switch node with the addition of the HSBColor input and object output for light status.

![Light Flow](/media/light.png?raw=true)


### Send any Tasmota command

All the nodes support an additional mode where you can sand one or more Tasmota 
commands to the device, using this feature you can send ANY command, not just
the ones supported by the specific node, this can be used for example to change 
device  configuration or to send specific commands not supported by the node itself. 

The list of all the commands supported by Tasmota is available on this
[documentation](https://tasmota.github.io/docs/Commands/) page.

To send commands to the device just send a message to the node with `command`
as topic and the Tasmota command as payload. 

Three payload formats are supported:
1. string payload: `'CMD <param>'`
2. string list payload: `['CMD <param>', 'CMD <param>', ...]`
3. object payload: {'CMD': 'param', 'CMD': 'param', ...}

Note that the object format does not guarantee the order of delivered messagges,
thus if commands order is important you must use the list format.


## Authors

**[@DaveMDS](https://github.com/DaveMDS)**

**[@josephdouce](https://github.com/josephdouce)**


Initially forked from [contrib-sonoff-tasmota](https://github.com/steffenmllr/node-red-contrib-sonoff-tasmota)
