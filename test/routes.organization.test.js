process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const server = require('../src/server/index');

const knex = require('../src/server/db/connection');

const helpers = require('../src/server/_helpers/general');

const {readFileSync} = require("fs");
const fs = require("fs");
const testFiles = './src/images/testImages/';

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
            Key: 'test/organization/tormundo/active/54e26a5e00350edc5bbda64b6719d76f-image-test.jpg'
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


describe('routes : organization', () => {
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
    describe('GET /api/organizations', () => {
        it('Should return all organizations which have public set to true', (done) => {
            chai.request(server)
                .get('/api/organizations')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.organizations.length.should.eql(1);
                    for (let org of res.body.organizations) {
                        Object.keys(org).should.eql(['id', 'name', 'public', 'profiles'])
                    }
                    done();
                })
        })
    });
    describe('GET /api/organization/:name', () => {
        it('Should return single organization', (done) => {
            chai.request(server)
                .get('/api/organization/tormundo')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    Object.keys(res.body.organization).should.eql(['id', 'name', 'details', 'public']);
                    done();
                })
        });
        it('Should return organization is private/doesn\'t exist', (done) => {
            chai.request(server)
                .get('/api/organization/tormundoo')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('This organization either doesn\'t exist or is set to private viewing only.');
                    done();
                })
        })
    });

    describe('POST /api/organization', () => {
        // TODO: Improve checking params here? at the moment just check message output.
        it('Should return succesfully create new organization', async () => {
            let res = await chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', '1')
                .then(res => res)
                .catch(err => err);

            let checkError = res instanceof Error;
            checkError.should.eql(false);

            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully created 'tormundo2'");

            await deleteTestFile(res.body.cover_image.key);
        });
        it('Should create organization with no image upload', (done) => {
            chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', '1')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created 'tormundo2'");
                    done();
                })
        });
        it('Should return organization already exists', (done) => {
            chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'tormundo')
                .field('description', 'just a test ennit')
                .field('language_id', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("An organization called 'tormundo' already exists!");
                    done();
                })
        });
        it("Should return error if name is empty", (done) => {
            chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .field('name', '')
                .field('description', 'just a test ennit')
                .field('language_id', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'name' cannot be empty.");
                    done();
                })
        });
        it("Should return error if name contains special characters", (done) => {
            chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .field('name', '@@@tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'name' to contain only letters, spaces and numbers.");
                    done();
                })
        });
        it('Should return that language_id not a number', (done) => {
            chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', 'null')
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
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', '999')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Selected language could not be found in our records.");
                    done();
                })
        });
        it('Should return that image too large', (done) => {
            chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'large.jpg'), "large.jpg")
                .field('name', 'tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', '2')
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
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', '2')
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
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'not-an-image.txt'), "not-an-image.txt")
                .field('name', 'tormundo2')
                .field('description', 'just a test ennit')
                .field('language_id', '2')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'not-an-image.txt' does not have correct format. Uploaded files must be one of the following formats: jpeg, jpg, or png.");
                    done();
                })
        });
        it("Should return error if payload doesn't match name/details", (done) => {
            chai.request(server)
                .post('/api/organization')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'tormundo2')
                .field('test', 'tormundo')
                .field('description', 'just a test ennit')
                .field('language_id', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if payload empty", (done) => {
            chai.request(server)
                .post('/api/organization')
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
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization')
                .send({
                    "name": "tormundo",
                    "details": "testing organizations",
                    "test": "test"
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

    describe('POST /api/organization/:name/upload/official', () => {
        it('Should return succesfully uploaded new organization official document as owner', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/upload/official')
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



          /*  res.body.message.should.eql("Successfully uploaded organization file!");
            res.body.organizationFile.created_by.should.eql(999);
            res.body.organizationFile.name.should.eql('Profile Image!');
            res.body.organizationFile.description.should.eql('Testing this route!');
            res.body.organizationFile.type.should.eql('image/jpeg');*/


            //await deleteTestFile(res.body.organizationFile.key);
        });
        it('Should return succesfully create new organization file as member', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/file')
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
            res.body.message.should.eql("Successfully uploaded organization file!");
            res.body.organizationFile.created_by.should.eql(1);
            res.body.organizationFile.name.should.eql('Profile Image!');
            res.body.organizationFile.description.should.eql('Testing this route!');
            res.body.organizationFile.type.should.eql('image/jpeg');


            await deleteTestFile(res.body.organizationFile.key);
        });
        it('Should return that member does not have correct permissions to create organization file', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/file')
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
        it('Should return that non-member does not have correct permissions to create organization file', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo5555/file')
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
        it('Should return that file too large', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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

    describe('POST /api/organization/:name/file', () => {
        it('Should return succesfully uploaded new organization file as owner', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/file')
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
            res.body.message.should.eql("Successfully uploaded organization file!");
            res.body.organizationFile.created_by.should.eql(999);
            res.body.organizationFile.name.should.eql('Profile Image!');
            res.body.organizationFile.description.should.eql('Testing this route!');
            res.body.organizationFile.type.should.eql('image/jpeg');


            await deleteTestFile(res.body.organizationFile.key);
        });
        it('Should return succesfully create new organization file as member', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/file')
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
            res.body.message.should.eql("Successfully uploaded organization file!");
            res.body.organizationFile.created_by.should.eql(1);
            res.body.organizationFile.name.should.eql('Profile Image!');
            res.body.organizationFile.description.should.eql('Testing this route!');
            res.body.organizationFile.type.should.eql('image/jpeg');


            await deleteTestFile(res.body.organizationFile.key);
        });
        it('Should return that member does not have correct permissions to create organization file', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/file')
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
        it('Should return that non-member does not have correct permissions to create organization file', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo5555/file')
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
        it('Should return that file too large', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
                .post('/api/organization/tormundo/file')
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
    describe('PATCH /api/organization/:name/file', () => {
        /* TODO: Edge case scenario: A file upload previously labeled as an image cannot be changed to a text file? */
        it('Should return succesfully uploaded new project file (with new upload) as owner', async () => {
            await uploadTestFile();
            let res = await chai.request(server)
                .patch('/api/organization/tormundo/file/1')
                .set('Authorization', helpers.signToken(999))
                .attach('file', readFileSync(testFiles + 'normal-profile1.jpg'), "normal-profile1.jpg")
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .then(res => res)
                .catch(err => err);

            let catchError = res instanceof Error;
            catchError.should.eql(false);
            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully modified organization file!");
            res.body.updated.name.should.eql("Profile Image!")
            res.body.from.name.should.eql("cover image!")
            res.body.from.loc.includes('active').should.eql(false);
            res.body.updated.loc.includes('active').should.eql(true);
            res.body.updated.modified_by.should.eql(999);
            should.exist(res.body.updated.modified_at);

            await deleteTestFile(res.body.updated.key)
        });
        it('Should return succesfully create new project as member', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/file/1')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'Profile Image!')
                .field('description', 'Testing this route!')
                .end((err, res) => {
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully modified organization file!");
                    res.body.updated.name.should.eql("Profile Image!");
                    res.body.from.name.should.eql("cover image!");
                    res.body.updated.modified_by.should.eql(1);
                    should.exist(res.body.updated.modified_at);
                    done();
                })
        });
        it('Should return that member does not have correct permissions to modify project file', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/file/1')
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
                .patch('/api/organization/tormundo/file/1')
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
                .patch('/api/organization/tormundo5555/file/1')
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
        it('Should return that project file does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/file/235234')
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
                .patch('/api/organization/tormundo/file/1')
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
                .patch('/api/organization/tormundo/file/1')
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
                .patch('/api/organization/tormundo/file/1')
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
                .patch('/api/organization/tormundo/file/1')
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
                .patch('/api/organization/tormundo/file/1')
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
                .patch('/api/organization/tormundo/file/1')
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

    describe('POST /api/organization/profile', () => {
        it('Should return succesfully create new organization profile as owner', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '3')
                .field('public', 'false')
                .then(res => res)
                .catch(err => err)

            let checkError = res instanceof Error;
            checkError.should.eql(false);

            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully created new profile!");
            res.body.profile.language_id.should.eql(3);
            res.body.profile.description.should.eql('just a test!');

            await deleteTestFile(res.body.cover_image.key);
        });
        it('Should return succesfully create new organization profile as member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(1))
                .field('description', 'just a test!')
                .field('language_id', '3')
                .field('public', 'false')
                .field('cover_image', '1')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new profile!");
                    res.body.profile.language_id.should.eql(3);
                    res.body.profile.cover_image.should.eql(1);
                    res.body.profile.description.should.eql('just a test!');
                    done();
                })
        });
        it('Should return succesfully create new organization profile as member (cover as null)', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(1))
                .field('description', 'just a test!')
                .field('language_id', '3')
                .field('public', 'false')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new profile!");
                    res.body.profile.language_id.should.eql(3);
                    res.body.profile.description.should.eql('just a test!');
                    should.not.exist(res.body.profile.cover_image);
                    done();
                })
        });
        it('Should return that member does not have correct permissions', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(2))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '2')
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
        it('Should return that non-member does not have correct permissions', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(3))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '2')
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
        it('Should return cannot find organization', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo5555/profile')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '1')
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
        it('Should return cannot find file', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo5555/profile')
                .set('Authorization', helpers.signToken(999))
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .field('cover_image', '555')
                .end((err, res) => {
                    // TODO: FIX THIS TEST FUCK SAKE
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that profile cannot be uploaded with new image and existing file as cover image', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
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
        it('Should return that profile already exists in that language', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '1')
                .field('public', 'false')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("It is not possible to have two active profiles which share the same language.");
                    done();
                })
        });
        it("Should return error if language_id is not number", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '1@')
                .field('public', 'false')
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
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(1))
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
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(1))
                .field('description', 'just a test!')
                .field('language_id', '2')
                .field('public', 'lala')
                .field('cover_image', '1')
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
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'large.jpg'), "large.jpg")
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
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
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
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(1))
                .attach('cover_image', readFileSync(testFiles + 'not-an-image.txt'), "not-an-image.txt")
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
        it("Should return error if payload doesn't contain expected parameters", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(999))
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it("Should return error if payload empty", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have submitted an empty form.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/profile')
                .attach('cover_image', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('description', 'just a test!')
                .field('language_id', '1')
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
    describe('PATCH /api/organization/:name/profile/:id', () => {
        it('Should return succesfully modified organization profile as owner. Updating details and language_id.', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/2')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "description": "testing organizations",
                    "language_id": 3
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully updated profile!");
                    res.body.updated.language_id.should.eql(3);
                    res.body.updated.description.should.eql('testing organizations');
                    res.body.from.language_id.should.eql(2);
                    res.body.from.description.should.eql('very first ever org!');
                    done();
                })
        });
        it('Should return successfully modify organization profile as member. Updating just details.', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    "description": "testing organizations",
                    "language_id": 1
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully updated profile!");
                    res.body.updated.language_id.should.eql(1);
                    res.body.updated.description.should.eql('testing organizations');
                    res.body.from.language_id.should.eql(1);
                    res.body.from.description.should.eql('very first ever org!');
                    done();
                })
        });
        it('Should return that member does not have correct permissions to change profile', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(2))
                .send({
                    "description": "testing organizations",
                    "language_id": 1
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
        it('Should return that non-member does not have correct permissions to change profile', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(3))
                .send({
                    "description": "testing organizations",
                    "language_id": 1
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
                .patch('/api/organization/tormundo555/profile/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "description": "testing organizations",
                    "language_id": 3
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
        it('Should return profile does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1515')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "description": "testing organizations",
                    "language_id": 2
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find requested profile.");
                    done();
                })
        });
        it('Should return that project file does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    description: 'just a test!',
                    language_id: 3,
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
                .patch('/api/organization/tormundo/profile/2')
                .set('Authorization', helpers.signToken(1))
                .send({
                    "description": "testing organizations",
                    "language_id": 1
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
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    language_id: 3
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
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "description": "testing organizations",
                    "language_id": '@999'
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
                .patch('/api/organization/tormundo/profile/2')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "description": "testing organizations",
                    "language_id": 999
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
        it('Should return that you cannot make main profile not public if org is live', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    public: false
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot hide main profile if organization is live.");
                    done();
                })
        });
        it('Should return that public is not boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/2')
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
        it("Should return that description is not string", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "description": true,
                    "language_id": 999
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
        it("Should return form data not valid", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "details": "testing organizations",
                    "test": "test",
                    "language_id": 1
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
        it('Should return form data cannot be empty', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/profile/1')
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
                .patch('/api/organization/tormundo/profile/1')
                .send({
                    "description": "testing organizations",
                    "language_id": 1
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
    describe('DELETE /api/organization/:name/profile/:id', () => {
        it("Should return successfully deleted organization profile as owner", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/profile/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted organization profile.");
                    done();
                })
        });
        it("Should return successfully deleted organization profile as member", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/profile/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted organization profile.");
                    done();
                })
        });
        it("Should return that member does not have correct permissions to delete profile", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/profile/2')
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
        it("Should return that non-member does not have correct permissions to delete profile", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/profile/2')
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
        it("Should return that organization does not exist.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo55555/profile/2')
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
        it("Should return that profile does not exist.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/profile/22222')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find requested profile.");
                    done();
                })
        });
        it('Should return that you cannot delete main profile.', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/profile/1')
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
        it("Should return that token has not been sent.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/profile/2')
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

    describe('POST /api/organization/:name/member-invitations', () => {
        it('Should return successfully sent an invitation to a member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": ["alexc102"]
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfullly sent new member invitations!");
                    res.body.usersNotFound.length.should.eql(0);
                    res.body.membersAlreadyInvited.length.should.eql(0);
                    res.body.membersAlreadyExist.length.should.eql(0);
                    res.body.sentInvitations.length.should.eql(1);
                    for (let invite of res.body.sentInvitations) {
                        Object.keys(invite).should.eql(['id', 'user_id', 'sent_by', 'organization_id', 'created']);
                    }
                    done();
                })
        });
        it('Should return that member already exists (when trying to invite owner)', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": ["alexc103"]
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfullly sent new member invitations!");
                    res.body.usersNotFound.length.should.eql(0);
                    res.body.membersAlreadyInvited.length.should.eql(0);
                    res.body.membersAlreadyExist.length.should.eql(1);
                    res.body.sentInvitations.should.eql('No invitations sent');
                    done();
                })
        });
        it('Should return that member already invited', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": ["alexc105"]
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfullly sent new member invitations!");
                    res.body.usersNotFound.length.should.eql(0);
                    res.body.membersAlreadyInvited.length.should.eql(1);
                    res.body.membersAlreadyExist.length.should.eql(0);
                    res.body.sentInvitations.should.eql('No invitations sent');
                    done();
                })
        });
        it('Should return that user has not been found', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": ["alexc110"]
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfullly sent new member invitations!");
                    res.body.usersNotFound.length.should.eql(1);
                    res.body.membersAlreadyInvited.length.should.eql(0);
                    res.body.membersAlreadyExist.length.should.eql(0);
                    res.body.sentInvitations.should.eql('No invitations sent');
                    done();
                })
        });
        it('Should allow member with correct permissions to send an invitation, returning all possible results.', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(2))
                .send({
                    "user_names": ["alexc101", "alexc102", "alexc104", "alexc105", "alexc110", "alexc103"]
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfullly sent new member invitations!");
                    res.body.usersNotFound.length.should.eql(1);
                    res.body.membersAlreadyInvited.length.should.eql(1);
                    res.body.membersAlreadyExist.length.should.eql(3);
                    res.body.sentInvitations.length.should.eql(1);
                    for (let invite of res.body.sentInvitations) {
                        Object.keys(invite).should.eql(['id', 'user_id', 'sent_by', 'organization_id', 'created']);
                    }
                    done();
                })
        });
        it('Should return error if member does not have correct permissions', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(1))
                .send({
                    "user_names": ["alexc101", "alexc102", "alexc104", "alexc105", "alexc106", "alexc103"]
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
        it('Should return error if non-member does not have correct permissions', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(998))
                .send({
                    "user_names": ["alexc101", "alexc102", "alexc104", "alexc105", "alexc106", "alexc103"]
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
        it('Should return cannot find organization', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo5555/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": ["alexc101", "alexc102", "alexc104", "alexc105", "alexc106", "alexc103"]
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
        it('Should return user_names should be of array type', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": 1
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'user_names' value to be of array type.");
                    done();
                })
        });
        it('Should return user_names array cannot be empty', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": []
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'user_names' to not be empty");
                    done();
                })
        });
        it('Should return user_names array can only contain strings', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "user_names": [1, "alexc102", "alexc104", "alexc105", "alexc106", "alexc103"]
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected all items in 'user_names' to be of string type");
                    done();
                })
        });
        it('Should return unexpected parameters', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/invite')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "test": "test",
                    "user_names": ["alexc102", "alexc104", "alexc105", "alexc106", "alexc103"]
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
                .post('/api/organization/tormundo/invite')
                .send({
                    "user_names": ["alexc101", "alexc102", "alexc104", "alexc105", "alexc106", "alexc103"]
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
    describe('PATCH /api/organization/:name/member-invitation/:id', () => {
        it('Should return successfully accept invite', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/invite/1')
                .send({
                    "accepted": true
                })
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully accepted tormundo's member invitation.");
                    done();
                })
        });
        it('Should return successfully reject invite', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/invite/1')
                .send({
                    "accepted": false
                })
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully rejected tormundo's member invitation.");
                    done();
                })
        });

        it('Should return error if invitation is attempting to be accessed by other logged in user', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/invite/1')
                .send({
                    "accepted": false
                })
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find specified membership invitation.");
                    done();
                })
        });

        it('Should return error if no invite exists', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/invite/6')
                .send({
                    "accepted": false
                })
                .set('Authorization', helpers.signToken(3))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find specified membership invitation.");
                    done();
                })
        });
        it('Should return cannot find organization', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo555/invite/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    accepted: false
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
        it('Should return incorrect form data', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/invite/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    accepted: false,
                    test: 'h'
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
        it('Should return accepted must be boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/invite/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    accepted: 'false',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'accepted' to contain boolean value.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/invite/1')
                .send({
                    "user_names": ["alexc101", "alexc102", "alexc104", "alexc105", "alexc106", "alexc103"]
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

    describe('PATCH /api/organization/:name/member-permissions/:user', () => {
        it("Should update a permission as owner", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({
                    "create_account_access": true,
                    "level": 0
                })
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    let data = res.body.permissions;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully updated member permissions.");
                    Object.keys(data).should.eql(['updated', 'from']);
                    data.updated.created_by.should.eql(999);
                    data.from.created_by.should.eql(999);
                    data.updated.level.should.eql(0);
                    data.from.level.should.eql(2);
                    data.updated.create_account_access.should.eql(true);
                    data.from.create_account_access.should.eql(false);
                    done();
                })
        });
        it("Should update a permission and 'created_by' as user", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({
                    "create_account_access": true
                })
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    let data = res.body.permissions;
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully updated member permissions.");
                    Object.keys(data).should.eql(['updated', 'from']);
                    data.updated.created_by.should.eql(1);
                    data.from.created_by.should.eql(999);
                    data.updated.create_account_access.should.eql(true);
                    data.from.create_account_access.should.eql(false);
                    done();
                })
        });
        it("Should not allow user to grant person with a higher permission level than themselves", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({
                    "level": 0
                })
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You cannot upgrade a members permission level to one that exceeds or is the same as your own.");
                    done();
                })
        });
        it("Should not allow user to grant person with same permission level as themselves", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({
                    "level": 1
                })
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You cannot upgrade a members permission level to one that exceeds or is the same as your own.");
                    done();
                })
        });
        it("Should not allow user to edit person with higher permissions", (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/1')
                .send({
                    "invite_members": true,
                    "level": 0
                })
                .set('Authorization', helpers.signToken(2))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Your account does not have the required permission level to edit this user.");
                    done();
                })
        });
        it('Should return that member cannot grant a permission they do not have themselves', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({
                    "invite_members": true
                })
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot modify 'invite_members' as your account does not have access to this permission.");
                    done();
                })
        });
        it('Should return that member does not have required permissions to edit this resource', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/1')
                .send({
                    "invite_members": true
                })
                .set('Authorization', helpers.signToken(4))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return that non-member does not have required permissions to edit this resource', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/3')
                .send({
                    "invite_members": true
                })
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
        it('Should return cannot find organization', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo5/member-permissions/3')
                .send({
                    "invite_members": true
                })
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return cannot find member as user', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/3')
                .send({
                    "create_account_access": true
                })
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
        it('Should return cannot find member as owner', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/3')
                .send({
                    "invite_members": true
                })
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find specified member.");
                    done();
                })
        });
        it('Should return cannot modify own permissions', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/1')
                .send({
                    "invite_members": true
                })
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You cannot modify your own permissions.");
                    done();
                })
        });
        it('Should return values must be boolean', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({
                    "invite_members": 'true'
                })
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'invite_members' to contain boolean value.");
                    done();
                })
        });
        it('Should return incorrect form data if unexpected parameter', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({
                    "create_account_access": true,
                    "test": true
                })
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return incorrect form data if no data sent', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({})
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return you have not logged in', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/member-permissions/2')
                .send({})
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
    describe('DELETE /api/organization/:name/member/:member', () => {
        it("Should allow owner to delete member", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/member/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted member.");
                    done();
                })
        });
        it("Should allow member to delete other member", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/member/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted member.");
                    done();
                })
        });
        it("Should return organization doesn't exist.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo5/member/2')
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
        it("Should return member does not exist.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/member/4444')
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
        it("Should return cannot remove own member account.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/member/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You cannot modify your own member account.");
                    done();
                })
        });
        it("Should return that member does not have required permissions.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/member/1')
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
        it("Should return that non-member does not have required permissions.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/member/1')
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
        it("Should return that token has not been sent.", (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/member/1')
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

    describe('POST /api/organization/:name/account', () => {
        it('Should return succesfully created new organization account as owner', async () => {
            let res = await chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(999))
                .attach('profile_picture', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'sales')
                .field('description', 'test')
                .then(res => res)
                .catch(err => err);


            let checkError = res instanceof Error;
            checkError.should.eql(false);

            res.redirects.length.should.eql(0);
            res.status.should.eql(200);
            res.type.should.eql('application/json');
            res.body.message.should.eql("Successfully created new organization account!");

            res.body.account.name.should.eql('sales@tormundo');
            res.body.account.description.should.eql('test');

            should.exist(res.body.account.profile_picture);
            should.not.exist(res.body.accountAccess);
            should.exist(res.body.profile_picture);

            await deleteTestFile(res.body.profile_picture.key);
        });
        it('Should return succesfully created new organization account as member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'sales')
                .field('description', 'test')
                .field('profile_picture', '1')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new organization account!");
                    res.body.account.name.should.eql('sales@tormundo');
                    res.body.account.description.should.eql('test');
                    res.body.account.profile_picture.should.eql(1);
                    should.exist(res.body.accountAccess);
                    should.not.exist(res.body.profile_picture);
                    done();
                })
        });
        it('Should return succesfully created new organization account as member (with profile_pic as null)', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .field('name', 'sales')
                .field('description', 'test')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new organization account!");
                    res.body.account.name.should.eql('sales@tormundo');
                    res.body.account.description.should.eql('test');
                    should.not.exist(res.body.account.profile_picture);
                    should.exist(res.body.accountAccess);
                    should.not.exist(res.body.profile_picture);
                    done();
                })
        });
        it('Should return member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(2))
                .field('name', 'sales')
                .field('description', 'test')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have the required permissions to modify/access this resource.");
                    done();
                })
        });
        it('Should return non-member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(3))
                .field('name', 'sales')
                .field('description', 'test')
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
                .post('/api/organization/tormundo5/account')
                .set('Authorization', helpers.signToken(999))
                .field('name', 'sales')
                .field('description', 'test')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that organization file does not exist', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .field('description', 'test')
                .field('profile_picture', '5')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization file could not be found.");
                    done();
                })
        });
        it('Should return that project profile cannot be uploaded with new image and existing file as cover image', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .attach('profile_picture', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'sales')
                .field('description', 'test')
                .field('profile_picture', '1')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot include a file id for cover image as well as providing new image to upload.");
                    done();
                })
        });
        it('Should return that image too large', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .attach('profile_picture', readFileSync(testFiles + 'large.jpg'), "large.jpg")
                .field('name', 'sales')
                .field('description', 'test')
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
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .attach('profile_picture', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach('profile_picture', readFileSync(testFiles + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('name', 'sales')
                .field('description', 'test')
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
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .attach('profile_picture', readFileSync(testFiles + 'not-an-image.txt'), "not-an-image.txt")
                .field('name', 'sales')
                .field('description', 'test')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'not-an-image.txt' does not have correct format. Uploaded files must be one of the following formats: jpeg, jpg, or png.");
                    done();
                })
        });
        it('Should return that profile_picture not a number', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(1))
                .field('description', 'test')
                .field('profile_picture', 'null')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'profile_picture' value to be of number type");
                    done();
                })
        });
        it('Should return organization account name already exists.', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(999))
                .field('name', 'contact')
                .field('description', 'test')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization account already exists");
                    done();
                })
        });
        it('Should return that name cannot contain special characters', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(999))
                .field('name', 'sales@')
                .field('description', 'test')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'name' to contain only letters, spaces and numbers.");
                    done();
                })
        });
        it('Should return that name cannot be empty', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(999))
                .field('name', '')
                .field('description', 'test')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'name' cannot be empty.");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(999))
                .field('name', 'sales')
                .field('description', 'test')
                .field('test', 'true')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Form data has not been completed correctly, or we have encountered unexpected parameters in request, please review and send again.");
                    done();
                })
        });
        it('Should return form data empty', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have submitted an empty form.");
                    done();
                })
        });
        it("Should return error if token isn't sent", (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account')
                .field('name', 'sales')
                .field('description', 'test')
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
    describe('PATCH /api/organization/:name/organization_account/:id', () => {
        it('Should return succesfully modify organization account as org owner', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/2')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": "contactES",
                    "description": "test new description entry!",
                    "profile_picture": 1
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully modifed organization account.");
                    res.body.updated.name.should.eql('contactES@tormundo');
                    res.body.updated.description.should.eql('test new description entry!');
                    res.body.updated.profile_picture.should.eql(1);
                    res.body.from.name.should.eql('testing@tormundo');
                    res.body.from.description.should.eql('testing!');
                    should.not.exist(res.body.from.profile_picture);

                    done();
                })
        });
        it('Should return succesfully modify organization account as org member', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    "description": "testing2"
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully modifed organization account.");
                    res.body.updated.description.should.eql('testing2');
                    res.body.from.description.should.eql('testing!');
                    done();
                })
        });
        it('Should return member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(2))
                .send({
                    "name": "contact",
                    "description": "test"
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.");
                    done();
                })
        });
        it('Should return non-member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(3))
                .send({
                    "name": "contact",
                    "description": "test"
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You do not have access to this organization account. Please contact an administrator inside your organization if this is a mistake.");
                    done();
                })
        });
        it('Should return that organization cannot be found', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo555/account/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": 'contact',
                    "description": 'test'
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
        it('Should return that account cannot be found', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1123')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": 'contact',
                    "description": 'test'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find organization account specified in the request.");
                    done();
                })
        });
        it('Should return that organization file does not exist', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    "name": "contactES",
                    "description": "test new description entry!",
                    "profile_picture": 5
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization file could not be found.");
                    done();
                })
        });
        it('Should return that cannot change general account name', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": "contactES",
                    "description": "test"
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot change general account name.");
                    done();
                })
        });
        it('Should return that name cannot contain special characters', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": "contact@.",
                    "description": "test"
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'name' to contain only letters, spaces and numbers.");
                    done();
                })
        });
        it('Should return that name cannot be empty', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": "",
                    "description": "test"
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'name' cannot be empty.");
                    done();
                })
        });
        it('Should return that name must be string', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": true,
                    "description": "test"
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
        it('Should return that description must be string', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": 'contact',
                    "description": 4
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
        it('Should return that profile_picture not a number', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(1))
                .send({
                    "name": 'contact',
                    "description": 'test',
                    "profile_picture": 'lalalala'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'profile_picture' value to be of number type");
                    done();
                })
        });
        it('Should return form data not valid', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(999))
                .send({
                    "name": "contact",
                    "description": "test",
                    "test": true
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
        it('Should return form data not completed', (done) => {
            chai.request(server)
                .patch('/api/organization/tormundo/account/1')
                .set('Authorization', helpers.signToken(999))
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
                .patch('/api/organization/tormundo/account/1')
                .send({
                    "name": 'contact',
                    "description": 'test'
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
    describe('DELETE /api/organization/:name/organization_account/:id', () => {
        it('Should allow owner to delete account. Should return with 1 account access entries', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/account/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted account and 1 account access entries.");
                    done();
                })
        });
        it('should allow member to delete account.', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/organization-account/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted account.");
                    done();
                })
        });
        it('Should return member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/organization-account/2')
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
        it('Should return non-member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/organization-account/2')
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
        it('Should return that organization cannot be found', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo5/organization-account/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that account cannot be found', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/organization-account/99786')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find organization account specified in the request.");
                    done();
                })
        });
        it('Should return user must log in', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/organization-account/2')
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

    describe('POST /api/organization/:name/organization_account_access', () => {
        it('Should return succesfully create new organization account access as org owner', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account/1/access/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new account access for organization member.");
                    Object.keys(res.body.account[0]).should.eql(['id', 'organization_id', 'organization_member', 'organization_account', 'created_by', 'created_at']);
                    res.body.account[0].organization_member.should.eql(2);
                    res.body.account[0].organization_account.should.eql(1);
                    done();
                })
        });
        it('Should return succesfully create new organization account as org member', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account/1/access/2')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully created new account access for organization member.");
                    Object.keys(res.body.account[0]).should.eql(['id', 'organization_id', 'organization_member', 'organization_account', 'created_by', 'created_at']);
                    res.body.account[0].organization_member.should.eql(2);
                    res.body.account[0].organization_account.should.eql(1);
                    done();
                })
        });
        it('Should return member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account/1/access/2')
                .set('Authorization', helpers.signToken(2))
                .send({
                    "organization_member": 2,
                    "organization_account": 1
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
        it('Should return non-member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account/1/access/2')
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
        it('Should return that organization cannot be found', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo555/account/1/access/2')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return organization account access already exists.', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account/1/access/1')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Member already has access to this account.");
                    done();
                })
        });
        it('Should return cannot find member.', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account/1/access/555')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Cannot find specified member.");
                    done();
                })
        });
        it('Should return error if token isn\'t sent', (done) => {
            chai.request(server)
                .post('/api/organization/tormundo/account/1/access/2')
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
    describe('DELETE /api/organization/:name/organization_account_access/:id', () => {
        it('Should allow owner to delete account access.', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/account/1/access/1')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted member's account access.");
                    done();
                })
        });
        it('Should allow member to delete account access.', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/account/1/access/1')
                .set('Authorization', helpers.signToken(1))
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Successfully deleted member's account access.");
                    done();
                })
        });
        it('Should return member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/account/1/access/2')
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
        it('Should return non-member does not have required permissions to modify this resource', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/account/1/access/1')
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
        it('Should return that organization cannot be found', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo555/account/1/access/1')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Organization could not be found.");
                    done();
                })
        });
        it('Should return that account cannot be found', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/account/222/access/555')
                .set('Authorization', helpers.signToken(999))
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Member does not have account access.");
                    done();
                })
        });
        it('Should return user must log in', (done) => {
            chai.request(server)
                .delete('/api/organization/tormundo/account/1/access/1')
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
