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
                        "language_id": 1,
                        "created_by": 999,
                        "public": false
                    },
                    {
                        "organization_id": 999,
                        "start_date": createTime('05/09/2018 17:00'),
                        "end_date": createTime('30/09/2018 19:00'),
                        "project_location": "Lyon, France",
                        "currency": 1,
                        "goal": 5000,
                        "language_id": 1,
                        "created_by": 999,
                        "public": false
                    }
                ])
            );
        })
        .then(knex('project_profile').del())
        .then(() => {
            return Promise.join(
                knex('project_profile').insert([
                    {
                        "project_id": 1,
                        "name": "tormundo test project",
                        "description": "just a test!",
                        "default": true,
                        "public": false,
                        "created_by": 999,
                        "language_id": 1
                    },
                    {
                        "project_id": 2,
                        "name": "tormundo test project number 2",
                        "description": "just a test!",
                        "default": true,
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
};