---
title: Bootstrapping a Puppet master
tags:
 - cfgman
 - puppet
date: 2015-02-10
---

Puppet masters can be complex beasts, with multiple components and are often managed by themselves. There are multiple reasons why you might want to bootstrap a new puppetmaster without depending on your existing one (developement, DR, etc).

In my environment, the puppetmaster is managed with a combination of the following modules:

* [``theforeman/puppet``](https://forge.puppetlabs.com/theforeman/puppet)
* [``theforeman/foreman``](https://forge.puppetlabs.com/theforeman/foreman)
* [``theforeman/foreman_proxy``](https://forge.puppetlabs.com/theforeman/foreman_proxy)
* [``puppetlabs/puppetdb``](https://forge.puppetlabs.com/puppetlabs/puppetdb)

Getting to a position where our [puppetmaster wrapper class](https://bitbucket.org/uobacrc/puppet-role/src/f3d2a10704410032651ba35053f97ed0d4a1b237/manifests/puppetmaster.pp?at=master) can be applied using ``puppet apply`` takes some care. The final result can be see at ``bootstrap.sh`` in our [puppet repo](https://bitbucket.org/uobacrc/acrc-puppet/src/287cc2b6ad407a95e4a6f2edc80ca8c34498858e/bootstrap.sh?at=production), Interesting things to note are:

* Trying to apply ``theforeman/puppet`` to install a puppetmaster can lead to strange, inconsistant SSL (ca) certificates. The simplist fix I've found is to install the puppetmaster package via yum, then start and stop the puppmaster service to generate the keys before continuing
* A combination of the modules will not apply cleanly in one run. Experience has shown that 3 runs are needed before the postgres database is created. At which point the database needs to be populated (either by seeding it or restoring from your DR backups). Then a final run is needed.
