---
title: Linux Disk Encryption - Remote Unlocking at boot
tags:
 - sysadmin
date: 2024-05-21
cover:
  image: disk_encryption.png
---

If you have a encrypted root partition, it usually requires access to the console to enter the passphrase.

Even if you have the root partition unencrypted and have you sensitive data on a different encrypted partition, that you manually mount after SSH is available. You still have to deal with starting services after said manual mount.

There are a number of remote unlocking tools ([luksrku](https://github.com/johndoe31415/luksrku), [mandos](https://www.recompile.se/mandos), [tang](https://github.com/latchset/tang)/[clevis](https://github.com/latchset/clevis)), which attempt to solve this problem, by having a service running a trusted network to provide the decryption key. While this may be suitable for larger environments, I needed something simplier, suited for a handful of machines.

## Solution

I decided to use dropbear to run an SSH daemon in the initrd, then being able to SSH in and unlock all the devices in the initrd, before starting the root pivot.

This then allows the usual systemd init system to start services. Without needing to implement any custom service starting.

## Implementation


{{< notice info >}}
The following applies to Ubuntu 20.04, different distributions may vary.
{{< /notice >}}

### Dropbear

The dropbear SSH daemon can be installed in the initrd by:

```bash
apt-get install dropbear-initramfs
```

Password authentication is disabled, therefore you need to add your `authorized_keys` to `/etc/dropbear/initramfs/authorized_keys`

Dropbear options can be added to `DROPBEAR_OPTIONS` in `/etc/dropbear/initramfs/dropbear.conf`. See `man dropbear(8)` for more details.

### Networking

Configuring networking in the initrd, is the same as documented for configuring NFS root booting. Upstream docs can be found at https://www.kernel.org/doc/Documentation/filesystems/nfs/nfsroot.txt , under the `ip` parameter.

This matches the `IP=` option placed in `/etc/initramfs-tools/initramfs.conf`. e.g.

```
IP=10.42.2.100::10.42.2.250:255.255.255.0:frank:eno1
```

Networking persists to the OS booting, which is good if your configuration is the same.

In my case, the IP in the full OS should be on a bridge device (`br0`), not `eno1` as it is in the initrd. The simplest solution is to remove the networking configuration as the initrd pivots and let netplan bring up the new configuration as the OS boots.

To remove the `initrd` networking, add the following script as `/etc/initramfs-tools/scripts/init-bottom/remove-networking.sh`:

```bash
#!/bin/sh

DEV=eno1

rm -f /run/netplan/${DEV}.yaml
ip -f inet address flush dev ${DEV}
```

(change `DEV` to match your network interface)

### Unlock Script

The `cryptsetup-initramfs` package, provides a convience wrapper for unlocking devices called `cryptroot-unlock`, this is the script you would run via SSH to unlock all the devices and continue the boot.

This script will ask for the passphrase for every device. In my case, I have many devices, with the same passphrase. The following modifcation will try the previouisly used passphrase for the next device, any only prompt for a new passphrase if it fails to unlock:

```patch
--- cryptroot-unlock    2022-08-04 11:24:48.000000000 +0100
+++ cryptroot-unlock-custom     2023-03-06 13:20:54.361482388 +0000
@@ -180,6 +180,8 @@
        # interactive mode on a TTY: keep trying until all configured devices have
        # been unlocked or the maximum number of tries exceeded
        UNLOCK_ALL=y
+       echo "Unlocking $(count_locked_devices) devices..."
+       read -rs -p "Please unlock disks:"; echo
        while :; do
                # note: if the script is not killed before pivot_root it should
                # exit on its own once $TIMEOUT is reached
@@ -187,9 +189,11 @@
                        usleep 100000
                        continue
                fi
-               read -rs -p "Please unlock disk $CRYPTTAB_NAME: "; echo
                printf '%s' "$REPLY" >"$PASSFIFO"
-               wait_for_answer || true
+               wait_for_answer
+               if [[ $? -eq 1 ]]; then
+                       read -rs -p "Retry password for $CRYPTTAB_NAME: "; echo
+               fi
        done
 else
        # non-interactive mode: slurp the passphrase from stdin and exit
```

Download the full modified version here: [cryptroot-unlock-custom.gz](cryptroot-unlock-custom.gz).

Place this in `/usr/share/cryptsetup/initramfs/bin`, either overwriting cryptroot-unlock or adding it a new file as cryptroot-unlock-custom. If you add a new file, you need to make sure it gets added to the initrd by adding the following to `/usr/share/initramfs-tools/hooks/cryptroot-unlock`:

```bash
if [ ! -f "$DESTDIR/bin/cryptroot-unlock-custom" ] &&
        ! copy_file script /usr/share/cryptsetup/initramfs/bin/cryptroot-unlock-custom /bin/cryptroot-unlock-custom; then
    echo "ERROR: Couldn't copy /bin/cryptroot-unlock-custom" >&2
    exit 1
fi
```

### crypttab

{{< notice warning >}}
Cryptab format varies between distros and programs (systemd / Debian initrd), therefore be wary of alternative formatting described elsewhere
{{< /notice >}}

Make sure all of your encrypted devices are in `/etc/crypttab`. By default, the `initrd` unlocking process only unlocks the devices to mount the root partition. This then causes `systemd` to prompt for the passphrase on the console when booting the OS, which defeats our aim of remote unlocking. This can be solved by adding the `initramfs` option to every entry in the `crypttab` to force them to be unlocked during our `initrd` remote unlocking process.

For example, my `/etc/crypttab` might look like this:

```
<target name> <source device>         <key file>      <options>
sda3_crypt      /dev/sda3       none    initramfs
sdb3_crypt      /dev/sdb3       none    initramfs
sdc1_crypt      /dev/sdc1       none    initramfs
```

{{< notice info >}}
An alternative would be to have a LUKS keyfile on the encrypted root partition that could be used to unlock the other devices. I just decided not to go this route
{{< /notice >}}

### Updating initrd

Don't forget to regenerate you `initrd` with:

```
update-initramfs -u
```

## Using

Since the SSH hostkeys will be different in the `initrd` from the full OS, your client could easily think MITM attacks are occurring. You can avoid this by having a separate SSH config entry for SSHing in to the initrd, e.g.:

```
Host frank-init
    Hostname 10.42.2.100
    User root
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
```

Upon rebooting, you should be able to SSH to the `initrd` and run `cryptroot-unlock`, after entering the correct passphrase(s), it will auto close the connection and continue the boot process.
