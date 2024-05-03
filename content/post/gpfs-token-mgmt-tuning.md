---
title: GPFS Token Management Tuning
tags:
 - gpfs
 - storage
date: 2014-11-07
---

I experienced the following error on starting up a GPFS node in a cluster:

```text{linenos=false}
unexpected token conflict in recovery: majType 1 minType 7 tokType Inode key F657ED5089ABDE89:00000000000FC191:0000000000000000 node 1 mode xw flags 0x0 seqNum 1141739
```

The resulting in the node in question asserting and other nodes remote asserting, making the cluster unstable.

IBM states this is related to the token memory (TM) management which can lead
to unexpected result when being exhausted. One recommendation is to make sure the cluster able to handle the TM properly by keeping the following condition true.

```text
number of nodes (local and remote) * (maxFilesToCache + maxStatCache) < ( number of manager nodes -1 ) * 1.2M * (512M / tokenMemLimit)
```

As well as considering the best-case scenario, where all manager nodes are online, we have to consider when manger nodes are off-line either for maintenance or due to failure. This could be up N/2+1 nodes if every node is a manager node.

I wrote a [small script](https://github.com/danfoster/gpfs-token-mgmt-tuning) that can be used to visualise is the recommended condition is met with varying numbers of local nodes online.

```plaintext
./gpfs-token-mgmt-tuning.py
    #nodes (local and remote): 16
              maxFilesToCache: 1000000
                 maxStatCache: 50000
               #manager nodes: 8
                tokenMemLimit: 536870912


Checking nodes (local and remote) * (MFTC + MSC) < (#manager nodes -1) * 1.2M * (512M/TML)...

9/9 nodes: 2.1 (FAIL)
8/9 nodes: 2.29 (FAIL)
7/9 nodes: 2.57 (FAIL)
6/9 nodes: 2.98 (FAIL)
5/9 nodes: 3.67 (FAIL)
```

As you can see in the above example, we are not meeting the recommendation even when all nodes are online. Any parameter can be overwritten to visualise how this will change the conditions:

```plaintext
USAGE: ./gpfs-token-mgmt-tuning.py [-n <n>] [-f <n>] [-s <n>] [-m <n>] [-t <n>] [-l <n>]
        -n Override number of nodes (global and local)
        -f Override maxFilesToCache
        -s Override maxStateCache
        -m Override number of manager nodes
        -t Override tokemMemLimit
        -l Override number of local nodes
```

For example, lowering the `maxFilesToCache` to `300000`:

```plaintext
# ./gpfs-token-mgmt-tuning.py -f 300000
    #nodes (local and remote): 16
              maxFilesToCache: 300000
                 maxStatCache: 50000
               #manager nodes: 8
                tokenMemLimit: 536870912

Checking nodes (local and remote) * (MFTC + MSC) < (#manager nodes -1) * 1.2M * (512M/TML)...

9/9 nodes: 0.7 (OK)
8/9 nodes: 0.76 (OK)
7/9 nodes: 0.86 (OK)
6/9 nodes: 0.99 (OK)
5/9 nodes: 1.22 (FAIL)
```


The above shows that the recommended tuning conditions will be met most of the time, but will fail if 4 nodes are left (which would still leave the cluster in quorum). Instead we want to consider lowering `maxFilesToCache` even lower.

```plaintext
# ./gpfs-token-mgmt-tuning.py -f 230000
    #nodes (local and remote): 16
              maxFilesToCache: 230000
                 maxStatCache: 50000
               #manager nodes: 8
                tokenMemLimit: 536870912

Checking nodes (local and remote) * (MFTC + MSC) < (#manager nodes -1) * 1.2M * (512M/TML)...

9/9 nodes: 0.56 (OK)
8/9 nodes: 0.61 (OK)
7/9 nodes: 0.69 (OK)
6/9 nodes: 0.8 (OK)
5/9 nodes: 0.98 (OK)
```

Now we have found a suitable value to set, it can be set using `# mmchconfig maxFilesToCache=230000` and restarting GPFS.
