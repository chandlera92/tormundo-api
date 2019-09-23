process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const {readFileSync} = require("fs");


chai.use(chaiHttp);

const server = require('../src/server/index');

const knex = require('../src/server/db/connection');

const helpers = require('../src/server/_helpers/general');

let token1 = helpers.signToken(998);
const testImages = './src/images/testImages/'

describe('routes : user', () => {
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

    describe('PATCH /api/user/profile-image', () => {
        it('Should return succesfully updated profile with all available fields filled', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .attach('avatar_loc', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('first_name', 'Alex')
                .field('last_name', 'Chandler')
                .field('description', 'Describe myself teehe')
                .field('public', 'true')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully updated profile!');
                    res.body.updated.should.eql('The following fields were updated: first_name, last_name, description, public, avatar_loc');
                    done();
                })
        });

        it('Should modify text field only', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .field('public', 'false')
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully updated profile!');
                    res.body.updated.should.eql('The following fields were updated: public');
                    done();
                })
        })

        it('Should modify image field only', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .attach('avatar_loc', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully updated profile!');
                    res.body.updated.should.eql('The following fields were updated: avatar_loc');
                    done();
                })
        })

        // text upload errors

        it('Should throw error if public not true/false', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .field('public', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'public\' to contain boolean value.');
                    done();
                })
        });

        // file upload errors

        it('Should return error if file is uploaded in other allowed field that should contain text', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .attach("public", readFileSync(testImages + 'large.jpg'), "large.jpg")
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Field 'public' cannot contain a file");
                    done();
                })
        });

        it('Should return image too large', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .attach("avatar_loc", readFileSync(testImages + 'large.jpg'), "large.jpg")
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'large.jpg' cannot be uploaded as its size exceeds limit of 2mb.");
                    done();
                })
        });

        it('Should return file not image type error', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .attach("avatar_loc", readFileSync(testImages + 'not-an-image.txt'), "not-an-image.txt")
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'not-an-image.txt' does not have correct format. Uploaded files must be one of the following formats: jpeg, jpg, or png.");
                    done();
                })
        })
        it('Should return no file found in image field', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .field('avatar_loc', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'avatar_loc' to contain a file");
                    done();
                })
        });

        it('Should show error if user tries to upload more than one image', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .attach("avatar_loc", readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach("avatar_loc", readFileSync(testImages + 'normal-2.jpeg'),  "normal-2.jpeg")
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected 'avatar_loc' to contain only one file");
                    done();
                })
        })

        it('Should throw unexpected data included in request error', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .set('Authorization', token1)
                .attach('avatar_loc', readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .field('first_name', 'Alex')
                .field('last_name', 'Chandler')
                .field('description', 'Describe myself teehe')
                .field('public', 'true')
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

        it('Should throw error if token not found', (done) => {
            chai.request(server)
                .patch('/api/user/modify-profile')
                .field('public', 'true')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("You have not logged in! Please log in and try again.");
                    done();
                })
        })




    })

    describe('PATCH /api/user/modify-settings', () => {
        it('Should update all settings', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    email: 'testNew@test.com',
                    password: 'test12',
                    country_id: 30,
                    language_id: 1,
                    currentPassword: 'test123',
                    confirmPassword: 'test12'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully modified user settings');
                    done();
                })
        });
        it('Should update update password only', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test12',
                    currentPassword: 'test123',
                    confirmPassword: 'test12'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully modified user settings');
                    done();
                })
        });

        /* CURRENT PASSWORD */

        it('Should throw error if current password not entered', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test12',
                    confirmPassword: 'test12'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You must provide your current password in order to make account changes.');
                    done();
                })
        });

        it('Should throw error if current password is wrong', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test12',
                    currentPassword: 'test124',
                    confirmPassword: 'test12'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Current password does not match with the one in our records. Please try again.');
                    done();
                })
        });

        /* EMAIL */

        it('Should return successful if user tries to update with same email and no other fields', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    email: 'testMe2@test.com',
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully modified user settings');
                    done();
                })
        });

        it('Should make changes if email address is same as current', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    email: 'testMe2@test.com',
                    currentPassword: 'test123',
                    password: 'test12',
                    confirmPassword: 'test12'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully modified user settings');
                    done();
                })
        });


        it('Should throw error email is not valid', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    email: 'test12',
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Email address is not valid.');
                    done();
                })
        });

        it('Should throw error email is taken', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    email: 'chandlera092@gmail.com',
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Email address has already been registered.');
                    done();
                })
        });

        /* COUNTRY/LANGUAGES CHANGE*/

        it('Should update country', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    country_id: 30,
                    currentPassword: 'test123'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully modified user settings');
                    done();
                })
        });

        it('Should update language', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    language_id: 1,
                    currentPassword: 'test123'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Successfully modified user settings');
                    done();
                })
        });

        it('Should throw error if language is not number', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    language_id: '1',
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'language\' value to be of number type');
                    done();
                })
        });

        it('Should throw error if country is not number', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    country_id: '1',
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Expected \'country\' value to be of number type');
                    done();
                })
        });

        it('Should throw error if language is not recorded (>) ', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    language_id: 9999,
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Selected language could not be found in our records.');
                    done();
                })
        });

        it('Should throw error if language is not recorded (<) ', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    language_id: 0,
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Selected language could not be found in our records.');
                    done();
                })
        });

        it('Should throw error if country is not recorded (>) ', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    country_id: 9999,
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Selected country could not be found in our records.');
                    done();
                })
        });

        it('Should throw error if country is not recorded (<) ', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    country_id: 0,
                    currentPassword: 'test123',
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Selected country could not be found in our records.');
                    done();
                })
        });

        /* PASSWORD CHANGE */

        it('Should throw error if password and confirmPassword don\'t match', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test12345',
                    currentPassword: 'test123',
                    confirmPassword: 'test12'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Entered passwords do not match');
                    done();
                })
        });

        it('Should throw error if password entered and not confirmPassword', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    currentPassword: 'test123',
                    password: 'test12'
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

        it('Should throw error if confirmPassword entered and not password', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test12345',
                    currentPassword: 'test123'
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

        it('Should throw error if new password and current password are the same', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test123',
                    confirmPassword: 'test123',
                    currentPassword: 'test123'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Password has been used in the last 5 attempts, please select a new.');
                    done();
                })
        });

        it('Should throw error if new password is under 6 characters', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test1',
                    confirmPassword: 'test1',
                    currentPassword: 'test123'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Password must be longer than 6 characters');
                    done();
                })
        });

        /* GENERAL */

        it('Should throw error if no token sent', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .send({
                    password: 'test1',
                    confirmPassword: 'test1',
                    currentPassword: 'test123'
                })
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('You have not logged in! Please log in and try again.');
                    done();
                })
        });

        it('Should throw error if non valid fields sent', (done) => {
            chai.request(server)
                .patch('/api/user/modify-settings')
                .set('Authorization', token1)
                .send({
                    password: 'test1',
                    confirmPassword: 'test1',
                    currentPassword: 'test123',
                    failME: 'woop'
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

    })

});


