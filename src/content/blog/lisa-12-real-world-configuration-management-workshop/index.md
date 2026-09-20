---
title: LISA 12 - Real World Configuration Management Workshop
date: 2012-12-11
tags: 
 - bcfg2
 - cfgman
 - LISA
 - sysadmin
 - conference
cover:
 image: roomview.jpg
---

The Real World Configuration Management was my first official event at
LISA '12, with \~40 people sat around the table discussing their
experiences and problems with configuration management. Experience was
wide ranging in the room, from someone who was still evaluating
configuration management tools, to Authors  of CFEngine, LCFG & bcfg2.

The day had a loose structure, broken down in to 3 parts. Discussion
often went off-track, but that was to be expected.

## Introduction

We started by going around the tables and everyone had a 5 mins to talk
about the following points:

- Who are you?
- Where are you from?
- One or two of the biggest problems you face with configuration
- If you could snap your fingers and fix something, what would it be?

My problems revolved around working with configuration management across
teams and how you devolve various parts to teams/zones. Should we be
attempting to run a central server that every client checks in against
and we some how restrict which clients various users can modify (similar
to how the SCCM/Active Directory model works)? Or do we provide the
tools for teams to run their own server and provide configuration
snippets for the things that are useful across the university.

The things I would like to fix by snapping my fingers included spitting
the configuration metadata (Properties/, Metadata/ and hard coded
values) from the code and literal configuration. This would allow us to
treat these different, i.e. metadata changes could be fast-tracked to
production, while code changes could be reviewed/staged. The QA/Release
Engineering was a common theme, which will be discussed more below. 
With a second snap of my fingers, I would like to stop people caring
about which tool they use.

While most discussions revolved around large problems which gave more
structure in the last section of the workshop, some interesting problems
and comments were made that stood out on their own:

- Access control should be enforced via the source control management
  tool, not configuration management tool.
- Bcfg2 1.3 is going to support validating the output of  TGenshi
  (e.g. sudoers) via a template before it's accepted.
- It was suggested that subject matter experts should be assigned to
  different areas within the configuration management code for complex
  tasks.
- I have previously discussed the idea of having a "kill switch" that
  could stop any clients updating. This would useful if a change had
  been pushed to production and then it was realised it had to
  potential to break some clients. I had always assumed this would be
  done by some HTTP query before running the bcfg2 client, it was
  noted that Google do something similar already, but use a DNS entry
  to control the kill switch.
- Managing private data is hard. Even if your team is flat and you can
  trust everyone who has read access to your source control. Should
  this data be in VCS? What about post-commit hooks that mail out
  diffs etc? Bcfg2 1.3 supports encrypting files and elements in
  Properties/ files. Secret Server was also mentioned as a commercial
  product that could be used to store private data then get the
  configuration management server to extract the data. This is very
  similar to a project I was considering writing.
- [OT] A desire for user level package management. Tools like ruby
  gems provide this to a certain degree, but not very well and only
  for a certain subset. I'm not too sure about this, while I
  understand that users desire a flexible system, it produces a grey
  area regarding who's responsibility it is to keep these packages up
  to date
- A number of people used configuration management across different
  security domains that have no was of transferring data between the
  domains short of copying & pasting. Therefore the configuration
  management had to be kept in sync via a human.
- CFEngine has a comment attribute to lets sysadmins explain what a
  promise is trying to do. The special thing about the attribute is
  that it gets passed around whenever the promise is used. For example
  if a promise failed with an error in the logs, the description of
  what was trying to happen would also be visible.
- Some people around the table were using home-grown configuration
  management systems. Naturally a discussion around the costs of
  learning a configuration management system vs. writing your own
  erupted. While most people see the benefit of using and contributing
  to an existing project, some users had smaller needs and found the
  learning curve of an existing system too high. It was mentioned that
  learning any piece of software is hard. Producers of other software
  provide tools for learning, e.g. books and VMs with a pre-configured
  environment on.
- Some users ran a single client against multiple bcfg2 servers to
  configure different parts of the system. Not all of the client run
  ran with root privileges. For example one bcfg2 server could only
  configure an application, while the other could configure the
  system. This could be one way of managing configuration between
  teams while also proving a common base system for everyone. Although
  as the 2 servers no nothing about each other, I do not like the
  potential conflicts that could occur if they both tried to manage
  the same file. Metadata/statistics about the client would then also
  be split across 2 servers
- Because of complexity of configuration management, visual
  representation would be useful, but for the same reason
  (complexity), such a thing is hard in non-demo situations as they
  become unreadable. To make this possible, different levels of
  abstraction would be needed
- What we all do is complex and we should embrace it, not be scared of
  it!
- Some people believe we're sill living in the dark ages by writing so
  much code to make our configuration management tools work for us.
  Never mind people who are still configuring their systems manually!
- Managing small components (e.g. a sudoers file) is the easy bit.
  It's how all these fit together (delegation, QA, orchestration, etc)
  which is the hard part. This made me realise how silly it is to be
  debating which configuration management tool to use, when there are
  much bigger problems to be solving.

## Operational Models

Most people in the room managed full systems using their configuration
management tool. But others just managed parts. e.g. only security
settings or just a common base system across all boxes. While this may
be obvious, it hadn't previously occurred to me as an option as I have
always been so focused on having a system where a full stack can be
built in a click of a button. Managing a consistent base system while
leaving the application configuration manual may be something we would
want to consider at Bristol as a stepping stone in to helping more users
to embrace configuration management.

Others people in the room only bootstrap their system using
configuration management and don't manage it further one it's been
passed to their customer/user.

