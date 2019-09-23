process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const server = require('../src/server/index');
const knex = require('../src/server/db/connection');

const sampleObject = {
    profileId: 2,
    first_name: 'Alex',
    last_name: 'Chandler',
    description: 'Describe myself here!',
    avatar_loc: 'not provided',
    projects_supported: 0,
    amount_pledged: '0.00',
    public: true,
    user_name: 'alexc102'
}

describe('routes : profile', () => {
    beforeEach(() => {
        return knex.migrate.rollback()
            .then(() => {
                return knex.migrate.latest();
            })
            .then(() => {
                return knex.seed.run();
            });
    });

    afterEach(() => {
        return knex.migrate.rollback();
    });

    describe('GET api/profile', () => {
        it('Should return all user profiles', (done) => {
            chai.request(server)
                .get('/api/profile')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.profiles.length.should.eql(5);
                    for (let key in res.body.profiles[0]) {
                        res.body.profiles[0][key].should.eql(sampleObject[key]);
                    }
                    done();
                })
        })
    });
    describe('GET api/profile/:id', () => {

        it('Should return public user profile', (done) => {
            chai.request(server)
                .get('/api/profile/2')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    for (let key in res.body.profiles) {
                            res.body.profiles[key].should.eql(sampleObject[key]);
                    }
                    done();
                })
        })
        it('Should return user profile private', (done) => {
            chai.request(server)
                .get('/api/profile/1')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.profile.should.eql('Member profile is set to private');
                    done();
                })
        })
    });

});
