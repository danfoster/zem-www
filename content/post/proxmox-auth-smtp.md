---
title: "Proxmox: Authenticated outbound SMTP"
tags: 
 - sysadmin
date: 2024-10-12
---

Proxmox has a [notication system](https://pve.proxmox.com/pve-docs/pve-admin-guide.html#chapter_notifications), which includes `sendmail` and `SMTP`. The latter supports authenticated SMTP servers, but does not support retires. This solution instead configures the system MTA to use an authenticated SMTP smarthost and therefore gets the best of both worlds.

Since proxmox is based on Debian, this should also work on any Debian based system running postfix.

Install Packages:

```
apt-get install -y  install libsasl2-modules
```

`/etc/postfix/sasl_passwd`:
```
[email-smtp.eu-west-1.amazonaws.com]:587  *******
```

`/etc/postfix/header_check`:
```
/From:.*/ REPLACE From: Zaphod <system@zem.org.uk>
```

`/etc/postfix/sender_conanical`:
```
/.+/  system@zem.org.uk
```

`/etc/postfix/main.cf`:
```
# See /usr/share/postfix/main.cf.dist for a commented, more complete version

myhostname=zaphod.zem.org.uk

smtpd_banner = $myhostname ESMTP $mail_name (Debian/GNU)
biff = no

# appending .domain is the MUA's job.
append_dot_mydomain = no

# Uncomment the next line to generate "delayed mail" warnings
#delay_warning_time = 4h

alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
mydestination = $myhostname, localhost.$mydomain, localhost
mynetworks = 127.0.0.0/8
inet_interfaces = loopback-only
recipient_delimiter = +

compatibility_level = 2

relayhost = [email-smtp.eu-west-1.amazonaws.com]:587
smtp_use_tls = yes
smtp_sasl_auth_enable = yes
smtp_sasl_security_options = noanonymous
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt

#mydestination = $myhostname, localhost.$mydomain, localhost

sender_canonical_classes = envelope_sender, header_sender
sender_canonical_maps = regexp:/etc/postfix/sender_canonical
smtp_header_checks = regexp:/etc/postfix/header_check
```


Restart services:
```
systemctl restart postfix@-
```