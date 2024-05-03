---
title: Solaris Kerberos clients against MS Active Directory KDC
date: 2013-01-09
tags: 
 - Active Directory
 - Kerberos
 - Solaris
 - Sysadmin
---

Configuring Solaris as a Kerberos client to work against a MS Active
Directory Domain is documented by Oracle in the [How to Configure a
Kerberos Client for an Active Directory Server][].
This uses the /usr/sbin/kclient script provided by the kerberos-5
package, but makes some assumptions:

-   The computer object will be created in `OU=Computers`
-   The user joining the client to the domain must have Domain
    Administrator rights

The first issue is fairly trivial to work around, but the second is more
interesting and that is what the rest of this post will focus on. To
understand why such elevated rights are required it useful to look at
what `kclient` is trying to do when joins a MS domain:

1.  Create or update the computer object via LDAP.
    1.  When creating the object, set the following attributes:
        `objectClass, cn, sAMAccountName, userPrincipalName, servicePrincipalName, userAccountControl, dNSHostname`.
    2.  When updating the object, replace the following attributes:
        userPrincipalName, servicePrincipalName, userAccountControl,
        dNSHostname.

    It is worth noting for both these operations that userAccountControl
    gets set to 4130, which is a bit mask containing the flags:
    `WORKSTATION_TRUST_ACCOUNT | PASSWD_NOTREQD | ACCOUNTDISABLE` as
    described in [http://support.microsoft.com/kb/305144](http://support.microsoft.com/kb/305144) . 
2.  Set a random password for the computer object.
3.  Modify the `msDS-SupportedEncryptionTypes` attribute on the computer
    object based on which encryption types are supported by the client
4.  Modify the `userAccountControl` attribute for the computer object
    and set the following flags:
    `WORKSTATION_TRUST_ACCOUNT | DONT_EXPIRE_PASSWORD | TRUSTED_FOR_DELEGATION `.

It is this last stage where an error occurs due to insufficient rights,
even if you pre-create the computer object and explicitly set the
ability for your user to modify the `userAccountControl` attribute.
Further investigation shows that special permissions are required to set
the `TRUSTED_FOR_DELEGATION` flag.  
It may be possible to grant a user permission to set this flag, I
haven't looked in to this. But as a non-Domain admin I don't have this
ability by default.  
It does raise the question why this flag is being set by default?
Reading in to more detail about this flag suggests it should only be set
when necessary.

For now I've modified the script to only set the
`WORKSTATION_TRUST_ACCOUNT | DONT_EXPIRE_PASSWORD` flags (integer 69632)
and we'll see if not having the `TRUSTED_FOR_DELEGATION ` flag causes
any problems.

A modified version of kclient that doesn't set the
`TRUSTED_FOR_DELEGATION ` flag and let's you specify the target OU via
the `-o` option can be downloaded from [here][]. The argument for the
`-o` option should be specificed in DN format, not including the DN of
your realm, e.g.:  
`OU=Solaris,OU=Servers`

  [How to Configure a Kerberos Client for an Active Directory Server]: http://docs.oracle.com/cd/E23824_01/html/821-1456/setup-148.html
  [here]: http://www.zem.org.uk/software/kclient/kclient.solaris
