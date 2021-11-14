[v0.9.10](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.9...v0.9.10) (2021-11-14)
--------------------------------------------------------------------------------------------------

### Bug Fixes
- Fix sending numbers as Cmd payload
- Raised MQTT.js version to 4.2.8 (as NodeRed itself)


[v0.9.9](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.8...v0.9.9) (2021-04-06)
--------------------------------------------------------------------------------------------------
This is fast-fix release! Try to prevent any bad error while upgrading from the old
mqtt-broker to the new one.
Sorry for any inconvenience, but the changes was necessary, marching fast to a stable 1.0 release.


[v0.9.8](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.7...v0.9.8) (2021-04-06)
--------------------------------------------------------------------------------------------------
**!!! WARNING !!!**
With this release you need to setup again the mqtt-broker node for all your 
deployed nodes. As we do not use anymore the mqtt-broker-node included in NodeRed.

### Features
- A new custom mqtt broker node, no more use the standard one
- A new Generic Node that can send and receive any command/response
- Sensor: Add ability to choose a fixed output topic
- Add qos and retain options, for ALL published messages
- Button: support for 48 channels devices

### Bug Fixes
- Light: Fix setting color and dim with the same msg
- Broker: Fixed the wrong ClientID usage (was be prefixed by "Tasmota_")


[v0.9.7](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.6...v0.9.7) (2020-11-08)
--------------------------------------------------------------------------------------------------

### Features
 - Button: support for new Tasmota message format (fw >= 9.1.0)


[v0.9.6](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.5...v0.9.6) (2020-10-17)
--------------------------------------------------------------------------------------------------
**!!! WARNING !!!** 
The outpuf format of the Light node is changed in this release, to make it
simpler, more consistent and more configurable.
Sorry for the inconvenience.

### Features
 - Light: input commands can be passed by topic or by a js object
 - Light: light color can be changed in RGB, HSB, HEX or Color
 - Light: output now always include all the relevant info, not only che changed one
 - Light: output can be a single js object or up to 4 different output for status, ct, bright and color
 - Light: output temps can be configured to be in Kelvin, Mired or percent
 - Light: output color can be configured to be in HSB, RGB or Channels
 - Light: better status label, now also include bright and ct
 - Light: more command aliases for better compatibility with other nodes
 - Light: all input commands are now not case sensitive
 - Light: better documentation
 

[v0.9.5](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.4...v0.9.5) (2020-10-11)
--------------------------------------------------------------------------------------------------

### Features
 - Added the new Button node


[v0.9.4](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.3...v0.9.4) (2020-05-04)
--------------------------------------------------------------------------------------------------

### Features
 - Implemented a custom mqtt client, the node-red one is not for public usage
 - Shortened palette labels to be consistent with other nodes
 - New icons for all different nodes
 - Switch and Light: always accept 'on' and 'off' (not case sensitive)
 - New raw/custom tasmota command can be sent using the 'command' topic (all nodes)
 - standardjs

### Bug Fixes
 - Fixed node status label in case of errors, fix issue #4
 - Removed on/off/toggle config from Switch and Light (Tasmota does not support this)


[v0.9.3](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.2...v0.9.3) (2020-03-24)
--------------------------------------------------------------------------------------------------

### Features
 - Add Light node, by josephdouce


[v0.9.2](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.1...v0.9.2) (2020-01-07)
--------------------------------------------------------------------------------------------------

### Bug Fixes
 - Fix wildcard subscription for multi channels switch devices


[v0.9.1](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.0...v0.9.1) (2019-12-22)
--------------------------------------------------------------------------------------------------
 
### Features
 - Add custom full topic support
 - Multiple outputs ability for the Sensor node

### Bug Fixes
 - Minor bugs fixed


v0.9.0 (2019-12-08)
-------------------
 - First public release
