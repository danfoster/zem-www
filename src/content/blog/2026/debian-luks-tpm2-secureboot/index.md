---
title: Debian 13 - LUKS TPM2 unlocking with Secure Boot
date: 2026-04-19
tags:
 - debian
 - linux
 - security
 - luks
 - tpm2
 - secure-boot
description: Unlocking a LUKS root automatically from the TPM on Debian 13 (Trixie), with Secure Boot and signed GRUB.
---

I have a machine with an encrypted root that I don't want to type a passphrase into on every boot. It might also get stolen, so I don't want to just leave the key on disk.

The answer is to seal the LUKS key in the TPM, and only let it out when the machine has booted the way I expect. This post covers doing that on Debian 13 with Secure Boot enabled.

The first half is the setup that ended up working. The second half is everything that didn't, in case you go down the same paths.

## Goal

* Pulling the drive and reading it in another machine must not work
* Booting normally must not need a passphrase
* If the TPM refuses to unlock, there should be a passphrase fallback

The starting point is Debian 13, LUKS on LVM, a passphrase prompt at boot, UEFI, a TPM 2.0 chip and GRUB as the bootloader.

:::warning
A passphrase fallback only helps if you can get to the console. Moving to dracut (below) removed `dropbear-initramfs` from my machine, so I lost remote unlocking. If the TPM doesn't unlock, I need to be physically there. See [Remote unlocking](/post/2024/remote-luks-unlocking/) for the setup this replaced.
:::

## Implementation

The order matters, mainly because enabling Secure Boot invalidates the TPM enrolment and the crypttab has to be in the initrd before any of it works. TPM unlocking comes first so you can prove it works before adding Secure Boot on top.

```plantuml {alt="Setup order"}
title Setup order

start
partition "TPM unlocking" {
  :Install dracut and tpm2-tools;
  :crypttab options and\n""rd.luks=1 rd.auto"" on the kernel command line;
  :""dracut --force"" and ""update-grub"";
  :Enrol TPM (PCR 0+7);
  :Reboot: unlocks without a passphrase?;
  :Reboot with ""rd.luks.options=tpm2-device=no"":\ndoes it ask for a passphrase?;
}
partition "Secure Boot" {
  :Install signed GRUB and shim;
  :Enable Secure Boot in UEFI;
  :Re-enrol TPM (PCR 7 changed);
}
partition "Lock it down" {
  :Set UEFI firmware password;
}
stop
```

### Packages

Debian's default initramfs tooling (`initramfs-tools` with `cryptsetup-initramfs`) doesn't understand the `tpm2-device` option in crypttab. It doesn't fail, it just ignores it and asks for a passphrase. You only see this if you read the output of `update-initramfs`:

```plaintext
cryptsetup: WARNING: md1_crypt: ignoring unknown option 'tpm2-device'
cryptsetup: WARNING: md1_crypt: ignoring unknown option 'headless'
cryptsetup: WARNING: md1_crypt: ignoring unknown option 'timeout'
```

`dracut` uses `systemd-cryptsetup` in the initrd, which does support it.

```bash
apt install dracut tpm2-tools
```

