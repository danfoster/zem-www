---
title: Google Apps Revisited
date: 2011-02-10
tags:
 - sysadmin
---

Yesterday Microsoft and Google came to work to present their Cloud
solutions to E-mail, Calendar and Collaboration (Live@edu & Google Apps
for Education). The relative pros and cons regarding a University moving
it's collaboration tools to the cloud is a debate for another day
(despite it being hard to hold back). But one thing
the presentations did do is make me re-consider the free google apps
service for my personal set-up.

Currently I run a bespoke set-up for me and a small number of friends
that provides:

-   e-mail
-   Calendar
-   Contacts
-   Web interface
-   Synchronisationg to mobile devices (syncML)
-   IM (Jabber + transports)

When I first looked at Google Apps a number of years ago, there were a
couple of show stoppers that have mostly been resolved:

### Mail Aliases

I use a lot of mail aliases. The only way I could previously see to
emulate such a feature was to create a new user with the desired name
and forward all messages to the appropriate user. This was not a
scaleable solution. Now Google Apps has Groups (think mailing lists), a
group with just one member is an acceptable way of implementing aliases.

The other end of this requirement is to be able to sent mail from these
addresses. Previously when sending a mail using googles SMTP servers
with a From header that didn't match the address on the account, the
header was modified to include "On behalf of \<foo@gmail.com\>". Now it
appears you can explicitly [add custom from addresses][] (although it
does require a verification step).

### SyncML Support

A number of my devices support contact synchronisation by syncML only.
Google did not support this, but it appears [now they do][]. Although
this does not work for calendar. How well calendar sync via ical works
on different devices is yet to be seen.

## What Google does that I don't / can't

Now that my gripes with Google Apps are mostly gone. What incentive is
there to move?

- **Better Web Interface** There is no doubt that the GMail web interface
is the bee knees (wasps elbows?). No open source webmail
/ collaboration suite comes close.

- **More Resilient** As fantastic as my service uptime may be, I'm
still just one guy hosting these services out of the good of my heart.
Google on the other hand is a Giant with datacenters around the world
and a lot of income from advertising.

- **More Attributes in the Address Book** Currently my address book
doesn't support some funky attributes like photos, although I could make
this happen with some effort, google does it already.

- **Mailing Lists** Again, mailing lists are not hard to set-up, but I
never got around to it. Google Groups provides this already.

## What I provide that Google does not

On the flip-side I currently provide some services that Google does not
offer.

- **SMTP gateway** For hosts, they need to be able to send mails for
reporting. Although the hosts can be configured to authenticate against
a (google) account, the fact the From address can change makes googles
SMTP servers unsuitable.

- **Jabber Transports** Currently I make use of a number of Jabber
transports (MSN, IRC, etc). GTalk does not provide these transports, but
it is still possible to use external transports with GTalk.

- **Confidence that my data isn't going to disappear** Before you butt
in, hear me out. Many anti-google folks complain about the lack of
control of their data, that Google might share it with other parties.
Although this could be true, I believe the chances are so small it
almost not worrying about it. If you really have such sensitive data you
should be encrypting it individually . My fear is losing my account
and not being able to access my data, we have all read the [horror
stories][] and they are a real concern. The fact is that Google is
providing these services for "free", if they get a complaint about a user
that could cause them trouble (legal, technical, etc) is it
cheaper/easier for them to lock that user out than to investigate it.
The solution to this on a individual level is to use the ical/imap
interfaces to take a daily backup. But this can not be scaled up to be
automatic for other users on the same domain.

The end result is that Google offer a very attractive service for free
with some features that would be impossible to provide with open-source
tools and the resources available to me. For the features they don't
provide, it's possible for me to provide them in parallel. Maybe it is
time for me to become a slave of the Google Monster. For those who know
me, you will know how upsetting it is for me to say that.

  [add custom from addresses]: http://mail.google.com/support/bin/answer.py?hl=en&ctx=mail&answer=22370
  [now they do]: http://www.google.com/support/mobile/bin/answer.py?hl=en&answer=147826
  [horror stories]: http://lobais.blogspot.com/2010/05/when-google-locked-door.html
