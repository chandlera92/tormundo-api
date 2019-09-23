const bcrypt = require('bcryptjs');
const moment = require('moment');
const salt = bcrypt.genSaltSync();

const gravatar = require('gravatar');
const defaultAvatar = (email) => gravatar.url(email, {d: 'identicon'}, true);

//TODO: Pledged_total etc should be in user and not profile! (I THINK)

exports.seed = (knex, Promise) => {
    return knex('users').del()
        .then(() => {
            const hash = bcrypt.hashSync('test123', salt);
            return Promise.join(
                knex('users').insert([
                    {
                        email: 'testMe@test.com',
                        password: hash,
                        user_name: 'alexc101'
                    },
                    {
                        id: 998,
                        email: 'testMe2@test.com',
                        password: hash,
                        user_name: 'alexc102'
                    },
                    {
                        id: 999,
                        email: 'chandlera092@gmail.com',
                        password: hash,
                        user_name: 'alexc103'
                    },
                    {
                        email: 'chandlera@gmail.com',
                        password: hash,
                        user_name: 'alexc104',
                        verified: true
                    },
                    {
                        email: 'chandlera22222@gmail.com',
                        password: hash,
                        user_name: 'alexc105',
                        verified: true
                    },
                    {
                        email: 'chandlera1@gmail.com',
                        password: hash,
                        user_name: 'alexc106',
                        verified: true
                    }
                ])
            );
        })
        .then(knex('profile').del())
        .then(() => {
            return Promise.join(
                knex('profile').insert([
                    {
                        user_id: 1,
                        first_name: 'Alex',
                        last_name: 'Chandler',
                        description: 'Describe myself here!',
                        public: false,
                        modified: knex.raw('now()'),
                        gravatar: defaultAvatar('testMe@test.com')
                    },
                    {
                        user_id: 998,
                        first_name: 'Alex',
                        last_name: 'Chandler',
                        description: 'Describe myself here!',
                        public: true,
                        modified: knex.raw('now()'),
                        gravatar: defaultAvatar('testMe2@test.com')
                    },
                    {
                        user_id: 999,
                        first_name: 'Alex',
                        last_name: 'Chandler',
                        description: 'Describe myself here!',
                        public: true,
                        modified: knex.raw('now()'),
                        gravatar: defaultAvatar('chandlera092@gmail.com')

                    },
                    {
                        user_id: 2,
                        first_name: 'Alex',
                        last_name: 'Chandler',
                        description: 'Describe myself here!',
                        public: true,
                        modified: knex.raw('now()'),
                        gravatar: defaultAvatar('chandlera@gmail.com')

                    },
                    {
                        user_id: 3,
                        first_name: 'Alex',
                        last_name: 'Chandler',
                        description: 'Describe myself here!',
                        public: true,
                        modified: knex.raw('now()'),
                        gravatar: defaultAvatar('chandlera22222@gmail.com')
                    },
                    {
                        user_id: 4,
                        first_name: 'Alex',
                        last_name: 'Chandler',
                        description: 'Describe myself here!',
                        public: true,
                        modified: knex.raw('now()'),
                        gravatar: defaultAvatar('chandlera1@gmail.com')
                    }
                ])
            );
        })

        .then(() => knex('verification').del()
            .then(function () {
                // Inserts seed entries
                return knex('verification').insert([
                    {user_id: 999, code: 'eeee11'},
                    {user_id: 998, code: 'eeee22', created_at: moment().add(-1, 'days').format()}
                ]);
            }))
        .then(() => knex('password_reset').del()
            .then(function () {
                // Inserts seed entries
                return knex('password_reset').insert([
                    {user_id: 999, code: '466e89843b385b6056349e637aaa624b7bb48727'},
                    {
                        user_id: 998,
                        code: '466e89843b385b6056349e637aaa624b7bb48720',
                        created_at: moment().add(-20, 'minutes').format()
                    }
                ]);
            }));


};