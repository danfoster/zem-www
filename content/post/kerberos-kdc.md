---
title: Kerberos - KDC
tags: 
 - sysadmin
date: 2009-10-03
---

The following describes how I configured Kerberos on Debian Lenny:

## Server Config

Install the required packages:

```bash
aptitude install krb5-kdc krb5-admin-server krb5-clients libpam-krb5
```

edit `/etc/krb5.conf`:  

```toml
[libdefaults]
default_realm = ZEM.ORG.UK
# The following krb5.conf variables are only for MIT Kerberos.
krb4_config = /etc/krb.conf
krb4_realms = /etc/krb.realms
kdc_timesync = 1
ccache_type = 4
forwardable = true
proxiable = true
# The following encryption type specification will be used by MIT Kerberos
# if uncommented.  In general, the defaults in the MIT Kerberos code are
# correct and overriding these specifications only serves to disable new
# encryption types as they are added, creating interoperability problems.
#
# Thie only time when you might need to uncomment these lines and change
# the enctypes is if you have local software that will break on ticket
# caches containing ticket encryption types it doesn't know about (such as 
# old versions of Sun Java). 
#   default_tgs_enctypes = des3-hmac-sha1 
#   default_tkt_enctypes = des3-hmac-sha1 
#   permitted_enctypes = des3-hmac-sha1 
# The following libdefaults parameters are only for Heimdal Kerberos. 
v4_instance_resolve = false 
v4_name_convert = { 
    host = { 
        rcmd = host 
        ftp = ftp 
    } 
    plain = { 
        something = something-else 
    } 
} 
fcc-mit-ticketflags = true 

[realms] 
ZEM.ORG.UK = { 
    kdc = ldap.zem.org.uk 
    admin_server = ldap.zem.org.uk 
} 

[domain_realm] 
.zem.org.uk = ZEM.ORG.UK 
zem.org.uk = ZEM.ORG.UK 

[login] 
krb4_convert = true 
krb4_get_tickets = false 

[logging] 
kdc = FILE:/var/log/kerberos/krb5kdc.log 
admin_server = FILE:/var/log/kerberos/kadmin.log 
default = FILE:/var/log/kerberos/krb5lib.log
```

create the new realm and initialise some basic users:  

```bash
krb5_newrealm
kadmin.local -q "ktadd -k /etc/krb5kdc/kadm5.keytab kadmin/admin" 
kadmin.local -q "ktadd -k /etc/krb5kdc/kadm5.keytab kadmin/changepw" 
kadmin.local -q "addprinc dan/admin@EXAMPLE.COM"
kadmin.local -q "addprinc ldapadm@EXAMPLE.COM"
```

edit `/etc/krb5kdc/kadm5.acl`:

```plaintext
*/admin@ZEM.ORG.UK     * */*@ZEM.ORG.UK          i *@ZEM.ORG.UK           i
```

restart services:  

```bash
# /etc/init.d/krb5-kdc restart 
Restarting Kerberos KDC: krb5kdc krb524d.
# /etc/init.d/krb5-admin-server
restart Restarting Kerberos administrative servers: kadmind`
```

## Client Config

edit `/etc/pam.d/common-auth`:

```plaintext
auth    sufficient  pam_krb5.so use_first_pass ignore_root forwardable
auth    required    pam_unix.so nullok_secure
```

edit `/etc/pam.d/common-session`:

```plaintext
session     required    pam_unix.so
session     sufficient  pam_krb5.so ignore_root
```
