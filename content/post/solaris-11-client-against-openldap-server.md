---
title: Solaris 11 Client against OpenLDAP Server
date: 2012-10-02
tags:
 - ldap
 - solaris
 - sysadmin
---

Oracle provide a wealth of information for using various Naming and
Directory Services with a Solaris OS as the client. Sometimes it's hard
to see the wood for the trees, therefore the following attempts to
explain how to configure your Solaris 11 client to get user (passwd) and
group (group) information from an OpenLDAP server.

I assume you don't have full control over your OpenLDAP server, or don't
want to bend over backwards to accommodate the Solaris client. This
probably means:

- You don't have a DUAConfigProfile Object Class for storing profile
    attributes. This means you can't Initialise an LDAP Client using
    Profiles.
- Your LDAP tree structure doesn't match that of Oracle Directory
    Server Enterprise Edition.

No problem! You can specify everything you need by overriding various
attributes, if you can find them.

You manually initialise an LDAP client using the following syntax:

```plaintext
ldapclient manual -a attribute=value -a attribute=value ... ldap.example.com
```

The following is a list of attributes you may find useful, mix and match
as needed:

### `credentialLevel`

Either 'anonymous' or 'proxy'. Proxy specifies the client binds as a
particular user when communicating with the LDAP server. See proxyDN and
proxyPassword.  

*Example: `credentialLevel=proxy`*

### `proxyDN`

Specifies the DN to bind as when using the proxy credential level.  

*Example: `proxyDN=uid=sysops,ou=system,dc=bris,dc=ac,dc=uk`*

### `proxyPassword`

Specifies the client password when using the proxy credential level.  

*Example: `proxyPassword=abc123`*

### `defaultSearchBase`

Specifies the default search base DN.  

*Example: `defaultSearchBase=dc=bris,dc=ac,dc=uk`*

### `defaultSearchScope`

Specifies the default search scope. Either one (one level deep) or sub
(recursive).  

*Example: `defaultSearchScope=sub`*

### `serviceSearchDescriptor`

Overrides the default base DN for LDAP searches for a particular data
source. This is useful if your OU is not what Oracle expect it to be
(i.e. not ou=people for passwd)  

*Example: `serviceSearchDescriptor=passwd:cn=Users,dc=bris,dc=ac,dc=uk  
serviceSearchDescriptor=group:cn=Groups,dc=bris,dc=ac,dc=uk`*

### `attributeMap`

Specifies a mapping from an attribute defined by a service, to one in an
alternative schema (i.e. your LDAP server schema).  

*Exmaple: `attributeMap=passwd:gecos=displayName`*

Put it all together and you get:

```plaintext
ldapclient manual \
    -a credentialLevel=proxy \
    -a proxyDN=uid=sysops,ou=system,dc=bris,dc=ac,dc=uk \
    -a proxyPassword=abc123 \ 
    -a defaultSearchBase=dc=bris,dc=ac,dc=uk \
    -a defaultSearchScope=sub \
    -a serviceSearchDescriptor=passwd:cn=Users,dc=bris,dc=ac,dc=uk \
    -a serviceSearchDescriptor=group:cn=Groups,dc=bris,dc=ac,dc=uk \ 
    -a attributeMap=passwd:gecos=displayName \
    ldap-srv.bris.ac.uk
```
