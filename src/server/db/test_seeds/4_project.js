const moment = require('moment');
let createTime = (time) => moment(time, 'DD-MM-YYYY HH:mm').format();

exports.seed = (knex, Promise) => {
    return knex('project').del()
        .then(() => {
            return Promise.join(
                knex('project').insert([
                    {
                        "organization_id": 999,
                        "start_date": createTime('05/09/2018 17:00'),
                        "end_date": createTime('30/09/2018 19:00'),
                        "project_location": "Paris, France",
                        "currency": 1,
                        "goal": 5000,
                        "created_by": 999,
                        "public": true,
                        "public_at": 'now()'
                    },
                    {
                        "organization_id": 999,
                        "start_date": createTime('05/09/2018 17:00'),
                        "end_date": createTime('30/09/2018 19:00'),
                        "project_location": "Lyon, France",
                        "currency": 1,
                        "goal": 5000,
                        "created_by": 999,
                        "public": false
                    }
                ])
            );
        })
        .then(knex('project_file').del())
        .then(() => {
            return Promise.join(
                knex('project_file').insert({
                    project_id: 1,
                    created_by: 999,
                    name: 'cover image!',
                    description: 'cover image',
                    type: 'image/jpeg',
                    key: 'test/organization/tormundo/projects/1/active/54e26a5e00350edc5bbda64b6719d76f-image-test.jpg',
                    loc: 'https://tormundo.s3.eu-west-3.amazonaws.com/test/organization/tormundo/projects/1/active/54e26a5e00350edc5bbda64b6719d76f-image-test.jpg'
                })
            )
        })
        .then(knex('project_profile').del())
        .then(() => {
            return Promise.join(
                knex('project_profile').insert([
                    {
                        "project_id": 1,
                        "name": "tormundo test project",
                        "description": "just a test!",
                        "public": true,
                        "created_by": 999,
                        "language_id": 1,
                        "cover_image": 1
                    },
                    {
                        "project_id": 1,
                        "name": "tormundo test project",
                        "description": "just a test!",
                        "public": false,
                        "created_by": 999,
                        "language_id": 3
                    },
                    {
                        "project_id": 1,
                        "name": "tormundo test project",
                        "description": "just a test!",
                        "public": false,
                        "created_by": 999,
                        "language_id": 4
                    },
                    {
                        "project_id": 2,
                        "name": "tormundo test project number 2",
                        "description": "just a test!",
                        "public": false,
                        "created_by": 999,
                        "language_id": 1
                    }
                ])
            )
        })
        .then(knex('project_access').del())
        .then(() => {
            return Promise.join(
                knex('project_access').insert([
                    {
                        "organization_id": 999,
                        "organization_member": 1,
                        "project_id": 1,
                        "created_by": 999
                    }
                ])
            )
        })
        .then(knex('project_update').del())
        .then(() => {
            return Promise.join(
                knex('project_update').insert([
                    {
                        "project_id": 1,
                        "public": true,
                        "created_by": 999
                    },
                    {
                        "project_id": 1,
                        "public": false,
                        "created_by": 999,
                        "modified_by": 1,
                        "modified_at": "now()"
                    }
                ])
            )
        })
        .then(knex('project_update_history').del())
        .then(() => {
            return Promise.join(
                knex('project_update_history').insert([
                    {
                        "project_update_id": 2,
                        "public": false,
                        "created_by": 999,
                        "created_at": 'now()'
                    }
                ])
            )
        })
        .then(knex('project_update_profile').del())
        .then(() => {
            return Promise.join(
                knex('project_update_profile').insert([
                    {
                        "project_update_id": 1,
                        "language_id": 1,
                        "title": "test1",
                        "body": "test1",
                        "public": true,
                        "created_by": 999
                    },
                    {
                        "project_update_id": 1,
                        "language_id": 4,
                        "title": "test1",
                        "body": "test1",
                        "public": false,
                        "created_by": 999
                    },
                    {
                        "project_update_id": 2,
                        "language_id": 1,
                        "title": "test3",
                        "body": "test3",
                        "public": false,
                        "created_by": 999,
                        "modified_by": 1,
                        "modified_at": "now()"
                    }
                ])
            )
        })

        .then(knex('project_update_profile_history').del())
        .then(() => {
            return Promise.join(
                knex('project_update_profile_history').insert([
                    {
                        "project_profile_id": 2,
                        "language_id": 1,
                        "title": "test2",
                        "body": "test2",
                        "public": false,
                        "created_by": 999,
                        "created_at": "now()"
                    }
                ])
            )
        })

};