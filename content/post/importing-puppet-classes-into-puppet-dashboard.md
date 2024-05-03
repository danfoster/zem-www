---
title: Importing Puppet classes in to Puppet Dashboard
date: 2011-05-10
tags:
 - puppet
 - puppet-dashboard
 - sysadmin
---

[Puppet Dashboad][] has a concept of classes, which can be really useful
if you make use of [external nodes][] and link it to the dashboard.  
Unfortunately it doesn't [currently][] have a way to auto-import
classes defined in your puppet manifests.

The following is a little bit of python hacked together to provide this
functionality. It looks at a directory for a list of modules and the
database details for puppet dashboard (only works for MySQL). It will
add any modules to puppet dashboard that are not already defined and
remove any extras that no longer exist in your modules path.

```python
#!/usr/bin/python
import os
import MySQLdb
import datetime
#Path to Puppet modules directory
modulesdir="/etc/puppet/modules/"
#MySQL details: user = "" password = "" host = "" database = "" availmodules = [] currentmodules = []`{lang="python"}

#Get list of avaible modules from filesystem  
for item in os.listdir(modulesdir):  
    if os.path.isdir(os.path.join(modulesdir,item)) and not item.startswith('.'):  
        availmodules.append(item)  
        availmodules = set(availmodules)

#Get list of current modules from database  
db = MySQLdb.connect(host=host,user=user,passwd=password,db=database)  
cursor = db.cursor()  
cursor.execute("SELECT name FROM node\_classes")  
for [name] in cursor.fetchall():  
    currentmodules.append(name)  
    currentmodules = set(currentmodules)

extramodules = currentmodules - availmodules

print "Availble:\t"+str(availmodules)  
print "Current:\t"+str(currentmodules)  
print "Extra:\t\t"+str(extramodules)

#Add or update current availble modules  
currenttime = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')  
for module in availmodules:  
    if module in currentmodules:  
        #module already exists, just update timestamp  
        cursor.execute("UPDATE node\_classes SET updated\_at = %s WHERE name = %s",(currenttime,module))  
    else:  
        #module doesn't exist, insert it  
        print "Adding: "+str(module)  
        cursor.execute("INSERT INTO node\_classes
        (name,created\_at,updated\_at) vALUES
        (%s,%s,%s)",(module,currenttime,currenttime))  
        #Delete any extra modules  
        for module in extramodules:  
            print "Deleting:"+str(module)  
            cursor.execute("DELETE from node\_classes WHERE name = %s",(module))  

db.commit()  
cursor.close()  
db.close()
```

There are better ways to get a list of classes, for example the
[interface utils][], but this requires puppet 2.6.5 at a minimum and I'm
running 2.6.2.  
It would also be desirable to input data into the dashboard via an API
instead of directly into the database, but AFAIK this functionality
isn't available yet.

I personally run the above as part of the post-commit hook on the puppet
repository. But you could also run it via cron or manually.

  [Puppet Dashboad]: http://www.puppetlabs.com/puppet/related-projects/dashboard/
  [external nodes]: http://docs.puppetlabs.com/guides/external_nodes.html
  [currently]: http://projects.puppetlabs.com/issues/3503
  [interface utils]: https://github.com/puppetlabs/interface-utils
