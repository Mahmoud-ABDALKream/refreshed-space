# 🔐 Refreshed Space

**A Secure Messaging Application with End-to-End RSA Encryption**

---

## Overview

**Refreshed Space** is a secure, web-based messaging application designed to protect user credentials and message confidentiality through industry-standard cryptographic techniques. The system enables users to register, authenticate, and exchange encrypted messages — ensuring that sensitive data is never stored or transmitted in plain text.

Built with a hybrid encryption model combining **RSA-2048** and **AES-256-CBC**, Refreshed Space demonstrates how modern cryptographic principles can be practically applied to safeguard digital communication.

> This project was designed and developed from the ground up by **Refreshed Team** as part of the Security Two course assignment.

---

## Team

**Refreshed Team** is responsible for the complete design, development, and testing of this project.

| Member | 
| :--- | 
| **Mahmoud ABD ELKream** | 
| **Magdy Mohy** | 
| **Loai Ahmed** | 

---

## Project Goals

- Implement a functional secure messaging system using real cryptographic algorithms
- Demonstrate the practical application of **hash functions** for password security
- Demonstrate the practical application of **asymmetric encryption** for message confidentiality
- Ensure that no sensitive data (passwords or messages) is ever stored in plain text
- Provide a clean, intuitive user interface that makes encrypted communication accessible

---

## Features

### 🔑 Secure Authentication
- **User Registration** — New users can create accounts with a username and password
- **Password Hashing** — Passwords are hashed using **bcrypt** with salt rounds before storage; plain text passwords are never saved
- **Secure Login** — Authentication compares the bcrypt hash of the entered password against the stored hash

### 🛡️ Encrypted Messaging
- **RSA-2048 Key Generation** — Each user receives a unique public/private key pair upon registration
- **Hybrid Encryption** — Messages are encrypted using a combination of **RSA-OAEP** and **AES-256-CBC**
  - A random 256-bit AES key encrypts the message content
  - The AES key is then encrypted with the receiver's RSA public key
  - Only the intended recipient's private key can recover the AES key and decrypt the message
- **Ciphertext Storage** — Only encrypted data is stored in the database; decryption happens on-the-fly for authorized recipients

### 💬 Messaging Interface
- Send encrypted messages to any registered user
- View decrypted inbox messages (decrypted with your private key)
- View sent messages (stored as ciphertext — only the recipient can decrypt)
- Inspect raw ciphertext to verify encryption is working
- Real-time refresh of messages

### 📖 Educational Panel
- Built-in "How It Works" section explaining the cryptographic pipeline
- Step-by-step breakdown of password hashing, key generation, and hybrid encryption

---

## Technologies Used

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 | Full-stack web application framework |
| **Language** | TypeScript | Type-safe development |
| **Frontend** | React 19 + Tailwind CSS 4 | UI components and responsive styling |
| **UI Library** | shadcn/ui | Accessible, customizable component set |
| **Backend** | Next.js API Routes | RESTful API endpoints |
| **Database** | SQLite via Prisma ORM | Data persistence and schema management |
| **Password Hashing** | bcrypt | Secure one-way password hashing with salt |
| **Encryption** | node-forge | RSA key generation, encryption, and decryption |
| **Encryption Scheme** | RSA-OAEP + AES-256-CBC | Hybrid encryption for messages of any length |

---

## Encryption Architecture

```
┌─────────────┐                          ┌─────────────┐
│   SENDER    │                          │  RECEIVER   │
│             │                          │             │
│  Plaintext  │                          │  Private Key│
│     │       │                          │     │       │
│     ▼       │                          │     ▼       │
│  AES-256    │    RSA-OAEP Encrypted    │  RSA-OAEP   │
│  Encrypt    │    AES Key ──────────►   │  Decrypt    │
│     │       │                          │     │       │
│     ▼       │                          │     ▼       │
│  Ciphertext │    Encrypted Message ──► │  AES-256    │
│             │                          │  Decrypt    │
│             │                          │     │       │
│             │                          │     ▼       │
│             │                          │  Plaintext  │
└─────────────┘                          └─────────────┘
```

### Why Hybrid Encryption?

RSA alone can only encrypt data smaller than its key size (≈245 bytes for 2048-bit RSA). To support messages of any length, Refreshed Space uses a **hybrid approach**:

1. A random **AES-256 key** is generated for each message
2. The message is encrypted with **AES-256-CBC** (supports any length)
3. The AES key is encrypted with the receiver's **RSA-2048 public key**
4. Both the encrypted AES key and encrypted message are stored together
5. Only the receiver's **private key** can decrypt the AES key, which then decrypts the message

---

## Project Structure

