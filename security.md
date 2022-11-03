# Security

This document contains a discussion of various security-related aspects of this setup.

Much of this is just coming from my personal, high-level understanding of things, and may not be completely accurate. I have not actually "sniffed packets" to validate things directly.

## Architecture Overview

The remote machine is a Windows virtual machine on the public internet with TCP ports 22 (for Secure Shell, SSH) and 3389 (for Remote Desktop Protocol, RDP) open to all.

All traffic to/from a user's local machine should be restricted to ports 22 and 3389.

It protects these ports with a Windows username/password combination that someone at AssistivLabs generates for each new machine (and passes on to the user).

Inside of the remote machine are 2 websocket servers listening on 2 non-public ports.

These ports are accessed via SSH local port forwarding from the user's local machine.

## Aspects and Scenarios

### Encryption in Transit

#### Websockets

The 2 websocket servers use the insecure `ws://` protocol by default, so to make them public directly they would need to use the secure `wss://` protocol instead.

However I found it hard to get them an appropriate public certificate to enable Transport Layer Security (TLS), as the remote machines aren't associated to the Domain Name System (DNS) currently.

SSH however doesn't require a public, asymmetric certificate to encrypt its communication channels in transit (it uses a symmetric encryption scheme instead). It also supports carrying other connections inside of its secure channel via local/remote port forwarding.

This means that only accessing the websocket servers within this secure channel via local port forwarding should guarantee that same level of encryption in transit for them.

#### Remote Desktop Protocol

RDP can also use TLS to encrypt its connections in transit, but that isn't possible in the current state with the remote machines (see above discussion).

In the absence of TLS, it should default to using a symmetric encryption scheme instead. The strength of this encryption depends on the strongest key the user's RDP client and the remote machine's RDP server both support.

The remote machines are currently stock Windows Server 2019 instances, so as long as a user doesn't connect with an unmaintained RDP client the encryption should not be extremely weak.

### Playwright Server Compromise

If someone is able to guess the URL to the Playwright server and connect to it, they can gain the same privileges as the logged-in Windows user (per [this Playwright doc](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-server-option-ws-path)).

This would be problematic if the server was directly exposed to the internet, but it's only accessible via either the SSH or RDP connections, both of which are password-protected.

So it's risk of compromise is equivalent to the risk of compromise of the Window user's password.

And publicizing its URL (as is done via the source code in this repository) doesn't change this risk profile.

### Password Compromise

If a Windows password (and username) to a remote machine were compromised, the main concern would be someone using it to SSH onto the machine and snoop on almost anything the user is doing on the machine.

One area of risk is in using the password for SSH, since that has to be sent to the remote machine, where if it were already partially compromised could then lead to an escalation of that compromise. A similar story exists for RDP.

We could get rid of sending a password to the remote machine by tunneling the RDP connection through SSH, and then also switching to using key pair authentication for SSH. In this case the private key never has to leave the user's control.

However concern then moves to securing the private key, from its creation by someone at AssistivLabs, through to its storage by the user, either of which could be compromised.

In this prototype setup where transmission of a secret always has a human in the loop, there doesn't appear to be any way to avoid these concerns.

Fully automating the entire flow could though (e.g. where a secret could be used once by code then immediately destroyed, on top of other things like OIDC trust patterns), however that's out of scope for this prototype.

### Local Machine Compromise

The 2 websocket servers on the remote machine send back info that's then handle by code on the user's local machine.

Were they to be compromised, the info that's being sent back could potentially be malicious, and if mishandled by the code on the user's local machine (e.g. by falling victim to prototype pollution) could lead to broader infection of the user's local machine.

Having all code handling such untrusted input run in a tighter sandbox (e.g. a Docker container) could potentially mitigate aspects of this. However it wasn't included in the initial repository to cut down on initial complexity.

### Server Side Request Forgery (SSRF)

The remote machines have been configured to have no access into the broader cloud infrastructure they're running in.

So full compromise of one remote machine should not affect others running for other users (assuming our cloud provider doesn't suffer a relevant vulnerability simultaneously)