`tpm2-tools` needs to be installed explicitly. Without it `systemd-cryptenroll` can fail with an error that looks like a hardware fault ([systemd#31925](https://github.com/systemd/systemd/issues/31925)):

```plaintext
TPM does not support AES-128-CFB.
Failed to create TPM2 context: State not recoverable
```

### crypttab

Edit the entry for your LUKS device in `/etc/crypttab`:

```plaintext
luks-<uuid> UUID=<uuid> none luks,tpm2-device=auto,headless=0,tries=3,timeout=30
```

`headless=0` tells systemd-cryptsetup that someone may be at the console to type a passphrase. Without it, a failed TPM unlock left me at an emergency shell rather than a prompt.

`timeout=` is not what it sounds like, see [timeout](#timeout) below. The UUID is the one from `cryptsetup luksDump <device> | grep UUID`.

### Kernel command line

dracut doesn't find LUKS devices on its own the way `initramfs-tools` does. Without the following, my machine hung at boot and I had to add them by hand at the GRUB menu.

Add to `/etc/default/grub`:

```plaintext
GRUB_CMDLINE_LINUX="rd.luks=1 rd.auto"
```

`rd.luks=1` tells dracut to activate LUKS devices. `rd.auto` enables automatic assembly of RAID, LVM and LUKS. If you don't have RAID you can probably leave it out, but it doesn't do any harm.

### Rebuild

Both the crypttab and the command line have to be baked in, so do this after the two edits above:

```bash
dracut --force --kver $(uname -r)
update-grub
```

Dracut replaces `initramfs-tools` for building the initrd from here on. `/etc/crypttab` is unchanged in format.

### Enrol the TPM

Find your LUKS device with `lsblk -f`.
```bash
systemd-cryptenroll --tpm2-device=auto --tpm2-pcrs=0+7 /dev/nvme0n1p3
```

You'll be asked for an existing passphrase. See [PCRs](#pcrs) for why `0+7`.

Reboot and check that it unlocks without you typing anything. Then check the fallback works: add `rd.luks.options=tpm2-device=no` to the kernel command line at the GRUB menu and make sure you get a passphrase prompt rather than a hang.

### Secure Boot

Install the signed bootloader packages and reinstall GRUB:

```bash
apt install grub-efi-amd64-signed shim-signed sbsigntool
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=debian
update-grub
```

The boot chain is now:

```plaintext
UEFI -> shim (Microsoft signed) -> grubx64.efi (Debian signed) -> kernel
```

Check that GRUB really is signed:

```bash
sbverify --list /boot/efi/EFI/debian/grubx64.efi
```

This should show a Debian Secure Boot signer. Then enable Secure Boot in the UEFI setup and boot. `mokutil --sb-state` should say `SecureBoot enabled`.

### Re-enrol the TPM

Enabling Secure Boot changed PCR 7, so the key you sealed earlier no longer matches. Wipe the TPM slot and enrol again:

```bash
systemd-cryptenroll --wipe-slot=tpm2 /dev/nvme0n1p3
systemd-cryptenroll --tpm2-device=auto --tpm2-pcrs=0+7 /dev/nvme0n1p3
```

`--wipe-slot=tpm2` removes every TPM2 slot, so you don't need to look up the slot number. Your passphrase slot is not touched.

Re-enrol whenever the boot chain changes: Secure Boot toggled or its keys changed, firmware updates (PCR 0), or a new bootloader. With `0+7` you don't need to on kernel updates.

### Firmware password

Set a UEFI firmware password. This matters more than anything else here.

PCR 7 only reflects the current Secure Boot state. Without a firmware password someone with physical access can turn Secure Boot off, boot a live USB, modify your unencrypted `/boot`, turn Secure Boot back on, and the TPM will happily unseal, because PCR 7 looks the same as it always did.

With the password they can't change Secure Boot or boot other media. How to set it depends on the vendor, but it's normally under Security in the UEFI setup. You're in there anyway to enable Secure Boot.

### GRUB password (optional)

To stop someone editing the kernel command line at the GRUB menu, generate a hash with `grub-mkpasswd-pbkdf2` and add it to `/etc/grub.d/40_custom`:

```plaintext
set superusers="root"
password_pbkdf2 root grub.pbkdf2.sha512.10000.<hash>
```

You'll need to add `--unrestricted` to the normal boot menuentry in `/etc/grub.d/10_linux`, otherwise it asks for the password on every boot. Then `update-grub`, and rebuild dracut if you want the two in step.

## Things worth knowing

### timeout

In this setup `timeout=` in crypttab is not "wait this long for the TPM, then ask for a passphrase". What I saw was the opposite. The passphrase prompt appears first and the TPM unlock only happens after `timeout=` seconds have passed with no input. Kernel log timestamps put the prompt at 6 seconds and the unlock at 36 seconds, with `timeout=30`.

```plantuml {alt="systemd-cryptsetup unlock flow"}
title What systemd-cryptsetup does at boot (as observed with timeout=30)

start
:Passphrase prompt appears on the console;
if (Passphrase typed within ""timeout="" seconds?) then (yes)
  :Unlock with the passphrase;
else (no)
  :Try TPM2 unseal;
  if (PCRs match the enrolment?) then (yes)
    :Unlock with the TPM key;
  else (no)
    :Prompt again\n(up to ""tries="" attempts);
    note right
      Needs ""headless=0"".
      Someone must be at the console.
    end note
  endif
endif
:Root mounted, boot continues;
stop
```

So `timeout=` is a delay added to every boot, and `timeout=0` (wait forever) means the TPM is never tried at all. I haven't found a way to have it try the TPM first and only prompt on failure. 30 seconds was a compromise, and it is shorter if you'd rather not wait.

### PCRs

The TPM records a hash of each stage of the boot in its Platform Configuration Registers (PCRs). When you enrol, the LUKS key is sealed against the current values of the PCRs you pick, and the TPM will only release it if they still match.

```plantuml {alt="Boot chain and what the TPM sees"}
title Boot chain and what the TPM sees

participant "UEFI\nfirmware" as fw
participant "shim" as shim
participant "GRUB" as grub
participant "Kernel +\ndracut initrd" as os
participant "systemd-\ncryptsetup" as sc
participant "TPM" as tpm

fw -> tpm : measure firmware **(PCR 0)**
fw -> tpm : measure Secure Boot state\nand keys **(PCR 7)**
fw -> shim : verify Microsoft signature, load
shim -> grub : verify Debian signature, load
grub -> os : load kernel and initrd
note right of tpm #FFF8DC
  PCR 8 and 9 also change here
  (command line, kernel, initrd).
  Not used: they change on every kernel update.
end note
os -> sc : start, read crypttab
sc -> tpm : unseal LUKS key
alt PCR 0 and 7 match enrolment
  tpm --> sc : key
  sc -> os : LUKS opened, mount root
else any PCR differs
  tpm --> sc : refuse
  sc -> sc : fall back to passphrase prompt
end
```

| PCR | Measures                    | Changes when                      |
| --- | --------------------------- | --------------------------------- |
| 0   | UEFI firmware               | Firmware update                   |
| 4   | Bootloader                  | GRUB update                       |
| 7   | Secure Boot state           | Secure Boot toggled, keys changed |
| 8   | Kernel command line         | Any command line change           |
| 9   | Initramfs + kernel          | Kernel update                     |
| 11  | UKI (whole image)           | Any change to the UKI             |
| 14  | shim's MOK certs and hashes | A MOK is enrolled or removed      |

My first attempt was `--tpm2-pcrs=7+8+9+14`. PCRs 8 and 9 change with every kernel update, so the first `apt upgrade` that pulled in a new kernel left the machine waiting at a passphrase prompt. I settled on 0+7, which are stable across kernel updates.

### What it does and doesn't protect against

With the key sealed in the TPM, the drive is useless in another machine, whichever PCRs you choose. PCR 7 adds a check on how the machine boots: the TPM only releases the key if Secure Boot is on and its keys haven't changed, so booting with Secure Boot off or from a differently signed USB gets nothing. It doesn't cover `/boot`. Someone with physical access can still swap the unsigned initramfs while leaving Secure Boot on, which is why the firmware password matters. PCR 0 adds firmware tampering and motherboard swaps.

For a machine where the main worry is opportunistic theft, 0+7 with a firmware password and a passphrase fallback is enough for me.

## Dead ends

### UKI, systemd-boot and PCR 11

PCR 7 leaves one gap: it says nothing about the initramfs, so someone who can write to `/boot` can swap it while Secure Boot stays on. A Unified Kernel Image (UKI) closes it. It bundles the kernel, initramfs and command line into one signed binary, and PCR 11 measures the whole image, so the TPM only unseals for exactly that image. The cost is that every kernel update changes the UKI, so you have to re-enrol every time.

I tried this, and it needs systemd-boot rather than GRUB. That's the awkward part on a machine installed with GRUB. Debian's systemd-boot and Secure Boot integration assumes GRUB isn't there. If the GRUB packages are installed, the postinst scripts notice and do nothing, with no error. I installed `shim-signed` and `systemd-boot-efi-amd64-signed`, saw no problems, and nothing had changed. Removing the GRUB packages wasn't enough either. I had to remove the files from the ESP (`/boot/efi/EFI/debian`) before the scripts did anything.

What I remember of the setup:

```bash
apt purge grub-common grub2-common grub-efi-amd64 grub-efi-amd64-bin grub-efi-amd64-unsigned
rm -rf /boot/efi/EFI/debian
apt install systemd-boot shim-signed systemd-boot-efi-amd64-signed systemd-ukify dracut
bootctl install
```

with `/etc/kernel/install.conf`:

```ini
layout=uki
initrd_generator=dracut
uki_generator=ukify
```

and `/etc/kernel/uki.conf` pointing `Cmdline=@/etc/kernel/cmdline` at your command line. Have a bootable USB before you purge GRUB.

I went back to signed GRUB. Re-enrolling on every kernel update isn't worth it for a machine where the main worry is opportunistic theft, and I haven't kept this running, so I can't vouch for every step above.

### Forgetting to re-enrol

Every time I changed something in the boot chain I forgot to re-enrol, and every time the next boot stopped at a passphrase prompt. If you changed anything between the power button and the kernel, re-enrol.

## Recovery

Force a passphrase instead of the TPM, from the GRUB menu:

```plaintext
rd.luks.options=tpm2-device=no
```

If dracut isn't picking up your LUKS device:

```plaintext
rd.auto rd.luks=1 rd.luks.uuid=<uuid>
```

Drop to a dracut shell before the root mount:

```plaintext
rd.break=pre-mount
```

Reboot into the UEFI setup from a running system:

```bash
systemctl reboot --firmware-setup
```
