Here is the correctly formatted README.md. I have applied proper code blocks, headers, and syntax highlighting so you can copy and paste this directly into GitHub.
# SecurePixel JS SDK 🛡️

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NPM Version](https://img.shields.io/npm/v/securepixel-js?color=red)](https://www.npmjs.com/package/securepixel-js)
[![Size](https://img.shields.io/badge/size-~3kb_gzipped-green.svg)]()

The official JavaScript SDK for **[SecurePixel](https://securepixel.dippanbhusal.tech)**.

**SecurePixel JS** is a lightweight, zero-dependency library that allows developers to perform military-grade image encryption and steganography directly in the browser. It transforms sensitive images into "Visual Noise" (static) using the **Web Crypto API (AES-256-GCM)**, ensuring data never leaves the client side unencrypted.

## ✨ Features

* **Zero Dependencies:** Built on native browser APIs. No bloat.
* **Client-Side Only:** True "Zero Knowledge" architecture.
* **Steganography:** Encrypted output is a valid PNG image that looks like TV static.
* **Military-Grade Security:**
    * **Encryption:** AES-GCM (256-bit)
    * **Key Derivation:** PBKDF2 (SHA-256, 100,000 iterations)
* **Universal:** Works in all modern browsers and Node.js (via polyfills).

---

## 📦 Installation

### Option 1: CDN (Browser)
The easiest way to use SecurePixel is via CDN. No build tools required.

```html
<script src="https://cdn.jsdelivr.net/gh/KDippan/securepixel-js@v1.0.0/sdk.js"></script>
```
```html
<script src="https://cdn.jsdelivr.net/gh/KDippan/securepixel-js@main/sdk.js"></script>
```
Option 2: NPM (Modern Web Apps)
Install via NPM for React, Vue, Angular, or Node projects.
npm install securepixel-js

🚀 Usage Guide
1. Initialization
First, create an instance of the library.
```js
// If using CDN:
const securePixel = new SecurePixel();

// If using ES Modules / Bundlers:
import SecurePixel from 'securepixel-js';
const securePixel = new SecurePixel();
```
2. Encrypting an Image
Takes a standard File object (e.g., from an ```html <input type="file"> ```) and a password. Returns a Blob of the encrypted PNG.
```js
const fileInput = document.getElementById('imageInput');
const password = "my-secret-password";

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];

    try {
        console.log("Encrypting...");
        
        // Returns a Blob (image/png)
        const encryptedBlob = await securePixel.encrypt(file, password);
        
        // Display or Download the result
        const url = URL.createObjectURL(encryptedBlob);
        document.getElementById('preview').src = url;
        
        console.log("Encryption Complete!");
    } catch (error) {
        console.error("Encryption failed:", error);
    }
});
```
3. Decrypting an Image
Takes the encrypted "Noise Image" (as a File or Blob) and the password. Returns a Blob of the original image.
```js
const noiseInput = document.getElementById('noiseInput');
const password = "my-secret-password";

noiseInput.addEventListener('change', async (e) => {
    const noiseFile = e.target.files[0];

    try {
        console.log("Decrypting...");
        
        // Returns a Blob (image/png) of the original photo
        const originalBlob = await securePixel.decrypt(noiseFile, password);
        
        // Display the result
        const url = URL.createObjectURL(originalBlob);
        document.getElementById('result').src = url;
        
    } catch (error) {
        alert("Decryption failed! Wrong password or corrupted file.");
    }
});
```
🔧 API Reference
encrypt(imageFile, password)
 * imageFile (File|Blob): The source image to encrypt.
 * password (String): The secret passphrase.
 * Returns: Promise<Blob> (The encrypted PNG).
decrypt(noiseFile, password)
 * noiseFile (File|Blob): The encrypted static/noise image.
 * password (String): The secret passphrase used during encryption.
 * Returns: Promise<Blob> (The decrypted original image).
🔒 Technical Details
SecurePixel uses the Web Crypto API (window.crypto.subtle) for all operations.
 * Key Generation: A unique 16-byte Salt is generated. The password is run through PBKDF2 (100,000 iterations, SHA-256) to derive a cryptographic key.
 * Encryption: The image binary is encrypted using AES-256-GCM. A unique 12-byte IV (Initialization Vector) is generated for every encryption.
 * Steganography:
   * The Salt, IV, and Encrypted Data are packed into a buffer.
   * This buffer is mapped to the RGB pixels of a new HTML5 Canvas.
   * The alpha channel is set to 255 (opaque).
   * Unused pixels are filled with random noise to ensure the image looks uniform.
📄 License
Distributed under the MIT License. See LICENSE for more information.
Author: Dippan Bhusal