/*
    describe('POST /api/user/profile-image', () => {
        it('Should return successful image upload', (done) => {
            chai.request(server)
                .post('/api/user/profile-image')
                .set('Authorization', token1)
                .attach("profileImage", readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .end((err, res) => {
                    should.not.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(200);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql('Profile picture has been successfully uploaded!');
                    done();
                })
        })
        it('Should return image too large', (done) => {
            chai.request(server)
                .post('/api/user/profile-image')
                .set('Authorization', token1)
                .attach("profileImage", readFileSync(testImages + 'large.jpg'), "large.jpg")
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'large.jpg' cannot be uploaded as its size exceeds limit of 2mb.");
                    done();
                })
        })

        it('Should return formatting error', (done) => {
            chai.request(server)
                .post('/api/user/profile-image')
                .set('Authorization', token1)
                .attach("profileImage", readFileSync(testImages + 'not-an-image.txt'), "not-an-image.txt")
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("File 'not-an-image.txt' does not have correct format. Uploaded files must be one of the following formats: jpeg, jpg, or png.");
                    done();
                })
        })
        it('Should return not a file', (done) => {
            chai.request(server)
                .post('/api/user/profile-image')
                .set('Authorization', token1)
                .field('profileImage', '')
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("Expected to recieve File. Please attach an image.");
                    done();
                })
        })

        it('Should incorrect data submitted', (done) => {
            chai.request(server)
                .post('/api/user/profile-image')
                .set('Authorization', token1)
                .field('profileImage', '')
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

        it('Should show error if user tries to upload more than one image', (done) => {
            chai.request(server)
                .post('/api/user/profile-image')
                .set('Authorization', token1)
                .attach("profileImage", readFileSync(testImages + 'normal-profile.jpg'), "normal-profile.jpg")
                .attach("profileImage", readFileSync(testImages + 'normal-2.jpeg'),  "normal-2.jpeg")
                .end((err, res) => {
                    should.exist(err);
                    res.redirects.length.should.eql(0);
                    res.status.should.eql(401);
                    res.type.should.eql('application/json');
                    res.body.message.should.eql("should only contain one image");
                    done();
                })
        })


    })
*/
