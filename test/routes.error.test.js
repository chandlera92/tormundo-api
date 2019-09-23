process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const server = require('../src/server/index');

describe('routes : error', () => {
    it('should return 404', (done) => {
        chai.request(server)
            .get('/not-a-url')
            .end((err, res) => {
                should.exist(err);
                res.status.should.eql(404);
                res.body.message.should.eql('Page does not exist!')
                done();
            })
    })
})