process.env.NODE_ENV = 'test';

const fs = require('fs');
const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const moment = require('moment');
const {readFileSync} = require("fs");
const testFiles = './src/images/testImages/'

chai.use(chaiHttp);

const awsCredentials = {
    accessKeyId: '',
    secretAccessKey: '',
    region: 'eu-west-3'
};


var AWS = require('aws-sdk');
AWS.config.update(awsCredentials);

var s3 = new AWS.S3();

const {promisify} = require('util');
const readFile = promisify(fs.readFile);

async function uploadTestFile() {
    try {
        let buffer = await readFile(testFiles + '54e26a5e00350edc5bbda64b6719d76f-image-test.jpg');
        const s3Params = {
            Body: buffer,
            Bucket: 'tormundo',
            ContentType: 'IMAGE/jpg',
            ACL: 'public-read',
            Key: 'test/organization/tormundo/projects/1/active/54e26a5e00350edc5bbda64b6719d76f-image-test.jpg'
        };
        let test = await s3.upload(s3Params).promise().then(img => img).catch(err => err);
        return test;
    }
    catch (e) {
        return e
    }
}

async function deleteTestFile(fileName) {
    try {
        const s3Params = {
            Bucket: 'tormundo',
            Delete: {
                Objects: [
                    {
                        Key: fileName
                    }
                ]
            }
        };
        let test = await s3.deleteObjects(s3Params).promise().then(img => img).catch(err => err);
        return test;
    }
    catch (e) {
        return e
    }
}


const server = require('../src/server/index');

const knex = require('../src/server/db/connection');
const helpers = require('../src/server/_helpers/general');

let createTime = (time) => moment(time, 'DD-MM-YYYY HH:mm').format();


