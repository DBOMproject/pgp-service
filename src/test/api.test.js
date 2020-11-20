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

const chai = require('chai');
const chaiHttp = require('chai-http');

const { expect } = chai;
chai.use(chaiHttp);
const decache = require('decache');
const { before, describe, it } = require('mocha');
const sinon = require('sinon');
const fs = require('fs');
const { HKP } = require('openpgp');

let app;

before((done) => {
  process.env.PGP_SECRET = 'pgp-key';
  process.env.PGP_KEY_PATH = './test';
  process.env.HKP_ADDRESS = 'http://localhost:11371';
  decache('../app');
  // eslint-disable-next-line global-require
  app = require('../app');
  done();
});

describe('Index', () => {
  it('Index', (done) => {
    chai
      .request(app)
      .get('/')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.equals('PGP Service');
        done();
      });
  });
});

describe('Sign', () => {
  it('Sign', (done) => {
    chai
      .request(app)
      .post('/pgp/sign')
      .send({
        test: 'test',
        abc: 'abc',
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        // eslint-disable-next-line no-unused-expressions
        expect(res.body.signature).to.exist;
        expect(res.body.fingerprint).to.equal('a2cfe3db6dcf3ad0b5284a6d0ff93c2192aa7aef');
        done();
      });
  });
});

