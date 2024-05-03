---
title: GPFS User Group Meeting 2015
tags:
 - gpfs
date: 2015-05-22
---

The following post contains my notes from the [GPFS User Group meeting](http://www.gpfsug.org/may-2015-agenda/) in York.

## Keynote

###### *Doris Conti, Director, Spectrum Scale (GPFS) and HPC SW Product Development*

Doris' Keynote started the day with a theme that continued throughout the day:
IBM are encouraging their users to get in touch with developers to help steer
the direction of GPFS. They are also looking for customers to join Beta
programs for various components of GPFS.

## 4.1.1 Roadmap / High-level futures

###### *Scott Fadden*

First of all we received a friendly reminder of the new naming and it's
mapping: Spectrum Scale (GPFS) is part of Spectrum Storage. Spectrum control
can now manage / monitor Spectrum Scale.

GPFS 4.1.1 will be release in June 2015 and will contain the following new features:

* Asynchronous DR via AFM
* NFS 4.0
* SMB 3.0
* Openstack Cinder, Swift, mania support

GPFS 4.2 aims to be released in Q3 2015.

### The Protocols

GPFS is aiming to provide a single name space to: Client workstations, hardoop,
compute farm, user and applications. They provide this by providing a number of
access methods that they refer to as "The Protocols". These Include:

* POSIX
* NFS
* SMB/CIFS
* Map Reduce
* Openstack

A "Protcol Node" is a bundled software stack that aims to:

* Simplify the install process.
* Provide better locking (similar as CTDB does for CIFS) and failover management via the Cluster export services (CES).
* New performance tools and metrics. There will be new mmcommands for performance information. Will also provide a xymon interface.

#### NFS

Moving from the Kernel NFS server to
[Ganesha](https://github.com/nfs-ganesha/nfs-ganesha/wiki) 2.2, a userland NFS
server. This move is for increased performance and the ability for GPFS to be
able to fix problems. The former is always a surprise to me, that a userland
service can perform better. But the latter could not come quick enough, the
fact that GPFS has to resort to rebooting a node if it detects an NFS lock
gives some insight to how problematic the kernel NFS server can be.

Ganesha also has good support for NFSv4 as well as NFSv3.

In some situations there is a group limit of 16 that needs to be addressed, it depends on the authentication protocol being used. IBM have a table for this somewhere.

#### Object

GPFS will provide a fully compliant Openstack Swift REST interface (PUT, POST, GET, DELETE).
There will also be an Amazon S3 protocol emulation layer for those users who require it.

#### SMB:

The SMB offering uses samba 4.3. It has full support for SMB2 and SMB2.1. 
SMB3 support includes all the manadatory features plus SMB encryption.


[Directory Change Notification](https://msdn.microsoft.com/en-us/library/jj216044.aspx) is turned
off by default as it has performance impact, but can be enabled if required.

A summary of some of the limits of each protocol:


|                           | NFS              | Object         | SMB             |
| ------------------------: | ---------------- | -------------- | --------------- |
| **Max # Protocol Nodes:** | 32               | 16             | 16              |
|    **Max # of "shares":** | 100 exports      | 4M containers  | 1000 exports    |
| **Max # of connections:** | 4000-5000 / node |                | 3000 / per node |
|       **Max # of files:** | 9 billion / FS   | 1 billion / FS | 9 billion / FS  |
|     **Rolling Upgrade?:** | Yes              |                |                 |

### Client Experience

IBM are keen to make the install process easier. I'm personally not sure how
useful this is as the install process isn't that difficult already and it will
usually be performed by someone fairly experienced.

What's not interesting is that upgrades should become easier. One of the big benefits is that kernel module creation and installation should be automated

### Immutable filesets

Immutable filesets were introduced in 2007 for the Integration archive product. Now it's being exposed as a standard GPFS feature via a new `mmchfilset` option. a fileset will be able to be in the following modes:

* regular
* advistory: hardline is not allowed, directory can not be renamed or deleted unless empry.
* non-compliant
* compliant

### Other

Other interesting new features include:

* `mmbackup` will be able to operate on a per fileset level instead of filesystem. Should make it easier to split backups in to more managable chunks.
* There is a new preffered read option, `read fastest`, which should improve read performance.
* The requirement for all members of the cluster to have password-less root SSH access to each other is being phased out. It is being replaced by a dedicated command protocol with user level authentication. It's possible to do this today and IBM were reaching out for users to contact them (<gpfs@us.ibm.com>) if they are interested in trying it.
* Speed-up inode expansion
* GPFS will allocate token manager memory on the fly, which should remove the need to adminstrators to tune this value themselves.
* Check and maintain disk descriptors on the fly, not just at startup time. There were some situations where NSD descriptors were getting wiped and then GPFS would be be able to find the NSD on restart. One common situation was when a disk has previously been used with a GPT partition table, the NSD descriptor would overwrite the primary GPT table, but leave the backup tables on disk. Some BIOSes would find these backup tables and "helpfully" restore the primary GPT table. GPFS should now also remove any backup GPT partition tables when an NSD is created.
* It's possible to use your own sort command for `mmapplypolicy` by using the `--sort-command` option.
* Placement policy now default to first data pool. Which prevents out of space errors on new filesystems if you forget to configure a default policy.
* It now faster and provides more information when deleting bad/dead disks
  * The `empty` option does not scan for drained data
  * Possible to  collect information on what files were affected from a dead disk. `--inode-criteria criteriafile -o inoderesultfile` prints interesting inodes.
* It was asked if ESS will be MLS comlient. IBM have not been through the process, but probably would be if a customer asked.

## Failure Events, Recovery & Problem determination

###### *Scott Fadden*

### NSD Protocol

> Blame the network... and use `nsdperf` to do it

`nsdperf` is similar to `iperf`, but it simulates NSD protocol traffic instead of just IP traffic. This has the following advantages.

* Works with TCP or RDMA
* Many-to-many traffic flows, instead of one-to-one.
* Tests many parameters easily

While `nsdperf` is in the sample directory, it does not require GPFS to be installed on the system.

Since `nsdperf` just emulates the NSD protocol, it's not useful for looking at real NSD traffic on disk. `mmdiag --iohist` is more useful in that case.

### Looking in to AFM

Can query the current AFM state using `mmafmctl fs1 getstate`

A common assumption is that if the queue length is never zero, the AFM must not
be syned. This might not be true as it would be read operations in the queue.
Use `mmfsadm dump afm` to see the active operations. If there are long running
ones, this might suggest a problem.

Afm stats in `mmpmon` should also be able to show useful performance information.

## Monitoring IBM Spectrum Scale using IBM Spectrum Control (VSC/TPC)

###### *Christian Bolik*

Spectrum Control is the new name for IBM Tivoli Storage Productivity Center (TPC). It traditionally provided improved visibility in to FC fabrics and is now expanding in to monitoring GPFS

Unfortunately it currently only updates on a daily basis, so is limited in its usage for alerting. It is also a separatelt licenced product.

The following is questions are addressed by Spectrum control (TPC 5.2.5)

* Which of my clusters are running out of free space?
* Which of my clusters or nodes have a health problem?
* Which file systems and pools and running out of capacity?
* Which file systems are mounted on which nodes?
* How much space is occupied by snapshots? are there any potentially obsolete ones?
* Which quotas are close to being exceeded or have already been exceeded?
* Which filesets are close to running out of free inodes?
* Which nsds are at risk of becoming unavailable, or are unavailable?
* Are the volumes backing my NSDs performing OK?
* Are alll nodes fulfilling critical roles in the cluster up and running?

Planned content in 5.2.6:

* Remote cluster mounts: which file systems are mounted from or by other clusters?
* Ability to monitor GPFS cluster without requiring root credentials.

Future:

* Performance monitoring of most relevant metrics (node and file system I/O stats)
* Visibility into Spectrum Scale objects, GNR, and AFM
* Provisioning of filesets, shares, nsds
* Policy visibility

Metric data is kept for 3 months by default, but can be tuned. It is stored in a DB2 database and therefore could be dumped out if needed.

[IBM storage management blog](http://ibm.co/172TdgH)

## User Experience from University of Birmingham/CLIMB

##### *Simon Thompson*

Research Support do:
* Research data storage and management
* research data noetworking
* visualisation
* hpc
* specialist projects (e.g. CLIMB)

HPC:
* GPFS 4.1
* 2 NSD servers
* DS 3500 stoage arrays

If he could change one thing: I/O heat mapping

* gnr should support scale out
* s3 hsm driver
* support write caching layer for small I/O
* finer grained user control

Research Data Storage:

Replicated across 2 data centres
separate IB fabrics at each DC
10GbE links between DCs
Extended SAN based - users  can buy space
designed and built in partnership with OCF
SAN over dark fibre.

Clients access a separate Samba cluster
plan to put a tape layer in.
How will samba play with HSM? Archive bit?
Powerfolder sync and share pilot - interesting to see how it works with GPFS.

GPFS - Openstack

allow usesrs to archive VMs and datasets. part of the archiving process.

Archiving in to a ceph cluster. How to do that automaticaly? Would be nice if there was a HSM S3 drvier.

They are using the cinder driver.

GPFS inside the VMs?

* Want PSOIX style access to shared datasets, can't trust the VM, so GPFS, NFS not suitable.

## User Experience from NERSC

##### *Jason Hick*

NERSC has 21 different NFS server.

Utilization on group clusters was sporadic
ethernet interconnect was uder-provisioned

### Retired netapps filers by migrating data to HPSS archival storage

* 21 Netapp filers, 7 years or older
* users resistant at first, but were surprised at performance
* Developed their own data management interface (JAMO) that moves data automatically between filesystem and archive

Introduced new GPFS scratch file system in Genepool cluster

Diverse workload:

* lots of chrun 100M KB-sized files per day and then deleting them
  * have not address that yet
  * especially challenging with use of snapshots and quota
* users questing 10 GBs / sec bandside
  * use separate filesystem
* production filesystem

Enabled Disaster protections:

* enabled GPFS snapshots
* backup to HPSS
* custom software (PIBS) to perform incremental backups on PB-sized filesystems
  TCP kernel setting:
  need smaller initial send buffers

prevent head-of-line blocking - saw congestion like symptoms without congestion traffic.

They preferred Debian and initially used Debian 5 with GPFS 3.3

* high degree of expels - memory errors causing GPFS asserts

Switched to Debian 6 with GPFS 3.4 - all memory errors ceased, reduced the number of expels

Move from ethernet to IB:

* IB expels much less frequent, performance more consistent. But have routing/topology challenges.

```plaintext
data 1PB
seq 0.5PB
projectb 2.5PB - scratch
```

scheduler upgrade/enhancements: consider better features for job deps
workflow software: help manage work external to compute

data management tools: SRM/BeStMan, iRODS, GPFS Policy Manager

## AFM & Async DR Use Cases

##### *Shankar Balasubramanian*

DR for spectrum scale:

* file level async replication of data using AF
* active passive model
* strict 1-1 relationship between primary and secondary
* supports nfsv3 and GPFS bacnend protocol for primary to secondary communication
* supports RPO

only works on GPFS independent filesets

no way of having multiple secondaries

primary is an AFM cache fileset
secondary if AFM home filesete
can be created independantly
only the priary can write to the secondary - it's RO for the rest of the world
data flows always from primary to secondary
primary is continuously accessable even when secondary is not accessible
PROs are maintained using peer-peer snapshots between primary and secondary
failover to secondary is done by upgraing the secondary to a primary (acting primary)
failback to old primary is done through a downgrade of acting primary to secondary


cannot go back more than 2 snapshots (is this really true?!)
15 mins is the default snapshot period.
async delay is tunable

RPO misses:

* RPO is missed due ot network delay
AFM_PRO_MISS
mmaddcallback to reister event handling script.

     check every 5 mins if the RPO is still in the gateway queue

## Use cases

HSM support not in the first release.

Railure recovert

failback, create a ...

Avail in 4.1.1


# mmbackup + TSM Integration


##### *Stefan Bender*

bob: mmigmbackup - backup metadata

stefan.bender@de.ibm.com

mmbackup
- musch faster file system scanning time allows tsm backups to scale to many more objects compared to tsm progressive incremential

    cycle:
    start mmbackup
    use existing shadow DB or query TSM server to generate a new shadow database
    perform filesystem scan
    compare scan reults and shadow database
    perform expire / upgrade / send by using the TSM CA CLI
    backup shadow DB

3.5 TL3 updates:
* new shadow DB debian,
*    - reduce number of sort() interations to inlucde performance
*    - allow paraellel update on the shadow DB
*    - restartable backups - shadow db shows current prgoress and work remaining
*    - elimination of the post processing phase
*    - improved failure detection for TSM failures
*
* exploit incremental backup function
 - detect CTIME changes withdata or MTIME changes and run incremental
 -  CTIME, owner, group mode change - run dsmc incremental
 -  MTIME or file size change - run dsmc selective
 -  detech HSM migration changes
 -   - migration state change only - run gsmc incremental

ACL or extended atrributes changes are considered file changes in TSM eyes

4.1 updates

improved env verification

* verify filesystem is mounted
* verify TSM BA client is installed
* verify TSM CA client version is qual on all nodes
* verify a session with a TSM server can be established
* verify helper tool version is correct
* verify TSM options are set
    - QUOTESARELITERAL (use with mmbackup --noquotes)
    - SKIPACL

mmbackup options  - TSM
--max-backup-size - TXBYTELIMIT
max-backout-count max-expire-count  - TXGROUPMAX
expire-threads
backup -threads - (TSM BA client: RESOURCEUTILIZATION) - MAXSESSION MAX

mmbackup options for maax-backup-size should be larger than TSM server. TSM server will chunk it in to batches.

TSM CA client file list expiration processing importved in TSM 6.4.1 - can do multiple expirations per transactions (currently only 1)

TSM include and exclude options hay have significant impact on scan performance.

iuse as few EXCLUDE as possible
avaoid using INCLUDE. use exclude instead
do not use EXCLUDE /dir/.../*, use EXCLUDE.DIR instead
do not combine exclude and include for one subtree
if include is only used to assign right management class in TSM, use mmbackup service flag is used 

serialize backups of different file systems!

charabter limitations:
 files with ctrl=x, ctrl-y , carriage return adn the new line char in their canme can't be backup up to TSM
 use QUOTESARELITERAL if file names cantain " or '
 use WILDCARDSARELITERAL if file names contain * or ?)

# IBM Spectrum Scale (formerly GPFS) performance update, protocol performance and sizing

##### *Sven Oehme*

average: 1 bit flip per 1PB
GNE end-to-end ingtegraty checking prevents this.

baseline testing: ior:

api: POSIX
access: file-per-rocess
ordering in a file = requential offsets
order inter file = no tasks offsets
clients = 32 (4 per node)
repetiations = 100
xfersize = 1MiB
blocksize = 128 GiB
aggregate filesize = 4096 GiB

GS4-SSD becnhmark results:

filesystem blocksize    write MB/sec    read
1 MB                    17139           20858
4                       18205           26110
8                       19201           24457

GS4-SAS:
1                       1709            3029
4                       4039            6715
8                       4665           7666
16                      5619          8858 

at least 4MB block size for most new filesystems. since it's not much waste with <4kb files being stored in inodes.

NSD server can do 200,000 iops. Will go up to 350,000 in 4.1.1

big improvements in performance between 3.4 to 3.5 and even more to 4.1

scatter vs cluster. scatter does't slow down as much with full filesystems.

USing GL2-NSSAS as TSM backend: get 5Gb/s


