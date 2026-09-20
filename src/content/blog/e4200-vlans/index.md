---
title: VLAN support on Cisco E4200 with DD-WRT
tags: 
 - vlan
 - switch
 - dd-wrt
date: 2014-05-08
cover:
    image: e4200.jpg
---

I had a need to run my home router as a router-on-a-stick, i.e. multiple VLANs on a single interface. This requires a switch with VLAN support. I already have a Cisco E4200 as a 5Ghz WAP with 1Gb switches which I would like to use. Using the [DD-WRT](http://www.dd-wrt.com/) firmware, it [supports](http://www.dd-wrt.com/wiki/index.php/VLAN_Support) VLAN tagging. The rest of this post is my experience getting VLAN tagging to work.


## Objective

The objective was to use all 5 ports as switch ports (the 4 LAN ports and the "Internet" port). With the following configuration

* VLAN 1 should be for LAN traffic
* VLAN 9 should be for WAN traffic
* The Internet port should be an access port on VLAN 9
* Ports 2-4 should be access ports on VLAN 1
* Port 1 should be a trunk port, allowing VLAN 9 and native VLAN 1

## Implementation

The best source of information is the [Switched Ports](http://www.dd-wrt.com/wiki/index.php/Switched_Ports) wiki page on the DD-WRT wiki.

The most important part is **Do not use the web interface** for configuring VLANs. It doesn't show the correct information, can break your config and doesn't support 802.1q trunks.

You can see the current configuration of the ports will the following commands::

```bash
root@DD-WRT:~# nvram show | grep vlan.*ports
vlan2ports=4 8
vlan0ports=1 2 3 4 5*
vlan1ports=0 1 2 3 8*
size: 30956 bytes (34580 left)
root@DD-WRT:~# nvram show | grep port.*vlans
port5vlans=0 1 16
port3vlans=0
port1vlans=0
size: 30956 bytes (34580 left)
port4vlans=0
port2vlans=0
port0vlans=1
root@DD-WRT:~# nvram show | grep vlan.*hwname
vlan2hwname=et0
vlan1hwname=et0
vlan0hwname=et0
size: 30956 bytes (34580 left)
```

Details on the [Switched Ports](http://www.dd-wrt.com/wiki/index.php/Switched_Ports) page describe these options well and I won't duplicate that information here. The missing information is how the port numbers on the CLI relate to the physical ports.

| CLI Port | Physical Port  |
| -------- | -------------- |
| 0        | LAN 4          |
| 1        | LAN 3          |
| 2        | LAN 2          |
| 3        | LAN 1          |
| 4        | WAN / Internet |


My final configuration is as follows:

```bash
root@wap:~# nvram show | grep vlan.*ports
vlan2ports=8
vlan0ports=1 2 3 4 5*
vlan9ports=4 3t
vlan1ports=0 1 2 3 8*
size: 31705 bytes (33831 left)
root@wap:~# nvram show | grep port.*vlans
port5vlans=0 1 9 16
port3vlans=0
port1vlans=0
port4vlans=0
port2vlans=0
port0vlans=1
size: 31705 bytes (33831 left)
root@wap:~# nvram show | grep vlan.*hwname
vlan2hwname=et0
vlan9hwname=et0
vlan1hwname=et0
vlan0hwname=et0
size: 31705 bytes (33831 left)
```

Happy VLAN tagging!
