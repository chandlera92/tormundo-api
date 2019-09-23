process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const {readFileSync} = require("fs");


chai.use(chaiHttp);

const server = require('../src/server/index');

const knex = require('../src/server/db/connection');

const helpers = require('../src/server/_helpers/general');

const testImages = './src/images/testImages/'

describe('routes : message', () => {
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

    describe('POST /api/messages/send-message/org/:name/:memberAccount', () => {
        it('Should send message as org owner to multiple a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'testing@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    console.log(process.env)
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(3);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message as member with account permissions to multiple a and cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc104, testing@tormundo')
                .end((err, res) => {
                    console.log(err)
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(5);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message as org owner to single a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'testing@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message as org owner to multiple a with single cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'testing@tormundo')
                .field('cc', 'contact@tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message as org owner to single a with multiple cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc102')
                .field('sender', 'testing@tormundo')
                .field('cc', 'contact@tormundo, alexc101')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should successfully create message with single attachment', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', '    contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Message has been sent!');
                    res.body.attachments.length.should.eql(1);
                    done();
                })
        });
        it('Should successfully create message with multiple attachment', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/2')
                .set('Authorization', helpers.signToken(999))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', '    testing@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Message has been sent!');
                    res.body.attachments.length.should.eql(3);
                    done();
                })
        });
        it('Should send message and ignore spaces in participant fields', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'Text')
                .field('message', 'Text')
                .field('a', 'alexc101   ,   alexc102')
                .field('sender', '    contact@tormundo')
                .field('cc', '    alexc104')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Message has been sent!');

                    done();
                })
        });
        it('Should send message and replace empty subject/message strings with new value..', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .field('subject', '')
                .field('message', '')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Message has been sent!');
                    res.body.message.subject.should.eql('(No subject)');
                    res.body.message.text.should.eql('(No message)')
                    done();
                })
        });
        it('Should return that field \'a\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .field('subject', '')
                .field('message', '')
                .field('a', '')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'a\' cannot be empty.');
                    done();
                })
        });
        it('Should return that field \'sender\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .field('subject', '')
                .field('message', '')
                .field('a', 'alexc101')
                .field('sender', '')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'sender\' cannot be empty.');
                    done();
                })
        });
        it('Should return that member of organization does not have access to account', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/2')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'testing@tormundo')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should return that non-member of organization does not have access to account', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(998))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should return error when message message has more than 3 attachment', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile3.jpg'), "normal-profile3.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File upload limit reached. You may only upload 3 files.');
                    done();
                })
        });
        it('Should return error if attachment is above 5mb', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'large.jpg'), "large.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should send return cannot find users', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc115')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc108')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Users: \'alexc115, alexc108\' do not exist!');
                    done();
                })
        });
        it('Should return organization account not found', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/11')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization account does not exist');
                    done();
                })
        });
        it('Should return organization not found', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo5555/11')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization could not be found.');
                    done();
                })
        });
        it('Should return sender different from organization account stated', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'testing@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Can only send messages as your own username.');
                    done();
                })
        });
        it('Should return incorrect data submitted', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return user not logged in', (done) => {
            chai.request(server)
                .post('/api/messages/send-message/org/tormundo/1')
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have not logged in! Please log in and try again.");
                    done();
                })
        });
    });
    describe('POST /api/messages/send-message', () => {
        it('Should send message to multiple a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,contact@tormundo')
                .field('sender', 'alexc103')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(3);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message to multiple a and cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'alexc103')
                .field('cc', 'alexc104,alexc105')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(5);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message to single a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc103')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message to multiple a and single cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,contact@tormundo')
                .field('sender', 'alexc103')
                .field('cc', 'testing@tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message to single a and multiple cc', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'alexc103')
                .field('cc', 'alexc104,contact@tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should successfully create message with single attachment', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Message has been sent!');
                    res.body.attachments.length.should.eql(1);
                    done();
                })
        });
        it('Should successfully create message with multiple attachment', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Message has been sent!');
                    res.body.attachments.length.should.eql(3);
                    done();
                })
        });
        it('Should return error when message message has more than 3 attachment', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile3.jpg'), "normal-profile3.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File upload limit reached. You may only upload 3 files.');
                    done();
                })
        });
        it('Should return error if attachment is above 5mb', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'large.jpg'), "large.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should ignore spaces in participants fields', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101    ,  alexc102  ')
                .field('sender', '    alexc103   ')
                .field('cc', '     alexc104,    alexc105')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(5);
                    res.body.result.should.eql('Message has been sent!');
                    done();
                })
        });
        it('Should send message and replace empty subject/message strings with new value..', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(1))
                .field('subject', '')
                .field('message', '')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'alexc101')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Message has been sent!');
                    res.body.message.subject.should.eql('(No subject)');
                    res.body.message.text.should.eql('(No message)')
                    done();
                })
        });
        it('Should return that field \'a\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', '')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'a\' cannot be empty.');
                    done();
                })
        });
        it('Should return that field \'sender\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', '')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'sender\' cannot be empty.');
                    done();
                })
        });
        it('Should return cannot find users', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,benji,lala')
                .field('sender', 'alexc103')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Users: \'benji, lala\' do not exist!');
                    done();
                })
        });
        it('Should return sender different from active user', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Can only send messages as your own username.');
                    done();
                })
        });
        it('Should return incorrect data submitted', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'alexc103')
                .field('group_id', 'null')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        })
        it('Should return user not logged in', (done) => {
            chai.request(server)
                .post('/api/messages/send-message')
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have not logged in! Please log in and try again.");
                    done();
                })
        });
    });
    describe('POST /api/messages/reply-message/org/:name/:memberAccount/:messageId', () => {
        it('Should reply to message as org owner to multiple a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.participants.should.eql(3);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should reply to message as member with account permissions to multiple a and cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc104, testing@tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.participants.should.eql(5);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should reply to message as org owner to single a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/2/4')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'testing@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should reply to message as org owner to multiple a with single cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/2/4')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'testing@tormundo')
                .field('cc', 'contact@tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should reply to message as org owner to single a with multiple cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/2/4')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc102')
                .field('sender', 'testing@tormundo')
                .field('cc', 'contact@tormundo, alexc101')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should successfully reply to message with single attachment', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', '    contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.result.should.eql('Successfully replied to this message!');
                    res.body.attachments.length.should.eql(1);
                    done();
                })
        });
        it('Should successfully reply to message with multiple attachment', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/2/4')
                .set('Authorization', helpers.signToken(999))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', '    testing@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Successfully replied to this message!');
                    res.body.attachments.length.should.eql(3);
                    done();
                })
        });
        it('Should reply to message and ignore spaces in participant fields', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'Text')
                .field('message', 'Text')
                .field('a', 'alexc101   ,   alexc102')
                .field('sender', '    contact@tormundo')
                .field('cc', '    alexc104')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.subject.should.eql('hello Org!');
                    res.body.message.group_id.should.eql(4);
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Successfully replied to this message!');

                    done();
                })
        });
        it('Should return that field \'a\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .field('subject', '')
                .field('message', '')
                .field('a', '')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'a\' cannot be empty.');
                    done();
                })
        });
        it('Should return that field \'sender\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .field('subject', '')
                .field('message', '')
                .field('a', 'alexc101')
                .field('sender', '')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'sender\' cannot be empty.');
                    done();
                })
        });
        it('Should return that member of organization does not have access to account', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/2/4')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'testing@tormundo')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should return that non-member of organization does not have access to account', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(998))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc104')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should return error when message message has more than 3 attachment', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile3.jpg'), "normal-profile3.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File upload limit reached. You may only upload 3 files.');
                    done();
                })
        });
        it('Should return error if attachment is above 5mb', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'large.jpg'), "large.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should send return cannot find users', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc115')
                .field('sender', 'contact@tormundo')
                .field('cc', 'alexc108')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Users: \'alexc115, alexc108\' do not exist!');
                    done();
                })
        });
        it('Should return organization account not found', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/11/4')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization account does not exist');
                    done();
                })
        });
        it('Should return organization not found', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo5555/11/4')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization could not be found.');
                    done();
                })
        });
        it('Should return sender different from organization account stated', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'testing@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Can only send messages as your own username.');
                    done();
                })
        });
        it('Should return message doesn\'t exist', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/100')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should return message doesn\'t exist (message does exist but you do not have access to it)', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/3')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should return incorrect data submitted', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return user not logged in', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/org/tormundo/1/4')
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have not logged in! Please log in and try again.");
                    done();
                })
        });
    });
    describe('POST /api/messages/reply-message/:messageId', () => {
        it('Should send message to multiple a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,contact@tormundo')
                .field('sender', 'alexc103')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(3);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should send message to multiple a and cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,alexc102')
                .field('sender', 'alexc103')
                .field('cc', 'alexc104,alexc105')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(5);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should send message to single a without cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc103')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should send message to multiple a and single cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,contact@tormundo')
                .field('sender', 'alexc103')
                .field('cc', 'testing@tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should send message to single a and multiple cc', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'alexc103')
                .field('cc', 'alexc104,contact@tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(4);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should successfully create message with single attachment', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Successfully replied to this message!');
                    res.body.attachments.length.should.eql(1);
                    done();
                })
        });
        it('Should successfully create message with multiple attachment', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(2);
                    res.body.result.should.eql('Successfully replied to this message!');
                    res.body.attachments.length.should.eql(3);
                    done();
                })
        });
        it('Should return error when message message has more than 3 attachment', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile2.jpg'), "normal-profile2.jpg")
                .attach('attachments', readFileSync(testImages + 'normal-profile3.jpg'), "normal-profile3.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File upload limit reached. You may only upload 3 files.');
                    done();
                })
        });
        it('Should return error if attachment is above 5mb', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(1))
                .attach('attachments', readFileSync(testImages + 'large.jpg'), "large.jpg")
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc103')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should ignore spaces in participants fields', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101    ,  alexc102  ')
                .field('sender', '    alexc103   ')
                .field('cc', '     alexc104,    alexc105')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.participants.should.eql(5);
                    res.body.result.should.eql('Successfully replied to this message!');
                    done();
                })
        });
        it('Should return that field \'a\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', '')
                .field('sender', 'alexc101')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'a\' cannot be empty.');
                    done();
                })
        });
        it('Should return that field \'sender\' cannot be empty.', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(1))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', '')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Field \'sender\' cannot be empty.');
                    done();
                })
        });
        it('Should return cannot find users', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101,benji,lala')
                .field('sender', 'alexc103')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Users: \'benji, lala\' do not exist!');
                    done();
                })
        });
        it('Should return sender different from active user', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Can only send messages as your own username.');
                    done();
                })
        });
        it('Should return message doesn\'t exist', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/102')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'alexc103')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should return message doesn\'t exist (message does exist but you do not have access to it)', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/3')
                .set('Authorization', helpers.signToken(2))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'alexc104')
                .field('cc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should return incorrect data submitted', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .set('Authorization', helpers.signToken(999))
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'alexc103')
                .field('group_id', 'null')
                .field('cc', '')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        })
        it('Should return user not logged in', (done) => {
            chai.request(server)
                .post('/api/messages/reply-message/2')
                .field('subject', 'hello world!')
                .field('message', 'Just want to say hello!')
                .field('a', 'alexc101')
                .field('sender', 'contact@tormundo')
                .field('cc', '')
                .field('notAllowed', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have not logged in! Please log in and try again.");
                    done();
                })
        });
    });
    describe('PATCH /api/message/mark-messages', () => {
        it('Should modify single message', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: [1], read: true, starred: true, important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(1);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(true);
                        row.read.should.eql(true);
                        row.important.should.eql(true);
                    }
                    done();
                })
        });
        it('Should mark multiple messages', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: [1, 2], read: true, starred: true, important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(true);
                        row.read.should.eql(true);
                        row.important.should.eql(true);
                    }
                    done();
                })
        });
        it('Should mark single parameter in multiple messages', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: [1, 2], starred: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(true);
                    }
                    done();
                })
        });
        it('Should mark two messages whilst 3 have been sent & falsify all', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: [1, 2, 1000], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(false);
                        row.read.should.eql(false);
                        row.important.should.eql(false);
                    }
                    done();
                })
        });
        it('Should return no updated message when trying to update ID of other participants', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: [1, 4, 6, 7, 8, 10, 14, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(false);
                        row.read.should.eql(false);
                        row.important.should.eql(false);
                    }
                    done();
                })
        });
        it('Should throw error if no messages are found.', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: [5, 8, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages cannot be found.');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({test: 1})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error marked values are not boolean', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: [1], read: false, starred: false, important: null})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'important\' to contain boolean value.');
                    done();
                })
        });
        it('Should throw error if participant_id not array', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: 1, read: false, starred: false, important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'participant_id\' value to be of array type.');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: 1, read: false, starred: false, important: false})
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
    describe('PATCH /api/message/mark-message/:participantId', () => {
        it('Should mark all parameters as true', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/5')
                .send({read: true, important: true, starred: true})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.important.should.eql(true);
                    msg.starred.should.eql(true);
                    msg.read.should.eql(true);
                    msg.read_at.should.not.eql(null);
                    done();
                })
        });
        it('Should mark read as false from marking unread', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/1')
                .send({read: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.read.should.eql(false);
                    should.not.exist(msg.read_at);
                    done();
                })
        });
        it('Should mark all parameters as false', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/1')
                .send({read: false, important: false, starred: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.read.should.eql(false);
                    msg.important.should.eql(false);
                    msg.starred.should.eql(false);
                    msg.read.should.eql(false);
                    should.not.exist(msg.read_at);
                    done();
                })
        });
        it('Should mark one parameter', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/1')
                .send({important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.important.should.eql(true);
                    msg.starred.should.eql(false);
                    msg.read.should.eql(true);
                    should.exist(msg.read_at);
                    done();
                })
        });
        it('Should return error if update values are not booleans', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/2')
                .send({important: 'true'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'important\' to contain boolean value.');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/2')
                .send({test: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if message cannot be found', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/144424')
                .send({read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should throw error if message cannot be found (but exists for other user)', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/4')
                .send({read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/1')
                .send({read: true})
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
    describe('PATCH /api/message/mark-messages/org/:name/:orgAccount', () => {
        it('Should modify single message with all parameters as true', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/2')
                .send({participant_id: [8], read: true, starred: true, important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(1);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(true);
                        row.read.should.eql(true);
                        row.important.should.eql(true);
                    }
                    done();
                })
        });
        it('Should mark multiple messages with all parameters as true', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [7, 10], read: true, starred: true, important: true})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(true);
                        row.read.should.eql(true);
                        row.important.should.eql(true);
                    }
                    done();
                })
        });
        it('Should mark two messages whilst 3 have been sent & falsify all', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [7, 10, 1000], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(false);
                        row.read.should.eql(false);
                        row.important.should.eql(false);
                    }
                    done();
                })
        });
        it('Should mark two messages with one parameter', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [7, 10, 1000], important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.important.should.eql(true);
                    }
                    done();
                })
        });
        it('Should only update messages which are linked to organization account', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [1, 4, 6, 7, 8, 10, 80, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.starred.should.eql(false);
                        row.read.should.eql(false);
                        row.important.should.eql(false);
                    }
                    done();
                })
        });
        it('Should throw error if no messages are found.', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [5, 8, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages cannot be found.');
                    done();
                })
        });
        it('Should throw error marked values are not boolean', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [1], read: false, starred: false, important: null})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'important\' to contain boolean value.');
                    done();
                })
        });
        it('Should throw error if participant_id not array', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages')
                .send({participant_id: 1, read: false, starred: false, important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'participant_id\' value to be of array type.');
                    done();
                })
        });
        it('Should throw error if organization not found.', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo5/1')
                .send({participant_id: [5, 8, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization could not be found.');
                    done();
                })
        });
        it('Should throw error if organization account not found.', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/5')
                .send({participant_id: [5, 8, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization account does not exist');
                    done();
                })
        });
        it('Should throw error if user does not have access to organization account.', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [5, 8, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if organization member does not have access to organization account.', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: [5, 8, 90], read: false, starred: false, important: false})
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({test: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-messages/org/tormundo/1')
                .send({participant_id: 1, read: false, starred: false, important: false})
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
    describe('PATCH /api/message/mark-message/org/:name/:orgAccount/:participantId', () => {
        it('Should mark all parameters as true', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/7')
                .send({read: true, important: true, starred: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.important.should.eql(true);
                    msg.starred.should.eql(true);
                    msg.read.should.eql(true);
                    done();
                })
        });
        it('Should mark read as false from marking unread', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/10')
                .send({read: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.read.should.eql(false);
                    should.not.exist(msg.read_at);
                    done();
                })
        });
        it('Should mark all parameters as false', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/10')
                .send({read: false, important: false, starred: false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.important.should.eql(false);
                    msg.starred.should.eql(false);
                    msg.read.should.eql(false);
                    done();
                })
        });
        it('Should mark one parameter', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/2/8')
                .send({important: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let msg = res.body.res;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message has been successfully modified.');
                    msg.important.should.eql(true);
                    msg.starred.should.eql(false);
                    msg.read.should.eql(false);
                    done();
                })
        });
        it('Should return error if update values are not booleans', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/2/8')
                .send({important: 'true'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'important\' to contain boolean value.');
                    done();
                })
        });
        it('Should throw error if message cannot be found', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/2/108')
                .send({read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should throw error if message cannot be found (but exists for user account but not organization account sent)', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/1')
                .send({read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should throw error if message cannot be found (but exists for other user)', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/4')
                .send({read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should throw error if organization doesn\'t exist', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo5/1/4')
                .send({read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization could not be found.');
                    done();
                })
        });
        it('Should throw error if organization account doesn\'t exist', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/4/4')
                .send({read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization account does not exist');
                    done();
                })
        });
        it('Should throw error if organization member does not have access to organization account', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/4')
                .send({read: true})
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if user does not have access to organization account', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/4')
                .send({read: true})
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/2/8')
                .send({test: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .patch('/api/messages/mark-message/org/tormundo/1/4')
                .send({read: true})
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
    describe('POST /api/messages/create-category', () => {
        it('Should create new category', (done) => {
            chai.request(server)
                .post('/api/messages/create-category')
                .send({path: 'lala', name: 'lala'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('New category \'lala\' has been created!');
                    res.body.cat.path.should.eql('lala');
                    res.body.cat.name.should.eql('lala');
                    done();
                })
        });
        it('Should create new sub-category', (done) => {
            chai.request(server)
                .post('/api/messages/create-category')
                .send({path: 'test.test', name: 'test'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('New category \'test\' has been created!');
                    res.body.cat.path.should.eql('test.test');
                    res.body.cat.name.should.eql('test');
                    done();
                })
        });
        it('Should throw error if user tries to create duplicate', (done) => {
            chai.request(server)
                .post('/api/messages/create-category')
                .send({path: 'test', name: 'test'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Category \'test\' already exists!');
                    done();
                })
        });
        it('Should throw error if user tries to create a subfolder without immediate parent', (done) => {
            chai.request(server)
                .post('/api/messages/create-category')
                .send({path: 'test.test.test.test', name: 'test'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Parent category does not exist.');
                    done();
                })
        });
        it('Should throw error if post information not in string format', (done) => {
            chai.request(server)
                .post('/api/messages/create-category')
                .send({path: 'root.test', name: true})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'name\' value to be of string type');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .post('/api/messages/create-category')
                .send({path: 'root.test', test: 'test'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .post('/api/messages/create-category')
                .send({path: 'root.test', name: 'test'})
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
    describe('POST /api/messages/create-category/org/:name/:orgAccount', () => {
        it('Should create new category', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .send({path: 'lala', name: 'lala'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('New category \'lala\' has been created!');
                    res.body.cat.path.should.eql('lala');
                    res.body.cat.name.should.eql('lala');
                    done();
                })
        });
        it('Should create new sub-category', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .send({path: 'test.test', name: 'test'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('New category \'test\' has been created!');
                    res.body.cat.path.should.eql('test.test');
                    res.body.cat.name.should.eql('test');
                    done();
                })
        });
        it('Should throw error if user tries to create duplicate', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .send({path: 'test', name: 'test'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Category \'test\' already exists!');
                    done();
                })
        });
        it('Should throw error if user tries to create a subfolder without immediate parent', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .send({path: 'test.test.test', name: 'test'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Parent category does not exist.');
                    done();
                })
        });
        it('Should throw error if post information not in string format', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .send({path: 'test.test', name: true})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'name\' value to be of string type');
                    done();
                })
        });
        it('Should throw error if organization does not exist', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo5/1')
                .set('Authorization', helpers.signToken(1))
                .send({path: 'test.test', name: 'test'})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization could not be found.');
                    done();
                })
        });
        it('Should throw error if organization account does not exist', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/3')
                .set('Authorization', helpers.signToken(1))
                .send({path: 'test.test', name: 'test'})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization account does not exist');
                    done();
                })
        });
        it('Should throw error if user does not have access to account', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .set('Authorization', helpers.signToken(3))
                .send({path: 'test.test', name: 'test'})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if organization member does not have access to account', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/2')
                .set('Authorization', helpers.signToken(2))
                .send({path: 'test', name: 'test'})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .send({path: 'root.test', test: 'test'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .post('/api/messages/create-category/org/tormundo/1')
                .send({path: 'root.test', name: 'test'})
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
    describe('PATCH /api/message/change-categories', () => {
        it('Should change to custom category', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [3], category: 1})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(1);
                    for (let row of res.body.updated) {
                        row.custom_category.should.eql(1);
                        should.not.exist(row.category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should change multiple messages to custom category', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [3, 4], category: 1})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.custom_category.should.eql(1);
                        should.not.exist(row.category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should change message categories for messages that are linked to user account', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [1, 2, 3, 4], category: 1})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.custom_category.should.eql(1);
                        should.not.exist(row.category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should return error that messages do not exist', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [1, 2], category: 1})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages cannot be found.');
                    done();
                })
        });
        it('Should change messages to default category', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [3, 4, 5], category: 'sent'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(3);
                    for (let row of res.body.updated) {
                        row.category.should.eql('sent');
                        should.not.exist(row.custom_category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should delete messages', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [1, 2], category: 'trash'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.category.should.eql('trash');
                        should.not.exist(row.custom_category);
                        should.exist(row.deleted_at);
                        row.deleted.should.eql(true);
                    }
                    done();
                })
        });
        it('Should delete multiple message and return one message not found', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [1, 2, 9999], category: 'trash'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.category.should.eql('trash');
                        should.not.exist(row.custom_category);
                        should.exist(row.deleted_at);
                        row.deleted.should.eql(true);
                    }
                    done();
                })
        });
        it('Should return error if category is not string/number', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [1], category: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected category to be formatted as a string or number.');
                    done();
                })
        });
        it('Should return error if message_id is not an array', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: 1, category: 1})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'message_id\' value to be of array type.');
                    done();
                })
        });
        it('Should return error if category does not exist', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [3], category: 9999})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message category does not exist!');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [1], test: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories')
                .send({message_id: [1], category: 1})
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
    describe('PATCH /api/message/change-categories/org/:name/orgAccount', () => {
        it('Should change to custom category', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7], category: 12})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(1);
                    for (let row of res.body.updated) {
                        row.custom_category.should.eql(12);
                        should.not.exist(row.category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should change multiple messages to custom category', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7, 10], category: 12})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.custom_category.should.eql(12);
                        should.not.exist(row.category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should change message categories for messages that are linked to user account', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [1, 2, 3, 4, 7, 8, 10], category: 12})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.custom_category.should.eql(12);
                        should.not.exist(row.category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should return error that messages do not exist', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [1, 2], category: 13})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages cannot be found.');
                    done();
                })
        });
        it('Should change messages to default category', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7, 10], category: 'sent'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.category.should.eql('sent');
                        should.not.exist(row.custom_category);
                        should.not.exist(row.deleted_at);
                        row.deleted.should.eql(false);
                    }
                    done();
                })
        });
        it('Should delete messages', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7, 10], category: 'trash'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.category.should.eql('trash');
                        should.not.exist(row.custom_category);
                        should.exist(row.deleted_at);
                        row.deleted.should.eql(true);
                    }
                    done();
                })
        });
        it('Should delete multiple message and return one message not found', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7, 10, 9999], category: 'trash'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Messages have been successfully modified.');
                    res.body.count.should.eql(2);
                    for (let row of res.body.updated) {
                        row.category.should.eql('trash');
                        should.not.exist(row.custom_category);
                        should.exist(row.deleted_at);
                        row.deleted.should.eql(true);
                    }
                    done();
                })
        });
        it('Should return error if category is not string/number', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7], category: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected category to be formatted as a string or number.');
                    done();
                })
        });
        it('Should return error if message_id is not an array', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: 7, category: 1})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'message_id\' value to be of array type.');
                    done();
                })
        });
        it('Should return error if category does not exist', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7], category: 1})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message category does not exist!');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7], test: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [1], category: 1})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You have not logged in! Please log in and try again.');
                    done();
                })
        })
        it('Should throw error if organization not found.', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo5/1')
                .send({message_id: [7, 10], category: 'trash'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization could not be found.');
                    done();
                })
        });
        it('Should throw error if organization account not found.', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/6')
                .send({message_id: [7, 10], category: 'trash'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization account does not exist');
                    done();
                })
        });
        it('Should throw error if user does not have access to organization account.', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/1')
                .send({message_id: [7, 10], category: 'trash'})
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if organization member does not have access to organization account.', (done) => {
            chai.request(server)
                .patch('/api/messages/change-categories/org/tormundo/2')
                .send({message_id: [7, 10], category: 'trash'})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
    });
    describe('DELETE /api/messages/delete-category/:categoryId', () => {
        it('Should delete multiple categories with messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: test, test.inbox');
                    res.body.messagesMoved.should.eql(2);
                    done();
                })
        });
        it('Should delete multiple categories with no messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/4')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: project, project.idea, project.objective, project.objective.january, project.objective.february');
                    res.body.messagesMoved.should.eql(0);
                    done();
                })
        });
        it('Should delete single category with no messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/7')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: personal.events.january');
                    res.body.messagesMoved.should.eql(0);
                    done();
                })
        });
        it('Should delete single category with messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: test.inbox');
                    res.body.messagesMoved.should.eql(1);
                    done();
                })
        });
        it('Should return category doesn\'t exist', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/12')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message category does not exist!');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/1')
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
    describe('DELETE /api/messages/delete-category', () => {
        it('Should delete multiple categories with messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/12')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: test, test.inbox');
                    res.body.messagesMoved.should.eql(3);
                    done();
                })
        });
        it('Should delete multiple categories with no messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/14')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: events, events.inbox');
                    res.body.messagesMoved.should.eql(0);
                    done();
                })
        });
        it('Should delete single category with no messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/15')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: events.inbox');
                    res.body.messagesMoved.should.eql(0);
                    done();
                })
        });
        it('Should delete single category with messages in', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/13')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Deleted following categories: test.inbox');
                    res.body.messagesMoved.should.eql(1);
                    done();
                })
        });
        it('Should return category doesn\'t exist', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message category does not exist!');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You have not logged in! Please log in and try again.');
                    done();
                })
        })
        it('Should throw error if organization not found.', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo5/1/13')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization could not be found.');
                    done();
                })
        });
        it('Should throw error if organization account not found.', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/7/13')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Organization account does not exist');
                    done();
                })
        });
        it('Should throw error if user does not have access to organization account.', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/13')
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });
        it('Should throw error if organization member does not have access to organization account.', (done) => {
            chai.request(server)
                .delete('/api/messages/delete-category/org/tormundo/1/13')
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.');
                    done();
                })
        });

    });

    describe('GET /api/messages/search-messages/:search', () => {
        it('Should return no search term entered', (done) => {
            chai.request(server)
                .get('/api/messages/search-messages')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Please enter a search query.');

                    done();
                })
        })
        it('Should return 3 messages that contain body of hello', (done) => {
            chai.request(server)
                .get('/api/messages/search-messages/hello')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let messages = res.body.messages;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    messages.length.should.eql(3);


                    done();
                })
        })

        it('Should return 1 messages that contain body of hello1', (done) => {
            chai.request(server)
                .get('/api/messages/search-messages/hello1')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let messages = res.body.messages;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    messages.length.should.eql(1);
                    messages[0].text.should.eql('hello1')


                    done();
                })
        })

        it('Should return no messages', (done) => {
            chai.request(server)
                .get('/api/messages/search-messages/notmenotherelalala')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let messages = res.body.messages;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    messages.length.should.eql(0);


                    done();
                })
        })

        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .get('/api/messages/search-messages/notmenotherelalala')
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
    describe('GET /api/messages/get-messages', () => {
        it('Should return all messages with custom categories', (done) => {
            chai.request(server)
                .get('/api/messages/get-messages')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    let messages = res.body.messages;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    Object.keys(res.body.messages).length.should.eql(7);
                    messages.inbox.messages.length.should.eql(1);
                    messages.sent.messages.length.should.eql(1);
                    messages.test.messages.length.should.eql(1);

                    done();
                })
        })
        it('Should return all messages with only default categories', (done) => {
            chai.request(server)
                .get('/api/messages/get-messages')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let messages = res.body.messages;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    Object.keys(res.body.messages).length.should.eql(4);
                    messages.inbox.messages.length.should.eql(1);
                    messages.sent.messages.length.should.eql(2);
                    done();
                })
        })
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .get('/api/messages/get-messages')
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

});

