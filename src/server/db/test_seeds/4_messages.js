const moment = require('moment');

exports.seed = (knex, Promise) => {
    return knex('message_group').del()
        .then(() => knex('message_group')
            .insert([
                {subject: 'hello1'},
                {subject: 'hello2'},
                {subject: 'hello3'},
                {subject: 'hello Org!'},
                {subject: 'hello Org2!'},
                {subject: 'hello Org3!'},
                {subject: 'hello Org4!'}

            ])
        )
        .then(() => knex('message').del()
            .then(() => knex('message').insert([
                    {
                        group_id: 1,
                        text: 'hello1',
                        sender: 'alexc103',
                        a: 'alexc101',
                        cc: 'null',
                        created_at: moment().format()
                    },
                    {
                        group_id: 2,
                        text: 'hello2',
                        sender: 'alexc101',
                        a: 'alexc103',
                        cc: 'null',
                        created_at: moment().format()
                    },
                    {
                        group_id: 3,
                        text: 'hello3',
                        sender: 'alexc103',
                        a: 'alexc101',
                        cc: 'null',
                        created_at: moment().format()
                    },
                    {
                        group_id: 4,
                        text: 'helloOrg!',
                        sender: 'alexc101',
                        a: 'contact@tormundo,testing@tormundo',
                        cc: 'null',
                        created_at: moment().format()
                    },
                    {
                        group_id: 5,
                        text: 'helloOrg2!',
                        sender: 'contact@tormundo',
                        a: 'alexc103',
                        cc: 'null',
                        created_at: moment().format()
                    },
                    {
                        group_id: 6,
                        text: 'helloOrg3!',
                        sender: 'alexc104',
                        a: 'contact@tormundo',
                        cc: 'null',
                        created_at: moment().format()
                    },
                    {
                        group_id: 7,
                        text: 'helloOrg4!',
                        sender: 'contact@tormundo',
                        a: 'contact@tormundo',
                        cc: 'null',
                        created_at: moment().format()
                    }
                ])
            )
        )
        .then(() => knex('message_custom_categories').del()
            .then(() => knex('message_custom_categories').insert([
                    {user_account: 1, path: 'test', name: 'test'},
                    {user_account: 1, path: 'test.inbox', name: 'inbox'},
                    {user_account: 1, path: 'personal', name: 'personal'},
                    {user_account: 1, path: 'project', name: 'project'},
                    {user_account: 1, path: 'project.idea', name: 'idea'},
                    {user_account: 1, path: 'personal.events', name: 'events'},
                    {user_account: 1, path: 'personal.events.january', name: 'january'},
                    {user_account: 1, path: 'project.objective', name: 'objective'},
                    {user_account: 1, path: 'personal.events.february', name: 'february'},
                    {user_account: 1, path: 'project.objective.january', name: 'january'},
                    {user_account: 1, path: 'project.objective.february', name: 'objective'},
                    {user_account: 999, organization_account: 1, path: 'test', name: 'test'},
                    {user_account: 999, organization_account: 1, path: 'test.inbox', name: 'inbox'},
                    {user_account: 999, organization_account: 1, path: 'events', name: 'events'},
                    {user_account: 999, organization_account: 1, path: 'events.inbox', name: 'inbox'}


                ])
            )
        )
        .then(() => knex('message_participants').del()
            .then(() => knex('message_participants').insert([
                    {message_id: 1, user_account: 999, category: 'sent', read: true, read_at: moment().format()},
                    {message_id: 3, user_account: 999, category: 'sent', read: true, read_at: moment().format()},
                    {message_id: 1, user_account: 1, category: null, custom_category: 2},
                    {message_id: 3, user_account: 1, category: null, custom_category: 1},
                    {message_id: 2, user_account: 1, category: 'sent', read: true, read_at: moment().format()},
                    {message_id: 2, user_account: 999, category: 'inbox'},
                    {message_id: 4, user_account: 999, organization_account: 1, category: 'inbox'},
                    {message_id: 4, user_account: 999, organization_account: 2, category: 'inbox'},
                    {message_id: 4, user_account: 1, category: 'sent', read: true},
                    {message_id: 5, user_account: 999, organization_account: 1, category: 'sent', read: true},
                    {message_id: 5, user_account: 999, category: 'inbox'},
                    {message_id: 6, user_account: 999, organization_account: 1, custom_category: 12},
                    {message_id: 6, user_account: 2, category: 'sent'},
                    {message_id: 7, user_account: 999, organization_account: 1, custom_category: 13},
                    {message_id: 7, user_account: 999, organization_account: 1, custom_category: 12}

                ])
            )
        )
};