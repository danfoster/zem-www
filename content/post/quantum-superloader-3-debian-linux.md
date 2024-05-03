---
title: Quantum Superloader 3 on Debian Wheezy
tags:
 - sysadmin
date: 2013-10-19
---

I am the proud owner of a Quantum Superload 3, with a HP LTO-4 drive. The host connectivity is by SCSI, which I've never really had to use before. The following is the tale of me getting it to work.

## SCSI Controller

The SCSI Controller I have is an QLogic card and shows up in `lspci` as follows:

```bash
07:04.0 SCSI storage controller: QLogic Corp. ISP10160 Single Channel Ultra3 SCSI Processor (rev 06)
07:05.0 SCSI storage controller: QLogic Corp. ISP10160 Single Channel Ultra3 SCSI Processor (rev 06)
```

This works with the `qla1280` driver in the Linux kernel. When I first loaded the module, the host did not show up under `/sys/class/scsi_Host`. After looking at the logs, it became apparent that I needed a firmware images.

```bash
Oct 17 18:05:13 prosser kernel: [   17.900381] Failed to load image "qlogic/12160.bin" err -2
Oct 17 18:05:13 prosser kernel: [   17.900424] scsi(5): initialize: pci probe failed!
Oct 17 18:05:13 prosser kernel: [   17.900461] qla1x160: Failed to initialize adapter
Oct 17 18:05:13 prosser kernel: [   17.900561] qla1280 0000:07:05.0: PCI INT A disabled
```

Debian provides the correct firmware in the non-free repo under the package [`firmware-qlogic`](http://packages.debian.org/wheezy/firmware-qlogic)

After installing the firmware and reloading the driver, the Controller worked as expected. Remember that `modprobe` fails silently if the module is already loaded.

## The Library

Once the SCSI controller was up and running, both the drive and the changer are visible.

```bash
# lsscsi -g
[1:0:0:0]    disk    ATA      Corsair Force 3  5.02  /dev/sda   /dev/sg0
[5:0:0:0]    disk    ATA      SAMSUNG HD103UJ  1AA0  /dev/sdb   /dev/sg1
[6:0:0:0]    disk    ATA      SAMSUNG HD103SJ  1AJ1  /dev/sdc   /dev/sg2
[7:0:0:0]    disk    ATA      WDC WD10EADS-00L 01.0  /dev/sdd   /dev/sg3
[8:0:0:0]    disk    ATA      WDC WD10EADS-11M 01.0  /dev/sde   /dev/sg4
[9:0:0:0]    disk    ATA      Hitachi HDS72101 JP4O  /dev/sdf   /dev/sg5
[10:0:0:0]   disk    ATA      WDC WD10EADS-00L 01.0  /dev/sdg   /dev/sg6
[11:0:5:0]   tape    HP       Ultrium 4-SCSI   B35Z  /dev/st0   /dev/sg7
[11:0:5:1]   mediumx QUANTUM  UHDL             0061  /dev/sch0  /dev/sg8
```

The `-g` option outputs the scsi generic device file name in the last column. This is useful for manipulating the changer later.

I've confirmed I can write a read to a tape using the HP tape drive at /dev/st0. Remember that `/dev/stX` auto-rewinds and `/dev/nstX` does not.

```bash
root@prosser ~
# find test
test
test/hello.txt
root@prosser ~
# tar -czf /dev/st0 test
root@prosser ~
# rm -r test
root@prosser ~
# tar -xvzf /dev/st0 test
test/
test/hello.txt
```

I can also interrogate the contents of the library using `mtx`. This has to be done using the generic SCSI device. i.e. `/dev/sg8`, `/dev/sch0` will not work.

```bash
root@prosser ~
# export CHANGER=/dev/sg8
root@prosser ~
# mtx status
  Storage Changer /dev/sg8:1 Drives, 8 Slots ( 0 Import/Export )
Data Transfer Element 0:Full (Storage Element 6 Loaded):VolumeTag = NDD311L3                        
      Storage Element 1:Empty
      Storage Element 2:Empty
      Storage Element 3:Empty
      Storage Element 4:Empty
      Storage Element 5:Empty
      Storage Element 6:Empty
      Storage Element 7:Empty
      Storage Element 8:Full :VolumeTag=NDD312L3     
```
