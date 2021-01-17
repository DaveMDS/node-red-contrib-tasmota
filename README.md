# node-red-contrib-tasmota

![License](https://img.shields.io/github/license/davemds/node-red-contrib-tasmota.svg)
[![npm version](https://img.shields.io/npm/v/node-red-contrib-tasmota.svg)](https://www.npmjs.com/package/node-red-contrib-tasmota)
[![node tasmota](https://img.shields.io/badge/Node--RED-contrib--tasmota-ee0077.svg)](https://flows.nodered.org/node/node-red-contrib-tasmota)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![npm total](https://img.shields.io/npm/dt/node-red-contrib-tasmota.svg)](https://www.npmjs.com/package/node-red-contrib-tasmota)
[![npm montly](https://img.shields.io/npm/dm/node-red-contrib-tasmota.svg?label=)](https://www.npmjs.com/package/node-red-contrib-tasmota)
[![npm weekly](https://img.shields.io/npm/dw/node-red-contrib-tasmota.svg?label=)](https://www.npmjs.com/package/node-red-contrib-tasmota)

![Run NPM tests](https://github.com/DaveMDS/node-red-contrib-tasmota/workflows/Run%20NPM%20tests/badge.svg)


Tasmota devices integration for building automation inside [Node-RED](https://nodered.org/).

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

## Available Nodes

- [Switch node](#tasmota-switch-node)
- [Sensor node](#tasmota-sensor-node)
- [Button node](#tasmota-button-node)
- [Light node](#tasmota-light-node)


### Tasmota Switch node

Lets you control your tasmota switch, and of course give you messagges on state changes.
The value is also requested on startup, so the state should always be accurate.

Support up to 8 channals devices, the node can be configured to send all the
status changes to a single output (in this case the topic is used to distinguish channels)
or can be configured to have N outputs (one for each channel).


![Switch Flow1](media/switch1.png?raw=true)
![Switch Flow2](media/switch2.png?raw=true)


### Tasmota Sensor node

This node listen for telemetry from the tasmota device and fire a messagge with
the JSON data received. On any input messagge fresh data is requested.

Outputs can be freely configured to extract only the data you are intrested in,
you can configure as many output as you like, giving a JSONata expression for
each output channel. 

![Sensor Flow1](media/sensor1.png?raw=true)
![Sensor Flow2](media/sensor2.png?raw=true)


### Tasmota Button node

This node receive button presses from a tasmota button device, it support
all the tasmota button actions (TOGGLE, HOLD, SINGLE, DOUBLE, TRIPLE, etc...) and also multi buttons devices.
The action is sent as a simple string on the node output.
The node can be configured to send all press actions to a single output 
(in this case the topic is used to distinguish channels) 
or can be configured to have multiple outputs (one for each channel).

NOTE: Tasmota changed the Buttons/Switch functionality in firmware 9.1.0! 
This node support both formats, but it's raccomended to update to a recent Tasmota firmware.

See the detailed [Tasmota documentation](https://tasmota.github.io/docs/Buttons-and-Switches/) page for an in deep explanation. 
Also look at: 
[SwitchMode](https://tasmota.github.io/docs/Commands/#switchmode),
[SetOption73](https://tasmota.github.io/docs/Commands/#setoption73),
[SetOption114](https://tasmota.github.io/docs/Commands/#setoption114),
[SetOption1](https://tasmota.github.io/docs/Commands/#setoption1),
[SetOption13](https://tasmota.github.io/docs/Commands/#setoption13),
[SetOption32](https://tasmota.github.io/docs/Commands/#setoption32)
and setup the tasmota device to suite your needs.


![Button Flow](media/button1.png?raw=true)


### Tasmota Light node
Lets you control your tasmota light bulb/controller, and of course give you messagges on state changes.
The value is also requested on startup, so the output state is always accurate and full of all the available light info.

![Light Flow1](media/light1.png?raw=true)
![Light Config](media/light2.png?raw=true)


#### Turn on/off (simple mode)
To simply changes the light on / off state just send a **msg.payload** (without any topic) 
using one of the following values:

| Topic    | Payload  | Values                                              |
|:--------:|:--------:|-----------------------------------------------------|
|          |  boolean | true / false                                        |
|          |    int   | 1 / 0                                               |
|          |   string | 1 / 0 / on / off / true / false / toggle            |
 
#### Input (topic mode)
To change a single light property send a **msg.payload** with a specific topic:

| Topic       | Payload               | Information                                         |
|:-----------:|:---------------------:|-----------------------------------------------------|
| on          | same as simple mode   | Turn on / off / toggle the light                    |
| bright      | int                   | Change the light brightness, range 0 to 100         |
| ct          | int                   | Color temperature, values (from warm to cold) can be expressed in Mired (500-153), Kelvin(2000-6500) or percent(0-100)  |
| rgb         | int array or string   | Change the RGB colors, can be a string: "255,0,0" (for red) or an array of int: [255, 0, 0] |
| hsb         | int array or string   | Change the HSB values, like rgb can be a string or an array. Ranges are: 0-360, 0-100, 0-100 |
| hex         | string                | Hexadecimal color notation: `#CWWW`, `#RRGGBB`, `#RRGGBBWW` or `#RRGGBBCWWW` (with or without the starting `#`) |
| color       | string                | Can be `red`, `green`, `blue`, `orange`, `lightgreen`, `lightblue`, `amber`, `cyan`, `purple`, `yellow`, `pink`, `white`, or `+`/`-` to switch to next/previous color |

#### Input (object mode)
The same values of the topic-mode can be used all togheter in a single js object. 
To issue multiple commands at the same time just send a **msg.payload without any topic** like:
`{'on': true, 'bright': 25, 'color': 'red'}` and so on, the same rules of the topic mode apply.

#### Input aliases
To provide a bit of compatibility with other famous nodes (like node-red-contrib-huemagic)
a set of aliases is provided for the commands. Aliases can be used in both topic-mode and object-mode:

| Command | Aliases              |
|:-------:|:--------------------:|
| on      | state, power         |
| bright  | brightness, dimmer   |
| ct      | colorTemp            |
| hsb     | hsbColor             |
| rgb     | rgbColor             |
| hex     | hexColor             |

#### Node output(s)
The light node output can be configured to suite your need, there are two main modes:
 * Single output mode. In this mode the node will have a single output and will send a js object with the following **msg.paylod** properties:

| Property | Type    | information                     |
|:--------:|:-------:|---------------------------------|
| on       | boolean | true or false                   |
| bright   |   int   | Brightness, range from 0 to 100 |
| ct       |   int   | Color temperature, can be configured to send values in Kelvin, Mired or percent |
| color    |   Any   | Light colors, can be configured to be RGB [0-255,0-255,0-255], HSB [0-360,0-100,0-100], or Channels [0-100, 0-100, 0-100] |

 * Otherwise you can configure the node to have from 2 to 4 outputs, providing a single value of the table above on each separate output.
   First output for `on`, second for `bright`, third for `ct` and fourth for `color`.


### Send custom Tasmota commands

All the nodes support an additional mode where you can send any Tasmota 
command or a list of commands to the device. This can be used for example to change 
device configuration or to send specific commands not supported by the node itself. 

The list of all the commands supported by Tasmota is available on this
[documentation](https://tasmota.github.io/docs/Commands/) page.

Three payload formats are supported:
1. string payload: `CMD <param>`
2. JSON list payload: `["CMD <param>", "CMD <param>", ...]`
3. JSON object payload: `{"CMD": "param", "CMD": "param", ...}`

Note that the object format does not guarantee the order of delivered messagges,
thus if commands order is important you must use the list format.

Example:
To send the command "BlinkCount 12" to a tasmota switch device, create a tasmota-swich node and set the device id(topic) to the correct value for your device. Then add an inject node and connect it. In the Inject node settings, set the topic to `command`. Set the payload type to string and the payload to `BlinkCount 3`. 

To send a list of commands set the payload type to JSON. An example of a command list syntax is:
`["BlinkCount 12", "BlinkTime 3", "Power blink"]`


## Authors

**[@DaveMDS](https://github.com/DaveMDS)**

**[@josephdouce](https://github.com/josephdouce)**


Initially forked from [contrib-sonoff-tasmota](https://github.com/steffenmllr/node-red-contrib-sonoff-tasmota)
