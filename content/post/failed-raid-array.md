---
title: Failed RAID Array
tags:
  - sysadmin
date: 2012-06-12
---

I woke up this morning to find 2 disks in my RAID5 array had been marked as failed!

```plaintext
md1 : active raid5 sda1[0] sdd1[4](F) sdc1[2](F) sdb1[1]
  2930276352 blocks super 1.2 level 5, 512k chunk, algorithm 2 [4/2] [UU__]

Jun 12 01:00:59 cube kernel: [12609415.780056] ata4: lost interrupt (Status 0x50)
Jun 12 01:00:59 cube kernel: [12609415.843792] end_request: I/O error, dev sdd, sector 71
Jun 12 01:00:59 cube kernel: [12609415.843831] md: super_written gets error=-5, uptodate=0
Jun 12 01:00:59 cube kernel: [12609415.843840] raid5: Disk failure on sdd1, disabling device.
Jun 12 01:00:59 cube kernel: [12609415.843843] raid5: Operation continuing on 3 devices.
Jun 12 01:21:52 cube kernel: [12610668.816042] ata4: lost interrupt (Status 0x50)
Jun 12 01:21:52 cube kernel: [12610668.816084] end_request: I/O error, dev sdc, sector 71
Jun 12 01:21:52 cube kernel: [12610668.816121] md: super_written gets error=-5, uptodate=0
Jun 12 01:21:52 cube kernel: [12610668.816130] raid5: Disk failure on sdc1, disabling device.
Jun 12 01:21:52 cube kernel: [12610668.816134] raid5: Operation continuing on 2 devices.
```

RAID5 can only continue with 1 failed disk, therefore the array at this
point was unusable.  
A short SMART test on the disks do not show any problems and I can
happily read the mdadm metadata off the disks, which makes me believe it
was a SATA controller blip that made mdadm mark the disks as faulty. The
result is I have 4 disks in 3 unique states:

```plaintext
/dev/sda1:
          Magic : a92b4efc
        Version : 1.2
    Feature Map : 0x0
      Array UUID : b11307f6:64ac80f8:87328348:bdf9ddc4
            Name : cube:0
  Creation Time : Thu Dec 22 20:18:43 2011
      Raid Level : raid5
    Raid Devices : 4

  Avail Dev Size : 1953517954 (931.51 GiB 1000.20 GB)
      Array Size : 5860552704 (2794.53 GiB 3000.60 GB)
  Used Dev Size : 1953517568 (931.51 GiB 1000.20 GB)
    Data Offset : 2048 sectors
    Super Offset : 8 sectors
          State : clean
    Device UUID : 59119dcd:719c04cb:9d5d0373:b6e7bc90

    Update Time : Tue Jun 12 09:20:31 2012
        Checksum : 2e841bd5 - correct
          Events : 3128

          Layout : left-symmetric
      Chunk Size : 512K

    Device Role : Active device 0
    Array State : AA.. ('A' == active, '.' == missing)
/dev/sdb1:
          Magic : a92b4efc
        Version : 1.2
    Feature Map : 0x0
      Array UUID : b11307f6:64ac80f8:87328348:bdf9ddc4
            Name : cube:0
  Creation Time : Thu Dec 22 20:18:43 2011
      Raid Level : raid5
    Raid Devices : 4

  Avail Dev Size : 1953517954 (931.51 GiB 1000.20 GB)
      Array Size : 5860552704 (2794.53 GiB 3000.60 GB)
  Used Dev Size : 1953517568 (931.51 GiB 1000.20 GB)
    Data Offset : 2048 sectors
    Super Offset : 8 sectors
          State : clean
    Device UUID : fdefac50:23e46ed9:efe52d06:7a05d375

    Update Time : Tue Jun 12 09:20:31 2012
        Checksum : 383ee841 - correct
          Events : 3128

          Layout : left-symmetric
      Chunk Size : 512K

    Device Role : Active device 1
    Array State : AA.. ('A' == active, '.' == missing)

/dev/sdc1:
          Magic : a92b4efc
        Version : 1.2
    Feature Map : 0x0
      Array UUID : b11307f6:64ac80f8:87328348:bdf9ddc4
            Name : cube:0
  Creation Time : Thu Dec 22 20:18:43 2011
      Raid Level : raid5
    Raid Devices : 4

  Avail Dev Size : 1953517954 (931.51 GiB 1000.20 GB)
      Array Size : 5860552704 (2794.53 GiB 3000.60 GB)
  Used Dev Size : 1953517568 (931.51 GiB 1000.20 GB)
    Data Offset : 2048 sectors
    Super Offset : 8 sectors
          State : active
    Device UUID : 72b8f327:1f411a85:87144199:4497444c

    Update Time : Tue Jun 12 01:21:22 2012
        Checksum : 24b45db9 - correct
          Events : 3109

          Layout : left-symmetric
      Chunk Size : 512K

    Device Role : Active device 2
    Array State : AAA. ('A' == active, '.' == missing)
/dev/sdd1:
          Magic : a92b4efc
        Version : 1.2
    Feature Map : 0x0
      Array UUID : b11307f6:64ac80f8:87328348:bdf9ddc4
            Name : cube:0
  Creation Time : Thu Dec 22 20:18:43 2011
      Raid Level : raid5
    Raid Devices : 4

  Avail Dev Size : 1953517954 (931.51 GiB 1000.20 GB)
      Array Size : 5860552704 (2794.53 GiB 3000.60 GB)
  Used Dev Size : 1953517568 (931.51 GiB 1000.20 GB)
    Data Offset : 2048 sectors
    Super Offset : 8 sectors
          State : clean
    Device UUID : 5cd317fe:018dead2:939ee134:ec97baba

    Update Time : Tue Jun 12 01:00:29 2012
        Checksum : 52be4913 - correct
          Events : 2780

          Layout : left-symmetric
      Chunk Size : 512K

    Device Role : Active device 3
    Array State : AAAA ('A' == active, '.' == missing)
```

Attempting to reassemble the array doesn't work out the box. Instead
it's marking all the disks as spare:

```plaintext
# mdadm --assemble  /dev/md1 --uuid=b11307f6:64ac80f8:87328348:bdf9ddc4

Personalities : [raid6] [raid5] [raid4]
md1 : inactive sda1[0](S) sdd1[4](S) sdc1[2](S) sdb1[1](S)
      3907035908 blocks super 1.2

unused devices: 
```

Not sure where to go from here....
