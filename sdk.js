/**
 * SecurePixel JS SDK v1.0.0
 * Lightweight Client-Side Steganography & Encryption
 * * @license MIT
 * @author Dippan Bhusal <dippan.connect@gmail.com>
 * @repository https://github.com/KDippan/securepixel-js
 */

(function (global, factory) {
    // Universal Module Definition (UMD) to support CommonJS, ES Modules, and Browser Globals
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory(); // Node.js / CommonJS
    } else {
        global.SecurePixel = factory(); // Browser Window
    }
}(typeof self !== 'undefined' ? self : this, function () {

    class SecurePixel {
        constructor() {
            this.algo = { name: "AES-GCM", length: 256 };
        }

        /**
         * Internal: Derive a CryptoKey from a password using PBKDF2
         */
        async _deriveKey(password, salt) {
            const enc = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
            );
            return window.crypto.subtle.deriveKey(
                { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
                keyMaterial,
                this.algo,
                false,
                ["encrypt", "decrypt"]
            );
        }

        /**
         * Encrypt an image file into a "Visual Noise" PNG
         * @param {File} imageFile - The original image file
         * @param {string} password - The password for encryption
         * @returns {Promise<Blob>} - Resolves with the encrypted PNG Blob
         */
        async encrypt(imageFile, password) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject("Failed to read file");
                reader.onload = async (e) => {
                    try {
                        const img = new Image();
                        img.src = e.target.result;
                        img.onload = async () => {
                            // 1. Prepare Crypto
                            const salt = window.crypto.getRandomValues(new Uint8Array(16));
                            const iv = window.crypto.getRandomValues(new Uint8Array(12));
                            const key = await this._deriveKey(password, salt);

                            // 2. Convert Image to Binary
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0);
                            const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
                            const fileBuffer = await blob.arrayBuffer();

                            // 3. Encrypt
                            const encryptedContent = await window.crypto.subtle.encrypt(
                                { name: "AES-GCM", iv: iv }, key, fileBuffer
                            );

                            // 4. Create Steganography (Noise)
                            const finalBlob = await this._createNoiseImage(encryptedContent, salt, iv);
                            resolve(finalBlob);
                        };
                        img.onerror = () => reject("Invalid image file");
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.readAsDataURL(imageFile);
            });
        }

        /**
         * Internal: Map Encrypted Data to Pixels
         */
        async _createNoiseImage(encryptedBuffer, salt, iv) {
            // Header Structure: Salt (16) + IV (12) + Data Length (4) + Data
            const dataView = new Uint8Array(encryptedBuffer);
            const lenBuffer = new Uint32Array([dataView.byteLength]); 
            
            const totalLen = 16 + 12 + 4 + dataView.byteLength;
            const combined = new Uint8Array(totalLen);
            combined.set(salt, 0);
            combined.set(iv, 16);
            combined.set(new Uint8Array(lenBuffer.buffer), 28);
            combined.set(dataView, 32);

            // Calculate required size (Square Image)
            const requiredPixels = Math.ceil(totalLen / 3);
            const side = Math.ceil(Math.sqrt(requiredPixels)); 
            
            const canvas = document.createElement("canvas");
            canvas.width = side;
            canvas.height = side;
            const ctx = canvas.getContext("2d");
            const imgData = ctx.createImageData(side, side);
            const pixels = imgData.data;

            let byteIdx = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                if (byteIdx < totalLen) {
                    pixels[i] = combined[byteIdx++] || 0;     // R
                    pixels[i + 1] = combined[byteIdx++] || 0; // G
                    pixels[i + 2] = combined[byteIdx++] || 0; // B
                    pixels[i + 3] = 255;                      // Alpha (Always 255)
                } else {
                    // Fill remaining pixels with random noise
                    pixels[i] = Math.floor(Math.random() * 256);
                    pixels[i + 1] = Math.floor(Math.random() * 256);
                    pixels[i + 2] = Math.floor(Math.random() * 256);
                    pixels[i + 3] = 255;
                }
            }

            ctx.putImageData(imgData, 0, 0);
            return new Promise(r => canvas.toBlob(r, "image/png"));
        }

        /**
         * Decrypt a "Visual Noise" image back to original
         * @param {File} noiseImageFile - The encrypted PNG file
         * @param {string} password - The password for decryption
         * @returns {Promise<Blob>} - Resolves with the original image Blob
         */
        async decrypt(noiseImageFile, password) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject("Failed to read file");
                reader.onload = async (e) => {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = async () => {
                        try {
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0);
                            const imgData = ctx.getImageData(0, 0, img.width, img.height);
                            const pixels = imgData.data;

                            // Extract Bytes from RGB channels
                            const extracted = [];
                            for (let i = 0; i < pixels.length; i += 4) {
                                extracted.push(pixels[i]);     
                                extracted.push(pixels[i + 1]); 
                                extracted.push(pixels[i + 2]); 
                            }
                            const buffer = new Uint8Array(extracted);

                            // Parse Header
                            const salt = buffer.slice(0, 16);
                            const iv = buffer.slice(16, 28);
                            const lenView = new Uint32Array(buffer.slice(28, 32).buffer);
                            const dataLen = lenView[0];
                            
                            // Validate Integrity
                            if (dataLen > buffer.length || dataLen <= 0) {
                                throw new Error("Invalid or corrupted SecurePixel image");
                            }

                            const encryptedData = buffer.slice(32, 32 + dataLen);

                            // Decrypt
                            const key = await this._deriveKey(password, salt);
                            const decrypted = await window.crypto.subtle.decrypt(
                                { name: "AES-GCM", iv: iv }, key, encryptedData
                            );

                            const decryptedBlob = new Blob([decrypted], { type: "image/png" });
                            resolve(decryptedBlob);

                        } catch (err) {
                            reject("Decryption failed. Check password or image integrity.");
                        }
                    };
                    img.onerror = () => reject("Not a valid image file");
                };
                reader.readAsDataURL(noiseImageFile);
            });
        }
    }

    return SecurePixel;
}));
