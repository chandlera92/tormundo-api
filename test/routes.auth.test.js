process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const server = require('../src/server/index');

const knex = require('../src/server/db/connection');

const helpers = require('../src/server/_helpers/general');

let token = helpers.signToken(998)

describe('routes : auth', () => {
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

    describe('POST api/auth/register', () => {
        it('should register a new user', (done) => {
            chai.request(server)
                .post('/api/auth/register')
                .send({
                    email: 'alexchandler@live.co.uk',
                    password: 'test123',
                    user_name: 'alexc1010',
                    country_id: 230,
                    language_id: 1
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Account has been successfully registered, please check email for verification code.');

                    done();
                });
        });
        it('should throw an error if a user has token stored', (done) => {
            chai.request(server)
                .post('/api/auth/register')
                .set('Authorization', token)
                .send({
                    email: 'test2@test.com',
                    password: 'testkkk',
                    user_name: 'alexc1010',
                    country_id: 230,
                    language_id: 1
                })
                .end((err, res) => {
                    console.log(res)
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You are already logged in!');

                    done()
                })
        })
        it('should throw error if required information not entered', (done) => {
            chai.request(server)
                .post('/api/auth/register')
                .send({
                    email: 'six',
                    password: 'herman'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                });
        })
        it('Should throw error if email is not valid', (done) => {
            chai.request(server)
                .post('/api/auth/register')
                .send({
                    email: 'six',
                    password: 'herman',
                    user_name: 'alexc1010',
                    country_id: 230,
                    language_id: 1
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Email address is not valid.');
                    done();
                });
        });
        it('should throw an error if the password is < 6 characters', (done) => {
            chai.request(server)
                .post('/api/auth/register')
                .send({
                    email: 'test@gmail.com',
                    password: 'six',
                    user_name: 'alexc1010',
                    country_id: 230,
                    language_id: 1
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Password must be longer than 6 characters');
                    done();
                });
        });
        it('should throw an error if email already exists', (done) => {
            chai.request(server)
                .post('/api/auth/register')
                .send({
                    email: 'testMe@test.com',
                    password: 'test123',
                    user_name: 'alexcTest',
                    country_id: 230,
                    language_id: 1
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Email address has already been registered.');
                    done();
                });
        });
        it('should throw an error if username already exists', (done) => {
            chai.request(server)
                .post('/api/auth/register')
                .send({
                    email: 'testMe12345@test.com',
                    password: 'test123',
                    user_name: 'alexc101',
                    country_id: 230,
                    language_id: 1
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('User name has already been taken, please choose another.');
                    done();
                });
        });
    });
    describe('POST api/auth/verify', () => {
        // TODO: Force user to login before being able to verify account
        it('should verify user', (done) => {
            chai.request(server)
                .post('/api/auth/verify')
                .send({
                    code: 'eeee11',
                    email: 'chandlera092@gmail.com'
                })
                .end((err, res) => {
                    console.log(err)
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.body.message.should.eql('Successfully verified!');
                    done();
                })
        })
        it('should flag incorrect code input', (done) => {
            chai.request(server)
                .post('/api/auth/verify')
                .send({
                    code: 'eeee12',
                    email: 'chandlera092@gmail.com'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.body.message.should.eql('Code entered incorrectly');
                    done();
                })
        })
        it('should show code has expired code input', (done) => {
            chai.request(server)
                .post('/api/auth/verify')
                .send({
                    code: 'eeee22',
                    email: 'testMe2@test.com'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.body.message.should.eql('Code expired, please request new');
                    done();
                })
        })
        it('should return email address not found in system', (done) => {
            chai.request(server)
                .post('/api/auth/verify')
                .send({
                    email: 'testMe1111@test.com',
                    code: 'eeee33'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.body.message.should.eql('Email address not found in system');
                    done();
                })
        })
        it('should return incorrect form data submitted', (done) => {
            chai.request(server)
                .post('/api/auth/verify')
                .send({
                    random: 'testMe1111@test.com',
                    code: 'eeee33'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        })
    });
    describe('POST api/auth/generate_verification', () => {
        it('should generate new verification code', (done) => {
            chai.request(server)
                .post('/api/auth/generate_verification')
                .send({
                    email: 'chandlera092@gmail.com'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('New code created! Please check email');
                    done();
                })
        })
        it('should return email address not found in system', (done) => {
            chai.request(server)
                .post('/api/auth/generate_verification')
                .send({
                    email: 'testMe1111@test.com'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Email address not found in system');
                    done();
                })
        });
        it('should return email address not found in request', (done) => {
            chai.request(server)
                .post('/api/auth/generate_verification')
                .send({
                    random: 'testMe1111@test.com'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });

        it('should return email address already verified', (done) => {
            chai.request(server)
                .post('/api/auth/generate_verification')
                .send({
                    email: 'chandlera@gmail.com'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Account has already been verified');
                    done();
                })
        })
    });
    describe('GET  api/auth/logout', () => {
        it('Should logout a user', (done) => {
            chai.request(server)
                .get('/api/auth/logout')
                .set('Authorization', token)
                .end((err, res) => {
                    console.log(err)
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully logged out');
                    done();
                })
        })
        it('Should throw error if user not logged in', (done) => {
            chai.request(server)
                .get('/api/auth/logout')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You have not logged in! Please log in and try again.');
                    done();
                })
        })
    });
    describe('POST api/auth/login', () => {
        it('should login a user', (done) => {
            chai.request(server)
                .post('/api/auth/login')
                .send({
                    email: 'testMe@test.com',
                    password: 'test123'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    should.exist(res.body.token)
                    res.body.message.should.eql('Successfully Logged In!');
                    done();
                })
        })

        it('should return incorrect form data submitted', (done) => {
            chai.request(server)
                .post('/api/auth/login')
                .send({
                    random: 'testMe@test.com',
                    password: 'test123'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        })

        it('should throw error if user doesn\'t exist', (done) => {
            chai.request(server)
                .post('/api/auth/login')
                .send({
                    email: 'not-exist@test.com',
                    password: 'test123'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Email or Password is incorrect, Please check and try again.');
                    done();
                })
        })


        it('should throw an error if a user is logged in', (done) => {
            chai.request(server)
                .post('/api/auth/login')
                .set('Authorization', token)
                .send({
                    email: 'testMe@test.com',
                    password: 'test123'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You are already logged in!');
                    done();
                });
        });

    })
    describe('POST api/auth/forgot-password', () => {
        it('should show error if email address not registered', (done) => {
            chai.request(server)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'testMe111@test.com',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Email address has not been registered.');
                    done();
                })
        })
        it('should send authorization email', (done) => {
            chai.request(server)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'chandlera092@gmail.com',
                })
                .end((err, res) => {
                    console.log(err)
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Please check email for password reset link.');
                    done();
                })
        })
        it('should return incorrect form data submitted', (done) => {
            chai.request(server)
                .post('/api/auth/login')
                .send({
                    random: 'testMe@test.com'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        })
    })
    describe('GET api/auth/reset-password/:token', () => {
        it('should return token not valid', (done) => {
            chai.request(server)
                .get('/api/auth/reset-password/466e89843b385b6056349e637aaa624b')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Token not valid, please check email again');
                    done();
                })
        })

        it('should return token valid', (done) => {
            chai.request(server)
                .get('/api/auth/reset-password/466e89843b385b6056349e637aaa624b7bb48727')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Token valid, please enter new password.');
                    done();
                })
        })

        it('should return token not found', (done) => {
            chai.request(server)
                .get('/api/auth/reset-password/466e89843b385b6056349e637aaa624b7bb48725')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Reset token expired or does not exist. Please request another.');
                    done();
                })
        })

        it('should return token has expired', (done) => {
            chai.request(server)
                .get('/api/auth/reset-password/466e89843b385b6056349e637aaa624b7bb48720')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Reset token expired or does not exist. Please request another.');
                    done();
                })
        })


    })
    describe('POST api/auth/reset-password/:token', () => {
        it('Should return password length error', (done) => {
            chai.request(server)
                .post('/api/auth/reset-password/466e89843b385b6056349e637aaa624b7bb48727')
                .send({
                    password: 'lala',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Password must be longer than 6 characters');
                    done();
                })
        })
        it('Should return password changed', (done) => {
            chai.request(server)
                .post('/api/auth/reset-password/466e89843b385b6056349e637aaa624b7bb48727')
                .send({
                    password: 'test1234',
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Password has been changed successfully!');
                    done();
                })
        })

        it('should throw error if required information not entered', (done) => {
            chai.request(server)
                .post('/api/auth/reset-password/466e89843b385b6056349e637aaa624b7bb48727')
                .send({
                    random: 'herman'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                });
        })

    })

});