/*

    describe('POST /api/message/mark-messages-delete', () => {
        it('Should mark single message as deleted', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: [1], delete:true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been deleted');
                    res.body.count.should.eql('1 items modified from 1 items sent');
                    for(let row of res.body.updatedRows) {
                        row.deleted.should.eql(true)
                        row.category.should.eql('trash')
                        should.not.exist(row.custom_category)
                        row.deleted_at.should.not.eql(null)
                    }
                    done();
                })
        });

        it('Should mark two messages as deleted', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: [1, 2], delete:true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been deleted');
                    res.body.count.should.eql('2 items modified from 2 items sent');
                    for(let row of res.body.updatedRows) {
                        row.deleted.should.eql(true)
                        row.category.should.eql('trash')
                        should.not.exist(row.custom_category)
                        row['deleted_at'].should.not.eql(null)
                    }
                    done();
                })
        });

        it('Should mark two messages as deleted whilst 3 have been sent', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: [1, 2, 1000], delete:true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been deleted');
                    res.body.count.should.eql('2 items modified from 3 items sent');
                    for(let row of res.body.updatedRows) {
                        row.deleted.should.eql(true)
                        row.category.should.eql('trash')
                        should.not.exist(row.custom_category)
                        row['deleted_at'].should.not.eql(null)
                    }
                    done();
                })
        });

        it('Should mark single message as not deleted', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: [1], delete:false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been restored to inbox');
                    res.body.count.should.eql('1 items modified from 1 items sent');
                    for(let row of res.body.updatedRows) {
                        row.deleted.should.eql(false)
                        row.category.should.eql('inbox')
                        should.not.exist(row.custom_category)
                        should.not.exist(row.deleted_at)
                    }
                    done();
                })
        });

        it('Should mark multiple messages as not deleted', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: [1, 2], delete:false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been restored to inbox');
                    res.body.count.should.eql('2 items modified from 2 items sent');
                    for(let row of res.body.updatedRows) {
                        row.deleted.should.eql(false)
                        row.category.should.eql('inbox')
                        should.not.exist(row.custom_category)
                        should.not.exist(row.deleted_at)
                    }
                    done();
                })
        });

        it('Should mark 2 messages as not deleted whilst 3 sent', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: [1, 2, 1000], delete:false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been restored to inbox');
                    res.body.count.should.eql('2 items modified from 3 items sent');
                    for(let row of res.body.updatedRows) {
                        row.deleted.should.eql(false)
                        row.category.should.eql('inbox')
                        should.not.exist(row.custom_category)
                        should.not.exist(row.deleted_at)
                    }
                    done();
                })
        });

        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: 1})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });

        it('Should throw error if delete is not boolean', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: 1, delete: 'true'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'delete\' to contain boolean value.');
                    done();
                })
        });

        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .post('/api/messages/mark-messages-delete')
                .send({message_id: 1, delete:true})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You have not logged in! Please log in and try again.');
                    done();
                })
        })


    })


describe('POST /api/message/mark-message-read', () => {
        it('Should mark message as true', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-read')
                .send({message_id: 1, read:true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message marked as true');
                    done();
                })
        });
        it('Should mark message as false', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-read')
                .send({message_id: 1, read:false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message marked as false');
                    done();
                })
        });
        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-read')
                .send({message_id: 1})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });
        it('Should throw error if read is not boolean', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-read')
                .send({message_id: 1, read: 'true'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'read\' to contain boolean value.');
                    done();
                })
        });
        it('Should throw error if message cannot be found', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-read')
                .send({message_id: 4, read: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });
        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-read')
                .send({message_id: 1, read:true})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You have not logged in! Please log in and try again.');
                    done();
                })
        })
    })
    describe('POST /api/message/mark-message-delete', () => {
        it('Should mark message as deleted', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-delete')
                .send({message_id: 1, delete:true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been deleted');
                    done();
                })
        });

        it('Should mark message as not deleted', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-delete')
                .send({message_id: 1, delete:false})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.messages.should.eql('Message has been restored to inbox');
                    done();
                })
        });


        it('Should throw error if required information not entered', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-delete')
                .send({message_id: 1})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.');
                    done();
                })
        });

        it('Should throw error if delete is not boolean', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-delete')
                .send({message_id: 1, delete: 'true'})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'delete\' to contain boolean value.');
                    done();
                })
        });

        it('Should throw error if message cannot be found', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-delete')
                .send({message_id: 4, delete: true})
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Message cannot be found');
                    done();
                })
        });

        it('Should throw error if there is no token', (done) => {
            chai.request(server)
                .post('/api/messages/mark-message-delete')
                .send({message_id: 1, delete:true})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You have not logged in! Please log in and try again.');
                    done();
                })
        })


    })*/