describe('Validate', () => {
  const publicKey = fs.readFileSync('./test/pgp-key/public.asc',
    { encoding: 'utf8', flag: 'r' });
  let isLoggedInStub;

  // eslint-disable-next-line no-undef
  afterEach((done) => {
    isLoggedInStub.restore();
    done();
  });

  it('Validate', (done) => {
    isLoggedInStub = sinon.stub(HKP.prototype, 'lookup').resolves(publicKey);
    chai
      .request(app)
      .post('/pgp/validate')
      .send({
        input: {
          test: 'test',
          abc: 'abc',
        },
        signature: 'LS0tLS1CRUdJTiBQR1AgU0lHTkFUVVJFLS0tLS0NClZlcnNpb246IE9wZW5QR1AuanMgdjQuMTAuNA0KQ29tbWVudDogaHR0cHM6Ly9vcGVucGdwanMub3JnDQoNCndsNEVBUk1JQUFZRkFsOWhLcTBBQ2drUUQvazhJWktxZXU4UDd3RCtJb2NidlVtNEowOU41WDVQREtxVA0Kc3hFYkZLeWJEd2g0WE93MnF6L0QycDhCQUozZkxVQmF1Uk1VcWJjbk1kQzRJOW5GUWF1V05XQXRmempBDQpOUUwwa0Nxcw0KPXBtZmcNCi0tLS0tRU5EIFBHUCBTSUdOQVRVUkUtLS0tLQ0K',
        fingerprint: 'a2cfe3db6dcf3ad0b5284a6d0ff93c2192aa7aef',
      })
      .end((err, res) => {
        // eslint-disable-next-line no-unused-expressions
        expect(isLoggedInStub.calledOnce).to.be.true;
        expect(res).to.have.status(200);
        expect(res.body.valid).to.equal(true);
        expect(res.body.success).to.equal(true);
        done();
      });
  });

  it('Validate Bad Fingerprint', (done) => {
    isLoggedInStub = sinon.stub(HKP.prototype, 'lookup').resolves(publicKey);
    chai
      .request(app)
      .post('/pgp/validate')
      .send({
        input: {
          test: 'test',
          abc: 'abc',
        },
        signature: 'LS0tLS1CRUdJTiBQR1AgU0lHTkFUVVJFLS0tLS0NClZlcnNpb246IE9wZW5QR1AuanMgdjQuMTAuNA0KQ29tbWVudDogaHR0cHM6Ly9vcGVucGdwanMub3JnDQoNCndsNEVBUllLQUFZRkFsOFBRaWdBQ2drUXZCU3RsLzRyUUMveDF3RUEzeHV0eUc0NjhjeGJPWlQ1MFhOTA0KSGI2clAwVXNTNEV1b2JPQkwwNWZZUmdCQUtDK1FiU05GYTBFTGVzVWdmMGNPc2xQb3FscXUwOHM1TjNnDQplWUNueStZTw0KPVBvdlkNCi0tLS0tRU5EIFBHUCBTSUdOQVRVUkUtLS0tLQ0K',
        fingerprint: '91ebaee7c045b7b13b6cd64dbc14ad97fe2b402f',
      })
      .end((err, res) => {
        // eslint-disable-next-line no-unused-expressions
        expect(isLoggedInStub.calledOnce).to.be.true;
        expect(res).to.have.status(400);
        done();
      });
  });

  it('Validate Bad Signature', (done) => {
    isLoggedInStub = sinon.stub(HKP.prototype, 'lookup').resolves(publicKey);
    chai
      .request(app)
      .post('/pgp/validate')
      .send({
        input: {
          test: 'test2',
          abc: 'abc',
        },
        signature: 'LS0tLS1CRUdJTiBQR1AgU0lHTkFUVVJFLS0tLS0NClZlcnNpb246IE9wZW5QR1AuanMgdjQuMTAuNA0KQ29tbWVudDogaHR0cHM6Ly9vcGVucGdwanMub3JnDQoNCndsNEVBUk1JQUFZRkFsOWhLcTBBQ2drUUQvazhJWktxZXU4UDd3RCtJb2NidlVtNEowOU41WDVQREtxVA0Kc3hFYkZLeWJEd2g0WE93MnF6L0QycDhCQUozZkxVQmF1Uk1VcWJjbk1kQzRJOW5GUWF1V05XQXRmempBDQpOUUwwa0Nxcw0KPXBtZmcNCi0tLS0tRU5EIFBHUCBTSUdOQVRVUkUtLS0tLQ0K',
        fingerprint: 'a2cfe3db6dcf3ad0b5284a6d0ff93c2192aa7aef',
      })
      .end((err, res) => {
        // eslint-disable-next-line no-unused-expressions
        expect(isLoggedInStub.calledOnce).to.be.true;
        expect(res).to.have.status(200);
        expect(res.body.valid).to.equal(false);
        expect(res.body.success).to.equal(true);
        done();
      });
  });
  it('Validate Fingerprint Not Found', (done) => {
    isLoggedInStub = sinon.stub(HKP.prototype, 'lookup').resolves(null);
    chai
      .request(app)
      .post('/pgp/validate')
      .send({
        input: {
          test: 'test',
          abc: 'abc',
        },
        signature: 'LS0tLS1CRUdJTiBQR1AgU0lHTkFUVVJFLS0tLS0NClZlcnNpb246IE9wZW5QR1AuanMgdjQuMTAuNA0KQ29tbWVudDogaHR0cHM6Ly9vcGVucGdwanMub3JnDQoNCndsNEVBUk1JQUFZRkFsOWhLcTBBQ2drUUQvazhJWktxZXU4UDd3RCtJb2NidlVtNEowOU41WDVQREtxVA0Kc3hFYkZLeWJEd2g0WE93MnF6L0QycDhCQUozZkxVQmF1Uk1VcWJjbk1kQzRJOW5GUWF1V05XQXRmempBDQpOUUwwa0Nxcw0KPXBtZmcNCi0tLS0tRU5EIFBHUCBTSUdOQVRVUkUtLS0tLQ0K',
        fingerprint: 'a2cfe3db6dcf3ad0b5284a6d0ff93c2192aa7aef',
      })
      .end((err, res) => {
        // expect(isLoggedInStub.calledOnce).to.be.true;
        expect(res).to.have.status(400);
        expect(res.body.valid).to.equal(false);
        expect(res.body.success).to.equal(false);
        done();
      });
  });
  it('Bad', (done) => {
    isLoggedInStub = sinon.stub(HKP.prototype, 'lookup').resolves(publicKey);
    chai
      .request(app)
      .post('/pgp/validate')
      .send({
        input: {
          test: 'test',
          abc: 'abc',
        },
        signature: 'bad',
        fingerprint: 'a2cfe3db6dcf3ad0b5284a6d0ff93c2192aa7aef',
      })
      .end((err, res) => {
        // expect(isLoggedInStub.calledOnce).to.be.true;
        expect(res).to.have.status(400);
        expect(res.body.valid).to.equal(false);
        expect(res.body.success).to.equal(false);
        done();
      });
  });
});
