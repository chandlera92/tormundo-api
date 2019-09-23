const moment = require('moment');

exports.seed = (knex, Promise) => {
    return knex('organization').del()
        .then(() => {
            return Promise.join(
                knex('organization').insert([
                    {
                        "owner": 999,
                        "id": 999,
                        "created_by": 999,
                        "language_id": 1,
                        "name": "tormundo",
                        "public": true
                    },
                    {
                        "owner": 999,
                        "id": 1000,
                        "created_by": 999,
                        "language_id": 1,
                        "name": "tormundoo"
                    }
                ])
            );
        })
        .then(knex('organization_file').del())
        .then(() => {
            return Promise.join(
                knex('organization_file').insert({
                    organization_id: 999,
                    created_by: 999,
                    name: 'cover image!',
                    description: 'cover image',
                    type: 'image/jpeg',
                    key: 'development/organization/tormundo/active/2258293a9cf9fba93cf97a3034643db5-selfie.jpeg',
                    loc: 'https://tormundo.s3.eu-west-3.amazonaws.com/development/organization/tormundo/active/2258293a9cf9fba93cf97a3034643db5-selfie.jpeg'
                })
            )
        })
        .then(knex('organization_card').del())
        .then(() => {
            return Promise.join(
                knex('organization_card').insert([
                    {
                        "organization_id": 999,
                        "description": "very first ever org!",
                        "public": true,
                        "created_by": 999,
                        "language_id": 1,
                        "image": 1
                    },
                    {
                        "organization_id": 999,
                        "description": "Premier organizations! Je suis francais.",
                        "created_by": 999,
                        "language_id": 2,
                        "image": 1
                    },
                    {
                        "organization_id": 1000,
                        "description": "second org",
                        "created_by": 999,
                        "language_id": 2
                    }
                ])
            )
        })
        .then(knex('organization_profile').del())
        .then(() => {
            return Promise.join(
                knex('organization_profile').insert([
                    {
                        "organization_id": 999,
                        "description": "very first ever org!",
                        "created_by": 999,
                        "language_id": 1,
                        "public": true
                    },
                    {
                        "organization_id": 999,
                        "description": "very first ever org!",
                        "created_by": 999,
                        "language_id": 2
                    },
                    {
                        "organization_id": 1000,
                        "description": "second org",
                        "created_by": 999,
                        "language_id": 1
                    }
                ])
            )
        })
        .then(knex('organization_member_invitation').del())
        .then(() => {
            return Promise.join(
                knex('organization_member_invitation').insert([
                    {
                        "organization_id": 999,
                        "sent_by": 999,
                        "user_id": 3
                    }
                ])
            )
        })
        .then(knex('organization_member_invitation_history').del())
        .then(() => {
            return Promise.join(
                knex('organization_member_invitation_history').insert([
                    {
                        "organization_id": 999,
                        "accepted": true,
                        "answered": knex.raw('now()'),
                        "created": knex.raw('now()'),
                        "sent_by": 999,
                        "user_id": 1
                    },
                    {
                        "organization_id": 999,
                        "accepted": true,
                        "answered": knex.raw('now()'),
                        "created": knex.raw('now()'),
                        "sent_by": 999,
                        "user_id": 2
                    },
                ])
            )
        })
        .then(knex('organization_member_permissions').del())
        .then(() => {
            return Promise.join(
                knex('organization_member_permissions').insert([
                    {
                        "created_by": 999,
                        "level": 1,
                        "create_file": true,
                        "modify_file": true,
                        "remove_file": true,
                        "invite_members": false,
                        "edit_profile": true,
                        "create_profile": true,
                        "edit_settings": true,
                        "edit_member_permissions": true,
                        "delete_member": true,
                        "delete_profile": true,
                        "create_account": true,
                        "delete_account": true,
                        "create_account_access": true,
                        "delete_account_access": true,
                        "create_project_access": true,
                        "delete_project_access": true,
                        "create_project": true
                    },
                    {
                        "created_by": 999,
                        "level": 2,
                        "edit_member_permissions": true,
                        "invite_members": true
                    },
                    {
                        "created_by": 999,
                        "level": 0,
                        "invite_members": false,
                        "edit_profile": true,
                        "create_profile": true,
                        "edit_settings": true,
                        "edit_member_permissions": true,
                        "delete_member": true,
                        "delete_profile": true,
                        "create_account": true,
                        "delete_account": true,
                        "create_account_access": true,
                        "delete_account_access": true
                    },
                    {
                        "created_by": 999,
                        "invite_members": true
                    }
                ])
            )
        })
        .then(knex('organization_member').del())
        .then(() => {
            return Promise.join(
                knex('organization_member').insert([
                    {
                        "organization_id": 999,
                        "created_by": 999,
                        "user_id": 1,
                        "organization_member_permissions_id": 1
                    },
                    {
                        "organization_id": 999,
                        "created_by": 999,
                        "user_id": 2,
                        "organization_member_permissions_id": 2
                    },
                    {
                        "organization_id": 1000,
                        "created_by": 999,
                        "user_id": 3,
                        "organization_member_permissions_id": 3
                    },
                    {
                        "organization_id": 999,
                        "created_by": 999,
                        "user_id": 4,
                        "organization_member_permissions_id": 4
                    }
                ])
            )
        })
        .then(knex('organization_account').del())
        .then(() => {
            return Promise.join(
                knex('organization_account').insert([
                    {
                        "organization_id": 999,
                        "created_by": 999,
                        "name": "contact@tormundo",
                        "description": "testing!"
                    },
                    {
                        "organization_id": 999,
                        "created_by": 999,
                        "name": "testing@tormundo",
                        "description": "testing!"
                    },
                ])
            )
        })
        .then(knex('organization_account_access').del())
        .then(() => {
            return Promise.join(
                knex('organization_account_access').insert([
                    {
                        "organization_id": 999,
                        "organization_account": 1,
                        "organization_member": 1,
                        "created_by": 999
                    },
                ])
            )
        })

};