```
refreshed-space/
├── prisma/
│   └── schema.prisma              # Database schema (Users & Messages)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/      # POST - User registration
│   │   │   │   │   └── route.ts
│   │   │   │   └── login/         # POST - User authentication
│   │   │   │       └── route.ts
│   │   │   ├── messages/          # POST/GET - Send & list messages
│   │   │   │   └── route.ts
│   │   │   └── users/             # GET - List registered users
│   │   │       └── route.ts
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Main application (auth + messaging)
│   │   └── globals.css            # Global styles
│   ├── components/ui/             # shadcn/ui component library
│   ├── hooks/                     # Custom React hooks
│   └── lib/
│       ├── crypto.ts              # RSA & AES encryption utilities
│       ├── db.ts                  # Prisma database client
│       └── utils.ts               # Shared utility functions
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **bun** (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/refreshed-team/refreshed-space.git
cd refreshed-space

# Install dependencies
bun install

# Set up the database
bun run db:push

# Start the development server
bun run dev
```

The application will be available at `http://localhost:3000`.

### Usage

1. **Register** — Create a new account with a username and password. An RSA-2048 key pair is automatically generated for you.
2. **Login** — Authenticate with your credentials. Your password is verified using bcrypt comparison.
3. **Send a Message** — Select a registered user as the recipient, type your message, and hit "Encrypt & Send". The message is encrypted with the receiver's public key before storage.
4. **Read Messages** — Switch to the "Received" tab to view messages decrypted with your private key. Click "View Ciphertext" to inspect the raw encrypted data.

---

## Encryption Method Used

This project implements **Option B: Asymmetric Encryption using RSA**.

The encryption system uses a **hybrid RSA-OAEP + AES-256-CBC** scheme via the `node-forge` library:

- **RSA-2048** key pairs are generated for each user upon registration using `forge.pki.rsa.generateKeyPair({ bits: 2048 })`
- Messages are encrypted using the **receiver's RSA public key** — only the intended recipient can decrypt them
- Since RSA alone cannot encrypt data larger than its key size (≈245 bytes), a hybrid approach is used:
  1. A random **256-bit AES key** and **16-byte IV** are generated per message
  2. The plaintext message is encrypted with **AES-256-CBC** (`forge.cipher.createCipher`)
  3. The AES key is encrypted with the receiver's **RSA-2048 public key** using **RSA-OAEP** with SHA-256 (`publicKey.encrypt(aesKey, 'RSA-OAEP', { md: forge.md.sha256.create() })`)
  4. The encrypted AES key, IV, and encrypted message are stored as a JSON payload in the database
  5. Decryption reverses the process: RSA-OAEP decrypts the AES key, then AES-256-CBC decrypts the message
- Implementation file: `src/lib/crypto.ts` — contains `generateRSAKeyPair()`, `encryptMessage()`, and `decryptMessage()`

## Password Hashing Implementation

Password security is implemented using **bcrypt**, a proven adaptive hashing algorithm, via the `bcryptjs` library:

| Property | Implementation |
| :--- | :--- |
| **Algorithm** | bcrypt |
| **Salt Rounds** | 10 |
| **Hashing on Registration** | `bcrypt.hash(password, 10)` — the plain text password is hashed with an auto-generated salt before storage |
| **Verification on Login** | `bcrypt.compare(inputPassword, storedHash)` — constant-time comparison that prevents timing attacks |
| **Storage** | Only the bcrypt hash is stored in the `passwordHash` field of the Users table — the plain text password is **never** stored |
| **Plain Text** | Never stored, never logged, never transmitted after the login request |

**How it works step by step:**

1. **Registration:** When a user submits a password, `bcrypt.hash(password, 10)` generates a salt (using 10 rounds) and produces a hash like `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`. This hash is stored in the database.
2. **Login:** When a user attempts to log in, the submitted password is passed to `bcrypt.compare(password, storedHash)`. bcrypt extracts the salt from the stored hash, re-hashes the input password with that salt, and compares the result in constant time. Access is granted only if the hashes match.

---

## Future Improvements

- **WebSocket Real-Time Messaging** — Instant message delivery without manual refresh
- **End-to-End Forward Secrecy** — Implement Diffie-Hellman key exchange for session keys
- **Digital Signatures** — Sign messages with the sender's private key for authentication and non-repudiation
- **Message Expiration** — Auto-delete messages after a configurable time period
- **Multi-Device Support** — Allow users to register multiple public keys across devices
- **Zero-Knowledge Architecture** — Move decryption entirely to the client side so the server never sees private keys
- **Rate Limiting & Account Lockout** — Protect against brute-force login attempts
- **Dark Mode** — Enhanced UI theming for accessibility

---

## Contact

For inquiries, collaboration, or feedback, please reach out to any member of **Refreshed Team**:

- **Mahmoud ABD ELKream**
- **Magdy Mohy**
- **Loai Ahmed**

---

## Copyright

© 2026 **Refreshed Team**. All rights reserved.

This project was developed by Refreshed Team for the Security Two course. All design, code, and documentation are the original work of the team members listed above. Unauthorized reproduction or distribution is prohibited without written permission.