Number of people who have formal code review and unit tests were low,
especially compared to the number of people managing complete systems.
Even out of the people who do have these processes, the only groups who
have a QA system they were happy with were Google.

## The Future

We finally went in to more discussions with topics based on what was
mentioned in the morning. These were:

- Orchestration
- Development/Production integration - Release Engineering
- Integration testing
- Mobile Systems
- Start Over?
- Network Automation
- Cost/Benefit Analysis of Configuration Management

Only a few of these were discussed in detail.

### Orchestration

Orchestration was a hot topic throughout the day as it's importance was
debated. The divide was very much between the theorists with an
ideological view and those with a practical outlook. For those with a
practical outlook, myself included, there is no doubt that orchestration
is needed, but how this is done in an automated fashion is still in it's
infancy. For Bristol, with it's size and number of manually configured
systems, I think manual orchestration is suitable. For example, if a DNS
server needed replacing, we need to make sure the order of steps are 1)
Create new DNS server 2) Reconfigure clients to use new server 3) Retire
old DNS server. Performing these steps out-of-order would be a disaster,
but orchestrating this manually on our scale is still sensible. We have
bigger problems to tackle first.

### Development/Production integration - Release Engineering

Once a change has been tested a ready to be pushed to production, how &
when should it be pushed.  
One naive approach would be to push the change out to all production
boxes at once. Testing is never 100% and at some point this is going to
come back to bite you. Various "Carney"/"Toe in the Water" approaches
were discussed:

- Deploy to a single client. If all is OK, deploy to all hosts.
- Deploy to a single client of every type. It was even suggested that
  this is done to the 13th type of each client as users may accept any
  outages due to superstition.
- Deploy to 1 client, 2 clients, 4 clients and keep doubling until all
  clients are up-to-date. Depending on the delay between deployments,
  this could take a longtime.
- Split your clients into PROD\_A and PROD\_B. Deploy to one group
  before deploying to the other. This could work very well for
  organisations with 2 sites or for any model where services are load
  balanced.

There was also some discussion about how commits should never be made
without a referencing ticket, so each commit can be related to an
objective. This could then be used to produce a Changelog when pushing
TESTING/STAGING to PROD. All in all, making deployment like releases of
an open source project, which I like the idea of a lot :-)

There was a scenario told relating to when AMD acquired ATI along with
their data-centers. AMD wanted to bring all the DCs inline with there
configuration, but the admins of the other DCs were cautious of letting
CFEngine run wild on there systems. So AMD published their changes and
let the admins review the changes and apply them themselves. After a
number of iterations, they were bored of validating changes and could
see the time benefits of letting CFEngine push changes and therefore let
them run. This was a good example to me of the carrot vs. the stick and
how patience is needed to get people on board.

### Integration testing

It was interesting to hear the different extremes of testing people did
around the table. From nothing to sysadmins having desktops with 256G
RAM so they can fire up a whole virtual estate for testing.

It was also interesting to hear that people were surprised by the static
testing features offered by bcfg2-lint and bcfg2-test, not such good
tools are provided in all configuration management systems.

### Network Automation

While some popular automation tools can be used configure network
devices, not many people were doing this yet, but are interested. Some
people had there own glue to configure network devices.  
Openflow, a standard for controlling routers and switches was
mentioned. It can range from simply configuring VLANs to being a command
center to distribute routing tables. Which apparently can be much more
efficient than making routing decisions based on OSPF etc. For example,
Google uses this for their internal data networks and can achieve 99.9%
link utilisation.

While automatic configuration of switch ports would be the holy grail, I
believe this is a long way off for Bristol. What would be more
achievable would be the automatic validation of configuration. If we
could access a read only version of switchport configuration, it would
be possible to validate this against the configuration of the host and
raise an error if this doesn't match.

## Back in Bristol

Without a doubt, this workshop has re-energised me to develop
Configuration management at UoB. Especially in the areas of team working
and release management. Fundamentally I believe this can be achieved by
treating the configuration like an open source project. This will
hopefully provide a carrot, not a stick for other departments/zones and
they can embrace as much/little as they want.

One hangup I've had with sharing configuration snippets between
different groups is how bcfg2 structures it's configuration across
different directories depending on if it's abstract configuration /
literal configuration compared to Puppet that groups files by feature.  
After speaking with Chris St. Pierre it made me realise this is a
non-issue. Developers have no issue with bundling groups of files in to
features and pushing/pulling them as patches without them being grouped
in the same location on the file system, so why should we care? If the
upstream feature set is working well and satisfying users needs, then
the same files should never be modified making merges really easy. If
they are modified, users should be encouraged to contribute back.

It's also important to remember that's we're trying to provide two
services in SysOps:

1. A complete configuration management system for our systems to use
2. The tools for others to use configuration management themselves,
   while striking a balance between reducing duplication between zones
   and still leaving the flexibility for zones the achieve what they
   want.

We already have point 1), but point 2) still needs creating.

Off the top of my head, these are the sort of steps I think we need to
be taking:

- Move from SVN to Git. While this may seem trivial, I believe the
  distributed nature of git will massively help in inter-team working
- Separate Properties/ and Metadata/ from everything else to it's own
  repo
- Start a golden repo for core system configurations that would want
  to be used across the whole of UoB.
- Manage a release cycle for pushing changes to PROD\_STABLE.
- SysOps should be the first users of the empty golden repo and start
  pushing features upstream.
- Documentation Documentation Documentation

![Room View][]

Note to self: Watch Ben Rockwoods keynote from LISA '11.

  [Room View]: roomview.jpg
