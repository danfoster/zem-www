---
title: GPFS License Designation - Incorrect required license field
tags:
 - gpfs
date: 2014-12-17
---

GPFS 3.3 Introduced License designations, for both client and server nodes. So after upgrading a cluster from GPFS 3.2, you are required to designate licenses with the `mmchlicnse` command.

I recently upgraded a GPFS cluster from 3.2 to 3.5 which contained 6 servers and 393 clients. Unfortuantly `mmlslicense` does not agree with me and has determined it requires 396 server licenses and 7 client licenses.

```plaintext
 Summary information
 ---------------------
 Number of nodes defined in the cluster:                        403
 Number of nodes with server license designation:                 0
 Number of nodes with client license designation:                 0
 Number of nodes still requiring server license designation:    396
 Number of nodes still requiring client license designation:      7
```

Even using the `mmchnode --client` did not demote the client.

 The [GPFS 3.5: Concepts, Planning, and Installation Guide](http://www-01.ibm.com/support/docview.wss?uid=pub1ga76041305) states:

> The GPFS server license permits the licensed node to perform GPFS management functions such as cluster configuration manager, quorum node, manager node, and Network Shared Disk (NSD) server. In addition, the GPFS Server license permits the licensed node to share GPFS data directly through any application, service protocol or method such as NFS, CIFS, FTP, or HTTP.

But no details are provided on how GPFS determines the "Required License" or what to do if it reports incorrectly. Digging in to the depths of GPFS a bit more and we can see that the `getServerLicenseClass` in the `/usr/lpp/mmfs/bin/mmglobfuncs` uses the following piece of awk to determine if a node is classed as a server or a client.

```awk
  $awk -F: -v ignoreNsdServers="$ignoreNsdServers" '                 \
    $'$LINE_TYPE_Field' == "'$VERSION_LINE'" {                       \
      { print $'$PRIMARY_SERVER_Field' >> "'$outfile'" }             \
      if ( $'$BACKUP_SERVER_Field' != "" ) {                         \
        { print $'$BACKUP_SERVER_Field' >> "'$outfile'" }            \
      }                                                              \
      { next }                                                       \
    }                                                                \
    $'$LINE_TYPE_Field' == "'$MEMBER_NODE'" {                        \
      if ( $'$DESIGNATION_Field' == "'$MANAGER'"     ||              \
           $'$CORE_QUORUM_Field' == "'$quorumNode'"  ||              \
           $'$OTHER_NODE_ROLES_Field' != ""          ||              \
           $'$CNFS_IPLIST_Field'      != ""           ) {            \
        { print $'$REL_HOSTNAME_Field' >> "'$outfile'" }             \
      }                                                              \
      { next }                                                       \
    }                                                                \
    $'$LINE_TYPE_Field' == "'$SG_DISKS'" && ! ignoreNsdServers {     \
      { n = split($'$NSD_PRIMARY_NODE_Field', nsdServer, ",") }      \
      { for (i=1; i <= n; i++) print nsdServer[i] >> "'$outfile'" }  \
      { n = split($'$NSD_BACKUP_NODE_Field', nsdServer, ",") }       \
      { for (i=1; i <= n; i++) print nsdServer[i] >> "'$outfile'" }  \
      { next }                                                       \
    }                                                                \
  ' $sdrfs
```

It turns out that the `CNFS_IPLIST_Field` (field 23) wasn't blank and triggered GPFS to believe the nodes were servers. Looking at the data in `/var/mmfs/gen/mmsdrfs`, I can see the culprit, one space!

```text{linenos=false}
%%home%%:20_MEMBER_NODE::141:134:u02n002:10.143.2.2:u02n002.data.cluster:client::::::u02n002.data.cluster:u02n002:1350:3.5.0.21:Linux:N::: :::::
```

This can easily be changed using the [mmchnode](http://www-01.ibm.com/support/knowledgecenter/SSFKCN_3.5.0/com.ibm.cluster.gpfs.v3r5.gpfs100.doc/bl1adm_mmchnode.htm) command:

```plaintext
mmchnode --cnfs-interface=DEFAULT -N {Node[,Node...] | NodeFile | NodeClass}
```

Once run against the nodes that were being classed incorrectly, `mmlslicense` now reports correctly.

```plaintext
 Summary information
---------------------
Number of nodes defined in the cluster:                        403
Number of nodes with server license designation:                 0
Number of nodes with client license designation:                 0
Number of nodes still requiring server license designation:      6
Number of nodes still requiring client license designation:    397
```
