# SSH Authentication Guide

This guide covers all supported authentication methods for SSH MCP Server.

## Authentication Methods

### 1. Password Authentication

The simplest method - authenticate using username and password.

```javascript
// Test connection
{
  "name": "my-server",
  "host": "192.168.1.100",
  "port": 22,
  "username": "admin",
  "password": "secure-password"
}
```

**Pros:**
- Simple and straightforward
- No key management needed

**Cons:**
- Less secure than key-based authentication
- Password stored in database
- Some servers disable password authentication

---

### 2. Private Key Authentication (File Path) ⭐ Recommended

Use a private key file from your filesystem.

```javascript
// With unencrypted key
{
  "name": "my-server",
  "host": "192.168.1.100",
  "port": 22,
  "username": "admin",
  "privateKeyPath": "/home/user/.ssh/id_rsa"
}

// With encrypted key (passphrase protected)
{
  "name": "my-server",
  "host": "192.168.1.100",
  "port": 22,
  "username": "admin",
  "privateKeyPath": "/home/user/.ssh/id_ed25519",
  "passphrase": "key-passphrase"
}
```

**Pros:**
- More secure than password
- Key content not stored in database (only path)
- Standard SSH workflow
- Supports encrypted keys

**Cons:**
- Requires key file to exist at specified path
- If file moves, connection breaks

**Supported Key Types:**
- RSA
- DSA
- ECDSA
- Ed25519

---

### 3. Private Key Authentication (Inline)

Pass the private key content directly as a string.

```javascript
{
  "name": "my-server",
  "host": "192.168.1.100",
  "port": 22,
  "username": "admin",
  "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\n...\n-----END OPENSSH PRIVATE KEY-----"
}

// With passphrase
{
  "name": "my-server",
  "host": "192.168.1.100",
  "port": 22,
  "username": "admin",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\n...",
  "passphrase": "key-passphrase"
}
```

**Pros:**
- Works even if key file doesn't exist on system
- Portable - can be used anywhere

**Cons:**
- Full key content stored in database
- Less secure storage
- Larger database size

**Use Cases:**
- Temporary keys
- CI/CD environments
- Keys from secrets management

---

## Common Scenarios

### Scenario 1: Standard SSH Setup (Default Keys)

Most Linux systems store SSH keys in `~/.ssh/`:

```javascript
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "deploy",
  "privateKeyPath": "/home/user/.ssh/id_rsa"  // or id_ed25519
}
```

### Scenario 2: Multiple Keys per Host

Different keys for different purposes:

```javascript
// Production server
{
  "name": "prod-server",
  "host": "prod.example.com",
  "port": 22,
  "username": "deploy",
  "privateKeyPath": "/home/user/.ssh/prod_deploy_key"
}

// Staging server
{
  "name": "staging-server",
  "host": "staging.example.com",
  "port": 22,
  "username": "deploy",
  "privateKeyPath": "/home/user/.ssh/staging_deploy_key"
}
```

### Scenario 3: SSH Key with Non-standard Port

```javascript
{
  "name": "custom-port-server",
  "host": "example.com",
  "port": 2222,
  "username": "admin",
  "privateKeyPath": "/home/user/.ssh/custom_key"
}
```

### Scenario 4: Password Fallback

If key authentication fails, some servers allow password fallback:

```javascript
// Note: ssh2 library will try key first, then password if key fails
// This is NOT standard behavior - test your specific setup
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "privateKeyPath": "/home/user/.ssh/id_rsa",
  "password": "fallback-password"  // Will try key first
}
```

---

## Generating SSH Keys

If you don't have SSH keys, generate them:

### Ed25519 (Recommended - Modern, Fast, Secure)

```bash
# Generate key
ssh-keygen -t ed25519 -C "your_email@example.com"

# With passphrase protection (recommended)
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/my_key
```

### RSA (Traditional, Widely Supported)

```bash
# Generate 4096-bit RSA key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### Copy Public Key to Server

```bash
# Copy to remote server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@hostname

# Or manually
cat ~/.ssh/id_ed25519.pub | ssh user@hostname "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

---

## Security Best Practices

### 1. Protect Database File

```bash
# Restrict database permissions
chmod 600 ssh_connections.db

# Only owner can read/write
ls -l ssh_connections.db
# -rw------- 1 user user 12288 Nov 20 12:00 ssh_connections.db
```

