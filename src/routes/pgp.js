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

/** Express router providing pgps related routes
 * @module route/pgp
 * @requires express
 */

/* eslint-disable no-unused-vars */
const express = require('express');

/**
 * Express router to mount pgp related functions on.
 * @type {object}
 * @const
 * @namespace pgpRouter
 */
const router = express.Router();
const fs = require('fs');
const async = require('async');
const alphabetize = require('alphabetize-object-keys');
const pgp = require('../controller/pgp');
const logger = require('../logger');

const pgpSecret = process.env.PGP_SECRET || 'pgp-key';
const keyPath = process.env.PGP_KEY_PATH || '/keys';

/**
 * Route serving signing
 * @name post/sign
 * @function
 * @memberof module:route/pgp~pgpRouter
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware.
 */
router.post('/sign', (req, res, next) => {
  logger.info('Sign Request');
  const { body } = req;
  logger.debug('Input');
  logger.debug(body);
  const sortedBody = alphabetize(body);
  const results = [];
  const files = ['/public.asc', '/private.asc', '/password'];
  const filePaths = [];
  logger.debug('Sorted Input');
  logger.debug(sortedBody);
  files.forEach((file) => {
    filePaths.push(`${keyPath}/${pgpSecret}${file}`);
  });

  async.eachSeries(
    // Pass items to iterate over
    filePaths,
    // Pass iterator function that is called for each item
    (filename, cb) => {
      fs.readFile(filename, (err, content) => {
        if (!err) {
          results.push(content.toString());
        }
        // Calling cb makes it go to the next item.
        cb(err);
      });
    },
    // Final callback after each item has been iterated over.
    (err) => {
      if (err) {
        logger.error(err);
        const resp = {};
        resp.success = false;
        resp.message = 'cannot read keys';
        res.status(500).send(resp);
        return;
      }
      const publicKeyArmored = results[0];
      const privateKeyArmored = results[1];
      const passphrase = results[2];
      pgp.sign(privateKeyArmored, passphrase, JSON.stringify(sortedBody)).then((signature) => {
        logger.debug('Signature');
        logger.debug(signature);
        const buff = Buffer.from(signature);
        const signature64 = buff.toString('base64');
        pgp.getPublicFingerprint(publicKeyArmored).then((fingerprint) => {
          const resp = {};
          resp.signature = signature64;
          resp.fingerprint = fingerprint; // Alternative
          res.send(resp);
        });
      });
    },
  );
});

/**
 * Route serving validation
 * @name post/validate
 * @function
 * @memberof module:route/pgp~pgpRouter
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware.
 */
router.post('/validate', (req, res, next) => {
  logger.info('Validate Request');
  const body = req.body.input;
  logger.debug('Input');
  logger.debug(body);
  const sortedBody = alphabetize(body);
  logger.debug('Input');
  logger.debug(body);
  const signature64 = req.body.signature;
  logger.debug('Signature Base 64');
  logger.debug(signature64);
  const { fingerprint } = req.body;
  logger.debug('Fingerprint');
  logger.debug(fingerprint);
  const buff = Buffer.from(signature64, 'base64');
  const signature = buff.toString('ascii');
  logger.debug('Signature');
  logger.debug(signature);
  pgp.getPublicKey(fingerprint).then((publicKeyArmored) => { // Alternative
    pgp.validate(publicKeyArmored, signature, JSON.stringify(sortedBody)).then((valid) => {
      const resp = {};
      resp.valid = valid;
      resp.success = true;
      res.send(resp);
    }).catch((e) => {
      logger.error(e);
      const resp = {};
      resp.valid = false;
      resp.success = false;
      resp.message = e.message;
      res.status(400).send(resp);
    });
  }).catch((e) => {
    logger.error(e);
    const resp = {};
    resp.valid = false;
    resp.success = false;
    resp.message = e.message;
    res.status(400).send(resp);
  });
});

module.exports = router;
