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
 * @module logger
 */

const winston = require('winston');

/**
 * Winston logger for writing logs
 * @type {object}
 * @const
 */
const logger = winston.createLogger({
  level: process.env.PGP_LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logfile.log' }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),

  ),
  msg: 'HTTP {{req.method}} {{req.url}}',
  ignoredRoutes: ['/'],
});

logger.stream = {
  write: (info) => {
    logger.info(info);
  },
};

module.exports = logger;