### 2. Use Encrypted Keys

Always protect private keys with passphrases:

```bash
# Add passphrase to existing key
ssh-keygen -p -f ~/.ssh/id_rsa
```

### 3. Key File Permissions

```bash
# Private key permissions (must be 600)
chmod 600 ~/.ssh/id_rsa

# Public key permissions
chmod 644 ~/.ssh/id_rsa.pub

# .ssh directory
chmod 700 ~/.ssh
```

### 4. Prefer File Path Over Inline

✅ **Good:**
```javascript
{ "privateKeyPath": "/home/user/.ssh/id_rsa" }
```

❌ **Less Secure:**
```javascript
{ "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n..." }
```

### 5. Rotate Keys Regularly

```bash
# Generate new key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_new

# Update server authorized_keys
ssh-copy-id -i ~/.ssh/id_ed25519_new.pub user@server

# Test new key
ssh -i ~/.ssh/id_ed25519_new user@server

# Remove old key from server
# Edit ~/.ssh/authorized_keys on server

# Update connection in database
# Use ssh_save_connection with new privateKeyPath
```

---

## Troubleshooting

### "Permission denied (publickey)"

1. Check key file permissions: `ls -l ~/.ssh/id_rsa`
2. Verify public key is on server: `cat ~/.ssh/authorized_keys` (on server)
3. Check SSH server config allows key auth: `PermitRootLogin` in `/etc/ssh/sshd_config`

### "Failed to read private key"

1. Verify file path is correct
2. Check file permissions (should be readable)
3. Ensure key format is correct (PEM or OpenSSH format)

### "Connection timeout"

1. Check host is reachable: `ping hostname`
2. Verify port is correct: `nc -zv hostname 22`
3. Check firewall rules

### "Authentication failed"

1. Test with standard ssh: `ssh -i ~/.ssh/key user@host`
2. Verify username is correct
3. Check if passphrase is required
4. Ensure key is authorized on server

---

## Testing Connections

### Test Before Saving

Always test connections before saving:

```javascript
// 1. Test first
ssh_test_connection({
  "name": "test-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "privateKeyPath": "/home/user/.ssh/id_rsa"
})
// ✓ Connection test successful for example.com

// 2. Then save
ssh_save_connection({
  "name": "test-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "privateKeyPath": "/home/user/.ssh/id_rsa"
})
// ✓ Connection saved successfully. ID: abc-123
```

### Test from Command Line

```bash
# Test SSH connection manually
ssh -i ~/.ssh/id_rsa -p 22 user@hostname

# Verbose mode for debugging
ssh -vvv -i ~/.ssh/id_rsa user@hostname
```

---

## Examples by Use Case

### Web Server Management

```javascript
{
  "name": "web-server-01",
  "host": "web01.example.com",
  "port": 22,
  "username": "webadmin",
  "privateKeyPath": "/home/ops/.ssh/web_deploy_key"
}
```

### Database Server (Bastion/Jump Host)

```javascript
{
  "name": "db-bastion",
  "host": "bastion.example.com",
  "port": 22,
  "username": "dbadmin",
  "privateKeyPath": "/home/ops/.ssh/db_bastion_key",
  "passphrase": "secure-passphrase"
}
```

### IoT/Embedded Device

```javascript
{
  "name": "raspberry-pi",
  "host": "192.168.1.50",
  "port": 22,
  "username": "pi",
  "password": "raspberry"  // Default password (change this!)
}
```

### CI/CD Runner

```javascript
{
  "name": "ci-runner",
  "host": "runner.ci.example.com",
  "port": 2222,
  "username": "deploy",
  "privateKey": process.env.CI_DEPLOY_KEY  // From environment
}
```

---

## Summary

| Method | Security | Use Case | Recommendation |
|--------|----------|----------|----------------|
| Password | ⭐⭐ | Simple setups, testing | Avoid for production |
| Private Key (File) | ⭐⭐⭐⭐⭐ | Production servers | **Recommended** |
| Private Key (Inline) | ⭐⭐⭐ | CI/CD, temporary | Use when file access not available |
| Encrypted Key | ⭐⭐⭐⭐⭐ | Maximum security | **Best practice** |

**Best Practice:** Use `privateKeyPath` with encrypted keys (passphrase protected) for production environments.
