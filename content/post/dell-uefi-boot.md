---
title: UEFI Network Boot
category: sysadmin
tags: 
 - dell
 - uefi
 - linux
date: 2017-01-27
---

UEFI Boot has been supported on Dell PowerEdge servers since Generation 11 (~2010). But network booting via a PXE ROM to provision an OS is not a well know and established procedure, so I've been lazy and always placed my Dell PowerEdge servers in Legacy BIOS mode. Recently I was struggling with a R730 not accepting keyboard input on the PXELINUX menu, which felt like an issue with "Legacy USB emulation" not being enabled in the BIOS, but I couldn't find any such setting. Therefore I decided it was time to bite the bullet and get UEFI Network boot working.

My first hurdle was not getting a IP from the DHCP server when attempting to network boot. The process went by so quickly, it felt like it wasn't even waiting for a DHCP lease. With some help from our friendly local DHCP admin, we confirmed that it wasn't even requesting one.

```plaintext
Booting from PXE Device 1: Integrated NIC 1 Port 1 Partition 1
PXE: No media detected.
Boot Failed: PXE Device 1: Integrated NIC 1 Port 1 Partition 1
```

This particular server came with a  "QLogic 57800 2x10Gb BT + 2x1Gb" network
card. It turned out the firmware needed updating to make the network book
functional. Downloading [QLogic FastLinQ Network Adapter Device
Firmware](http://www.dell.com/support/home/uk/en/rc1039769/product-support/product/poweredge-r730/drivers)
version `08.07.26` and applying it via the iDRAC solved the problem.

It is common to use `pxelinux.0` as a bootloader for BIOS PXE ROM boots and traditionally your tftp root might look something like this:

```bash
/var/lib/tftpboot
├── menu.c32
├── pxelinux.0
├── pxelinux.cfg
│   ├── default
│   └── 00:11:22:33:44:55
└── CentOS-7-x86_64
    ├── initrd.img
    ├── upgrade.img
    └── vmlinuz
```

`pxelinux.0` and `*.c32` are BIOS specific and therefore we need to supplement them with EFI compatible versions. All the required files can be found in the syslinux distribution hosted in the [Kernel archives](https://www.kernel.org/pub/linux/utils/boot/syslinux/) . At the time of writing, the latest version was `6.03`.

* For the bootloader, we require:
  * `efi32/syslinux.efi` from `efi32/efi/syslinux.efi`
  * `efi32/ldlinux.e32` from `efi32/com32/elflink/ldlinux/ldlinux.e32`
  * `efi64/syslinux.efi` from `efi64/efi/syslinux.efi`
  * `efi64/ldlinux.e64` from `efi64/com32/elflink/ldlinux/ldlinux.e64`
* For the boot menu, we require:
  * `efi32/menu.c32` from `efi32/com32/menu/menu.c32`
  * `efi32/libutil.c32` from `efi32/com32/libutil/libutil.c32` 
  * `efi64/menu.c32` from `efi64/com32/menu/menu.c32`
  * `efi64/libutil.c32` from `efi64/com32/libutil/libutil.c32` 

 The magic is that your pxelinux.cfg loads `c32` modules relative to the bootloader directory (e.g. `default menu.c32`), therefore it's possible to make a shared pxelinux.cfg configs as long as all the required modules have their own version relative to the bootloader. With a bit of reshuffling of the BIOS bootloaders and a sprinkling of symlinks, we end up with something like this:

```bash
 /var/lib/tftpboot
 ├── bios
 │   ├── CentOS-7-x86_64 -> ../CentOS-7-x86_64
 │   ├── menu.c32
 │   ├── pxechain.com
 │   ├── pxelinux.0
 │   ├── pxelinux.cfg -> ../pxelinux.cfg
 ├── CentOS-7-x86_64
 │   ├── initrd.img
 │   ├── upgrade.img
 │   └── vmlinuz
 ├── efi32
 │   ├── CentOS-7-x86_64 -> ../CentOS-7-x86_64
 │   ├── ldlinux.e32
 │   ├── libutil.c32
 │   ├── menu.c32
 │   ├── pxelinux.cfg -> ../pxelinux.cfg
 │   └── syslinux.efi
 ├── efi64
 │   ├── CentOS-7-x86_64 -> ../CentOS-7-x86_64
 │   ├── ldlinux.e64
 │   ├── libutil.c32
 │   ├── menu.c32
 │   ├── pxelinux.cfg -> ../pxelinux.cfg
 │   └── syslinux.efi
 └─── pxelinux.cfg
     ├── default
     └── 00:11:22:33:44:55
```

We then need the DHCP server to pass the correct bootloader filename to the client. As per BIOS PXE booting, efi expects to use the `filename` DHCP option. Therefore we need to pass one of the following DHCP options depending on the type of client. This could either be done manually on a per client basis, or with a conditional on the `vendor-class-identifier`:

```bash
if substring (option vendor-class-identifier, 15, 5) = "00000" {
  filename "bios/pxelinux.0";
} elsif substring (option vendor-class-identifier, 15, 5) = "00006" {
  filename "efi32/syslinux.efi";
} else {
  filename  "efi64/syslinux.efi";
}
```

Finally, you need to make sure your Linux install creates a suitable EFI partition. For anaconda installers using a kickstart file, it's a simple as adding the following to your parition definition

```bash
part /boot/efi --fstype vfat --size=200
```