describe('routes : projects', () => {
    beforeEach(() => {
        return knex.migrate.rollback()
            .then(() => {
                return knex.migrate.latest();
            })
            .then(() => {
                return knex.seed.run();
            })


    });

    afterEach(() => {
        return knex.migrate.rollback();
    });

    describe('POST /api/organization/:name/project', () => {
        it('Should return succesfully create new project as owner', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'images (1).jpg'), "images (1).jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .then(res => res)
                .catch(err => err);

            let checkError = res instanceof Error;
            checkError.should.eql(false);

            let bodyKeys = Object.keys(res.body);
            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully created new project!");
            bodyKeys.should.eql(['project', 'cover_image', 'profile', 'message']);

            await deleteTestFile(res.body.cover_image.key);
        });
        it('Should return succesfully create new project as member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    let bodyKeys = Object.keys(res.body);
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new project!");
                    bodyKeys.should.eql(['project', 'projectAccess', 'profile', 'message']);
                    done();
                })
        });
        it('Should return that member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(2))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .send({})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(3))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo55555/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that currency not a number', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', 'nan')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'currency' value to be of number type");
                    done();
                })
        });
        it('Should return that currency does not exists', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', 'nan')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'currency' value to be of number type");
                    done();
                })
        });
        it('Should return that goal not a number', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', 'nan')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'goal' value to be of number type");
                    done();
                })
        });
        it('Should return that start date not a valid date', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', 'lala')
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'start_date' does not contain a valid date.");
                    done();
                })
        });
        it('Should return that end date not a valid date', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', 'lala')
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'end_date' does not contain a valid date.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'nan')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that image too large', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'large.jpg'), "large.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .send({})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should return that only one image can be uploaded', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .send({})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File upload limit reached. You may only upload 1 files.");
                    done();
                })
        });
        it('Should return that file must be image', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'not-an-image.txt'), "not-an-image.txt")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .send({})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'not-an-image.txt' does not have correct format. Uploaded files must be one of the following formats: jpeg, jpg, or png.");
                    done();
                })
        });
        it('Should return form data not completed', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return form data has extra params', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
                .field('testing', 'yup!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project')
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('project_location', 'Paris, France')
                .field('start_date', createTime('05/09/2018 17:00'))
                .field('end_date', createTime('30/09/2018 19:00'))
                .field('currency', '1')
                .field('goal', '5000')
                .field('name', 'tormundo test project')
                .field('description', 'just a test ennit')
                .field('public', 'false')
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
    describe('PATCH /api/organization/:name/project/:projectId', () => {
        it('Should return succesfully modified project as owner', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    'start_date': createTime('10/09/2018 17:00')
                })
                .end((err, res) => {
                    let body = res.body;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully updated project!");
                    body.updated.start_date.should.eql('2018-09-10T15:00:00.000Z');
                    body.from.start_date.should.eql('2018-09-05T15:00:00.000Z');
                    done();
                })
        });
        it('Should return succesfully made project public, automatically setting main public profile to public also.', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/2')
                .set('Authorization', helpers.signToken(999))
                .send({
                    public: true
                })
                .end((err, res) => {
                    let body = res.body;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully updated project!");
                    body.updated.public.should.eql(true);
                    body.from.public.should.eql(false);
                    body.mainProfile.should.eql('Updated main profile to public.');
                    done();
                })
        });
        it('Should return succesfully modified project as member', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: true,
                    goal: 1000
                })
                .end((err, res) => {
                    let body = res.body;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');

                    body.updated.goal.should.eql(1000);
                    body.updated.public.should.eql(true);
                    body.from.goal.should.eql(5000);
                    body.from.public.should.eql(true);
                    should.exist(body.updated.public_at);

                    res.body.message.should.eql("Successfully updated project!");
                    done();
                })
        });
        it('Should return that member does not have correct permissions to modify project', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(2))
                .send({
                    goal: 1000
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(3))
                .send({
                    goal: 1000
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo55555/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    goal: 1000
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/5')
                .set('Authorization', helpers.signToken(1))
                .send({
                    goal: 1000
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that cannot make public false if previously set to true', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot set project public flag to false after project has gone live. You may suspend the project.");
                    done();
                })
        });
        it('Should return that currency not a number', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    currency: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'currency' value to be of number type");
                    done();
                })
        });
        it('Should return that currency does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    currency: 10000
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("The currency you have entered cannot be found. Please review, and send request again.");
                    done();
                })
        });
        it('Should return that goal not a number', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    goal: 'hello'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'goal' value to be of number type");
                    done();
                })
        });
        it('Should return that start date not a valid date', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    start_date: 'lala'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'start_date' does not contain a valid date.");
                    done();
                })
        });
        it('Should return that end date not a valid date', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    end_date: 'lala'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'end_date' does not contain a valid date.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that suspended is not boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    suspended: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'suspended' to contain boolean value.");
                    done();
                })
        });
        it('Should return form is empty', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have submitted an empty form.");
                    done();
                })
        });
        it('Should return form data has unexpected params', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    test: 'lala'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1')
                .send({
                    public: true
                })
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

    describe('POST /api/organization/:name/project/:projectId/access/:memberId', () => {
        it('Should succesfully grant project access as owner', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/access/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully granted project access to member.");
                    done();
                })
        });
        it('Should succesfully grant project access as member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/2/access/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully granted project access to member.");
                    done();
                })
        });
        it('Should succesfully grant project access to self', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/2/access/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully granted project access to member.");
                    done();
                })
        });
        it('Should return member already has access', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/access/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("This member already has access to the project.");
                    done();
                })
        });
        it('Should return member does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/2/access/3')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find specified member.");
                    done();
                })
        });
        it('Should return project does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/3/access/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return organization does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo555/project/1/access/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return org member does not have required permissions', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/3/access/1')
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return non-member does not have required permissions', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/3/access/1')
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/3/access/1')
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
    describe('DELETE /api/organization/:name/project/:projectId/access/:memberId', () => {
        it('Should succesfully remove project access as owner', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/access/1')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted project access.");
                    done();
                })
        });
        it('Should succesfully remove project access member', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/access/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted project access.");
                    done();
                })
        });
        it('Should return record does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/2/access/1')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Record does not exist.");
                    done();
                })
        });
        it('Should return organization does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo555/project/2/access/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return org member does not have required permissions', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/3/access/1')
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return non-member does not have required permissions', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/3/access/1')
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/3/access/1')
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

    describe('POST /api/organization/:name/project/:projectId/profile', () => {
        it('Should return succesfully created new project profile as owner', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .then(res => res)
                .catch(err => err);

            let checkError = res instanceof Error;
            checkError.should.eql(false);

            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully created new profile!");
            res.body.profile.name.should.eql('testing!');
            res.body.profile.language_id.should.eql(2);

            await deleteTestFile(res.body.cover_image.key);
        });
        it('Should return succesfully created new project profile as member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new profile!");
                    res.body.profile.name.should.eql('testing!');
                    res.body.profile.language_id.should.eql(2);
                    res.body.profile.cover_image.should.eql(1);
                    done();
                })
        });
        it('Should return succesfully created new project profile as member (with cover_image as null)', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new profile!");
                    res.body.profile.name.should.eql('testing!');
                    res.body.profile.language_id.should.eql(2);
                    should.not.exist(res.body.profile.cover_image);
                    done();
                })
        });
        it('Should return that member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(2))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(3))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo5555/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/111/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project file does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .field('cover_image', '2')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project file could not be found.");
                    done();
                })
        });
        it('Should return that project profile cannot be uploaded with new image and existing file as cover image', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot include a file id for cover image as well as providing new image to upload.");
                    done();
                })
        });
        it('Should return that project profile with language already exists', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("It is not possible to have two active profiles which share the same language.");
                    done();
                })
        });
        it('Should return that language_id not a number', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', 'null')
                .field('public', 'false')
                .field('cover_image', '2')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'language_id' value to be of number type");
                    done();
                })
        });
        it('Should return that language_id not does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '999')
                .field('public', 'false')
                .field('cover_image', '2')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Selected language could not be found in our records.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'lala')
                .field('cover_image', '2')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that image too large', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'large.jpg'), "large.jpg")
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should return that only one image can be uploaded', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File upload limit reached. You may only upload 1 files.");
                    done();
                })
        });
        it('Should return that file must be image', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'not-an-image.txt'), "not-an-image.txt")
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'not-an-image.txt' does not have correct format. Uploaded files must be one of the following formats: jpeg, jpg, or png.");
                    done();
                })
        });
        it('Should return form data empty', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have submitted an empty form.");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('language_id', '2')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return required information not filled', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/profile')
                .field('name', 'testing!')
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'false')
                .field('cover_image', '2')
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
    describe('PATCH /api/organization/:name/project/:projectId/profile/:profileId', () => {
        it('Should return succesfully modified project profile as owner', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    name: 'testing1!',
                    cover_image: 1
                })
                .end((err, res) => {
                    let body = res.body;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    body.message.should.eql("Successfully updated profile!");
                    body.updated.name.should.eql("testing1!");
                    body.from.name.should.eql("tormundo test project");
                    body.from.cover_image.should.eql(1);
                    body.updated.cover_image.should.eql(1);
                    done();
                })
        });
        it('Should return successfully modified project profile as member', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: true
                })
                .end((err, res) => {
                    let body = res.body;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    body.message.should.eql("Successfully updated profile!");
                    body.updated.public.should.eql(true);
                    body.from.public.should.eql(false);
                    done();
                })
        });
        it('Should return that member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(2))
                .send({
                    name: 'testing!',
                    description: 'just a test!',
                    language_id: 2,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(3))
                .send({
                    name: 'testing!',
                    description: 'just a test!',
                    language_id: 2,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo5555/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    name: 'testing!',
                    description: 'just a test!',
                    language_id: 2,
                    public: false,
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/111/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    name: 'testing!',
                    description: 'just a test!',
                    language_id: 2,
                    public: false,
                }).end((err, res) => {
                should.exist(err);
                res.redirects.length.should.eql(0);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                res.body.message.should.eql("Project does not exist!");
                done();
            })
        });
        it('Should return that project profile does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/5555')
                .set('Authorization', helpers.signToken(1))
                .send({
                    name: 'testing!',
                    description: 'just a test!',
                    language_id: 2,
                    public: false,
                }).end((err, res) => {
                should.exist(err);
                res.redirects.length.should.eql(0);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                res.body.message.should.eql("Cannot find project profile.");
                done();
            })
        });
        it('Should return that project file does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    name: 'testing!',
                    description: 'just a test!',
                    language_id: 2,
                    public: false,
                    cover_image: 4
                }).end((err, res) => {
                should.exist(err);
                res.redirects.length.should.eql(0);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                res.body.message.should.eql("Project file could not be found.");
                done();
            })
        });
        it('Should return that project with language already exists', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    language_id: 1
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("It is not possible to have two active profiles which share the same language.");
                    done();
                })
        });
        it('Should return that you cannot change main project profile language', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    language_id: 2
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot change language of main profile.");
                    done();
                })
        });
        it('Should return that language_id not a number', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    language_id: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'language_id' value to be of number type");
                    done();
                })
        });
        it('Should return that language_id not does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    language_id: 999
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Selected language could not be found in our records.");
                    done();
                })
        });
        it('Should return that you cannot make main profile not public if project is live', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot hide main profile if project is live.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: 0
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that description is not string', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    description: true
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'description' value to be of string type");
                    done();
                })
        });
        it('Should return that name is not string', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    name: true
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'name' value to be of string type");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    test: 'meh'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        })
        it('Should return form data cannot be empty', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/profile/1')
                .send({
                    name: 'testing!',
                    description: 'just a test!',
                    language_id: 2,
                    public: false,
                    default: false
                })
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
    describe('DELETE /api/organization/:name/project/:projectId/profile/:profileId', () => {
        it('Should return successfully deleted project profile as owner', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/profile/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.removed.id.should.eql(2);
                    res.body.message.should.eql("Successfully deleted project profile!");
                    done();
                })
        });
        it('Should return successfully deleted project profile as member', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.removed.id.should.eql(2);
                    res.body.message.should.eql("Successfully deleted project profile!");
                    done();
                })
        });
        it('Should return that member does not have correct permissions to delete profile', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/profile/2')
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to delete profile', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/profile/2')
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo55555/project/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/55555/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project profile does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/profile/5555')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project profile.");
                    done();
                })
        });
        it('Should return that you cannot delete main profile.', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot delete main profile");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/profile/2')
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

    describe('POST /api/organization/:name/project/:projectId/update', () => {
        it('Should return succesfully created new project update as owner', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(999))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.project_update.public.should.eql(false);
                    res.body.message.should.eql("Successfully created project update!");
                    done();
                })
        });
        it('Should return succesfully created new project update as member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.project_update.public.should.eql(false);
                    res.body.message.should.eql("Successfully created project update!");
                    done();
                })
        });
        it('Should return that member does not have correct permissions to update project', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(2))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to update project', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(3))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo55555/project/1/update')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/5555/update')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that body is not string', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: null,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'body' value to be of string type");
                    done();
                })
        });
        it('Should return that name is not string', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: null,
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'title' value to be of string type");
                    done();
                })
        });
        it('Should return form empty', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(1))
                .send({})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have submitted an empty form.");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false,
                    test: true
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update')
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
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
    describe('PATCH /api/organization/:name/project/:projectId/update', () => {
        it('Should return succesfully modify project update as owner', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    public: true
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.from.public.should.eql(true);
                    res.body.updated.public.should.eql(true);
                    res.body.message.should.eql("Successfully modified project update!");
                    done();
                })
        });
        it('Should return succesfully modify project update as member', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: true
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.from.public.should.eql(true);
                    res.body.updated.public.should.eql(true);
                    res.body.message.should.eql("Successfully modified project update!");
                    done();
                })
        });
        it('Should return that member does not have correct permissions to modify project update', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/2')
                .set('Authorization', helpers.signToken(2))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to modify project update', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/2')
                .set('Authorization', helpers.signToken(3))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo5555/project/1/update/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1555/update/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project update does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/5555')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that you cannot make project update public without an active profile', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: true
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Main profile must be set to public before you can enable the project update.");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: false,
                    test: true
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/2')
                .send({
                    public: false
                })
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
    describe('DELETE /api/organization/:name/project/:projectId/update', () => {
        it('Should return succesfully deleted project update as owner', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted project update!");
                    done();
                })
        });
        it('Should return succesfully deleted project update as member', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted project update!");
                    done();
                })
        });
        it('Should return that member does not have correct permissions to modify project update', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1')
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to modify project update', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1')
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo555555/project/1/update/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/155555/update/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project update does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/555555')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1')
                .send({
                    public: false
                })
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

    // TODO: Add empty payload tests.
    describe('POST /api/organization/:name/project/:projectId/update/:updateId/profile', () => {
        it('Should return successfully created project update profile as owner', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(999))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 3,
                    public: false
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.profile.created_by.should.eql(999);
                    res.body.message.should.eql("Successfully created new project update profile!");
                    done();
                })
        });
        it('Should return successfully created project update profile as member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 3,
                    public: false
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.profile.created_by.should.eql(1);
                    res.body.message.should.eql("Successfully created new project update profile!");
                    done();
                })
        });
        it('Should return that member does not have correct permissions to create project update profile', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(2))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project update profile', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(3))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo55555/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/55555/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project update does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/5555/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update.");
                    done();
                })
        });
        it('Should return cannot create project update profile in this language', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 2,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot create a project update in a language which does not have a project profile also.");
                    done();
                })
        });
        it('Should return cannot create duplicate project update profile in same language', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project update already has a profile written in this language.");
                    done();
                })
        });
        it('Should return that language_id not a number', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: '2',
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'language_id' value to be of number type");
                    done();
                })
        });
        it('Should return that language_id not does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 999,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Selected language could not be found in our records.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that body is not string', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: null,
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'body' value to be of string type");
                    done();
                })
        });
        it('Should return that name is not string', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: null,
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'title' value to be of string type");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false,
                    test: true
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/update/1/profile')
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
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
    describe('PATCH /api/organization/:name/project/:projectId/update/:updateId/profile/:profileId', () => {
        it('Should return successfully modified project update profile as owner', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: false
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully modified project update profile.");
                    res.body.warning.should.eql("Project public status has automatically been switched to false as there are currently no public profiles enabled.")
                    res.body.updated.should.deep.eql({
                        title: 'testing!',
                        body: 'just a test!',
                        public: false
                    });
                    res.body.from.should.deep.eql({title: 'test1', body: 'test1', public: true});
                    done();
                })
        });
        it('Should return successfully created new project create project update profile as member', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    public: true,
                    language_id: 3
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully modified project update profile.");
                    res.body.updated.should.deep.eql({
                        title: 'testing!',
                        body: 'just a test!',
                        public: true,
                        language_id: 3
                    });
                    res.body.from.should.deep.eql({title: 'test1', body: 'test1', public: false, language_id: 4});
                    done();
                })
        });
        it('Should return that member does not have correct permissions to create project update profile', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(2))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project update profile', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(3))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo55555/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/55555/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project update does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/5555/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update.");
                    done();
                })
        });
        it('Should return that project update profile does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/5555')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update profile.");
                    done();
                })
        });
        it('Should return cannot create project update profile in this language', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 2,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot create a project update in a language which does not have a project profile also.");
                    done();
                })
        });
        it('Should return cannot create duplicate project update profile in same language', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project update already has a profile written in this language.");
                    done();
                })
        });
        it('Should return cannot change language of main profile.', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 2,
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot change language of main profile.");
                    done();
                })
        });
        it('Should return that language_id not a number', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    language_id: '2'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'language_id' value to be of number type");
                    done();
                })
        });
        it('Should return that language_id not does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    language_id: 999
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Selected language could not be found in our records.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'public' to contain boolean value.");
                    done();
                })
        });
        it('Should return that body is not string', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    body: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'body' value to be of string type");
                    done();
                })
        });
        it('Should return that title is not string', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: null
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'title' value to be of string type");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false,
                    test: true
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/update/1/profile/1')
                .send({
                    title: 'testing!',
                    body: 'just a test!',
                    language_id: 1,
                    public: false
                })
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
    describe('DELETE /api/organization/:name/project/:projectId/update/:updateId/profile/:profileId', () => {
        it('Should return successfully deleted project update profile as owner', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.removed.id.should.eql(2);
                    res.body.message.should.eql("Successfully delete project profile!");
                    done();
                })
        });
        it('Should return successfully created new project create project update profile as member', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.removed.id.should.eql(2);
                    res.body.message.should.eql("Successfully delete project profile!");
                    done();
                })
        });
        it('Should return that member does not have correct permissions to create project update profile', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project update profile', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo55555/project/1/update/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/5555/update/1/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project update does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/15555/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update.");
                    done();
                })
        });
        it('Should return that project update profile does not exist', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1/profile/2555')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update profile.");
                    done();
                })
        });
        it('Should return that you cannot delete main profile.', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/2/profile/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find project update profile.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/project/1/update/1/profile/2')
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

    describe('POST /api/organization/:name/project/:projectId/file', () => {
        it('Should return succesfully uploaded new project file as owner', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(999))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .then(res => res)
                .catch(err => err);

            let catchError = res instanceof Error;
            catchError.should.eql(false);
            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully uploaded project file!");
            res.body.projectFile.created_by.should.eql(999);
            res.body.projectFile.name.should.eql('Profile Image!');
            res.body.projectFile.description.should.eql('Testing this route!');
            res.body.projectFile.type.should.eql('image/jpeg');


            await deleteTestFile(res.body.projectFile.key);
        });
        it('Should return succesfully create new project file as member', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .then(res => res)
                .catch(err => err);

            let catchError = res instanceof Error;
            catchError.should.eql(false);
            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully uploaded project file!");
            res.body.projectFile.created_by.should.eql(1);
            res.body.projectFile.name.should.eql('Profile Image!');
            res.body.projectFile.description.should.eql('Testing this route!');
            res.body.projectFile.type.should.eql('image/jpeg');

            await deleteTestFile(res.body.projectFile.key);
        });
        it('Should return that member does not have correct permissions to create projectFile', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(2))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to create project', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(3))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo5555/project/1/file')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/543243/file')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that file too large', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'large.jpg'), "large.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should return that only one file can be uploaded', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File upload limit reached. You may only upload 1 files.");
                    done();
                })
        });
        it('Should return form data empty', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have submitted an empty form.");
                    done();
                })
        });
        it('Should return form data not completed', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return form data has extra params', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .field('testing', 'yup!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/project/1/file')
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
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
    describe('PATCH /api/organization/:name/project/:projectId/file', () => {
        /* TODO: Edge case scenario: A file upload previously labeled as an image cannot be changed to a text file? */
        it('Should return succesfully uploaded new project file (with new upload) as owner', async () => {
            await uploadTestFile();
            let req = await chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(999))
                .attach('file', readFileSync(testFiles + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .then(res => {
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully modified project file!");
                    res.body.updated.name.should.eql("Profile Image!")
                    res.body.from.name.should.eql("cover image!")
                    res.body.from.loc.includes('active').should.eql(false);
                    res.body.updated.loc.includes('active').should.eql(true);
                    res.body.updated.modified_by.should.eql(999);
                    should.exist(res.body.updated.modified_at);
                    return res.body.updated.key;
                })
                .catch(err => {
                    throw err
                });
            await deleteTestFile(req)
        });
        it('Should return succesfully create new project as member', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully modified project file!");
                    res.body.updated.name.should.eql("Profile Image!");
                    res.body.from.name.should.eql("cover image!");
                    res.body.updated.modified_by.should.eql(1);
                    should.exist(res.body.updated.modified_at);
                    done();
                })
        });
        it('Should return that member does not have correct permissions to modify project file', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(2))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have correct permissions to modify project file', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(3))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that organization does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo5555/project/1/file/1')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that project does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/2232/file/1')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project does not exist!");
                    done();
                })
        });
        it('Should return that project file does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/123453')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Project file could not be found.");
                    done();
                })
        });
        it('Should return that file too large', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'large.jpg'), "large.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('File \'large.jpg\' cannot be uploaded as its size exceeds limit of 5mb.');
                    done();
                })
        });
        it('Should return that only one file can be uploaded', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .send({})
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File upload limit reached. You may only upload 1 files.");
                    done();
                })
        });
        it('Should return form data empty', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have submitted an empty form.");
                    done();
                })
        });
        it('Should return form data not completed', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return form data has extra params', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .set('Authorization', helpers.signToken(1))
                .attach('file', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .field('testing', 'yup!')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/project/1/file/1')
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
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


});
