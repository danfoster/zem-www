---
title: Advanced Format disks and ZFS (on Linux)
tags: 
 - sysadmin
date: 2013-10-19
---

As drives have been getting larger and larger, having a `512B` block size
becomes inefficient. Drive manufacturers have slowly been moving to a `4KB` block size, also known as Advanced format. An interesting article on the transition can be found over at Anadtech: "[Western Digital's Advanced Format: The 4K Sector Transition Begins](http://www.anandtech.com/show/2888)"

You can determine if your drive using `4KB` sector sizes by using smartctl:

```
# smartctl --all /dev/sdb | grep "Sector Size"
Sector Sizes:     512 bytes logical, 4096 bytes physical
```

When creating a zpool using ZFS, it queries the drive for the physical sector size to attempt to optimize disk operation. Unfortunately, some vendors emulate / report `512B` sector size. The means for each `512B` the disk actually has to read `4KB`, modify, and write `4KB` back. This can be a significant performance impact. The [Illumos Wiki](http://wiki.illumos.org/display/illumos/ZFS+and+Advanced+Format+disks) has more details on the problem.

Therefore it is best to look at your drive manufacturers tech sheet to see what the real sector size is. If you find that your drive is mis-reporting, you can for AFS on Linux to use a different sector size with the `ashift` option. It takes a bitshift value, therefore `9` is `2^9 (512B)` and `12` is `2^12 (4096B)`.

```
zpool create -o ashift=12 data mirror sda sdb
```

Or if you're adding a mirror to an existing pool

```
zpool add -o ashift=12 -f data mirror sdc sdd
```
