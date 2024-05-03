---
title: Solaris 11 - SYSV vs. IPS
tags:
  - sysadmin
date: 2013-05-30
---

It's well known that IPS has replaced SYSV in Solaris 11. It is still
possible to install SYSV style packages. But how do these 2 package
managers work together. If I use the netcat package as an example, I can
see it as a IPS package and a SYSV package:

```plaintext
df3804@empire:~$ pkg info netcat
Name: network/netcat
Summary: Netcat command
Description: The nc(1) or netcat(1) utility can open TCP connections, send
	UDP packets, listen on arbitrary TCP and UDP ports and perform
	port scanning.
Category: Applications/Internet
State: Installed
Publisher: solaris
Version: 0.5.11  Build Release: 5.11
Branch: 0.175.1.0.0.24.2 Packaging Date: Wed Sep 19 18:44:27 2012
Size: 144.83 kB
FMRI: pkg://solaris/network/netcat@0.5.11,5.11-0.175.1.0.0.24.2:20120919T184427Z
df3804@empire:~$ pkginfo -l SUNWnetcat
PKGINST:  SUNWnetcat
NAME:  Netcat Command
CATEGORY:  system
ARCH:  sparc
VERSION:  11.11,REV=2009.11.11
BASEDIR:  /
VENDOR:  Oracle Corporation
DESC:  Netcat Command   INSTDATE:  Nov 05 2012 11:15
HOTLINE:  Please contact your local service provider
STATUS:  completely installed
```

If I remove the IPS package, the SYSV package automatically disappears.

```
df3804@empire:~$ sudo pkg uninstall netcat
Packages to remove:  1
Create boot environment: No
Create backup boot environment: No
PHASE ITEMS
Removing old actions 22/22
Updating package state database Done
Updating package cache 1/1
Updating image state Done
Creating fast lookup database Done
df3804@empire:~$ pkginfo -l SUNWnetcat
ERROR: information for "SUNWnetcat" was not found
df3804@empire:~$ pkg info -r netcat
Name: network/netcat
Summary: Netcat command
Description: The nc(1) or netcat(1) utility can open TCP connections, send
	UDP packets, listen on arbitrary TCP and UDP ports and perform
	port scanning.
Category: Applications/Internet
State: Not installed
Publisher: solaris
Version: 0.5.11
Build Release: 5.11
Branch: 0.175.1.0.0.24.2
Packaging Date: Wed Sep 19 18:44:27 2012
Size: 144.83 kB
FMRI: pkg://solaris/network/netcat@0.5.11,5.11-0.175.1.0.0.24.2:20120919T184427Z`
```

If I re-install netcat and then try and remove the SYSV package, I get
an error:

```plaintext
df3804@empire:~$ sudo pkgrm SUNWnetcat
The following package is currently installed:  
SUNWnetcat Netcat Command  
(sparc) 11.11,REV=2009.11.11

Do you want to remove this package? [y,n,?,q] y  
pkgrm: ERROR: unable to change current working directory to </var>

Removal of <sunwnetcat> failed (internal error).  
No changes were made to the system.  
```

This shows that the SYSV package is just virtual. How about real SYSV
package? Taking `LGTOclnt` as an example, you can see the SYSV style
package, but no IPS style package:

```plaintext
df3804@empire:~$ pkginfo -l LGTOclnt
PKGINST:  LGTOclnt
NAME:  NetWorker Client
CATEGORY:  application
ARCH:  sparc
VERSION:  7.6.4.1.Build.1049
BASEDIR:  /usr
VENDOR: EMC Corporation.
	DESC:  NetWorker Client
PSTAMP:  athletic20120719204528
INSTDATE:  Feb 11 2013 10:16
HOTLINE:  Please contact your local service provider     
STATUS:  completely installed      
FILES:       97 installed pathnames                    
4 shared pathnames                   
16 directories                   
68 executables               
426365 blocks used (approx) 
df3804@empire:~$ pkg info | grep clnt 
df3804@empire:~$ pkg info -r clnt 
pkg: info: no packages matching the following patterns you specified were found in the catalog.  Try relaxing the patterns, refreshing, and/or examining the catalogs:`
```

Even worse is that not all IPS packages have a virtual SYSV package
associated with them. If you take a custom package for example:

```plaintext
df3804@empire:~$ pkg info bcfg2
Name: bcfg2
Summary: Configuration management client
State: Installed
Publisher: uob
Version: 1.2.4
Build Release: 5.11
Branch: None
Packaging Date: Thu May 30 17:21:19 2013           
Size: 398.49 kB           
FMRI: pkg://uob/bcfg2@1.2.4,5.11:20130530T172119Z 
df3804@empire:~$ pkginfo | grep bcfg
df3804@empire:~$
```

The real question is how do I tell the different between real SYSV
packages and "virtual ones"? Why do these virtual packages even exist?

On a clean Solaris 11 install, there are 407 SYSV style packages
installed. Determining which of these are real and which are virtual,
could be hard.
