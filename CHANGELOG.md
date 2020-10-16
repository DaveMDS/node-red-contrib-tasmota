
[v0.9.6](https://github.com/davemds/node-red-contrib-tasmota/compare/v0.9.5...v0.9.6) (2020-10-17)
--------------------------------------------------------------------------------------------------
**!!! WARNING !!!** 
The outpuf format of the Light node is changed in this release, to make it
simpler, more consistent and more configurable.
Sorry for the inconvenience.

### Features
 - Lots of new features for the Light node
 

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
