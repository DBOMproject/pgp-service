/*
 *  Copyright 2020 Unisys Corporation
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

/**
 * @module pgp
 */

/* eslint-disable no-async-promise-executor */
/* eslint-disable no-unused-vars */
const openpgp = require('openpgp');
const logger = require('../logger');

const hkpAddress = process.env.HKP_ADDRESS || 'http://localhost:11371';

/**
 * Signs data using a private pgp key
 * @func
 * @param privateKeyArmored {string} the key to sign the data with
 * @param passphrase {string} the passphrase to use the key
 * @param data {object} data to sign
 */
function sign(privateKeyArmored, passphrase, data) {
  logger.info('Sign');
  return new Promise(async (fulfill, reject) => {
    const { keys: [privateKey] } = await openpgp.key.readArmored(privateKeyArmored);
    privateKey.decrypt(passphrase);
    const { signature: detachedSignature } = await openpgp.sign({
      message: openpgp.cleartext.fromText(data), // CleartextMessage or Message object
      privateKeys: [privateKey], // for signing
      detached: true,
    });
    fulfill(detachedSignature);
  });
}

/**
 * Gets the fingerprint of a public pgp key
 * @func
 * @param publicKeyArmored {string} the public key
 */
function getPublicFingerprint(publicKeyArmored) {
  return new Promise(async (fulfill, reject) => {
    logger.info('Get fingerprint');
    const { keys: [publicKey] } = await openpgp.key.readArmored(publicKeyArmored);
    fulfill(publicKey.getFingerprint());
  });
}

/**
 * Gets the public key from an hkp server for a given fingerprint
 * @func
 * @param fingerprint {string} the public key fingerprint
 */
function getPublicKey(fingerprint) {
  return new Promise(async (fulfill, reject) => {
    logger.info('Get public key');
    const hkp = new openpgp.HKP(hkpAddress);
    hkp.lookup({ keyId: fingerprint }).then((key) => {
      if (!key || key === null) {
        reject(new Error('invalid fingerprint'));
      }
      fulfill(key);
    });
  });
}

/**
 * Validates the signature matches the passed data
 * @func
 * @param publicKeyArmored {string} the public key
 * @param detachedSignature {string} the signature
 * @param data {object} data to valdiate
 */
function validate(publicKeyArmored, detachedSignature, input) {
  logger.info('Validate');
  return new Promise(async (fulfill, reject) => {
    let signature;
    try {
      const verified = await openpgp.verify({
        message: openpgp.cleartext.fromText(input), // CleartextMessage or Message object
        signature: await openpgp.signature.readArmored(detachedSignature), // parse signature
        publicKeys: (await openpgp.key.readArmored(publicKeyArmored)).keys, // for verification
      });
      const { valid } = verified.signatures[0];
      if (valid === true) {
        logger.debug(`signed by key id ${verified.signatures[0].keyid.toHex()}`);
        fulfill(valid);
      } else if (valid === false) {
        logger.error('invalid signature');
        fulfill(valid);
      } else {
        logger.error('invalid fingerprint');
        reject(new Error('invalid fingerprint'));
      }
    } catch (e) {
      logger.error(e);
      reject(e.message);
    }
  });
}

exports.sign = sign;
exports.getPublicFingerprint = getPublicFingerprint;
exports.validate = validate;
exports.getPublicKey = getPublicKey;
