# Screen Reader Integrated Browser Automation Experimentation Playground

This repository provides a starting point for experimenting with screen reader integrated browser automation on a remote Windows machine.

## Before You Get Started

You'll need to already have or freshly install these tools

- A code editor, Git, and a way to clone public Github repositories to your local machine
- A Node.js installation (version 14 or higher)
- A Remote Desktop Connection (RDP) client
  - On MacOS the Microsoft Remote Desktop app can be downloaded from the Apple app store.
- A Secure Shell (SSH) client
  - On MacOS there should already be a default one installed (run `which ssh` from a terminal to double check)

## Getting Setup With the Remote Machine

Someone needs to have securely passed you the following info needed to connect to the remote Windows machine

- A username
- A password
- A hostname (i.e. a public ip address for the machine)

Once you have that, connect to the machine using your RDP client.

For the Microsoft Remote Desktop app, this works as follows

1. Click the plus icon button in the upper left
2. Select `Add PC`
3. Paste in the hostname you received into the `PC name` field
4. Click the 3 dots on the new entry that shows up, and select `Connect`
5. Enter the username and password you received
6. Click past any certificate warnings (see [the security doc](./security.md#remote-desktop-protocol) for a justification for this)

You should now be connected to a Windows computer via the app.

## Forwarding Local Ports to the Remote Machine

For [security reasons](./security.md#websockets) the ports to the 2 websocket servers on the remote machine can't be directly connected to.

Instead, their connections have to be wrapped by an SSH connection as follows

1. Copy the following commands to a text file and fill in the username and hostname variables with the values you received for `username` and `hostname`, respectively.

```bash
username=
hostname=

ssh -L 127.0.0.1:4284:127.0.0.1:4284 -L 127.0.0.1:4382:127.0.0.1:4382 -N $username@$hostname -v
```

2. Open a new terminal and copy-paste the edited commands into it and press Enter.
3. When prompted for a password, input the password you received and press Enter.

If successful, the logs should include the lines `Local connections to 127.0.0.1:4284 forwarded to remote address 127.0.0.1:4284` and `Local connections to 127.0.0.1:4382 forwarded to remote address 127.0.0.1:4382`.

## Running the Automation

To actually run the automation, follow these steps:

1. Clone this repository to your local machine
2. Open a new terminal in the same directory the repository was cloned into
3. Run this command to install dependencies

```bash
npm ci
```

3. Run this command to start the automation

```bash
npm run all
```

On the remote machine you should see a browser window appear and NVDA's focus highlighting move around.

In your local terminal, you should see logs showing the speech NVDA is generating, as well as what keyboard actions are being taken by the automation.

> You likely will need to click or otherwise manually activate the page the first time the automation is run so NVDA knows to start there. After that it remembers.

## Running Against Localhost on Your Local Machine

To enable accessing a web server on your local machine from the remote machine, follow these steps:

1. Update any references to `page.goto` in this repo to point at `http://127.0.0.1:port` or `https://127.0.0.1:port` (depending on if your web server is using HTTP or HTTPS) with `port` replaced by the port number the web server is listening on
2. Copy the following commands to a text file and fill in the username and hostname variables with the values you received for `username` and `hostname` respectively, as well as `port` with the port number the web server is listening on

```bash
username=
hostname=

ssh -R port:127.0.0.1:port -N $username@$hostname -v
```

The first port in the command is the port your web server is listening to on your local machine. The second port is the port it will be accessed from on the remote machine.

3. Open a new terminal and copy-paste the edited commands into it and press Enter.
4. When prompted for a password, input the password you received and press Enter.

If successful, the logs should include the line `Remote connections from LOCALHOST:port forwarded to local address 127.0.0.1:port`, with `port` replaced by the port number the web server is listening on.

## Terminating Connections

Use `Command+C` (or `Ctrl+C`) in any of the terminals to terminate either the websocket connections (from the automation script) or an SSH connection.
